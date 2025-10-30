'use client'

import { useState, useEffect } from 'react'
import { supabase, hasValidSupabaseConfig, ensureUserExists } from '@/lib/supabase'
import { Search, AlertTriangle, Shield, Users, Plus, FileText, Edit, Trash2, Image as ImageIcon } from 'lucide-react'
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
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  // Fetch alerts whenever user changes
  useEffect(() => {
    console.log('User changed, fetching alerts:', user)
    fetchAlerts()
  }, [user])

  // Initialize app and set up auth listener
  useEffect(() => {
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
        setUser(user)

        if (user) {
          // Ensure user exists in database (non-blocking)
          ensureUserExists(user.id, {
            email: user.email!,
            name: user.user_metadata?.name
          }).catch(error => {
            console.warn('User creation failed (non-critical):', error)
          })
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('Initialization error:', error)
        setLoading(false)
      }
    }

    initializeApp()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user)
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('User signed in, setting user state')
          setUser(session?.user ?? null)
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing state')
          setUser(null)
          setAlerts([])
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleDeleteAlert = async (alertId: string) => {
    if (!user) return

    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return
    }

    setDeletingId(alertId)
    try {
      const { error } = await supabase
        .from('alerts_vehicles')
        .delete()
        .eq('id', alertId)
        .eq('user_id', user.id) // Ensure user can only delete their own reports

      if (error) {
        console.error('Delete error:', error)
        throw error
      }

      console.log('Alert deleted successfully')
      
      // Update UI immediately by filtering out the deleted alert
      setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId))
      
      // Log the action
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
      // If delete failed, refresh the list to ensure consistency
      await fetchAlerts()
    } finally {
      setDeletingId(null)
    }
  }

  const handleEditAlert = (alert: AlertVehicle) => {
    setEditingAlert(alert)
  }

  const handleImagePreview = (imageUrl: string) => {
    setImagePreview(imageUrl)
  }

  const filteredAlerts = alerts.filter(alert => 
    alert.number_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.suburb.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.model.toLowerCase().includes(searchTerm.toLowerCase())
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
      {/* Welcome Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gold-gradient bg-clip-text text-transparent mb-2">
          RAPID iREPORT
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

      {/* Quick Actions - Only show if user is logged in */}
      {user ? (
        <div className="text-center">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>{showAddForm ? 'Cancel' : 'File New Report'}</span>
          </button>
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

      {/* Image Preview Modal */}
      {imagePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl max-h-full overflow-auto">
            <div className="p-4 flex justify-between items-center border-b">
              <h3 className="text-lg font-semibold">Image Preview</h3>
              <button
                onClick={() => setImagePreview(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <img 
                src={imagePreview} 
                alt="Report evidence" 
                className="w-full h-auto rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Search and Reports - Only show if user is logged in */}
      {user ? (
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
            <h2 className="text-2xl font-bold text-primary-white">Recent Reports</h2>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                id="search-reports"
                name="search-reports"
                placeholder="Search reports, plates, areas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
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
                          alert.reason.includes('Hijack') ? 'bg-red-900 text-red-300' :
                          alert.reason.includes('Stolen') ? 'bg-orange-900 text-orange-300' :
                          'bg-yellow-900 text-yellow-300'
                        }`}>
                          {alert.reason}
                        </span>
                        <span className="bg-accent-red text-primary-white px-3 py-1 rounded-full text-sm font-medium">
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
                      
                      {/* Image Preview */}
                      {alert.has_images && alert.image_urls && alert.image_urls.length > 0 && (
                        <div className="mt-3 flex space-x-2">
                          {alert.image_urls.slice(0, 3).map((url, index) => (
                            <div 
                              key={index}
                              className="relative group cursor-pointer"
                              onClick={() => handleImagePreview(url)}
                            >
                              <img 
                                src={url} 
                                alt={`Evidence ${index + 1}`}
                                className="w-16 h-16 object-cover rounded border border-gray-600 hover:border-accent-gold transition-colors"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          ))}
                          {alert.image_urls.length > 3 && (
                            <div className="w-16 h-16 bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400">
                              +{alert.image_urls.length - 3} more
                            </div>
                          )}
                        </div>
                      )}
                      
                      {alert.has_images && (!alert.image_urls || alert.image_urls.length === 0) && (
                        <p className="text-sm text-accent-gold mt-1">📷 Evidence available</p>
                      )}
                    </div>
                    
                    <div className="mt-2 sm:mt-0 sm:ml-4 flex items-center space-x-2">
                      <div className="text-sm text-gray-400">
                        {new Date(alert.created_at).toLocaleString('en-ZA', {
                          timeZone: 'Africa/Johannesburg'
                        })}
                      </div>
                      
                      {/* Edit and Delete buttons - Only show for user's own reports */}
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
                            disabled={deletingId === alert.id}
                            className="p-2 text-accent-red hover:bg-accent-red hover:text-white rounded transition-colors disabled:opacity-50"
                            title="Delete Report"
                          >
                            {deletingId === alert.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
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
        // Show authentication message for non-logged in users
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
            <a href="/register" className="btn-outline">
              Create Account
            </a>
          </div>
        </div>
      )}

      {/* Quick Tips - Only show if user is logged in */}
      {user && (
        <div className="card p-6 border-l-4 border-accent-gold">
          <h3 className="text-xl font-bold text-accent-gold mb-4">Reporting Guidelines</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• Report incidents immediately with accurate details</li>
            <li>• Include vehicle plates, color, make, and model</li>
            <li>• Note distinctive features and last seen location</li>
            <li>• Upload any available CCTV or photo evidence</li>
            <li>• Always file an official SAPS case for serious incidents</li>
          </ul>
        </div>
      )}
    </div>
  )
}