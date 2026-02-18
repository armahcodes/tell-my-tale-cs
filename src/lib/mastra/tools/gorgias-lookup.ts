import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { dbService } from '@/lib/db/service';

/**
 * Gorgias Ticket Lookup Tool
 * Searches the Gorgias data warehouse for customer support history
 */
export const gorgiasTicketLookupTool = createTool({
  id: 'gorgias-ticket-lookup',
  description: 'Look up support tickets from Gorgias by customer email or ticket ID. Returns previous support interactions, ticket status, and conversation history. Use this to understand customer support history before responding.',
  inputSchema: z.object({
    email: z.string().email().optional().describe('Customer email address to find their support tickets'),
    ticketId: z.number().optional().describe('Specific Gorgias ticket ID to look up'),
    limit: z.number().optional().default(5).describe('Maximum number of tickets to return'),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    tickets: z.array(z.object({
      id: z.number(),
      status: z.string(),
      channel: z.string(),
      subject: z.string().nullable(),
      excerpt: z.string().nullable(),
      customerEmail: z.string().nullable(),
      customerName: z.string().nullable(),
      createdAt: z.string(),
      messagesCount: z.number(),
      priority: z.string().nullable(),
    })).optional(),
    totalTickets: z.number().optional(),
    message: z.string(),
  }),
  execute: async (input) => {
    const { email, ticketId, limit = 5 } = input;

    if (!email && !ticketId) {
      return {
        found: false,
        message: 'Please provide either a customer email or ticket ID to search.',
      };
    }

    try {
      // Look up specific ticket by ID
      if (ticketId) {
        const ticket = await dbService.gorgiasWarehouse.getTicketById(ticketId);
        
        if (!ticket) {
          return {
            found: false,
            message: `No ticket found with ID ${ticketId}.`,
          };
        }

        return {
          found: true,
          tickets: [{
            id: ticket.id,
            status: ticket.status,
            channel: ticket.channel,
            subject: ticket.subject,
            excerpt: ticket.excerpt,
            customerEmail: ticket.customerEmail,
            customerName: ticket.customerName,
            createdAt: ticket.gorgiasCreatedAt.toISOString(),
            messagesCount: ticket.messagesCount || 0,
            priority: ticket.priority,
          }],
          totalTickets: 1,
          message: `Found ticket #${ticketId}.`,
        };
      }

      // Look up tickets by customer email
      if (email) {
        // Search tickets directly by email (more reliable than customer records)
        const customerTickets = await dbService.gorgiasWarehouse.getTicketsByEmail(email, limit);

        if (customerTickets.length === 0) {
          return {
            found: false,
            tickets: [],
            totalTickets: 0,
            message: `No support tickets found for ${email}. This may be a new customer or they used a different email.`,
          };
        }

        return {
          found: true,
          tickets: customerTickets.map(t => ({
            id: t.id,
            status: t.status,
            channel: t.channel,
            subject: t.subject,
            excerpt: t.excerpt,
            customerEmail: t.customerEmail,
            customerName: t.customerName,
            createdAt: t.gorgiasCreatedAt.toISOString(),
            messagesCount: t.messagesCount || 0,
            priority: t.priority,
          })),
          totalTickets: customerTickets.length,
          message: `Found ${customerTickets.length} support ticket(s) for ${email}.`,
        };
      }

      return {
        found: false,
        message: 'Unable to search tickets without email or ticket ID.',
      };
    } catch (error) {
      console.error('Gorgias ticket lookup error:', error);
      return {
        found: false,
        message: 'An error occurred while searching support tickets. Please try again.',
      };
    }
  },
});

/**
 * Gorgias Customer History Tool
 * Provides comprehensive customer profile from Gorgias data warehouse
 */
