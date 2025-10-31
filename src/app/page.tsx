'use client'

import { useState, useEffect } from 'react'
import { supabase, hasValidSupabaseConfig, ensureUserExists } from '@/lib/supabase'
import { Search, AlertTriangle, Shield, Users, Plus, FileText, Edit, Trash2, Image as ImageIcon, X, Clock, Car, MapPin, Camera, FileCheck, User } from 'lucide-react'
import AddAlertForm from '@/components/AddAlertForm'
import EditAlertForm from '@/components/EditAlertForm'

interface AlertVehicle {
  id: string
  number_plate: string
  color: string
  make: string
  model: string
  reason: string
  case_number: string
  suburb: string
  has_images: boolean
  image_urls?: string[]
  created_at: string
  user_id: string
  users: {
    name: string
    email: string
  }
}

export default function Dashboard() {
  const [alerts, setAlerts] = useState<AlertVehicle[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAlert, setEditingAlert] = useState<AlertVehicle | null>(null)
  const [user, setUser] = useState<any>(null)
  const [imagePreview, setImagePreview] = useState<{url: string, index: number, total: number} | null>(null)

  // Fetch alerts function
  const fetchAlerts = async () => {
    console.log('fetchAlerts called, user:', user)
    
    if (!user) {
      console.log('No user, clearing alerts')
      setAlerts([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('alerts_vehicles')
        .select(`
          *,
          users (name, email)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching alerts:', error)
        setAlerts([])
      } else {
        console.log('Fetched alerts:', data?.length)
        setAlerts(data || [])
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  // Initialize app and set up auth listener
  useEffect(() => {
    let mounted = true

    const initializeApp = async () => {
      if (!hasValidSupabaseConfig) {
        console.warn('Supabase not configured')
        setLoading(false)
        return
      }

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        console.log('Initial user:', user)
        
        if (mounted) {
          setUser(user)
          
          if (user) {
            // Ensure user exists in database (non-blocking)
            ensureUserExists(user.id, {
              email: user.email!,
              name: user.user_metadata?.name
            }).catch(error => {
              console.warn('User creation failed (non-critical):', error)
            })

            // Fetch alerts for logged in user
            await fetchAlerts()
          } else {
            setLoading(false)
          }
        }
      } catch (error) {
        console.error('Initialization error:', error)
        if (mounted) setLoading(false)
      }
    }

    initializeApp()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user)
        
        if (!mounted) return
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('User signed in, setting user state and fetching alerts')
          setUser(session?.user ?? null)
          
          if (session?.user) {
            // Small delay to ensure state is set before fetching
            setTimeout(async () => {
              if (mounted) await fetchAlerts()
            }, 100)
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing state')
          setUser(null)
          setAlerts([])
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Manual refresh function
  const refreshAlerts = async () => {
    console.log('Manual refresh triggered')
    await fetchAlerts()
  }

  const handleDeleteAlert = async (alertId: string) => {
    if (!user) return

    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('alerts_vehicles')
        .delete()
        .eq('id', alertId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Delete error:', error)
        throw error
      }

      console.log('Alert deleted successfully')
      setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId))
      
      await supabase
        .from('user_logs')
        .insert([
          {
            user_id: user.id,
            action: 'delete_alert',
            ip_address: '',
            user_agent: navigator.userAgent
          }
        ])

    } catch (error: any) {
      console.error('Error deleting alert:', error)
      alert('Failed to delete report: ' + error.message)
      await fetchAlerts()
    }
  }

  const handleEditAlert = (alert: AlertVehicle) => {
    setEditingAlert(alert)
  }

  const handleImagePreview = (alert: AlertVehicle, imageIndex: number) => {
    setImagePreview({
      url: alert.image_urls![imageIndex],
      index: imageIndex,
      total: alert.image_urls!.length
    })
  }

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!imagePreview) return
    
    const currentAlert = alerts.find(alert => 
      alert.image_urls?.includes(imagePreview.url)
    )
    
    if (!currentAlert || !currentAlert.image_urls) return
    
    let newIndex = direction === 'next' ? imagePreview.index + 1 : imagePreview.index - 1
    
    // Wrap around
    if (newIndex >= currentAlert.image_urls.length) newIndex = 0
    if (newIndex < 0) newIndex = currentAlert.image_urls.length - 1
    
    setImagePreview({
      url: currentAlert.image_urls[newIndex],
      index: newIndex,
      total: currentAlert.image_urls.length
    })
  }

  const filteredAlerts = alerts.filter(alert => 
    alert.number_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.suburb.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.users?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    totalAlerts: alerts.length,
    recentAlerts: alerts.filter(a => {
      const alertDate = new Date(a.created_at)
      const today = new Date()
      return alertDate.toDateString() === today.toDateString()
    }).length,
    activeSuburbs: new Set(alerts.map(a => a.suburb)).size
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section with Custom Image */}
      <div className="text-center">
        {/* Custom Image - Replace the src with your actual image path */}
        <div className="flex justify-center mb-6">
          <img 
            src="/rapid911-ireport-logo.png" // Replace with your image path
            alt="Rapid911 Logo" 
            className="w-32 h-auto object-contain rounded-lg"
          />
        </div>
        <h1 className="text-4xl font-bold bg-gold-gradient bg-clip-text text-transparent mb-2">
          iReport
        </h1>
        <p className="text-gray-400 text-lg">Smart Reporting System</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 border-l-4 border-accent-gold">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Reports</p>
              <p className="text-3xl font-bold text-accent-gold">{stats.totalAlerts}</p>
            </div>
            <FileText className="w-8 h-8 text-accent-gold" />
          </div>
        </div>

        <div className="card p-6 border-l-4 border-accent-red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Today's Reports</p>
              <p className="text-3xl font-bold text-accent-red">{stats.recentAlerts}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-accent-red" />
          </div>
        </div>

        <div className="card p-6 border-l-4 border-accent-gold">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Active Areas</p>
              <p className="text-3xl font-bold text-accent-gold">{stats.activeSuburbs}</p>
            </div>
            <Users className="w-8 h-8 text-accent-gold" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {user ? (
        <div className="text-center space-y-4">
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-primary inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>{showAddForm ? 'Cancel' : 'File New Report'}</span>
            </button>
            <button
              onClick={refreshAlerts}
              className="btn-primary inline-flex items-center space-x-2"
            >
              <span>Refresh</span>
            </button>
          </div>
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

      {/* Add Report Form */}
      {showAddForm && (
        <AddAlertForm onAlertAdded={() => {
          fetchAlerts()
          setShowAddForm(false)
        }} />
      )}

      {/* Edit Report Form */}
      {editingAlert && (
        <EditAlertForm 
          alert={editingAlert}
          onAlertUpdated={() => {
            fetchAlerts()
            setEditingAlert(null)
          }}
          onCancel={() => setEditingAlert(null)}
        />
      )}

      {/* Enhanced Image Preview Modal */}
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

      {/* Search and Reports */}
      {user ? (
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
            <h2 className="text-2xl font-bold text-primary-white">Recent Reports</h2>
            
            <div className="flex items-center space-x-4">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  id="search-reports"
                  name="search-reports"
                  placeholder="Search reports, plates, areas, users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-gold mx-auto"></div>
              <p className="mt-4 text-gray-400">Loading reports...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div key={alert.id} className="bg-dark-gray border border-gray-700 rounded-lg p-4 hover:border-accent-gold transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          alert.reason.includes('Hijack') ? 'bg-red-500 text-white' :
                          alert.reason.includes('Stolen') ? 'bg-green-500 text-white' :
                          'bg-yellow-900 text-yellow-300'
                        }`}>
                          {alert.reason}
                        </span>
                        {/* Updated registration number with white background and dark-blue text */}
                        <span className="bg-white text-blue-900 px-3 py-1 rounded-full text-sm font-bold border border-gray-300">
                          {alert.number_plate}
                        </span>
                        <span className="text-sm text-gray-400">{alert.suburb}</span>
                        {alert.case_number && (
                          <span className="text-sm text-gray-500">SAPS: {alert.case_number}</span>
                        )}
                      </div>
                      <p className="text-primary-white font-medium">
                        {alert.color} {alert.make} {alert.model}
                      </p>
                      
                      {/* Added reporter information */}
                      <div className="flex items-center space-x-2 mt-2">
                        <User className="w-3 h-3 text-accent-gold" />
                        <span className="text-sm text-gray-400">
                          Reported by: <span className="text-accent-gold">{alert.users?.name || 'Unknown User'}</span>
                        </span>
                      </div>
                      
                      {/* Enhanced Image Preview */}
                      {alert.image_urls && alert.image_urls.length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <ImageIcon className="w-4 h-4 text-accent-gold" />
                            <span className="text-sm text-accent-gold font-medium">
                              {alert.image_urls.length} image{alert.image_urls.length > 1 ? 's' : ''} attached
                            </span>
                          </div>
                          <div className="flex space-x-2 overflow-x-auto pb-2">
                            {alert.image_urls.map((url, index) => (
                              <div 
                                key={index}
                                className="relative group cursor-pointer flex-shrink-0"
                                onClick={() => handleImagePreview(alert, index)}
                              >
                                <img 
                                  src={url} 
                                  alt={`Evidence ${index + 1}`}
                                  className="w-20 h-20 object-cover rounded border-2 border-gray-600 hover:border-accent-gold transition-colors"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded flex items-center justify-center">
                                  <div className="bg-black bg-opacity-50 text-white text-xs px-1 rounded absolute bottom-1 right-1">
                                    {index + 1}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2 sm:mt-0 sm:ml-4 flex items-center space-x-2">
                      <div className="text-sm text-gray-400">
                        {new Date(alert.created_at).toLocaleString('en-ZA', {
                          timeZone: 'Africa/Johannesburg'
                        })}
                      </div>
                      
                      {/* Edit and Delete buttons */}
                      {alert.user_id === user.id && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditAlert(alert)}
                            className="p-2 text-accent-gold hover:bg-accent-gold hover:text-black rounded transition-colors"
                            title="Edit Report"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAlert(alert.id)}
                            className="p-2 text-accent-red hover:bg-accent-red hover:text-white rounded transition-colors"
                            title="Delete Report"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredAlerts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No reports found matching your search.' : 'No reports filed yet.'}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <Shield className="w-16 h-16 text-accent-gold mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-primary-white mb-4">Authentication Required</h2>
          <p className="text-gray-400 mb-6">
            Please log in to view and manage community safety reports.
          </p>
          <div className="space-x-4">
            <a href="/login" className="btn-primary">
              Sign In
            </a>
            <a href="/register" className="btn-primary">
              Create Account
            </a>
          </div>
        </div>
      )}

      {/* Enhanced Reporting Guidelines with Graphics */}
      {user && (
        <div className="card p-6 border-l-4 border-accent-gold">
          <h3 className="text-xl font-bold text-accent-gold mb-6 text-center">Effective Reporting Guide</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Timely Reporting */}
            <div className="bg-dark-gray rounded-lg p-4 border border-gray-700 hover:border-accent-gold transition-colors group">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-accent-gold rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Clock className="w-6 h-6 text-black" />
                </div>
                <h4 className="font-semibold text-primary-white mb-2">Report Immediately</h4>
                <p className="text-xs text-gray-300">
                  Report incidents as soon as they occur with accurate time and date
                </p>
              </div>
            </div>

            {/* Vehicle Details */}
            <div className="bg-dark-gray rounded-lg p-4 border border-gray-700 hover:border-accent-gold transition-colors group">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-accent-gold rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Car className="w-6 h-6 text-black" />
                </div>
                <h4 className="font-semibold text-primary-white mb-2">Vehicle Details</h4>
                <p className="text-xs text-gray-300">
                  Include plate number, color, make, model, and any distinctive features
                </p>
              </div>
            </div>

            {/* Location Details */}
            <div className="bg-dark-gray rounded-lg p-4 border border-gray-700 hover:border-accent-gold transition-colors group">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-accent-gold rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <MapPin className="w-6 h-6 text-black" />
                </div>
                <h4 className="font-semibold text-primary-white mb-2">Location & Direction</h4>
                <p className="text-xs text-gray-300">
                  Note exact location, suburb, and direction of travel if moving
                </p>
              </div>
            </div>

            {/* Evidence */}
            <div className="bg-dark-gray rounded-lg p-4 border border-gray-700 hover:border-accent-gold transition-colors group">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-accent-gold rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6 text-black" />
                </div>
                <h4 className="font-semibold text-primary-white mb-2">Upload Evidence</h4>
                <p className="text-xs text-gray-300">
                  Attach CCTV footage, photos, or any visual evidence available
                </p>
              </div>
            </div>

            {/* SAPS Case */}
            <div className="bg-dark-gray rounded-lg p-4 border border-gray-700 hover:border-accent-gold transition-colors group">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-accent-gold rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <FileCheck className="w-6 h-6 text-black" />
                </div>
                <h4 className="font-semibold text-primary-white mb-2">SAPS Case Number</h4>
                <p className="text-xs text-gray-300">
                  Always file official SAPS case for serious incidents and include case number
                </p>
              </div>
            </div>
          </div>

          {/* Quick Tips Footer */}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-400">
              <span className="flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3 text-accent-red" />
                <span>Be accurate and factual</span>
              </span>
              <span className="flex items-center space-x-1">
                <Shield className="w-3 h-3 text-accent-gold" />
                <span>Do not approach suspects</span>
              </span>
              <span className="flex items-center space-x-1">
                <Users className="w-3 h-3 text-accent-gold" />
                <span>Community safety first</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}