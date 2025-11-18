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
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Get user profile with role information
          const userData = await authAPI.getCurrentUser();
          console.log('🔄 Initial user data loaded:', userData);
          
          // Merge auth user with profile data
          const mergedUser = {
            ...session.user,
            ...userData,
            // Ensure role and status are properly set
            role: userData?.role || 'user',
            status: userData?.status || 'active',
            full_name: userData?.full_name || session.user.email?.split('@')[0] || 'User'
          };
          
          setUser(mergedUser);
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        // Set basic user data from session if profile fetch fails
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            ...session.user,
            role: 'user',
            status: 'active',
            full_name: session.user.email?.split('@')[0] || 'User'
          });
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event);
        try {
          if (session?.user) {
            const userData = await authAPI.getCurrentUser();
            console.log('🔄 User profile data:', userData);
            
            // Merge auth user with profile data
            const mergedUser = {
              ...session.user,
              ...userData,
              role: userData?.role || 'user',
              status: userData?.status || 'active',
              full_name: userData?.full_name || session.user.email?.split('@')[0] || 'User'
            };
            
            setUser(mergedUser);
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('❌ Error in auth state change:', error);
          // Set basic user data from session if profile fetch fails
          if (session?.user) {
            setUser({
              ...session.user,
              role: 'user',
              status: 'active',
              full_name: session.user.email?.split('@')[0] || 'User'
            });
          }
        } finally {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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