'use client'

import { useState, useEffect } from 'react'
import { supabase, hasValidSupabaseConfig } from '@/lib/supabase'
import { FileText, Search, Filter, User, Calendar, Clock, Shield, Car, Trash2, Edit, Plus } from 'lucide-react'

interface UserLog {
  id: string
  user_id: string
  action: string
  ip_address: string
  user_agent: string
  details: any
  created_at: string
  profiles: {
    name: string
    email: string
    role: string
  }
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<UserLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [selectedLog, setSelectedLog] = useState<UserLog | null>(null)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    if (!hasValidSupabaseConfig) {
      setError('System not configured')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('user_logs')
        .select(`
          *,
          profiles (
            name,
            email,
            role
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1000)

      if (error) throw error
      setLogs(data || [])
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    if (action.includes('login')) return <Shield className="w-4 h-4" />
    if (action.includes('alert') || action.includes('vehicle')) return <Car className="w-4 h-4" />
    if (action.includes('crime')) return <Shield className="w-4 h-4" />
    if (action.includes('create') || action.includes('add')) return <Plus className="w-4 h-4" />
    if (action.includes('update') || action.includes('edit')) return <Edit className="w-4 h-4" />
    if (action.includes('delete')) return <Trash2 className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  const getActionColor = (action: string) => {
    if (action.includes('login')) return 'text-green-400'
    if (action.includes('create') || action.includes('add')) return 'text-blue-400'
    if (action.includes('update') || action.includes('edit')) return 'text-yellow-400'
    if (action.includes('delete')) return 'text-red-400'
    return 'text-gray-400'
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip_address?.includes(searchTerm)
    
    const matchesAction = filterAction === 'all' || log.action.includes(filterAction)
    
    return matchesSearch && matchesAction
  })

  const uniqueActions = Array.from(new Set(logs.map(log => {
    if (log.action.includes('login')) return 'login'
    if (log.action.includes('create')) return 'create'
    if (log.action.includes('update')) return 'update'
    if (log.action.includes('delete')) return 'delete'
    return 'other'
  })))

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-gray p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-gold mx-auto mb-4"></div>
            <p className="text-gray-400">Loading logs...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-gray p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center space-x-3 mb-8">
          <div className="bg-accent-gold p-2 rounded-lg">
            <FileText className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-primary-white">System Logs</h1>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6 border-l-4 border-accent-gold">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Logs</p>
                <p className="text-3xl font-bold text-accent-gold">{logs.length}</p>
              </div>
              <FileText className="w-8 h-8 text-accent-gold" />
            </div>
          </div>

          <div className="card p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Today</p>
                <p className="text-3xl font-bold text-green-400">
                  {logs.filter(log => {
                    const logDate = new Date(log.created_at)
                    const today = new Date()
                    return logDate.toDateString() === today.toDateString()
                  }).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="card p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Unique Users</p>
                <p className="text-3xl font-bold text-blue-400">
                  {new Set(logs.map(log => log.user_id)).size}
                </p>
              </div>
              <User className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="card p-6 border-l-4 border-purple-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Most Active</p>
                <p className="text-lg font-bold text-purple-400 truncate">
                  {(() => {
                    const userCounts = logs.reduce((acc, log) => {
                      acc[log.user_id] = (acc[log.user_id] || 0) + 1
                      return acc
                    }, {} as Record<string, number>)
                    
                    const mostActive = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0]
                    return mostActive ? logs.find(log => log.user_id === mostActive[0])?.profiles?.name || 'Unknown' : 'None'
                  })()}
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>

            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="form-input"
            >
              <option value="all">All Actions</option>
              <option value="login">Logins</option>
              <option value="create">Creates</option>
              <option value="update">Updates</option>
              <option value="delete">Deletes</option>
            </select>

            <button
              onClick={fetchLogs}
              className="btn-primary"
            >
              Refresh Logs
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="card p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-4 text-gray-400 font-medium">Action</th>
                  <th className="text-left p-4 text-gray-400 font-medium">User</th>
                  <th className="text-left p-4 text-gray-400 font-medium">IP Address</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Timestamp</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr 
                    key={log.id} 
                    className="border-b border-gray-800 hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className={getActionColor(log.action)}>
                          {getActionIcon(log.action)}
                        </div>
                        <span className="text-primary-white font-medium text-sm">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-primary-white font-medium">
                          {log.profiles?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-400">{log.profiles?.email}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {log.profiles?.role}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-400">
                      {log.ip_address || 'N/A'}
                    </td>
                    <td className="p-4 text-sm text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-4">
                      {log.details ? (
                        <span className="text-xs text-accent-gold">
                          View Details
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">No details</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No logs found matching your criteria</p>
              </div>
            )}
          </div>
        </div>

        {/* Log Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-gray border border-gray-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
              <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-primary-white">Log Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Action</p>
                    <p className="text-primary-white font-medium">{selectedLog.action}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">User</p>
                    <p className="text-primary-white font-medium">
                      {selectedLog.profiles?.name || 'Unknown'} ({selectedLog.profiles?.email})
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">IP Address</p>
                    <p className="text-primary-white font-medium">{selectedLog.ip_address || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Timestamp</p>
                    <p className="text-primary-white font-medium">
                      {new Date(selectedLog.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedLog.details && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Details</p>
                    <pre className="bg-gray-800 p-4 rounded-lg text-sm text-gray-300 overflow-auto max-h-60">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-400 mb-2">User Agent</p>
                  <p className="text-sm text-gray-300 bg-gray-800 p-3 rounded-lg">
                    {selectedLog.user_agent}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}