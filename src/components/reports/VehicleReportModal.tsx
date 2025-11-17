'use client';

import { useState, useEffect } from 'react';
import { reportsAPI } from '@/lib/supabase';

interface VehicleReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportCreated: () => void;
  user: any;
}

export default function VehicleReportModal({ 
  isOpen, 
  onClose, 
  onReportCreated, 
  user 
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
    severity: 'medium'
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        license_plate: '',
        vehicle_make: '',
        vehicle_model: '',
        vehicle_color: '',
        year: '',
        reason: '',
        last_seen_location: '',
        last_seen_time: '',
        severity: 'medium'
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await reportsAPI.createVehicleAlert({
        ...formData,
        year: formData.year ? parseInt(formData.year) : null,
        last_seen_time: formData.last_seen_time || null,
        reported_by: user.id,
        status: 'pending'
      });

      onReportCreated();
      onClose();
    } catch (error) {
      console.error('Error creating report:', error);
      alert('Error creating report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-3 sm:px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 transition-opacity bg-black bg-opacity-75" onClick={onClose}></div>

        {/* Modal */}
        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform theme-card rounded-xl sm:rounded-2xl">
          {/* Header */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-red-800 flex justify-between items-center">
            <h3 className="text-lg font-medium text-white theme-text-glow">File New Vehicle Report</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* License Plate & Make */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  License Plate *
                </label>
                <input
                  type="text"
                  name="license_plate"
                  value={formData.license_plate}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm theme-border rounded-lg text-white placeholder-gray-500 bg-black focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="ABC 123 GP"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  Vehicle Make *
                </label>
                <input
                  type="text"
                  name="vehicle_make"
                  value={formData.vehicle_make}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm theme-border rounded-lg text-white placeholder-gray-500 bg-black focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Toyota"
                />
              </div>
            </div>

            {/* Model & Color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  Vehicle Model
                </label>
                <input
                  type="text"
                  name="vehicle_model"
                  value={formData.vehicle_model}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm theme-border rounded-lg text-white placeholder-gray-500 bg-black focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Corolla"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  Color
                </label>
                <input
                  type="text"
                  name="vehicle_color"
                  value={formData.vehicle_color}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm theme-border rounded-lg text-white placeholder-gray-500 bg-black focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="White"
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Reason for Report *
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                required
                rows={3}
                className="w-full px-3 py-2 text-sm theme-border rounded-lg text-white placeholder-gray-500 bg-black focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Describe why this vehicle is being reported..."
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Last Seen Location *
              </label>
              <input
                type="text"
                name="last_seen_location"
                value={formData.last_seen_location}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm theme-border rounded-lg text-white placeholder-gray-500 bg-black focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="123 Main Street, City"
              />
            </div>

            {/* Severity & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  Severity
                </label>
                <select
                  name="severity"
                  value={formData.severity}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm theme-border rounded-lg text-white bg-black focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="low" className="bg-black">Low</option>
                  <option value="medium" className="bg-black">Medium</option>
                  <option value="high" className="bg-black">High</option>
                  <option value="critical" className="bg-black">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  Last Seen Time
                </label>
                <input
                  type="datetime-local"
                  name="last_seen_time"
                  value={formData.last_seen_time}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm theme-border rounded-lg text-white bg-black focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="theme-border px-4 py-2 text-sm font-medium text-white bg-black hover:bg-red-900/20 rounded-lg transition-colors order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="theme-button px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 order-1 sm:order-2"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}