export const gorgiasCustomerHistoryTool = createTool({
  id: 'gorgias-customer-history',
  description: 'Get comprehensive customer support history from Gorgias. Returns customer profile, total tickets, open tickets, and support interaction summary. Use this to understand customer context before responding.',
  inputSchema: z.object({
    email: z.string().email().describe('Customer email address'),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    customer: z.object({
      id: z.number(),
      email: z.string().nullable(),
      name: z.string().nullable(),
      totalTickets: z.number(),
      openTickets: z.number(),
      createdAt: z.string(),
      note: z.string().nullable(),
    }).optional(),
    recentInteractions: z.array(z.object({
      ticketId: z.number(),
      subject: z.string().nullable(),
      status: z.string(),
      channel: z.string(),
      date: z.string(),
    })).optional(),
    message: z.string(),
  }),
  execute: async (input) => {
    const { email } = input;

    try {
      // Get tickets directly by email
      const customerTickets = await dbService.gorgiasWarehouse.getTicketsByEmail(email, 10);
      
      // Also try to get customer profile
      const customer = await dbService.gorgiasWarehouse.getCustomerByEmail(email);
      
      if (customerTickets.length === 0 && !customer) {
        return {
          found: false,
          message: `No support history found for ${email}. This appears to be a new customer with no previous interactions.`,
        };
      }

      const openTickets = customerTickets.filter(t => t.status === 'open').length;
      const closedTickets = customerTickets.filter(t => t.status === 'closed').length;

      return {
        found: true,
        customer: customer ? {
          id: customer.id,
          email: customer.email,
          name: customer.name || `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || null,
          totalTickets: customerTickets.length,
          openTickets: openTickets,
          createdAt: customer.gorgiasCreatedAt?.toISOString() || customer.createdAt.toISOString(),
          note: customer.note,
        } : {
          id: 0,
          email: email,
          name: customerTickets[0]?.customerName || null,
          totalTickets: customerTickets.length,
          openTickets: openTickets,
          createdAt: customerTickets[0]?.gorgiasCreatedAt.toISOString() || new Date().toISOString(),
          note: null,
        },
        recentInteractions: customerTickets.slice(0, 5).map(t => ({
          ticketId: t.id,
          subject: t.subject,
          status: t.status,
          channel: t.channel,
          date: t.gorgiasCreatedAt.toISOString(),
        })),
        message: `Found ${customerTickets.length} support ticket(s) for ${email} (${openTickets} open, ${closedTickets} closed).`,
      };
    } catch (error) {
      console.error('Gorgias customer history error:', error);
      return {
        found: false,
        message: 'An error occurred while fetching customer history. Please try again.',
      };
    }
  },
});

/**
 * Gorgias Ticket Messages Tool
 * Retrieves the full conversation history for a specific ticket
 */
export const gorgiasTicketMessagesTool = createTool({
  id: 'gorgias-ticket-messages',
  description: 'Get the full message history for a specific Gorgias ticket. Use this to understand the complete conversation context of a previous support interaction.',
  inputSchema: z.object({
    ticketId: z.number().describe('Gorgias ticket ID'),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    ticket: z.object({
      id: z.number(),
      subject: z.string().nullable(),
      status: z.string(),
      channel: z.string(),
    }).optional(),
    messages: z.array(z.object({
      id: z.number(),
      fromAgent: z.boolean(),
      senderEmail: z.string().nullable(),
      senderName: z.string().nullable(),
      bodyText: z.string().nullable(),
      sentAt: z.string().nullable(),
    })).optional(),
    message: z.string(),
  }),
  execute: async (input) => {
    const { ticketId } = input;

    try {
      const ticket = await dbService.gorgiasWarehouse.getTicketById(ticketId);
      
      if (!ticket) {
        return {
          found: false,
          message: `Ticket #${ticketId} not found.`,
        };
      }

      const messages = await dbService.gorgiasWarehouse.getTicketMessages(ticketId);

      return {
        found: true,
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          channel: ticket.channel,
        },
        messages: messages.map(m => ({
          id: m.id,
          fromAgent: m.fromAgent || false,
          senderEmail: m.senderEmail,
          senderName: m.senderName,
          bodyText: m.strippedText || m.bodyText,
          sentAt: m.sentDatetime?.toISOString() || m.gorgiasCreatedAt.toISOString(),
        })),
        message: `Found ${messages.length} message(s) in ticket #${ticketId}.`,
      };
    } catch (error) {
      console.error('Gorgias ticket messages error:', error);
      return {
        found: false,
        message: 'An error occurred while fetching ticket messages. Please try again.',
      };
    }
  },
});

/**
 * Gorgias Support Stats Tool
 * Provides overall support statistics and insights
 */
export const gorgiasSupportStatsTool = createTool({
  id: 'gorgias-support-stats',
  description: 'Get overall support statistics from the Gorgias data warehouse. Returns total tickets, open tickets, response times, and channel breakdown. Use for understanding support workload and metrics.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    stats: z.object({
      totalTickets: z.number(),
      openTickets: z.number(),
      closedTickets: z.number(),
      totalCustomers: z.number(),
      totalMessages: z.number(),
      avgResponseTimeSec: z.number().nullable(),
      ticketsToday: z.number(),
      channelBreakdown: z.record(z.string(), z.number()),
    }),
    message: z.string(),
  }),
  execute: async () => {
    try {
      const stats = await dbService.gorgiasWarehouse.getWarehouseStats();

      return {
        stats: {
          totalTickets: stats.totalTickets,
          openTickets: stats.openTickets,
          closedTickets: stats.closedTickets,
          totalCustomers: stats.totalCustomers,
          totalMessages: stats.totalMessages,
          avgResponseTimeSec: stats.avgResponseTimeSec,
          ticketsToday: stats.ticketsToday,
          channelBreakdown: stats.channelBreakdown,
        },
        message: `Support stats: ${stats.totalTickets} total tickets, ${stats.openTickets} open, avg response time ${stats.avgResponseTimeSec ? Math.round(stats.avgResponseTimeSec) + 's' : 'N/A'}.`,
      };
    } catch (error) {
      console.error('Gorgias support stats error:', error);
      return {
        stats: {
          totalTickets: 0,
          openTickets: 0,
          closedTickets: 0,
          totalCustomers: 0,
          totalMessages: 0,
          avgResponseTimeSec: null,
          ticketsToday: 0,
          channelBreakdown: {},
        },
        message: 'An error occurred while fetching support statistics.',
      };
    }
  },
});
