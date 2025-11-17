'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import AuthScreen from '@/components/auth/AuthScreen';
import MainDashboard from '@/components/dashboard/MainDashboard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-400 theme-text-glow">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <MainDashboard user={user} />;
}