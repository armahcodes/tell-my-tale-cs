'use client';

import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';
import { adminClient } from 'better-auth/client/plugins';

/**
 * Better Auth Client
 * Use this for client-side authentication operations
 * 
 * Features:
 * - Email/Password authentication
 * - Organization management (teams, members, invitations)
 * - Admin user management
 * 
 * The baseURL is determined by:
 * 1. NEXT_PUBLIC_APP_URL environment variable (for production)
 * 2. window.location.origin (for client-side)
 * 3. Empty string fallback (will use relative URLs)
 */
const getBaseURL = () => {
  // Use environment variable if set (works on both server and client)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // Fallback to window origin on client
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Empty string for SSR (will use relative URLs)
  return '';
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [
    organizationClient(),
    adminClient(),
  ],
});

// Export commonly used methods
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  // Organization methods
  organization,
  useActiveOrganization,
  useListOrganizations,
  // Admin methods
  admin,
} = authClient;

// Legacy exports for compatibility
export async function getCurrentUser() {
  const session = await getSession();
  return session?.data?.user || null;
}
