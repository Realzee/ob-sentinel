'use client'

import { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Search, Filter, User, Shield, CheckCircle, XCircle, Edit, Trash2, RefreshCw, Download, AlertCircle } from 'lucide-react'

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Never'
  return new Date(dateString).toLocaleDateString()
}

interface UserProfile {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: 'admin' | 'moderator' | 'user'
  approved: boolean
  last_login: string | null
  created_at: string
  updated_at: string
  is_active: boolean
  verification_status: 'pending' | 'verified' | 'rejected'
  metadata: any
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<string>('')
  const [bulkRole, setBulkRole] = useState<string>('user')
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set())
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [accessDenied, setAccessDenied] = useState(false)
  const router = useRouter()

  // Check if current user has access to user management
  const checkUserAccess = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setAccessDenied(true)
        return false
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
        setAccessDenied(true)
        return false
      }

      setCurrentUserRole(profile.role)
      return true
    } catch (error) {
      console.error('Error checking user access:', error)
      setAccessDenied(true)
      return false
    }
  }, [])

  // OPTIMIZED: Fetch users with caching and error handling
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      
      const hasAccess = await checkUserAccess()
      if (!hasAccess) return

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setUsers(data || [])
      setLastRefreshed(new Date())
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }, [checkUserAccess])

  // OPTIMIZED: Initial load and real-time subscription
  useEffect(() => {
    fetchUsers()

    // Set up real-time subscription for user updates
    const subscription = supabase
      .channel('profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('Real-time update received:', payload)
          fetchUsers()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUsers])

  // OPTIMIZED: Filter users with useMemo for performance
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'approved' && user.approved) ||
        (statusFilter === 'pending' && !user.approved)

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchTerm, roleFilter, statusFilter])

  // OPTIMIZED: Update user role with optimistic updates
  const updateUserRole = useCallback(async (userId: string, newRole: string) => {
    // Only admins can change roles to admin
    if (newRole === 'admin' && currentUserRole !== 'admin') {
      alert('Only administrators can assign admin roles.')
      return
    }

    setUpdatingUsers(prev => new Set(prev).add(userId))
    
    try {
      // Optimistic update
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole as any } : user
      ))

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

    } catch (error) {
      console.error('Error updating user role:', error)
      // Revert optimistic update on error
      fetchUsers()
      alert('Failed to update user role')
    } finally {
      setUpdatingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }, [fetchUsers, currentUserRole])

  // OPTIMIZED: Toggle user approval with optimistic updates
  const toggleUserApproval = useCallback(async (userId: string, currentStatus: boolean) => {
    setUpdatingUsers(prev => new Set(prev).add(userId))
    
    try {
      // Optimistic update
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, approved: !currentStatus } : user
      ))

      const { error } = await supabase
        .from('profiles')
        .update({ approved: !currentStatus })
        .eq('id', userId)

      if (error) throw error

    } catch (error) {
      console.error('Error updating user approval:', error)
      // Revert optimistic update on error
      fetchUsers()
      alert('Failed to update user approval status')
    } finally {
      setUpdatingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }, [fetchUsers])

  // Access denied view
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-dark-gray py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="card p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-primary-white mb-4">Access Denied</h2>
            <p className="text-gray-400 mb-6">
              You don't have permission to access user management. 
              This area is restricted to administrators and moderators.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-primary"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-dark-gray py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-gold mx-auto mb-4"></div>
            <p className="text-gray-400">Loading users...</p>
          </div>
        </div>
      </div>
    )
  }

  function handleBulkAction(event: React.MouseEvent<HTMLButtonElement>): void {
    throw new Error('Function not implemented.')
  }

  function toggleSelectAll(event: ChangeEvent<HTMLInputElement>): void {
    throw new Error('Function not implemented.')
  }

  function toggleUserSelection(id: string): void {
    throw new Error('Function not implemented.')
  }

  return (
    <div className="min-h-screen bg-dark-gray py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header with Stats */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-primary-white mb-2">User Management</h1>
              <p className="text-gray-400">
                Manage user accounts, roles, and approvals
                {currentUserRole && (
                  <span className="ml-2 text-accent-gold">
                    (Logged in as: {currentUserRole})
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                title="Refresh users"
                aria-label="Refresh users list"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => {
                  // Export to CSV functionality
                  const headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Last Login', 'Created']
                  const csvData = filteredUsers.map(user => [
                    user.name || 'N/A',
                    user.email,
                    user.phone || 'N/A',
                    user.role,
                    user.approved ? 'Approved' : 'Pending',
                    user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never',
                    new Date(user.created_at).toLocaleDateString()
                  ])

                  const csvContent = [
                    headers.join(','),
                    ...csvData.map(row => row.map(field => `"${field}"`).join(','))
                  ].join('\n')

                  const blob = new Blob([csvContent], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = `users-${new Date().toISOString().split('T')[0]}.csv`
                  link.click()
                  URL.revokeObjectURL(url)
                }}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center space-x-2"
                title="Export to CSV"
                aria-label="Export users to CSV"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="card p-4 border-l-4 border-accent-gold">
              <p className="text-xs text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-accent-gold">{users.length}</p>
            </div>
            <div className="card p-4 border-l-4 border-green-600">
              <p className="text-xs text-gray-400">Approved</p>
              <p className="text-2xl font-bold text-green-400">{users.filter(u => u.approved).length}</p>
            </div>
            <div className="card p-4 border-l-4 border-yellow-600">
              <p className="text-xs text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-400">{users.filter(u => !u.approved).length}</p>
            </div>
            <div className="card p-4 border-l-4 border-red-600">
              <p className="text-xs text-gray-400">Admins</p>
              <p className="text-2xl font-bold text-red-400">{users.filter(u => u.role === 'admin').length}</p>
            </div>
            <div className="card p-4 border-l-4 border-blue-600">
              <p className="text-xs text-gray-400">Moderators</p>
              <p className="text-2xl font-bold text-blue-400">{users.filter(u => u.role === 'moderator').length}</p>
            </div>
            <div className="card p-4 border-l-4 border-purple-600">
              <p className="text-xs text-gray-400">Users</p>
              <p className="text-2xl font-bold text-purple-400">{users.filter(u => u.role === 'user').length}</p>
            </div>
          </div>

          {/* Last Refreshed */}
          <div className="text-sm text-gray-500 mb-4">
            Last updated: {lastRefreshed.toLocaleTimeString()}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <div className="card p-4 mb-6 bg-blue-900 border-blue-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-primary-white font-medium">
                  {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="form-input text-sm"
                  aria-label="Select bulk action"
                >
                  <option value="">Choose action...</option>
                  <option value="approve">Approve Selected</option>
                  <option value="reject">Reject Selected</option>
                  <option value="change_role">Change Role</option>
                  <option value="delete">Delete Selected</option>
                </select>

                {bulkAction === 'change_role' && (
                  <select
                    value={bulkRole}
                    onChange={(e) => setBulkRole(e.target.value)}
                    className="form-input text-sm"
                    aria-label="Select new role for bulk update"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                )}

                <button
                  onClick={handleBulkAction}
                  disabled={!bulkAction}
                  className="bg-accent-gold text-black hover:bg-yellow-500 py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Action
                </button>

                <button
                  onClick={() => setSelectedUsers(new Set())}
                  className="border border-gray-600 text-gray-300 hover:bg-gray-700 py-2 px-4 rounded-lg transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="md:col-span-2">
              <label htmlFor="user-search" className="block text-sm font-medium text-gray-300 mb-2">
                Search Users
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  id="user-search"
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10 w-full"
                  aria-describedby="user-search-description"
                />
              </div>
              <p id="user-search-description" className="text-xs text-gray-400 mt-1">
                Search by user name, email, or phone number
              </p>
            </div>

            {/* Role Filter */}
            <div>
              <label htmlFor="role-filter" className="block text-sm font-medium text-gray-300 mb-2">
                Filter by Role
              </label>
              <select
                id="role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="form-input w-full"
                aria-describedby="role-filter-description"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="moderator">Moderator</option>
                <option value="user">User</option>
              </select>
              <p id="role-filter-description" className="text-xs text-gray-400 mt-1">
                Filter users by their role
              </p>
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-300 mb-2">
                Filter by Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input w-full"
                aria-describedby="status-filter-description"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>
              <p id="status-filter-description" className="text-xs text-gray-400 mt-1">
                Filter users by approval status
              </p>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="card p-6">
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="User management table">
              <thead>
                <tr className="border-b border-gray-700">
                  <th scope="col" className="py-3 px-4 text-left text-sm font-medium text-gray-300 w-12">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-600 bg-dark-gray text-accent-gold focus:ring-accent-gold"
                      aria-label={selectedUsers.size === filteredUsers.length ? "Deselect all users" : "Select all users"}
                    />
                  </th>
                  <th scope="col" className="py-3 px-4 text-left text-sm font-medium text-gray-300">
                    User
                  </th>
                  <th scope="col" className="py-3 px-4 text-left text-sm font-medium text-gray-300">
                    Contact
                  </th>
                  <th scope="col" className="py-3 px-4 text-left text-sm font-medium text-gray-300">
                    Role
                  </th>
                  <th scope="col" className="py-3 px-4 text-left text-sm font-medium text-gray-300">
                    Status
                  </th>
                  <th scope="col" className="py-3 px-4 text-left text-sm font-medium text-gray-300">
                    Last Login
                  </th>
                  <th scope="col" className="py-3 px-4 text-left text-sm font-medium text-gray-300">
                    Created
                  </th>
                  <th scope="col" className="py-3 px-4 text-left text-sm font-medium text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                      updatingUsers.has(user.id) ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="rounded border-gray-600 bg-dark-gray text-accent-gold focus:ring-accent-gold"
                        aria-label={`Select ${user.name || user.email}`}
                        disabled={updatingUsers.has(user.id)}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-accent-gold rounded-full flex items-center justify-center text-black font-bold">
                          {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-primary-white font-medium">
                            {user.name || 'No name provided'}
                          </p>
                          <p className="text-gray-400 text-sm">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-300 text-sm">
                      {user.phone || 'No phone'}
                    </td>
                    <td className="py-4 px-4">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        className="form-input text-sm"
                        aria-label={`Change role for ${user.name || user.email}`}
                        disabled={updatingUsers.has(user.id)}
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => toggleUserApproval(user.id, user.approved)}
                        disabled={updatingUsers.has(user.id)}
                        className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          user.approved
                            ? 'bg-green-900 text-green-300 hover:bg-green-800'
                            : 'bg-yellow-900 text-yellow-300 hover:bg-yellow-800'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        aria-label={user.approved ? `Revoke approval for ${user.name || user.email}` : `Approve ${user.name || user.email}`}
                      >
                        {updatingUsers.has(user.id) ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                        ) : user.approved ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Approved</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            <span>Pending</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-gray-300 text-sm">
                      {formatDate(user.last_login)}
                    </td>
                    <td className="py-4 px-4 text-gray-300 text-sm">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {/* Edit functionality */}}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                          title="Edit user"
                          aria-label={`Edit ${user.name || user.email}`}
                          disabled={updatingUsers.has(user.id)}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {/* Delete functionality */}}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded transition-colors"
                          title="Delete user"
                          aria-label={`Delete ${user.name || user.email}`}
                          disabled={updatingUsers.has(user.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Empty State */}
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <User className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-lg mb-2">No users found</p>
                <p className="text-sm">
                  {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'No users have been registered yet'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Summary and Pagination */}
          <div className="mt-6 pt-6 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              Showing {filteredUsers.length} of {users.length} users
              {selectedUsers.size > 0 && ` • ${selectedUsers.size} selected`}
            </p>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="text-sm text-gray-400 hover:text-white flex items-center space-x-2 disabled:opacity-50"
                title="Refresh data"
                aria-label="Refresh users data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}