'use client';

/**
 * Root Providers
 * Combines all context providers for the app
 */

import { TRPCProvider } from '@/lib/trpc';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/lib/auth/provider';
import { FloatingChatButton } from '@/components/ui/FloatingChatButton';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TRPCProvider>
        <ToastProvider>
          {children}
          <FloatingChatButton />
        </ToastProvider>
      </TRPCProvider>
    </AuthProvider>
  );
}
