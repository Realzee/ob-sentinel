'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ensureUserProfile, getSafeUserProfile, supabase } from '@/lib/supabase'
import { Search, AlertTriangle, Shield, Plus, FileText, Edit, Trash2, Image as ImageIcon, X, Car, MapPin, Eye, CheckCircle, AlertCircle as AlertCircleIcon } from 'lucide-react'
import AddAlertForm from '@/components/AddAlertForm'
import AddCrimeForm from '@/components/AddCrimeForm'
import { AlertVehicle, CrimeReport } from 'types'

// ... (keep your existing interfaces)

export default function Dashboard() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<AlertVehicle[]>([])
  const [crimeReports, setCrimeReports] = useState<CrimeReport[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'vehicles' | 'crimes'>('vehicles')
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // SIMPLIFIED MODAL STATES - THESE WILL WORK
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [modalType, setModalType] = useState<'view' | 'map' | null>(null)
  const [selectedItemType, setSelectedItemType] = useState<'vehicle' | 'crime'>('vehicle')

  // FIXED: Simple modal handlers that GUARANTEE work
  const handleViewDetails = (item: any, type: 'vehicle' | 'crime') => {
    console.log('🔄 Opening view modal for:', item.id)
    setSelectedItem(item)
    setSelectedItemType(type)
    setModalType('view')
  }

  const handleViewMap = (item: any, type: 'vehicle' | 'crime') => {
    console.log('🗺️ Opening map modal for:', item.id)
    if (!item.latitude || !item.longitude) {
      alert('No location data available for this report.')
      return
    }
    setSelectedItem(item)
    setSelectedItemType(type)
    setModalType('map')
  }

  const closeModal = () => {
    setSelectedItem(null)
    setModalType(null)
  }

  // Authentication (keep your existing code)
  useEffect(() => {
    let mounted = true

    const initializeDashboard = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (!session?.user) {
          console.log('🚫 No user session, redirecting to login')
          setAuthChecked(true)
          setLoading(false)
          router.push('/login')
          return
        }

        console.log('✅ User authenticated:', session.user.email)
        setUser(session.user)
        
        const profile = await ensureUserProfile(session.user.id, {
          email: session.user.email!,
          name: session.user.user_metadata?.name
        })

        if (!mounted) return

        setUserProfile(profile)
        setAuthChecked(true)
        
        // Load data
        fetchAlerts()
        
      } catch (error) {
        console.error('Dashboard initialization error:', error)
        if (mounted) {
          setAuthChecked(true)
          setLoading(false)
          router.push('/login')
        }
      }
    }

    initializeDashboard()

    return () => {
      mounted = false
    }
  }, [router])

  // Fetch data (simplified)
  const fetchAlerts = async () => {
    try {
      setLoading(true)
      
      const [alertsData, crimesData] = await Promise.all([
        supabase
          .from('alerts_vehicles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('crime_reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
      ])

      if (alertsData.error) throw alertsData.error
      if (crimesData.error) throw crimesData.error

      setAlerts(alertsData.data || [])
      setCrimeReports(crimesData.data || [])
      
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Utility functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // FIXED: View Report Modal Component
  const ViewReportModal = () => {
    if (!selectedItem || modalType !== 'view') return null

    const item = selectedItem
    const isVehicle = selectedItemType === 'vehicle'

    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
        <div className="bg-dark-gray border border-gray-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-primary-white">
                {isVehicle ? 'Vehicle Report Details' : 'Crime Report Details'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Header Section */}
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`p-3 rounded-lg ${isVehicle ? 'bg-accent-gold' : 'bg-red-600'}`}>
                    {isVehicle ? 
                      <Car className="w-6 h-6 text-black" /> : 
                      <Shield className="w-6 h-6 text-white" />
                    }
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-primary-white">
                      {isVehicle ? item.number_plate : item.crime_type}
                    </h4>
                    <p className="text-gray-400">
                      OB Number: <strong>{item.ob_number}</strong>
                    </p>
                    <p className="text-gray-400">
                      Status: <span className={`${item.status === 'ACTIVE' ? 'text-green-400' : 'text-blue-400'}`}>
                        {item.status}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-300"><strong>Location:</strong> {item.location || item.suburb}</p>
                    <p className="text-gray-300"><strong>Suburb:</strong> {item.suburb}</p>
                    {isVehicle ? (
                      <>
                        <p className="text-gray-300"><strong>Vehicle:</strong> {item.make} {item.model}</p>
                        <p className="text-gray-300"><strong>Color:</strong> {item.color}</p>
                      </>
                    ) : (
                      <p className="text-gray-300"><strong>Incident Type:</strong> {item.crime_type}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-300">
                      <strong>Reported:</strong> {formatDate(item.created_at)} at {formatTime(item.created_at)}
                    </p>
                    {item.case_number && (
                      <p className="text-gray-300"><strong>SAPS Case:</strong> {item.case_number}</p>
                    )}
                    {item.station_reported_at && (
                      <p className="text-gray-300"><strong>Station:</strong> {item.station_reported_at}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description Section */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h5 className="text-lg font-semibold text-primary-white mb-3">
                  {isVehicle ? 'Additional Details' : 'Description'}
                </h5>
                <p className="text-gray-300 whitespace-pre-wrap">
                  {isVehicle ? item.comments || 'No additional details provided.' : item.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-600 text-gray-300 hover:bg-gray-700 rounded transition-colors"
                >
                  Close
                </button>
                {item.latitude && item.longitude && (
                  <button
                    onClick={() => handleViewMap(item, selectedItemType)}
                    className="btn-primary flex items-center justify-center space-x-2"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>View on Map</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // FIXED: Map Modal Component
  const MapModal = () => {
    if (!selectedItem || modalType !== 'map') return null

    const item = selectedItem
    const isVehicle = selectedItemType === 'vehicle'

    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
        <div className="bg-dark-gray border border-gray-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-primary-white">
                {isVehicle ? 'Vehicle Location' : 'Crime Location'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-primary-white mb-4">Location Details</h4>
                  <div className="space-y-3">
                    <div className="bg-gray-900 rounded p-3">
                      <p className="text-sm text-gray-400 mb-1">Coordinates</p>
                      <p className="text-primary-white font-mono">
                        {item.latitude?.toFixed(6)}, {item.longitude?.toFixed(6)}
                      </p>
                    </div>
                    
                    {isVehicle ? (
                      <>
                        <div className="bg-gray-900 rounded p-3">
                          <p className="text-sm text-gray-400 mb-1">Vehicle</p>
                          <p className="text-primary-white">
                            {item.number_plate} - {item.make} {item.model}
                          </p>
                        </div>
                        <div className="bg-gray-900 rounded p-3">
                          <p className="text-sm text-gray-400 mb-1">Incident</p>
                          <p className="text-primary-white">{item.reason}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-gray-900 rounded p-3">
                          <p className="text-sm text-gray-400 mb-1">Crime Type</p>
                          <p className="text-primary-white">{item.crime_type}</p>
                        </div>
                        <div className="bg-gray-900 rounded p-3">
                          <p className="text-sm text-gray-400 mb-1">Location</p>
                          <p className="text-primary-white">{item.location}</p>
                        </div>
                      </>
                    )}
                    
                    <div className="bg-gray-900 rounded p-3">
                      <p className="text-sm text-gray-400 mb-1">Suburb</p>
                      <p className="text-primary-white">{item.suburb}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-primary-white mb-4">Map Actions</h4>
                  <div className="space-y-3">
                    <button
                      onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=16/${item.latitude}/${item.longitude}`, '_blank')}
                      className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
                    >
                      <span>View on OpenStreetMap</span>
                    </button>
                    
                    <div className="bg-yellow-900 border border-yellow-700 text-yellow-300 p-3 rounded text-sm">
                      <p className="font-medium mb-1">Location Information</p>
                      <p>Location accuracy depends on the precision of the coordinates provided by the reporter.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Map Preview */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-primary-white mb-4">Location Preview</h4>
              <div className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center relative">
                <div className="text-center text-gray-400">
                  <MapPin className="w-12 h-12 mx-auto mb-2" />
                  <p>Coordinates: {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}</p>
                  <p className="text-sm mt-2">
                    <button
                      onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=16/${item.latitude}/${item.longitude}`, '_blank')}
                      className="text-accent-gold hover:text-yellow-400 underline"
                    >
                      Click to view on interactive map
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Filter data based on search
  const filteredAlerts = alerts.filter(alert =>
    alert.number_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.suburb.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.make.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredCrimeReports = crimeReports.filter(report =>
    report.crime_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.suburb.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.location.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-dark-gray py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-gold mx-auto mb-4"></div>
            <p className="text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
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

      {/* User Controls */}
      {user && (
        <div className="text-center space-y-4">
          {userProfile && !userProfile.approved ? (
            <div className="bg-yellow-900 border border-yellow-700 text-yellow-300 px-4 py-3 rounded mb-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Account Pending Approval</span>
              </div>
              <p className="text-sm">Your account is pending approval. You can view reports but cannot file new ones.</p>
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
            </div>
          )}
         
          {showAddForm && activeTab === 'vehicles' && (
            <AddAlertForm
              onAlertAdded={() => {
                setShowAddForm(false)
                fetchAlerts()
              }}
            />
          )}
          {showAddForm && activeTab === 'crimes' && (
            <AddCrimeForm
              onCrimeReportAdded={() => {
                setShowAddForm(false)
                fetchAlerts()
              }}
            />
          )}
        </div>
      )}

      {/* Reports List */}
      {user && (
        <div className="card p-4 md:p-6">
          <div className="flex flex-col space-y-4 mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-primary-white">
              {activeTab === 'vehicles' ? 'Vehicle Reports' : 'Crime Reports'}
            </h2>
           
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab === 'vehicles' ? 'vehicles, plates...' : 'crimes, locations...'}`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10 w-full"
                />
              </div>
              <div className="text-sm text-gray-400">
                Showing {activeTab === 'vehicles' ? filteredAlerts.length : filteredCrimeReports.length} reports
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-gold mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading reports...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* VEHICLE REPORTS */}
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
                          Reported {formatDate(alert.created_at)} at {formatTime(alert.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end space-x-2 flex-wrap gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.status === 'ACTIVE' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {alert.status}
                      </span>
                      
                      {/* FIXED: These buttons will now work 100% */}
                      {alert.latitude && alert.longitude && (
                        <button
                          onClick={() => handleViewMap(alert, 'vehicle')}
                          className="p-2 text-accent-blue hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                          title="View Location on Map"
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleViewDetails(alert, 'vehicle')}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                        title="View Full Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* CRIME REPORTS */}
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
                        <p className="text-xs text-gray-500 mt-2">
                          Reported {formatDate(report.created_at)} at {formatTime(report.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end space-x-2 flex-wrap gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        report.status === 'ACTIVE' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {report.status}
                      </span>
                      
                      {/* FIXED: These buttons will now work 100% */}
                      {report.latitude && report.longitude && (
                        <button
                          onClick={() => handleViewMap(report, 'crime')}
                          className="p-2 text-accent-blue hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                          title="View Location"
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleViewDetails(report, 'crime')}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
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
            </div>
          )}
        </div>
      )}

      {/* FIXED: MODALS - These will definitely render */}
      <ViewReportModal />
      <MapModal />
    </div>
  )
}