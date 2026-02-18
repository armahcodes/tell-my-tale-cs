/**
 * Gorgias Warehouse tRPC Router
 * Handles data warehouse operations and sync
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { gorgiasWarehouseSync, isGorgiasConfigured } from '@/lib/gorgias';
import { db } from '@/lib/db';
import {
  gorgiasTickets,
  gorgiasCustomers,
  gorgiasMessages,
  gorgiasUsers,
  gorgiasTags,
  gorgiasTicketTags,
  gorgiasSyncLogs,
} from '@/lib/db/schema';
import { eq, desc, sql, and, gte, lte, like, or, count } from 'drizzle-orm';

export const gorgiasWarehouseRouter = router({
  // Get warehouse status and statistics
  status: publicProcedure.query(async () => {
    const isConfigured = isGorgiasConfigured();
    const isAvailable = gorgiasWarehouseSync.isAvailable();

    if (!isAvailable) {
      return {
        configured: isConfigured,
        available: false,
        stats: null,
        syncStatus: [],
      };
    }

    const [stats, syncStatus] = await Promise.all([
      gorgiasWarehouseSync.getWarehouseStats(),
      gorgiasWarehouseSync.getSyncStatus(),
    ]);

    return {
      configured: isConfigured,
      available: true,
      stats,
      syncStatus,
    };
  }),

  // Trigger a full sync
  fullSync: publicProcedure.mutation(async () => {
    if (!gorgiasWarehouseSync.isAvailable()) {
      throw new Error('Warehouse sync is not available');
    }

    const results = await gorgiasWarehouseSync.fullSync({ batchSize: 100 });
    return {
      success: results.every(r => r.success),
      results,
    };
  }),

  // Sync specific entity type
  syncEntity: publicProcedure
    .input(z.object({
      entityType: z.enum(['users', 'tags', 'customers', 'tickets']),
      fullSync: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      if (!gorgiasWarehouseSync.isAvailable()) {
        throw new Error('Warehouse sync is not available');
      }

      let result;
      switch (input.entityType) {
        case 'users':
          result = await gorgiasWarehouseSync.syncUsers({ fullSync: input.fullSync });
          break;
        case 'tags':
          result = await gorgiasWarehouseSync.syncTags({ fullSync: input.fullSync });
          break;
        case 'customers':
          result = await gorgiasWarehouseSync.syncCustomers({ fullSync: input.fullSync });
          break;
        case 'tickets':
          result = await gorgiasWarehouseSync.syncTickets({ fullSync: input.fullSync });
          break;
      }

      return result;
    }),

  // Get recent sync logs
  syncLogs: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      return gorgiasWarehouseSync.getRecentSyncLogs(input.limit);
    }),

  // ============================================
  // Ticket Queries
  // ============================================

  listTickets: publicProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
      status: z.enum(['open', 'closed']).optional(),
      channel: z.string().optional(),
      assigneeUserId: z.number().optional(),
      customerId: z.number().optional(),
      search: z.string().optional(),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      sortBy: z.enum(['created', 'updated', 'priority']).default('created'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }))
    .query(async ({ input }) => {
      if (!db) return { data: [], total: 0, page: input.page, pageSize: input.pageSize };

      const offset = (input.page - 1) * input.pageSize;
      const conditions = [];

      if (input.status) {
        conditions.push(eq(gorgiasTickets.status, input.status));
      }
      if (input.channel) {
        conditions.push(eq(gorgiasTickets.channel, input.channel));
      }
      if (input.assigneeUserId) {
        conditions.push(eq(gorgiasTickets.assigneeUserId, input.assigneeUserId));
      }
      if (input.customerId) {
        conditions.push(eq(gorgiasTickets.customerId, input.customerId));
      }
      if (input.search) {
        conditions.push(
          or(
            like(gorgiasTickets.subject, `%${input.search}%`),
            like(gorgiasTickets.customerEmail, `%${input.search}%`),
            like(gorgiasTickets.customerName, `%${input.search}%`)
          )
        );
      }
      if (input.fromDate) {
        conditions.push(gte(gorgiasTickets.gorgiasCreatedAt, new Date(input.fromDate)));
      }
      if (input.toDate) {
        conditions.push(lte(gorgiasTickets.gorgiasCreatedAt, new Date(input.toDate)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const sortColumn = {
        created: gorgiasTickets.gorgiasCreatedAt,
        updated: gorgiasTickets.gorgiasUpdatedAt,
        priority: gorgiasTickets.priority,
      }[input.sortBy];

      const orderBy = input.sortOrder === 'desc' ? desc(sortColumn) : sortColumn;

      const [data, totalResult] = await Promise.all([
        db.select().from(gorgiasTickets).where(whereClause).orderBy(orderBy).limit(input.pageSize).offset(offset),
        db.select({ count: count() }).from(gorgiasTickets).where(whereClause),
      ]);

      return {
        data,
        total: Number(totalResult[0]?.count || 0),
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  getTicket: publicProcedure
    .input(z.object({ ticketId: z.number() }))
    .query(async ({ input }) => {
      if (!db) return null;

      const [ticket] = await db.select().from(gorgiasTickets).where(eq(gorgiasTickets.id, input.ticketId)).limit(1);
      if (!ticket) return null;

      const [messages, tags] = await Promise.all([
        db.select().from(gorgiasMessages).where(eq(gorgiasMessages.ticketId, input.ticketId)).orderBy(gorgiasMessages.gorgiasCreatedAt),
        db.select({
          tag: gorgiasTags,
        }).from(gorgiasTicketTags)
          .innerJoin(gorgiasTags, eq(gorgiasTicketTags.tagId, gorgiasTags.id))
          .where(eq(gorgiasTicketTags.ticketId, input.ticketId)),
      ]);

      return {
        ...ticket,
        messages,
        tags: tags.map(t => t.tag),
      };
    }),

  // ============================================
  // Customer Queries
  // ============================================

  listCustomers: publicProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
      search: z.string().optional(),
      sortBy: z.enum(['created', 'updated', 'ticketCount']).default('created'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }))
    .query(async ({ input }) => {
      if (!db) return { data: [], total: 0, page: input.page, pageSize: input.pageSize };

      const offset = (input.page - 1) * input.pageSize;
      const conditions = [];

      if (input.search) {
        conditions.push(
          or(
            like(gorgiasCustomers.email, `%${input.search}%`),
            like(gorgiasCustomers.name, `%${input.search}%`),
            like(gorgiasCustomers.firstname, `%${input.search}%`),
            like(gorgiasCustomers.lastname, `%${input.search}%`)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const sortColumn = {
        created: gorgiasCustomers.gorgiasCreatedAt,
        updated: gorgiasCustomers.gorgiasUpdatedAt,
        ticketCount: gorgiasCustomers.ticketCount,
      }[input.sortBy];

      const orderBy = input.sortOrder === 'desc' ? desc(sortColumn) : sortColumn;

      const [data, totalResult] = await Promise.all([
        db.select().from(gorgiasCustomers).where(whereClause).orderBy(orderBy).limit(input.pageSize).offset(offset),
        db.select({ count: count() }).from(gorgiasCustomers).where(whereClause),
      ]);

      return {
        data,
        total: Number(totalResult[0]?.count || 0),
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  getCustomer: publicProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      if (!db) return null;

      const [customer] = await db.select().from(gorgiasCustomers).where(eq(gorgiasCustomers.id, input.customerId)).limit(1);
      if (!customer) return null;

      const tickets = await db.select()
        .from(gorgiasTickets)
        .where(eq(gorgiasTickets.customerId, input.customerId))
        .orderBy(desc(gorgiasTickets.gorgiasCreatedAt))
        .limit(50);

      return {
        ...customer,
        tickets,
      };
    }),

  // ============================================
  // Analytics Queries
  // ============================================

  getAnalytics: publicProcedure
    .input(z.object({
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      if (!db) return null;

      const conditions = [];
      if (input.fromDate) {
        conditions.push(gte(gorgiasTickets.gorgiasCreatedAt, new Date(input.fromDate)));
      }
      if (input.toDate) {
        conditions.push(lte(gorgiasTickets.gorgiasCreatedAt, new Date(input.toDate)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Basic stats
      const [totalTickets, openTickets, closedTickets] = await Promise.all([
        db.select({ count: count() }).from(gorgiasTickets).where(whereClause),
        db.select({ count: count() }).from(gorgiasTickets).where(and(whereClause, eq(gorgiasTickets.status, 'open'))),
        db.select({ count: count() }).from(gorgiasTickets).where(and(whereClause, eq(gorgiasTickets.status, 'closed'))),
      ]);

      // Channel breakdown
      const channelBreakdown = await db.select({
        channel: gorgiasTickets.channel,
        count: count(),
      }).from(gorgiasTickets).where(whereClause).groupBy(gorgiasTickets.channel);

      // Priority breakdown
      const priorityBreakdown = await db.select({
        priority: gorgiasTickets.priority,
        count: count(),
      }).from(gorgiasTickets).where(whereClause).groupBy(gorgiasTickets.priority);

      // Average response time (only for tickets that have it)
      const avgResponseTime = await db.select({
        avg: sql<number>`avg(${gorgiasTickets.firstResponseTimeSeconds})`,
      }).from(gorgiasTickets).where(and(whereClause, sql`${gorgiasTickets.firstResponseTimeSeconds} IS NOT NULL`));

      // Average resolution time
      const avgResolutionTime = await db.select({
        avg: sql<number>`avg(${gorgiasTickets.resolutionTimeSeconds})`,
      }).from(gorgiasTickets).where(and(whereClause, sql`${gorgiasTickets.resolutionTimeSeconds} IS NOT NULL`));

      return {
        totalTickets: Number(totalTickets[0]?.count || 0),
        openTickets: Number(openTickets[0]?.count || 0),
        closedTickets: Number(closedTickets[0]?.count || 0),
        channelBreakdown: channelBreakdown.reduce((acc, c) => ({ ...acc, [c.channel]: Number(c.count) }), {} as Record<string, number>),
        priorityBreakdown: priorityBreakdown.reduce((acc, p) => ({ ...acc, [p.priority || 'none']: Number(p.count) }), {} as Record<string, number>),
        avgFirstResponseTimeSeconds: avgResponseTime[0]?.avg || null,
        avgResolutionTimeSeconds: avgResolutionTime[0]?.avg || null,
      };
    }),

  // Tickets by date (for charts)
  ticketsByDate: publicProcedure
    .input(z.object({
      fromDate: z.string(),
      toDate: z.string(),
      groupBy: z.enum(['day', 'week', 'month']).default('day'),
    }))
    .query(async ({ input }) => {
      if (!db) return [];

      const dateFormat = {
        day: 'YYYY-MM-DD',
        week: 'YYYY-"W"IW',
        month: 'YYYY-MM',
      }[input.groupBy];

      const result = await db.select({
        date: sql<string>`to_char(${gorgiasTickets.gorgiasCreatedAt}, ${dateFormat})`,
        total: count(),
        open: sql<number>`count(*) filter (where ${gorgiasTickets.status} = 'open')`,
        closed: sql<number>`count(*) filter (where ${gorgiasTickets.status} = 'closed')`,
      })
        .from(gorgiasTickets)
        .where(and(
          gte(gorgiasTickets.gorgiasCreatedAt, new Date(input.fromDate)),
          lte(gorgiasTickets.gorgiasCreatedAt, new Date(input.toDate))
        ))
        .groupBy(sql`to_char(${gorgiasTickets.gorgiasCreatedAt}, ${dateFormat})`)
        .orderBy(sql`to_char(${gorgiasTickets.gorgiasCreatedAt}, ${dateFormat})`);

      return result.map(r => ({
        date: r.date,
        total: Number(r.total),
        open: Number(r.open),
        closed: Number(r.closed),
      }));
    }),

  // Top customers by ticket count
  topCustomers: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      if (!db) return [];

      return db.select({
        customerId: gorgiasTickets.customerId,
        customerEmail: gorgiasTickets.customerEmail,
        customerName: gorgiasTickets.customerName,
        ticketCount: count(),
      })
        .from(gorgiasTickets)
        .groupBy(gorgiasTickets.customerId, gorgiasTickets.customerEmail, gorgiasTickets.customerName)
        .orderBy(desc(count()))
        .limit(input.limit);
    }),

  // Get users (agents)
  listUsers: publicProcedure.query(async () => {
    if (!db) return [];
    return db.select().from(gorgiasUsers).orderBy(gorgiasUsers.name);
  }),

  // Get tags
  listTags: publicProcedure.query(async () => {
    if (!db) return [];
    return db.select().from(gorgiasTags).orderBy(gorgiasTags.name);
  }),
});
