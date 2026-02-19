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
import { gorgiasRouter } from './gorgias';
import { gorgiasWarehouseRouter } from './gorgias-warehouse';
import { agentsRouter } from './agents';

export const appRouter = router({
  shopify: shopifyRouter,
  dashboard: dashboardRouter,
  conversations: conversationsRouter,
  escalations: escalationsRouter,
  notes: notesRouter,
  gorgias: gorgiasRouter,
  gorgiasWarehouse: gorgiasWarehouseRouter,
  agents: agentsRouter,
});

// Export type for client usage
export type AppRouter = typeof appRouter;
