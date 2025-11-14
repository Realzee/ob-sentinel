'use client'
import { useState, useEffect, useCallback } from 'react'
import { ensureUserProfile, getSafeUserProfile, supabase } from '@/lib/supabase'
import { cacheManager, debounce, performanceMonitor } from '@/lib/cache'
import { ProgressiveLoader } from '@/components/ProgressiveLoader'
import LazyImage from '@/components/LazyImage'
import { Search, AlertTriangle, Shield, Users, Plus, FileText, Edit, Trash2, Image as ImageIcon, X, Clock, Car, MapPin, Camera, FileCheck, User, MessageCircle, Hash, Building, Scale, AlertCircle, Navigation, Map, Calendar, Eye, CheckCircle, AlertCircle as AlertCircleIcon } from 'lucide-react'
import AddAlertForm from '@/components/AddAlertForm'
import AddCrimeForm from '@/components/AddCrimeForm'
import EditAlertForm from '@/components/EditAlertForm'
import BoloCardGenerator from '@/components/BoloCardGenerator'

interface AlertVehicle {
  id: string
  number_plate: string
  color: string
  make: string
  model: string
  reason: string
  case_number: string
  station_reported_at: string
  ob_number: string
  suburb: string
  has_images: boolean
  image_urls?: string[]
  latitude?: number
  longitude?: number
  created_at: string
  incident_date?: string
  user_id: string
  comments?: string
  status: 'ACTIVE' | 'RECOVERED'
  users: {
    name: string
    email: string
  }
}

interface CrimeReport {
  id: string
  crime_type: string
  description: string
  location: string
  suburb: string
  date_occurred?: string
  time_occurred?: string
  suspects_description?: string
  weapons_involved: boolean
  injuries: boolean
  case_number?: string
  station_reported_at?: string
  ob_number: string
  comments?: string
  has_images: boolean
  image_urls?: string[]
  latitude?: number
  longitude?: number
  created_at: string
  user_id: string
  status: 'ACTIVE' | 'RECOVERED'
  users: {
    name: string
    email: string
  }
}

interface NewReportAlert {
  id: string;
  show: boolean;
  report: any;
  type: 'vehicle' | 'crime';
  timestamp: Date;
}

