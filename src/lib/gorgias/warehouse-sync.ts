/**
 * Gorgias Data Warehouse Sync Service - TURBO MODE v2
 * 
 * Features:
 * - Smart rate limiting (respects Gorgias limits)
 * - Parallel API calls with controlled concurrency
 * - Large batch inserts 
 * - Automatic retry with backoff
 */

import { db } from '@/lib/db';
import {
  gorgiasUsers,
  gorgiasCustomers,
  gorgiasTags,
  gorgiasTickets,
  gorgiasTicketTags,
  gorgiasMessages,
  gorgiasSyncCursors,
} from '@/lib/db/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import { gorgiasGet, isGorgiasConfigured } from './client';
import type {
  GorgiasTicket,
  GorgiasCustomer,
  GorgiasUser,
  GorgiasTag,
  GorgiasMessage,
} from './types';

// ============================================
// Types
// ============================================

interface SyncOptions {
  batchSize?: number;
  concurrency?: number;
  onProgress?: (progress: SyncProgress) => void;
}

interface SyncProgress {
  entityType: string;
  phase: string;
  total: number;
  processed: number;
  created: number;
  updated: number;
  failed: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
}

interface SyncResult {
  success: boolean;
  entityType: string;
  totalRecords: number;
  createdRecords: number;
  updatedRecords: number;
  failedRecords: number;
  duration: number;
  error?: string;
}

interface GorgiasListResponse<T> {
  data: T[];
  meta?: {
    next_cursor?: string;
    previous_cursor?: string;
    has_more?: boolean;
  };
}

// ============================================
// Rate Limiting & Retry Utilities  
// ============================================

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Simple rate limiter - max N requests per second
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms

  constructor(requestsPerSecond: number) {
    this.maxTokens = requestsPerSecond;
    this.tokens = requestsPerSecond;
    this.refillRate = requestsPerSecond / 1000;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;

    if (this.tokens < 1) {
      const waitTime = Math.ceil((1 - this.tokens) / this.refillRate);
      await sleep(waitTime);
      this.tokens = 1;
    }
    this.tokens -= 1;
  }
}

// Global rate limiter - Gorgias allows ~2 req/sec
const rateLimiter = new RateLimiter(2);

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await rateLimiter.acquire();
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if rate limited (429)
      if (lastError.message.includes('429') || lastError.message.includes('rate')) {
        const backoff = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
        console.log(`    Rate limited, waiting ${backoff / 1000}s...`);
        await sleep(backoff);
      } else if (attempt < maxRetries - 1) {
        await sleep(500);
      }
    }
  }
  
  throw lastError;
}

// ============================================
// Batch Insert Helpers - Optimized for Speed
// ============================================

async function batchInsertUsers(users: GorgiasUser[]): Promise<number> {
  if (!db || users.length === 0) return 0;

  const values = users.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name || null,
    firstname: user.firstname || null,
    lastname: user.lastname || null,
    roleId: user.role?.id || null,
    roleName: user.role?.name || null,
    active: user.active ?? true,
    meta: user.meta || null,
    gorgiasCreatedAt: user.created_datetime ? new Date(user.created_datetime) : null,
    gorgiasUpdatedAt: user.updated_datetime ? new Date(user.updated_datetime) : null,
    syncedAt: new Date(),
  }));

  await db.insert(gorgiasUsers).values(values).onConflictDoUpdate({
    target: gorgiasUsers.id,
    set: {
      email: sql`excluded.email`,
      name: sql`excluded.name`,
      firstname: sql`excluded.firstname`,
      lastname: sql`excluded.lastname`,
      roleId: sql`excluded.role_id`,
      roleName: sql`excluded.role_name`,
      active: sql`excluded.active`,
      meta: sql`excluded.meta`,
      gorgiasCreatedAt: sql`excluded.gorgias_created_at`,
      gorgiasUpdatedAt: sql`excluded.gorgias_updated_at`,
      syncedAt: sql`excluded.synced_at`,
      updatedAt: new Date(),
    },
  });

  return values.length;
}

