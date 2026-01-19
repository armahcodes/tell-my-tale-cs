/**
 * Notes tRPC Router
 * Handles notes for orders, customers, and conversations
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { dbService } from '@/lib/db/service';

export const notesRouter = router({
  /**
   * Create a new note
   */
  create: publicProcedure
    .input(z.object({
      entityType: z.enum(['order', 'customer', 'conversation']),
      entityId: z.string(),
      content: z.string(),
      author: z.string(),
      authorType: z.enum(['ai', 'human', 'system']).default('human'),
      isInternal: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const note = await dbService.notes.create(input);
      if (!note) {
        return { success: false, error: 'Database not available' };
      }
      return { success: true, note };
    }),

  /**
   * Get notes for an entity
   */
  getByEntity: publicProcedure
    .input(z.object({
      entityType: z.enum(['order', 'customer', 'conversation']),
      entityId: z.string(),
    }))
    .query(async ({ input }) => {
      const notes = await dbService.notes.getByEntity(input.entityType, input.entityId);
      return { notes, success: true };
    }),
});