// SIMPLE COMPONENTS WITHOUT COMPLEX TYPESCRIPT
function AlertToast(props: { alert: NewReportAlert; onView: () => void; onDismiss: () => void }) {
  const { alert, onView, onDismiss } = props;
  const [progress, setProgress] = useState(100);
 
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 300);
    return () => clearInterval(timer);
  }, [onDismiss]);

  return (
    <div className="bg-dark-gray border-l-4 border-accent-gold rounded-lg shadow-lg p-4 animate-in slide-in-from-right duration-300">
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-full ${
          alert.type === 'vehicle' ? 'bg-accent-gold' : 'bg-red-600'
        }`}>
          {alert.type === 'vehicle' ?
            <Car className="w-4 h-4 text-white" /> :
            <Shield className="w-4 h-4 text-white" />
          }
        </div>
       
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-primary-white mb-1">
            {alert.type === 'vehicle' ? 'New Vehicle Report' : 'New Crime Report'}
          </h4>
          <p className="text-xs text-gray-300 truncate">
            {alert.type === 'vehicle'
              ? `${alert.report.number_plate} - ${alert.report.reason}`
              : `${alert.report.crime_type}`
            }
          </p>
          <p className="text-xs text-accent-gold mt-1">
            {alert.report.suburb} • {new Date(alert.timestamp).toLocaleTimeString('en-ZA', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
         
          <div className="w-full bg-gray-700 rounded-full h-1 mt-2">
            <div
              className="bg-accent-gold h-1 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
       
        <div className="flex flex-col space-y-1">
          <button
            onClick={onView}
            className="p-1 text-accent-gold hover:bg-accent-gold hover:text-black rounded transition-colors"
            title="View Report"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={onDismiss}
            className="p-1 text-gray-400 hover:bg-gray-700 rounded transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function GuidelineCard(props: { icon: React.ReactNode; title: string; description: string; color: 'gold' | 'red' }) {
  const { icon, title, description, color } = props;
  const bgColor = color === 'gold' ? 'bg-accent-gold' : 'bg-red-600';
  const textColor = color === 'gold' ? 'text-black' : 'text-white';
 
  return (
    <div className="bg-dark-gray rounded-lg p-4 border border-gray-700 hover:border-accent-gold transition-colors group">
      <div className="flex flex-col items-center text-center">
        <div className={`w-12 h-12 ${bgColor} rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform ${textColor}`}>
          {icon}
        </div>
        <h4 className="font-semibold text-primary-white mb-2">{title}</h4>
        <p className="text-xs text-gray-300">{description}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [alerts, setAlerts] = useState<AlertVehicle[]>([])
  const [crimeReports, setCrimeReports] = useState<CrimeReport[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [reportType, setReportType] = useState<'vehicle' | 'crime'>('vehicle')
  const [editingAlert, setEditingAlert] = useState<AlertVehicle | null>(null)
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [imagePreview, setImagePreview] = useState<{url: string, index: number, total: number} | null>(null)
  const [viewMode, setViewMode] = useState<'all' | 'my'>('all')
  const [activeTab, setActiveTab] = useState<'vehicles' | 'crimes'>('vehicles')
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null)
  const [mapModal, setMapModal] = useState<{show: boolean, item: any, type: 'vehicle' | 'crime'} | null>(null)
  const [viewReportModal, setViewReportModal] = useState<{show: boolean, item: any, type: 'vehicle' | 'crime'} | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [newReportAlerts, setNewReportAlerts] = useState<NewReportAlert[]>([])
  const [boloAlert, setBoloAlert] = useState<AlertVehicle | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    hasMore: true
  })

  // Remove alert function
  const removeAlert = (alertId: string) => {
    setNewReportAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Handle alert view report
  const handleAlertViewReport = (alert: NewReportAlert) => {
    setViewReportModal({
      show: true,
      item: alert.report,
      type: alert.type
    });
    removeAlert(alert.id);
  };

  // Show new report alert
  const showNewReportAlert = (report: AlertVehicle | CrimeReport, type: 'vehicle' | 'crime') => {
    if (user && report.user_id === user.id) return;
   
    const newAlert: NewReportAlert = {
      id: `alert-${report.id}-${Date.now()}`,
      show: true,
      report,
      type,
      timestamp: new Date()
    };
    setNewReportAlerts(prev => [newAlert, ...prev]);
   
    console.log('🔔 New report alert:', type, report.ob_number);
  };

  // OPTIMIZED AUTHENTICATION
  useEffect(() => {
    let mounted = true;

    const initializeDashboard = async () => {
      try {
        // Quick session check first
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (!session?.user) {
          setAuthChecked(true);
          setLoading(false);
          return;
        }

        setUser(session.user);
        
        // Parallelize critical data loading
        const [profile, initialAlerts] = await Promise.all([
          ensureUserProfile(session.user.id, {
            email: session.user.email!,
            name: session.user.user_metadata?.name
          }),
          fetchInitialAlerts()
        ]);

        if (!mounted) return;

        setUserProfile(profile);
        setAuthChecked(true);
        
        // Load remaining data in background
        setTimeout(() => {
          if (mounted) {
            fetchAlertsWithCache();
          }
        }, 100);
        
      } catch (error) {
        console.error('Dashboard initialization error:', error);
        if (mounted) {
          setAuthChecked(true);
          setLoading(false);
        }
      }
    };

    initializeDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log('📍 Geolocation error:', error);
        }
      );
    }
  }, []);

  // OPTIMIZED: Fetch initial alerts (lightweight)
  const fetchInitialAlerts = async () => {
    try {
      const { data: alertsData } = await supabase
        .from('alerts_vehicles')
        .select('id, number_plate, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: crimesData } = await supabase
        .from('crime_reports')
        .select('id, crime_type, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      return { alerts: alertsData || [], crimes: crimesData || [] };
    } catch (error) {
      console.error('Error fetching initial alerts:', error);
      return { alerts: [], crimes: [] };
    }
  };

  // OPTIMIZED: Batch fetch user profiles
  const batchFetchUserProfiles = async (userIds: string[]) => {
    if (userIds.length === 0) return new globalThis.Map<string, { name: string; email: string }>();

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', userIds);

    const userMap: globalThis.Map<string, { name: string; email: string }> = new globalThis.Map();
    profiles?.forEach((profile: { id: any; name: any; email: any }) => {
      userMap.set(profile.id, {
        name: profile.name,
        email: profile.email
      });
    });

    return userMap;
  };

  // OPTIMIZED MAIN FUNCTION TO FETCH REPORTS
  const fetchAlertsOptimized = async (page: number = 1, limit: number = 20) => {
    return performanceMonitor.measure('fetchAlerts', async () => {
      if (!user) {
        setAlerts([]);
        setCrimeReports([]);
        return { alerts: [], crimes: [] };
      }

      const offset = (page - 1) * limit;

      try {
        // Fetch vehicle alerts with pagination
        let vehicleQuery = supabase
          .from('alerts_vehicles')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (viewMode === 'my') {
          vehicleQuery = vehicleQuery.eq('user_id', user.id);
        }

        const { data: alertsData, error: alertsError, count: vehicleCount } = await vehicleQuery;

        if (alertsError) throw alertsError;

        // Fetch crime reports with pagination
        let crimeQuery = supabase
          .from('crime_reports')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (viewMode === 'my') {
          crimeQuery = crimeQuery.eq('user_id', user.id);
        }

        const { data: crimesData, error: crimesError, count: crimeCount } = await crimeQuery;

        if (crimesError) throw crimesError;

        // Batch fetch user profiles for all reports
        const allUserIds = [
          ...(alertsData || []).map((alert: { user_id: any }) => alert.user_id),
          ...(crimesData || []).map((crime: { user_id: any }) => crime.user_id)
        ].filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

        const userMap = await batchFetchUserProfiles(allUserIds);

        // Map users to alerts and crimes
        const alertsWithUsers = (alertsData || []).map((alert: { user_id: any }) => ({
          ...alert,
          users: userMap.get(alert.user_id) || {
            name: 'Unknown User',
            email: 'unknown@example.com'
          }
        }));

        const crimesWithUsers = (crimesData || []).map((crime: { user_id: any }) => ({
          ...crime,
          users: userMap.get(crime.user_id) || {
            name: 'Unknown User',
            email: 'unknown@example.com'
          }
        }));

        return {
          alerts: alertsWithUsers,
          crimes: crimesWithUsers,
          hasMore: (alertsData?.length === limit) || (crimesData?.length === limit)
        };

      } catch (error) {
        console.error('Error fetching data:', error);
        return { alerts: [], crimes: [], hasMore: false };
      }
    });
  };

  // Cached version
  const fetchAlertsWithCache = async (page: number = 1, loadMore: boolean = false) => {
    const cacheKey = `reports-${viewMode}-${activeTab}-${page}`;
    const cached = cacheManager.get(cacheKey);

    if (cached && !loadMore) {
      if (activeTab === 'vehicles') {
        setAlerts(cached.alerts);
      } else {
        setCrimeReports(cached.crimes);
      }
      setPagination(prev => ({ ...prev, hasMore: cached.hasMore ?? false }));
      return;
    }

    setLoading(true);
    const result = await fetchAlertsOptimized(page, pagination.limit);
    
    if (loadMore) {
      if (activeTab === 'vehicles') {
        setAlerts(prev => [...prev, ...result.alerts]);
      } else {
        setCrimeReports(prev => [...prev, ...result.crimes]);
      }
    } else {
      if (activeTab === 'vehicles') {
        setAlerts(result.alerts);
      } else {
        setCrimeReports(result.crimes);
      }
    }

    setPagination(prev => ({ ...prev, hasMore: result.hasMore ?? false }));
    cacheManager.set(cacheKey, result);
    setLoading(false);
  };

  // Load more reports
  const loadMoreReports = async () => {
    const nextPage = pagination.page + 1;
    await fetchAlertsWithCache(nextPage, true);
    setPagination(prev => ({ ...prev, page: nextPage }));
  };

  // Set up OPTIMIZED real-time subscriptions
  useEffect(() => {
    if (!user) return;

    console.log('🔔 Setting up optimized real-time subscriptions...');

    const debouncedRefresh = debounce(() => {
      cacheManager.clearByPattern('reports-');
      fetchAlertsWithCache(1, false);
    }, 2000);

    const vehicleChannel = supabase
      .channel('optimized-alerts')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'alerts_vehicles',
          filter: `created_at=gte.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`
        },
        (payload: any) => {
          console.log('Vehicle alert change:', payload.eventType);
          if (payload.new && payload.eventType === 'INSERT' && payload.new.user_id !== user.id) {
            showNewReportAlert(payload.new, 'vehicle');
          }
          debouncedRefresh();
        }
      )
      .subscribe();

    const crimeChannel = supabase
      .channel('optimized-crimes')
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'crime_reports',
          filter: `created_at=gte.${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}`
        },
        (payload: any) => {
          console.log('Crime report change:', payload.eventType);
          if (payload.new && payload.eventType === 'INSERT' && payload.new.user_id !== user.id) {
            showNewReportAlert(payload.new, 'crime');
          }
          debouncedRefresh();
        }
      )
      .subscribe();

    return () => {
      vehicleChannel.unsubscribe();
      crimeChannel.unsubscribe();
    };
  }, [user, viewMode]);

  // Refresh when view mode changes
  useEffect(() => {
    if (user) {
      console.log('🔄 View mode changed, refreshing...');
      cacheManager.clearByPattern('reports-');
      setPagination({ page: 1, limit: 20, hasMore: true });
      fetchAlertsWithCache(1, false);
    }
  }, [viewMode, user, activeTab]);

  // Refresh alerts function
  const refreshAlerts = async () => {
    console.log('🔄 Manual refresh triggered');
    cacheManager.clearByPattern('reports-');
    setPagination({ page: 1, limit: 20, hasMore: true });
    await fetchAlertsWithCache(1, false);
  };

  // Update report status
  const handleUpdateStatus = async (reportId: string, type: 'vehicle' | 'crime', newStatus: 'ACTIVE' | 'RECOVERED') => {
    if (!user) return;

    try {
      const table = type === 'vehicle' ? 'alerts_vehicles' : 'crime_reports';
      const { error } = await supabase
        .from(table)
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log(`✅ Report status updated to ${newStatus}`);
     
      // Update local state immediately
      if (type === 'vehicle') {
        setAlerts(prev => prev.map(alert =>
          alert.id === reportId ? { ...alert, status: newStatus } : alert
        ));
      } else {
        setCrimeReports(prev => prev.map(report =>
          report.id === reportId ? { ...report, status: newStatus } : report
        ));
      }

      // Clear cache for this view
      cacheManager.clearByPattern('reports-');

    } catch (error: any) {
      console.error('❌ Error updating report status:', error);
      alert('Failed to update report status: ' + error.message);
    }
  };

  // Delete alert
  const handleDeleteAlert = async (alertId: string, type: 'vehicle' | 'crime') => {
    if (!user) return;

    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    try {
      const table = type === 'vehicle' ? 'alerts_vehicles' : 'crime_reports';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', alertId)
        .eq('user_id', user.id);

      if (error) throw error;

      console.log('✅ Report deleted successfully');
     
      // Update local state immediately
      if (type === 'vehicle') {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      } else {
        setCrimeReports(prev => prev.filter(report => report.id !== alertId));
      }

      // Clear cache
      cacheManager.clearByPattern('reports-');

    } catch (error: any) {
      console.error('❌ Error deleting report:', error);
      alert('Failed to delete report: ' + error.message);
      await refreshAlerts();
    }
  };

  // Edit alert
  const handleEditAlert = (alert: AlertVehicle) => {
    setEditingAlert(alert);
  };

  // Image preview functions
  const handleImagePreview = (urls: string[], imageIndex: number) => {
    setImagePreview({
      url: urls[imageIndex],
      index: imageIndex,
      total: urls.length
    });
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!imagePreview) return;
   
    let newIndex = direction === 'next' ? imagePreview.index + 1 : imagePreview.index - 1;
   
    if (newIndex >= imagePreview.total) newIndex = 0;
    if (newIndex < 0) newIndex = imagePreview.total - 1;
   
    setImagePreview({
      ...imagePreview,
      index: newIndex
    });
  };

  // Map functions - IMPROVED with error handling
  const openOSM = (lat: number, lon: number) => {
    try {
      const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
      window.open(osmUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening OSM:', error);
      alert('Unable to open map. Please check your browser settings.');
    }
  };

  const getDirections = (lat: number, lon: number) => {
    try {
      if (userLocation) {
        const directionsUrl = `https://www.openstreetmap.org/directions?engine=osrm_car&route=${userLocation.latitude},${userLocation.longitude};${lat},${lon}`;
        window.open(directionsUrl, '_blank', 'noopener,noreferrer');
      } else {
        alert('Unable to get your current location. Please enable location services and refresh the page.');
      }
    } catch (error) {
      console.error('Error getting directions:', error);
      alert('Unable to get directions. Please try again.');
    }
  };

  const showMapModal = (item: any, type: 'vehicle' | 'crime') => {
    if (!item.latitude || !item.longitude) {
      alert('No location data available for this report.');
      return;
    }
    setMapModal({ show: true, item, type });
  };

  const showViewReportModal = (item: any, type: 'vehicle' | 'crime') => {
    setViewReportModal({ show: true, item, type });
  };

  // Utility functions
  const getUserDisplayName = (item: any) => {
    if (item.users?.name && item.users.name !== 'Unknown User') {
      return item.users.name;
    }
    if (item.users?.email) {
      return item.users.email.split('@')[0];
    }
    return 'Community Member';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter reports based on search - OPTIMIZED
  const filteredAlerts = alerts.filter(alert =>
    alert.number_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.suburb.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.comments?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.ob_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCrimeReports = crimeReports.filter(report =>
    report.crime_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.suburb.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.comments?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.ob_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats calculations - OPTIMIZED
  const stats = {
    totalVehicleAlerts: alerts.length,
    totalCrimeReports: crimeReports.length,
    recentVehicleAlerts: alerts.filter(a => {
      const alertDate = new Date(a.created_at);
      const today = new Date();
      return alertDate.toDateString() === today.toDateString();
    }).length,
    recentCrimeReports: crimeReports.filter(c => {
      const reportDate = new Date(c.created_at);
      const today = new Date();
      return reportDate.toDateString() === today.toDateString();
    }).length,
    activeSuburbs: Array.from(new Set([
      ...alerts.map(a => a.suburb),
      ...crimeReports.map(c => c.suburb)
    ])).length,
    myAlerts: alerts.filter(a => a.user_id === user?.id).length,
    myCrimeReports: crimeReports.filter(c => c.user_id === user?.id).length,
    reportsWithLocation: alerts.filter(a => a.latitude && a.longitude).length + crimeReports.filter(c => c.latitude && c.longitude).length,
    activeReports: alerts.filter(a => a.status === 'ACTIVE').length + crimeReports.filter(c => c.status === 'ACTIVE').length,
    recoveredReports: alerts.filter(a => a.status === 'RECOVERED').length + crimeReports.filter(c => c.status === 'RECOVERED').length
  };

  const currentStats = activeTab === 'vehicles'
    ? {
        total: stats.totalVehicleAlerts,
        recent: stats.recentVehicleAlerts,
        my: stats.myAlerts,
        active: alerts.filter(a => a.status === 'ACTIVE').length,
        recovered: alerts.filter(a => a.status === 'RECOVERED').length
      }
    : {
        total: stats.totalCrimeReports,
        recent: stats.recentCrimeReports,
        my: stats.myCrimeReports,
        active: crimeReports.filter(c => c.status === 'ACTIVE').length,
        recovered: crimeReports.filter(c => c.status === 'RECOVERED').length
      };

  // MAIN RENDER
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-dark-gray py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <img
                src="/rapid911-ireport-logo2.png"
                alt="Rapid Rangers Logo"
                className="w-30 h-auto"
              />
            </div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-gold mx-auto mb-4"></div>
            <p className="text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <img
            src="/rapid911-ireport-logo2.png"
            alt="Rapid Rangers Logo"
            className="w-30 h-auto"
          />
        </div>
        <p className="text-gray-400 text-lg">Community Safety Reporting System</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center ${
            activeTab === 'vehicles'
              ? 'bg-accent-gold text-black'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Car className="w-5 h-5 mr-2" />
          Stolen Vehicles
        </button>
        <button
          onClick={() => setActiveTab('crimes')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center ${
            activeTab === 'crimes'
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Shield className="w-5 h-5 mr-2" />
          Crime Reports
        </button>
      </div>

      {/* Stats Cards - RESPONSIVE */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
        <div className={`card p-4 md:p-6 border-l-4 ${
          activeTab === 'vehicles' ? 'border-accent-gold' : 'border-red-600'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-400">Total Reports</p>
              <p className={`text-xl md:text-3xl font-bold ${
                activeTab === 'vehicles' ? 'text-accent-gold' : 'text-red-600'
              }`}>
                {currentStats.total}
              </p>
            </div>
            {activeTab === 'vehicles' ? 
              <Car className="w-6 h-6 md:w-8 md:h-8 text-accent-gold" /> : 
              <Shield className="w-6 h-6 md:w-8 md:h-8 text-red-600" />
            }
          </div>
        </div>

        <div className="card p-4 md:p-6 border-l-4 border-accent-red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-400">Today's</p>
              <p className="text-xl md:text-3xl font-bold text-accent-red">{currentStats.recent}</p>
            </div>
            <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-accent-red" />
          </div>
        </div>

        <div className="card p-4 md:p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-400">Active</p>
              <p className="text-xl md:text-3xl font-bold text-green-400">{currentStats.active}</p>
            </div>
            <AlertCircleIcon className="w-6 h-6 md:w-8 md:h-8 text-green-400" />
          </div>
        </div>

        <div className="card p-4 md:p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-400">Resolved</p>
              <p className="text-xl md:text-3xl font-bold text-blue-400">{currentStats.recovered}</p>
            </div>
            <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
          </div>
        </div>

        <div className="card p-4 md:p-6 border-l-4 border-accent-blue col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-gray-400">With Location</p>
              <p className="text-xl md:text-3xl font-bold text-accent-blue">{stats.reportsWithLocation}</p>
            </div>
            <MapPin className="w-6 h-6 md:w-8 md:h-8 text-accent-blue" />
          </div>
        </div>
      </div>

      {/* User Controls */}
      {user ? (
        <div className="text-center space-y-4">
          {userProfile && !userProfile.approved ? (
            <div className="bg-yellow-900 border border-yellow-700 text-yellow-300 px-4 py-3 rounded mb-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Account Pending Approval</span>
              </div>
              <p className="text-sm">Your account is pending approval. You can view reports but cannot file new ones.</p>
              <p className="text-sm mt-1">Please contact an administrator to get approved.</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className={`inline-flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-colors ${
                  activeTab === 'vehicles'
                    ? 'bg-accent-gold text-black hover:bg-yellow-500'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                <Plus className="w-5 h-5" />
                <span>{showAddForm ? 'Cancel' : `File New ${activeTab === 'vehicles' ? 'Vehicle' : 'Crime'} Report`}</span>
              </button>
              <button
                onClick={refreshAlerts}
                className="btn-primary inline-flex items-center justify-center space-x-2"
              >
                <span>Refresh</span>
              </button>
            </div>
          )}
         
          {showAddForm && activeTab === 'vehicles' && (
            <AddAlertForm
              onAlertAdded={() => {
                setShowAddForm(false);
                refreshAlerts();
              }}
            />
          )}
          {showAddForm && activeTab === 'crimes' && (
            <AddCrimeForm
              onCrimeReportAdded={() => {
                setShowAddForm(false);
                refreshAlerts();
              }}
            />
          )}
          {loading && (
            <div className="text-sm text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-gold mx-auto"></div>
              Loading reports...
            </div>
          )}
        </div>
      ) : (
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please log in to file reports</p>
          <a href="/login" className="btn-primary">
            Sign In
          </a>
        </div>
      )}

      {/* Reports List */}
      {user && (
        <div className="card p-4 md:p-6">
          <div className="flex flex-col space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
              <h2 className="text-xl md:text-2xl font-bold text-primary-white">
                {viewMode === 'all' ? 'Community' : 'My'} {activeTab === 'vehicles' ? 'Vehicle Reports' : 'Crime Reports'}
              </h2>
             
              <div className="flex space-x-2">
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'all'
                      ? 'bg-accent-gold text-black'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  All Reports
                </button>
                <button
                  onClick={() => setViewMode('my')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'my'
                      ? 'bg-accent-blue text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  My Reports
                </button>
              </div>
            </div>
           
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab === 'vehicles' ? 'vehicles, plates, areas...' : 'crimes, locations, descriptions...'}`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10 w-full"
                  autoComplete="off"
                />
              </div>
              <div className="text-sm text-gray-400">
                Showing {activeTab === 'vehicles' ? filteredAlerts.length : filteredCrimeReports.length} reports
              </div>
            </div>
          </div>

          {loading && alerts.length === 0 && crimeReports.length === 0 ? (
            <ProgressiveLoader />
          ) : (
            <div className="space-y-4">
              {/* VEHICLE REPORTS - RESPONSIVE */}
              {activeTab === 'vehicles' && filteredAlerts.map((alert) => (
                <div key={alert.id} className="bg-dark-gray border border-gray-700 rounded-lg p-4 hover:border-accent-gold transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                    <div className="flex items-start space-x-4">
                      <div className="bg-accent-gold p-3 rounded-lg flex-shrink-0">
                        <Car className="w-6 h-6 text-black" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-primary-white break-words">
                          {alert.number_plate}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {alert.make} {alert.model} • {alert.color}
                        </p>
                        <p className="text-sm text-gray-400">
                          {alert.reason} • {alert.suburb}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Reported by {getUserDisplayName(alert)} • {formatDate(alert.created_at)} at {formatTime(alert.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end space-x-2 flex-wrap gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.status === 'ACTIVE' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {alert.status}
                      </span>
                      
                      {alert.has_images && (
                        <button
                          onClick={() => alert.image_urls && handleImagePreview(alert.image_urls, 0)}
                          className="p-2 text-accent-gold hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                          title="View Images"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                      )}
                      
                      {alert.latitude && alert.longitude && (
                        <button
                          onClick={() => showMapModal(alert, 'vehicle')}
                          className="p-2 text-accent-blue hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                          title="View Location"
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => showViewReportModal(alert, 'vehicle')}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {user && alert.user_id === user.id && (
                        <>
                          <button
                            onClick={() => handleEditAlert(alert)}
                            className="p-2 text-accent-gold hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                            title="Edit Report"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => setBoloAlert(alert)}
                            className="p-2 text-purple-400 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                            title="Generate BOLO Card"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteAlert(alert.id, 'vehicle')}
                            className="p-2 text-red-400 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                            title="Delete Report"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {alert.comments && (
                    <div className="mt-3 p-3 bg-gray-800 rounded">
                      <p className="text-sm text-gray-300 break-words">{alert.comments}</p>
                    </div>
                  )}
                  
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Hash className="w-3 h-3" />
                      <span>OB: {alert.ob_number}</span>
                    </div>
                    {alert.case_number && (
                      <div className="flex items-center space-x-1">
                        <FileCheck className="w-3 h-3" />
                        <span>SAPS: {alert.case_number}</span>
                      </div>
                    )}
                    {alert.incident_date && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Incident: {formatDate(alert.incident_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* CRIME REPORTS - RESPONSIVE */}
              {activeTab === 'crimes' && filteredCrimeReports.map((report) => (
                <div key={report.id} className="bg-dark-gray border border-gray-700 rounded-lg p-4 hover:border-red-600 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                    <div className="flex items-start space-x-4">
                      <div className="bg-red-600 p-3 rounded-lg flex-shrink-0">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-primary-white break-words">
                          {report.crime_type}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {report.location} • {report.suburb}
                        </p>
                        <p className="text-sm text-gray-400 line-clamp-2 break-words">
                          {report.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Reported by {getUserDisplayName(report)} • {formatDate(report.created_at)} at {formatTime(report.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end space-x-2 flex-wrap gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        report.status === 'ACTIVE' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {report.status}
                      </span>
                      
                      {report.has_images && (
                        <button
                          onClick={() => report.image_urls && handleImagePreview(report.image_urls, 0)}
                          className="p-2 text-red-400 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                          title="View Images"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                      )}
                      
                      {report.latitude && report.longitude && (
                        <button
                          onClick={() => showMapModal(report, 'crime')}
                          className="p-2 text-accent-blue hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                          title="View Location"
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => showViewReportModal(report, 'crime')}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {user && report.user_id === user.id && (
                        <button
                          onClick={() => handleDeleteAlert(report.id, 'crime')}
                          className="p-2 text-red-400 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                          title="Delete Report"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Additional crime details */}
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    {report.suspects_description && (
                      <div className="flex items-center space-x-1 text-gray-400">
                        <User className="w-3 h-3" />
                        <span className="break-words">Suspects: {report.suspects_description.substring(0, 50)}...</span>
                      </div>
                    )}
                    {report.weapons_involved && (
                      <div className="flex items-center space-x-1 text-red-400">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Weapons Involved</span>
                      </div>
                    )}
                    {report.injuries && (
                      <div className="flex items-center space-x-1 text-yellow-400">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Injuries Sustained</span>
                      </div>
                    )}
                  </div>
                  
                  {report.comments && (
                    <div className="mt-3 p-3 bg-gray-800 rounded">
                      <p className="text-sm text-gray-300 break-words">{report.comments}</p>
                    </div>
                  )}
                  
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Hash className="w-3 h-3" />
                      <span>CR: {report.ob_number}</span>
                    </div>
                    {report.case_number && (
                      <div className="flex items-center space-x-1">
                        <FileCheck className="w-3 h-3" />
                        <span>SAPS: {report.case_number}</span>
                      </div>
                    )}
                    {report.station_reported_at && (
                      <div className="flex items-center space-x-1">
                        <Building className="w-3 h-3" />
                        <span>Station: {report.station_reported_at}</span>
                      </div>
                    )}
                    {report.date_occurred && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Occurred: {formatDate(report.date_occurred)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
             
              {/* EMPTY STATE */}
              {(activeTab === 'vehicles' && filteredAlerts.length === 0) ||
               (activeTab === 'crimes' && filteredCrimeReports.length === 0) ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm
                    ? `No ${activeTab === 'vehicles' ? 'vehicle' : 'crime'} reports found matching your search.`
                    : `No ${activeTab === 'vehicles' ? 'vehicle' : 'crime'} reports filed yet.`
                  }
                </div>
              ) : null}

              {/* LOAD MORE BUTTON */}
              {pagination.hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={loadMoreReports}
                    disabled={loading}
                    className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <span>Load More Reports</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Alert Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full sm:w-auto px-4 sm:px-0">
        {newReportAlerts.map(alert => (
          <AlertToast
            key={alert.id}
            alert={alert}
            onView={() => handleAlertViewReport(alert)}
            onDismiss={() => removeAlert(alert.id)}
          />
        ))}
      </div>

      {/* MODALS */}

      {/* Edit Alert Modal */}
      {editingAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-gray border border-gray-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <EditAlertForm
              alert={editingAlert}
              onAlertUpdated={() => {
                setEditingAlert(null);
                refreshAlerts();
              }}
              onCancel={() => setEditingAlert(null)}
            />
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {imagePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-auto relative w-full">
            <div className="p-4 flex justify-between items-center border-b bg-white sticky top-0 z-10">
              <h3 className="text-lg font-semibold text-gray-800">
                Image {imagePreview.index + 1} of {imagePreview.total}
              </h3>
              <button
                onClick={() => setImagePreview(null)}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center min-h-[400px]">
              <LazyImage
                src={imagePreview.url}
                alt="Report evidence"
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
            {imagePreview.total > 1 && (
              <div className="flex justify-between items-center p-4 border-t bg-white sticky bottom-0">
                <button
                  onClick={() => navigateImage('prev')}
                  className="btn-primary flex items-center space-x-2"
                >
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => navigateImage('next')}
                  className="btn-primary flex items-center space-x-2"
                >
                  <span>Next</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOLO Card Generator Modal */}
      {boloAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-gray border border-gray-700 rounded-lg w-full max-w-4xl max-h-full overflow-auto">
            <div className="p-6">
              <BoloCardGenerator
                alert={boloAlert}
                onClose={() => setBoloAlert(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Map Modal */}
      {mapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-gray border border-gray-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-primary-white">
                  {mapModal.type === 'vehicle' ? 'Vehicle Location' : 'Crime Location'}
                </h3>
                <button
                  onClick={() => setMapModal(null)}
                  className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-primary-white mb-4">Location Details</h4>
                    <div className="space-y-3">
                      <p className="text-gray-300">
                        <strong>Coordinates:</strong><br />
                        {mapModal.item.latitude?.toFixed(6)}, {mapModal.item.longitude?.toFixed(6)}
                      </p>
                      {mapModal.type === 'vehicle' ? (
                        <>
                          <p className="text-gray-300">
                            <strong>Vehicle:</strong><br />
                            {mapModal.item.number_plate} - {mapModal.item.make} {mapModal.item.model}
                          </p>
                          <p className="text-gray-300">
                            <strong>Incident:</strong><br />
                            {mapModal.item.reason}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-300">
                            <strong>Crime Type:</strong><br />
                            {mapModal.item.crime_type}
                          </p>
                          <p className="text-gray-300">
                            <strong>Location:</strong><br />
                            {mapModal.item.location}
                          </p>
                        </>
                      )}
                      <p className="text-gray-300">
                        <strong>Suburb:</strong><br />
                        {mapModal.item.suburb}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-900 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-primary-white mb-4">Map Actions</h4>
                    <div className="space-y-3">
                      <button
                        onClick={() => openOSM(mapModal.item.latitude, mapModal.item.longitude)}
                        className="w-full btn-primary flex items-center justify-center space-x-2"
                      >
                        <Map className="w-5 h-5" />
                        <span>View on OpenStreetMap</span>
                      </button>
                      
                      <button
                        onClick={() => getDirections(mapModal.item.latitude, mapModal.item.longitude)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                      >
                        <Navigation className="w-5 h-5" />
                        <span>Get Directions</span>
                      </button>
                      
                      <p className="text-sm text-gray-400 text-center">
                        📍 Location accuracy depends on the reporter's data
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Embedded Map Preview */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-primary-white mb-4">Map Preview</h4>
                <div className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Map className="w-12 h-12 mx-auto mb-2" />
                    <p>Interactive map would be embedded here</p>
                    <p className="text-sm mt-2">
                      <button
                        onClick={() => openOSM(mapModal.item.latitude, mapModal.item.longitude)}
                        className="text-accent-gold hover:text-yellow-400 underline"
                      >
                        Click here to view on OpenStreetMap
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Report Modal */}
      {viewReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-gray border border-gray-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-primary-white">
                  {viewReportModal.type === 'vehicle' ? 'Vehicle Report Details' : 'Crime Report Details'}
                </h3>
                <button
                  onClick={() => setViewReportModal(null)}
                  className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Report content would go here */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <p className="text-gray-300">
                    Full report details for {viewReportModal.item.ob_number} would be displayed here.
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setViewReportModal(null)}
                    className="px-4 py-2 border border-gray-600 text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  >
                    Close
                  </button>
                  {viewReportModal.type === 'vehicle' && viewReportModal.item.latitude && viewReportModal.item.longitude && (
                    <button
                      onClick={() => {
                        showMapModal(viewReportModal.item, viewReportModal.type);
                        setViewReportModal(null);
                      }}
                      className="btn-primary"
                    >
                      View on Map
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}