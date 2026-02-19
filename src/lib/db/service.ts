/**
 * Database Service Layer
 * Provides CRUD operations for all database entities
 */

import { eq, desc, and, gte, lte, sql, count, inArray } from 'drizzle-orm';
import { db, isDatabaseAvailable } from './index';
import {
  conversations,
  messages,
  escalations,
  notes,
  dailyStats,
  analyticsSnapshots,
  gorgiasWebhookEvents,
  gorgiasTickets,
  gorgiasCustomers,
  gorgiasMessages,
  gorgiasUsers,
  gorgiasTags,
  type NewConversation,
  type NewMessage,
  type NewEscalation,
  type NewNote,
  type Conversation,
  type Message,
  type Escalation,
  type Note,
  type NewGorgiasWebhookEvent,
  type GorgiasWebhookEvent,
  type GorgiasTicketRecord,
  type GorgiasCustomerRecord,
} from './schema';

// ============================================
// Conversations Service
// ============================================
export const conversationsService = {
  /**
   * Create a new conversation
   */
  async create(data: NewConversation): Promise<Conversation | null> {
    if (!db) return null;
    const [result] = await db.insert(conversations).values(data).returning();
    return result;
  },

  /**
   * Get conversation by ID
   */
  async getById(id: string): Promise<Conversation | null> {
    if (!db) return null;
    const [result] = await db.select().from(conversations).where(eq(conversations.id, id));
    return result || null;
  },

  /**
   * Get conversations by email
   */
  async getByEmail(email: string, limit = 20): Promise<Conversation[]> {
    if (!db) return [];
    return db.select()
      .from(conversations)
      .where(eq(conversations.customerEmail, email))
      .orderBy(desc(conversations.createdAt))
      .limit(limit);
  },

  /**
   * Get recent conversations with optional status filter
   */
  async getRecent(options?: { 
    status?: string; 
    limit?: number; 
    offset?: number 
  }): Promise<Conversation[]> {
    if (!db) return [];
    
    let query = db.select().from(conversations);
    
    if (options?.status) {
      query = query.where(eq(conversations.status, options.status)) as typeof query;
    }
    
    return query
      .orderBy(desc(conversations.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  },

  /**
   * Update conversation
   */
  async update(id: string, data: Partial<NewConversation>): Promise<Conversation | null> {
    if (!db) return null;
    const [result] = await db.update(conversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return result || null;
  },

  /**
   * Update conversation status
   */
  async updateStatus(id: string, status: string): Promise<Conversation | null> {
    if (!db) return null;
    const updateData: Partial<NewConversation> = { 
      status, 
      updatedAt: new Date() 
    };
    
    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    } else if (status === 'escalated') {
      updateData.escalatedAt = new Date();
    }
    
    const [result] = await db.update(conversations)
      .set(updateData)
      .where(eq(conversations.id, id))
      .returning();
    return result || null;
  },

  /**
   * Increment message count
   */
  async incrementMessageCount(id: string): Promise<void> {
    if (!db) return;
    await db.update(conversations)
      .set({ 
        messageCount: sql`${conversations.messageCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(conversations.id, id));
  },

  /**
   * Get conversation counts by status
   */
  async getStatusCounts(): Promise<Record<string, number>> {
    if (!db) return { active: 0, resolved: 0, escalated: 0 };
    
    const results = await db.select({
      status: conversations.status,
      count: count(),
    })
    .from(conversations)
    .groupBy(conversations.status);
    
    return results.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {} as Record<string, number>);
  },
};

// ============================================
// Messages Service
// ============================================
export const messagesService = {
  /**
   * Create a new message
   */
  async create(data: NewMessage): Promise<Message | null> {
    if (!db) return null;
    const [result] = await db.insert(messages).values(data).returning();
    
    // Increment conversation message count
    await conversationsService.incrementMessageCount(data.conversationId);
    
    return result;
  },

  /**
   * Get messages for a conversation
   */
  async getByConversationId(conversationId: string): Promise<Message[]> {
    if (!db) return [];
    return db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  },

  /**
   * Get recent messages across all conversations
   */
  async getRecent(limit = 100): Promise<Message[]> {
    if (!db) return [];
    return db.select()
      .from(messages)
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  },
};

// ============================================
// Escalations Service
// ============================================
export const escalationsService = {
  /**
   * Create a new escalation
   */
  async create(data: Omit<NewEscalation, 'ticketNumber'>): Promise<Escalation | null> {
    if (!db) return null;
    
    // Generate ticket number
    const ticketNumber = `ESC-${Date.now().toString(36).toUpperCase()}`;
    
    const [result] = await db.insert(escalations)
      .values({ ...data, ticketNumber })
      .returning();
    
    // Update conversation status if linked
    if (data.conversationId) {
      await conversationsService.updateStatus(data.conversationId, 'escalated');
    }
    
    return result;
  },

  /**
   * Get escalation by ID
   */
  async getById(id: string): Promise<Escalation | null> {
    if (!db) return null;
    const [result] = await db.select().from(escalations).where(eq(escalations.id, id));
    return result || null;
  },

  /**
   * Get escalations by status
   */
  async getByStatus(status: string, limit = 50): Promise<Escalation[]> {
    if (!db) return [];
    return db.select()
      .from(escalations)
      .where(eq(escalations.status, status))
      .orderBy(desc(escalations.createdAt))
      .limit(limit);
  },

  /**
   * Get pending escalations with priority
   */
  async getPending(): Promise<Escalation[]> {
    if (!db) return [];
    return db.select()
      .from(escalations)
      .where(eq(escalations.status, 'pending'))
      .orderBy(
        sql`CASE ${escalations.priority} 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
          ELSE 5 END`,
        desc(escalations.createdAt)
      );
  },

  /**
   * Get escalation counts by priority
   */
  async getPriorityCounts(): Promise<{ high: number; medium: number; low: number }> {
    if (!db) return { high: 0, medium: 0, low: 0 };
    
    const results = await db.select({
      priority: escalations.priority,
      count: count(),
    })
    .from(escalations)
    .where(eq(escalations.status, 'pending'))
    .groupBy(escalations.priority);
    
    const counts = { high: 0, medium: 0, low: 0 };
    results.forEach(row => {
      if (row.priority === 'high' || row.priority === 'urgent') {
        counts.high += row.count;
      } else if (row.priority === 'medium') {
        counts.medium = row.count;
      } else {
        counts.low += row.count;
      }
    });
    
    return counts;
  },

  /**
   * Assign escalation to agent
   */
  async assign(id: string, assignedTo: string): Promise<Escalation | null> {
    if (!db) return null;
    const [result] = await db.update(escalations)
      .set({ 
        assignedTo, 
        assignedAt: new Date(), 
        status: 'assigned',
        updatedAt: new Date()
      })
      .where(eq(escalations.id, id))
      .returning();
    return result || null;
  },

  /**
   * Resolve escalation
   */
  async resolve(id: string, resolution: string, resolvedBy: string): Promise<Escalation | null> {
    if (!db) return null;
    const [result] = await db.update(escalations)
      .set({ 
        resolution, 
        resolvedBy,
        resolvedAt: new Date(), 
        status: 'resolved',
        updatedAt: new Date()
      })
      .where(eq(escalations.id, id))
      .returning();
    return result || null;
  },

  /**
   * Update Gorgias ticket info on escalation
   */
  async updateGorgiasInfo(id: string, data: {
    gorgiasTicketId: number;
    gorgiasTicketUrl: string;
    gorgiasStatus?: string;
  }): Promise<Escalation | null> {
    if (!db) return null;
    const [result] = await db.update(escalations)
      .set({ 
        ...data,
        lastSyncedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(escalations.id, id))
      .returning();
    return result || null;
  },

  /**
   * Get escalation by Gorgias ticket ID
   */
  async getByGorgiasTicketId(gorgiasTicketId: number): Promise<Escalation | null> {
    if (!db) return null;
    const [result] = await db.select()
      .from(escalations)
      .where(eq(escalations.gorgiasTicketId, gorgiasTicketId));
    return result || null;
  },

  /**
   * Update Gorgias status
   */
  async updateGorgiasStatus(gorgiasTicketId: number, gorgiasStatus: string): Promise<Escalation | null> {
    if (!db) return null;
    
    // Map Gorgias status to our status
    let localStatus = 'pending';
    if (gorgiasStatus === 'closed') {
      localStatus = 'resolved';
    } else if (gorgiasStatus === 'open') {
      localStatus = 'in_progress';
    }
    
    const [result] = await db.update(escalations)
      .set({ 
        gorgiasStatus,
        status: localStatus,
        lastSyncedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(escalations.gorgiasTicketId, gorgiasTicketId))
      .returning();
    return result || null;
  },
};

// ============================================
// Notes Service
// ============================================
export const notesService = {
  /**
   * Create a new note
   */
  async create(data: NewNote): Promise<Note | null> {
    if (!db) return null;
    const [result] = await db.insert(notes).values(data).returning();
    return result;
  },

  /**
   * Get notes for an entity
   */
  async getByEntity(entityType: string, entityId: string): Promise<Note[]> {
    if (!db) return [];
    return db.select()
      .from(notes)
      .where(and(
        eq(notes.entityType, entityType),
        eq(notes.entityId, entityId)
      ))
      .orderBy(desc(notes.createdAt));
  },
};

// ============================================
// Stats Service
// ============================================
export const statsService = {
  /**
   * Get conversations created today
   */
  async getConversationsToday(): Promise<number> {
    if (!db) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [result] = await db.select({ count: count() })
      .from(conversations)
      .where(and(
        gte(conversations.createdAt, today),
        lte(conversations.createdAt, tomorrow)
      ));
    
    return result?.count || 0;
  },

  /**
   * Get conversations resolved today
   */
  async getResolvedToday(): Promise<number> {
    if (!db) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [result] = await db.select({ count: count() })
      .from(conversations)
      .where(and(
        eq(conversations.status, 'resolved'),
        gte(conversations.resolvedAt, today),
        lte(conversations.resolvedAt, tomorrow)
      ));
    
    return result?.count || 0;
  },

  /**
   * Get average response time from conversations with response times
   */
  async getAvgResponseTime(): Promise<number | null> {
    if (!db) return null;
    
    const result = await db.select({
      avgTime: sql<number>`AVG(${conversations.responseTimeMs})`.as('avgTime'),
    })
    .from(conversations)
    .where(sql`${conversations.responseTimeMs} IS NOT NULL`);
    
    return result[0]?.avgTime || null;
  },

  /**
   * Get total message count across all conversations
   */
  async getTotalMessages(): Promise<number> {
    if (!db) return 0;
    
    const [result] = await db.select({ count: count() })
      .from(messages);
    
    return result?.count || 0;
  },

  /**
   * Get CSAT score from notes (ratings stored as notes)
   */
  async getAvgCsatScore(): Promise<number | null> {
    if (!db) return null;
    
    const csatNotes = await db.select()
      .from(notes)
      .where(sql`${notes.content} LIKE 'CSAT Rating:%'`)
      .limit(100);
    
    if (csatNotes.length === 0) return null;
    
    let totalScore = 0;
    let validRatings = 0;
    
    for (const note of csatNotes) {
      const match = note.content.match(/CSAT Rating: (\d)/);
      if (match) {
        totalScore += parseInt(match[1], 10);
        validRatings++;
      }
    }
    
    return validRatings > 0 ? totalScore / validRatings : null;
  },

  /**
   * Calculate and return dashboard stats from actual database data
   */
  async getDashboardStats() {
    if (!db) {
      return {
        totalConversations: 0,
        activeNow: 0,
        resolvedToday: 0,
        avgResponseTime: '—',
        aiResolutionRate: 0,
        csatScore: 0,
        escalationRate: 0,
        pendingEscalations: 0,
        highPriorityCount: 0,
        mediumPriorityCount: 0,
        totalMessages: 0,
        conversationsToday: 0,
      };
    }

    // Get all status counts directly from conversations table
    const statusCounts = await conversationsService.getStatusCounts();
    
    // Get escalation priority counts
    const priorityCounts = await escalationsService.getPriorityCounts();
    
    // Calculate totals from actual data
    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const resolved = statusCounts['resolved'] || 0;
    const escalated = statusCounts['escalated'] || 0;
    const active = statusCounts['active'] || 0;
    
    // Get today's specific stats
    const resolvedToday = await this.getResolvedToday();
    const conversationsToday = await this.getConversationsToday();
    
    // Get average response time
    const avgResponseTimeMs = await this.getAvgResponseTime();
    
    // Get total messages
    const totalMessages = await this.getTotalMessages();
    
    // Get CSAT score
    const csatScore = await this.getAvgCsatScore();
    
    // Calculate rates based on actual data
    const aiResolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const escalationRate = total > 0 ? Math.round((escalated / total) * 100) : 0;
    
    // Format response time
    let avgResponseTime = '—';
    if (avgResponseTimeMs !== null) {
      if (avgResponseTimeMs < 1000) {
        avgResponseTime = `${Math.round(avgResponseTimeMs)}ms`;
      } else if (avgResponseTimeMs < 60000) {
        avgResponseTime = `${Math.round(avgResponseTimeMs / 1000)}s`;
      } else {
        avgResponseTime = `${Math.round(avgResponseTimeMs / 60000)}m`;
      }
    }
    
    return {
      totalConversations: total,
      activeNow: active,
      resolvedToday,
      avgResponseTime,
      aiResolutionRate,
      csatScore: csatScore || 0,
      escalationRate,
      pendingEscalations: priorityCounts.high + priorityCounts.medium + priorityCounts.low,
      highPriorityCount: priorityCounts.high,
      mediumPriorityCount: priorityCounts.medium,
      totalMessages,
      conversationsToday,
    };
  },

  /**
   * Get or create today's daily stats record
   */
  async getTodayStats() {
    if (!db) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [existing] = await db.select()
      .from(dailyStats)
      .where(eq(dailyStats.date, today));
    
    if (existing) return existing;
    
    const [created] = await db.insert(dailyStats)
      .values({ date: today })
      .returning();
    
    return created;
  },

  /**
   * Update today's stats
   */
  async updateTodayStats(data: Partial<typeof dailyStats.$inferInsert>) {
    if (!db) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [result] = await db.update(dailyStats)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dailyStats.date, today))
      .returning();
    
    return result;
  },

  /**
   * Get stats for date range
   */
  async getStatsRange(startDate: Date, endDate: Date) {
    if (!db) return [];
    return db.select()
      .from(dailyStats)
      .where(and(
        gte(dailyStats.date, startDate),
        lte(dailyStats.date, endDate)
      ))
      .orderBy(dailyStats.date);
  },

  /**
   * Increment conversation count for today
   */
  async incrementConversationCount() {
    if (!db) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Ensure today's stats exist
    await this.getTodayStats();
    
    await db.update(dailyStats)
      .set({ 
        totalConversations: sql`${dailyStats.totalConversations} + 1`,
        updatedAt: new Date()
      })
      .where(eq(dailyStats.date, today));
  },

  /**
   * Increment resolved count for today
   */
  async incrementResolvedCount() {
    if (!db) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Ensure today's stats exist
    await this.getTodayStats();
    
    await db.update(dailyStats)
      .set({ 
        resolvedConversations: sql`${dailyStats.resolvedConversations} + 1`,
        updatedAt: new Date()
      })
      .where(eq(dailyStats.date, today));
  },
};

// ============================================
// Gorgias Webhook Events Service
// ============================================
export const gorgiasWebhookEventsService = {
  /**
   * Create a webhook event record
   */
  async create(data: NewGorgiasWebhookEvent): Promise<GorgiasWebhookEvent | null> {
    if (!db) return null;
    const [result] = await db.insert(gorgiasWebhookEvents).values(data).returning();
    return result;
  },

  /**
   * Mark event as processed
   */
  async markProcessed(id: string, error?: string): Promise<void> {
    if (!db) return;
    await db.update(gorgiasWebhookEvents)
      .set({ 
        processedAt: new Date(),
        processingError: error
      })
      .where(eq(gorgiasWebhookEvents.id, id));
  },

  /**
   * Get unprocessed events
   */
  async getUnprocessed(limit = 100): Promise<GorgiasWebhookEvent[]> {
    if (!db) return [];
    return db.select()
      .from(gorgiasWebhookEvents)
      .where(sql`${gorgiasWebhookEvents.processedAt} IS NULL`)
      .orderBy(gorgiasWebhookEvents.createdAt)
      .limit(limit);
  },

  /**
   * Get recent events
   */
  async getRecent(limit = 50): Promise<GorgiasWebhookEvent[]> {
    if (!db) return [];
    return db.select()
      .from(gorgiasWebhookEvents)
      .orderBy(desc(gorgiasWebhookEvents.createdAt))
      .limit(limit);
  },

  /**
   * Check if event already exists (for idempotency)
   */
  async exists(eventType: string, resourceId: number): Promise<boolean> {
    if (!db) return false;
    const [result] = await db.select({ count: count() })
      .from(gorgiasWebhookEvents)
      .where(and(
        eq(gorgiasWebhookEvents.eventType, eventType),
        eq(gorgiasWebhookEvents.resourceId, resourceId)
      ));
    return (result?.count || 0) > 0;
  },
};

// ============================================
// Gorgias Data Warehouse Service
// ============================================
export const gorgiasWarehouseService = {
  /**
   * Get total ticket count from warehouse
   */
  async getTicketCount(): Promise<number> {
    if (!db) return 0;
    const [result] = await db.select({ count: count() }).from(gorgiasTickets);
    return result?.count || 0;
  },

  /**
   * Get ticket counts by status
   */
  async getTicketStatusCounts(): Promise<{ open: number; closed: number }> {
    if (!db) return { open: 0, closed: 0 };
    
    const results = await db.select({
      status: gorgiasTickets.status,
      count: count(),
    })
    .from(gorgiasTickets)
    .groupBy(gorgiasTickets.status);
    
    return {
      open: results.find(r => r.status === 'open')?.count || 0,
      closed: results.find(r => r.status === 'closed')?.count || 0,
    };
  },

  /**
   * Get recent tickets
   */
  async getRecentTickets(limit = 20): Promise<GorgiasTicketRecord[]> {
    if (!db) return [];
    return db.select()
      .from(gorgiasTickets)
      .orderBy(desc(gorgiasTickets.gorgiasCreatedAt))
      .limit(limit);
  },

  /**
   * Get tickets by customer email
   */
  async getTicketsByEmail(email: string, limit = 10): Promise<GorgiasTicketRecord[]> {
    if (!db) return [];
    return db.select()
      .from(gorgiasTickets)
      .where(eq(gorgiasTickets.customerEmail, email))
      .orderBy(desc(gorgiasTickets.gorgiasCreatedAt))
      .limit(limit);
  },

  /**
   * Get ticket by ID
   */
  async getTicketById(id: number): Promise<GorgiasTicketRecord | null> {
    if (!db) return null;
    const [result] = await db.select().from(gorgiasTickets).where(eq(gorgiasTickets.id, id));
    return result || null;
  },

  /**
   * Get tickets by customer ID
   */
  async getTicketsByCustomerId(customerId: number, limit = 100): Promise<GorgiasTicketRecord[]> {
    if (!db) return [];
    return db.select()
      .from(gorgiasTickets)
      .where(eq(gorgiasTickets.customerId, customerId))
      .orderBy(desc(gorgiasTickets.gorgiasCreatedAt))
      .limit(limit);
  },

  /**
   * Get total customer count
   */
  async getCustomerCount(): Promise<number> {
    if (!db) return 0;
    const [result] = await db.select({ count: count() }).from(gorgiasCustomers);
    return result?.count || 0;
  },

  /**
   * Get recent customers with computed ticket counts
   */
  async getRecentCustomers(limit = 20): Promise<(GorgiasCustomerRecord & { computedTicketCount: number; computedOpenTicketCount: number })[]> {
    if (!db) return [];
    
    // Get customers
    const customers = await db.select()
      .from(gorgiasCustomers)
      .orderBy(desc(gorgiasCustomers.gorgiasCreatedAt))
      .limit(limit);
    
    if (customers.length === 0) return [];
    
    // Get ticket counts for these customers
    const customerIds = customers.map(c => c.id);
    const ticketCounts = await db.select({
      customerId: gorgiasTickets.customerId,
      total: count(),
      open: sql<string>`cast(count(*) filter (where ${gorgiasTickets.status} = 'open') as integer)`,
    })
      .from(gorgiasTickets)
      .where(inArray(gorgiasTickets.customerId, customerIds))
      .groupBy(gorgiasTickets.customerId);
    
    // Create a map for quick lookup - ensure numbers
    const countMap = new Map(ticketCounts.map(tc => [
      tc.customerId, 
      { 
        total: Number(tc.total) || 0, 
        open: Number(tc.open) || 0 
      }
    ]));
    
    // Enrich customers with computed counts
    return customers.map(c => ({
      ...c,
      computedTicketCount: countMap.get(c.id)?.total || 0,
      computedOpenTicketCount: countMap.get(c.id)?.open || 0,
    }));
  },

  /**
   * Get customer by ID
   */
  async getCustomerById(id: number): Promise<GorgiasCustomerRecord | null> {
    if (!db) return null;
    const [result] = await db.select().from(gorgiasCustomers).where(eq(gorgiasCustomers.id, id));
    return result || null;
  },

  /**
   * Get customer by email
   */
  async getCustomerByEmail(email: string): Promise<GorgiasCustomerRecord | null> {
    if (!db) return null;
    const [result] = await db.select().from(gorgiasCustomers).where(eq(gorgiasCustomers.email, email));
    return result || null;
  },

  /**
   * Get total message count from warehouse
   */
  async getMessageCount(): Promise<number> {
    if (!db) return 0;
    const [result] = await db.select({ count: count() }).from(gorgiasMessages);
    return result?.count || 0;
  },

  /**
   * Get messages for a ticket
   */
  async getTicketMessages(ticketId: number): Promise<typeof gorgiasMessages.$inferSelect[]> {
    if (!db) return [];
    return db.select()
      .from(gorgiasMessages)
      .where(eq(gorgiasMessages.ticketId, ticketId))
      .orderBy(gorgiasMessages.gorgiasCreatedAt);
  },

  /**
   * Get agent/user count
   */
  async getUserCount(): Promise<number> {
    if (!db) return 0;
    const [result] = await db.select({ count: count() }).from(gorgiasUsers);
    return result?.count || 0;
  },

  /**
   * Get tag count
   */
  async getTagCount(): Promise<number> {
    if (!db) return 0;
    const [result] = await db.select({ count: count() }).from(gorgiasTags);
    return result?.count || 0;
  },

  /**
   * Get all tags
   */
  async getTags(limit = 50): Promise<typeof gorgiasTags.$inferSelect[]> {
    if (!db) return [];
    return db.select()
      .from(gorgiasTags)
      .orderBy(desc(gorgiasTags.ticketCount))
      .limit(limit);
  },

  /**
   * Get all agents/users
   */
  async getAgents(limit = 50): Promise<typeof gorgiasUsers.$inferSelect[]> {
    if (!db) return [];
    return db.select()
      .from(gorgiasUsers)
      .orderBy(gorgiasUsers.name)
      .limit(limit);
  },

  /**
   * Get tickets by channel
   */
  async getTicketsByChannel(): Promise<Record<string, number>> {
    if (!db) return {};
    
    const results = await db.select({
      channel: gorgiasTickets.channel,
      count: count(),
    })
    .from(gorgiasTickets)
    .groupBy(gorgiasTickets.channel);
    
    return results.reduce((acc, row) => {
      acc[row.channel] = row.count;
      return acc;
    }, {} as Record<string, number>);
  },

  /**
   * Get average response time from Gorgias tickets
   */
  async getAvgResponseTime(): Promise<number | null> {
    if (!db) return null;
    
    const result = await db.select({
      avgTime: sql<string>`AVG(${gorgiasTickets.firstResponseTimeSeconds})`.as('avgTime'),
    })
    .from(gorgiasTickets)
    .where(sql`${gorgiasTickets.firstResponseTimeSeconds} IS NOT NULL`);
    
    const avgTime = result[0]?.avgTime;
    return avgTime ? parseFloat(avgTime) : null;
  },

  /**
   * Get tickets created today
   */
  async getTicketsToday(): Promise<number> {
    if (!db) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [result] = await db.select({ count: count() })
      .from(gorgiasTickets)
      .where(gte(gorgiasTickets.gorgiasCreatedAt, today));
    
    return result?.count || 0;
  },

  /**
   * Get comprehensive warehouse stats
   */
  async getWarehouseStats() {
    if (!db) {
      return {
        totalTickets: 0,
        openTickets: 0,
        closedTickets: 0,
        totalCustomers: 0,
        totalMessages: 0,
        totalAgents: 0,
        totalTags: 0,
        ticketsToday: 0,
        avgResponseTimeSec: null as number | null,
        channelBreakdown: {} as Record<string, number>,
      };
    }

    const [ticketCounts, customerCount, messageCount, userCount, tagCount, ticketsToday, avgResponseTime, channelBreakdown] = await Promise.all([
      this.getTicketStatusCounts(),
      this.getCustomerCount(),
      this.getMessageCount(),
      this.getUserCount(),
      this.getTagCount(),
      this.getTicketsToday(),
      this.getAvgResponseTime(),
      this.getTicketsByChannel(),
    ]);

    return {
      totalTickets: ticketCounts.open + ticketCounts.closed,
      openTickets: ticketCounts.open,
      closedTickets: ticketCounts.closed,
      totalCustomers: customerCount,
      totalMessages: messageCount,
      totalAgents: userCount,
      totalTags: tagCount,
      ticketsToday,
      avgResponseTimeSec: avgResponseTime,
      channelBreakdown,
    };
  },
};

// Export all services
export const dbService = {
  conversations: conversationsService,
  messages: messagesService,
  escalations: escalationsService,
  notes: notesService,
  stats: statsService,
  gorgiasWebhookEvents: gorgiasWebhookEventsService,
  gorgiasWarehouse: gorgiasWarehouseService,
  isAvailable: isDatabaseAvailable,
};
