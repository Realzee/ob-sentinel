// components/admin/UserManagementModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { authAPI, AuthUser, UserRole, UserStatus, supabase, companyAPI, Company, getSessionToken } from '@/lib/supabase';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

// Admin emails list for hardcoded admin detection
const ADMIN_EMAILS = [
  'zweli@msn.com',
  'clint@rapid911.co.za', 
  'zwell@msn.com'
];

// Helper function to validate and cast to UserRole
const toUserRole = (role: string | undefined): UserRole => {
  if (!role) return 'user';
  
  const validRoles: UserRole[] = ['admin', 'moderator', 'controller', 'user'];
  const normalizedRole = role.toLowerCase().trim() as UserRole;
  
  if (validRoles.includes(normalizedRole)) {
    return normalizedRole;
  }
  
  return 'user';
};

// And for toUserStatus
const toUserStatus = (status: string): UserStatus => {
  const validStatuses: string[] = ['pending', 'active', 'suspended'];
  const normalizedStatus = status.toLowerCase().trim();
  
  if (validStatuses.includes(normalizedStatus)) {
    return normalizedStatus as UserStatus;
  }
  
  return 'active';
};

// Helper function to get user role consistently
const getUserRole = (user: any): UserRole => {
  if (!user) return 'user';
  
  // Check multiple possible locations for the role
  let role: string | undefined = user.role;
  
  if (!role && user.user_metadata) {
    role = user.user_metadata.role;
  }
  
  // Check if email is in admin list (hardcoded admin detection)
  if (!role && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    role = 'admin';
  }
  
  // Use the helper function to ensure we return a valid UserRole
  return toUserRole(role || 'user');
};