async function batchInsertTags(tags: GorgiasTag[]): Promise<number> {
  if (!db || tags.length === 0) return 0;

  const values = tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    uri: tag.uri || null,
    color: tag.decoration?.color || null,
    emoji: tag.decoration?.emoji || null,
    gorgiasCreatedAt: tag.created_datetime ? new Date(tag.created_datetime) : null,
    gorgiasUpdatedAt: tag.updated_datetime ? new Date(tag.updated_datetime) : null,
    syncedAt: new Date(),
  }));

  await db.insert(gorgiasTags).values(values).onConflictDoUpdate({
    target: gorgiasTags.id,
    set: {
      name: sql`excluded.name`,
      uri: sql`excluded.uri`,
      color: sql`excluded.color`,
      emoji: sql`excluded.emoji`,
      gorgiasCreatedAt: sql`excluded.gorgias_created_at`,
      gorgiasUpdatedAt: sql`excluded.gorgias_updated_at`,
      syncedAt: sql`excluded.synced_at`,
      updatedAt: new Date(),
    },
  });

  return values.length;
}

async function batchInsertCustomers(customers: GorgiasCustomer[]): Promise<number> {
  if (!db || customers.length === 0) return 0;

  const values = customers.map(customer => ({
    id: customer.id,
    externalId: customer.external_id || null,
    email: customer.email || null,
    name: customer.name || null,
    firstname: customer.firstname || null,
    lastname: customer.lastname || null,
    language: customer.language || null,
    timezone: customer.timezone || null,
    note: customer.note || null,
    data: customer.data || null,
    channels: customer.channels || null,
    meta: customer.meta || null,
    shopifyCustomerId: (customer.meta?.shopify_customer_id as string) || null,
    gorgiasCreatedAt: customer.created_datetime ? new Date(customer.created_datetime) : null,
    gorgiasUpdatedAt: customer.updated_datetime ? new Date(customer.updated_datetime) : null,
    syncedAt: new Date(),
  }));

  await db.insert(gorgiasCustomers).values(values).onConflictDoUpdate({
    target: gorgiasCustomers.id,
    set: {
      externalId: sql`excluded.external_id`,
      email: sql`excluded.email`,
      name: sql`excluded.name`,
      firstname: sql`excluded.firstname`,
      lastname: sql`excluded.lastname`,
      language: sql`excluded.language`,
      timezone: sql`excluded.timezone`,
      note: sql`excluded.note`,
      data: sql`excluded.data`,
      channels: sql`excluded.channels`,
      meta: sql`excluded.meta`,
      shopifyCustomerId: sql`excluded.shopify_customer_id`,
      gorgiasCreatedAt: sql`excluded.gorgias_created_at`,
      gorgiasUpdatedAt: sql`excluded.gorgias_updated_at`,
      syncedAt: sql`excluded.synced_at`,
      updatedAt: new Date(),
    },
  });

  return values.length;
}

