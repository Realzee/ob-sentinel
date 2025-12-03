// components/control-room/ControlRoomDashboard.tsx
'use client';

import { useState, useEffect } from 'react';

interface ControlRoomDashboardProps {
  // Props can be added here if needed in the future
}

export default function ControlRoomDashboard({}: ControlRoomDashboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Listen for refresh events from the parent page
  useEffect(() => {
    const handleRefreshReports = (event: CustomEvent) => {
      console.log('🔄 Dashboard received refresh event', event.detail);
      refreshDashboardData();
    };

    window.addEventListener('refreshReports', handleRefreshReports as EventListener);

    // Initial data load
    refreshDashboardData();

    return () => {
      window.removeEventListener('refreshReports', handleRefreshReports as EventListener);
    };
  }, []);

  const refreshDashboardData = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    console.log('🔄 Fetching dashboard data...');
    
    try {
      // Simulate API call to fetch dashboard data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock dashboard data
      const mockData = {
        stats: {
          totalUsers: 1245,
          activeSessions: 89,
          alertsToday: 12,
          averageResponseTime: '2.4s'
        },
        recentActivity: [
          { id: 1, user: 'John Doe', action: 'Login', time: '10:30 AM' },
          { id: 2, user: 'Jane Smith', action: 'Report Generated', time: '10:15 AM' },
          { id: 3, user: 'Admin User', action: 'Alert Acknowledged', time: '9:45 AM' }
        ],
        systemHealth: {
          cpu: 65,
          memory: 78,
          storage: 42,
          network: 92
        }
      };
      
      setDashboardData(mockData);
      const now = new Date();
      setLastRefreshTime(now);
      
      console.log('✅ Dashboard data updated at', now.toLocaleTimeString());
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Overview</h2>
          <p className="text-gray-400">
            Real-time monitoring and control panel
            {lastRefreshTime && (
              <span className="ml-2 text-sm">
                • Last updated: {lastRefreshTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isRefreshing && (
            <span className="flex items-center gap-2 text-sm text-blue-400">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400"></div>
              Updating...
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Total Users</p>
              <p className="text-2xl font-bold mt-1">
                {dashboardData?.stats.totalUsers.toLocaleString() || '1,245'}
              </p>
            </div>
            <div className="p-2 bg-blue-900 rounded-lg">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-8.696a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <p className="text-green-400 text-sm mt-3">↑ 12% from last month</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Active Sessions</p>
              <p className="text-2xl font-bold mt-1">
                {dashboardData?.stats.activeSessions || '89'}
              </p>
            </div>
            <div className="p-2 bg-green-900 rounded-lg">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-3">Live connections</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Alerts Today</p>
              <p className="text-2xl font-bold mt-1">
                {dashboardData?.stats.alertsToday || '12'}
              </p>
            </div>
            <div className="p-2 bg-red-900 rounded-lg">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.206 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-3">Requiring attention</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Avg Response Time</p>
              <p className="text-2xl font-bold mt-1">
                {dashboardData?.stats.averageResponseTime || '2.4s'}
              </p>
            </div>
            <div className="p-2 bg-purple-900 rounded-lg">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-green-400 text-sm mt-3">↓ 0.3s from yesterday</p>
        </div>
      </div>

      {/* Additional Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-gray-800 rounded-xl p-5">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {(dashboardData?.recentActivity || []).map((activity: any) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-600 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">{activity.user}</p>
                    <p className="text-gray-400 text-sm">{activity.action}</p>
                  </div>
                </div>
                <span className="text-gray-400 text-sm">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-gray-800 rounded-xl p-5">
          <h3 className="text-lg font-semibold mb-4">System Health</h3>
          <div className="space-y-4">
            {[
              { label: 'CPU Usage', value: dashboardData?.systemHealth.cpu || 65, color: 'bg-blue-500' },
              { label: 'Memory', value: dashboardData?.systemHealth.memory || 78, color: 'bg-green-500' },
              { label: 'Storage', value: dashboardData?.systemHealth.storage || 42, color: 'bg-purple-500' },
              { label: 'Network', value: dashboardData?.systemHealth.network || 92, color: 'bg-yellow-500' }
            ].map((item, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">{item.label}</span>
                  <span className="font-medium">{item.value}%</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${item.color} rounded-full transition-all duration-300`}
                    style={{ width: `${item.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isRefreshing && !dashboardData && (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
            <p className="text-white mt-4">Loading dashboard data...</p>
          </div>
        </div>
      )}
    </div>
  );
}