'use client';

/**
 * Neon Auth Provider for React
 * 
 * Wraps the app with authentication context using Neon Auth UI components.
 * Documentation: https://neon.com/docs/auth/overview
 */

import { NeonAuthUIProvider } from '@neondatabase/neon-js/auth/react/ui';
import { authClient } from './client';
import { ReactNode } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <NeonAuthUIProvider authClient={authClient}>
      {children}
    </NeonAuthUIProvider>
  );
}
