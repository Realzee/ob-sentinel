'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import AuthScreen from '@/components/auth/AuthScreen';
import MainDashboard from '@/components/dashboard/MainDashboard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <MainDashboard user={user} />;
}