async function batchInsertTickets(tickets: GorgiasTicket[]): Promise<number> {
  if (!db || tickets.length === 0) return 0;

  // Collect unique customers
  const uniqueCustomers = new Map<number, GorgiasCustomer>();
  for (const ticket of tickets) {
    if (ticket.customer && !uniqueCustomers.has(ticket.customer.id)) {
      uniqueCustomers.set(ticket.customer.id, ticket.customer);
    }
  }
  if (uniqueCustomers.size > 0) {
    await batchInsertCustomers(Array.from(uniqueCustomers.values()));
  }

  const values = tickets.map(ticket => ({
    id: ticket.id,
    uri: ticket.uri || null,
    externalId: ticket.external_id || null,
    language: ticket.language || null,
    status: ticket.status,
    priority: ticket.priority || null,
    channel: ticket.channel,
    via: ticket.via || null,
    fromAgent: ticket.from_agent || false,
    subject: ticket.subject || null,
    excerpt: ticket.excerpt || null,
    customerId: ticket.customer?.id || null,
    customerEmail: ticket.customer?.email || null,
    customerName: ticket.customer?.name || null,
    assigneeUserId: ticket.assignee_user?.id || null,
    assigneeTeamId: ticket.assignee_team?.id || null,
    assigneeTeamName: ticket.assignee_team?.name || null,
    messagesCount: ticket.messages_count || 0,
    isUnread: ticket.is_unread || false,
    openedDatetime: ticket.opened_datetime ? new Date(ticket.opened_datetime) : null,
    lastReceivedMessageDatetime: ticket.last_received_message_datetime ? new Date(ticket.last_received_message_datetime) : null,
    lastMessageDatetime: ticket.last_message_datetime ? new Date(ticket.last_message_datetime) : null,
    closedDatetime: ticket.closed_datetime ? new Date(ticket.closed_datetime) : null,
    snoozeDatetime: ticket.snooze_datetime ? new Date(ticket.snooze_datetime) : null,
    trashedDatetime: ticket.trashed_datetime ? new Date(ticket.trashed_datetime) : null,
    spamDatetime: ticket.spam_datetime ? new Date(ticket.spam_datetime) : null,
    integrations: ticket.integrations || null,
    meta: ticket.meta || null,
    shopifyOrderId: (ticket.meta?.shopify_order_id as string) || null,
    gorgiasCreatedAt: new Date(ticket.created_datetime),
    gorgiasUpdatedAt: new Date(ticket.updated_datetime),
    syncedAt: new Date(),
  }));

  await db.insert(gorgiasTickets).values(values).onConflictDoUpdate({
    target: gorgiasTickets.id,
    set: {
      uri: sql`excluded.uri`,
      externalId: sql`excluded.external_id`,
      language: sql`excluded.language`,
      status: sql`excluded.status`,
      priority: sql`excluded.priority`,
      channel: sql`excluded.channel`,
      via: sql`excluded.via`,
      fromAgent: sql`excluded.from_agent`,
      subject: sql`excluded.subject`,
      excerpt: sql`excluded.excerpt`,
      customerId: sql`excluded.customer_id`,
      customerEmail: sql`excluded.customer_email`,
      customerName: sql`excluded.customer_name`,
      assigneeUserId: sql`excluded.assignee_user_id`,
      assigneeTeamId: sql`excluded.assignee_team_id`,
      assigneeTeamName: sql`excluded.assignee_team_name`,
      messagesCount: sql`excluded.messages_count`,
      isUnread: sql`excluded.is_unread`,
      openedDatetime: sql`excluded.opened_datetime`,
      lastReceivedMessageDatetime: sql`excluded.last_received_message_datetime`,
      lastMessageDatetime: sql`excluded.last_message_datetime`,
      closedDatetime: sql`excluded.closed_datetime`,
      snoozeDatetime: sql`excluded.snooze_datetime`,
      trashedDatetime: sql`excluded.trashed_datetime`,
      spamDatetime: sql`excluded.spam_datetime`,
      integrations: sql`excluded.integrations`,
      meta: sql`excluded.meta`,
      shopifyOrderId: sql`excluded.shopify_order_id`,
      gorgiasCreatedAt: sql`excluded.gorgias_created_at`,
      gorgiasUpdatedAt: sql`excluded.gorgias_updated_at`,
      syncedAt: sql`excluded.synced_at`,
      updatedAt: new Date(),
    },
  });

  // Handle ticket tags in parallel
  const allTagRelations: { ticketId: number; tagId: number }[] = [];
  const ticketIdsWithTags: number[] = [];
  const allTags: GorgiasTag[] = [];

  for (const ticket of tickets) {
    if (ticket.tags && ticket.tags.length > 0) {
      ticketIdsWithTags.push(ticket.id);
      for (const tag of ticket.tags) {
        allTags.push(tag);
        allTagRelations.push({ ticketId: ticket.id, tagId: tag.id });
      }
    }
  }

  if (allTags.length > 0) {
    const uniqueTags = Array.from(new Map(allTags.map(t => [t.id, t])).values());
    await batchInsertTags(uniqueTags);
  }

  if (ticketIdsWithTags.length > 0) {
    await db.delete(gorgiasTicketTags).where(inArray(gorgiasTicketTags.ticketId, ticketIdsWithTags));
  }

  if (allTagRelations.length > 0) {
    await db.insert(gorgiasTicketTags).values(allTagRelations.map(r => ({ ticketId: r.ticketId, tagId: r.tagId })));
  }

  return values.length;
}

