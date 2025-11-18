'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import Header from '@/components/layout/Header';
import AdminDashboard from './AdminDashboard';
import ModeratorDashboard from './ModeratorDashboard';
import ControllerDashboard from './ControllerDashboard';
import UserDashboard from './UserDashboard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AuthGuard from '@/components/auth/AuthGuard';

export default function RoleBasedDashboard() {
  const { user, loading } = useAuth();

  // Render based on user role
  const renderDashboard = () => {
    const role = user?.profile?.role;

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
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />
        {renderDashboard()}
      </div>
    </AuthGuard>
  );
}