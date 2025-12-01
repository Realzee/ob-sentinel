// components/dashboard/MainDashboard.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { reportsAPI, VehicleAlert, CrimeReport, authAPI, Profile } from '@/lib/supabase';
import VehicleReportModal from '@/components/reports/VehicleReportModal';
import CrimeReportModal from '@/components/reports/CrimeReportModal';
import ReportActionsModal from '@/components/reports/ReportActionsModal';
import UserManagementModal from '@/components/admin/UserManagementModal';
import LocationPreviewModal from '@/components/reports/LocationPreviewModal';
import ImagePreviewModal from '@/components/reports/ImagePreviewModal';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import CustomButton from '@/components/ui/CustomButton';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface MainDashboardProps {
  user: any;
}

// Extend the types to include evidence_images for both report types
interface VehicleAlertWithImages extends VehicleAlert {
  evidence_images?: string[];
  reporter_profile?: Profile;
  ob_number?: string;
}

interface CrimeReportWithImages extends CrimeReport {
  evidence_images?: string[];
  reporter_profile?: Profile;
  ob_number?: string;
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

// TEMPORARY FIX: Hardcoded admin detection
const ADMIN_EMAILS = [
  'zweli@msn.com',
  'clint@rapid911.co.za', 
  'zwell@msn.com'
];

// Generate short OB number
const generateShortOBNumber = (type: 'V' | 'C') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `OB${type}${timestamp.slice(-4)}${random}`;
};

