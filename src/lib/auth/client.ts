/**
 * Neon Auth Client Configuration
 * 
 * Neon Auth is a managed authentication service built on Better Auth.
 * It stores users, sessions, and auth configuration directly in Postgres.
 * 
 * Documentation: https://neon.com/docs/auth/overview
 */

import { createAuthClient } from '@neondatabase/neon-js/auth';

// Neon Auth URL from environment
const NEON_AUTH_URL = process.env.NEXT_PUBLIC_NEON_AUTH_URL || '';

if (!NEON_AUTH_URL && typeof window !== 'undefined') {
  console.warn('NEXT_PUBLIC_NEON_AUTH_URL is not set. Authentication will not work.');
}

/**
 * Auth client for use in components and API routes
 */
export const authClient = createAuthClient(NEON_AUTH_URL);

/**
 * Helper to get the current session
 */
export async function getSession() {
  try {
    const result = await authClient.getSession();
    return result?.data || null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Helper to get the current user
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  try {
    await authClient.signOut();
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}
