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
  }, []);

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
    <div className="min-h-screen bg-black text-white">
      {/* Header - Mobile First */}
      <header className="theme-card border-b border-red-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 theme-gradient rounded-lg flex items-center justify-center mr-2 sm:mr-3 theme-glow">
                  <span className="text-white font-bold text-sm">RR</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <h1 className="text-lg sm:text-xl font-bold theme-text-glow">RAPID REPORT</h1>
                  <span className="hidden sm:block text-xs text-gray-400 ml-2">Smart Reporting System</span>
                </div>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* User Info - Hidden on mobile, shown on desktop */}
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-white">
                  {user.profile?.full_name || user.email}
                </div>
                <div className="text-xs text-gray-400 capitalize">
                  {user.profile?.role}
                </div>
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-red-900/50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Desktop Sign Out */}
              <button
                onClick={signOut}
                className="hidden sm:block theme-button px-3 py-2 rounded-lg text-sm font-medium transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden border-t border-red-800 py-3 px-3 theme-card">
              <div className="space-y-2">
                <div className="text-sm font-medium text-white">
                  {user.profile?.full_name || user.email}
                </div>
                <div className="text-xs text-gray-400 capitalize mb-3">
                  {user.profile?.role}
                </div>
                <button
                  onClick={signOut}
                  className="w-full theme-button px-3 py-2 rounded-lg text-sm font-medium transition-all text-center"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Background Glow Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-600 rounded-full filter blur-3xl opacity-5 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-yellow-500 rounded-full filter blur-3xl opacity-5 animate-pulse delay-1000"></div>
        <div className="absolute top-3/4 left-1/2 w-48 h-48 bg-red-800 rounded-full filter blur-3xl opacity-5 animate-pulse delay-500"></div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-4 lg:px-8 relative z-10">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold theme-text-glow">
            Welcome back, {user.profile?.full_name?.split(' ')[0] || 'User'}!
          </h2>
          <p className="text-gray-400 text-sm sm:text-base mt-1">Community Safety Reporting System</p>
        </div>

        {/* Quick Actions - Stack on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="theme-gradient rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white theme-glow">
            <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2 theme-text-glow">Stolen Vehicles</h3>
            <p className="text-xs sm:text-sm opacity-90">Report and track stolen vehicles</p>
          </div>
          <div className="theme-gradient rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white theme-glow">
            <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2 theme-text-glow">Crime Reports</h3>
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
            <div key={index} className="theme-card p-3 sm:p-4 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-white theme-text-glow">{stat.value}</div>
              <div className="text-xs sm:text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Actions - Stack on mobile */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="theme-button px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold flex items-center justify-center text-sm sm:text-base"
          >
            <span className="mr-2">+</span> File New Vehicle Report
          </button>
          <button
            onClick={loadData}
            className="theme-border px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-white bg-black hover:bg-red-900/20 transition-all text-sm sm:text-base"
          >
            Refresh
          </button>
        </div>

        {/* Reports List */}
        <div className="theme-card rounded-xl sm:rounded-2xl">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-red-800">
            <h3 className="text-base sm:text-lg font-semibold text-white theme-text-glow">Recent Vehicle Reports</h3>
          </div>
          <div className="p-3 sm:p-6">
            {loading ? (
              <div className="text-center py-6 sm:py-8">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-red-500 mx-auto"></div>
                <p className="text-gray-400 text-sm sm:text-base mt-2">Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <p className="text-gray-400 text-sm sm:text-base">No vehicle reports found.</p>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="text-red-400 hover:text-red-300 font-medium mt-2 text-sm sm:text-base transition-colors"
                >
                  Create your first report
                </button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {reports.slice(0, 5).map((report) => (
                  <div key={report.id} className="theme-border p-3 sm:p-4 rounded-lg hover:bg-red-900/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                          <span className="font-semibold text-white text-sm sm:text-base truncate theme-text-glow">
                            {report.license_plate}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            report.status === 'pending' ? 'bg-yellow-900 text-yellow-300 border border-yellow-700' :
                            report.status === 'resolved' ? 'bg-green-900 text-green-300 border border-green-700' :
                            'bg-blue-900 text-blue-300 border border-blue-700'
                          }`}>
                            {report.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1 truncate">
                          {report.vehicle_make} {report.vehicle_model} • {report.vehicle_color}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {report.last_seen_location} • {new Date(report.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <span className={`inline-block w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                          report.severity === 'critical' ? 'bg-red-500 theme-glow' :
                          report.severity === 'high' ? 'bg-orange-500' :
                          report.severity === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} title={`Severity: ${report.severity}`}></span>
                      </div>
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
          className="w-14 h-14 theme-button rounded-full theme-glow flex items-center justify-center hover:scale-110 transition-transform"
        >
          <span className="text-xl font-bold">+</span>
        </button>
      </div>
    </div>
  );
}