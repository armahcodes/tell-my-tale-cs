'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth Client
 * Use this for client-side authentication operations
 */
export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
});

// Export commonly used methods
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

// Legacy exports for compatibility
export async function getCurrentUser() {
  const session = await getSession();
  return session?.data?.user || null;
}