export default function UserManagementModal({ isOpen, onClose, currentUser }: UserManagementModalProps) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'companies'>('users');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    company: ''
  });

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [newUserCompany, setNewUserCompany] = useState('');
  
  const [newCompanyName, setNewCompanyName] = useState('');
  
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('user');
  const [editUserStatus, setEditUserStatus] = useState<UserStatus>('active');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserCompany, setEditUserCompany] = useState('');
  
  const [editCompanyName, setEditCompanyName] = useState('');
  
  const [addingUser, setAddingUser] = useState(false);
  const [addingCompany, setAddingCompany] = useState(false);
  const [editingUser, setEditingUser] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Get current user's role - now returns UserRole type
  const currentUserRole = getUserRole(currentUser);
  const isAdminUser = currentUserRole === 'admin';
  
  // Debug current user
  console.log('🔍 UserManagementModal - Current User:', {
    email: currentUser?.email,
    role: currentUser?.role,
    user_metadata: currentUser?.user_metadata,
    detectedRole: currentUserRole,
    isAdminUser: isAdminUser,
    inAdminList: currentUser?.email ? ADMIN_EMAILS.includes(currentUser.email.toLowerCase()) : false
  });

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

  // Load users function with company filtering
  const loadUsers = async () => {
  try {
    setLoading(true);
    
    console.log('🔍 Loading users via API route...');
    
    // FIX: currentUserRole is now UserRole type, so it matches getAllUsers parameter type
    const usersData = await authAPI.getAllUsers(currentUserRole, currentUser.company_id);
    
    if (usersData && Array.isArray(usersData)) {
      // Properly type the users
      const typedUsers: AuthUser[] = usersData.map(user => {
        // Ensure we always have a string for role
        const roleFromMetadata = user.user_metadata?.role || '';
        const roleFromUser = user.role || '';
        const statusFromUser = user.status || '';
        
        // Convert to string explicitly
        const roleString = String(roleFromUser || roleFromMetadata || 'user');
        const statusString = String(statusFromUser || 'active');
        
        // Use type assertion to handle the type mismatch
        const finalRole = toUserRole(roleString);
        const finalStatus = toUserStatus(statusString);
        
        return {
          ...user,
          user_metadata: {
            ...user.user_metadata,
            role: finalRole
          },
          role: finalRole,
          status: finalStatus
        };
      });
      
      setUsers(typedUsers);
      console.log('✅ Loaded users:', typedUsers.length);
    } else {
      throw new Error('Invalid response from server');
    }
    
  } catch (error: any) {
    console.error('❌ Error loading users:', error);
    showError('Failed to load users: ' + error.message);
  } finally {
    setLoading(false);
  }
};

  // Load companies function with admin check
  const loadCompanies = async () => {
    try {
      setLoading(true);
      const companiesData = await companyAPI.getAllCompanies();
      
      // Filter companies for moderators
      if (currentUserRole === 'moderator' && currentUser.company_id) {
        const userCompany = companiesData.find(company => company.id === currentUser.company_id);
        setCompanies(userCompany ? [userCompany] : []);
      } else {
        setCompanies(companiesData);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
      showError('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  // Update user role
  const handleRoleUpdate = async (userId: string, newRole: string) => {
    const validRole = toUserRole(newRole);

    try {
      setUpdating(userId);
      
      const success = await authAPI.updateUserRole(userId, validRole);
      
      if (success) {
        // Proper state update with consistent typing
        setUsers(prev => prev.map(u => {
          if (u.id === userId) {
            return {
              ...u,
              user_metadata: {
                ...u.user_metadata,
                role: validRole
              },
              role: validRole
            };
          }
          return u;
        }));
        
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

  // Update user status
  const handleStatusUpdate = async (userId: string, newStatus: string) => {
    const validStatus = toUserStatus(newStatus);

    try {
      setUpdating(userId);
      
      const success = await authAPI.updateUserStatus(userId, validStatus);
      
      if (success) {
        setUsers(prev => prev.map(u => 
          u.id === userId 
            ? { ...u, status: validStatus }
            : u
        ));
        
        showSuccess(`User status updated to ${validStatus}!`);
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

  // Suspend user
  const handleSuspendUser = async (userId: string, userEmail: string) => {
    showConfirmation(
      `Are you sure you want to suspend user ${userEmail}? They will not be able to access the system.`,
      async () => {
        try {
          setUpdating(userId);
          
          const success = await authAPI.updateUserStatus(userId, 'suspended');
          
          if (success) {
            setUsers(prev => prev.map(u => 
              u.id === userId 
                ? { ...u, status: 'suspended' }
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

  // Approve user
  const handleApproveUser = async (userId: string) => {
    try {
      setUpdating(userId);
      
      const success = await authAPI.updateUserStatus(userId, 'active');
      
      if (success) {
        setUsers(prev => prev.map(u => 
          u.id === userId 
            ? { ...u, status: 'active' }
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

  // Reactivate user
  const handleReactivateUser = async (userId: string) => {
    showConfirmation(
      'Are you sure you want to reactivate this user?',
      async () => {
        try {
          setUpdating(userId);
          
          const success = await authAPI.updateUserStatus(userId, 'active');
          
          if (success) {
            setUsers(prev => prev.map(u => 
              u.id === userId 
                ? { ...u, status: 'active' }
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

  // Delete user permanently
  const handleDeleteUser = async (userId: string, userEmail: string) => {
    showConfirmation(
      `Are you sure you want to permanently delete user ${userEmail}? This action cannot be undone.`,
      async () => {
        try {
          setUpdating(userId);
          
          const success = await authAPI.deleteUser(userId);
          
          if (success) {
            setUsers(prev => prev.filter(u => u.id !== userId));
            showSuccess('User deleted successfully');
          } else {
            throw new Error('Failed to delete user');
          }
        } catch (error) {
          console.error('Error deleting user:', error);
          showError('Error deleting user. Please try again.');
        } finally {
          setUpdating(null);
        }
      }
    );
  };

  // Bulk role update
  const handleBulkRoleUpdate = async (newRole: string) => {
    if (selectedUsers.length === 0) return;

    const validRole = toUserRole(newRole);

    try {
      for (const userId of selectedUsers) {
        await authAPI.updateUserRole(userId, validRole);
      }

      setUsers(prev => prev.map(u => {
        if (selectedUsers.includes(u.id)) {
          return {
            ...u,
            user_metadata: {
              ...u.user_metadata,
              role: validRole
            },
            role: validRole
          };
        }
        return u;
      }));
      
      setSelectedUsers([]);
      showSuccess(`Updated ${selectedUsers.length} users to ${validRole} role`);
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

  // Create user
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
        role: newUserRole,
        company_id: newUserCompany || currentUser.company_id
      });

      if (newUser) {
        await loadUsers();
      }

      // Reset form
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserRole('user');
      setNewUserCompany('');
      setIsAddUserModalOpen(false);
      
      showSuccess('User created successfully!');
    } catch (error: any) {
      console.error('Error creating user:', error);
      showError(error.message || 'Error creating user. Please try again.');
    } finally {
      setAddingUser(false);
    }
  };

  // Create company
  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCompanyName) {
      showError('Please enter a company name');
      return;
    }

    try {
      setAddingCompany(true);
      
      const newCompany = await companyAPI.createCompany({
        name: newCompanyName,
        created_by: currentUser.id
      });
      
      setCompanies(prev => [...prev, newCompany]);
      
      // Reset form
      setNewCompanyName('');
      setIsAddCompanyModalOpen(false);
      
      showSuccess('Company created successfully!');
    } catch (error: any) {
      console.error('Error creating company:', error);
      showError(error.message || 'Error creating company. Please try again.');
    } finally {
      setAddingCompany(false);
    }
  };

  const handleEditUser = (user: AuthUser) => {
    setSelectedUser(user);
    setEditUserName(user.user_metadata?.full_name || '');
    setEditUserRole(user.role);
    setEditUserStatus(user.status);
    setEditUserPassword('');
    setEditUserCompany(user.company_id || '');
    setIsEditUserModalOpen(true);
  };

  // Update user
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;

    try {
      setEditingUser(true);

      // Update role if changed
      if (editUserRole !== selectedUser.role) {
        await authAPI.updateUserRole(selectedUser.id, editUserRole);
      }

      // Update status if changed
      if (editUserStatus !== selectedUser.status) {
        await authAPI.updateUserStatus(selectedUser.id, editUserStatus);
      }

      // Update company if changed and user is admin
      if (isAdminUser && editUserCompany !== selectedUser.company_id) {
        await authAPI.assignUserToCompany(selectedUser.id, editUserCompany);
      }

      // Refresh users to get updated data
      await loadUsers();

      // Reset form
      setSelectedUser(null);
      setEditUserName('');
      setEditUserRole('user');
      setEditUserStatus('active');
      setEditUserPassword('');
      setEditUserCompany('');
      setIsEditUserModalOpen(false);
      
      showSuccess('User updated successfully!');
    } catch (error: any) {
      console.error('Error updating user:', error);
      showError(error.message || 'Error updating user. Please try again.');
    } finally {
      setEditingUser(false);
    }
  };

  // Delete company
  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    showConfirmation(
      `Are you sure you want to delete company "${companyName}"? This will remove all associated data and cannot be undone.`,
      async () => {
        try {
          setUpdating(companyId);
          
          await companyAPI.deleteCompany(companyId);
          
          setCompanies(prev => prev.filter(c => c.id !== companyId));
          showSuccess('Company deleted successfully');
        } catch (error) {
          console.error('Error deleting company:', error);
          showError('Error deleting company. Please try again.');
        } finally {
          setUpdating(null);
        }
      }
    );
  };

  // Edit company
  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setEditCompanyName(company.name);
    setIsEditCompanyModalOpen(true);
  };

  // Update company
  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompany) return;

    try {
      setEditingCompany(true);

      await companyAPI.updateCompany(selectedCompany.id, {
        name: editCompanyName
      });

      await loadCompanies();

      setSelectedCompany(null);
      setEditCompanyName('');
      setIsEditCompanyModalOpen(false);
      
      showSuccess('Company updated successfully!');
    } catch (error: any) {
      console.error('Error updating company:', error);
      showError(error.message || 'Error updating company. Please try again.');
    } finally {
      setEditingCompany(false);
    }
  };

  // Helper function to get user role from AuthUser object
  const getUserRoleFromAuthUser = (user: AuthUser): UserRole => {
    if (user.role) {
      return user.role;
    }
    
    const roleFromMetadata = user.user_metadata?.role;
    if (roleFromMetadata) {
      return toUserRole(roleFromMetadata);
    }
    
    return 'user';
  };

  // Helper to get role as string for display/filtering
  const getUserRoleString = (user: AuthUser): string => {
    const role = getUserRoleFromAuthUser(user);
    return role;
  };

  // Helper function to get user display name
  const getUserDisplayName = (user: AuthUser) => {
    return user.user_metadata?.full_name || user.email.split('@')[0] || 'No Name';
  };

  // Enhanced filtering with company support
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserDisplayName(user).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserRoleString(user).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !filters.role || getUserRoleString(user) === filters.role;
    const matchesStatus = !filters.status || user.status === filters.status;
    const matchesCompany = !filters.company || user.company_id === filters.company;
    
    return matchesSearch && matchesRole && matchesStatus && matchesCompany;
  });

  // Load data on mount
  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadCompanies();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Main Admin Panel Modal */}
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
                <h2 className="text-2xl font-bold text-white">Admin Panel</h2>
                <p className="text-gray-400 mt-1">Manage users, companies, and system settings</p>
                <p className="text-sm text-blue-400 mt-1">
                  Logged in as: {currentUser?.email} | Role: {currentUserRole} | 
                  {isAdminUser ? ' ✓ Admin Access' : ' ✗ Limited Access'}
                </p>
                {currentUserRole === 'moderator' && (
                  <p className="text-sm text-blue-400 mt-1">
                    Moderator View: {companies[0]?.name || 'Your Company'}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => activeTab === 'users' ? setIsAddUserModalOpen(true) : setIsAddCompanyModalOpen(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                  disabled={activeTab === 'companies' && !isAdminUser}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add {activeTab === 'users' ? 'User' : 'Company'}</span>
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

            {/* Debug Section */}
            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Debug Info: Your role is "{currentUserRole}" • Admin Access: {isAdminUser ? '✓ GRANTED' : '✗ DENIED'}
                </div>
                <button
                  onClick={async () => {
                    try {
                      const token = await getSessionToken();
                      if (!token) {
                        console.error('❌ No session token available');
                        showError('Not authenticated. Please log in again.');
                        return;
                      }
                      
                      console.log('🔍 Fetching debug info...');
                      const response = await fetch('/api/admin/debug', {
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      });
                      
                      if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
                      }
                      
                      const debugInfo = await response.json();
                      console.log('🔍 Debug Info:', debugInfo);
                      alert('Debug info logged to console. Check browser console for details.');
                      
                      // Also show key info in alert
                      const companiesInfo = debugInfo.tables?.companies;
                      alert(
                        `Debug Results:\n` +
                        `- User Role: ${debugInfo.user?.role}\n` +
                        `- Companies Table: ${companiesInfo?.exists ? 'EXISTS' : 'NOT FOUND'}\n` +
                        `- Companies Count: ${companiesInfo?.count || 0}\n` +
                        `- Profiles Count: ${debugInfo.tables?.profiles?.count || 0}`
                      );
                    } catch (error: any) {
                      console.error('❌ Debug failed:', error);
                      showError(`Debug failed: ${error.message}`);
                    }
                  }}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Debug API
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6 border-b border-gray-700">
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('users')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'users'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  User Management
                </button>
                <button
                  onClick={() => setActiveTab('companies')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'companies'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  } ${!isAdminUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!isAdminUser}
                  title={!isAdminUser ? `Your role: ${currentUserRole}. Admin access required.` : ''}
                >
                  Company Management {!isAdminUser && `(Admin Only - Your role: ${currentUserRole})`}
                </button>
              </div>
            </div>

            {/* Users Tab Content */}
            {activeTab === 'users' && (
              <>
                {/* Search and Filters */}
                <div className="mb-6 space-y-4">
                  <input
                    type="text"
                    placeholder="Search users by email, name, or role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                  
                  <div className="flex flex-wrap gap-4">
                    <select
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
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                    </select>

                    {isAdminUser && (
                      <select
                        value={filters.company}
                        onChange={(e) => setFilters(prev => ({ ...prev, company: e.target.value }))}
                        className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Companies</option>
                        {companies.map(company => (
                          <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                      </select>
                    )}

                    {/* Bulk Actions */}
                    {selectedUsers.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400">
                          {selectedUsers.length} selected
                        </span>
                        <select
                          onChange={(e) => handleBulkRoleUpdate(e.target.value)}
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
                                checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                                onChange={handleSelectAll}
                                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                              />
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                            {isAdminUser && (
                              <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Company</th>
                            )}
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
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  user.status === 'active' ? 'bg-green-500/20 text-green-300' :
                                  user.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                                  'bg-red-500/20 text-red-300'
                                }`}>
                                  {user.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <select
                                    value={getUserRoleFromAuthUser(user)}
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
                              {isAdminUser && (
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                  {user.company_id ? companies.find(c => c.id === user.company_id)?.name || 'Unknown' : 'No Company'}
                                </td>
                              )}
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
                                      onClick={() => handleSuspendUser(user.id, user.email)}
                                      disabled={updating === user.id}
                                      className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white text-xs rounded transition-colors"
                                    >
                                      Suspend
                                    </button>
                                  )}
                                  {isAdminUser && user.id !== currentUser.id && (
                                    <button
                                      onClick={() => handleDeleteUser(user.id, user.email)}
                                      disabled={updating === user.id}
                                      className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs rounded transition-colors"
                                    >
                                      Delete
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
                    <div className="text-2xl font-bold text-white">{users.filter(u => getUserRoleString(u) === 'admin').length}</div>
                    <div className="text-sm text-gray-400">Admins</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-2xl font-bold text-white">{users.filter(u => getUserRoleString(u) === 'moderator').length}</div>
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
              </>
            )}

            {/* Companies Tab Content (Admin Only) */}
            {activeTab === 'companies' && isAdminUser && (
              <>
                {/* Companies List */}
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
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Company Name</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Users</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {companies.map((company) => (
                            <tr key={company.id} className="hover:bg-gray-800/30 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-white">
                                  {company.name}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-full">
                                  {users.filter(u => u.company_id === company.id).length} users
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                {new Date(company.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleEditCompany(company)}
                                    disabled={updating === company.id}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs rounded transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCompany(company.id, company.name)}
                                    disabled={updating === company.id}
                                    className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs rounded transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {companies.length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-gray-400">No companies found</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Company Stats */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-2xl font-bold text-white">{companies.length}</div>
                    <div className="text-sm text-gray-400">Total Companies</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-2xl font-bold text-white">
                      {users.length}
                    </div>
                    <div className="text-sm text-gray-400">Total Users</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-2xl font-bold text-white">
                      {companies.length > 0 ? Math.round(users.length / companies.length) : 0}
                    </div>
                    <div className="text-sm text-gray-400">Avg Users per Company</div>
                  </div>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-400">
                {activeTab === 'users' 
                  ? `${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''} found`
                  : `${companies.length} compan${companies.length !== 1 ? 'ies' : 'y'} found`
                }
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={activeTab === 'users' ? loadUsers : loadCompanies}
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
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(toUserRole(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                    <option value="controller">Controller</option>
                  </select>
                </div>

                {(isAdminUser || newUserRole === 'user' || newUserRole === 'controller') && (
                  <div>
                    <label htmlFor="new-user-company" className="block text-sm font-medium text-gray-300 mb-2">
                      Company {isAdminUser ? '(Optional)' : ''}
                    </label>
                    <select
                      id="new-user-company"
                      value={newUserCompany}
                      onChange={(e) => setNewUserCompany(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      required={!isAdminUser}
                    >
                      <option value="">Select Company</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                    {!isAdminUser && (
                      <p className="text-xs text-gray-500 mt-1">Users and controllers must be assigned to a company</p>
                    )}
                  </div>
                )}

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

      {/* Add Company Modal */}
      {isAddCompanyModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity bg-black bg-opacity-75" 
              onClick={() => setIsAddCompanyModalOpen(false)}
            ></div>
            
            <div className="relative inline-block w-full max-w-md px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl sm:my-8 sm:align-middle sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Add New Company</h3>
                <button
                  onClick={() => setIsAddCompanyModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddCompany} className="space-y-4">
                <div>
                  <label htmlFor="new-company-name" className="block text-sm font-medium text-gray-300 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    id="new-company-name"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter company name"
                    required
                  />
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-300">
                      <p>After creating the company, you can assign users to it from the user management section.</p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddCompanyModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingCompany}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    {addingCompany ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Create Company</span>
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
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(toUserRole(e.target.value))}
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
                    value={editUserStatus}
                    onChange={(e) => setEditUserStatus(toUserStatus(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                {isAdminUser && (
                  <div>
                    <label htmlFor="edit-user-company" className="block text-sm font-medium text-gray-300 mb-2">
                      Company
                    </label>
                    <select
                      id="edit-user-company"
                      value={editUserCompany}
                      onChange={(e) => setEditUserCompany(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    >
                      <option value="">No Company</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label htmlFor="edit-user-password" className="block text-sm font-medium text-gray-300 mb-2">
                    New Password (Optional)
                  </label>
                  <input
                    type="password"
                    id="edit-user-password"
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

      {/* Edit Company Modal */}
      {isEditCompanyModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity bg-black bg-opacity-75" 
              onClick={() => setIsEditCompanyModalOpen(false)}
            ></div>
            
            <div className="relative inline-block w-full max-w-md px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl sm:my-8 sm:align-middle sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Edit Company</h3>
                <button
                  onClick={() => setIsEditCompanyModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleUpdateCompany} className="space-y-4">
                <div>
                  <label htmlFor="edit-company-name" className="block text-sm font-medium text-gray-300 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    id="edit-company-name"
                    value={editCompanyName}
                    onChange={(e) => setEditCompanyName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter company name"
                    required
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditCompanyModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editingCompany}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    {editingCompany ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Update Company</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Success"
        message={successMessage}
        variant="success"
        confirmText="OK"
        showCancel={false}
      />

      <ConfirmationModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Error"
        message={errorMessage}
        variant="error"
        confirmText="OK"
        showCancel={false}
      />

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
        variant="warning"
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </>
  );
}