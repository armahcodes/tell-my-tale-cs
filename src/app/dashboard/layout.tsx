'use client';

/**
 * Dashboard Layout
 * 
 * Protected layout that requires authentication.
 * Redirects to login if user is not authenticated.
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { FloatingChatButton } from '@/components/ui/FloatingChatButton';
import { Menu, X, Loader2 } from 'lucide-react';
import { useSession } from '@/lib/auth/use-auth';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login');
    }
  }, [session, isPending, router]);

  // Show loading state while checking auth
  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B2838] mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard if not authenticated
  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img 
            src="https://tellmytale.com/cdn/shop/files/TEllmyTale_Logo_wide_1.png?v=1748162308&width=500" 
            alt="TellMyTale"
            className="h-8 w-auto"
          />
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-[#1B2838] hover:bg-gray-100 rounded-lg transition-colors"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop always visible, Mobile toggle */}
      <div className={`
        fixed top-0 left-0 h-full z-50 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-0 lg:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} user={session?.user} />
      </div>

      {/* Main Content */}
      <main className="flex-1 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Floating Chat Button - Bottom Right */}
      <FloatingChatButton />
    </div>
  );
}
