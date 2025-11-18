'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { authAPI } from '@/lib/supabase';

export default function AuthSetup() {
  const { user } = useAuth();

  useEffect(() => {
    async function setupUserProfile() {
      if (user) {
        try {
          // Ensure user profile exists
          await authAPI.ensureUserExists(user.id, user.email!);
        } catch (error) {
          console.error('Error setting up user profile:', error);
        }
      }
    }

    setupUserProfile();
  }, [user]);

  return null; // This component doesn't render anything
}