async function batchInsertMessages(messages: GorgiasMessage[]): Promise<number> {
  if (!db || messages.length === 0) return 0;

  const values = messages.map(message => ({
    id: message.id,
    ticketId: message.ticket_id,
    uri: message.uri || null,
    channel: message.channel,
    via: message.via || null,
    source: message.source || null,
    senderId: message.sender?.id || null,
    senderEmail: message.sender?.email || null,
    senderName: message.sender?.name || null,
    receiverId: message.receiver?.id || null,
    receiverEmail: message.receiver?.email || null,
    receiverName: message.receiver?.name || null,
    integrationId: message.integration_id || null,
    ruleId: message.rule_id || null,
    externalId: message.external_id || null,
    subject: message.subject || null,
    bodyText: message.body_text || null,
    bodyHtml: message.body_html || null,
    strippedText: message.stripped_text || null,
    strippedHtml: message.stripped_html || null,
    strippedSignature: message.stripped_signature || null,
    public: message.public ?? true,
    fromAgent: message.from_agent || false,
    isRetriable: message.is_retriable || null,
    failedDatetime: message.failed_datetime ? new Date(message.failed_datetime) : null,
    sentDatetime: message.sent_datetime ? new Date(message.sent_datetime) : null,
    openedDatetime: message.opened_datetime ? new Date(message.opened_datetime) : null,
    lastSendingError: message.last_sending_error || null,
    attachments: message.attachments || null,
    macros: message.macros || null,
    meta: message.meta || null,
    actions: message.actions || null,
    gorgiasCreatedAt: new Date(message.created_datetime),
    syncedAt: new Date(),
  }));

  await db.insert(gorgiasMessages).values(values).onConflictDoUpdate({
    target: gorgiasMessages.id,
    set: {
      ticketId: sql`excluded.ticket_id`,
      uri: sql`excluded.uri`,
      channel: sql`excluded.channel`,
      via: sql`excluded.via`,
      source: sql`excluded.source`,
      senderId: sql`excluded.sender_id`,
      senderEmail: sql`excluded.sender_email`,
      senderName: sql`excluded.sender_name`,
      receiverId: sql`excluded.receiver_id`,
      receiverEmail: sql`excluded.receiver_email`,
      receiverName: sql`excluded.receiver_name`,
      integrationId: sql`excluded.integration_id`,
      ruleId: sql`excluded.rule_id`,
      externalId: sql`excluded.external_id`,
      subject: sql`excluded.subject`,
      bodyText: sql`excluded.body_text`,
      bodyHtml: sql`excluded.body_html`,
      strippedText: sql`excluded.stripped_text`,
      strippedHtml: sql`excluded.stripped_html`,
      strippedSignature: sql`excluded.stripped_signature`,
      public: sql`excluded.public`,
      fromAgent: sql`excluded.from_agent`,
      isRetriable: sql`excluded.is_retriable`,
      failedDatetime: sql`excluded.failed_datetime`,
      sentDatetime: sql`excluded.sent_datetime`,
      openedDatetime: sql`excluded.opened_datetime`,
      lastSendingError: sql`excluded.last_sending_error`,
      attachments: sql`excluded.attachments`,
      macros: sql`excluded.macros`,
      meta: sql`excluded.meta`,
      actions: sql`excluded.actions`,
      gorgiasCreatedAt: sql`excluded.gorgias_created_at`,
      syncedAt: sql`excluded.synced_at`,
      updatedAt: new Date(),
    },
  });

  return values.length;
}

// ============================================
// TURBO Sync Service
// ============================================

class GorgiasWarehouseSync {
  private db = db;

  isAvailable(): boolean {
    return isGorgiasConfigured() && this.db !== null;
  }

  /**
   * TURBO: Fetch all data with rate limiting
   */
  private async turboFetch<T>(
    endpoint: string,
    batchSize: number,
    orderBy?: string
  ): Promise<T[]> {
    const allData: T[] = [];
    let cursor: string | undefined;
    let hasMore = true;
    let page = 0;

    while (hasMore) {
      page++;
      const params: Record<string, string | number | undefined> = { limit: batchSize };
      if (cursor) params.cursor = cursor;
      if (orderBy) params.order_by = orderBy;

      const response = await fetchWithRetry(() => 
        gorgiasGet<GorgiasListResponse<T>>(endpoint, params)
      );
      
      if (response.data && response.data.length > 0) {
        allData.push(...response.data);
        if (page % 10 === 0) {
          process.stdout.write(`\r    Fetched ${allData.length} records...`);
        }
      }

      cursor = response.meta?.next_cursor;
      hasMore = !!cursor;
    }

    return allData;
  }

