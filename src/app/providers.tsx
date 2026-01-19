'use client';

/**
 * Root Providers
 * Combines all context providers for the app
 */

import { TRPCProvider } from '@/lib/trpc';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </TRPCProvider>
  );
}
