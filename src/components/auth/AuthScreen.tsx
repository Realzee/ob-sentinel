'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

export default function AuthScreen() {
  const [email, setEmail] = useState('zweli@msn.com');
  const [password, setPassword] = useState('admin123');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { signIn, signUp } = useAuth();

  useEffect(() => {
    const emailInput = document.getElementById('email');
    if (emailInput && window.innerWidth < 768) {
      emailInput.focus();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const result = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (result.error) {
        setMessage(result.error.message);
      } else if (isSignUp) {
        setMessage('Check your email for verification link');
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute inset-0 theme-glow opacity-20"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-600 rounded-full filter blur-3xl opacity-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-yellow-500 rounded-full filter blur-3xl opacity-10 animate-pulse delay-1000"></div>
      
      <div className="max-w-md w-full mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-center mb-4 space-y-3 sm:space-y-0 sm:space-x-3">
            <div className="w-12 h-12 theme-border rounded-lg flex items-center justify-center theme-glow">
              <span className="text-xl font-bold theme-text-glow">RR</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold theme-text-glow">RAPID REPORT</h1>
          </div>
          <p className="text-gray-300 text-sm sm:text-lg">Smart Reporting System</p>
        </div>

        {/* Auth Card */}
        <div className="theme-card rounded-xl sm:rounded-2xl p-4 sm:p-8 backdrop-blur-sm">
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white theme-text-glow">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-gray-300 text-sm sm:text-base mt-1 sm:mt-2">
              {isSignUp ? 'Sign up to get started' : 'Sign in to your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-black theme-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-black theme-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter your password"
                required
              />
            </div>

            {message && (
              <div className={`p-2 sm:p-3 rounded-lg text-xs sm:text-sm ${
                message.includes('Check your email') 
                  ? 'bg-green-900 text-green-300 border border-green-700' 
                  : 'bg-red-900 text-red-300 border border-red-700'
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full theme-button py-2 sm:py-3 px-4 text-sm sm:text-base rounded-lg font-semibold transition-all disabled:opacity-50"
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-4 sm:mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-red-400 hover:text-red-300 font-medium text-sm sm:text-base transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          {/* Demo Note */}
          <div className="mt-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
            <p className="text-xs sm:text-sm text-gray-300 text-center">
              <strong>Demo Account:</strong> zweli@msn.com / admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}