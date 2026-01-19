/**
 * Database Service Layer
 * Provides CRUD operations for all database entities
 */

import { eq, desc, and, gte, lte, sql, count } from 'drizzle-orm';
import { db, isDatabaseAvailable } from './index';
import {
  conversations,
  messages,
  escalations,
  notes,
  dailyStats,
  analyticsSnapshots,
  type NewConversation,
  type NewMessage,
  type NewEscalation,
  type NewNote,
  type Conversation,
  type Message,
  type Escalation,
  type Note,
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
   * Get or create today's stats
   */
  async getTodayStats() {
    if (!db) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [existing] = await db.select()
      .from(dailyStats)
      .where(eq(dailyStats.date, today));
    
    if (existing) return existing;
    
    // Create today's stats if not exists
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
   * Calculate and return dashboard stats
   */
  async getDashboardStats() {
    if (!db) {
      // Return mock data when database is not available
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
      };
    }

    // Get conversation counts
    const statusCounts = await conversationsService.getStatusCounts();
    
    // Get escalation priority counts
    const priorityCounts = await escalationsService.getPriorityCounts();
    
    // Get today's stats
    const todayStats = await this.getTodayStats();
    
    // Calculate totals
    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const resolved = statusCounts['resolved'] || 0;
    const escalated = statusCounts['escalated'] || 0;
    const active = statusCounts['active'] || 0;
    
    // Calculate rates
    const aiResolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const escalationRate = total > 0 ? Math.round((escalated / total) * 100) : 0;
    
    return {
      totalConversations: total,
      activeNow: active,
      resolvedToday: todayStats?.resolvedConversations || resolved,
      avgResponseTime: todayStats?.avgResponseTimeSec 
        ? `${Math.round(todayStats.avgResponseTimeSec)}s` 
        : '< 30s',
      aiResolutionRate,
      csatScore: todayStats?.csatScore || 4.8,
      escalationRate,
      pendingEscalations: priorityCounts.high + priorityCounts.medium + priorityCounts.low,
      highPriorityCount: priorityCounts.high,
      mediumPriorityCount: priorityCounts.medium,
    };
  },

  /**
   * Increment conversation count for today
   */
  async incrementConversationCount() {
    if (!db) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
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
    
    await db.update(dailyStats)
      .set({ 
        resolvedConversations: sql`${dailyStats.resolvedConversations} + 1`,
        updatedAt: new Date()
      })
      .where(eq(dailyStats.date, today));
  },
};

// Export all services
export const dbService = {
  conversations: conversationsService,
  messages: messagesService,
  escalations: escalationsService,
  notes: notesService,
  stats: statsService,
  isAvailable: isDatabaseAvailable,
};
