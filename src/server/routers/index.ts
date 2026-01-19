/**
 * Root tRPC Router
 * Combines all routers into a single API
 */

import { router } from '../trpc';
import { shopifyRouter } from './shopify';
import { dashboardRouter } from './dashboard';
import { conversationsRouter } from './conversations';
import { escalationsRouter } from './escalations';
import { notesRouter } from './notes';

export const appRouter = router({
  shopify: shopifyRouter,
  dashboard: dashboardRouter,
  conversations: conversationsRouter,
  escalations: escalationsRouter,
  notes: notesRouter,
});

// Export type for client usage
export type AppRouter = typeof appRouter;
