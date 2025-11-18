'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { reportsAPI, VehicleAlert, CrimeReport, authAPI } from '@/lib/supabase';
import VehicleReportModal from '@/components/reports/VehicleReportModal';
import CrimeReportModal from '@/components/reports/CrimeReportModal';
import ReportActionsModal from '@/components/reports/ReportActionsModal';
import UserManagementModal from '@/components/admin/UserManagementModal';
import LocationPreviewModal from '@/components/reports/LocationPreviewModal';
import ImagePreviewModal from '@/components/reports/ImagePreviewModal';
import Image from 'next/image';

interface MainDashboardProps {
  user: any;
}

// Extend the types to include evidence_images for both report types
interface VehicleAlertWithImages extends VehicleAlert {
  evidence_images?: string[];
}

interface CrimeReportWithImages extends CrimeReport {
  evidence_images?: string[];
}

type ReportType = 'vehicles' | 'crimes';
type AnyReport = VehicleAlertWithImages | CrimeReportWithImages;

// Type guards to check report types
const isVehicleAlert = (report: AnyReport): report is VehicleAlertWithImages => {
  return 'license_plate' in report;
};

const isCrimeReport = (report: AnyReport): report is CrimeReportWithImages => {
  return 'title' in report;
};

export default function MainDashboard({ user }: MainDashboardProps) {
  const [vehicleReports, setVehicleReports] = useState<VehicleAlertWithImages[]>([]);
  const [crimeReports, setCrimeReports] = useState<CrimeReportWithImages[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeReportType, setActiveReportType] = useState<ReportType>('vehicles');
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isCrimeModalOpen, setIsCrimeModalOpen] = useState(false);
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationTitle, setSelectedLocationTitle] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(true);
  const { signOut } = useAuth();

  // FIXED: Debug user object to see what's available
  useEffect(() => {
    console.log('👤 MainDashboard User Object:', user);
    console.log('👤 User properties available:', {
      id: user?.id,
      email: user?.email,
      full_name: user?.full_name,
      role: user?.role,
      status: user?.status,
      profile: user?.profile
    });
  }, [user]);

  // FIXED: Simplified user role and status detection - now uses direct properties
  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator';
  
  // Admin users have full access to user management
  const canManageUsers = isAdmin;
  const canDelete = isAdmin || isModerator;

  // FIXED: Simplified user display information - uses direct properties
  const getUserDisplayName = () => {
    return user?.full_name || user?.email || 'User';
  };

  const getUserRole = () => {
    return user?.role || 'user';
  };

  const getUserStatus = () => {
    return user?.status || 'active';
  };

  useEffect(() => {
    loadData();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vehiclesData, crimesData, statsData] = await Promise.all([
        reportsAPI.getVehicleAlerts(),
        reportsAPI.getCrimeReports(),
        reportsAPI.getDashboardStats()
      ]);
      
      setVehicleReports(vehiclesData as VehicleAlertWithImages[]);
      setCrimeReports(crimesData as CrimeReportWithImages[]);
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
    let title = '';
    
    if (isVehicleAlert(report)) {
      location = report.last_seen_location;
      title = `Vehicle Location: ${report.license_plate}`;
    } else if (isCrimeReport(report)) {
      location = report.location;
      title = `Crime Location: ${report.title}`;
    }
    
    if (location) {
      setSelectedLocation(location);
      setSelectedLocationTitle(title);
      setIsLocationModalOpen(true);
    }
  };

  const handleViewImages = (report: AnyReport, imageIndex: number = 0) => {
    const images = report.evidence_images || [];
    if (images.length > 0) {
      setSelectedImages(images);
      setSelectedImageIndex(imageIndex);
      setIsImageModalOpen(true);
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

  const handleModalClose = (setModal: React.Dispatch<React.SetStateAction<boolean>>) => {
    setModal(false);
    setSelectedReport(null);
  };

  const currentReports = activeReportType === 'vehicles' ? vehicleReports : crimeReports;

  // Helper function to get display text for reports
  const getReportDisplayText = (report: AnyReport) => {
    if (isVehicleAlert(report)) {
      return {
        primary: report.license_plate,
        secondary: `${report.vehicle_make} ${report.vehicle_model} • ${report.vehicle_color}`,
        location: report.last_seen_location,
      };
    } else if (isCrimeReport(report)) {
      return {
        primary: report.title,
        secondary: report.description.substring(0, 100) + (report.description.length > 100 ? '...' : ''),
        location: report.location,
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

  // Helper function to check if report has images
  const hasImages = (report: AnyReport) => {
    return report.evidence_images && report.evidence_images.length > 0;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header - Clean Professional Design */}
      <header className="bg-black/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo Section */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                  <Image 
                    src="/rapid911-T.png" 
                    alt="RAPID REPORT" 
                    width={40} 
                    height={40}
                    className="rounded-lg"
                  />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-lg font-bold text-white">RAPID REPORT</h1>
                </div>
              </div>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center space-x-4">
              {/* User Info - FIXED: Now uses direct properties */}
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-white">
                  {getUserDisplayName()}
                </div>
                <div className="text-xs text-gray-400 capitalize">
                  {getUserRole()} • {getUserStatus()}
                </div>
              </div>

              {/* Admin Actions - FIXED: Now properly shows for admins */}
              {canManageUsers && (
                <button
                  onClick={() => setIsUserManagementOpen(true)}
                  className="hidden sm:flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <span>Manage Users</span>
                </button>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Desktop Sign Out */}
              <button
                onClick={signOut}
                className="hidden sm:flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden border-t border-gray-800 py-4 px-4 bg-gray-900/95 backdrop-blur-md">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-sm font-medium text-white">
                    {getUserDisplayName()}
                  </div>
                  <div className="text-xs text-gray-400 capitalize">
                    {getUserRole()} • {getUserStatus()}
                  </div>
                </div>
                
                {canManageUsers && (
                  <button
                    onClick={() => setIsUserManagementOpen(true)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <span>Manage Users</span>
                  </button>
                )}

                <button
                  onClick={signOut}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
      
      {/* Centered Logo Section - Bigger without text */}
      <div className="bg-gradient-to-b from-black to-gray-900 py-12 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-48 h-48 rounded-2xl flex items-center justify-center">
              <Image 
                src="/rapid911-T.png" 
                alt="RAPID REPORT" 
                width={192} 
                height={192}
                className="rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Background Glow Effects - Subtle */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-600/20 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-600/20 rounded-full filter blur-3xl"></div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome back, {getUserDisplayName().split(' ')[0] || 'User'}!
          </h2>
          <p className="text-gray-400">Monitor and manage community safety reports</p>
        </div>

        {/* Report Type Toggle */}
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={() => setActiveReportType('vehicles')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeReportType === 'vehicles' 
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/25' 
                : 'bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            Vehicle Reports
          </button>
          <button
            onClick={() => setActiveReportType('crimes')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeReportType === 'crimes' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
                : 'bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            Crime Reports
          </button>
        </div>

        {/* Quick Actions Toggle Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Quick Actions</h3>
          <button
            onClick={() => setQuickActionsOpen(!quickActionsOpen)}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 text-sm font-medium transition-colors"
          >
            {quickActionsOpen ? 'Hide' : 'Show'} Actions
          </button>
        </div>

        {/* Quick Actions - Collapsible Section */}
        {quickActionsOpen && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <button
              onClick={() => setIsVehicleModalOpen(true)}
              className="quick-action-gradient-vehicle rounded-2xl p-6 text-white quick-action-glow-vehicle text-left hover:scale-105 transition-transform group"
            >
              <div className="flex items-center space-x-4 mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold">Report Stolen Vehicle</h3>
              </div>
              <p className="text-gray-200">Report and track stolen vehicles in the community</p>
            </button>
            <button
              onClick={() => setIsCrimeModalOpen(true)}
              className="quick-action-gradient-crime rounded-2xl p-6 text-white quick-action-glow-crime text-left hover:scale-105 transition-transform group"
            >
              <div className="flex items-center space-x-4 mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold">Report Crime Incident</h3>
              </div>
              <p className="text-gray-200">Report criminal activities and suspicious behavior</p>
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { value: stats?.todayReports || 0, label: "Today's Reports", color: "bg-blue-600" },
            { value: stats?.activeReports || 0, label: "Active Reports", color: "bg-orange-600" },
            { value: (stats?.resolvedVehicles || 0) + (stats?.resolvedCrimes || 0), label: "Resolved", color: "bg-green-600" },
            { value: (stats?.vehiclesWithLocation || 0) + (stats?.crimesWithLocation || 0), label: "With Location", color: "bg-purple-600" }
          ].map((stat, index) => (
            <div key={index} className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
                </div>
                <div className={`w-3 h-3 rounded-full ${stat.color}`}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={loadData}
            className="flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh Data</span>
          </button>
        </div>

        {/* Reports List */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">
              {activeReportType === 'vehicles' ? 'Recent Vehicle Reports' : 'Recent Crime Reports'}
            </h3>
            <span className="text-sm text-gray-400 bg-gray-900 px-3 py-1 rounded-full">
              {currentReports.length} {activeReportType === 'vehicles' ? 'vehicles' : 'crimes'} reported
            </span>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading reports...</p>
              </div>
            ) : currentReports.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">No {activeReportType} reports found.</p>
                <button
                  onClick={activeReportType === 'vehicles' ? () => setIsVehicleModalOpen(true) : () => setIsCrimeModalOpen(true)}
                  className="text-red-400 hover:text-red-300 font-medium mt-2 transition-colors"
                >
                  Create your first {activeReportType === 'vehicles' ? 'vehicle' : 'crime'} report
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {currentReports.slice(0, 10).map((report) => {
                  const display = getReportDisplayText(report);
                  const reportImages = report.evidence_images || [];
                  
                  return (
                    <div key={report.id} className="bg-gray-900/50 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-3">
                            <div className="flex-1">
                              <span className="font-semibold text-white text-lg truncate block">
                                {display.primary}
                              </span>
                              {/* Removed ob_number display since it doesn't exist */}
                            </div>
                            <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                              report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                              report.status === 'resolved' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                              report.status === 'rejected' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                              'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}>
                              {report.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-gray-300 mb-2">
                            {display.secondary}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{display.location}</span>
                            <span>•</span>
                            <span>{new Date(report.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                              <span className={`inline-block w-2 h-2 rounded-full ${
                                report.severity === 'critical' ? 'bg-red-500' :
                                report.severity === 'high' ? 'bg-orange-500' :
                                report.severity === 'medium' ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}></span>
                              <span className="capitalize">{report.severity}</span>
                            </span>
                          </div>

                          {/* Image Thumbnails */}
                          {reportImages.length > 0 && (
                            <div className="mt-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm text-gray-400">{reportImages.length} image(s)</span>
                              </div>
                              <div className="flex space-x-2 overflow-x-auto pb-2">
                                {reportImages.slice(0, 4).map((imageUrl: string, index: number) => (
                                  <div 
                                    key={index} 
                                    className="relative flex-shrink-0 cursor-pointer group"
                                    onClick={() => handleViewImages(report, index)}
                                  >
                                    <Image
                                      src={imageUrl}
                                      alt={`Evidence ${index + 1}`}
                                      width={80}
                                      height={80}
                                      className="w-20 h-20 object-cover rounded-lg border border-gray-600 group-hover:border-blue-500 transition-colors"
                                    />
                                    {index === 3 && reportImages.length > 4 && (
                                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                        <span className="text-white text-sm font-medium">
                                          +{reportImages.length - 4}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-700">
                        <button
                          onClick={() => handleViewReport(report)}
                          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleEditReport(report)}
                          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
                        >
                          Edit Report
                        </button>
                        {hasLocation(report) && (
                          <button
                            onClick={() => handleViewLocation(report)}
                            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
                          >
                            View Location
                          </button>
                        )}
                        {hasImages(report) && (
                          <button
                            onClick={() => handleViewImages(report)}
                            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
                          >
                            View Images
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteReport(report)}
                            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
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
        onClose={() => handleModalClose(setIsVehicleModalOpen)}
        onReportCreated={loadData}
        user={user}
        editReport={selectedReport && isVehicleAlert(selectedReport) ? selectedReport : null}
      />

      <CrimeReportModal 
        isOpen={isCrimeModalOpen}
        onClose={() => handleModalClose(setIsCrimeModalOpen)}
        onReportCreated={loadData}
        user={user}
        editReport={selectedReport && isCrimeReport(selectedReport) ? selectedReport : null}
      />

      <ReportActionsModal 
        isOpen={isActionsModalOpen}
        onClose={() => handleModalClose(setIsActionsModalOpen)}
        report={selectedReport}
        reportType={activeReportType}
        onEdit={() => handleEditReport(selectedReport)}
        onViewLocation={() => handleViewLocation(selectedReport)}
        onDelete={() => handleDeleteReport(selectedReport)}
        canDelete={canDelete}
      />

      <UserManagementModal 
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        currentUser={user}
      />

      <LocationPreviewModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        location={selectedLocation}
        title={selectedLocationTitle}
      />

      <ImagePreviewModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        images={selectedImages}
        initialIndex={selectedImageIndex}
        title="Evidence Images"
      />

      {/* Mobile Floating Action Button */}
      <div className="sm:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={activeReportType === 'vehicles' ? () => setIsVehicleModalOpen(true) : () => setIsCrimeModalOpen(true)}
          className="w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full shadow-lg shadow-red-600/25 flex items-center justify-center text-white font-bold text-xl transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
