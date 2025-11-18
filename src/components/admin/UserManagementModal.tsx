'use client';

import { useState, useEffect } from 'react';
import { authAPI, Profile, UserRole, UserStatus } from '@/lib/supabase';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

export default function UserManagementModal({ isOpen, onClose, currentUser }: UserManagementModalProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await authAPI.getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    // Validate the role against UserRole type
    const validRoles: UserRole[] = ['admin', 'moderator', 'controller', 'user'];
    if (!validRoles.includes(newRole as UserRole)) {
      console.error('Invalid role:', newRole);
      return;
    }

    try {
      setUpdating(userId);
      await authAPI.updateUserRole(userId, { role: newRole as UserRole });
      await loadUsers(); // Reload users to get updated data
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Error updating user role. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const handleStatusUpdate = async (userId: string, newStatus: string) => {
    // Validate the status against UserStatus type
    const validStatuses: UserStatus[] = ['pending', 'active', 'suspended'];
    if (!validStatuses.includes(newStatus as UserStatus)) {
      console.error('Invalid status:', newStatus);
      return;
    }

    try {
      setUpdating(userId);
      await authAPI.updateUserRole(userId, { status: newStatus as UserStatus });
      await loadUsers(); // Reload users to get updated data
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Error updating user status. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper function to get role display name
  const getRoleDisplayName = (role: UserRole) => {
    const roleNames = {
      admin: 'Administrator',
      moderator: 'Moderator',
      controller: 'Controller',
      user: 'User'
    };
    return roleNames[role] || role;
  };

  // Helper function to get status display name
  const getStatusDisplayName = (status: UserStatus) => {
    const statusNames = {
      active: 'Active',
      pending: 'Pending',
      suspended: 'Suspended'
    };
    return statusNames[status] || status;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-black bg-opacity-75" onClick={onClose}></div>

        {/* Modal panel */}
        <div className="relative inline-block w-full max-w-4xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl sm:my-8 sm:align-middle sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">User Management</h2>
              <p className="text-gray-400 mt-1">Manage user roles and status</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search users by email, name, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          {/* Users Table */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {user.full_name || 'No Name'}
                            </div>
                            <div className="text-sm text-gray-400">{user.email}</div>
                            {user.id === currentUser.id && (
                              <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                                Current User
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                              disabled={updating === user.id || user.id === currentUser.id}
                              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="user">User</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                              <option value="controller">Controller</option>
                            </select>
                            {updating === user.id && (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <select
                              value={user.status}
                              onChange={(e) => handleStatusUpdate(user.id, e.target.value)}
                              disabled={updating === user.id || user.id === currentUser.id}
                              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="active">Active</option>
                              <option value="pending">Pending</option>
                              <option value="suspended">Suspended</option>
                            </select>
                            {updating === user.id && (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {user.id === currentUser.id ? (
                            <span className="text-blue-400 font-medium">Current Session</span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredUsers.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-400">No users found</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats and Footer */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-white">{users.filter(u => u.role === 'admin').length}</div>
              <div className="text-sm text-gray-400">Admins</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-white">{users.filter(u => u.role === 'moderator').length}</div>
              <div className="text-sm text-gray-400">Moderators</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-white">{users.filter(u => u.status === 'active').length}</div>
              <div className="text-sm text-gray-400">Active Users</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-white">{users.length}</div>
              <div className="text-sm text-gray-400">Total Users</div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-gray-400">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
            </div>
            <div className="flex space-x-3">
              <button
                onClick={loadUsers}
                disabled={loading}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}