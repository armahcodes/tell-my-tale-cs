'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authClient, useSession } from '@/lib/auth';
import { Loader2, Check, X, Building2, LogIn } from 'lucide-react';

export default function AcceptInvitationPage() {
  const router = useRouter();
  const params = useParams();
  const invitationId = params.id as string;
  const { data: session, isPending: sessionPending } = useSession();

  const [status, setStatus] = useState<'loading' | 'accepting' | 'success' | 'error' | 'login_required'>('loading');
  const [error, setError] = useState('');
  const [organizationName, setOrganizationName] = useState('');

  useEffect(() => {
    if (!sessionPending) {
      if (!session) {
        setStatus('login_required');
      } else {
        acceptInvitation();
      }
    }
  }, [session, sessionPending, invitationId]);

  const acceptInvitation = async () => {
    setStatus('accepting');
    try {
      const { data, error } = await authClient.organization.acceptInvitation({
        invitationId,
      });

      if (error) {
        setStatus('error');
        setError(error.message || 'Failed to accept invitation');
      } else if (data) {
        setStatus('success');
        // The response contains member info, we'll use a generic message
        setOrganizationName('the organization');
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard/team');
        }, 2000);
      }
    } catch (err) {
      setStatus('error');
      setError('An unexpected error occurred');
    }
  };

  if (sessionPending || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1B2838] to-[#2D4A6F]">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#1B2838] mx-auto mb-4" />
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (status === 'login_required') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1B2838] to-[#2D4A6F]">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-[#1B2838]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-8 h-8 text-[#1B2838]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1B2838] mb-2">Sign In Required</h1>
          <p className="text-gray-500 mb-6">
            Please sign in to accept this invitation and join the organization.
          </p>
          <div className="space-y-3">
            <a
              href={`/login?callbackUrl=${encodeURIComponent(`/invite/${invitationId}`)}`}
              className="block w-full py-3 bg-[#1B2838] text-white rounded-xl font-semibold hover:bg-[#2D4A6F] transition-colors"
            >
              Sign In
            </a>
            <a
              href={`/signup?callbackUrl=${encodeURIComponent(`/invite/${invitationId}`)}`}
              className="block w-full py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Create Account
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'accepting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1B2838] to-[#2D4A6F]">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#1B2838] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#1B2838] mb-2">Accepting Invitation</h1>
          <p className="text-gray-500">Please wait while we process your request...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1B2838] to-[#2D4A6F]">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#1B2838] mb-2">Welcome to the Team!</h1>
          <p className="text-gray-500 mb-6">
            You have successfully joined <strong>{organizationName}</strong>.
          </p>
          <p className="text-sm text-gray-400">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1B2838] to-[#2D4A6F]">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#1B2838] mb-2">Invitation Failed</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="block w-full py-3 bg-[#1B2838] text-white rounded-xl font-semibold hover:bg-[#2D4A6F] transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="block w-full py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
