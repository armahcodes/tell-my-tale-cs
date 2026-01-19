/**
 * Escalations tRPC Router
 * Handles escalation ticket operations
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { dbService } from '@/lib/db/service';

export const escalationsRouter = router({
  /**
   * Create a new escalation
   */
  create: publicProcedure
    .input(z.object({
      conversationId: z.string().uuid().optional(),
      reason: z.string(),
      reasonDetails: z.string().optional(),
      customerSummary: z.string().optional(),
      attemptedSolutions: z.array(z.string()).optional(),
      customerEmail: z.string().email(),
      customerName: z.string().optional(),
      orderNumber: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
      sentimentScore: z.number().min(-1).max(1).optional(),
    }))
    .mutation(async ({ input }) => {
      const escalation = await dbService.escalations.create(input);
      if (!escalation) {
        return { success: false, error: 'Database not available' };
      }
      return { success: true, escalation };
    }),

  /**
   * Get escalation by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const escalation = await dbService.escalations.getById(input.id);
      return { escalation, success: !!escalation };
    }),

  /**
   * Get escalations by status
   */
  getByStatus: publicProcedure
    .input(z.object({
      status: z.enum(['pending', 'assigned', 'in_progress', 'resolved', 'closed']),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const escalations = await dbService.escalations.getByStatus(input.status, input.limit);
      return { escalations, success: true };
    }),

  /**
   * Get all pending escalations sorted by priority
   */
  getPending: publicProcedure.query(async () => {
    const escalations = await dbService.escalations.getPending();
    return { escalations, success: true };
  }),

  /**
   * Get priority counts for pending escalations
   */
  getPriorityCounts: publicProcedure.query(async () => {
    const counts = await dbService.escalations.getPriorityCounts();
    return { counts, success: true };
  }),

  /**
   * Assign escalation to an agent
   */
  assign: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      assignedTo: z.string(),
    }))
    .mutation(async ({ input }) => {
      const escalation = await dbService.escalations.assign(input.id, input.assignedTo);
      if (!escalation) {
        return { success: false, error: 'Escalation not found' };
      }
      return { success: true, escalation };
    }),

  /**
   * Resolve an escalation
   */
  resolve: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      resolution: z.string(),
      resolvedBy: z.string(),
    }))
    .mutation(async ({ input }) => {
      const escalation = await dbService.escalations.resolve(
        input.id, 
        input.resolution, 
        input.resolvedBy
      );
      if (!escalation) {
        return { success: false, error: 'Escalation not found' };
      }
      return { success: true, escalation };
    }),
});
