// app/control-room/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import ControlRoomDashboard from '@/components/control-room/ControlRoomDashboard';
import Image from 'next/image';

export default function ControlRoomPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isRefreshingReports, setIsRefreshingReports] = useState(false);
  const [showWhatsAppAlert, setShowWhatsAppAlert] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

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
        Last Refresh: ${lastRefreshTime ? lastRefreshTime.toLocaleTimeString() : 'Never'}
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
  }, [user, authLoading, router, lastRefreshTime]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  // Function to refresh only reports without reloading the entire page
  const handleRefreshReports = useCallback(async () => {
    if (isRefreshingReports) return;
    
    setIsRefreshingReports(true);
    console.log('🔄 Refreshing reports data...');
    
    try {
      // This would typically call an API to refresh reports
      // For now, we'll simulate a refresh
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update last refresh time
      const now = new Date();
      setLastRefreshTime(now);
      
      // Show success feedback
      console.log('✅ Reports refreshed successfully at', now.toLocaleTimeString());
      
      // Trigger a custom event that the dashboard can listen to
      window.dispatchEvent(new CustomEvent('refreshReports', {
        detail: { timestamp: now }
      }));
      
    } catch (error) {
      console.error('Failed to refresh reports:', error);
    } finally {
      setIsRefreshingReports(false);
    }
  }, [isRefreshingReports]);

  // Function to handle WhatsApp sharing with alert
  const handleShareToWhatsApp = () => {
    // Show alert/modal
    setShowWhatsAppAlert(true);
    
    // For demonstration: Create a share URL
    const shareText = `📊 Control Room Report - ${new Date().toLocaleDateString()}\n\nCheck out the latest analytics and insights from the control room dashboard.\n\nGenerated at: ${new Date().toLocaleTimeString()}`;
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    
    // Open WhatsApp share dialog after a short delay
    setTimeout(() => {
      window.open(shareUrl, '_blank');
      
      // Close alert after 3 seconds
      setTimeout(() => {
        setShowWhatsAppAlert(false);
      }, 3000);
    }, 500);
  };

  // Auto-refresh reports every 5 minutes (optional)
  useEffect(() => {
    if (!user) return;
    
    const autoRefreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing reports...');
      handleRefreshReports();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(autoRefreshInterval);
  }, [user, handleRefreshReports]);

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
    return null;
  }

  // Check if user has access to control room
  const userRole = user.user_metadata?.role || 'user';
  const canAccessControlRoom = ['admin', 'moderator', 'controller'].includes(userRole);

  // TEMPORARY: Allow all users for testing - REMOVE IN PRODUCTION
  const ALLOW_ALL_FOR_TESTING = true;
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
          
          <div className="space-y-3">
            <button
              onClick={handleGoToDashboard}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors duration-200"
            >
              Return to Dashboard
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* WhatsApp Share Alert Modal */}
      {showWhatsAppAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-green-500 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 p-3 bg-green-900 rounded-full">
                <Image 
                  src="/whatsapp-icon.svg" 
                  alt="WhatsApp" 
                  width={48} 
                  height={48}
                  className="w-12 h-12"
                  onError={(e) => {
                    // Fallback if image doesn't exist
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `
                      <div class="text-3xl">📱</div>
                    `;
                  }}
                />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">
                Sharing to WhatsApp
              </h3>
              
              <p className="text-gray-300 mb-4">
                Your report is being prepared for sharing. The WhatsApp share dialog will open shortly...
              </p>
              
              <div className="flex space-x-2 mb-4">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
              </div>
              
              <button
                onClick={() => setShowWhatsAppAlert(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Warning banner for testing mode */}
      {ALLOW_ALL_FOR_TESTING && !canAccessControlRoom && (
        <div className="bg-yellow-900 border-b border-yellow-700 p-3 text-center">
          <p className="text-yellow-200 text-sm font-medium">
            ⚠️ TESTING MODE: All users can access Control Room. Disable in production.
          </p>
        </div>
      )}
      
      {/* Header with navigation */}
      <header className="bg-gray-900 border-b border-gray-700 p-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto">
          {/* Top row: Title and user info */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleGoToDashboard}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
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
            
            <div className="flex items-center gap-4">
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
          </div>
          
          {/* Bottom row: Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefreshReports}
                disabled={isRefreshingReports}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                  isRefreshingReports 
                    ? 'bg-blue-700 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isRefreshingReports ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Reports
                  </>
                )}
              </button>
              
              {lastRefreshTime && (
                <span className="text-gray-400 text-sm">
                  Last refresh: {lastRefreshTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleShareToWhatsApp}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.76.982.998-3.675-.236-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.9 6.994c-.004 5.45-4.438 9.88-9.888 9.88m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.333.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.333 11.893-11.893 0-3.18-1.24-6.162-3.495-8.411"/>
                </svg>
                Share to WhatsApp
              </button>
              
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Control Room Dashboard */}
      <main className="max-w-7xl mx-auto p-4">
        <ControlRoomDashboard />
      </main>
      
      {/* Quick action floating button for mobile */}
      <div className="fixed bottom-6 right-6 md:hidden z-30">
        <button
          onClick={handleRefreshReports}
          className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors duration-200"
          title="Refresh Reports"
        >
          {isRefreshingReports ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}