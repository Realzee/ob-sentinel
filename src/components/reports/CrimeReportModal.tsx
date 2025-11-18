'use client';

import { useState, useEffect } from 'react';
import { reportsAPI, ReportStatus } from '@/lib/supabase';

interface CrimeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportCreated: () => void;
  user: any;
  editReport?: any;
}

export default function CrimeReportModal({ 
  isOpen, 
  onClose, 
  onReportCreated, 
  user, 
  editReport 
}: CrimeReportModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    incident_time: '',
    report_type: '',
    severity: 'medium',
    witness_info: '',
    contact_allowed: false
  });

  useEffect(() => {
    if (editReport) {
      setFormData({
        title: editReport.title || '',
        description: editReport.description || '',
        location: editReport.location || '',
        incident_time: editReport.incident_time ? editReport.incident_time.split('T')[0] : '',
        report_type: editReport.report_type || '',
        severity: editReport.severity || 'medium',
        witness_info: editReport.witness_info || '',
        contact_allowed: editReport.contact_allowed || false
      });
    } else {
      setFormData({
        title: '',
        description: '',
        location: '',
        incident_time: '',
        report_type: '',
        severity: 'medium',
        witness_info: '',
        contact_allowed: false
      });
    }
  }, [editReport]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const reportData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        incident_time: formData.incident_time ? new Date(formData.incident_time).toISOString() : null,
        report_type: formData.report_type,
        severity: formData.severity,
        witness_info: formData.witness_info,
        evidence_images: [],
        contact_allowed: Boolean(formData.contact_allowed),
        reported_by: user.id,
        status: 'pending' as ReportStatus
      };

      if (editReport) {
        await reportsAPI.updateCrimeReport(editReport.id, reportData);
      } else {
        await reportsAPI.createCrimeReport(reportData);
      }

      onReportCreated();
      onClose();
      
      // Show success message
      alert(editReport ? 'Crime report updated successfully!' : 'Crime report created successfully!');
    } catch (error) {
      console.error('Error saving crime report:', error);
      alert('Error saving crime report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-black bg-opacity-75" onClick={onClose}></div>

        {/* Modal panel */}
        <div className="relative inline-block w-full max-w-2xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl sm:my-8 sm:align-middle sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {editReport ? 'Edit Crime Report' : 'Report Crime Incident'}
              </h2>
              <p className="text-gray-400 mt-1">
                {editReport ? 'Update crime incident details' : 'Report criminal activities or suspicious behavior'}
              </p>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Incident Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Incident Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Brief description of the incident"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Report Type *
                </label>
                <select
                  name="report_type"
                  value={formData.report_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">Select type...</option>
                  <option value="theft">Theft</option>
                  <option value="assault">Assault</option>
                  <option value="burglary">Burglary</option>
                  <option value="vandalism">Vandalism</option>
                  <option value="suspicious_activity">Suspicious Activity</option>
                  <option value="drug_related">Drug Related</option>
                  <option value="traffic_violation">Traffic Violation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Severity Level *
                </label>
                <select
                  name="severity"
                  value={formData.severity}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
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
                  Incident Location *
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="123 Main Street, City, State"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Incident Date & Time
                </label>
                <input
                  type="datetime-local"
                  name="incident_time"
                  value={formData.incident_time}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Detailed Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={5}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                placeholder="Please provide a detailed description of what happened, including people involved, vehicles seen, and any other relevant information..."
              />
            </div>

            {/* Witness Information */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Witness Information
              </label>
              <textarea
                name="witness_info"
                value={formData.witness_info}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                placeholder="Any witness information or contact details..."
              />
            </div>

            {/* Contact Permission */}
            <div className="flex items-center space-x-3 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
              <input
                type="checkbox"
                name="contact_allowed"
                id="contact_allowed"
                checked={formData.contact_allowed}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="contact_allowed" className="text-sm text-gray-300">
                I give permission to be contacted for additional information about this incident
              </label>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
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
  );
}