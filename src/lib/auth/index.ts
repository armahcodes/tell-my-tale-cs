/**
 * Better Auth Exports (Client-safe)
 * 
 * Modern authentication for Next.js applications.
 * Documentation: https://www.better-auth.com/docs
 * 
 * Features:
 * - Email/Password authentication
 * - Organization management (teams, members, invitations)
 * - Admin user management
 * 
 * Note: For server-side utilities, import from '@/lib/auth/server' directly.
 */

// Client-side methods
export { 
  authClient, 
  signIn, 
  signUp, 
  signOut, 
  getSession, 
  getCurrentUser,
  // Organization methods
  organization,
  useActiveOrganization,
  useListOrganizations,
  // Admin methods
  admin,
} from './client';

// Provider
export { AuthProvider } from './provider';

// Hooks
export { useSession, useUser, useSignOut } from './use-auth';

// Backwards compatibility - NeonAuthProvider was the old provider
export { AuthProvider as NeonAuthProvider } from './provider';
