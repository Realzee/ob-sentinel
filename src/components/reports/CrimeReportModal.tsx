'use client';

import { useState, useEffect } from 'react';
import { reportsAPI, CrimeReport } from '@/lib/supabase'; // Add CrimeReport import

interface CrimeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportCreated: () => void;
  user: any;
  editReport?: CrimeReport | null;
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
    report_type: 'theft',
    severity: 'medium'
  });

  // Reset form when modal opens/closes or when editReport changes
  useEffect(() => {
    if (editReport) {
      setFormData({
        title: editReport.title || '',
        description: editReport.description || '',
        location: editReport.location || '',
        incident_time: editReport.incident_time || '',
        report_type: editReport.report_type || 'theft',
        severity: editReport.severity || 'medium'
      });
    } else if (!isOpen) {
      setFormData({
        title: '',
        description: '',
        location: '',
        incident_time: '',
        report_type: 'theft',
        severity: 'medium'
      });
    }
  }, [isOpen, editReport]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editReport) {
        await reportsAPI.updateCrimeReport(editReport.id, {
          ...formData,
          incident_time: formData.incident_time || null,
        });
      } else {
        await reportsAPI.createCrimeReport({
          ...formData,
          incident_time: formData.incident_time || null,
          reported_by: user.id,
          status: 'pending',
          evidence_images: [],
          witness_info: null,
          contact_allowed: false
        });
      }

      onReportCreated();
      onClose();
    } catch (error) {
      console.error('Error creating crime report:', error);
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
        <div className="fixed inset-0 transition-opacity bg-black bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform theme-card rounded-xl sm:rounded-2xl">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-red-800 flex justify-between items-center">
            <h3 className="text-lg font-medium text-white theme-text-glow">
              {editReport ? 'Edit Crime Report' : 'File New Crime Report'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Incident Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm theme-border rounded-lg text-white placeholder-gray-500 bg-black focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Brief description of the incident"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-3 py-2 text-sm theme-border rounded-lg text-white placeholder-gray-500 bg-black focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Detailed description of what happened..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm theme-border rounded-lg text-white placeholder-gray-500 bg-black focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Where did this happen?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                  Incident Type
                </label>
                <select
                  name="report_type"
                  value={formData.report_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm theme-border rounded-lg text-white bg-black focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="theft" className="bg-black">Theft</option>
                  <option value="assault" className="bg-black">Assault</option>
                  <option value="vandalism" className="bg-black">Vandalism</option>
                  <option value="burglary" className="bg-black">Burglary</option>
                  <option value="suspicious" className="bg-black">Suspicious Activity</option>
                  <option value="other" className="bg-black">Other</option>
                </select>
              </div>
            </div>

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
                  Incident Time
                </label>
                <input
                  type="datetime-local"
                  name="incident_time"
                  value={formData.incident_time}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm theme-border rounded-lg text-white bg-black focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

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
                {loading ? 'Submitting...' : (editReport ? 'Update Report' : 'Submit Report')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}