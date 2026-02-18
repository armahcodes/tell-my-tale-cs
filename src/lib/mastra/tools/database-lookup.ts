import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { dbService } from '@/lib/db/service';

/**
 * Conversation Lookup Tool
 * Searches the app's conversation database
 */
export const conversationLookupTool = createTool({
  id: 'conversation-lookup',
  description: 'Look up AI chat conversations from the app database by customer email. Returns previous chat interactions with our AI assistant. Use this to see what the customer has asked before.',
  inputSchema: z.object({
    email: z.string().email().describe('Customer email address'),
    limit: z.number().optional().default(5).describe('Maximum conversations to return'),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    conversations: z.array(z.object({
      id: z.string(),
      customerEmail: z.string(),
      customerName: z.string().nullable(),
      status: z.string(),
      channel: z.string(),
      messageCount: z.number(),
      createdAt: z.string(),
      lastMessageAt: z.string().nullable(),
    })).optional(),
    totalCount: z.number(),
    message: z.string(),
  }),
  execute: async (input) => {
    const { email, limit = 5 } = input;

    try {
      const conversations = await dbService.conversations.getByEmail(email, limit);

      if (!conversations || conversations.length === 0) {
        return {
          found: false,
          conversations: [],
          totalCount: 0,
          message: `No previous chat conversations found for ${email}.`,
        };
      }

      return {
        found: true,
        conversations: conversations.map(c => ({
          id: c.id,
          customerEmail: c.customerEmail,
          customerName: c.customerName,
          status: c.status,
          channel: c.channel || 'chat',
          messageCount: c.messageCount || 0,
          createdAt: c.createdAt.toISOString(),
          lastMessageAt: c.updatedAt?.toISOString() || null,
        })),
        totalCount: conversations.length,
        message: `Found ${conversations.length} previous chat conversation(s) for ${email}.`,
      };
    } catch (error) {
      console.error('Conversation lookup error:', error);
      return {
        found: false,
        conversations: [],
        totalCount: 0,
        message: 'Error searching conversations.',
      };
    }
  },
});

/**
 * Conversation Messages Tool
 * Gets all messages from a specific conversation
 */
export const conversationMessagesTool = createTool({
  id: 'conversation-messages',
  description: 'Get all messages from a specific AI chat conversation. Use this to see the full conversation history with a customer.',
  inputSchema: z.object({
    conversationId: z.string().uuid().describe('The conversation ID'),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    conversation: z.object({
      id: z.string(),
      customerEmail: z.string(),
      status: z.string(),
    }).optional(),
    messages: z.array(z.object({
      id: z.string(),
      role: z.string(),
      content: z.string(),
      sentAt: z.string(),
    })).optional(),
    message: z.string(),
  }),
  execute: async (input) => {
    const { conversationId } = input;

    try {
      const conversation = await dbService.conversations.getById(conversationId);

      if (!conversation) {
        return {
          found: false,
          message: `Conversation ${conversationId} not found.`,
        };
      }

      const messages = await dbService.messages.getByConversationId(conversationId);

      return {
        found: true,
        conversation: {
          id: conversation.id,
          customerEmail: conversation.customerEmail,
          status: conversation.status,
        },
        messages: messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sentAt: m.createdAt.toISOString(),
        })),
        message: `Found ${messages.length} messages in conversation.`,
      };
    } catch (error) {
      console.error('Conversation messages error:', error);
      return {
        found: false,
        message: 'Error fetching conversation messages.',
      };
    }
  },
});

/**
 * Dashboard Stats Tool
 * Gets overall dashboard statistics
 */
