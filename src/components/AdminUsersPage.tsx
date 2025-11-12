'use client'

import { useState, useEffect } from 'react'
import { supabase, hasValidSupabaseConfig, logUserAction, updateUserPresence, getOnlineUsers } from '@/lib/supabase'
import { Users, Shield, CheckCircle, XCircle, Edit, Save, X, User, Clock, Search, Filter, Wifi, WifiOff } from 'lucide-react'

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
  id: string
  user_id: string
  last_seen: string
  online: boolean
  profiles: UserProfile
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterApproved, setFilterApproved] = useState('all')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{approved: boolean, role: 'user' | 'moderator' | 'admin'}>({approved: false, role: 'user'})
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
  const checkAdminAccess = async () => {
    setLoading(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        window.location.href = '/login'
        return
      }

      // Get user profile to check role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, approved')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        window.location.href = '/dashboard'
        return
      }

      // Only allow admin and moderator roles
      if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
        window.location.href = '/dashboard'
        return
      }

      setCurrentUser(user)
      
      // Now fetch the users data
      await fetchUsers()
      
    } catch (error) {
      console.error('Error checking admin access:', error)
      window.location.href = '/dashboard'
    } finally {
      setLoading(false)
    }
  }

  checkAdminAccess()
}, [])

  useEffect(() => {
    checkAuth()
    fetchUsers()
    startPresenceUpdates()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
    
    if (user) {
      updateUserPresence(user.id)
    }
  }

  const fetchUsers = async () => {
    if (!hasValidSupabaseConfig) {
      setError('System not configured')
      setLoading(false)
      return
    }

    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(profiles || [])
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const startPresenceUpdates = async () => {
    // Update presence every minute
    setInterval(async () => {
      if (currentUser) {
        await updateUserPresence(currentUser.id)
      }
      const onlineUsers = await getOnlineUsers()
      setOnlineUsers(onlineUsers)
    }, 60000)

    // Initial load
    const onlineUsers = await getOnlineUsers()
    setOnlineUsers(onlineUsers)
  }

  const handleEdit = (user: UserProfile) => {
    setEditingUserId(user.id)
    setEditForm({ approved: user.approved, role: user.role })
  }

  const handleSave = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(editForm)
        .eq('id', userId)

      if (error) throw error

      // Log the action
      if (currentUser) {
        await logUserAction(currentUser.id, 'update_user_profile', {
          target_user_id: userId,
          changes: editForm
        })
      }

      setUsers(users.map(user => user.id === userId ? { ...user, ...editForm } : user))
      setEditingUserId(null)
      setSuccess('User updated successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleCancel = () => {
    setEditingUserId(null)
  }

  const getOnlineStatus = (userId: string) => {
    const onlineUser = onlineUsers.find(u => u.user_id === userId)
    if (onlineUser) {
      const lastSeen = new Date(onlineUser.last_seen)
      const now = new Date()
      const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / 60000)
      return diffMinutes < 2 ? 'online' : `active ${diffMinutes}m ago`
    }
    return 'offline'
  }

  const isUserOnline = (userId: string) => {
    const status = getOnlineStatus(userId)
    return status === 'online'
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === 'all' || user.role === filterRole
    const matchesApproved = filterApproved === 'all' || 
      (filterApproved === 'approved' && user.approved) ||
      (filterApproved === 'pending' && !user.approved)
    
    return matchesSearch && matchesRole && matchesApproved
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-gray p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-gold mx-auto mb-4"></div>
            <p className="text-gray-400">Loading users...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-gray p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="bg-accent-gold p-2 rounded-lg">
              <Users className="w-6 h-6 text-black" />
            </div>
            <h1 className="text-3xl font-bold text-primary-white">User Management</h1>
          </div>
          <div className="text-sm text-gray-400">
            {onlineUsers.length} users online
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6 border-l-4 border-accent-gold">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Users</p>
                <p className="text-3xl font-bold text-accent-gold">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-accent-gold" />
            </div>
          </div>

          <div className="card p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Approved Users</p>
                <p className="text-3xl font-bold text-green-400">
                  {users.filter(u => u.approved).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="card p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Online Now</p>
                <p className="text-3xl font-bold text-blue-400">
                  {onlineUsers.filter(u => isUserOnline(u.user_id)).length}
                </p>
              </div>
              <Wifi className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="card p-6 border-l-4 border-purple-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Admins/Mods</p>
                <p className="text-3xl font-bold text-purple-400">
                  {users.filter(u => u.role === 'admin' || u.role === 'moderator').length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="form-input"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="moderator">Moderators</option>
              <option value="admin">Admins</option>
            </select>

            <select
              value={filterApproved}
              onChange={(e) => setFilterApproved(e.target.value)}
              className="form-input"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="card p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-4 text-gray-400 font-medium">User</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Role</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Last Login</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Online</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800 transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-primary-white">
                          {user.name || 'No name'}
                        </p>
                        <p className="text-sm text-gray-400">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      {user.approved ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-600 text-white">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-600 text-white">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-600 text-white' :
                        user.role === 'moderator' ? 'bg-blue-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-400">
                      {user.last_login 
                        ? new Date(user.last_login).toLocaleString()
                        : 'Never'
                      }
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        {isUserOnline(user.id) ? (
                          <>
                            <Wifi className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 text-sm">Online</span>
                          </>
                        ) : (
                          <>
                            <WifiOff className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-500 text-sm">
                              {getOnlineStatus(user.id)}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {editingUserId === user.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSave(user.id)}
                            className="text-green-500 hover:text-green-400 p-1 rounded transition-colors"
                            title="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="text-red-500 hover:text-red-400 p-1 rounded transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-accent-gold hover:text-yellow-400 p-1 rounded transition-colors"
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No users found matching your criteria</p>
              </div>
            )}
          </div>

          {/* Edit Modal */}
          {editingUserId && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-dark-gray border border-gray-700 rounded-lg w-full max-w-md">
                <div className="p-6 border-b border-gray-700">
                  <h3 className="text-lg font-semibold text-primary-white">Edit User</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Approval Status
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={editForm.approved}
                        onChange={e => setEditForm({...editForm, approved: e.target.checked})}
                        className="rounded border-gray-600 bg-dark-gray text-accent-gold focus:ring-accent-gold"
                      />
                      <span className="text-sm text-gray-300">Approved</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Role
                    </label>
                    <select
                      value={editForm.role}
                      onChange={e => setEditForm({...editForm, role: e.target.value as any})}
                      className="form-input"
                    >
                      <option value="user">User</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="p-6 border-t border-gray-700 flex justify-end space-x-3">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-600 text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSave(editingUserId)}
                    className="btn-primary"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}