/**
 * Neon Auth Exports
 * 
 * Managed authentication that branches with your database.
 * Documentation: https://neon.com/docs/auth/overview
 */

export { authClient, getSession, getCurrentUser, signOut } from './client';
export { AuthProvider } from './provider';
