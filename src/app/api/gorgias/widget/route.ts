/**
 * Gorgias Widget Data Endpoint
 * Called by Gorgias HTTP integration when an agent opens a ticket.
 * Returns customer context for the sidebar widget.
 *
 * GET /api/gorgias/widget?email={{ticket.customer.email}}
 *
 * Features:
 * - In-memory cache (2-min TTL per customer email)
 * - IP-based rate limiting (60 req/min)
 * - Shopify live data enrichment via Composio
 * - Graceful degradation: partial data returned if a source fails
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  gorgiasCustomers,
  gorgiasTickets,
  conversations,
} from '@/lib/db/schema';
import { eq, desc, sql, count } from 'drizzle-orm';
import { isComposioAvailable } from '@/lib/composio';
import { executeComposioTool } from '@/lib/composio/tools';

// ============================================
// In-Memory Cache
// ============================================

interface CacheEntry {
  data: Record<string, unknown>;
  timestamp: number;
}

const widgetCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

function getCached(email: string): Record<string, unknown> | null {
  const entry = widgetCache.get(email);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  if (entry) widgetCache.delete(email); // Expired
  return null;
}

function setCache(email: string, data: Record<string, unknown>): void {
  widgetCache.set(email, { data, timestamp: Date.now() });

  // Evict stale entries periodically (keep cache from growing unbounded)
  if (widgetCache.size > 500) {
    const now = Date.now();
    for (const [key, entry] of widgetCache) {
      if (now - entry.timestamp > CACHE_TTL_MS) {
        widgetCache.delete(key);
      }
    }
  }
}

// ============================================
// Rate Limiting (sliding window, per IP)
// ============================================

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];

  // Remove expired entries
  const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  valid.push(now);
  rateLimitMap.set(ip, valid);

  // Periodic cleanup
  if (rateLimitMap.size > 1000) {
    for (const [key, ts] of rateLimitMap) {
      const active = ts.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
      if (active.length === 0) rateLimitMap.delete(key);
      else rateLimitMap.set(key, active);
    }
  }

  return valid.length <= RATE_LIMIT_MAX;
}

// ============================================
// Auth
// ============================================

function verifyWidgetRequest(request: NextRequest): boolean {
  const secret = process.env.GORGIAS_WIDGET_SECRET;
  if (!secret) return true; // No secret configured, allow (dev mode)
  const providedKey = request.headers.get('X-TellMyTale-Key');
  return providedKey === secret;
}

// ============================================
// Shopify Data Enrichment
// ============================================

interface ShopifyOrder {
  id: number;
  name: string;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  created_at: string;
  currency: string;
}

async function fetchShopifyData(email: string): Promise<{
  orders: ShopifyOrder[];
  customerId: string | null;
}> {
  if (!isComposioAvailable()) {
    return { orders: [], customerId: null };
  }

  try {
    // Search for customer orders by email
    const result = await executeComposioTool(
      'SHOPIFY_LIST_ORDERS',
      { status: 'any', limit: 5 },
    ) as { data?: { orders?: ShopifyOrder[] } };

    // Filter by email if the API returns all orders
    const allOrders = result?.data?.orders || [];
    // Shopify list_orders doesn't filter by email directly,
    // so we also search for the customer
    const customerResult = await executeComposioTool(
      'SHOPIFY_GET_CUSTOMERS_SEARCH',
      { query: `email:${email}` },
    ) as { data?: { customers?: { id: number; orders_count: number }[] } };

    const customer = customerResult?.data?.customers?.[0];
    const customerId = customer ? String(customer.id) : null;

    // If we found the customer, get their specific orders
    if (customerId) {
      const customerOrders = await executeComposioTool(
        'SHOPIFY_LIST_ORDERS',
        { customer_id: customerId, status: 'any', limit: 5 },
      ) as { data?: { orders?: ShopifyOrder[] } };

      return {
        orders: (customerOrders?.data?.orders || []).slice(0, 5),
        customerId,
      };
    }

    return { orders: [], customerId: null };
  } catch (error) {
    console.warn('[Gorgias Widget] Shopify enrichment failed (non-fatal):', error);
    return { orders: [], customerId: null };
  }
}

// ============================================
// Main Handler
// ============================================

export async function GET(request: NextRequest) {
  // Auth check
  if (!verifyWidgetRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'email parameter required' }, { status: 400 });
  }

  // Check cache
  const cached = getCached(email);
  if (cached) {
    return NextResponse.json({ ...cached, _cached: true });
  }

  if (!db) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  // Track which data sources succeeded/failed
  const dataSources: Record<string, 'ok' | 'error' | 'skipped'> = {
    warehouse_customer: 'skipped',
    warehouse_tickets: 'skipped',
    ai_conversations: 'skipped',
    ticket_metrics: 'skipped',
    shopify_live: 'skipped',
  };

  // Fetch all data sources in parallel with individual error handling
  let customerResults: typeof gorgiasCustomers.$inferSelect[] = [];
  let recentTickets: { id: number; subject: string | null; status: string | null; priority: string | null; channel: string | null; createdAt: Date | null }[] = [];
  let aiConversations: { id: string; status: string | null; sentiment: string | null; channel: string | null; messageCount: number | null; escalatedAt: Date | null; createdAt: Date | null }[] = [];
  let ticketMetrics: { avgResponseTime: number | null; avgResolutionTime: number | null; totalTickets: number }[] = [];
  let shopifyData: { orders: ShopifyOrder[]; customerId: string | null } = { orders: [], customerId: null };

  const results = await Promise.allSettled([
    // 1. Customer profile from warehouse
    db.select()
      .from(gorgiasCustomers)
      .where(eq(gorgiasCustomers.email, email))
      .limit(1),

    // 2. Last 5 tickets for this customer
    db.select({
      id: gorgiasTickets.id,
      subject: gorgiasTickets.subject,
      status: gorgiasTickets.status,
      priority: gorgiasTickets.priority,
      channel: gorgiasTickets.channel,
      createdAt: gorgiasTickets.gorgiasCreatedAt,
    })
      .from(gorgiasTickets)
      .where(eq(gorgiasTickets.customerEmail, email))
      .orderBy(desc(gorgiasTickets.gorgiasCreatedAt))
      .limit(5),

    // 3. AI conversations
    db.select({
      id: conversations.id,
      status: conversations.status,
      sentiment: conversations.sentiment,
      channel: conversations.channel,
      messageCount: conversations.messageCount,
      escalatedAt: conversations.escalatedAt,
      createdAt: conversations.createdAt,
    })
      .from(conversations)
      .where(eq(conversations.customerEmail, email))
      .orderBy(desc(conversations.createdAt))
      .limit(5),

    // 4. Avg response/resolution time for this customer
    db.select({
      avgResponseTime: sql<number>`avg(${gorgiasTickets.firstResponseTimeSeconds})`,
      avgResolutionTime: sql<number>`avg(${gorgiasTickets.resolutionTimeSeconds})`,
      totalTickets: count(),
    })
      .from(gorgiasTickets)
      .where(eq(gorgiasTickets.customerEmail, email)),

    // 5. Shopify live data (non-blocking)
    fetchShopifyData(email),
  ]);

  // Process results with graceful degradation
  if (results[0].status === 'fulfilled') {
    customerResults = results[0].value;
    dataSources.warehouse_customer = 'ok';
  } else {
    console.error('[Gorgias Widget] Customer lookup failed:', results[0].reason);
    dataSources.warehouse_customer = 'error';
  }

  if (results[1].status === 'fulfilled') {
    recentTickets = results[1].value;
    dataSources.warehouse_tickets = 'ok';
  } else {
    console.error('[Gorgias Widget] Ticket lookup failed:', results[1].reason);
    dataSources.warehouse_tickets = 'error';
  }

  if (results[2].status === 'fulfilled') {
    aiConversations = results[2].value;
    dataSources.ai_conversations = 'ok';
  } else {
    console.error('[Gorgias Widget] AI conversations failed:', results[2].reason);
    dataSources.ai_conversations = 'error';
  }

  if (results[3].status === 'fulfilled') {
    ticketMetrics = results[3].value;
    dataSources.ticket_metrics = 'ok';
  } else {
    console.error('[Gorgias Widget] Ticket metrics failed:', results[3].reason);
    dataSources.ticket_metrics = 'error';
  }

  if (results[4].status === 'fulfilled') {
    shopifyData = results[4].value;
    dataSources.shopify_live = shopifyData.orders.length > 0 || shopifyData.customerId ? 'ok' : 'skipped';
  } else {
    console.warn('[Gorgias Widget] Shopify enrichment failed:', results[4].reason);
    dataSources.shopify_live = 'error';
  }

  const customer = customerResults[0] || null;
  const metrics = ticketMetrics[0];

  const activeAiConversations = aiConversations.filter(c => c.status === 'active' || c.status === 'escalated');
  const latestConversation = aiConversations[0] || null;

  // Format response for Gorgias widget template
  const gorgiasBaseUrl = process.env.GORGIAS_DOMAIN
    ? `https://${process.env.GORGIAS_DOMAIN}.gorgias.com`
    : '';
  const dashboardUrl = process.env.TELLMYTALE_BASE_URL || '';

  const responseData: Record<string, unknown> = {
    // Customer overview card
    customer_name: customer?.name || customer?.firstname || email.split('@')[0],
    customer_email: email,
    lifetime_tickets: Number(metrics?.totalTickets || customer?.ticketCount || 0),
    open_tickets: customer?.openTicketCount || 0,
    customer_since: customer?.gorgiasCreatedAt
      ? new Date(customer.gorgiasCreatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : 'Unknown',
    shopify_customer_id: shopifyData.customerId || customer?.shopifyCustomerId || null,

    // AI assistant card
    ai_active_conversations: activeAiConversations.length,
    ai_latest_sentiment: latestConversation?.sentiment || 'none',
    ai_has_escalation: activeAiConversations.some(c => c.status === 'escalated'),
    ai_total_conversations: aiConversations.length,

    // Support metrics card
    avg_response_time: metrics?.avgResponseTime
      ? formatDuration(Number(metrics.avgResponseTime))
      : 'N/A',
    avg_resolution_time: metrics?.avgResolutionTime
      ? formatDuration(Number(metrics.avgResolutionTime))
      : 'N/A',

    // Recent tickets list
    recent_tickets: recentTickets.map(t => ({
      id: t.id,
      subject: t.subject || '(no subject)',
      status: t.status,
      priority: t.priority || 'normal',
      channel: t.channel,
      created_at: t.createdAt
        ? new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '',
      url: gorgiasBaseUrl ? `${gorgiasBaseUrl}/app/ticket/${t.id}` : '',
    })),

    // Shopify recent orders (live data)
    recent_orders: shopifyData.orders.map(o => ({
      id: o.id,
      name: o.name,
      status: o.financial_status,
      fulfillment: o.fulfillment_status || 'unfulfilled',
      total: `$${o.total_price} ${o.currency}`,
      date: new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })),
    shopify_orders_count: shopifyData.orders.length,

    // Quick action links
    dashboard_url: dashboardUrl
      ? `${dashboardUrl}/dashboard/customers?search=${encodeURIComponent(email)}`
      : '',

    // Data source status (helps debug widget issues)
    _data_sources: dataSources,
  };

  // Cache the response
  setCache(email, responseData);

  return NextResponse.json(responseData);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
