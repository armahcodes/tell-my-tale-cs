import { headers } from 'next/headers';
import { cache } from 'react';
import { auth } from './auth';

/**
 * Get the current session on the server
 * This is cached per-request for performance
 */
export const getServerSession = cache(async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
});

/**
 * Get the current user on the server
 */
export const getServerUser = cache(async () => {
  const session = await getServerSession();
  return session?.user || null;
});

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth() {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
