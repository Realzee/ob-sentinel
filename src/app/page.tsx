// app/page.tsx (this becomes your login page)
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      console.log('✅ User already authenticated, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('🔐 Attempting login for:', email);

      if (!email || !password) {
        throw new Error('Please enter both email and password');
      }

      // Clear any existing sessions first
      await supabase.auth.signOut();

      // Sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        console.error('❌ Login error:', error);
        throw new Error(error.message);
      }

      console.log('✅ Login successful:', data.user?.email);
      
      // AuthProvider will handle the redirect via onAuthStateChange

    } catch (error: any) {
      console.error('❌ Login failed:', error);
      setError(error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('📝 Attempting sign up for:', email);

      if (!email || !password) {
        throw new Error('Please enter both email and password');
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        console.error('❌ Sign up error:', error);
        throw new Error(error.message);
      }

      if (data.user) {
        setError('Sign up successful! You can now sign in with your credentials.');
      }

    } catch (error: any) {
      console.error('❌ Sign up failed:', error);
      setError(error.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="text-white mt-4">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't show login page if user is authenticated (will redirect)
  if (user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="text-white mt-4">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo Section */}
        <div className="text-center">
          <div className="mx-auto w-32 h-32 rounded-2xl flex items-center justify-center bg-gray-900">
            <Image 
              src="/rapid911-T.png" 
              alt="RAPID REPORT" 
              width={96} 
              height={96}
              className="rounded-lg"
            />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-white">
            RAPID REPORT
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Community Safety Platform
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
              <div className="text-sm text-red-300 text-center">{error}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>Sign in</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <span>Create account</span>
              )}
            </button>
          </div>

          {/* Demo Info */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Use any email and password to create an account
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}