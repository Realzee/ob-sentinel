'use client'

import { useState, useEffect } from 'react'
import { supabase, hasValidSupabaseConfig, ensureUserExists, safeDbOperation } from '@/lib/supabase'
import { Search, AlertTriangle, Shield, Users, Plus, FileText } from 'lucide-react'
import AddAlertForm from '@/components/AddAlertForm'

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
  created_at: string
}

export default function Dashboard() {
  const [alerts, setAlerts] = useState<AlertVehicle[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [user, setUser] = useState<any>(null)

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
        setUser(user)

        if (user) {
          // Ensure user exists in database (non-blocking)
          ensureUserExists(user.id, {
            email: user.email!,
            name: user.user_metadata?.name
          }).catch(error => {
            console.warn('User creation failed (non-critical):', error)
          })
        }

        await fetchAlerts()
      } catch (error) {
        console.error('Initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeApp()
  }, [])

  const fetchAlerts = async () => {
    const data = await safeDbOperation<AlertVehicle[]>(() => 
      supabase
        .from('alerts_vehicles')
        .select('*')
        .order('created_at', { ascending: false })
    , [])

    setAlerts(data || [])
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
        <img 
              src="/rapid-ireport-logo.png" 
              alt="RAPID iREPORT Logo"
              className="w-48 h-24 object-contain"
            />
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
      <div className="text-center">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary inline-flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>{showAddForm ? 'Cancel' : 'File New Report'}</span>
        </button>
      </div>

      {/* Add Report Form */}
      {showAddForm && (
        <AddAlertForm onAlertAdded={() => {
          fetchAlerts()
          setShowAddForm(false)
        }} />
      )}

      {/* Search and Reports */}
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
                    {alert.has_images && (
                      <p className="text-sm text-accent-gold mt-1">📷 Evidence available</p>
                    )}
                  </div>
                  <div className="mt-2 sm:mt-0 sm:ml-4 text-sm text-gray-400">
                    {new Date(alert.created_at).toLocaleString('en-ZA', {
                      timeZone: 'Africa/Johannesburg'
                    })}
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

      {/* Quick Tips */}
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
    </div>
  )
}