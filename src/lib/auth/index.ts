/**
 * Better Auth Exports (Client-safe)
 * 
 * Modern authentication for Next.js applications.
 * Documentation: https://www.better-auth.com/docs
 * 
 * Note: For server-side utilities, import from '@/lib/auth/server' directly.
 */

// Client-side methods
export { authClient, signIn, signUp, signOut, getSession, getCurrentUser } from './client';

// Provider
export { AuthProvider } from './provider';

// Hooks
export { useSession, useUser, useSignOut } from './use-auth';

// Backwards compatibility - NeonAuthProvider was the old provider
export { AuthProvider as NeonAuthProvider } from './provider';
