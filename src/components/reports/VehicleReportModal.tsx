'use client';

import { useState, useEffect } from 'react';
import { reportsAPI, ReportStatus } from '@/lib/supabase';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface VehicleReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportCreated: () => void;
  user: any;
  editReport?: any;
}

export default function VehicleReportModal({ 
  isOpen, 
  onClose, 
  onReportCreated, 
  user, 
  editReport 
}: VehicleReportModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    license_plate: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_color: '',
    year: '',
    reason: '',
    last_seen_location: '',
    last_seen_time: '',
    severity: 'medium',
    notes: ''
  });

  // Confirmation modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (editReport) {
      setFormData({
        license_plate: editReport.license_plate || '',
        vehicle_make: editReport.vehicle_make || '',
        vehicle_model: editReport.vehicle_model || '',
        vehicle_color: editReport.vehicle_color || '',
        year: editReport.year || '',
        reason: editReport.reason || '',
        last_seen_location: editReport.last_seen_location || '',
        last_seen_time: editReport.last_seen_time ? editReport.last_seen_time.split('T')[0] : '',
        severity: editReport.severity || 'medium',
        notes: editReport.notes || ''
      });
    } else {
      setFormData({
        license_plate: '',
        vehicle_make: '',
        vehicle_model: '',
        vehicle_color: '',
        year: '',
        reason: '',
        last_seen_location: '',
        last_seen_time: '',
        severity: 'medium',
        notes: ''
      });
    }
  }, [editReport, isOpen]); // Added isOpen to reset when modal opens

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const reportData = {
        license_plate: formData.license_plate,
        vehicle_make: formData.vehicle_make,
        vehicle_model: formData.vehicle_model,
        vehicle_color: formData.vehicle_color,
        year: formData.year ? parseInt(formData.year) : null,
        reason: formData.reason,
        last_seen_location: formData.last_seen_location,
        last_seen_time: formData.last_seen_time ? new Date(formData.last_seen_time).toISOString() : null,
        severity: formData.severity,
        notes: formData.notes,
        reported_by: user.id,
        status: 'pending' as ReportStatus
      };

      if (editReport) {
        await reportsAPI.updateVehicleAlert(editReport.id, reportData);
      } else {
        await reportsAPI.createVehicleAlert(reportData);
      }

      onReportCreated();
      onClose();
      
      // Show success message
      showSuccess(editReport ? 'Vehicle report updated successfully!' : 'Vehicle report created successfully!');
    } catch (error) {
      console.error('Error saving vehicle report:', error);
      alert('Error saving vehicle report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleModalClose = () => {
    setFormData({
      license_plate: '',
      vehicle_make: '',
      vehicle_model: '',
      vehicle_color: '',
      year: '',
      reason: '',
      last_seen_location: '',
      last_seen_time: '',
      severity: 'medium',
      notes: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          {/* Background overlay */}
          <div 
            className="fixed inset-0 transition-opacity bg-black bg-opacity-75" 
            onClick={handleModalClose}
          ></div>

          {/* Modal panel */}
          <div className="relative inline-block w-full max-w-2xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl sm:my-8 sm:align-middle sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {editReport ? 'Edit Vehicle Report' : 'Report Stolen Vehicle'}
                </h2>
                <p className="text-gray-400 mt-1">
                  {editReport ? 'Update vehicle information' : 'Report a stolen or suspicious vehicle'}
                </p>
              </div>
              <button
                onClick={handleModalClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Vehicle Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    License Plate *
                  </label>
                  <input
                    type="text"
                    name="license_plate"
                    value={formData.license_plate}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                    placeholder="ABC 123 GP"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Vehicle Make *
                  </label>
                  <input
                    type="text"
                    name="vehicle_make"
                    value={formData.vehicle_make}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                    placeholder="Toyota"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Vehicle Model *
                  </label>
                  <input
                    type="text"
                    name="vehicle_model"
                    value={formData.vehicle_model}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                    placeholder="Corolla"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Vehicle Color *
                  </label>
                  <input
                    type="text"
                    name="vehicle_color"
                    value={formData.vehicle_color}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                    placeholder="Red"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Year
                  </label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                    placeholder="2023"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Severity *
                  </label>
                  <select
                    name="severity"
                    value={formData.severity}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Location and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Seen Location *
                  </label>
                  <input
                    type="text"
                    name="last_seen_location"
                    value={formData.last_seen_location}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                    placeholder="123 Main Street, City"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Seen Time
                  </label>
                  <input
                    type="datetime-local"
                    name="last_seen_time"
                    value={formData.last_seen_time}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              {/* Reason and Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason for Report *
                </label>
                <input
                  type="text"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                  placeholder="Stolen vehicle, Suspicious activity, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Additional Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors resize-none"
                  placeholder="Any additional information about the vehicle or incident..."
                />
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-700">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{editReport ? 'Update Report' : 'Submit Report'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Success Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Success"
        message={successMessage}
        type="success"
        confirmText="OK"
        showCancel={false}
      />
    </>
  );
}