
// components/AdminUsersPage.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, getOnlineUsers, updateUserPresence } from '@/lib/supabase'
import { Users, Shield, CheckCircle, XCircle, Edit, Save, X, User, Clock, Search, Filter, Wifi, WifiOff, Mail, Phone, MapPin, Calendar, Trash2, AlertTriangle, Eye, Ban, CheckSquare, Square, Plus, Key, RefreshCw } from 'lucide-react'

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

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Loading skeleton components (same as before)
function UserTableSkeleton() {
  return (
    <div className="card p-6">
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 animate-pulse">
            <div className="w-5 h-5 bg-gray-700 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-3 bg-gray-800 rounded w-1/2"></div>
            </div>
            <div className="h-6 bg-gray-700 rounded w-20"></div>
            <div className="h-6 bg-gray-700 rounded w-16"></div>
            <div className="h-6 bg-gray-700 rounded w-24"></div>
            <div className="h-8 bg-gray-700 rounded w-24"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function UserCardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card p-6 animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-700 rounded w-32"></div>
                <div className="h-3 bg-gray-800 rounded w-24"></div>
              </div>
            </div>
            <div className="w-5 h-5 bg-gray-700 rounded"></div>
          </div>
          <div className="space-y-3 mb-4">
            <div className="flex justify-between">
              <div className="h-3 bg-gray-800 rounded w-16"></div>
              <div className="h-6 bg-gray-700 rounded w-20"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-3 bg-gray-800 rounded w-12"></div>
              <div className="h-6 bg-gray-700 rounded w-16"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-3 bg-gray-800 rounded w-16"></div>
              <div className="h-6 bg-gray-700 rounded w-12"></div>
            </div>
          </div>
          <div className="flex space-x-2">
            <div className="flex-1 h-8 bg-gray-700 rounded"></div>
            <div className="w-20 h-8 bg-gray-700 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
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
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [accessChecked, setAccessChecked] = useState(false)
  const [hasAdminAccess, setHasAdminAccess] = useState(false)

  const [newUserForm, setNewUserForm] = useState<NewUserForm>({
    email: '',
    name: '',
    phone: '',
    location: '',
    role: 'user',
    approved: true,
    sendInvite: true
  })

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Simple password generator
  const generateTempPassword = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }, [])

  // Memoized stats calculation
  const stats = useMemo(() => {
    const onlineUserIds = new Set(
      onlineUsers
        .filter(ou => {
          const lastSeen = new Date(ou.last_seen)
          return (Date.now() - lastSeen.getTime()) < 2 * 60 * 1000
        })
        .map(ou => ou.user_id)
    )

    return {
      total: users.length,
      approved: users.filter(u => u.approved).length,
      pending: users.filter(u => !u.approved).length,
      online: users.filter(u => onlineUserIds.has(u.id)).length,
      admins: users.filter(u => u.role === 'admin').length,
      moderators: users.filter(u => u.role === 'moderator').length,
      regular: users.filter(u => u.role === 'user').length
    }
  }, [users, onlineUsers])

  // Memoized filtered users
  const filteredUsers = useMemo(() => {
    const onlineUserIds = new Set(
      onlineUsers
        .filter(ou => {
          const lastSeen = new Date(ou.last_seen)
          return (Date.now() - lastSeen.getTime()) < 2 * 60 * 1000
        })
        .map(ou => ou.user_id)
    )

    return users.filter(user => {
      const matchesSearch = 
        user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.phone?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.location?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      
      const matchesRole = filterRole === 'all' || user.role === filterRole
      const matchesApproved = filterApproved === 'all' || 
        (filterApproved === 'approved' && user.approved) ||
        (filterApproved === 'pending' && !user.approved)
      
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'online' && onlineUserIds.has(user.id)) ||
        (filterStatus === 'offline' && !onlineUserIds.has(user.id))
      
      return matchesSearch && matchesRole && matchesApproved && matchesStatus
    })
  }, [users, debouncedSearchTerm, filterRole, filterApproved, filterStatus, onlineUsers])

  // Quick admin access check - only check role, don't update last login immediately
  const checkAdminAccess = useCallback(async () => {
    try {
      console.time('adminAccessCheck')
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setAccessChecked(true)
        setHasAdminAccess(false)
        return
      }

      setCurrentUser(user)

      // Quick role check without updating last login
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        setAccessChecked(true)
        setHasAdminAccess(false)
        return
      }

      const isAdminOrModerator = profile.role === 'admin' || profile.role === 'moderator'
      setHasAdminAccess(isAdminOrModerator)
      setAccessChecked(true)

      if (isAdminOrModerator) {
        // Now load the actual data
        await fetchUsers()
        await updateUserLastLogin(user.id)
        startPresenceUpdates()
      }
      
    } catch (error) {
      console.error('Error checking admin access:', error)
      setAccessChecked(true)
      setHasAdminAccess(false)
    } finally {
      console.timeEnd('adminAccessCheck')
    }
  }, [])

  // Optimized fetch users
  const fetchUsers = useCallback(async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      
      console.time('fetchUsers')
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setUsers(profiles || [])
      setLastRefresh(new Date())
      
    } catch (error: any) {
      console.error('Error fetching users:', error)
      setError(error.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
      console.timeEnd('fetchUsers')
    }
  }, [])

  // Update user's last login time
  const updateUserLastLogin = useCallback(async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        console.error('Error updating last login:', error)
        return { error }
      }
      
      return { success: true }
    } catch (error) {
      console.error('Error updating last login:', error)
      return { error }
    }
  }, [])

  const startPresenceUpdates = useCallback(async () => {
    if (!currentUser) return

    // Update presence every 2 minutes instead of 1
    const presenceInterval = setInterval(async () => {
      await updateUserPresence(currentUser.id)
    }, 120000)

    // Fetch online users every 2 minutes instead of 1
    const fetchInterval = setInterval(async () => {
      try {
        const users = await getOnlineUsers()
        setOnlineUsers(users)
      } catch (error) {
        console.error('Error fetching online users:', error)
      }
    }, 120000)

    // Initial load
    const onlineUsers = await getOnlineUsers()
    setOnlineUsers(onlineUsers)

    return () => {
      clearInterval(presenceInterval)
      clearInterval(fetchInterval)
    }
  }, [currentUser])

  // Add new user function
  const handleAddUser = useCallback(async () => {
    if (!newUserForm.email) {
      setError('Email is required')
      return
    }

    setAddingUser(true)
    setError('')

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUserForm)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
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
      await fetchUsers(false)
      
    } catch (error: any) {
      console.error('Error adding user:', error)
      setError(error.message || 'Failed to add user')
    } finally {
      setAddingUser(false)
    }
  }, [newUserForm, fetchUsers])

  const handleEdit = useCallback((user: UserProfile) => {
    setEditingUserId(user.id)
    setEditForm({ 
      name: user.name || '',
      email: user.email,
      approved: user.approved,
      role: user.role,
      phone: user.phone || '',
      location: user.location || ''
    })
  }, [])

  const handleSave = useCallback(async (userId: string) => {
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
      await fetchUsers(false)
      setEditingUserId(null)
      setEditForm({})
      setSuccess('User updated successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message)
    }
  }, [editForm, fetchUsers])

  const handleCancel = useCallback(() => {
    setEditingUserId(null)
    setEditForm({})
  }, [])

  const handleDeleteUser = useCallback(async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      // Optimistic update - remove from local state immediately
      setUsers(prev => prev.filter(user => user.id !== userId))
      
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error

      setSuccess('User deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message)
      // Refresh on error to get correct state
      await fetchUsers(false)
    }
  }, [fetchUsers])

  const handleBulkAction = useCallback(async () => {
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
          
          // Optimistic update
          setUsers(prev => prev.filter(user => !selectedUsers.includes(user.id)))
          
          const { error: deleteError } = await supabase
            .from('profiles')
            .delete()
            .in('id', selectedUsers)
            
          if (deleteError) throw deleteError
          
          setSelectedUsers([])
          setSuccess(`${selectedUsers.length} users deleted successfully`)
          setTimeout(() => setSuccess(''), 3000)
          return
        default:
          return
      }

      // Optimistic update for other actions
      setUsers(prev => prev.map(user => 
        selectedUsers.includes(user.id) ? { ...user, ...updates } : user
      ))

      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedUsers)

      if (error) throw error

      setSelectedUsers([])
      setBulkAction('')
      setSuccess(`Bulk action completed for ${selectedUsers.length} users`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message)
      // Refresh on error
      await fetchUsers(false)
    }
  }, [bulkAction, selectedUsers, fetchUsers])

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }, [])

  const selectAllUsers = useCallback(() => {
    setSelectedUsers(
      selectedUsers.length === filteredUsers.length 
        ? [] 
        : filteredUsers.map(user => user.id)
    )
  }, [selectedUsers.length, filteredUsers])

  const getOnlineStatus = useCallback((userId: string) => {
    const onlineUser = onlineUsers.find(u => u.user_id === userId)
    if (onlineUser) {
      const lastSeen = new Date(onlineUser.last_seen)
      const now = new Date()
      const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / 60000)
      return diffMinutes < 2 ? 'online' : `active ${diffMinutes}m ago`
    }
    return 'offline'
  }, [onlineUsers])

  const isUserOnline = useCallback((userId: string) => {
    const status = getOnlineStatus(userId)
    return status === 'online'
  }, [getOnlineStatus])

  const handleRefresh = useCallback(async () => {
    await fetchUsers(false)
  }, [fetchUsers])

  // Initial admin access check - much faster
  useEffect(() => {
    checkAdminAccess()
  }, [checkAdminAccess])

  // Real-time subscriptions for immediate updates (only when admin)
  useEffect(() => {
    if (!hasAdminAccess || !currentUser) return

    console.log('🔔 Setting up real-time subscriptions...')

    const channel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'profiles'
        },
        (payload) => {
          console.log('Profile change detected:', payload.eventType)
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            fetchUsers(false)
          } else if (payload.eventType === 'UPDATE') {
            // For updates, we can update the specific user locally
            setUsers(prev => prev.map(user => 
              user.id === payload.new.id ? { ...user, ...payload.new } : user
            ))
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [hasAdminAccess, currentUser, fetchUsers])

  // Auto-clear messages
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('')
        setSuccess('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  // Show loading while checking access
  if (!accessChecked) {
    return (
      <div className="min-h-screen bg-dark-gray p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-gold mx-auto mb-4"></div>
            <p className="text-gray-400">Checking admin access...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show unauthorized if no admin access
  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-dark-gray p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="bg-red-900 border border-red-700 text-red-300 px-6 py-4 rounded-lg max-w-md mx-auto">
              <Shield className="w-12 h-12 mx-auto mb-4 text-red-400" />
              <h2 className="text-xl font-bold mb-2">Access Denied</h2>
              <p className="text-gray-300">
                You don't have permission to access the admin panel. 
                Please contact an administrator if you believe this is an error.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show loading for initial data load
  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-dark-gray p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-gold mx-auto mb-4"></div>
            <p className="text-gray-400">Loading user data...</p>
          </div>
        </div>
      </div>
    )
  }

  // Main admin panel content
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
              <p className="text-gray-400">
                {refreshing ? 'Refreshing...' : `Last refresh: ${lastRefresh.toLocaleTimeString()}`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              {stats.online} users online
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded mb-6 animate-in slide-in-from-top">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-red-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded mb-6 animate-in slide-in-from-top">
            <div className="flex items-center justify-between">
              <span>{success}</span>
              <button onClick={() => setSuccess('')} className="text-green-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards - Only show when not loading or when we have data */}
        {!loading || users.length > 0 ? (
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
        ) : null}

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
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-accent-blue text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Users Table or Cards */}
        {loading && users.length === 0 ? (
          viewMode === 'table' ? <UserTableSkeleton /> : <UserCardSkeleton />
        ) : (
          viewMode === 'table' ? (
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
                    {filteredUsers.map((user) => (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((user) => (
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
          )
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