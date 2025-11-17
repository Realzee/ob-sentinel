'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import Header from '@/components/layout/Header';
import AdminDashboard from './AdminDashboard';
import ModeratorDashboard from './ModeratorDashboard';
import ControllerDashboard from './ControllerDashboard';
import UserDashboard from './UserDashboard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function RoleBasedDashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Please sign in to access the dashboard
          </h1>
          <p className="text-gray-600">
            You need to be authenticated to view this content.
          </p>
        </div>
      </div>
    );
  }

  // Render based on user role
  const renderDashboard = () => {
    const role = user.profile?.role;

    switch (role) {
      case 'admin':
        return <AdminDashboard user={user} />;
      case 'moderator':
        return <ModeratorDashboard user={user} />;
      case 'controller':
        return <ControllerDashboard user={user} />;
      case 'user':
      default:
        return <UserDashboard user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {renderDashboard()}
    </div>
  );
}