// app/control-room/page.tsx
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import ControlRoomDashboard from '@/components/control-room/ControlRoomDashboard';

export default function ControlRoomPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="text-white mt-4">Loading Control Room...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check if user has access to control room
  const userRole = user.role || 'user';
  const canAccessControlRoom = ['admin', 'moderator', 'controller'].includes(userRole);

  if (!canAccessControlRoom) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400">You don't have permission to access the control room.</p>
        </div>
      </div>
    );
  }

  return <ControlRoomDashboard user={user} />;
}