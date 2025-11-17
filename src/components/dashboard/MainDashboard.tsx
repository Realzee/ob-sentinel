'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { reportsAPI, VehicleAlert, CrimeReport, authAPI } from '@/lib/supabase';
import VehicleReportModal from '@/components/reports/VehicleReportModal';
import CrimeReportModal from '@/components/reports/CrimeReportModal';
import ReportActionsModal from '@/components/reports/ReportActionsModal';
import Image from 'next/image';

interface MainDashboardProps {
  user: any;
}

type ReportType = 'vehicles' | 'crimes';
type AnyReport = VehicleAlert | CrimeReport;

// Type guards to check report types
const isVehicleAlert = (report: AnyReport): report is VehicleAlert => {
  return 'license_plate' in report;
};

const isCrimeReport = (report: AnyReport): report is CrimeReport => {
  return 'title' in report;
};

export default function MainDashboard({ user }: MainDashboardProps) {
  const [vehicleReports, setVehicleReports] = useState<VehicleAlert[]>([]);
  const [crimeReports, setCrimeReports] = useState<CrimeReport[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeReportType, setActiveReportType] = useState<ReportType>('vehicles');
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isCrimeModalOpen, setIsCrimeModalOpen] = useState(false);
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vehiclesData, crimesData, statsData] = await Promise.all([
        reportsAPI.getVehicleAlerts(),
        reportsAPI.getCrimeReports(),
        reportsAPI.getDashboardStats()
      ]);
      setVehicleReports(vehiclesData);
      setCrimeReports(crimesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (report: AnyReport) => {
    setSelectedReport(report);
    setIsActionsModalOpen(true);
  };

  const handleEditReport = (report: AnyReport) => {
    setSelectedReport(report);
    if (activeReportType === 'vehicles' && isVehicleAlert(report)) {
      setIsVehicleModalOpen(true);
    } else if (activeReportType === 'crimes' && isCrimeReport(report)) {
      setIsCrimeModalOpen(true);
    }
  };

  const handleViewLocation = (report: AnyReport) => {
    let location = '';
    
    if (isVehicleAlert(report)) {
      location = report.last_seen_location;
    } else if (isCrimeReport(report)) {
      location = report.location;
    }
    
    if (location) {
      const mapsUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(location)}`;
      window.open(mapsUrl, '_blank');
    }
  };

  const handleDeleteReport = async (report: AnyReport) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;

    try {
      if (activeReportType === 'vehicles' && isVehicleAlert(report)) {
        await reportsAPI.updateVehicleAlert(report.id, { status: 'rejected' });
      } else if (activeReportType === 'crimes' && isCrimeReport(report)) {
        await reportsAPI.updateCrimeReport(report.id, { status: 'rejected' });
      }
      await loadData();
      setIsActionsModalOpen(false);
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Error deleting report. Please try again.');
    }
  };

  const currentReports = activeReportType === 'vehicles' ? vehicleReports : crimeReports;
  const canDelete = user?.profile?.role === 'admin' || user?.profile?.role === 'moderator';

  // Helper function to get display text for reports
  const getReportDisplayText = (report: AnyReport) => {
    if (isVehicleAlert(report)) {
      return {
        primary: report.license_plate,
        secondary: `${report.vehicle_make} ${report.vehicle_model} • ${report.vehicle_color}`,
        location: report.last_seen_location
      };
    } else if (isCrimeReport(report)) {
      return {
        primary: report.title,
        secondary: report.description.substring(0, 100) + (report.description.length > 100 ? '...' : ''),
        location: report.location
      };
    }
    return { primary: '', secondary: '', location: '' };
  };

  // Helper function to check if report has location
  const hasLocation = (report: AnyReport) => {
    if (isVehicleAlert(report)) {
      return !!report.last_seen_location;
    } else if (isCrimeReport(report)) {
      return !!report.location;
    }
    return false;
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
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-2 sm:mr-3 theme-glow">
                  <Image 
                    src="/rapid911-ireport-logo2.png" 
                    alt="RAPID REPORT" 
                    width={32} 
                    height={32}
                    className="rounded-lg"
                  />
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

      {/* Background Glow Effects - Red/Blue Pulses */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-600 rounded-full filter blur-3xl red-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-600 rounded-full filter blur-3xl blue-pulse"></div>
        <div className="absolute top-3/4 left-1/2 w-48 h-48 bg-red-800 rounded-full filter blur-3xl red-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-blue-500 rounded-full filter blur-3xl blue-pulse" style={{animationDelay: '1.5s'}}></div>
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

        {/* Report Type Toggle */}
        <div className="flex space-x-2 mb-6 sm:mb-8">
          <button
            onClick={() => setActiveReportType('vehicles')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm sm:text-base transition-all ${
              activeReportType === 'vehicles' 
                ? 'theme-button' 
                : 'theme-border text-gray-400 hover:text-white'
            }`}
          >
            Vehicle Reports
          </button>
          <button
            onClick={() => setActiveReportType('crimes')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm sm:text-base transition-all ${
              activeReportType === 'crimes' 
                ? 'theme-button' 
                : 'theme-border text-gray-400 hover:text-white'
            }`}
          >
            Crime Reports
          </button>
        </div>

        {/* Quick Actions - Stack on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <button
            onClick={() => setIsVehicleModalOpen(true)}
            className="theme-gradient rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white theme-glow text-left hover:scale-105 transition-transform"
          >
            <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2 theme-text-glow">Report Stolen Vehicle</h3>
            <p className="text-xs sm:text-sm opacity-90">Report and track stolen vehicles</p>
          </button>
          <button
            onClick={() => setIsCrimeModalOpen(true)}
            className="theme-gradient rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white theme-glow text-left hover:scale-105 transition-transform"
          >
            <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2 theme-text-glow">Report Crime Incident</h3>
            <p className="text-xs sm:text-sm opacity-90">Report criminal activities</p>
          </button>
        </div>

        {/* Stats Grid - 2 columns on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
          {[
            { value: stats?.todayReports || 0, label: "Today's Reports" },
            { value: stats?.activeReports || 0, label: "Active Reports" },
            { value: (stats?.resolvedVehicles || 0) + (stats?.resolvedCrimes || 0), label: "Resolved Reports" },
            { value: (stats?.vehiclesWithLocation || 0) + (stats?.crimesWithLocation || 0), label: "Reports with Location" }
          ].map((stat, index) => (
            <div key={index} className="theme-card p-3 sm:p-4 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-white theme-text-glow">{stat.value}</div>
              <div className="text-xs sm:text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button
            onClick={loadData}
            className="theme-button-secondary px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold flex items-center justify-center text-sm sm:text-base"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </button>
        </div>

        {/* Reports List */}
        <div className="theme-card rounded-xl sm:rounded-2xl">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-red-800 flex justify-between items-center">
            <h3 className="text-base sm:text-lg font-semibold text-white theme-text-glow">
              {activeReportType === 'vehicles' ? 'Recent Vehicle Reports' : 'Recent Crime Reports'}
            </h3>
            <span className="text-xs text-gray-400">
              {currentReports.length} {activeReportType === 'vehicles' ? 'vehicles' : 'crimes'} reported
            </span>
          </div>
          <div className="p-3 sm:p-6">
            {loading ? (
              <div className="text-center py-6 sm:py-8">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-red-500 mx-auto"></div>
                <p className="text-gray-400 text-sm sm:text-base mt-2">Loading reports...</p>
              </div>
            ) : currentReports.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <p className="text-gray-400 text-sm sm:text-base">No {activeReportType} reports found.</p>
                <button
                  onClick={activeReportType === 'vehicles' ? () => setIsVehicleModalOpen(true) : () => setIsCrimeModalOpen(true)}
                  className="text-red-400 hover:text-red-300 font-medium mt-2 text-sm sm:text-base transition-colors"
                >
                  Create your first {activeReportType === 'vehicles' ? 'vehicle' : 'crime'} report
                </button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {currentReports.slice(0, 10).map((report) => {
                  const display = getReportDisplayText(report);
                  return (
                    <div key={report.id} className="theme-border p-3 sm:p-4 rounded-lg hover:bg-red-900/10 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 mb-2">
                            <span className="font-semibold text-white text-sm sm:text-base truncate theme-text-glow">
                              {display.primary}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              report.status === 'pending' ? 'bg-yellow-900 text-yellow-300 border border-yellow-700' :
                              report.status === 'resolved' ? 'bg-green-900 text-green-300 border border-green-700' :
                              report.status === 'rejected' ? 'bg-red-900 text-red-300 border border-red-700' :
                              'bg-blue-900 text-blue-300 border border-blue-700'
                            }`}>
                              {report.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-400 mt-1">
                            {display.secondary}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {display.location} • {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col space-y-1 ml-2">
                          <span className={`inline-block w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                            report.severity === 'critical' ? 'bg-red-500 theme-glow' :
                            report.severity === 'high' ? 'bg-orange-500' :
                            report.severity === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`} title={`Severity: ${report.severity}`}></span>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-red-800/50">
                        <button
                          onClick={() => handleViewReport(report)}
                          className="theme-button-secondary px-3 py-1 text-xs rounded transition-all"
                        >
                          View Report
                        </button>
                        <button
                          onClick={() => handleEditReport(report)}
                          className="theme-border px-3 py-1 text-xs rounded text-white bg-black hover:bg-red-900/20 transition-all"
                        >
                          Edit Report
                        </button>
                        {hasLocation(report) && (
                          <button
                            onClick={() => handleViewLocation(report)}
                            className="theme-border px-3 py-1 text-xs rounded text-white bg-black hover:bg-blue-900/20 transition-all"
                          >
                            View Location
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteReport(report)}
                            className="bg-red-900 border border-red-700 px-3 py-1 text-xs rounded text-white hover:bg-red-800 transition-all"
                          >
                            Delete Report
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      <VehicleReportModal 
        isOpen={isVehicleModalOpen}
        onClose={() => {
          setIsVehicleModalOpen(false);
          setSelectedReport(null);
        }}
        onReportCreated={loadData}
        user={user}
        editReport={selectedReport && isVehicleAlert(selectedReport) ? selectedReport : null}
      />

      <CrimeReportModal 
        isOpen={isCrimeModalOpen}
        onClose={() => {
          setIsCrimeModalOpen(false);
          setSelectedReport(null);
        }}
        onReportCreated={loadData}
        user={user}
        editReport={selectedReport && isCrimeReport(selectedReport) ? selectedReport : null}
      />

      <ReportActionsModal 
        isOpen={isActionsModalOpen}
        onClose={() => {
          setIsActionsModalOpen(false);
          setSelectedReport(null);
        }}
        report={selectedReport}
        reportType={activeReportType}
        onEdit={() => handleEditReport(selectedReport)}
        onViewLocation={() => handleViewLocation(selectedReport)}
        onDelete={() => handleDeleteReport(selectedReport)}
        canDelete={canDelete}
      />

      {/* Mobile Floating Action Button */}
      <div className="sm:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={activeReportType === 'vehicles' ? () => setIsVehicleModalOpen(true) : () => setIsCrimeModalOpen(true)}
          className="w-14 h-14 theme-button rounded-full theme-glow flex items-center justify-center hover:scale-110 transition-transform"
        >
          <span className="text-xl font-bold">+</span>
        </button>
      </div>
    </div>
  );
}