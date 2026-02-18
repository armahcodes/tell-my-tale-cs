'use client';

import { authClient } from './client';

/**
 * Hook to get the current session
 * Returns { data, isPending, error }
 */
export function useSession() {
  return authClient.useSession();
}

/**
 * Hook to get the current user
 */
export function useUser() {
  const session = useSession();
  return {
    user: session.data?.user || null,
    isPending: session.isPending,
    error: session.error,
  };
}

/**
 * Hook to get the sign out function
 */
export function useSignOut() {
  return {
    signOut: async () => {
      await authClient.signOut();
    },
  };
}
