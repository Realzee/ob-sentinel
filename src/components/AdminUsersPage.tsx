// components/AdminUsersPage.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Shield, CheckCircle, XCircle, Edit, Save, X, User, Clock, Search, Filter, Wifi, WifiOff, Mail, Phone, MapPin, Calendar, Trash2, AlertTriangle, Eye, Ban, CheckSquare, Square, Plus, Key } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  name: string | null
  approved: boolean
  role: 'user' | 'moderator' | 'admin'
  last_login: string | null
  created_at: string
  updated_at: string
  phone?: string
  location?: string
}

interface OnlineUser {
  id: string
  user_id: string
  last_seen: string
  online: boolean
  profiles: UserProfile
}

interface NewUserForm {
  email: string
  name: string
  phone: string
  location: string
  role: 'user' | 'moderator' | 'admin'
  approved: boolean
  sendInvite: boolean
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
  const [filterStatus, setFilterStatus] = useState('all')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({})
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [addingUser, setAddingUser] = useState(false)

  const [newUserForm, setNewUserForm] = useState<NewUserForm>({
    email: '',
    name: '',
    phone: '',
    location: '',
    role: 'user',
    approved: true,
    sendInvite: true
  })

  useEffect(() => {
    checkAuth()
    fetchUsers()
    startPresenceUpdates()
  }, [])

  // Simple password generator (for demo purposes)
  const generateTempPassword = () => {
    return 'TempPassword123!' // In production, generate a secure random password
  }

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)

    if (user) {
      // Update last login for admin user
      await updateUserLastLogin(user.id)
    }
  }

  // Update user's last login time
  const updateUserLastLogin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        console.error('Error updating last login:', error)
        return { error }
      }

      console.log('✅ Last login updated for user:', userId)
      return { success: true }
    } catch (error) {
      console.error('Error updating last login:', error)
      return { error }
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data: profiles, error } = await supabase
        .from('users')
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
    // Presence updates removed - functions not available
  }

  // Add new user function
  // Replace the handleAddUser function in AdminUsersPage.tsx
