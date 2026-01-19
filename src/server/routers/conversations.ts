/**
 * Conversations tRPC Router
 * Handles conversation and message operations
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { dbService } from '@/lib/db/service';

export const conversationsRouter = router({
  /**
   * Create a new conversation
   */
  create: publicProcedure
    .input(z.object({
      customerEmail: z.string().email(),
      customerName: z.string().optional(),
      channel: z.enum(['web_chat', 'email', 'contact_form', 'mobile_app']).default('web_chat'),
      orderNumber: z.string().optional(),
      orderId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const conversation = await dbService.conversations.create(input);
      if (!conversation) {
        return { success: false, error: 'Database not available' };
      }
      return { success: true, conversation };
    }),

  /**
   * Get conversation by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const conversation = await dbService.conversations.getById(input.id);
      return { conversation, success: !!conversation };
    }),

  /**
   * Get conversations by email
   */
  getByEmail: publicProcedure
    .input(z.object({
      email: z.string().email(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const conversations = await dbService.conversations.getByEmail(input.email, input.limit);
      return { conversations, success: true };
    }),

  /**
   * Get recent conversations
   */
  getRecent: publicProcedure
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const conversations = await dbService.conversations.getRecent(input);
      return { conversations, success: true };
    }),

  /**
   * Update conversation status
   */
  updateStatus: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['active', 'resolved', 'escalated', 'closed']),
    }))
    .mutation(async ({ input }) => {
      const conversation = await dbService.conversations.updateStatus(input.id, input.status);
      if (!conversation) {
        return { success: false, error: 'Conversation not found' };
      }
      
      // Update stats if resolved
      if (input.status === 'resolved') {
        await dbService.stats.incrementResolvedCount();
      }
      
      return { success: true, conversation };
    }),

  /**
   * Get conversation counts by status
   */
  getStatusCounts: publicProcedure.query(async () => {
    const counts = await dbService.conversations.getStatusCounts();
    return { counts, success: true };
  }),

  /**
   * Get messages for a conversation
   */
  getMessages: publicProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ input }) => {
      const messages = await dbService.messages.getByConversationId(input.conversationId);
      return { messages, success: true };
    }),

  /**
   * Add a message to a conversation
   */
  addMessage: publicProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
      toolsUsed: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const message = await dbService.messages.create(input);
      if (!message) {
        return { success: false, error: 'Failed to create message' };
      }
      return { success: true, message };
    }),
});
