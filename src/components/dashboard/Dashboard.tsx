// app/dashboard/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import MainDashboard from '@/components/dashboard/MainDashboard';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated after loading completes
    if (!loading && !user) {
      console.log('🚫 No user found, redirecting to login...');
      router.push('/');
    }
  }, [user, loading, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="text-white mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show nothing while checking auth (will redirect if not authenticated)
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="text-white mt-4">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Render dashboard for authenticated users
  return <MainDashboard user={user} />;
}