export default function MainDashboard({ user }: MainDashboardProps) {
  const [vehicleReports, setVehicleReports] = useState<VehicleAlertWithImages[]>([]);
  const [crimeReports, setCrimeReports] = useState<CrimeReportWithImages[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(true);
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
  
  // Confirmation modals
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [reportToDelete, setReportToDelete] = useState<AnyReport | null>(null);
  
  // Cache busting
  const [cacheBuster, setCacheBuster] = useState(0);
  
  const { signOut } = useAuth();
  const router = useRouter();

  // FIXED: Enhanced user role and status detection
  const isAdmin = user?.role === 'admin' || ADMIN_EMAILS.includes(user?.email?.toLowerCase());
  const isModerator = user?.role === 'moderator';
  const isController = user?.role === 'controller';

  // FIX: Add missing canDelete variable
  const canDelete = isAdmin || isModerator;

  // Admin users have full access to user management
  const canManageUsers = isAdmin;

  // Control Room access
  const canAccessControlRoom = isAdmin || isModerator || isController;

  // FIXED: Get username from full_name or email
  const getUserDisplayName = () => {
    return user?.full_name || user?.email?.split('@')[0] || 'User';
  };

  const getUserRole = () => {
    return user?.role || 'user';
  };

  const getUserStatus = () => {
    return user?.status || 'active';
  };

  // Enhanced cache management
  const clearAllCache = useCallback(() => {
    console.log('🧹 Clearing all cache...');
    
    if (typeof window !== 'undefined') {
      // Clear all storage
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
      
      // Clear specific report caches
      const cacheKeys = [
        'vehicleReports',
        'crimeReports', 
        'dashboardStats',
        'reportsCache',
        'userProfile'
      ];
      
      cacheKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      // Clear any service worker caches if present
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
    }
    
    // Force state reset
    setVehicleReports([]);
    setCrimeReports([]);
    setStats(null);
    setCacheBuster(prev => prev + 1);
  }, []);

  // Enhanced sign out handler
  const handleSignOut = async () => {
    try {
      console.log('🚪 Signing out...');
      
      // Clear all cache first
      clearAllCache();
      
      // Then sign out
      await signOut();
      
      // Force redirect to ensure clean state
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('❌ Error during sign out:', error);
      // Force redirect anyway
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  // Debug user detection
  useEffect(() => {
    console.log('🔍 User Role Debug:', {
      email: user?.email,
      role: user?.role,
      isAdmin: isAdmin,
      canManageUsers: canManageUsers,
      canAccessControlRoom: canAccessControlRoom,
      inAdminList: ADMIN_EMAILS.includes(user?.email?.toLowerCase())
    });
  }, [user]);

  // Load data immediately on component mount and when tab becomes visible
  useEffect(() => {
    loadData();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔍 Page became visible, refreshing data...');
        loadData();
      }
    };

    // Also handle page focus
    const handleFocus = () => {
      console.log('🔍 Page focused, refreshing data...');
      loadData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Enhanced loadReports function with active status filtering
  const loadReports = useCallback(async () => {
  try {
    setReportsLoading(true);
    console.log('🔄 Loading fresh reports data...');
    
    const [vehiclesData, crimesData, allUsers] = await Promise.all([
      reportsAPI.getVehicleAlerts(),
      reportsAPI.getCrimeReports(),
      authAPI.getAllUsers() // Get all users for reporter info
    ]);
    
    // Filter out rejected/deleted reports and only show active/resolved
    const activeVehicles = Array.isArray(vehiclesData) 
      ? vehiclesData.filter(vehicle => vehicle.status !== 'rejected')
      : [];
    
    const activeCrimes = Array.isArray(crimesData) 
      ? crimesData.filter(crime => crime.status !== 'rejected')
      : [];
    
    // Create a map of user profiles for quick lookup
    const userProfilesMap = new Map();
    
    // Check if allUsers is an array
    if (Array.isArray(allUsers)) {
      allUsers.forEach((user: any) => {
        // Handle both AuthUser and Profile types
        if ('full_name' in user) {
          // It's a Profile
          userProfilesMap.set(user.id, user);
        } else if ('user_metadata' in user) {
          // It's an AuthUser - convert to Profile format
          const profile = {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || null,
            role: user.user_metadata?.role || 'user',
            status: user.status || 'active',
            created_at: user.created_at,
            updated_at: user.updated_at || user.created_at,
            last_seen_at: user.last_sign_in_at || user.created_at
          };
          userProfilesMap.set(user.id, profile);
        }
      });
    }

    // Enhance reports with reporter information
    const vehiclesWithReporters = activeVehicles.map(vehicle => ({
      ...vehicle,
      reporter_profile: userProfilesMap.get(vehicle.reported_by) || {
        id: vehicle.reported_by,
        email: 'unknown@example.com',
        full_name: 'Unknown User',
        role: 'user',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      ob_number: vehicle.ob_number || generateShortOBNumber('V')
    })) as VehicleAlertWithImages[];
    
    const crimesWithReporters = activeCrimes.map(crime => ({
      ...crime,
      reporter_profile: userProfilesMap.get(crime.reported_by) || {
        id: crime.reported_by,
        email: 'unknown@example.com',
        full_name: 'Unknown User',
        role: 'user',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      ob_number: crime.ob_number || generateShortOBNumber('C')
    })) as CrimeReportWithImages[];
    
    setVehicleReports(vehiclesWithReporters);
    setCrimeReports(crimesWithReporters);
    
    console.log(`✅ Loaded ${vehiclesWithReporters.length} vehicle reports and ${crimesWithReporters.length} crime reports`);
    
  } catch (error) {
    console.error('Error loading reports:', error);
    showError('Failed to load reports. Please try refreshing the page.');
    
    // Set empty arrays on error
    setVehicleReports([]);
    setCrimeReports([]);
  } finally {
    setReportsLoading(false);
  }
}, []);

  // Enhanced loadData with better cache clearing
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Clear cache before loading fresh data
      clearAllCache();
      
      console.log('🔄 Loading fresh data with cache busting...');
      
      const [statsData] = await Promise.all([
        reportsAPI.getDashboardStats()
      ]);
      
      setStats(statsData);
      await loadReports();
      
      // Force re-render
      setCacheBuster(prev => prev + 1);
      
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Failed to load data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  }, [clearAllCache, loadReports]);

  // Update the refresh button to use enhanced cache clearing
  const handleRefresh = async () => {
    setLoading(true);
    await loadData();
    showSuccess('Data refreshed and cache cleared!');
  };

  // Refresh stats when reports change
  useEffect(() => {
    const updateStats = async () => {
      try {
        const statsData = await reportsAPI.getDashboardStats();
        setStats(statsData);
      } catch (error) {
        console.error('Error updating stats:', error);
      }
    };

    updateStats();
  }, [vehicleReports.length, crimeReports.length]);

  // Modal helper functions
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
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
    setReportToDelete(report);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;

    try {
      // Optimistically remove from UI immediately
      if (activeReportType === 'vehicles' && isVehicleAlert(reportToDelete)) {
        setVehicleReports(prev => prev.filter(r => r.id !== reportToDelete.id));
      } else if (activeReportType === 'crimes' && isCrimeReport(reportToDelete)) {
        setCrimeReports(prev => prev.filter(r => r.id !== reportToDelete.id));
      }
      
      // Close modals
      setIsActionsModalOpen(false);
      setShowDeleteConfirmModal(false);
      
      // Update status in database
      if (activeReportType === 'vehicles' && isVehicleAlert(reportToDelete)) {
        await reportsAPI.updateVehicleAlert(reportToDelete.id, { status: 'rejected' });
      } else if (activeReportType === 'crimes' && isCrimeReport(reportToDelete)) {
        await reportsAPI.updateCrimeReport(reportToDelete.id, { status: 'rejected' });
      }
      
      // Refresh stats to reflect the deletion
      const statsData = await reportsAPI.getDashboardStats();
      setStats(statsData);
      
      showSuccess('Report deleted successfully!');
      
    } catch (error) {
      console.error('Error deleting report:', error);
      
      // Revert optimistic update if there was an error
      await loadReports();
      
      showError('Error deleting report. Please try again.');
    } finally {
      setReportToDelete(null);
    }
  };

  const handleModalClose = (setModal: React.Dispatch<React.SetStateAction<boolean>>) => {
    setModal(false);
    setSelectedReport(null);
  };

  const handleReportCreated = useCallback(async () => {
    console.log('🔄 Refreshing data after report creation...');
    
    // Force reload all data
    await loadReports();
    const statsData = await reportsAPI.getDashboardStats();
    setStats(statsData);
    
    // Force UI update
    setCacheBuster(prev => prev + 1);
    
    showSuccess('Report created successfully!');
  }, [loadReports]);

  // Add useEffect to handle cache busting
  useEffect(() => {
    // This will re-render the reports list when cacheBuster changes
    console.log('🔄 Cache buster updated:', cacheBuster);
  }, [cacheBuster]);

  const currentReports = activeReportType === 'vehicles' ? vehicleReports : crimeReports;

  // Enhanced helper function to get display text for reports
  const getReportDisplayText = (report: AnyReport) => {
    if (isVehicleAlert(report)) {
      return {
        primary: report.license_plate,
        secondary: `${report.vehicle_make} ${report.vehicle_model} • ${report.vehicle_color}`,
        location: report.last_seen_location,
        obNumber: report.ob_number || generateShortOBNumber('V')
      };
    } else if (isCrimeReport(report)) {
      return {
        primary: report.title,
        secondary: report.description.substring(0, 100) + (report.description.length > 100 ? '...' : ''),
        location: report.location,
        obNumber: report.ob_number || generateShortOBNumber('C')
      };
    }
    return { primary: '', secondary: '', location: '', obNumber: '' };
  };

  // Enhanced helper function to get reporter information
  const getReporterInfo = (report: AnyReport) => {
    const reporter = report.reporter_profile;
    const reporterName = reporter?.full_name || reporter?.email?.split('@')[0] || 'Unknown User';
    const reporterRole = reporter?.role || 'user';
    const reporterStatus = reporter?.status || 'active';
    
    return {
      name: reporterName,
      role: reporterRole,
      status: reporterStatus,
      isOnline: reporterStatus === 'active',
      contact: reporter?.email || 'No contact'
    };
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
                <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                  <Image 
                    src="/rapid911-T.png" 
                    alt="RAPID REPORT" 
                    width={32} 
                    height={32}
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
              {/* User Info - FIXED: Now shows username instead of email */}
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-white">
                  {getUserDisplayName()}
                </div>
                <div className="text-xs text-gray-400 capitalize">
                  {getUserRole()} • {getUserStatus()}
                </div>
              </div>

              {/* Control Room Access - NEW: For authorized users */}
              {canAccessControlRoom && (
                <CustomButton
                  onClick={() => router.push('/control-room')}
                  variant="primary"
                  size="sm"
                  className="hidden sm:flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Control Room</span>
                </CustomButton>
              )}

              {/* Admin Actions - FIXED: Now properly shows for admins */}
              {canManageUsers && (
                <CustomButton
                  onClick={() => setIsUserManagementOpen(true)}
                  variant="primary"
                  size="sm"
                  className="hidden sm:flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <span>Manage Users</span>
                </CustomButton>
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
              <CustomButton
                onClick={handleSignOut}
                variant="secondary"
                size="sm"
                className="hidden sm:flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </CustomButton>
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
                
                {/* Control Room Access - Mobile */}
                {canAccessControlRoom && (
                  <CustomButton
                    onClick={() => router.push('/control-room')}
                    variant="primary"
                    size="md"
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Control Room</span>
                  </CustomButton>
                )}

                {canManageUsers && (
                  <CustomButton
                    onClick={() => setIsUserManagementOpen(true)}
                    variant="primary"
                    size="md"
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <span>Manage Users</span>
                  </CustomButton>
                )}

                <CustomButton
                  onClick={handleSignOut}
                  variant="secondary"
                  size="md"
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </CustomButton>
              </div>
            </div>
          )}
        </div>
      </header>
      
      {/* Centered Logo Section - SMALLER as requested */}
      <div className="bg-gradient-to-b from-black to-gray-900 py-6 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-32 h-32 rounded-2xl flex items-center justify-center">
              <Image 
                src="/rapid911-T.png" 
                alt="RAPID REPORT" 
                width={128} 
                height={128}
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
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Welcome Section */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome back, {getUserDisplayName()}!
          </h2>
          <p className="text-gray-400">Monitor and manage community safety reports</p>
        </div>

        {/* Report Type Toggle */}
        <div className="flex justify-center space-x-4 mb-6">
          <CustomButton
            onClick={() => setActiveReportType('vehicles')}
            variant={activeReportType === 'vehicles' ? 'danger' : 'secondary'}
            size="lg"
          >
            Vehicle Reports
          </CustomButton>
          <CustomButton
            onClick={() => setActiveReportType('crimes')}
            variant={activeReportType === 'crimes' ? 'primary' : 'secondary'}
            size="lg"
          >
            Crime Reports
          </CustomButton>
        </div>

        {/* Quick Actions Toggle Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Quick Actions</h3>
          <CustomButton
            onClick={() => setQuickActionsOpen(!quickActionsOpen)}
            variant="secondary"
            size="sm"
          >
            {quickActionsOpen ? 'Hide' : 'Show'} Actions
          </CustomButton>
        </div>

        {/* Quick Actions - Collapsible Section */}
        {quickActionsOpen && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

        {/* Stats Grid - Auto-updating */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { value: stats?.todayReports || 0, label: "Today's Reports", color: "bg-blue-600" },
            { value: stats?.activeReports || 0, label: "Active Reports", color: "bg-orange-600" },
            { value: (stats?.resolvedVehicles || 0) + (stats?.resolvedCrimes || 0), label: "Resolved", color: "bg-green-600" },
            { value: currentReports.filter(report => hasLocation(report)).length, label: "With Location", color: "bg-purple-600" }
          ].map((stat, index) => (
            <div key={index} className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
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
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <CustomButton
  onClick={handleRefresh}
  disabled={loading}
  variant="secondary"
  size="md"
  loading={loading} // Now this will work
  className="flex items-center justify-center space-x-2"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
  <span>Refresh & Clear Cache</span>
</CustomButton>
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
            {reportsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading reports...</p>
              </div>
            ) : currentReports.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-lg">No {activeReportType} reports found.</p>
                <CustomButton
                  onClick={activeReportType === 'vehicles' ? () => setIsVehicleModalOpen(true) : () => setIsCrimeModalOpen(true)}
                  variant="danger"
                  size="md"
                  className="mt-2"
                >
                  Create your first {activeReportType === 'vehicles' ? 'vehicle' : 'crime'} report
                </CustomButton>
              </div>
            ) : (
              <div className="space-y-4">
                {currentReports.slice(0, 10).map((report) => {
                  const display = getReportDisplayText(report);
                  const reportImages = report.evidence_images || [];
                  const reporterInfo = getReporterInfo(report);
                  
                  return (
                    <div key={report.id} className="bg-gray-900/50 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <span className="font-semibold text-white text-lg truncate block">
                                  {display.primary}
                                </span>
                                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full border border-blue-500/30">
                                  {display.obNumber}
                                </span>
                              </div>
                              {/* Enhanced reporter information */}
                              <div className="flex items-center space-x-3 mt-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-400">
                                    Reported by: {reporterInfo.name}
                                  </span>
                                  <div className={`w-2 h-2 rounded-full ${reporterInfo.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                                </div>
                                <span className="text-xs text-gray-500 capitalize">
                                  ({reporterInfo.role})
                                </span>
                              </div>
                            </div>
                            <span className={`px-3 py-1 text-xs rounded-full font-medium ${report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : report.status === 'active' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : report.status === 'resolved' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : report.status === 'recovered' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : report.status === 'rejected' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'}`}>
                              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
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
                              <span className={`inline-block w-2 h-2 rounded-full ${report.severity === 'critical' ? 'bg-red-500' : report.severity === 'high' ? 'bg-orange-500' : report.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
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
                        <CustomButton
                          onClick={() => handleViewReport(report)}
                          variant="primary"
                          size="sm"
                        >
                          View Details
                        </CustomButton>
                        <CustomButton
                          onClick={() => handleEditReport(report)}
                          variant="secondary"
                          size="sm"
                        >
                          Edit Report
                        </CustomButton>
                        {hasLocation(report) && (
                          <CustomButton
                            onClick={() => handleViewLocation(report)}
                            variant="success"
                            size="sm"
                          >
                            View Location
                          </CustomButton>
                        )}
                        {hasImages(report) && (
                          <CustomButton
                            onClick={() => handleViewImages(report)}
                            variant="success"
                            size="sm"
                          >
                            View Images
                          </CustomButton>
                        )}
                        {canDelete && (
                          <CustomButton
                            onClick={() => handleDeleteReport(report)}
                            variant="danger"
                            size="sm"
                          >
                            Delete Report
                          </CustomButton>
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
        onReportCreated={handleReportCreated}
        user={user}
        editReport={selectedReport && isVehicleAlert(selectedReport) ? selectedReport : null}
      />

      <CrimeReportModal 
        isOpen={isCrimeModalOpen}
        onClose={() => handleModalClose(setIsCrimeModalOpen)}
        onReportCreated={handleReportCreated}
        user={user}
        editReport={selectedReport && isCrimeReport(selectedReport) ? selectedReport : null}
      />

      <ReportActionsModal 
        open={isActionsModalOpen}
        onClose={() => handleModalClose(setIsActionsModalOpen)}
        report={selectedReport}
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

      {/* Confirmation Modals */}
      
<ConfirmationModal
  isOpen={showDeleteConfirmModal}
  onClose={() => {
    setShowDeleteConfirmModal(false);
    setReportToDelete(null);
  }}
  onConfirm={confirmDeleteReport}
  title="Confirm Deletion"
  message="Are you sure you want to delete this report? This action cannot be undone."
  variant="warning" // Use 'warning' instead of 'type'
  confirmText="Delete Report"
  cancelText="Cancel"
/>

<ConfirmationModal
  isOpen={showSuccessModal}
  onClose={() => setShowSuccessModal(false)}
  title="Success"
  message={successMessage}
  variant="success" // Use 'success' instead of 'type'
  confirmText="OK"
  showCancel={false}
/>

<ConfirmationModal
  isOpen={showErrorModal}
  onClose={() => setShowErrorModal(false)}
  title="Error"
  message={errorMessage}
  variant="error" // Use 'error' instead of 'type' (note: ConfirmationModal has 'error' variant, not 'danger')
  confirmText="OK"
  showCancel={false}
/>
      {/* Mobile Floating Action Button */}
      <div className="sm:hidden fixed bottom-6 right-6 z-50">
        <CustomButton
          onClick={activeReportType === 'vehicles' ? () => setIsVehicleModalOpen(true) : () => setIsCrimeModalOpen(true)}
          variant="danger"
          size="lg"
          className="w-14 h-14 rounded-full shadow-lg"
        >
          +
        </CustomButton>
      </div>
    </div>
  );
}