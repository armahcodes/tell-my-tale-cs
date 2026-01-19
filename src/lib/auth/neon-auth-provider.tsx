'use client';

/**
 * Neon Auth Provider
 * Wraps the app with authentication context
 */

import { NeonAuthUIProvider } from '@neondatabase/neon-js/auth/react/ui';
import { authClient } from './neon-auth';
import { ReactNode } from 'react';

interface NeonAuthProviderProps {
  children: ReactNode;
}

export function NeonAuthProvider({ children }: NeonAuthProviderProps) {
  return (
    <NeonAuthUIProvider authClient={authClient}>
      {children}
    </NeonAuthUIProvider>
  );
}
