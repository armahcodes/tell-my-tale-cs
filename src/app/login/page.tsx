'use client';

import { AuthView } from '@neondatabase/neon-js/auth/react/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/lib/auth/neon-auth';

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (session && !isPending) {
      router.push('/dashboard');
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B2838]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8">
        <img 
          src="https://tellmytale.com/cdn/shop/files/TEllmyTale_Logo_wide_1.png?v=1748162308&width=500" 
          alt="TellMyTale"
          className="h-12 w-auto"
        />
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#1B2838] mb-2">Welcome Back</h1>
          <p className="text-gray-500 text-sm">Sign in to access the customer success dashboard</p>
        </div>

        {/* Neon Auth View - Sign In */}
        <AuthView 
          pathname="sign-in"
          onSuccess={() => router.push('/dashboard')}
        />

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Don't have an account?{' '}
            <a href="/signup" className="text-[#1B2838] font-medium hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-sm text-gray-400">
        TellMyTale Customer Success Platform
      </p>
    </div>
  );
}
