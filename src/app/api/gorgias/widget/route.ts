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
import { getCached, setCache } from '@/lib/gorgias/widget-cache';
import { verifyWidgetSecret, getClientIp, createRateLimiter } from '@/lib/gorgias/middleware';

// Rate limiter: 60 requests per minute per IP
const rateLimiter = createRateLimiter(60);

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
    const customerResult = await executeComposioTool(
      'SHOPIFY_GET_CUSTOMERS_SEARCH',
      { query: `email:${email}` },
    ) as { data?: { customers?: { id: number; orders_count: number }[] } };

    const customer = customerResult?.data?.customers?.[0];
    const customerId = customer ? String(customer.id) : null;

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
  if (!verifyWidgetSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(request);
  if (!rateLimiter.check(ip)) {
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
    db.select()
      .from(gorgiasCustomers)
      .where(eq(gorgiasCustomers.email, email))
      .limit(1),

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

    db.select({
      avgResponseTime: sql<number>`avg(${gorgiasTickets.firstResponseTimeSeconds})`,
      avgResolutionTime: sql<number>`avg(${gorgiasTickets.resolutionTimeSeconds})`,
      totalTickets: count(),
    })
      .from(gorgiasTickets)
      .where(eq(gorgiasTickets.customerEmail, email)),

    fetchShopifyData(email),
  ]);

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

  const gorgiasBaseUrl = process.env.GORGIAS_DOMAIN
    ? `https://${process.env.GORGIAS_DOMAIN}.gorgias.com`
    : '';
  const dashboardUrl = process.env.TELLMYTALE_BASE_URL || '';

  const responseData: Record<string, unknown> = {
    customer_name: customer?.name || customer?.firstname || email.split('@')[0],
    customer_email: email,
    lifetime_tickets: Number(metrics?.totalTickets || customer?.ticketCount || 0),
    open_tickets: customer?.openTicketCount || 0,
    customer_since: customer?.gorgiasCreatedAt
      ? new Date(customer.gorgiasCreatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : 'Unknown',
    shopify_customer_id: shopifyData.customerId || customer?.shopifyCustomerId || null,

    ai_active_conversations: activeAiConversations.length,
    ai_latest_sentiment: latestConversation?.sentiment || 'none',
    ai_has_escalation: activeAiConversations.some(c => c.status === 'escalated'),
    ai_total_conversations: aiConversations.length,

    avg_response_time: metrics?.avgResponseTime
      ? formatDuration(Number(metrics.avgResponseTime))
      : 'N/A',
    avg_resolution_time: metrics?.avgResolutionTime
      ? formatDuration(Number(metrics.avgResolutionTime))
      : 'N/A',

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

    recent_orders: shopifyData.orders.map(o => ({
      id: o.id,
      name: o.name,
      status: o.financial_status,
      fulfillment: o.fulfillment_status || 'unfulfilled',
      total: `$${o.total_price} ${o.currency}`,
      date: new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })),
    shopify_orders_count: shopifyData.orders.length,

    dashboard_url: dashboardUrl
      ? `${dashboardUrl}/dashboard/customers?search=${encodeURIComponent(email)}`
      : '',

    _data_sources: dataSources,
  };

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
