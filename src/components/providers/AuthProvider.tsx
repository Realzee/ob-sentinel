// components/providers/AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signOut: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  signOut: async () => {},
  loading: true,
  error: null
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Enhanced sign out function
  const signOut = async () => {
    try {
      console.log('🚪 Starting enhanced sign out process...');
      
      // Clear all local storage and session storage first
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear specific app data
        const keysToRemove = [
          'supabase.auth.token',
          'supabase.auth.refreshToken',
          'vehicleReports',
          'crimeReports',
          'dashboardStats',
          'userProfile'
        ];
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Supabase sign out error:', error);
        // Continue with redirect anyway
      }
      
      console.log('✅ Sign out completed, redirecting...');
      
      // Reset state
      setUser(null);
      setSession(null);
      setError(null);
      
      // Force full page reload to clear all React state and memory
      window.location.href = '/';
      
    } catch (error) {
      console.error('❌ Error during sign out:', error);
      // Force redirect anyway to ensure user is logged out
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
          setError(error.message);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
      } catch (error: any) {
        console.error('❌ Error in getInitialSession:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event);
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_IN') {
          // Redirect to dashboard after successful sign in
          router.push('/dashboard');
        } else if (event === 'SIGNED_OUT') {
          // Redirect to login after sign out
          router.push('/');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  const value: AuthContextType = {
    user,
    session,
    signOut,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};