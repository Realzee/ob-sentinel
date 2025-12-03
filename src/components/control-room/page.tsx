// app/control-room/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import ControlRoomDashboard from '@/components/control-room/ControlRoomDashboard';

export default function ControlRoomPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    // Debug user information
    if (user) {
      const userRole = user.user_metadata?.role || 'user';
      const canAccessControlRoom = ['admin', 'moderator', 'controller'].includes(userRole);
      
      const debug = `
        User Email: ${user.email}
        User Role: ${userRole}
        User ID: ${user.id}
        Can Access Control Room: ${canAccessControlRoom}
        Auth Loading: ${authLoading}
        Timestamp: ${new Date().toISOString()}
      `;
      setDebugInfo(debug);
      console.log('🔍 Control Room Access Debug:', debug);
      
      // Set access check as complete
      setIsCheckingAccess(false);
    } else if (!authLoading) {
      // User is not authenticated and auth is not loading
      setIsCheckingAccess(false);
    }
  }, [user, authLoading, router]);

  const handleLogout = async () => {
    try {
      await signOut();
      // Optional: redirect after logout
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const handleTemporaryAdminAccess = () => {
    console.warn('⚠️ Temporary admin access granted for testing purposes only');
    alert('⚠️ Temporary admin access enabled for testing. This should be removed in production.');
    window.location.reload();
  };

  if (authLoading || isCheckingAccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="text-white mt-4">Loading Control Room...</p>
          <p className="text-gray-400 text-sm mt-2">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // This should redirect via useEffect, but as a fallback:
    return null;
  }

  // Check if user has access to control room
  const userRole = user.user_metadata?.role || 'user';
  const canAccessControlRoom = ['admin', 'moderator', 'controller'].includes(userRole);

  // TEMPORARY: Allow all users for testing - REMOVE IN PRODUCTION
  const ALLOW_ALL_FOR_TESTING = true; // IMPORTANT: Set to false in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (!canAccessControlRoom && !ALLOW_ALL_FOR_TESTING) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-4">🚫 Access Denied</h1>
          <p className="text-gray-400 mb-6">
            You don't have permission to access the control room. 
            This area is restricted to administrators, moderators, and controllers only.
          </p>
          
          <div className="bg-gray-800 p-4 rounded-lg mb-6 text-left border border-gray-700">
            <p className="text-sm text-gray-300 mb-2 font-medium">Debug Information:</p>
            <pre className="text-xs text-gray-400 whitespace-pre-wrap bg-gray-900 p-3 rounded overflow-auto max-h-40">
              {debugInfo}
            </pre>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleGoToDashboard}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
              Return to Dashboard
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
            >
              Logout
            </button>
            
            {/* Temporary admin access button for testing - only show in development */}
            {isDevelopment && (
              <button
                onClick={handleTemporaryAdminAccess}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-sm"
              >
                ⚠️ Temporary Admin Access (Testing Only)
              </button>
            )}
            
            {!isDevelopment && !canAccessControlRoom && (
              <p className="text-gray-500 text-sm mt-4">
                Need access? Contact your administrator.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If we reach here, user has access (either legitimately or via testing flag)
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Warning banner for testing mode */}
      {ALLOW_ALL_FOR_TESTING && !canAccessControlRoom && (
        <div className="bg-yellow-900 border-b border-yellow-700 p-3 text-center">
          <p className="text-yellow-200 text-sm font-medium">
            ⚠️ TESTING MODE: All users can access Control Room. Disable in production.
          </p>
        </div>
      )}
      
      {/* Header with navigation */}
      <header className="bg-gray-900 border-b border-gray-700 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={handleGoToDashboard}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 flex items-center gap-2"
            >
              <span>←</span> Dashboard
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">Control Room</h1>
              {ALLOW_ALL_FOR_TESTING && !canAccessControlRoom && (
                <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded-full">
                  TEST
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-gray-300 truncate max-w-[200px]">
                {user.email}
              </span>
              <span className={`px-3 py-1 text-sm rounded-full ${
                userRole === 'admin' ? 'bg-red-600' :
                userRole === 'moderator' ? 'bg-purple-600' :
                userRole === 'controller' ? 'bg-blue-600' :
                'bg-gray-600'
              }`}>
                {userRole.toUpperCase()}
              </span>
            </div>
            
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Control Room Dashboard */}
      <main className="max-w-7xl mx-auto p-4">
        <ControlRoomDashboard />
      </main>
      
      {/* Footer with debug info in development */}
      {isDevelopment && (
        <footer className="mt-8 p-4 border-t border-gray-800">
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer">Debug Information</summary>
            <pre className="mt-2 p-3 bg-gray-900 rounded overflow-auto max-h-40">
              {debugInfo}
            </pre>
          </details>
        </footer>
      )}
    </div>
  );
}