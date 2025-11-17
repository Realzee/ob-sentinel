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
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userData = await authAPI.getCurrentUser();
        setUser(userData);
        
        // Make zweli@msn.com admin - with proper null checks
        if (session.user.email === 'zweli@msn.com' && userData?.profile && userData.id) {
          try {
            await authAPI.makeUserAdmin(userData.id);
            console.log('Admin rights set for zweli@msn.com');
          } catch (error) {
            console.log('User might already be admin');
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const userData = await authAPI.getCurrentUser();
          setUser(userData);
          
          // Make zweli@msn.com admin on sign in - with proper null checks
          if (session.user.email === 'zweli@msn.com' && userData?.profile && userData.id) {
            try {
              await authAPI.makeUserAdmin(userData.id);
              console.log('Admin rights updated for zweli@msn.com');
            } catch (error) {
              console.log('Admin setup note - user might already be admin');
            }
          }
        } else {
          setUser(null);
        }
        setLoading(false);
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