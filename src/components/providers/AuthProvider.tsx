// components/providers/AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  signOut: async () => {},
  loading: true
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
  const router = useRouter();
  const pathname = usePathname();

  // Enhanced sign out function
  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      
      // Clear all storage first
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Reset state
      setUser(null);
      setSession(null);
      
      console.log('✅ Signed out successfully');
      
      // Redirect to login
      router.push('/');
      
    } catch (error) {
      console.error('❌ Error during sign out:', error);
      // Force redirect anyway
      window.location.href = '/';
    }
  };

  const lastSessionIdRef = useRef<string | null>(null);

  // Separate useEffect for auth state changes (no redirects here)
  useEffect(() => {
    // Get initial session - SIMPLIFIED VERSION
    const getInitialSession = async () => {
      try {
        console.log('🔄 Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Session error:', error);
          setLoading(false);
          return;
        }

        // Only log session data if it's different from last session
        const currentSessionId = session?.access_token || null;
        if (currentSessionId !== lastSessionIdRef.current) {
          console.log('📋 Session data:', session);
          lastSessionIdRef.current = currentSessionId;
        }

        setSession(session);
        setUser(session?.user ?? null);

      } catch (error) {
        console.error('❌ Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes - SIMPLIFIED (no redirects here)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const currentSessionId = session?.access_token || null;

        // Only log if session actually changed or it's a significant event
        if (currentSessionId !== lastSessionIdRef.current || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          console.log('🔐 Auth state changed:', event, session?.user?.email);
          lastSessionIdRef.current = currentSessionId;
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []); // No dependencies needed

  // Note: Redirects are now handled by individual page components to avoid infinite loops
  // This AuthProvider only manages authentication state

  const value: AuthContextType = {
    user,
    session,
    signOut,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};