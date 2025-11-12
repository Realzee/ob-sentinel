'use client'
import { useState, useEffect } from 'react'
import { supabase, hasValidSupabaseConfig, ensureUserExists } from '@/lib/supabase'
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

// Alert Toast Component
interface AlertToastProps {
  alert: NewReportAlert;
  onView: () => void;
  onDismiss: () => void;
}

const AlertToast: React.FC<AlertToastProps> = ({ alert, onView, onDismiss }) => {
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
};

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

  // Fixed: Define removeAlert first with explicit type
  const removeAlert = (alertId: string) => {
    setNewReportAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Fixed: Added explicit type for alert parameter
  const handleAlertViewReport = (alert: NewReportAlert) => {
    setViewReportModal({
      show: true,
      item: alert.report,
      type: alert.type
    });
    removeAlert(alert.id);
  };

  // Fixed: Added explicit type for report parameter
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
   
    playAlertSound();
  };

  const playAlertSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
     
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
     
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
     
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
     
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Audio not supported or blocked');
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          console.log('Geolocation error:', error)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      )
    }
  }, [])

  const fetchUserData = async (userIds: string[]) => {
    if (userIds.length === 0) return new globalThis.Map()
   
    const { data: usersData, error } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', userIds)

    if (error) {
      console.error('Error fetching user data:', error)
      return new globalThis.Map()
    }

    const usersMap = new globalThis.Map<string, { name: string, email: string }>()
    usersData?.forEach((user: { id: string; name: string; email: string }) => {
      usersMap.set(user.id, {
        name: user.name || 'Unknown User',
        email: user.email
      })
    })
   
    return usersMap
  }

  // Add this effect to fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setUserProfile(profile)
      }
    }
    
    if (user) {
      fetchUserProfile()
    }
  }, [user])

  // Fixed: Added explicit type for items parameter
  const getUniqueUserIds = (items: any[]): string[] => {
    const userIds = items?.map((item: any) => item.user_id) || []
    return Array.from(new Set(userIds))
  }

  const fetchAlerts = async () => {
    if (!user) {
      setAlerts([])
      setCrimeReports([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      let vehicleQuery = supabase
        .from('alerts_vehicles')
        .select('*')
        .order('created_at', { ascending: false })

      if (viewMode === 'my') {
        vehicleQuery = vehicleQuery.eq('user_id', user.id)
      }

      const { data: alertsData, error: alertsError } = await vehicleQuery

      if (alertsError) {
        console.error('Error fetching alerts:', alertsError)
        setAlerts([])
      } else {
        const userIds = getUniqueUserIds(alertsData || [])
        const usersMap = await fetchUserData(userIds)
       
        const alertsWithUsers = (alertsData || []).map((alert: { user_id: any }) => ({
          ...alert,
          users: usersMap.get(alert.user_id) || { name: 'Unknown User', email: '' }
        }))
       
        setAlerts(alertsWithUsers)
      }

      let crimeQuery = supabase
        .from('crime_reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (viewMode === 'my') {
        crimeQuery = crimeQuery.eq('user_id', user.id)
      }

      const { data: crimesData, error: crimesError } = await crimeQuery

      if (crimesError) {
        console.error('Error fetching crime reports:', crimesError)
        setCrimeReports([])
      } else {
        const userIds = getUniqueUserIds(crimesData || [])
        const usersMap = await fetchUserData(userIds)
       
        const crimesWithUsers = (crimesData || []).map((report: { user_id: any }) => ({
          ...report,
          users: usersMap.get(report.user_id) || { name: 'Unknown User', email: '' }
        }))
       
        setCrimeReports(crimesWithUsers)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setAlerts([])
      setCrimeReports([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return

    const vehicleSubscription = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts_vehicles'
        },
        (payload) => {
          console.log('New vehicle alert:', payload)
          fetchAlerts()
          if (payload.new && payload.eventType === 'INSERT') {
            // Fixed: Added type cast
            showNewReportAlert(payload.new as AlertVehicle, 'vehicle')
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts_vehicles'
        },
        (payload) => {
          console.log('Vehicle alert update:', payload)
          fetchAlerts()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'alerts_vehicles'
        },
        (payload) => {
          console.log('Vehicle alert delete:', payload)
          fetchAlerts()
        }
      )
      .subscribe()

    const crimeSubscription = supabase
      .channel('crimes-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'crime_reports'
        },
        (payload) => {
          console.log('New crime report:', payload)
          fetchAlerts()
          if (payload.new && payload.eventType === 'INSERT') {
            // Fixed: Added type cast
            showNewReportAlert(payload.new as CrimeReport, 'crime')
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'crime_reports'
        },
        (payload) => {
          console.log('Crime report update:', payload)
          fetchAlerts()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'crime_reports'
        },
        (payload) => {
          console.log('Crime report delete:', payload)
          fetchAlerts()
        }
      )
      .subscribe()

    return () => {
      vehicleSubscription.unsubscribe()
      crimeSubscription.unsubscribe()
    }
  }, [user, viewMode])

  useEffect(() => {
    let mounted = true

    const initializeApp = async () => {
    if (!hasValidSupabaseConfig) {
      console.warn('Supabase not configured')
      setLoading(false)
      setAuthChecked(true)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Initial user:', user)
     
      if (mounted) {
        setUser(user)
        setAuthChecked(true)
       
        if (user) {
          // Use Promise.all for parallel execution
          await Promise.all([
            ensureUserExists(user.id, {
              email: user.email!,
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'User'
            }).catch(error => {
              console.warn('User creation failed (non-critical):', error)
            }),
            fetchAlerts()
          ])
        } else {
          setLoading(false)
        }
      }
    } catch (error) {
      console.error('Initialization error:', error)
      if (mounted) {
        setLoading(false)
        setAuthChecked(true)
      }
    }
  }

  initializeApp()


    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user)
       
        if (!mounted) return
       
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null)
         
          if (session?.user) {
            ensureUserExists(session.user.id, {
              email: session.user.email!,
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User'
            }).catch(error => {
              console.warn('User creation failed (non-critical):', error)
            })
            setTimeout(() => {
              fetchAlerts()
            }, 500)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setAlerts([])
          setCrimeReports([])
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (authChecked && user) {
      console.log('Auto-refreshing reports after login...')
      fetchAlerts()
    }
  }, [authChecked, user])

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        fetchAlerts()
      }
    }

    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchAlerts()
      }
    }

    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, viewMode])

  const refreshAlerts = async () => {
    console.log('Manual refresh triggered')
    setLoading(true)
    await fetchAlerts()
  }

  const handleUpdateStatus = async (reportId: string, type: 'vehicle' | 'crime', newStatus: 'ACTIVE' | 'RECOVERED') => {
    if (!user) return

    try {
      const table = type === 'vehicle' ? 'alerts_vehicles' : 'crime_reports'
      const { error } = await supabase
        .from(table)
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Status update error:', error)
        throw error
      }

      console.log(`Report status updated to ${newStatus}`)
     
      if (type === 'vehicle') {
        setAlerts(prev => prev.map(alert =>
          alert.id === reportId ? { ...alert, status: newStatus } : alert
        ))
      } else {
        setCrimeReports(prev => prev.map(report =>
          report.id === reportId ? { ...report, status: newStatus } : report
        ))
      }

      // Enhanced logging
      await supabase
        .from('user_logs')
        .insert([
          {
            user_id: user.id,
            action: `update_${type}_status`,
            ip_address: '',
            user_agent: navigator.userAgent,
            details: {
              report_id: reportId,
              new_status: newStatus,
              report_type: type
            }
          }
        ])

    } catch (error: any) {
      console.error('Error updating report status:', error)
      alert('Failed to update report status: ' + error.message)
    }
  }

  const handleDeleteAlert = async (alertId: string, type: 'vehicle' | 'crime') => {
    if (!user) return

    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return
    }

    try {
      const table = type === 'vehicle' ? 'alerts_vehicles' : 'crime_reports'
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', alertId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Delete error:', error)
        throw error
      }

      console.log('Report deleted successfully')
     
      if (type === 'vehicle') {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId))
      } else {
        setCrimeReports(prev => prev.filter(report => report.id !== alertId))
      }
     
      // Enhanced logging
      await supabase
        .from('user_logs')
        .insert([
          {
            user_id: user.id,
            action: `delete_${type}_report`,
            ip_address: '',
            user_agent: navigator.userAgent,
            details: {
              report_id: alertId,
              report_type: type
            }
          }
        ])

    } catch (error: any) {
      console.error('Error deleting report:', error)
      alert('Failed to delete report: ' + error.message)
      await refreshAlerts()
    }
  }

  const handleEditAlert = (alert: AlertVehicle) => {
    setEditingAlert(alert)
  }

  const handleImagePreview = (urls: string[], imageIndex: number) => {
    setImagePreview({
      url: urls[imageIndex],
      index: imageIndex,
      total: urls.length
    })
  }

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!imagePreview) return
   
    let newIndex = direction === 'next' ? imagePreview.index + 1 : imagePreview.index - 1
   
    if (newIndex >= imagePreview.total) newIndex = 0
    if (newIndex < 0) newIndex = imagePreview.total - 1
   
    setImagePreview({
      ...imagePreview,
      index: newIndex
    })
  }

  const openOSM = (lat: number, lon: number) => {
    window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`, '_blank')
  }

  const getDirections = (lat: number, lon: number) => {
    if (userLocation) {
      window.open(`https://www.openstreetmap.org/directions?engine=osrm_car&route=${userLocation.latitude},${userLocation.longitude};${lat},${lon}`, '_blank')
    } else {
      alert('Unable to get your current location. Please enable location services.')
    }
  }

  const showMapModal = (item: any, type: 'vehicle' | 'crime') => {
    setMapModal({ show: true, item, type })
  }

  const showViewReportModal = (item: any, type: 'vehicle' | 'crime') => {
    setViewReportModal({ show: true, item, type })
  }

  const getUserDisplayName = (item: any) => {
    if (item.users?.name && item.users.name !== 'Unknown User') {
      return item.users.name;
    }
    if (item.users?.email) {
      return item.users.email.split('@')[0];
    }
    return 'Community Member';
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const filteredAlerts = alerts.filter(alert =>
    alert.number_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.suburb.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.comments?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.ob_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.station_reported_at?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.status?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredCrimeReports = crimeReports.filter(report =>
    report.crime_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.suburb.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.comments?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.ob_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.station_reported_at?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.status?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    totalVehicleAlerts: alerts.length,
    totalCrimeReports: crimeReports.length,
    recentVehicleAlerts: alerts.filter(a => {
      const alertDate = new Date(a.created_at)
      const today = new Date()
      return alertDate.toDateString() === today.toDateString()
    }).length,
    recentCrimeReports: crimeReports.filter(c => {
      const reportDate = new Date(c.created_at)
      const today = new Date()
      return reportDate.toDateString() === today.toDateString()
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
  }

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
      }

  return (
    <div className="space-y-8">
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

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'vehicles'
              ? 'bg-accent-gold text-black'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Car className="w-5 h-5 inline mr-2" />
          Stolen Vehicles
        </button>
        <button
          onClick={() => setActiveTab('crimes')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'crimes'
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Shield className="w-5 h-5 inline mr-2" />
          Crime Reports
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className={`card p-6 border-l-4 ${
          activeTab === 'vehicles' ? 'border-accent-gold' : 'border-red-600'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total {activeTab === 'vehicles' ? 'Vehicle' : 'Crime'} Reports</p>
              <p className={`text-3xl font-bold ${
                activeTab === 'vehicles' ? 'text-accent-gold' : 'text-red-600'
              }`}>
                {currentStats.total}
              </p>
            </div>
            {activeTab === 'vehicles' ? <Car className="w-8 h-8 text-accent-gold" /> : <Shield className="w-8 h-8 text-red-600" />}
          </div>
        </div>

        <div className="card p-6 border-l-4 border-accent-red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Today's Reports</p>
              <p className="text-3xl font-bold text-accent-red">{currentStats.recent}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-accent-red" />
          </div>
        </div>

        <div className="card p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Reports</p>
              <p className="text-3xl font-bold text-green-400">{currentStats.active}</p>
            </div>
            <AlertCircleIcon className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="card p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Recovered/Resolved</p>
              <p className="text-3xl font-bold text-blue-400">{currentStats.recovered}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="card p-6 border-l-4 border-accent-blue">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Reports with Location</p>
              <p className="text-3xl font-bold text-accent-blue">{stats.reportsWithLocation}</p>
            </div>
            <MapPin className="w-8 h-8 text-accent-blue" />
          </div>
        </div>
      </div>

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
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className={`inline-flex items-center space-x-2 py-2 px-4 rounded-lg font-medium transition-colors ${
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
                className="btn-primary inline-flex items-center space-x-2"
              >
                <span>Refresh</span>
              </button>
            </div>
          )}
         
          {showAddForm && activeTab === 'vehicles' && (
            <AddAlertForm
              onAlertAdded={() => {
                setShowAddForm(false)
                refreshAlerts()
              }}
            />
          )}
          {showAddForm && activeTab === 'crimes' && (
            <AddCrimeForm
              onCrimeReportAdded={() => {
                setShowAddForm(false)
                refreshAlerts()
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

      {editingAlert && (
        <EditAlertForm
          alert={editingAlert}
          onAlertUpdated={() => {
            setEditingAlert(null)
            refreshAlerts()
          }}
          onCancel={() => setEditingAlert(null)}
        />
      )}

      {imagePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-auto relative">
            <div className="p-4 flex justify-between items-center border-b bg-white sticky top-0 z-10">
              <h3 className="text-lg font-semibold">
                Image {imagePreview.index + 1} of {imagePreview.total}
              </h3>
              <button
                onClick={() => setImagePreview(null)}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center min-h-[400px]">
              <img
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

      {mapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-dark-gray border border-gray-700 rounded-lg w-full max-w-4xl max-h-full overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-700 flex justify-between items-center bg-dark-gray sticky top-0 z-10">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-primary-white">
                  {mapModal.type === 'vehicle' ? 'Vehicle Location' : 'Crime Scene Location'}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {mapModal.type === 'vehicle'
                    ? `${mapModal.item.number_plate} - ${mapModal.item.make} ${mapModal.item.model}`
                    : `${mapModal.item.crime_type} - ${mapModal.item.suburb}`
                  }
                </p>
              </div>
              <button
                onClick={() => setMapModal(null)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => openOSM(mapModal.item.latitude, mapModal.item.longitude)}
                    className="btn-primary flex items-center justify-center space-x-2 py-3 px-4 text-sm sm:text-base"
                  >
                    <Map className="w-4 h-4" />
                    <span>Open in OpenStreetMap</span>
                  </button>
                  {userLocation && (
                    <button
                      onClick={() => getDirections(mapModal.item.latitude, mapModal.item.longitude)}
                      className="btn-primary flex items-center justify-center space-x-2 py-3 px-4 text-sm sm:text-base"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Get Directions</span>
                    </button>
                  )}
                </div>
               
                <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-accent-gold">
                  <h4 className="font-semibold text-primary-white mb-3 text-sm sm:text-base">Location Details</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300">
                      <strong className="text-accent-gold">Coordinates:</strong> {mapModal.item.latitude?.toFixed(6)}, {mapModal.item.longitude?.toFixed(6)}
                    </p>
                    <p className="text-gray-300">
                      <strong className="text-accent-gold">Suburb:</strong> {mapModal.item.suburb}
                    </p>
                    {mapModal.type === 'crime' && (
                      <p className="text-gray-300">
                        <strong className="text-accent-gold">Specific Location:</strong> {mapModal.item.location}
                      </p>
                    )}
                  </div>
                </div>

                <div className="w-full h-64 sm:h-80 md:h-96 rounded-lg overflow-hidden border-2 border-gray-600 bg-gray-900">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapModal.item.longitude - 0.01},${mapModal.item.latitude - 0.01},${mapModal.item.longitude + 0.01},${mapModal.item.latitude + 0.01}&layer=mapnik&marker=${mapModal.item.latitude},${mapModal.item.longitude}`}
                    className="bg-gray-900"
                    title="Location Map"
                  />
                </div>
               
                <div className="text-center pt-2">
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${mapModal.item.latitude}&mlon=${mapModal.item.longitude}#map=16/${mapModal.item.latitude}/${mapModal.item.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-blue hover:text-accent-blue/80 text-sm transition-colors inline-flex items-center space-x-1"
                  >
                    <span>View Larger Map on OpenStreetMap</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-700 bg-dark-gray sm:hidden">
              <div className="flex space-x-3">
                <button
                  onClick={() => openOSM(mapModal.item.latitude, mapModal.item.longitude)}
                  className="flex-1 bg-accent-gold text-black py-2 px-3 rounded-lg font-medium text-sm flex items-center justify-center space-x-1"
                >
                  <Map className="w-4 h-4" />
                  <span>Open Map</span>
                </button>
                {userLocation && (
                  <button
                    onClick={() => getDirections(mapModal.item.latitude, mapModal.item.longitude)}
                    className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg font-medium text-sm flex items-center justify-center space-x-1"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Directions</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-dark-gray border border-gray-700 rounded-lg w-full max-w-4xl max-h-full overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-700 flex justify-between items-center bg-dark-gray sticky top-0 z-10">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-primary-white">
                  {viewReportModal.type === 'vehicle' ? 'Vehicle Report Details' : 'Crime Report Details'}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  OB Number: {viewReportModal.item.ob_number}
                </p>
              </div>
              <button
                onClick={() => setViewReportModal(null)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="p-4 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-accent-gold">
                    <h4 className="font-semibold text-primary-white mb-3 flex items-center">
                      <FileCheck className="w-5 h-5 mr-2 text-accent-gold" />
                      Report Status
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Current Status:</span>
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          viewReportModal.item.status === 'ACTIVE'
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-500 text-white'
                        }`}>
                          {viewReportModal.item.status || 'ACTIVE'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Report Filed:</span>
                        <span className="text-accent-gold">{formatDate(viewReportModal.item.created_at)}</span>
                      </div>
                      {viewReportModal.item.incident_date && (
                        <div className="flex justify-between">
                          <span className="text-gray-300">Incident Date:</span>
                          <span className="text-accent-gold">{formatDate(viewReportModal.item.incident_date)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-accent-blue">
                    <h4 className="font-semibold text-primary-white mb-3 flex items-center">
                      <Users className="w-5 h-5 mr-2 text-accent-blue" />
                      Actions Taken
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-accent-blue rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-300">Report logged in community database</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-accent-blue rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-300">Alert sent to community members</span>
                      </div>
                      {viewReportModal.item.case_number && (
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-accent-blue rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-gray-300">SAPS case filed: {viewReportModal.item.case_number}</span>
                        </div>
                      )}
                      {viewReportModal.item.station_reported_at && (
                        <div className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-accent-blue rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-gray-300">Reported at {viewReportModal.item.station_reported_at}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-accent-gold">
                  <h4 className="font-semibold text-primary-white mb-3 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-accent-gold" />
                    Report Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewReportModal.type === 'vehicle' ? (
                      <>
                        <div>
                          <p className="text-sm text-gray-400">Number Plate</p>
                          <p className="text-primary-white font-medium">{viewReportModal.item.number_plate}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Vehicle</p>
                          <p className="text-primary-white font-medium">{viewReportModal.item.color} {viewReportModal.item.make} {viewReportModal.item.model}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Incident Type</p>
                          <p className="text-primary-white font-medium">{viewReportModal.item.reason}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Location</p>
                          <p className="text-primary-white font-medium">{viewReportModal.item.suburb}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-sm text-gray-400">Crime Type</p>
                          <p className="text-primary-white font-medium">{viewReportModal.item.crime_type}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Location</p>
                          <p className="text-primary-white font-medium">{viewReportModal.item.location}, {viewReportModal.item.suburb}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Date Occurred</p>
                          <p className="text-primary-white font-medium">
                            {viewReportModal.item.date_occurred ? formatDate(viewReportModal.item.date_occurred) : 'Not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Time Occurred</p>
                          <p className="text-primary-white font-medium">
                            {viewReportModal.item.time_occurred || 'Not specified'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {(viewReportModal.item.comments || viewReportModal.item.suspects_description) && (
                  <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-accent-gold">
                    <h4 className="font-semibold text-primary-white mb-3 flex items-center">
                      <MessageCircle className="w-5 h-5 mr-2 text-accent-gold" />
                      Additional Information
                    </h4>
                    {viewReportModal.item.comments && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-400 mb-1">Report Details:</p>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">{viewReportModal.item.comments}</p>
                      </div>
                    )}
                    {viewReportModal.item.suspects_description && (
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Suspects Description:</p>
                        <p className="text-gray-300 text-sm">{viewReportModal.item.suspects_description}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-accent-blue">
                  <h4 className="font-semibold text-primary-white mb-3 flex items-center">
                    <User className="w-5 h-5 mr-2 text-accent-blue" />
                    Reporter Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Reported By</p>
                      <p className="text-primary-white font-medium">{getUserDisplayName(viewReportModal.item)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Report Date</p>
                      <p className="text-primary-white font-medium">{formatDate(viewReportModal.item.created_at)} at {formatTime(viewReportModal.item.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-700 bg-dark-gray">
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
                <div className="text-sm text-gray-400">
                  Report ID: {viewReportModal.item.ob_number}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setViewReportModal(null)}
                    className="px-4 py-2 border border-gray-600 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  {viewReportModal.item.latitude && viewReportModal.item.longitude && (
                    <button
                      onClick={() => {
                        setViewReportModal(null)
                        setTimeout(() => showMapModal(viewReportModal.item, viewReportModal.type), 100)
                      }}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <Map className="w-4 h-4" />
                      <span>View Map</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {newReportAlerts.map(alert => (
          <AlertToast
            key={alert.id}
            alert={alert}
            onView={() => handleAlertViewReport(alert)}
            onDismiss={() => removeAlert(alert.id)}
          />
        ))}
      </div>

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

      {user ? (
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <h2 className="text-2xl font-bold text-primary-white">
                {viewMode === 'all' ? 'Community' : 'My'} {activeTab === 'vehicles' ? 'Vehicle Reports' : 'Crime Reports'}
              </h2>
             
              <div className="flex space-x-2">
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'all'
                      ? 'bg-accent-gold text-black'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  All Reports
                </button>
                <button
                  onClick={() => setViewMode('my')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'my'
                      ? 'bg-accent-blue text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  My Reports
                </button>
              </div>
            </div>
           
            <div className="flex items-center space-x-4">
              <div className="relative w-full sm:w-64">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
  <input
    type="text"
    placeholder={`Search ${activeTab === 'vehicles' ? 'vehicles, plates, areas...' : 'crimes, locations, descriptions...'}`}
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="form-input pl-10"
    autoComplete="off"
  />
</div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-gold mx-auto mb-4"></div>
              <p className="text-gray-400">Loading {activeTab === 'vehicles' ? 'vehicle' : 'crime'} reports...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTab === 'vehicles' && filteredAlerts.map((alert) => (
                <div key={alert.id} className="bg-dark-gray border border-gray-700 rounded-lg p-4 hover:border-accent-gold transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${
                          alert.status === 'ACTIVE'
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-500 text-white'
                        }`}>
                          {alert.status === 'ACTIVE' ? (
                            <>
                              <AlertCircleIcon className="w-3 h-3" />
                              <span>ACTIVE</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span>RECOVERED</span>
                            </>
                          )}
                        </span>
                       
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          alert.reason.includes('Hijack') ? 'bg-red-600 text-white' :
                          alert.reason.includes('Stolen') ? 'bg-green-500 text-white' :
                          'bg-yellow-900 text-yellow-300'
                        }`}>
                          {alert.reason}
                        </span>
                        <span className="bg-white text-blue-900 px-3 py-1 rounded-full text-sm font-bold border border-gray-300">
                          {alert.number_plate}
                        </span>
                        <span className="text-sm text-gray-400">{alert.suburb}</span>
                      </div>
                     
                      <div className="flex flex-wrap items-center gap-4 mb-2">
                        <div className="flex items-center space-x-2">
                          <Hash className="w-4 h-4 text-accent-gold" />
                          <span className="text-sm font-medium text-accent-gold">
                            OB: {alert.ob_number}
                          </span>
                        </div>
                        {alert.case_number && (
                          <div className="flex items-center space-x-2">
                            <FileCheck className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500">SAPS: {alert.case_number}</span>
                          </div>
                        )}
                        {alert.station_reported_at && (
                          <div className="flex items-center space-x-2">
                            <Building className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-blue-400 max-w-xs truncate">
                              Station: {alert.station_reported_at}
                            </span>
                          </div>
                        )}
                      </div>
                     
                      <p className="text-primary-white font-medium">
                        {alert.color} {alert.make} {alert.model}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Calendar className="w-3 h-3 text-accent-gold" />
                        <span className="text-sm text-gray-400">
                          Incident Date: <span className="text-accent-gold">
                            {alert.incident_date ? formatDate(alert.incident_date) : formatDate(alert.created_at)}
                          </span>
                        </span>
                      </div>
                     
                      {alert.latitude && alert.longitude && (
                        <div className="mt-3 p-3 bg-gray-800 rounded-lg border-l-4 border-accent-gold">
                          <div className="flex items-center space-x-2 mb-2">
                            <MapPin className="w-4 h-4 text-accent-gold" />
                            <span className="text-sm font-medium text-accent-gold">Location Pin Dropped</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => showMapModal(alert, 'vehicle')}
                              className="btn-primary text-sm py-1 px-3 flex items-center space-x-1"
                            >
                              <Map className="w-3 h-3" />
                              <span>View Map</span>
                            </button>
                            <button
                              onClick={() => openOSM(alert.latitude!, alert.longitude!)}
                              className="btn-primary text-sm py-1 px-3 flex items-center space-x-1"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>OpenStreetMap</span>
                            </button>
                            {userLocation && (
                              <button
                                onClick={() => getDirections(alert.latitude!, alert.longitude!)}
                                className="btn-primary text-sm py-1 px-3 flex items-center space-x-1"
                              >
                                <Navigation className="w-3 h-3" />
                                <span>Directions</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                     
                      <div className="flex items-center space-x-2 mt-2">
                        <User className="w-3 h-3 text-accent-gold" />
                        <span className="text-sm text-gray-400">
                          Reported by: <span className="text-accent-gold">{getUserDisplayName(alert)}</span>
                        </span>
                      </div>
                     
                      {alert.image_urls && alert.image_urls.length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <ImageIcon className="w-4 h-4 text-accent-gold" />
                            <span className="text-sm text-accent-gold font-medium">
                              {alert.image_urls.length} image{alert.image_urls.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex space-x-2 overflow-x-auto pb-2">
                            {alert.image_urls.map((url, index) => (
                              <div
                                key={index}
                                className="relative group cursor-pointer flex-shrink-0"
                                onClick={() => handleImagePreview(alert.image_urls!, index)}
                              >
                                <img
                                  src={url}
                                  alt={`Evidence ${index + 1}`}
                                  className="w-20 h-20 object-cover rounded border-2 border-gray-600 hover:border-accent-gold transition-colors"
                                />
                                <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                                  {index + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {alert.comments && (
                        <div className="mt-3 p-3 bg-gray-800 rounded-lg border-l-4 border-accent-gold">
                          <div className="flex items-center space-x-2 mb-2">
                            <MessageCircle className="w-4 h-4 text-accent-gold" />
                            <span className="text-sm font-medium text-accent-gold">Additional Details:</span>
                          </div>
                          <p className="text-sm text-gray-300 whitespace-pre-wrap">{alert.comments}</p>
                        </div>
                      )}
                    </div>
                   
                    <div className="mt-2 sm:mt-0 sm:ml-4 flex items-center space-x-2">
                      <div className="text-sm text-gray-400 text-right">
                        <div>{new Date(alert.created_at).toLocaleDateString('en-ZA')}</div>
                        <div>{new Date(alert.created_at).toLocaleTimeString('en-ZA', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</div>
                      </div>
                     
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setBoloAlert(alert)}
                          className="p-2 text-blue-400 hover:bg-blue-600 hover:text-white rounded transition-colors"
                          title="Generate BOLO Card"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => showViewReportModal(alert, 'vehicle')}
                          className="p-2 text-accent-blue hover:bg-accent-blue hover:text-white rounded transition-colors"
                          title="View Full Report"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {alert.user_id === user.id && (
                          <>
                            {alert.status !== 'RECOVERED' && (
                              <button
                                onClick={() => handleUpdateStatus(alert.id, 'vehicle', 'RECOVERED')}
                                className="p-2 text-green-400 hover:bg-green-600 hover:text-white rounded transition-colors"
                                title="Mark as Recovered"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {alert.status !== 'ACTIVE' && (
                              <button
                                onClick={() => handleUpdateStatus(alert.id, 'vehicle', 'ACTIVE')}
                                className="p-2 text-orange-400 hover:bg-orange-600 hover:text-white rounded transition-colors"
                                title="Mark as Active"
                              >
                                <AlertCircleIcon className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditAlert(alert)}
                              className="p-2 text-accent-gold hover:bg-accent-gold hover:text-black rounded transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAlert(alert.id, 'vehicle')}
                              className="p-2 text-accent-red hover:bg-accent-red hover:text-white rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {activeTab === 'crimes' && filteredCrimeReports.map((report) => (
                <div key={report.id} className="bg-dark-gray border border-gray-700 rounded-lg p-4 hover:border-red-600 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${
                          report.status === 'ACTIVE'
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-500 text-white'
                        }`}>
                          {report.status === 'ACTIVE' ? (
                            <>
                              <AlertCircleIcon className="w-3 h-3" />
                              <span>ACTIVE</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span>RESOLVED</span>
                            </>
                          )}
                        </span>
                       
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-600 text-white">
                          {report.crime_type}
                        </span>
                        <span className="text-sm text-gray-400">{report.suburb}</span>
                        {report.weapons_involved && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-600 text-white">
                            Weapons
                          </span>
                        )}
                        {report.injuries && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-700 text-white">
                            Injuries
                          </span>
                        )}
                      </div>
                     
                      <div className="flex flex-wrap items-center gap-4 mb-2">
                        <div className="flex items-center space-x-2">
                          <Hash className="w-4 h-4 text-red-400" />
                          <span className="text-sm font-medium text-red-400">
                            CR: {report.ob_number}
                          </span>
                        </div>
                        {report.case_number && (
                          <div className="flex items-center space-x-2">
                            <FileCheck className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500">SAPS: {report.case_number}</span>
                          </div>
                        )}
                        {report.station_reported_at && (
                          <div className="flex items-center space-x-2">
                            <Building className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-blue-400 max-w-xs truncate">
                              Station: {report.station_reported_at}
                            </span>
                          </div>
                        )}
                      </div>
                     
                      <p className="text-primary-white font-medium mb-2">
                        {report.location}
                      </p>
                     
                      <p className="text-gray-300 text-sm mb-2">
                        {report.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Calendar className="w-3 h-3 text-red-400" />
                        <span className="text-sm text-gray-400">
                          Incident Date: <span className="text-red-400">
                            {report.date_occurred ? formatDate(report.date_occurred) : formatDate(report.created_at)}
                          </span>
                        </span>
                      </div>
                      {report.latitude && report.longitude && (
                        <div className="mt-3 p-3 bg-gray-800 rounded-lg border-l-4 border-red-600">
                          <div className="flex items-center space-x-2 mb-2">
                            <MapPin className="w-4 h-4 text-red-400" />
                            <span className="text-sm font-medium text-red-400">Location Pin Dropped</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => showMapModal(report, 'crime')}
                              className="btn-primary text-sm py-1 px-3 flex items-center space-x-1"
                            >
                              <Map className="w-3 h-3" />
                              <span>View Map</span>
                            </button>
                            <button
                              onClick={() => openOSM(report.latitude!, report.longitude!)}
                              className="btn-primary text-sm py-1 px-3 flex items-center space-x-1"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>OpenStreetMap</span>
                            </button>
                            {userLocation && (
                              <button
                                onClick={() => getDirections(report.latitude!, report.longitude!)}
                                className="btn-primary text-sm py-1 px-3 flex items-center space-x-1"
                              >
                                <Navigation className="w-3 h-3" />
                                <span>Directions</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {report.suspects_description && (
                        <div className="mt-2 p-2 bg-gray-800 rounded border-l-2 border-red-600">
                          <div className="flex items-center space-x-2 mb-1">
                            <User className="w-3 h-3 text-red-400" />
                            <span className="text-xs font-medium text-red-400">Suspects:</span>
                          </div>
                          <p className="text-xs text-gray-300">{report.suspects_description}</p>
                        </div>
                      )}
                     
                      <div className="flex items-center space-x-2 mt-2">
                        <User className="w-3 h-3 text-red-400" />
                        <span className="text-sm text-gray-400">
                          Reported by: <span className="text-red-400">{getUserDisplayName(report)}</span>
                        </span>
                      </div>
                     
                      {report.image_urls && report.image_urls.length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <ImageIcon className="w-4 h-4 text-red-400" />
                            <span className="text-sm text-red-400 font-medium">
                              {report.image_urls.length} evidence image{report.image_urls.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex space-x-2 overflow-x-auto pb-2">
                            {report.image_urls.map((url, index) => (
                              <div
                                key={index}
                                className="relative group cursor-pointer flex-shrink-0"
                                onClick={() => handleImagePreview(report.image_urls!, index)}
                              >
                                <img
                                  src={url}
                                  alt={`Evidence ${index + 1}`}
                                  className="w-20 h-20 object-cover rounded border-2 border-gray-600 hover:border-red-600 transition-colors"
                                />
                                <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                                  {index + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {report.comments && (
                        <div className="mt-3 p-3 bg-gray-800 rounded-lg border-l-4 border-red-600">
                          <div className="flex items-center space-x-2 mb-2">
                            <MessageCircle className="w-4 h-4 text-red-400" />
                            <span className="text-sm font-medium text-red-400">Additional Information:</span>
                          </div>
                          <p className="text-sm text-gray-300 whitespace-pre-wrap">{report.comments}</p>
                        </div>
                      )}
                    </div>
                   
                    <div className="mt-2 sm:mt-0 sm:ml-4 flex items-center space-x-2">
                      <div className="text-sm text-gray-400 text-right">
                        <div>{new Date(report.created_at).toLocaleDateString('en-ZA')}</div>
                        <div>{new Date(report.created_at).toLocaleTimeString('en-ZA', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</div>
                      </div>
                     
                      <div className="flex space-x-2">
                        <button
                          onClick={() => showViewReportModal(report, 'crime')}
                          className="p-2 text-accent-blue hover:bg-accent-blue hover:text-white rounded transition-colors"
                          title="View Full Report"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {report.user_id === user.id && (
                          <>
                            {report.status !== 'RECOVERED' && (
                              <button
                                onClick={() => handleUpdateStatus(report.id, 'crime', 'RECOVERED')}
                                className="p-2 text-green-400 hover:bg-green-600 hover:text-white rounded transition-colors"
                                title="Mark as Resolved"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {report.status !== 'ACTIVE' && (
                              <button
                                onClick={() => handleUpdateStatus(report.id, 'crime', 'ACTIVE')}
                                className="p-2 text-orange-400 hover:bg-orange-600 hover:text-white rounded transition-colors"
                                title="Mark as Active"
                              >
                                <AlertCircleIcon className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteAlert(report.id, 'crime')}
                              className="p-2 text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
             
              {(activeTab === 'vehicles' && filteredAlerts.length === 0) ||
               (activeTab === 'crimes' && filteredCrimeReports.length === 0) ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm
                    ? `No ${activeTab === 'vehicles' ? 'vehicle' : 'crime'} reports found matching your search.`
                    : `No ${activeTab === 'vehicles' ? 'vehicle' : 'crime'} reports filed yet.`
                  }
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {user && (
        <div className={`card p-6 border-l-4 ${
          activeTab === 'vehicles' ? 'border-accent-gold' : 'border-red-600'
        }`}>
          <h3 className={`text-xl font-bold mb-6 text-center ${
            activeTab === 'vehicles' ? 'text-accent-gold' : 'text-red-600'
          }`}>
            {activeTab === 'vehicles' ? 'Vehicle Reporting Guide' : 'Crime Reporting Guide'}
          </h3>
         
          <div className="grid grid-cols-1 md:grid-rows-2 lg:grid-cols-5 gap-4">
            {activeTab === 'vehicles' ? (
              <>
                <GuidelineCard
                  icon={<Clock className="w-6 h-6" />}
                  title="Report Immediately"
                  description="Report stolen vehicles as soon as they are discovered"
                  color="gold"
                />
                <GuidelineCard
                  icon={<Car className="w-6 h-6" />}
                  title="Vehicle Details"
                  description="Include plate number, color, make, model, and distinctive features"
                  color="gold"
                />
                <GuidelineCard
                  icon={<MapPin className="w-6 h-6" />}
                  title="Location & Direction"
                  description="Note last seen location and direction of travel"
                  color="gold"
                />
                <GuidelineCard
                  icon={<Camera className="w-6 h-6" />}
                  title="Upload Evidence"
                  description="Attach CCTV footage or photos of the vehicle"
                  color="gold"
                />
                <GuidelineCard
                  icon={<FileCheck className="w-6 h-6" />}
                  title="Update Status"
                  description="Mark as RECOVERED when vehicle is found"
                  color="gold"
                />
              </>
            ) : (
              <>
                <GuidelineCard
                  icon={<Clock className="w-6 h-6" />}
                  title="Report Immediately"
                  description="Report crimes as soon as they occur or are discovered"
                  color="red"
                />
                <GuidelineCard
                  icon={<Shield className="w-6 h-6" />}
                  title="Crime Details"
                  description="Provide specific crime type, location, and description"
                  color="red"
                />
                <GuidelineCard
                  icon={<MapPin className="w-6 h-6" />}
                  title="Exact Location"
                  description="Pinpoint the exact location where the crime occurred"
                  color="red"
                />
                <GuidelineCard
                  icon={<AlertCircle className="w-6 h-6" />}
                  title="Safety First"
                  description="Do not approach suspects. Your safety comes first"
                  color="red"
                />
                <GuidelineCard
                  icon={<CheckCircle className="w-6 h-6" />}
                  title="Update Status"
                  description="Mark as RESOLVED when case is closed"
                  color="red"
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function GuidelineCard({ icon, title, description, color }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'gold' | 'red';
}) {
  const bgColor = color === 'gold' ? 'bg-accent-gold' : 'bg-red-600'
  const textColor = color === 'gold' ? 'text-black' : 'text-white'
 
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
  )
}