// Alternative handleAddUser function for client-side only
const handleAddUser = async () => {
  if (!newUserForm.email) {
    setError('Email is required')
    return
  }

  setAddingUser(true)
  setError('')

  try {
    // Use signUp method instead of admin.createUser
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newUserForm.email,
      password: generateTempPassword(),
      options: {
        data: {
          name: newUserForm.name
        }
      }
    })

    if (authError) {
      // If user already exists, we can still create/update their profile
      if (authError.message.includes('already registered')) {
        console.log('User already exists, creating profile...')
        
        // Get the user by email
        const { data: existingUsers } = await supabase.auth.admin.listUsers()
        const user = existingUsers?.users.find(u => u.email === newUserForm.email)
        
        if (!user) {
          throw new Error('User exists but could not be found')
        }
        
        // Create or update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: newUserForm.email,
            name: newUserForm.name,
            phone: newUserForm.phone,
            location: newUserForm.location,
            role: newUserForm.role,
            approved: newUserForm.approved,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          })

        if (profileError) throw profileError
      } else {
        throw authError
      }
    } else if (authData.user) {
      // Create profile for new user
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: newUserForm.email,
          name: newUserForm.name,
          phone: newUserForm.phone,
          location: newUserForm.location,
          role: newUserForm.role,
          approved: newUserForm.approved,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (profileError) throw profileError
    }

    setSuccess('User added successfully!')
    setShowAddUserModal(false)
    setNewUserForm({
      email: '',
      name: '',
      phone: '',
      location: '',
      role: 'user',
      approved: true,
      sendInvite: true
    })
    
    // Refresh users list
    await fetchUsers()
    
  } catch (error: any) {
    console.error('Error adding user:', error)
    setError(error.message || 'Failed to add user')
  } finally {
    setAddingUser(false)
  }
}

  const handleEdit = (user: UserProfile) => {
    setEditingUserId(user.id)
    setEditForm({ 
      name: user.name || '',
      email: user.email,
      approved: user.approved,
      role: user.role,
      phone: user.phone || '',
      location: user.location || ''
    })
  }

  const handleSave = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...editForm,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      // Refresh users list to get updated data
      await fetchUsers()
      setEditingUserId(null)
      setEditForm({})
      setSuccess('User updated successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleCancel = () => {
    setEditingUserId(null)
    setEditForm({})
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      // First try to delete from auth (if admin permissions)
      try {
        const { error: authError } = await supabase.auth.admin.deleteUser(userId)
        if (authError) {
          console.log('Note: Could not delete from auth (may require admin privileges)')
        }
      } catch (authError) {
        console.log('Note: Auth deletion failed, proceeding with profile deletion only')
      }

      // Delete from profiles
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error

      setUsers(users.filter(user => user.id !== userId))
      setSuccess('User deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) {
      setError('Please select users and an action')
      return
    }

    try {
      let updates = {}
      
      switch (bulkAction) {
        case 'approve':
          updates = { approved: true }
          break
        case 'reject':
          updates = { approved: false }
          break
        case 'make_moderator':
          updates = { role: 'moderator' }
          break
        case 'make_user':
          updates = { role: 'user' }
          break
        case 'delete':
          if (!confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) return
          
          // Delete profiles
          const { error: deleteError } = await supabase
            .from('profiles')
            .delete()
            .in('id', selectedUsers)
            
          if (deleteError) throw deleteError
          
          setUsers(users.filter(user => !selectedUsers.includes(user.id)))
          setSelectedUsers([])
          setSuccess(`${selectedUsers.length} users deleted successfully`)
          setTimeout(() => setSuccess(''), 3000)
          return
        default:
          return
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedUsers)

      if (error) throw error

      // Refresh the users list
      await fetchUsers()
      setSelectedUsers([])
      setBulkAction('')
      setSuccess(`Bulk action completed for ${selectedUsers.length} users`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message)
    }
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const selectAllUsers = () => {
    setSelectedUsers(
      selectedUsers.length === filteredUsers.length 
        ? [] 
        : filteredUsers.map(user => user.id)
    )
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
      user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.location?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === 'all' || user.role === filterRole
    const matchesApproved = filterApproved === 'all' || 
      (filterApproved === 'approved' && user.approved) ||
      (filterApproved === 'pending' && !user.approved)
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'online' && isUserOnline(user.id)) ||
      (filterStatus === 'offline' && !isUserOnline(user.id))
    
    return matchesSearch && matchesRole && matchesApproved && matchesStatus
  })

  const stats = {
    total: users.length,
    approved: users.filter(u => u.approved).length,
    pending: users.filter(u => !u.approved).length,
    online: users.filter(u => isUserOnline(u.id)).length,
    admins: users.filter(u => u.role === 'admin').length,
    moderators: users.filter(u => u.role === 'moderator').length,
    regular: users.filter(u => u.role === 'user').length
  }

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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="bg-accent-gold p-2 rounded-lg">
              <Users className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary-white">User Management</h1>
              <p className="text-gray-400">Manage user accounts and permissions</p>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            {stats.online} users online
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded mb-6">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-red-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded mb-6">
            <div className="flex items-center justify-between">
              <span>{success}</span>
              <button onClick={() => setSuccess('')} className="text-green-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6 border-l-4 border-accent-gold">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Users</p>
                <p className="text-3xl font-bold text-accent-gold">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-accent-gold" />
            </div>
          </div>

          <div className="card p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Approved Users</p>
                <p className="text-3xl font-bold text-green-400">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="card p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Online Now</p>
                <p className="text-3xl font-bold text-blue-400">{stats.online}</p>
              </div>
              <Wifi className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="card p-6 border-l-4 border-purple-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Admins/Mods</p>
                <p className="text-3xl font-bold text-purple-400">{stats.admins + stats.moderators}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="card p-6 mb-6 bg-blue-900 border-blue-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <CheckSquare className="w-5 h-5 text-blue-300" />
                <span className="text-primary-white">
                  {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                >
                  <option value="">Bulk Actions</option>
                  <option value="approve">Approve Users</option>
                  <option value="reject">Reject Users</option>
                  <option value="make_moderator">Make Moderators</option>
                  <option value="make_user">Make Regular Users</option>
                  <option value="delete">Delete Users</option>
                </select>
                <button
                  onClick={handleBulkAction}
                  className="bg-accent-gold text-black px-4 py-2 rounded font-medium hover:bg-yellow-500 transition-colors"
                >
                  Apply
                </button>
                <button
                  onClick={() => setSelectedUsers([])}
                  className="bg-gray-600 text-white px-4 py-2 rounded font-medium hover:bg-gray-500 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="form-input"
            >
              <option value="all">All Online Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'table' ? 'bg-accent-gold text-black' : 'bg-gray-700 text-gray-300'
                }`}
              >
                Table View
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'cards' ? 'bg-accent-gold text-black' : 'bg-gray-700 text-gray-300'
                }`}
              >
                Card View
              </button>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddUserModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add User</span>
              </button>
              <button
                onClick={fetchUsers}
                className="bg-accent-blue text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        {viewMode === 'table' ? (
          <div className="card p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 text-gray-400 font-medium">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                          onChange={selectAllUsers}
                          className="rounded border-gray-600 bg-dark-gray text-accent-gold focus:ring-accent-gold"
                        />
                        <span>User</span>
                      </div>
                    </th>
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
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => toggleUserSelection(user.id)}
                            className="rounded border-gray-600 bg-dark-gray text-accent-gold focus:ring-accent-gold"
                          />
                          <div>
                            <p className="font-medium text-primary-white">
                              {user.name || 'No name'}
                            </p>
                            <p className="text-sm text-gray-400">{user.email}</p>
                            <p className="text-xs text-gray-500">
                              Joined {new Date(user.created_at).toLocaleDateString()}
                            </p>
                          </div>
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
                        <div className="flex space-x-2">
                          {editingUserId === user.id ? (
                            <>
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
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(user)}
                                className="text-accent-gold hover:text-yellow-400 p-1 rounded transition-colors"
                                title="Edit User"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
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
          </div>
        ) : (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map(user => (
              <div key={user.id} className="card p-6 hover:border-accent-gold transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-accent-gold rounded-full flex items-center justify-center text-black font-bold text-lg">
                      {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary-white">{user.name || 'No name'}</h3>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                    className="rounded border-gray-600 bg-dark-gray text-accent-gold focus:ring-accent-gold"
                  />
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Status:</span>
                    {user.approved ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-600 text-white">
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-600 text-white">
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Role:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-purple-600 text-white' :
                      user.role === 'moderator' ? 'bg-blue-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {user.role}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Online:</span>
                    <div className="flex items-center space-x-1">
                      {isUserOnline(user.id) ? (
                        <>
                          <Wifi className="w-3 h-3 text-green-400" />
                          <span className="text-green-400 text-xs">Online</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-500 text-xs">Offline</span>
                        </>
                      )}
                    </div>
                  </div>

                  {user.last_login && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Last Login:</span>
                      <span className="text-xs text-gray-400">
                        {new Date(user.last_login).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(user)}
                    className="flex-1 bg-accent-gold text-black py-2 px-3 rounded text-sm font-medium hover:bg-yellow-500 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="bg-red-600 text-white py-2 px-3 rounded text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add User Modal */}
        {showAddUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-gray border border-gray-700 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-primary-white">Add New User</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={newUserForm.email}
                    onChange={e => setNewUserForm({...newUserForm, email: e.target.value})}
                    className="form-input"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={newUserForm.name}
                    onChange={e => setNewUserForm({...newUserForm, name: e.target.value})}
                    className="form-input"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newUserForm.phone}
                    onChange={e => setNewUserForm({...newUserForm, phone: e.target.value})}
                    className="form-input"
                    placeholder="+27 12 345 6789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newUserForm.location}
                    onChange={e => setNewUserForm({...newUserForm, location: e.target.value})}
                    className="form-input"
                    placeholder="City, Suburb"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    value={newUserForm.role}
                    onChange={e => setNewUserForm({...newUserForm, role: e.target.value as any})}
                    className="form-input"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={newUserForm.approved}
                      onChange={e => setNewUserForm({...newUserForm, approved: e.target.checked})}
                      className="rounded border-gray-600 bg-dark-gray text-accent-gold focus:ring-accent-gold"
                    />
                    <span className="text-sm text-gray-300">User is approved</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={newUserForm.sendInvite}
                      onChange={e => setNewUserForm({...newUserForm, sendInvite: e.target.checked})}
                      className="rounded border-gray-600 bg-dark-gray text-accent-gold focus:ring-accent-gold"
                    />
                    <span className="text-sm text-gray-300">Send invitation email</span>
                  </label>
                </div>

                <div className="bg-yellow-900 border border-yellow-700 text-yellow-300 p-3 rounded text-sm">
                  <div className="flex items-center space-x-2 mb-1">
                    <Key className="w-4 h-4" />
                    <span className="font-medium">Password Information</span>
                  </div>
                  <p>A temporary password will be generated automatically. The user will need to reset their password on first login.</p>
                </div>
              </div>
              <div className="p-6 border-t border-gray-700 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 border border-gray-600 text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  disabled={addingUser}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  disabled={addingUser || !newUserForm.email}
                  className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                >
                  {addingUser ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Adding User...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Add User</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingUserId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-gray border border-gray-700 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-primary-white">Edit User</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={e => setEditForm({...editForm, email: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={e => setEditForm({...editForm, phone: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editForm.location || ''}
                    onChange={e => setEditForm({...editForm, location: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Approval Status
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={editForm.approved || false}
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
                    value={editForm.role || 'user'}
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
  )
}