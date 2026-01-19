'use client';

/**
 * Root Providers
 * Combines all context providers for the app
 */

import { TRPCProvider } from '@/lib/trpc';
import { ToastProvider } from '@/components/ui/Toast';
import { NeonAuthProvider } from '@/lib/auth/neon-auth-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NeonAuthProvider>
      <TRPCProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </TRPCProvider>
    </NeonAuthProvider>
  );
}
