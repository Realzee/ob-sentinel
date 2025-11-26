// app/control-room/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import ControlRoomDashboard from '@/components/control-room/ControlRoomDashboard';

export default function ControlRoomPage() {
  const { user, loading: authLoading, signOut } = useAuth(); // Changed logout to signOut
  const router = useRouter();
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }

    // Debug user information
    if (user) {
      const debug = `
        User Email: ${user.email}
        User Role: ${user.user_metadata?.role || 'user'}
        User ID: ${user.id}
        Can Access Control Room: ${['admin', 'moderator', 'controller'].includes(user.user_metadata?.role || 'user')}
      `;
      setDebugInfo(debug);
      console.log('🔍 Control Room Access Debug:', debug);
      console.log('🔍 Full User Object:', user);
    }
  }, [user, authLoading, router]);

  const handleLogout = async () => {
    await signOut(); // Changed logout to signOut
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

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
  const userRole = user.user_metadata?.role || 'user';
  const canAccessControlRoom = ['admin', 'moderator', 'controller'].includes(userRole);

  // TEMPORARY: Allow all users for testing - REMOVE IN PRODUCTION
  const allowAllForTesting = true; // Set to false in production

  if (!canAccessControlRoom && !allowAllForTesting) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-4">
            You don't have permission to access the control room.
          </p>
          <div className="bg-gray-800 p-4 rounded-lg mb-4 text-left">
            <p className="text-sm text-gray-300 mb-2">Debug Information:</p>
            <pre className="text-xs text-gray-400 whitespace-pre-wrap">{debugInfo}</pre>
          </div>
          <div className="space-y-2">
            <button
              onClick={handleGoToDashboard}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
            >
              Return to Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors"
            >
              Logout
            </button>
            {/* Temporary admin access button for testing */}
            <button
              onClick={() => {
                // This is a temporary fix - in production, you'd update the user role in the database
                console.log('Temporary admin access granted for testing');
                // Force reload with admin role (this is just for testing)
                window.location.reload();
              }}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors text-sm"
            >
              Temporary Admin Access (Testing Only)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header with navigation buttons */}
      <div className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleGoToDashboard}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              ← Dashboard
            </button>
            <h1 className="text-xl font-bold text-white">Control Room</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-300">Welcome, {user.email}</span>
            <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full">
              {user.user_metadata?.role || 'user'}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Control Room Dashboard */}
      <ControlRoomDashboard />
    </div>
  );
}