export const dashboardStatsTool = createTool({
  id: 'dashboard-stats',
  description: 'Get overall dashboard statistics including conversation counts, resolution rates, and support metrics. Use this to understand current support workload.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    stats: z.object({
      totalConversations: z.number(),
      activeConversations: z.number(),
      resolvedToday: z.number(),
      avgResponseTime: z.string(),
      totalMessages: z.number(),
      pendingEscalations: z.number(),
    }),
    gorgias: z.object({
      totalTickets: z.number(),
      openTickets: z.number(),
      totalCustomers: z.number(),
    }),
    message: z.string(),
  }),
  execute: async () => {
    try {
      const [stats, warehouseStats] = await Promise.all([
        dbService.stats.getDashboardStats(),
        dbService.gorgiasWarehouse.getWarehouseStats(),
      ]);

      return {
        stats: {
          totalConversations: stats.totalConversations,
          activeConversations: stats.activeNow,
          resolvedToday: stats.resolvedToday,
          avgResponseTime: stats.avgResponseTime,
          totalMessages: stats.totalMessages,
          pendingEscalations: stats.pendingEscalations,
        },
        gorgias: {
          totalTickets: warehouseStats.totalTickets,
          openTickets: warehouseStats.openTickets,
          totalCustomers: warehouseStats.totalCustomers,
        },
        message: `Current stats: ${stats.totalConversations} total conversations, ${stats.activeNow} active, ${warehouseStats.totalTickets} Gorgias tickets.`,
      };
    } catch (error) {
      console.error('Dashboard stats error:', error);
      return {
        stats: {
          totalConversations: 0,
          activeConversations: 0,
          resolvedToday: 0,
          avgResponseTime: '—',
          totalMessages: 0,
          pendingEscalations: 0,
        },
        gorgias: {
          totalTickets: 0,
          openTickets: 0,
          totalCustomers: 0,
        },
        message: 'Error fetching dashboard stats.',
      };
    }
  },
});

/**
 * Customer Search Tool
 * Search for customers across all data sources
 */
export const customerSearchTool = createTool({
  id: 'customer-search',
  description: 'Search for a customer across all databases (AI conversations, Gorgias tickets, Shopify). Returns a unified view of the customer.',
  inputSchema: z.object({
    email: z.string().email().describe('Customer email to search for'),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    customer: z.object({
      email: z.string(),
      name: z.string().nullable(),
      aiConversations: z.number(),
      gorgiasTickets: z.number(),
      openGorgiasTickets: z.number(),
      lastInteraction: z.string().nullable(),
    }).optional(),
    message: z.string(),
  }),
  execute: async (input) => {
    const { email } = input;

    try {
      const [conversations, gorgiasTickets, gorgiasCustomer] = await Promise.all([
        dbService.conversations.getByEmail(email, 100),
        dbService.gorgiasWarehouse.getTicketsByEmail(email, 100),
        dbService.gorgiasWarehouse.getCustomerByEmail(email),
      ]);

      const hasAnyData = (conversations && conversations.length > 0) || gorgiasTickets.length > 0 || gorgiasCustomer;

      if (!hasAnyData) {
        return {
          found: false,
          message: `No customer found with email ${email} in any of our systems.`,
        };
      }

      const openTickets = gorgiasTickets.filter(t => t.status === 'open').length;
      
      // Get the most recent interaction date
      const dates = [
        ...(conversations || []).map(c => new Date(c.updatedAt || c.createdAt)),
        ...gorgiasTickets.map(t => new Date(t.gorgiasCreatedAt)),
      ];
      const lastInteraction = dates.length > 0 
        ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString()
        : null;

      // Get customer name from any source
      const name = gorgiasCustomer?.name 
        || (gorgiasCustomer?.firstname && gorgiasCustomer?.lastname 
          ? `${gorgiasCustomer.firstname} ${gorgiasCustomer.lastname}`.trim() 
          : null)
        || gorgiasTickets[0]?.customerName
        || (conversations && conversations[0]?.customerName)
        || null;

      return {
        found: true,
        customer: {
          email,
          name,
          aiConversations: conversations?.length || 0,
          gorgiasTickets: gorgiasTickets.length,
          openGorgiasTickets: openTickets,
          lastInteraction,
        },
        message: `Found customer ${email}: ${conversations?.length || 0} AI chats, ${gorgiasTickets.length} Gorgias tickets (${openTickets} open).`,
      };
    } catch (error) {
      console.error('Customer search error:', error);
      return {
        found: false,
        message: 'Error searching for customer.',
      };
    }
  },
});
