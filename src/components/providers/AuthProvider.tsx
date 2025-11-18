'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, authAPI } from '@/lib/supabase';

interface AuthContextType {
  user: any;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing auth...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          throw sessionError;
        }

        if (session?.user && mounted) {
          console.log('👤 Session user found:', session.user.email);
          
          try {
            // Try to get user profile
            const userData = await authAPI.getCurrentUser();
            console.log('📊 User profile data:', userData);
            
            const mergedUser = {
              ...session.user,
              ...userData,
              role: userData?.role || 'user',
              status: userData?.status || 'active',
              full_name: userData?.full_name || session.user.email?.split('@')[0] || 'User'
            };
            
            if (mounted) {
              setUser(mergedUser);
            }
          } catch (profileError) {
            console.error('❌ Profile fetch error, using basic user data:', profileError);
            // Use basic user data if profile fetch fails
            const basicUser = {
              ...session.user,
              role: 'user',
              status: 'active',
              full_name: session.user.email?.split('@')[0] || 'User'
            };
            
            if (mounted) {
              setUser(basicUser);
            }
          }
        } else if (mounted) {
          console.log('👤 No session found');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event);
        
        if (!mounted) return;

        try {
          if (session?.user) {
            console.log('👤 Auth user found:', session.user.email);
            
            try {
              const userData = await authAPI.getCurrentUser();
              console.log('📊 User profile data after auth change:', userData);
              
              const mergedUser = {
                ...session.user,
                ...userData,
                role: userData?.role || 'user',
                status: userData?.status || 'active',
                full_name: userData?.full_name || session.user.email?.split('@')[0] || 'User'
              };
              
              setUser(mergedUser);
            } catch (profileError) {
              console.error('❌ Profile fetch error in auth change:', profileError);
              // Use basic user data
              const basicUser = {
                ...session.user,
                role: 'user',
                status: 'active',
                full_name: session.user.email?.split('@')[0] || 'User'
              };
              setUser(basicUser);
            }
          } else {
            console.log('👤 No user in auth change');
            setUser(null);
          }
        } catch (error) {
          console.error('❌ Error in auth state change:', error);
          setUser(null);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Sign in error:', error);
        throw error;
      }
      
      console.log('✅ Sign in successful:', data.user?.email);
      return { data, error: null };
    } catch (error) {
      console.error('❌ Sign in failed:', error);
      return { data: null, error };
    }
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      console.log('✅ Signed out successfully');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}