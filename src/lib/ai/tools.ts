import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  gorgiasTickets,
  gorgiasCustomers,
  gorgiasMessages,
  gorgiasTags,
} from '@/lib/db/schema';
import { eq, like, or, desc, sql } from 'drizzle-orm';
import { shopifyService } from '@/lib/shopify';

/**
 * Gorgias Ticket Lookup Tool
 * Searches the local data warehouse for tickets
 */
export const ticketLookupTool = tool({
  description: 'Search for support tickets in the Gorgias data warehouse. Provide at least one of: email, ticketId, or keyword.',
  parameters: z.object({
    searchType: z.enum(['email', 'ticketId', 'keyword', 'all']).describe('Type of search to perform'),
    searchValue: z.string().describe('The value to search for (email address, ticket ID number, or keyword)'),
    status: z.enum(['open', 'closed', 'any']).describe('Filter by ticket status'),
    limit: z.number().describe('Maximum number of tickets to return (1-50)'),
  }),
  execute: async ({ searchType, searchValue, status, limit }) => {
    if (!db) {
      return { success: false, error: 'Database not available', tickets: [] };
    }

    const actualLimit = Math.min(Math.max(limit || 10, 1), 50);

    try {
      let query = db.select().from(gorgiasTickets);

      const conditions = [];

      if (searchType === 'email') {
        conditions.push(eq(gorgiasTickets.customerEmail, searchValue));
      } else if (searchType === 'ticketId') {
        conditions.push(eq(gorgiasTickets.id, parseInt(searchValue, 10)));
      } else if (searchType === 'keyword') {
        conditions.push(
          or(
            like(gorgiasTickets.subject, `%${searchValue}%`),
            like(gorgiasTickets.excerpt, `%${searchValue}%`)
          )
        );
      }

      if (status && status !== 'any') {
        conditions.push(eq(gorgiasTickets.status, status));
      }

      if (conditions.length > 0) {
        query = query.where(or(...conditions)) as typeof query;
      }

      const tickets = await query
        .orderBy(desc(gorgiasTickets.gorgiasCreatedAt))
        .limit(actualLimit);

      return {
        success: true,
        count: tickets.length,
        tickets: tickets.map(t => ({
          id: t.id,
          subject: t.subject,
          status: t.status,
          channel: t.channel,
          customerEmail: t.customerEmail,
          customerName: t.customerName,
          excerpt: t.excerpt,
          messagesCount: t.messagesCount,
          createdAt: t.gorgiasCreatedAt?.toISOString(),
          closedAt: t.closedDatetime?.toISOString(),
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        tickets: [],
      };
    }
  },
});

/**
 * Customer Lookup Tool
 * Searches the local data warehouse for customer information
 */
export const customerLookupTool = tool({
  description: 'Look up customer information from the Gorgias data warehouse by email or name.',
  parameters: z.object({
    searchType: z.enum(['email', 'name']).describe('Search by email or name'),
    searchValue: z.string().describe('The email address or name to search for'),
    limit: z.number().describe('Maximum customers to return (1-20)'),
  }),
  execute: async ({ searchType, searchValue, limit }) => {
    if (!db) {
      return { success: false, error: 'Database not available', customers: [] };
    }

    const actualLimit = Math.min(Math.max(limit || 5, 1), 20);

    try {
      const conditions = [];

      if (searchType === 'email') {
        conditions.push(eq(gorgiasCustomers.email, searchValue));
      } else {
        conditions.push(
          or(
            like(gorgiasCustomers.name, `%${searchValue}%`),
            like(gorgiasCustomers.firstname, `%${searchValue}%`),
            like(gorgiasCustomers.lastname, `%${searchValue}%`)
          )
        );
      }

      const customers = await db
        .select()
        .from(gorgiasCustomers)
        .where(or(...conditions))
        .limit(actualLimit);

      // Get ticket counts for each customer
      const customersWithStats = await Promise.all(
        customers.map(async (customer) => {
          const ticketCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(gorgiasTickets)
            .where(eq(gorgiasTickets.customerEmail, customer.email || ''));

          return {
            id: customer.id,
            email: customer.email,
            name: customer.name,
            firstname: customer.firstname,
            lastname: customer.lastname,
            language: customer.language,
            timezone: customer.timezone,
            note: customer.note,
            ticketCount: Number(ticketCount[0]?.count || 0),
            createdAt: customer.gorgiasCreatedAt?.toISOString(),
          };
        })
      );

      return {
        success: true,
        count: customersWithStats.length,
        customers: customersWithStats,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        customers: [],
      };
    }
  },
});

/**
 * Ticket Messages Tool
 * Retrieves conversation history for a specific ticket
 */
export const ticketMessagesTool = tool({
  description: 'Get the full conversation history for a specific Gorgias ticket. Returns all messages in chronological order.',
  parameters: z.object({
    ticketId: z.number().describe('The Gorgias ticket ID'),
  }),
  execute: async ({ ticketId }) => {
    if (!db) {
      return { success: false, error: 'Database not available', messages: [] };
    }

    try {
      const messages = await db
        .select()
        .from(gorgiasMessages)
        .where(eq(gorgiasMessages.ticketId, ticketId))
        .orderBy(gorgiasMessages.gorgiasCreatedAt);

      return {
        success: true,
        ticketId,
        messageCount: messages.length,
        messages: messages.map(m => ({
          id: m.id,
          channel: m.channel,
          senderEmail: m.senderEmail,
          senderName: m.senderName,
          bodyText: m.strippedText || m.bodyText,
          fromAgent: m.fromAgent,
          sentAt: m.sentDatetime?.toISOString(),
          createdAt: m.gorgiasCreatedAt?.toISOString(),
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        messages: [],
      };
    }
  },
});

/**
 * Warehouse Stats Tool
 * Gets overview statistics from the data warehouse
 */
export const warehouseStatsTool = tool({
  description: 'Get statistics and overview of the Gorgias data warehouse. Shows total tickets, customers, messages, and breakdown by status.',
  parameters: z.object({
    includeDetails: z.boolean().describe('Whether to include detailed breakdown'),
  }),
  execute: async ({ includeDetails }) => {
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    try {
      const [
        totalTickets,
        openTickets,
        closedTickets,
        totalCustomers,
        totalMessages,
        totalTags,
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(gorgiasTickets),
        db.select({ count: sql<number>`count(*)` }).from(gorgiasTickets).where(eq(gorgiasTickets.status, 'open')),
        db.select({ count: sql<number>`count(*)` }).from(gorgiasTickets).where(eq(gorgiasTickets.status, 'closed')),
        db.select({ count: sql<number>`count(*)` }).from(gorgiasCustomers),
        db.select({ count: sql<number>`count(*)` }).from(gorgiasMessages),
        db.select({ count: sql<number>`count(*)` }).from(gorgiasTags),
      ]);

      return {
        success: true,
        stats: {
          tickets: {
            total: Number(totalTickets[0]?.count || 0),
            open: Number(openTickets[0]?.count || 0),
            closed: Number(closedTickets[0]?.count || 0),
          },
          customers: Number(totalCustomers[0]?.count || 0),
          messages: Number(totalMessages[0]?.count || 0),
          tags: Number(totalTags[0]?.count || 0),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

/**
 * Order Lookup Tool
 * Uses Shopify service to look up orders
 */
export const orderLookupTool = tool({
  description: 'Look up order details from Shopify by order number and customer email.',
  parameters: z.object({
    orderNumber: z.string().describe('The order number (e.g., 1001)'),
    email: z.string().describe('Customer email address used for the order'),
  }),
  execute: async ({ orderNumber, email }) => {
    try {
      const order = await shopifyService.lookupOrderByNumber(orderNumber, email);
      if (!order) {
        return {
          success: false,
          error: `Order #${orderNumber} not found for email ${email}`,
        };
      }
      return { success: true, orders: [order] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Order lookup failed',
      };
    }
  },
});

/**
 * Search Tickets by Date Range
 */
export const searchTicketsByDateTool = tool({
  description: 'Search tickets within a date range. Useful for finding recent issues or analyzing trends.',
  parameters: z.object({
    startDate: z.string().describe('Start date in ISO format (YYYY-MM-DD)'),
    endDate: z.string().describe('End date in ISO format (YYYY-MM-DD), use today date if not specified'),
    status: z.enum(['open', 'closed', 'any']).describe('Filter by ticket status'),
    limit: z.number().describe('Maximum number of tickets to return (1-50)'),
  }),
  execute: async ({ startDate, endDate, status, limit }) => {
    if (!db) {
      return { success: false, error: 'Database not available', tickets: [] };
    }

    const actualLimit = Math.min(Math.max(limit || 20, 1), 50);

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      let query = db
        .select()
        .from(gorgiasTickets)
        .where(
          sql`${gorgiasTickets.gorgiasCreatedAt} >= ${start} AND ${gorgiasTickets.gorgiasCreatedAt} <= ${end}`
        );

      if (status && status !== 'any') {
        query = query.where(eq(gorgiasTickets.status, status)) as typeof query;
      }

      const tickets = await query
        .orderBy(desc(gorgiasTickets.gorgiasCreatedAt))
        .limit(actualLimit);

      return {
        success: true,
        dateRange: { start: startDate, end: endDate || 'today' },
        count: tickets.length,
        tickets: tickets.map(t => ({
          id: t.id,
          subject: t.subject,
          status: t.status,
          channel: t.channel,
          customerEmail: t.customerEmail,
          createdAt: t.gorgiasCreatedAt?.toISOString(),
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        tickets: [],
      };
    }
  },
});

// Export all tools
export const agentTools = {
  ticketLookup: ticketLookupTool,
  customerLookup: customerLookupTool,
  ticketMessages: ticketMessagesTool,
  warehouseStats: warehouseStatsTool,
  orderLookup: orderLookupTool,
  searchTicketsByDate: searchTicketsByDateTool,
};
