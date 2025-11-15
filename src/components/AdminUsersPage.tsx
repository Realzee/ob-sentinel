'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Filter, User, Shield, CheckCircle, XCircle, Edit, Trash2, MoreVertical } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  name: string | null
  role: 'admin' | 'moderator' | 'user'
  approved: boolean
  last_login: string | null
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // FIXED: Fetch users with proper error handling
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setUsers(data || [])
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  // FIXED: Filter users with accessibility
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'approved' && user.approved) ||
      (statusFilter === 'pending' && !user.approved)

    return matchesSearch && matchesRole && matchesStatus
  })

  // FIXED: Update user role with proper error handling
  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole as any } : user
      ))
    } catch (error) {
      console.error('Error updating user role:', error)
      alert('Failed to update user role')
    }
  }

  // FIXED: Toggle user approval with proper error handling
  const toggleUserApproval = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ approved: !currentStatus })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(user => 
        user.id === userId ? { ...user, approved: !currentStatus } : user
      ))
    } catch (error) {
      console.error('Error updating user approval:', error)
      alert('Failed to update user approval status')
    }
  }

  // FIXED: Format date function
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
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

  return (
    <div className="min-h-screen bg-dark-gray py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary-white mb-2">User Management</h1>
          <p className="text-gray-400">Manage user accounts, roles, and approvals</p>
        </div>

        {/* Filters and Search */}
        <div className="card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Input - FIXED: Added proper label */}
            <div className="md:col-span-2">
              <label htmlFor="user-search" className="block text-sm font-medium text-gray-300 mb-2">
                Search Users
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  id="user-search"
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10 w-full"
                  aria-describedby="user-search-description"
                />
              </div>
              <p id="user-search-description" className="text-xs text-gray-400 mt-1">
                Search by user name or email address
              </p>
            </div>

            {/* Role Filter - FIXED: Added proper label */}
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

            {/* Status Filter - FIXED: Added proper label */}
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
                  <th scope="col" className="py-3 px-4 text-left text-sm font-medium text-gray-300">
                    User
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
                  <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/50">
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
                    <td className="py-4 px-4">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        className="form-input text-sm"
                        aria-label={`Change role for ${user.name || user.email}`}
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => toggleUserApproval(user.id, user.approved)}
                        className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                          user.approved
                            ? 'bg-green-900 text-green-300 hover:bg-green-800'
                            : 'bg-yellow-900 text-yellow-300 hover:bg-yellow-800'
                        }`}
                        aria-label={user.approved ? `Revoke approval for ${user.name || user.email}` : `Approve ${user.name || user.email}`}
                      >
                        {user.approved ? (
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
                    <td className="py-4 px-4 text-gray-300">
                      {user.last_login ? formatDate(user.last_login) : 'Never'}
                    </td>
                    <td className="py-4 px-4 text-gray-300">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        {/* FIXED: Action buttons with proper labels */}
                        <button
                          onClick={() => {/* Edit functionality */}}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                          title="Edit user"
                          aria-label={`Edit ${user.name || user.email}`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {/* Delete functionality */}}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded transition-colors"
                          title="Delete user"
                          aria-label={`Delete ${user.name || user.email}`}
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
              <div className="text-center py-8 text-gray-500">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'No users found matching your filters.'
                  : 'No users found.'
                }
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}