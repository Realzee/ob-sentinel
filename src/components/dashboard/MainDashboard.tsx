'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { reportsAPI, VehicleAlert, authAPI } from '@/lib/supabase';
import VehicleReportModal from '@/components/reports/VehicleReportModal';

interface MainDashboardProps {
  user: any;
}

export default function MainDashboard({ user }: MainDashboardProps) {
  const [reports, setReports] = useState<VehicleAlert[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut } = useAuth();

  useEffect(() => {
    loadData();
    
    // Ensure zweli@msn.com is admin
    if (user?.email === 'zweli@msn.com') {
      ensureAdminRights();
    }
  }, [user]);

  const ensureAdminRights = async () => {
    try {
      await authAPI.makeUserAdmin('zweli@msn.com');
    } catch (error) {
      console.log('Admin rights already set or user not found');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportsData, statsData] = await Promise.all([
        reportsAPI.getVehicleAlerts(),
        reportsAPI.getDashboardStats()
      ]);
      setReports(reportsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Mobile First */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                  <span className="text-white font-bold text-sm">RR</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">RAPID REPORT</h1>
                  <span className="hidden sm:block text-xs text-gray-500 ml-2">Smart Reporting System</span>
                </div>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* User Info - Hidden on mobile, shown on desktop */}
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-gray-900">
                  {user.profile?.full_name || user.email}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {user.profile?.role}
                </div>
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Desktop Sign Out */}
              <button
                onClick={signOut}
                className="hidden sm:block bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden border-t border-gray-200 py-3 px-3 bg-white">
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900">
                  {user.profile?.full_name || user.email}
                </div>
                <div className="text-xs text-gray-500 capitalize mb-3">
                  {user.profile?.role}
                </div>
                <button
                  onClick={signOut}
                  className="w-full bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 transition-colors text-center"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-4 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Welcome back, {user.profile?.full_name?.split(' ')[0] || 'User'}!
          </h2>
          <p className="text-gray-600 text-sm sm:text-base mt-1">Community Safety Reporting System</p>
        </div>

        {/* Quick Actions - Stack on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white">
            <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Stolen Vehicles</h3>
            <p className="text-xs sm:text-sm opacity-90">Report and track stolen vehicles</p>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white">
            <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Crime Reports</h3>
            <p className="text-xs sm:text-sm opacity-90">Report criminal activities</p>
          </div>
        </div>

        {/* Stats Grid - 2 columns on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
          {[
            { value: stats?.todayVehicles || 0, label: "Today's Reports" },
            { value: stats?.activeVehicles || 0, label: "Active Reports" },
            { value: stats?.resolvedVehicles || 0, label: "Recovered/Resolved" },
            { value: stats?.vehiclesWithLocation || 0, label: "Reports with Location" }
          ].map((stat, index) => (
            <div key={index} className="stat-card p-3 sm:p-4">
              <div className="text-lg sm:text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs sm:text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Actions - Stack on mobile */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center text-sm sm:text-base"
          >
            <span className="mr-2">+</span> File New Vehicle Report
          </button>
          <button
            onClick={loadData}
            className="bg-white text-gray-700 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition-all text-sm sm:text-base"
          >
            Refresh
          </button>
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-xl sm:rounded-2xl card-shadow">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Vehicle Reports</h3>
          </div>
          <div className="p-3 sm:p-6">
            {loading ? (
              <div className="text-center py-6 sm:py-8">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-gray-600 text-sm sm:text-base mt-2">Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <p className="text-gray-600 text-sm sm:text-base">No vehicle reports found.</p>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="text-purple-600 hover:text-purple-700 font-medium mt-2 text-sm sm:text-base"
                >
                  Create your first report
                </button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {reports.slice(0, 5).map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                        <span className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                          {report.license_plate}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {report.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
                        {report.vehicle_make} {report.vehicle_model} • {report.vehicle_color}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {report.last_seen_location} • {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      <span className={`inline-block w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                        report.severity === 'critical' ? 'bg-red-500' :
                        report.severity === 'high' ? 'bg-orange-500' :
                        report.severity === 'medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`} title={`Severity: ${report.severity}`}></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Report Modal */}
      <VehicleReportModal 
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onReportCreated={loadData}
        user={user}
      />

      {/* Mobile Floating Action Button */}
      <div className="sm:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsReportModalOpen(true)}
          className="w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:from-purple-700 hover:to-blue-700 transition-all"
        >
          <span className="text-xl font-bold">+</span>
        </button>
      </div>
    </div>
  );
}