  /**
   * TURBO: Sync users - single fetch, single insert
   */
  async syncUsers(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    try {
      console.log('  Fetching all users...');
      const users = await this.turboFetch<GorgiasUser>('/users', 100, 'created_datetime:asc');
      console.log(`  Inserting ${users.length} users...`);
      
      // Insert in chunks to avoid memory issues
      const chunkSize = 500;
      let inserted = 0;
      for (let i = 0; i < users.length; i += chunkSize) {
        const chunk = users.slice(i, i + chunkSize);
        inserted += await batchInsertUsers(chunk);
      }

      await this.updateSyncCursor('users', inserted);
      return { success: true, entityType: 'users', totalRecords: inserted, createdRecords: inserted, updatedRecords: 0, failedRecords: 0, duration: Date.now() - startTime };
    } catch (error) {
      return { success: false, entityType: 'users', totalRecords: 0, createdRecords: 0, updatedRecords: 0, failedRecords: 0, duration: Date.now() - startTime, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * TURBO: Sync tags - single fetch, single insert
   */
  async syncTags(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    try {
      console.log('  Fetching all tags...');
      const tags = await this.turboFetch<GorgiasTag>('/tags', 100, 'created_datetime:asc');
      console.log(`  Inserting ${tags.length} tags...`);
      
      const chunkSize = 500;
      let inserted = 0;
      for (let i = 0; i < tags.length; i += chunkSize) {
        const chunk = tags.slice(i, i + chunkSize);
        inserted += await batchInsertTags(chunk);
      }

      await this.updateSyncCursor('tags', inserted);
      return { success: true, entityType: 'tags', totalRecords: inserted, createdRecords: inserted, updatedRecords: 0, failedRecords: 0, duration: Date.now() - startTime };
    } catch (error) {
      return { success: false, entityType: 'tags', totalRecords: 0, createdRecords: 0, updatedRecords: 0, failedRecords: 0, duration: Date.now() - startTime, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * TURBO: Sync customers with rate limiting
   */
  async syncCustomers(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const batchSize = options.batchSize || 100;
    let totalInserted = 0;
    let batchNum = 0;

    try {
      let cursor: string | undefined;
      let hasMore = true;

      while (hasMore) {
        batchNum++;
        const params: Record<string, string | number | undefined> = { limit: batchSize };
        if (cursor) params.cursor = cursor;

        const response = await fetchWithRetry(() => 
          gorgiasGet<GorgiasListResponse<GorgiasCustomer>>('/customers', params)
        );
        
        if (response.data && response.data.length > 0) {
          const inserted = await batchInsertCustomers(response.data);
          totalInserted += inserted;
          
          options.onProgress?.({
            entityType: 'customers',
            phase: 'syncing',
            total: totalInserted,
            processed: totalInserted,
            created: totalInserted,
            updated: 0,
            failed: 0,
            percentage: 50,
            currentBatch: batchNum,
            totalBatches: -1,
          });
        }

        cursor = response.meta?.next_cursor;
        hasMore = !!cursor;
      }

      await this.updateSyncCursor('customers', totalInserted);
      return { success: true, entityType: 'customers', totalRecords: totalInserted, createdRecords: totalInserted, updatedRecords: 0, failedRecords: 0, duration: Date.now() - startTime };
    } catch (error) {
      return { success: false, entityType: 'customers', totalRecords: totalInserted, createdRecords: totalInserted, updatedRecords: 0, failedRecords: 0, duration: Date.now() - startTime, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * TURBO: Sync tickets with rate limiting
   */
  async syncTickets(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const batchSize = options.batchSize || 100;
    let totalInserted = 0;
    let batchNum = 0;

    try {
      let cursor: string | undefined;
      let hasMore = true;

      while (hasMore) {
        batchNum++;
        const params: Record<string, string | number | undefined> = { 
          limit: batchSize,
          order_by: 'created_datetime:asc',
        };
        if (cursor) params.cursor = cursor;

        const response = await fetchWithRetry(() => 
          gorgiasGet<GorgiasListResponse<GorgiasTicket>>('/tickets', params)
        );
        
        if (response.data && response.data.length > 0) {
          const inserted = await batchInsertTickets(response.data);
          totalInserted += inserted;
          
          options.onProgress?.({
            entityType: 'tickets',
            phase: 'syncing',
            total: totalInserted,
            processed: totalInserted,
            created: totalInserted,
            updated: 0,
            failed: 0,
            percentage: 50,
            currentBatch: batchNum,
            totalBatches: -1,
          });
        }

        cursor = response.meta?.next_cursor;
        hasMore = !!cursor;
      }

      await this.updateSyncCursor('tickets', totalInserted);
      return { success: true, entityType: 'tickets', totalRecords: totalInserted, createdRecords: totalInserted, updatedRecords: 0, failedRecords: 0, duration: Date.now() - startTime };
    } catch (error) {
      return { success: false, entityType: 'tickets', totalRecords: totalInserted, createdRecords: totalInserted, updatedRecords: 0, failedRecords: 0, duration: Date.now() - startTime, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * TURBO: Sync messages sequentially with rate limiting
   * (Parallel was hitting rate limits too hard)
   */
  async syncMessages(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    let totalInserted = 0;
    let totalFailed = 0;

    if (!this.db) {
      return { success: false, entityType: 'messages', totalRecords: 0, createdRecords: 0, updatedRecords: 0, failedRecords: 0, duration: Date.now() - startTime, error: 'Database not available' };
    }

    try {
      const tickets = await this.db.select({ id: gorgiasTickets.id }).from(gorgiasTickets);
      const totalTickets = tickets.length;
      console.log(`  Processing messages for ${totalTickets} tickets...`);

      // Process tickets sequentially to avoid rate limits
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        
        try {
          const response = await fetchWithRetry(() => 
            gorgiasGet<GorgiasListResponse<GorgiasMessage>>(`/tickets/${ticket.id}/messages`, { limit: 100 })
          );
          
          if (response.data && response.data.length > 0) {
            const inserted = await batchInsertMessages(response.data);
            totalInserted += inserted;
          }
        } catch {
          totalFailed++;
        }

        // Progress update every 50 tickets
        if ((i + 1) % 50 === 0 || i === tickets.length - 1) {
          const pct = Math.round(((i + 1) / totalTickets) * 100);
          options.onProgress?.({
            entityType: 'messages',
            phase: 'syncing',
            total: totalInserted,
            processed: i + 1,
            created: totalInserted,
            updated: 0,
            failed: totalFailed,
            percentage: pct,
            currentBatch: i + 1,
            totalBatches: totalTickets,
          });
        }
      }

      await this.updateSyncCursor('messages', totalInserted);
      return { success: true, entityType: 'messages', totalRecords: totalInserted, createdRecords: totalInserted, updatedRecords: 0, failedRecords: totalFailed, duration: Date.now() - startTime };
    } catch (error) {
      return { success: false, entityType: 'messages', totalRecords: totalInserted, createdRecords: totalInserted, updatedRecords: 0, failedRecords: totalFailed, duration: Date.now() - startTime, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * TURBO: Full sync with rate limiting
   */
  async fullSync(options: SyncOptions = {}): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    console.log('🚀 TURBO MODE v2 - Smart Rate Limited Sync');
    console.log('═'.repeat(50));

    // Users and Tags are small, sync sequentially to be safe
    console.log('\n📥 Phase 1: Users...');
    const usersResult = await this.syncUsers(options);
    results.push(usersResult);
    console.log(`   ✓ Users: ${usersResult.totalRecords} in ${(usersResult.duration / 1000).toFixed(1)}s`);

    console.log('\n📥 Phase 2: Tags...');
    const tagsResult = await this.syncTags(options);
    results.push(tagsResult);
    console.log(`   ✓ Tags: ${tagsResult.totalRecords} in ${(tagsResult.duration / 1000).toFixed(1)}s`);

    // Customers
    console.log('\n📥 Phase 3: Customers...');
    const customersResult = await this.syncCustomers(options);
    results.push(customersResult);
    console.log(`\n   ✓ Customers: ${customersResult.totalRecords} in ${(customersResult.duration / 1000).toFixed(1)}s`);

    // Tickets
    console.log('\n📥 Phase 4: Tickets...');
    const ticketsResult = await this.syncTickets(options);
    results.push(ticketsResult);
    console.log(`\n   ✓ Tickets: ${ticketsResult.totalRecords} in ${(ticketsResult.duration / 1000).toFixed(1)}s`);

    // Messages
    console.log('\n📥 Phase 5: Messages...');
    const messagesResult = await this.syncMessages(options);
    results.push(messagesResult);
    console.log(`\n   ✓ Messages: ${messagesResult.totalRecords} in ${(messagesResult.duration / 1000).toFixed(1)}s`);

    return results;
  }

  // ============================================
  // Cursor Management
  // ============================================

  private async updateSyncCursor(entityType: string, totalSynced: number): Promise<void> {
    if (!this.db) return;

    const existing = await this.db.select().from(gorgiasSyncCursors).where(eq(gorgiasSyncCursors.entityType, entityType)).limit(1);

    if (existing.length === 0) {
      await this.db.insert(gorgiasSyncCursors).values({ entityType, lastSyncedAt: new Date(), totalSynced });
    } else {
      await this.db.update(gorgiasSyncCursors).set({
        lastSyncedAt: new Date(),
        totalSynced,
        updatedAt: new Date(),
      }).where(eq(gorgiasSyncCursors.entityType, entityType));
    }
  }

  // ============================================
  // Query Methods
  // ============================================

  async getSyncStatus(): Promise<{ entityType: string; lastSyncedAt: Date | null; totalSynced: number }[]> {
    if (!this.db) return [];
    const results = await this.db.select({
      entityType: gorgiasSyncCursors.entityType,
      lastSyncedAt: gorgiasSyncCursors.lastSyncedAt,
      totalSynced: gorgiasSyncCursors.totalSynced,
    }).from(gorgiasSyncCursors);
    return results.map(r => ({
      entityType: r.entityType,
      lastSyncedAt: r.lastSyncedAt,
      totalSynced: r.totalSynced ?? 0,
    }));
  }

  async getWarehouseStats(): Promise<{
    totalTickets: number;
    totalCustomers: number;
    totalMessages: number;
    totalUsers: number;
    totalTags: number;
    openTickets: number;
    closedTickets: number;
  }> {
    if (!this.db) {
      return { totalTickets: 0, totalCustomers: 0, totalMessages: 0, totalUsers: 0, totalTags: 0, openTickets: 0, closedTickets: 0 };
    }

    const [tickets, customers, messages, users, tags, openTickets, closedTickets] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)` }).from(gorgiasTickets),
      this.db.select({ count: sql<number>`count(*)` }).from(gorgiasCustomers),
      this.db.select({ count: sql<number>`count(*)` }).from(gorgiasMessages),
      this.db.select({ count: sql<number>`count(*)` }).from(gorgiasUsers),
      this.db.select({ count: sql<number>`count(*)` }).from(gorgiasTags),
      this.db.select({ count: sql<number>`count(*)` }).from(gorgiasTickets).where(eq(gorgiasTickets.status, 'open')),
      this.db.select({ count: sql<number>`count(*)` }).from(gorgiasTickets).where(eq(gorgiasTickets.status, 'closed')),
    ]);

    return {
      totalTickets: Number(tickets[0]?.count || 0),
      totalCustomers: Number(customers[0]?.count || 0),
      totalMessages: Number(messages[0]?.count || 0),
      totalUsers: Number(users[0]?.count || 0),
      totalTags: Number(tags[0]?.count || 0),
      openTickets: Number(openTickets[0]?.count || 0),
      closedTickets: Number(closedTickets[0]?.count || 0),
    };
  }

  async getRecentSyncLogs(limit = 10) {
    if (!this.db) return [];
    return this.db.select().from(gorgiasSyncCursors).orderBy(sql`${gorgiasSyncCursors.lastSyncedAt} DESC`).limit(limit);
  }
}

export const gorgiasWarehouseSync = new GorgiasWarehouseSync();
