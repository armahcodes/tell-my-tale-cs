/**
 * Gorgias tRPC Router
 * Provides API for Gorgias helpdesk operations
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { gorgiasService, isGorgiasConfigured, GorgiasError } from '@/lib/gorgias';
import { dbService } from '@/lib/db/service';

export const gorgiasRouter = router({
  // ============================================
  // Status & Configuration
  // ============================================

  /**
   * Check if Gorgias is configured and available
   */
  status: publicProcedure.query(async () => {
    return {
      configured: isGorgiasConfigured(),
      available: gorgiasService.isAvailable(),
    };
  }),

  // ============================================
  // Ticket Operations
  // ============================================

  /**
   * List tickets with optional filters
   */
  listTickets: publicProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(25),
      status: z.enum(['open', 'closed']).optional(),
      channel: z.string().optional(),
      customerId: z.number().optional(),
      createdFrom: z.string().optional(),
      createdTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      try {
        if (!gorgiasService.isAvailable()) {
          return { tickets: [], meta: null, success: false, error: 'Gorgias not configured' };
        }

        const result = await gorgiasService.listTickets({
          page: input?.page,
          per_page: input?.perPage,
          status: input?.status,
          channel: input?.channel as any,
          customer_id: input?.customerId,
          created_datetime_from: input?.createdFrom,
          created_datetime_to: input?.createdTo,
        });

        return { 
          tickets: result.data, 
          meta: result.meta,
          success: true 
        };
      } catch (error) {
        console.error('Error listing tickets:', error);
        return { 
          tickets: [], 
          meta: null,
          success: false, 
          error: error instanceof GorgiasError ? error.message : 'Failed to list tickets' 
        };
      }
    }),

  /**
   * Get ticket by ID
   */
  getTicket: publicProcedure
    .input(z.object({
      ticketId: z.number(),
    }))
    .query(async ({ input }) => {
      try {
        if (!gorgiasService.isAvailable()) {
          return { ticket: null, success: false, error: 'Gorgias not configured' };
        }

        const ticket = await gorgiasService.getTicket(input.ticketId);
        return { ticket, success: true };
      } catch (error) {
        console.error('Error fetching ticket:', error);
        return { 
          ticket: null, 
          success: false, 
          error: error instanceof GorgiasError ? error.message : 'Failed to fetch ticket' 
        };
      }
    }),

  /**
   * Create a new ticket
   */
  createTicket: publicProcedure
    .input(z.object({
      customerEmail: z.string().email(),
      customerName: z.string().optional(),
      subject: z.string().optional(),
      message: z.string(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
      channel: z.string().default('api'),
    }))
    .mutation(async ({ input }) => {
      try {
        if (!gorgiasService.isAvailable()) {
          return { ticket: null, success: false, error: 'Gorgias not configured' };
        }

        const ticket = await gorgiasService.createTicket({
          channel: input.channel as any,
          via: 'api',
          priority: input.priority,
          subject: input.subject,
          customer: {
            email: input.customerEmail,
            name: input.customerName,
          },
          messages: [{
            channel: input.channel as any,
            via: 'api',
            body_text: input.message,
            from_agent: false,
            sender: {
              email: input.customerEmail,
              name: input.customerName,
            },
          }],
        });

        return { ticket, success: true };
      } catch (error) {
        console.error('Error creating ticket:', error);
        return { 
          ticket: null, 
          success: false, 
          error: error instanceof GorgiasError ? error.message : 'Failed to create ticket' 
        };
      }
    }),

  /**
   * Update ticket status
   */
  updateTicketStatus: publicProcedure
    .input(z.object({
      ticketId: z.number(),
      status: z.enum(['open', 'closed']),
    }))
    .mutation(async ({ input }) => {
      try {
        if (!gorgiasService.isAvailable()) {
          return { ticket: null, success: false, error: 'Gorgias not configured' };
        }

        const ticket = input.status === 'closed'
          ? await gorgiasService.closeTicket(input.ticketId)
          : await gorgiasService.reopenTicket(input.ticketId);

        // Update local escalation record if exists
        await dbService.escalations.updateGorgiasStatus(input.ticketId, input.status);

        return { ticket, success: true };
      } catch (error) {
        console.error('Error updating ticket status:', error);
        return { 
          ticket: null, 
          success: false, 
          error: error instanceof GorgiasError ? error.message : 'Failed to update ticket' 
        };
      }
    }),

  /**
   * Set ticket priority
   */
  setTicketPriority: publicProcedure
    .input(z.object({
      ticketId: z.number(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']),
    }))
    .mutation(async ({ input }) => {
      try {
        if (!gorgiasService.isAvailable()) {
          return { ticket: null, success: false, error: 'Gorgias not configured' };
        }

        const ticket = await gorgiasService.setTicketPriority(input.ticketId, input.priority);
        return { ticket, success: true };
      } catch (error) {
        console.error('Error setting ticket priority:', error);
        return { 
          ticket: null, 
          success: false, 
          error: error instanceof GorgiasError ? error.message : 'Failed to update priority' 
        };
      }
    }),

  /**
   * Assign ticket to user
   */
  assignTicket: publicProcedure
    .input(z.object({
      ticketId: z.number(),
      userId: z.number(),
    }))
    .mutation(async ({ input }) => {
      try {
        if (!gorgiasService.isAvailable()) {
          return { ticket: null, success: false, error: 'Gorgias not configured' };
        }

        const ticket = await gorgiasService.assignTicket(input.ticketId, input.userId);
        return { ticket, success: true };
      } catch (error) {
        console.error('Error assigning ticket:', error);
        return { 
          ticket: null, 
          success: false, 
          error: error instanceof GorgiasError ? error.message : 'Failed to assign ticket' 
        };
      }
    }),

  // ============================================
  // Message Operations
  // ============================================

  /**
   * Get messages for a ticket
   */
  getMessages: publicProcedure
    .input(z.object({
      ticketId: z.number(),
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      try {
        if (!gorgiasService.isAvailable()) {
          return { messages: [], meta: null, success: false, error: 'Gorgias not configured' };
        }

        const result = await gorgiasService.getMessages(input.ticketId, {
          page: input.page,
          per_page: input.perPage,
        });

        return { 
          messages: result.data, 
          meta: result.meta,
          success: true 
        };
      } catch (error) {
        console.error('Error fetching messages:', error);
        return { 
          messages: [], 
          meta: null,
          success: false, 
          error: error instanceof GorgiasError ? error.message : 'Failed to fetch messages' 
        };
      }
    }),

  /**
   * Add message to ticket
   */
  addMessage: publicProcedure
    .input(z.object({
      ticketId: z.number(),
      message: z.string(),
      fromAgent: z.boolean().default(true),
      isPublic: z.boolean().default(true),
      senderEmail: z.string().email().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        if (!gorgiasService.isAvailable()) {
          return { message: null, success: false, error: 'Gorgias not configured' };
        }

        const message = await gorgiasService.addMessage(input.ticketId, {
          channel: 'api',
          via: 'api',
          body_text: input.message,
          from_agent: input.fromAgent,
          public: input.isPublic,
          sender: input.senderEmail ? { email: input.senderEmail } : undefined,
        });

        return { message, success: true };
      } catch (error) {
        console.error('Error adding message:', error);
        return { 
          message: null, 
          success: false, 
          error: error instanceof GorgiasError ? error.message : 'Failed to add message' 
        };
      }
    }),

  /**
   * Add internal note to ticket
   */
  addInternalNote: publicProcedure
    .input(z.object({
      ticketId: z.number(),
      note: z.string(),
      senderEmail: z.string().email().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        if (!gorgiasService.isAvailable()) {
          return { message: null, success: false, error: 'Gorgias not configured' };
        }

        const message = await gorgiasService.addInternalNote(
          input.ticketId, 
          input.note, 
          input.senderEmail
        );

        return { message, success: true };
      } catch (error) {
        console.error('Error adding internal note:', error);
        return { 
          message: null, 
          success: false, 
          error: error instanceof GorgiasError ? error.message : 'Failed to add note' 
        };
      }
    }),

  // ============================================
  // Customer Operations
  // ============================================

  /**
   * List customers
   */
  listCustomers: publicProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(25),
      email: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      try {
        if (!gorgiasService.isAvailable()) {
          return { customers: [], meta: null, success: false, error: 'Gorgias not configured' };
        }

        const result = await gorgiasService.listCustomers({
          page: input?.page,
          per_page: input?.perPage,
          email: input?.email,
        });

        return { 
          customers: result.data, 
          meta: result.meta,
          success: true 
        };
      } catch (error) {
        console.error('Error listing customers:', error);
        return { 
          customers: [], 
          meta: null,
          success: false, 
          error: error instanceof GorgiasError ? error.message : 'Failed to list customers' 
        };
      }
    }),

  /**
   * Get customer by ID
   */
  getCustomer: publicProcedure
    .input(z.object({
      customerId: z.number(),
    }))
    .query(async ({ input }) => {
      try {
        if (!gorgiasService.isAvailable()) {
          return { customer: null, success: false, error: 'Gorgias not configured' };
        }

        const customer = await gorgiasService.getCustomer(input.customerId);
        return { customer, success: true };
      } catch (error) {
        console.error('Error fetching customer:', error);
        return { 
          customer: null, 
          success: false, 
          error: error instanceof GorgiasError ? error.message : 'Failed to fetch customer' 
        };
      }
    }),

  /**
   * Find or create customer by email
   */
  findOrCreateCustomer: publicProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      firstname: z.string().optional(),
      lastname: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        if (!gorgiasService.isAvailable()) {
          return { customer: null, success: false, error: 'Gorgias not configured' };
        }

        const customer = await gorgiasService.findOrCreateCustomer(input.email, {
          name: input.name,
          firstname: input.firstname,
          lastname: input.lastname,
        });

        return { customer, success: true };
      } catch (error) {
        console.error('Error finding/creating customer:', error);
        return { 
          customer: null, 
          success: false, 
          error: error instanceof GorgiasError ? error.message : 'Failed to find/create customer' 
        };
      }
    }),

  // ============================================
  // Sync Operations
  // ============================================

  /**
   * Sync a conversation to Gorgias
   */
  syncConversation: publicProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      try {
        if (!gorgiasService.isAvailable()) {
          return { ticket: null, success: false, error: 'Gorgias not configured' };
        }

        // Get conversation from database
        const conversation = await dbService.conversations.getById(input.conversationId);
        if (!conversation) {
          return { ticket: null, success: false, error: 'Conversation not found' };
        }

        // Get messages for conversation
        const messages = await dbService.messages.getByConversationId(input.conversationId);

        // Sync to Gorgias
        const ticket = await gorgiasService.syncConversation({
          customerEmail: conversation.customerEmail,
          customerName: conversation.customerName || undefined,
          messages: messages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            createdAt: m.createdAt.toISOString(),
          })),
          status: conversation.status === 'resolved' ? 'closed' : 'open',
          orderNumber: conversation.orderNumber || undefined,
          orderId: conversation.orderId || undefined,
          conversationId: conversation.id,
        });

        // Update conversation with Gorgias ticket ID
        // Note: This would require the conversation to have a gorgiasTicketId field
        
        return { 
          ticket, 
          ticketUrl: gorgiasService.getTicketUrl(ticket.id),
          success: true 
        };
      } catch (error) {
        console.error('Error syncing conversation:', error);
        return { 
          ticket: null, 
          success: false, 
          error: error instanceof GorgiasError ? error.message : 'Failed to sync conversation' 
        };
      }
    }),

  /**
   * Get ticket URL for external linking
   */
  getTicketUrl: publicProcedure
    .input(z.object({
      ticketId: z.number(),
    }))
    .query(({ input }) => {
      return {
        url: gorgiasService.getTicketUrl(input.ticketId),
        success: true,
      };
    }),

  // ============================================
  // Tags Operations
  // ============================================

  /**
   * List all tags
   */
  listTags: publicProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      perPage: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input }) => {
      try {
        if (!gorgiasService.isAvailable()) {
          return { tags: [], meta: null, success: false, error: 'Gorgias not configured' };
        }

        const result = await gorgiasService.listTags({
          page: input?.page,
          per_page: input?.perPage,
        });

        return { 
          tags: result.data, 
          meta: result.meta,
          success: true 
        };
      } catch (error) {
        console.error('Error listing tags:', error);
        return { 
          tags: [], 
          meta: null,
          success: false, 
          error: error instanceof GorgiasError ? error.message : 'Failed to list tags' 
        };
      }
    }),
});
