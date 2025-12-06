// components/admin/ResponderManagementModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { authAPI, companyAPI, UserRole } from '@/lib/supabase'; // IMPORT UserRole
import CustomButton from '@/components/ui/CustomButton';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface ResponderManagementModalProps {
  open: boolean;
  onClose: () => void;
  currentUserRole: string;
  currentUserCompanyId?: string;
}

interface Responder {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole; // Use UserRole type
  status: string;
  company_id?: string;
  company_name?: string;
  location?: string;
  last_seen_at?: string;
  assigned_reports?: string[];
}

export default function ResponderManagementModal({ 
  open, 
  onClose, 
  currentUserRole,
  currentUserCompanyId 
}: ResponderManagementModalProps) {
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedResponder, setSelectedResponder] = useState<Responder | null>(null);
  
  // Form states
  const [responderForm, setResponderForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'responder' as UserRole, // Use UserRole type
    company_id: currentUserCompanyId || '',
    status: 'active' as 'active' | 'inactive'
  });

  const [companies, setCompanies] = useState<any[]>([]);

  // Load responders and companies
  const loadData = async () => {
    setLoading(true);
    try {
      // Load companies
      const companiesData = await companyAPI.getAllCompanies();
      setCompanies(companiesData);

      // Load all users and filter for responders/controllers
      const allUsers = await authAPI.getAllUsers();
      const respondersData = allUsers
        .filter((user: any) => user.role === 'responder' || user.role === 'controller')
        .map((user: any) => ({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
          role: user.role as UserRole,
          status: user.status || 'active',
          company_id: user.company_id,
          company_name: companiesData.find(c => c.id === user.company_id)?.name || 'No Company',
          last_seen_at: user.last_sign_in_at || user.created_at
        })) as Responder[];
      
      setResponders(respondersData);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const handleAddResponder = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate form
      if (!responderForm.email || !responderForm.password) {
        setError('Email and password are required');
        return;
      }

      // Create user - FIXED: Use UserRole type
      const newUser = await authAPI.createUser({
        email: responderForm.email,
        password: responderForm.password,
        full_name: responderForm.full_name,
        role: responderForm.role,
        company_id: responderForm.company_id || undefined
      });

      setSuccess(`Responder ${responderForm.email} created successfully`);
      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error creating responder:', error);
      setError(error.message || 'Failed to create responder');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateResponder = async (updates: Partial<Responder>) => {
    try {
      if (!selectedResponder) return;

      setLoading(true);
      setError('');

      // Update user - FIXED: Type assertions
      if (updates.role) {
        await authAPI.updateUserRole(selectedResponder.id, updates.role);
      }

      if (updates.status) {
        await authAPI.updateUserStatus(selectedResponder.id, updates.status as any);
      }

      if (updates.company_id !== undefined) {
        await authAPI.assignUserToCompany(selectedResponder.id, updates.company_id);
      }

      setSuccess(`Responder updated successfully`);
      setShowEditModal(false);
      setSelectedResponder(null);
      loadData();
    } catch (error: any) {
      console.error('Error updating responder:', error);
      setError(error.message || 'Failed to update responder');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResponder = async () => {
    try {
      if (!selectedResponder) return;

      setLoading(true);
      setError('');

      // Delete user
      const success = await authAPI.deleteUser(selectedResponder.id);
      
      if (success) {
        setSuccess(`Responder deleted successfully`);
        setShowDeleteConfirm(false);
        setSelectedResponder(null);
        loadData();
      } else {
        setError('Failed to delete responder');
      }
    } catch (error: any) {
      console.error('Error deleting responder:', error);
      setError(error.message || 'Failed to delete responder');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setResponderForm({
      email: '',
      full_name: '',
      password: '',
      role: 'responder',
      company_id: currentUserCompanyId || '',
      status: 'active'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-500';
      case 'suspended': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'controller': return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
      case 'responder': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-6xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">🚨 Responder Management</h2>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-400 bg-gray-900 px-3 py-1 rounded-full">
                {responders.length} responders
              </span>
              <CustomButton
                onClick={() => setShowAddModal(true)}
                variant="primary"
                size="sm"
              >
                + Add Responder
              </CustomButton>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : error ? (
              <div className="p-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-300">
                  {error}
                </div>
              </div>
            ) : (
              <div className="h-full overflow-auto">
                {success && (
                  <div className="m-4 bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-green-300">
                    {success}
                  </div>
                )}

                {responders.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400 text-lg">No responders found.</p>
                    <CustomButton
                      onClick={() => setShowAddModal(true)}
                      variant="primary"
                      className="mt-4"
                    >
                      Add your first responder
                    </CustomButton>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {responders.map((responder) => (
                        <div key={responder.id} className="bg-gray-900/50 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-semibold text-white text-lg">{responder.full_name || 'No Name'}</h3>
                              <p className="text-sm text-gray-400">{responder.email}</p>
                            </div>
                            <div className="flex space-x-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(responder.role)}`}>
                                {responder.role}
                              </span>
                              <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full ${getStatusColor(responder.status)} mr-1`}></div>
                                <span className="text-xs text-gray-400">{getStatusText(responder.status)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Company:</span>
                              <span className="text-white">{responder.company_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Last Active:</span>
                              <span className="text-white">
                                {new Date(responder.last_seen_at || '').toLocaleString()}
                              </span>
                            </div>
                            {responder.location && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Location:</span>
                                <span className="text-white truncate max-w-[150px]">{responder.location}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex space-x-2 mt-4">
                            <CustomButton
                              onClick={() => {
                                setSelectedResponder(responder);
                                setShowEditModal(true);
                              }}
                              variant="secondary"
                              size="sm"
                              className="flex-1"
                            >
                              Edit
                            </CustomButton>
                            <CustomButton
                              onClick={() => {
                                setSelectedResponder(responder);
                                setShowDeleteConfirm(true);
                              }}
                              variant="danger"
                              size="sm"
                              className="flex-1"
                            >
                              Delete
                            </CustomButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-700 flex justify-between items-center">
            <div className="text-sm text-gray-400">
              {currentUserRole === 'admin' ? 'Full admin access' : 'Company moderator access'}
            </div>
            <CustomButton
              onClick={onClose}
              variant="secondary"
            >
              Close
            </CustomButton>
          </div>
        </div>
      </div>

      {/* Add Responder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Add New Responder</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email *</label>
                  <input
                    type="email"
                    value={responderForm.email}
                    onChange={(e) => setResponderForm({...responderForm, email: e.target.value})}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    placeholder="responder@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={responderForm.full_name}
                    onChange={(e) => setResponderForm({...responderForm, full_name: e.target.value})}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Password *</label>
                  <input
                    type="password"
                    value={responderForm.password}
                    onChange={(e) => setResponderForm({...responderForm, password: e.target.value})}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Role</label>
                  <select
                    value={responderForm.role}
                    onChange={(e) => setResponderForm({...responderForm, role: e.target.value as UserRole})}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="responder">Responder</option>
                    <option value="controller">Controller</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Company</label>
                  <select
                    value={responderForm.company_id}
                    onChange={(e) => setResponderForm({...responderForm, company_id: e.target.value})}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    disabled={currentUserRole === 'moderator'}
                  >
                    <option value="">No Company</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Status</label>
                  <select
                    value={responderForm.status}
                    onChange={(e) => setResponderForm({...responderForm, status: e.target.value as any})}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              {error && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-300 text-sm">
                  {error}
                </div>
              )}
              <div className="flex space-x-3 mt-6">
                <CustomButton
                  onClick={() => {
                    setShowAddModal(false);
                    setError('');
                    resetForm();
                  }}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </CustomButton>
                <CustomButton
                  onClick={handleAddResponder}
                  variant="primary"
                  className="flex-1"
                  loading={loading}
                >
                  Create Responder
                </CustomButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Responder Modal */}
      {showEditModal && selectedResponder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Edit Responder</h3>
              <div className="space-y-4">
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                  <div className="text-sm text-gray-400">Email</div>
                  <div className="text-white font-medium">{selectedResponder.email}</div>
                </div>
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                  <div className="text-sm text-gray-400">Name</div>
                  <div className="text-white font-medium">{selectedResponder.full_name || 'No Name'}</div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Role</label>
                  <select
                    value={selectedResponder.role}
                    onChange={(e) => setSelectedResponder({
                      ...selectedResponder,
                      role: e.target.value as UserRole
                    })}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="responder">Responder</option>
                    <option value="controller">Controller</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Company</label>
                  <select
                    value={selectedResponder.company_id || ''}
                    onChange={(e) => setSelectedResponder({
                      ...selectedResponder,
                      company_id: e.target.value
                    })}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    disabled={currentUserRole === 'moderator'}
                  >
                    <option value="">No Company</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Status</label>
                  <select
                    value={selectedResponder.status}
                    onChange={(e) => setSelectedResponder({
                      ...selectedResponder,
                      status: e.target.value
                    })}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              {error && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-300 text-sm">
                  {error}
                </div>
              )}
              <div className="flex space-x-3 mt-6">
                <CustomButton
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedResponder(null);
                    setError('');
                  }}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </CustomButton>
                <CustomButton
                  onClick={() => handleUpdateResponder({
                    role: selectedResponder.role,
                    status: selectedResponder.status,
                    company_id: selectedResponder.company_id
                  })}
                  variant="primary"
                  className="flex-1"
                  loading={loading}
                >
                  Update Responder
                </CustomButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedResponder(null);
        }}
        onConfirm={handleDeleteResponder}
        title="Delete Responder"
        message={`Are you sure you want to delete ${selectedResponder?.full_name || selectedResponder?.email}? This action cannot be undone.`}
        variant="warning"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}