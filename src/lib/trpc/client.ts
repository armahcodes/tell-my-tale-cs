/**
 * tRPC Client Configuration
 * For use in React components
 */

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/routers';

export const trpc = createTRPCReact<AppRouter>();
