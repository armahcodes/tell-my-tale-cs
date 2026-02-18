'use client';

import { ReactNode } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider for Better Auth
 * Better Auth uses React's built-in context through its useSession hook
 * This wrapper is kept for compatibility but doesn't need additional providers
 */
export function AuthProvider({ children }: AuthProviderProps) {
  return <>{children}</>;
}
