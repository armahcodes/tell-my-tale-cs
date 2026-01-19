/**
 * Neon Auth Configuration
 * Uses @neondatabase/neon-js for authentication
 * Docs: https://neon.com/docs/auth/overview
 */

import { createAuthClient } from '@neondatabase/neon-js/auth';

// Create the auth client with Neon Auth URL from environment
export const authClient = createAuthClient(
  process.env.NEXT_PUBLIC_NEON_AUTH_URL || ''
);

// Export auth methods for convenience
export const {
  signIn,
  signUp,
  signOut,
  getSession,
  useSession,
} = authClient;
