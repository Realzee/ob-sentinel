'use client'

import { useState, useEffect } from 'react'
import { supabase, getAllUsers, updateUserProfile, getOnlineUsers, getUserLogs, getCurrentUserProfile } from '@/lib/supabase'
import { Users, Shield, CheckCircle, XCircle, Edit, Search, RefreshCw, Eye, UserCheck, UserX, Clock, X } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  name: string | null
  approved: boolean
  role: 'user' | 'moderator' | 'admin'
  last_login: string | null
  created_at: string
  updated_at: string
}

interface OnlineUser {
  last_seen: string
  user_agent: string
  ip_address: string
  profiles: UserProfile
}

interface UserLog {
  id: string
  user_id: string
  action: string
  ip_address: string
  user_agent: string
  details: any
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'online'>('all')
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [userLogs, setUserLogs] = useState<UserLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<'user' | 'moderator' | 'admin'>('user')
  const [authChecked, setAuthChecked] = useState(false)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const usersData = await getAllUsers()
      setUsers(usersData)
    } catch (error: any) {
      console.error('Error fetching users:', error)
      if (error.message === 'Insufficient permissions') {
        setAuthChecked(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchOnlineUsers = async () => {
    try {
      const onlineData = await getOnlineUsers()
      setOnlineUsers(onlineData)
    } catch (error) {
      console.error('Error fetching online users:', error)
    }
  }

  const handleUpdateUser = async (userId: string, updates: any) => {
    try {
      setUpdating(userId)
      await updateUserProfile(userId, updates)
      await fetchUsers() // Refresh the list
    } catch (error: any) {
      console.error('Error updating user:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setUpdating(null)
    }
  }

  const fetchUserLogs = async (userId: string) => {
    try {
      setLogsLoading(true)
      const logs = await getUserLogs(userId)
      setUserLogs(logs)
      setSelectedUser(users.find(u => u.id === userId) || null)
    } catch (error: any) {
      console.error('Error fetching user logs:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    const initialize = async () => {
      const profile = await getCurrentUserProfile()
      if (profile) {
        setCurrentUserRole(profile.role)
        setAuthChecked(true)
        if (profile.role === 'admin' || profile.role === 'moderator') {
          await fetchUsers()
          await fetchOnlineUsers()
        }
      } else {
        setAuthChecked(true)
      }
    }

    initialize()

    // Set up real-time subscription for online users
    const channel = supabase.channel('online-users')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'online_users'
        },
        () => {
          fetchOnlineUsers()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const canManageUsers = currentUserRole === 'admin' || currentUserRole === 'moderator'
  const canAssignAdmin = currentUserRole === 'admin'

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-dark-gray py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="card p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-400">Checking permissions...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!canManageUsers) {
    return (
      <div className="min-h-screen bg-dark-gray py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="card p-6 text-center">
            <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-primary-white mb-4">Access Denied</h1>
            <p className="text-gray-400">
              You don't have permission to access the admin panel. Please contact an administrator.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-gray py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary-white mb-2">
            User Management
          </h1>
          <p className="text-gray-400 text-lg">
            Manage user accounts, permissions, and monitor activity
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Users</p>
                <p className="text-3xl font-bold text-blue-400">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="card p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Approved Users</p>
                <p className="text-3xl font-bold text-green-400">
                  {users.filter(u => u.approved).length}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="card p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Online Now</p>
                <p className="text-3xl font-bold text-yellow-400">{onlineUsers.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="card p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Admins</p>
                <p className="text-3xl font-bold text-purple-400">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Tabs and Search */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                All Users
              </button>
              <button
                onClick={() => setActiveTab('online')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'online'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Online Users
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
              <button
                onClick={() => {
                  fetchUsers()
                  fetchOnlineUsers()
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="card p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading users...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">User</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Role</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Last Login</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'all' ? filteredUsers : onlineUsers.map(ou => ou.profiles)).map((user) => (
                    <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-primary-white font-medium">{user.name || 'No name'}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                          <p className="text-xs text-gray-500">
                            Joined {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateUser(user.id, { role: e.target.value as any })}
                          disabled={updating === user.id || !canAssignAdmin}
                          className="bg-dark-gray border border-gray-600 rounded px-2 py-1 text-sm text-primary-white disabled:opacity-50"
                        >
                          <option value="user">User</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {user.approved ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                          <button
                            onClick={() => handleUpdateUser(user.id, { approved: !user.approved })}
                            disabled={updating === user.id}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              user.approved
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            } disabled:opacity-50`}
                          >
                            {user.approved ? 'Revoke' : 'Approve'}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {user.last_login
                          ? new Date(user.last_login).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => fetchUserLogs(user.id)}
                            className="p-1 text-blue-400 hover:bg-blue-600 hover:text-white rounded transition-colors"
                            title="View Logs"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {onlineUsers.some(ou => ou.profiles.id === user.id) && (
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Online" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No users found matching your search.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Logs Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-gray border border-gray-700 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-primary-white">
                  User Logs: {selectedUser.name || selectedUser.email}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  Role: {selectedUser.role} • Approved: {selectedUser.approved ? 'Yes' : 'No'}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedUser(null)
                  setUserLogs([])
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto">
              {logsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading logs...</p>
                </div>
              ) : (
                <div className="p-6">
                  {userLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No activity logs found for this user.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userLogs.map((log) => (
                        <div key={log.id} className="bg-gray-800 rounded-lg p-4 border-l-4 border-blue-500">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium text-blue-400 capitalize">
                              {log.action.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-300 space-y-1">
                            <p><strong>IP:</strong> {log.ip_address || 'Unknown'}</p>
                            <p><strong>User Agent:</strong> {log.user_agent}</p>
                            {log.details && (
                              <div>
                                <strong>Details:</strong>
                                <pre className="text-xs mt-1 bg-gray-900 p-2 rounded overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}