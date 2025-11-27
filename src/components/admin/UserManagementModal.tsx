// components/admin/UserManagementModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { authAPI, AuthUser, UserRole, UserStatus, supabase } from '@/lib/supabase';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

export default function UserManagementModal({ isOpen, onClose, currentUser }: UserManagementModalProps) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  
  // Enhanced filtering
  const [filters, setFilters] = useState({
    role: '',
    status: ''
  });

  // User selection for bulk operations
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Confirmation modals
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  
  // Add user form state
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  
  // Edit user form state
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('user');
  const [editUserStatus, setEditUserStatus] = useState<UserStatus>('active');
  const [editUserPassword, setEditUserPassword] = useState('');
  
  const [addingUser, setAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState(false);

  // Error state
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Load users function
  const loadUsers = async () => {
  try {
    setLoading(true);
    
    console.log('🔍 Loading users via API route...');
    
    // Use the API method that goes through our route
    const usersData = await authAPI.getAllUsers();
    
    if (!usersData) {
      throw new Error('Failed to load users - service key may be missing');
    }
    
    setUsers(usersData || []);
    
    console.log('✅ Loaded users:', usersData?.length);
    
  } catch (error) {
    console.error('❌ Error loading users:', error);
    
    // More detailed error handling
    if (error instanceof Error) {
      if (error.message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        showError('Admin access not configured. Please check environment variables.');
      } else if (error.message.includes('Admin access required')) {
        showError('You need admin privileges to view users.');
      } else if (error.message.includes('Authentication required')) {
        showError('Please log in to view users.');
      } else {
        showError('Failed to load users: ' + error.message);
      }
    } else {
      showError('Failed to load users. Please try again.');
    }
    
    // Fallback: show current user only
    try {
      const { data: { user: currentAuthUser } } = await supabase.auth.getUser();
      if (currentAuthUser) {
        const fallbackUser: AuthUser = {
          id: currentAuthUser.id,
          email: currentAuthUser.email || '',
          user_metadata: currentAuthUser.user_metadata || {},
          created_at: currentAuthUser.created_at,
          updated_at: currentAuthUser.updated_at || currentAuthUser.created_at,
          last_sign_in_at: currentAuthUser.last_sign_in_at || null,
          role: (currentAuthUser.user_metadata?.role as UserRole) || 'user',
          status: 'active'
        };
        setUsers([fallbackUser]);
      } else {
        setUsers([]);
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      setUsers([]);
    }
  } finally {
    setLoading(false);
  }
};
  // Real-time updates
  useEffect(() => {
    if (!isOpen) return;

    loadUsers();

    // Poll for user status updates every 30 seconds
    const interval = setInterval(() => {
      loadUsers();
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Modal helper functions
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const showConfirmation = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmModal(true);
  };

  // Update user role via Auth API
  const handleRoleUpdate = async (userId: string, newRole: string) => {
    const validRoles: UserRole[] = ['admin', 'moderator', 'controller', 'user'];
    if (!validRoles.includes(newRole as UserRole)) {
      console.error('Invalid role:', newRole);
      return;
    }

    try {
      setUpdating(userId);
      
      const success = await authAPI.updateUserRole(userId, newRole as UserRole);
      
      if (success) {
        // Update local state
        setUsers(prev => prev.map(u => 
          u.id === userId 
            ? { 
                ...u, 
                user_metadata: { ...u.user_metadata, role: newRole as UserRole },
                role: newRole as UserRole
              }
            : u
        ));
        
        showSuccess('User role updated successfully!');
      } else {
        throw new Error('Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      showError('Error updating user role. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  // Update user status via Auth API
  const handleStatusUpdate = async (userId: string, newStatus: string) => {
    const validStatuses: UserStatus[] = ['pending', 'active', 'suspended'];
    if (!validStatuses.includes(newStatus as UserStatus)) {
      console.error('Invalid status:', newStatus);
      return;
    }

    try {
      setUpdating(userId);
      
      const success = await authAPI.updateUserStatus(userId, newStatus as UserStatus);
      
      if (success) {
        // Update local state
        setUsers(prev => prev.map(u => 
          u.id === userId 
            ? { ...u, status: newStatus as UserStatus }
            : u
        ));
        
        showSuccess(`User status updated to ${newStatus}!`);
      } else {
        throw new Error('Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      showError('Error updating user status. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  // Suspend user via Auth API
  const handleDeleteUser = async (userId: string, userEmail: string) => {
    showConfirmation(
      `Are you sure you want to suspend user ${userEmail}? They will not be able to access the system.`,
      async () => {
        try {
          setUpdating(userId);
          
          const success = await authAPI.updateUserStatus(userId, 'suspended');
          
          if (success) {
            // Update local state
            setUsers(prev => prev.map(u => 
              u.id === userId 
                ? { ...u, status: 'suspended' as UserStatus }
                : u
            ));
            
            showSuccess('User suspended successfully');
          } else {
            throw new Error('Failed to suspend user');
          }
        } catch (error) {
          console.error('Error suspending user:', error);
          showError('Error suspending user. Please try again.');
        } finally {
          setUpdating(null);
        }
      }
    );
  };

  // Enhanced user status with timestamp
  const getUserStatusWithTimestamp = (user: AuthUser) => {
    const isOnline = user.status === 'active';
    const lastSeen = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
    
    return (
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
        }`}></div>
        <div className="text-xs">
          <div className="text-gray-400">
            {user.status === 'active' ? 'Online' : 
             user.status === 'pending' ? 'Pending Approval' :
             user.status === 'suspended' ? 'Suspended' : 'Offline'}
          </div>
          {lastSeen && (
            <div className="text-gray-500">
              Last seen: {lastSeen.toLocaleDateString()} {lastSeen.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Enhanced filtering
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.user_metadata?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.user_metadata?.role || 'user').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !filters.role || (user.user_metadata?.role || 'user') === filters.role;
    const matchesStatus = !filters.status || user.status === filters.status;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Bulk role update via Auth API
  const handleBulkRoleUpdate = async (newRole: UserRole) => {
    if (selectedUsers.length === 0) return;

    try {
      // Update each user
      for (const userId of selectedUsers) {
        await authAPI.updateUserRole(userId, newRole);
      }

      // Update local state
      setUsers(prev => prev.map(u => 
        selectedUsers.includes(u.id) 
          ? { 
              ...u, 
              user_metadata: { ...u.user_metadata, role: newRole },
              role: newRole
            }
          : u
      ));
      
      setSelectedUsers([]);
      showSuccess(`Updated ${selectedUsers.length} users to ${newRole} role`);
    } catch (error) {
      console.error('Error in bulk role update:', error);
      showError('Error updating users. Please try again.');
    }
  };

  const handleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  // Create user via Auth API
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserEmail || !newUserPassword) {
      showError('Please fill in all required fields');
      return;
    }

    try {
      setAddingUser(true);
      
      const newUser = await authAPI.createUser({
        email: newUserEmail,
        password: newUserPassword,
        full_name: newUserName || '',
        role: newUserRole
      });

      if (newUser) {
        // Refresh users to get updated data
        await loadUsers();
      }

      // Reset form
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserRole('user');
      setIsAddUserModalOpen(false);
      
      showSuccess('User created successfully!');
    } catch (error: any) {
      console.error('Error creating user:', error);
      showError(error.message || 'Error creating user. Please try again.');
    } finally {
      setAddingUser(false);
    }
  };

  const handleEditUser = (user: AuthUser) => {
  setSelectedUser(user);
  setEditUserName(user.user_metadata?.full_name || '');
  setEditUserRole((user.user_metadata?.role as UserRole) || 'user');
  setEditUserStatus(user.status || 'active'); // This should work now since status is UserStatus
  setEditUserPassword('');
  setIsEditUserModalOpen(true);
};

  // Update user via Auth API
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;

    try {
      setEditingUser(true);

      // Update role if changed
      if (editUserRole !== selectedUser.user_metadata?.role) {
        await authAPI.updateUserRole(selectedUser.id, editUserRole);
      }

      // Update status if changed
      if (editUserStatus !== selectedUser.status) {
        await authAPI.updateUserStatus(selectedUser.id, editUserStatus);
      }

      // Refresh users to get updated data
      await loadUsers();

      // Reset form
      setSelectedUser(null);
      setEditUserName('');
      setEditUserRole('user');
      setEditUserStatus('active');
      setEditUserPassword('');
      setIsEditUserModalOpen(false);
      
      showSuccess('User updated successfully!');
    } catch (error: any) {
      console.error('Error updating user:', error);
      showError(error.message || 'Error updating user. Please try again.');
    } finally {
      setEditingUser(false);
    }
  };

  // Approve user by updating status via Auth API
  const handleApproveUser = async (userId: string) => {
    try {
      setUpdating(userId);
      
      const success = await authAPI.updateUserStatus(userId, 'active');
      
      if (success) {
        // Update local state
        setUsers(prev => prev.map(u => 
          u.id === userId 
            ? { ...u, status: 'active' as UserStatus }
            : u
        ));
        
        showSuccess('User approved successfully!');
      } else {
        throw new Error('Failed to approve user');
      }
    } catch (error) {
      console.error('Error approving user:', error);
      showError('Error approving user. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  // Reactivate user by updating status via Auth API
  const handleReactivateUser = async (userId: string) => {
    showConfirmation(
      'Are you sure you want to reactivate this user?',
      async () => {
        try {
          setUpdating(userId);
          
          const success = await authAPI.updateUserStatus(userId, 'active');
          
          if (success) {
            // Update local state
            setUsers(prev => prev.map(u => 
              u.id === userId 
                ? { ...u, status: 'active' as UserStatus }
                : u
            ));
            
            showSuccess('User reactivated successfully');
          } else {
            throw new Error('Failed to reactivate user');
          }
        } catch (error) {
          console.error('Error reactivating user:', error);
          showError('Error reactivating user. Please try again.');
        } finally {
          setUpdating(null);
        }
      }
    );
  };

  // Helper function to get user display name
  const getUserDisplayName = (user: AuthUser) => {
    return user.user_metadata?.full_name || user.email.split('@')[0] || 'No Name';
  };

  // Helper function to get user role
  const getUserRole = (user: AuthUser) => {
    return user.user_metadata?.role || 'user';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main User Management Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          {/* Background overlay */}
          <div 
            className="fixed inset-0 transition-opacity bg-black bg-opacity-75" 
            onClick={onClose}
          ></div>

          {/* Modal panel */}
          <div className="relative inline-block w-full max-w-6xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl sm:my-8 sm:align-middle sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">User Management</h2>
                <p className="text-gray-400 mt-1">Manage user roles, status, and permissions</p>
                <p className="text-green-500 text-sm mt-1">
                  Admin Access: Viewing all users from Supabase Auth
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add User</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              <input
                type="text"
                id="user-search"
                name="user-search"
                placeholder="Search users by email, name, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
              
              <div className="flex flex-wrap gap-4">
                <select
                  id="role-filter"
                  name="role-filter"
                  value={filters.role}
                  onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                  <option value="controller">Controller</option>
                  <option value="user">User</option>
                </select>

                <select
                  id="status-filter"
                  name="status-filter"
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>

                {/* Bulk Actions */}
                {selectedUsers.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">
                      {selectedUsers.length} selected
                    </span>
                    <select
                      id="bulk-role-action"
                      name="bulk-role-action"
                      onChange={(e) => handleBulkRoleUpdate(e.target.value as UserRole)}
                      className="px-3 py-1 bg-blue-600 border border-blue-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Bulk Role</option>
                      <option value="admin">Admin</option>
                      <option value="moderator">Moderator</option>
                      <option value="controller">Controller</option>
                      <option value="user">User</option>
                    </select>
                  </div>
                )}
              </div>
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
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            id="select-all-users"
                            name="select-all-users"
                            checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                          />
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Joined</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              id={`user-select-${user.id}`}
                              name={`user-select-${user.id}`}
                              checked={selectedUsers.includes(user.id)}
                              onChange={() => handleUserSelection(user.id)}
                              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-white">
                                {getUserDisplayName(user)}
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
                            {getUserStatusWithTimestamp(user)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <select
                                id={`user-role-${user.id}`}
                                name={`user-role-${user.id}`}
                                value={getUserRole(user)}
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEditUser(user)}
                                disabled={updating === user.id}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs rounded transition-colors"
                              >
                                Edit
                              </button>
                              {user.status === 'pending' && user.id !== currentUser.id && (
                                <button
                                  onClick={() => handleApproveUser(user.id)}
                                  disabled={updating === user.id}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs rounded transition-colors"
                                >
                                  Approve
                                </button>
                              )}
                              {user.status === 'suspended' && user.id !== currentUser.id && (
                                <button
                                  onClick={() => handleReactivateUser(user.id)}
                                  disabled={updating === user.id}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs rounded transition-colors"
                                >
                                  Reactivate
                                </button>
                              )}
                              {user.id !== currentUser.id && user.status !== 'suspended' && (
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.email)}
                                  disabled={updating === user.id}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs rounded transition-colors"
                                >
                                  Suspend
                                </button>
                              )}
                            </div>
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
                <div className="text-2xl font-bold text-white">{users.filter(u => getUserRole(u) === 'admin').length}</div>
                <div className="text-sm text-gray-400">Admins</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="text-2xl font-bold text-white">{users.filter(u => getUserRole(u) === 'moderator').length}</div>
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

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity bg-black bg-opacity-75" 
              onClick={() => setIsAddUserModalOpen(false)}
            ></div>
            
            <div className="relative inline-block w-full max-w-md px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl sm:my-8 sm:align-middle sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Add New User</h3>
                <button
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label htmlFor="new-user-email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="new-user-email"
                    name="new-user-email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="user@example.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="new-user-password" className="block text-sm font-medium text-gray-300 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    id="new-user-password"
                    name="new-user-password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter password"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label htmlFor="new-user-name" className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="new-user-name"
                    name="new-user-name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="new-user-role" className="block text-sm font-medium text-gray-300 mb-2">
                    Role *
                  </label>
                  <select
                    id="new-user-role"
                    name="new-user-role"
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                    <option value="controller">Controller</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddUserModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingUser}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    {addingUser ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Create User</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditUserModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity bg-black bg-opacity-75" 
              onClick={() => setIsEditUserModalOpen(false)}
            ></div>
            
            <div className="relative inline-block w-full max-w-md px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl sm:my-8 sm:align-middle sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Edit User</h3>
                <button
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label htmlFor="edit-user-email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="edit-user-email"
                    name="edit-user-email"
                    value={selectedUser.email}
                    disabled
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label htmlFor="edit-user-name" className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="edit-user-name"
                    name="edit-user-name"
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="edit-user-role" className="block text-sm font-medium text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    id="edit-user-role"
                    name="edit-user-role"
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                    <option value="controller">Controller</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-user-status" className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
          id="edit-user-status"
          name="edit-user-status"
          value={editUserStatus}
          onChange={(e) => setEditUserStatus(e.target.value as UserStatus)} 
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        >
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
                </div>

                <div>
                  <label htmlFor="edit-user-password" className="block text-sm font-medium text-gray-300 mb-2">
                    New Password (Optional)
                  </label>
                  <input
                    type="password"
                    id="edit-user-password"
                    name="edit-user-password"
                    value={editUserPassword}
                    onChange={(e) => setEditUserPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Leave blank to keep current password"
                    minLength={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters - Leave empty to keep current password</p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditUserModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editingUser}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    {editingUser ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Update User</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Success Confirmation Modal */}
<ConfirmationModal
  isOpen={showSuccessModal}
  onClose={() => setShowSuccessModal(false)}
  title="Success"
  message={successMessage}
  variant="success" // Changed from 'type' to 'variant'
  confirmText="OK"
  showCancel={false}
/>

{/* Error Modal */}
<ConfirmationModal
  isOpen={showErrorModal}
  onClose={() => setShowErrorModal(false)}
  title="Error"
  message={errorMessage}
  variant="error" // Changed from 'type' to 'variant'
  confirmText="OK"
  showCancel={false}
/>

{/* Confirmation Modal for Actions */}
<ConfirmationModal
  isOpen={showConfirmModal}
  onClose={() => setShowConfirmModal(false)}
  onConfirm={() => {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirmModal(false);
  }}
  title="Confirm Action"
  message={confirmMessage}
  variant="warning" // Changed from 'type' to 'variant'
  confirmText="Confirm"
  cancelText="Cancel"
/>
    </>
  );
}