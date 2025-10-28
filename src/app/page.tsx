'use client'

import { useState, useEffect } from 'react'
import { supabase, hasValidSupabaseConfig } from '@/lib/supabase'
import { Search, AlertTriangle, Shield, Users, Plus } from 'lucide-react'
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

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    if (!hasValidSupabaseConfig) {
      console.warn('Supabase not configured')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('alerts_vehicles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAlerts(data || [])
    } catch (error: any) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
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
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-sa-blue">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Alerts</p>
              <p className="text-3xl font-bold text-sa-blue">{stats.totalAlerts}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-sa-blue" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-sa-green">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today's Alerts</p>
              <p className="text-3xl font-bold text-sa-green">{stats.recentAlerts}</p>
            </div>
            <Shield className="w-8 h-8 text-sa-green" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-sa-yellow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Suburbs</p>
              <p className="text-3xl font-bold text-sa-yellow">{stats.activeSuburbs}</p>
            </div>
            <Users className="w-8 h-8 text-sa-yellow" />
          </div>
        </div>
      </div>

      {/* Add Alert Button */}
      <div className="text-center">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-sa-green hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center space-x-2 mx-auto"
        >
          <Plus className="w-5 h-5" />
          <span>{showAddForm ? 'Cancel' : 'Report Stolen Vehicle'}</span>
        </button>
      </div>

      {/* Add Alert Form */}
      {showAddForm && (
        <AddAlertForm onAlertAdded={() => {
          fetchAlerts() // Refresh alerts
          setShowAddForm(false) // Hide form
        }} />
      )}

      {/* Search and Alerts */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
          <h2 className="text-2xl font-bold text-gray-800">Vehicle Alerts</h2>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search plates, suburbs, makes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sa-blue focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sa-blue mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading alerts...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <div key={alert.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        alert.reason.includes('Hijack') ? 'bg-red-100 text-red-800' :
                        alert.reason.includes('Stolen') ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {alert.reason}
                      </span>
                      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                        {alert.number_plate}
                      </span>
                      <span className="text-sm text-gray-600">{alert.suburb}</span>
                      {alert.case_number && (
                        <span className="text-sm text-gray-500">SAPS: {alert.case_number}</span>
                      )}
                    </div>
                    <p className="text-gray-800 font-medium">
                      {alert.color} {alert.make} {alert.model}
                    </p>
                    {alert.has_images && (
                      <p className="text-sm text-blue-600 mt-1">📷 Images available</p>
                    )}
                  </div>
                  <div className="mt-2 sm:mt-0 sm:ml-4 text-sm text-gray-500">
                    {new Date(alert.created_at).toLocaleString('en-ZA', {
                      timeZone: 'Africa/Johannesburg'
                    })}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredAlerts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No alerts found matching your search.' : 'No alerts reported yet.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Community Tips */}
      <div className="bg-sa-green text-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold mb-4">Community Safety Tips</h3>
        <ul className="space-y-2 text-sm">
          <li>• Report stolen vehicles immediately to SAPS and community</li>
          <li>• Note vehicle details: plate, color, make, model, distinctive features</li>
          <li>• Share CCTV footage with authorities</li>
          <li>• Keep your vehicle in well-lit areas</li>
          <li>• Use anti-theft devices and tracking systems</li>
        </ul>
      </div>
    </div>
  )
}