'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient, useSession } from '@/lib/auth';
import { CheckCircle, Loader2, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const session = useSession();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session?.data && !session.isPending) {
      router.push('/dashboard');
    }
  }, [session?.data, session?.isPending, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        setError(result.error.message || 'Failed to create account');
      } else if (result.data) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (session?.data && !session.isPending) {
    return (
      <div className="min-h-screen bg-[#1B2838] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1B2838] to-[#2D4A6F] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-40 right-20 w-80 h-80 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 left-10 w-72 h-72 rounded-full bg-[#4A90D9]/30 blur-3xl" />
        </div>
        
        {/* Logo */}
        <div className="relative z-10">
          <img 
            src="https://tellmytale.com/cdn/shop/files/TEllmyTale_Logo_wide_1.png?v=1748162308&width=500" 
            alt="TellMyTale"
            className="h-10 w-auto brightness-0 invert"
          />
        </div>
        
        {/* Features */}
        <div className="relative z-10 space-y-8">
          <h2 className="text-3xl font-bold leading-tight">
            Start Your Customer Success Journey
          </h2>
          <p className="text-lg text-white/80">
            Join thousands of businesses transforming customer support with AI.
          </p>
          
          <div className="space-y-4">
            <BenefitItem text="Free 14-day trial, no credit card required" />
            <BenefitItem text="Setup in under 5 minutes" />
            <BenefitItem text="AI trained on your products & policies" />
            <BenefitItem text="24/7 automated customer support" />
            <BenefitItem text="Full Shopify integration" />
          </div>
        </div>
        
        {/* Footer */}
        <div className="relative z-10 text-sm text-white/60">
          <p>&copy; 2024 TellMyTale. All rights reserved.</p>
        </div>
      </div>
      
      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
        {/* Mobile Logo */}
        <div className="lg:hidden mb-8">
          <img 
            src="https://tellmytale.com/cdn/shop/files/TEllmyTale_Logo_wide_1.png?v=1748162308&width=500" 
            alt="TellMyTale"
            className="h-10 w-auto"
          />
        </div>
        
        {/* Auth Card */}
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-[#1B2838] mb-2">Create Your Account</h1>
              <p className="text-gray-500">Get started with TellMyTale</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#1B2838] focus:ring-1 focus:ring-[#1B2838] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#1B2838] focus:ring-1 focus:ring-[#1B2838] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#1B2838] focus:ring-1 focus:ring-[#1B2838] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#1B2838] focus:ring-1 focus:ring-[#1B2838] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#1B2838] text-white rounded-xl font-semibold hover:bg-[#2D4A6F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <a href="/login" className="text-[#1B2838] font-semibold hover:text-[#2D4A6F] transition-colors">
                  Sign in
                </a>
              </p>
            </div>
          </div>
          
          {/* Terms */}
          <p className="mt-6 text-center text-xs text-gray-400">
            By creating an account, you agree to our{' '}
            <a href="#" className="underline hover:text-gray-600">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="underline hover:text-gray-600">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle className="w-5 h-5 text-[#4A90D9] flex-shrink-0" />
      <span className="text-white/90">{text}</span>
    </div>
  );
}
