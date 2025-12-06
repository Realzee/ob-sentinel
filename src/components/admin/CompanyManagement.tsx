// components/admin/CompanyManagement.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { companyAPI, Company } from '@/lib/supabase';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface CompanyManagementProps {
  user: any;
}

export default function CompanyManagement({ user }: CompanyManagementProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const companiesData = await companyAPI.getAllCompanies();
      setCompanies(companiesData);
    } catch (error: any) {
      showError('Failed to load companies: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  };

  const showConfirmation = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmModal(true);
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCompanyName.trim()) {
      showError('Please enter a company name');
      return;
    }

    try {
      const newCompany = await companyAPI.createCompany({
        name: newCompanyName.trim()
      });
      
      setCompanies(prev => [...prev, newCompany]);
      setNewCompanyName('');
      setIsAddModalOpen(false);
      showSuccess('Company created successfully!');
    } catch (error: any) {
      showError(error.message || 'Error creating company');
    }
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setEditCompanyName(company.name);
    setIsEditModalOpen(true);
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompany || !editCompanyName.trim()) return;

    try {
      setUpdating(selectedCompany.id);
      await companyAPI.updateCompany(selectedCompany.id, {
        name: editCompanyName.trim()
      });
      
      setCompanies(prev => prev.map(c => 
        c.id === selectedCompany.id 
          ? { ...c, name: editCompanyName.trim() }
          : c
      ));
      
      setSelectedCompany(null);
      setEditCompanyName('');
      setIsEditModalOpen(false);
      showSuccess('Company updated successfully!');
    } catch (error: any) {
      showError(error.message || 'Error updating company');
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    showConfirmation(
      `Are you sure you want to delete "${companyName}"? This will remove all associated data.`,
      async () => {
        try {
          setUpdating(companyId);
          await companyAPI.deleteCompany(companyId);
          setCompanies(prev => prev.filter(c => c.id !== companyId));
          showSuccess('Company deleted successfully');
        } catch (error: any) {
          showError(error.message || 'Error deleting company');
        } finally {
          setUpdating(null);
        }
      }
    );
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Company Management</h1>
            <p className="text-gray-400 mt-2">Manage all companies in the system</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Company</span>
          </button>
        </div>

        {/* Companies Table */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-400">Loading companies...</span>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No companies found</p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Create your first company
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">Company Name</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">Actions</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(company.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-300">
                        Active
                      </span>
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
          )}
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold text-white">{companies.length}</div>
            <div className="text-sm text-gray-400">Total Companies</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold text-green-500">{companies.length}</div>
            <div className="text-sm text-gray-400">Active Companies</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold text-blue-500">0</div>
            <div className="text-sm text-gray-400">Pending Companies</div>
          </div>
        </div>
      </div>

      {/* Add Company Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Add New Company</h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleAddCompany} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter company name"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Create Company
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {isEditModalOpen && selectedCompany && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Edit Company</h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleUpdateCompany} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={editCompanyName}
                    onChange={(e) => setEditCompanyName(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter company name"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating === selectedCompany.id}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                  >
                    {updating === selectedCompany.id ? 'Updating...' : 'Update Company'}
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
          if (confirmAction) confirmAction();
          setShowConfirmModal(false);
        }}
        title="Confirm Action"
        message={confirmMessage}
        variant="warning"
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </div>
  );
}