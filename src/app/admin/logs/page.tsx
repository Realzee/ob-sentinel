'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface UserLog {
  id: number
  user_id: number
  action: string
  ip_address: string
  user_agent: string
  created_at: string
  users: {
    name: string
    email: string
  }
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<UserLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('user_logs')
        .select(`
          *,
          users (name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h1 className="text-3xl font-bold text-sa-blue mb-6">User Activity Logs</h1>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sa-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading logs...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Action</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">IP Address</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{log.users.name}</p>
                      <p className="text-sm text-gray-600">{log.users.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.action === 'registration' 
                        ? 'bg-green-100 text-green-800'
                        : log.action === 'login'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {log.ip_address || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(log.created_at).toLocaleString('en-ZA', {
                      timeZone: 'Africa/Johannesburg'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {logs.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No activity logs found.
        </div>
      )}
    </div>
  )
}