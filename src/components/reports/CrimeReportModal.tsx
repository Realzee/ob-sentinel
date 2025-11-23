// components/reports/CrimeReportModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { reportsAPI, ReportStatus, formatDateForDateTimeLocal } from '@/lib/supabase';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import Image from 'next/image';

interface CrimeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportCreated: () => void;
  user: any;
  editReport?: any;
}

// Define severity type to match the expected union type
type SeverityType = 'low' | 'medium' | 'high' | 'critical';

// Generate short OB number
const generateShortOBNumber = (type: 'V' | 'C') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `OB${type}${timestamp.slice(-4)}${random}`;
};

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
    severity: 'medium' as SeverityType,
    status: 'active' as ReportStatus,
    witness_info: '',
    contact_allowed: false,
    ob_number: ''
  });

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);

  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (editReport) {
      // Fix datetime-local format for incident_time
      let formattedIncidentTime = '';
      if (editReport.incident_time) {
        formattedIncidentTime = formatDateForDateTimeLocal(editReport.incident_time);
      }

      setFormData({
        title: editReport.title || '',
        description: editReport.description || '',
        location: editReport.location || '',
        incident_time: formattedIncidentTime,
        report_type: editReport.report_type || '',
        severity: editReport.severity || 'medium',
        status: editReport.status || 'active',
        witness_info: editReport.witness_info || '',
        contact_allowed: editReport.contact_allowed || false,
        ob_number: editReport.ob_number || generateShortOBNumber('C')
      });
      
      if (editReport.evidence_images) {
        setUploadedImageUrls(editReport.evidence_images);
      }
    } else {
      setFormData({
        title: '',
        description: '',
        location: '',
        incident_time: '',
        report_type: '',
        severity: 'medium',
        status: 'active',
        witness_info: '',
        contact_allowed: false,
        ob_number: generateShortOBNumber('C')
      });
      setUploadedImageUrls([]);
    }
    setImages([]);
    setImagePreviews([]);
  }, [editReport, isOpen]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const handleImageUpload = async (files: FileList) => {
    const newImages: File[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          showError(`Image ${file.name} is too large. Maximum size is 5MB.`);
          continue;
        }
        
        newImages.push(file);
        // Create preview
        const previewUrl = URL.createObjectURL(file);
        newPreviews.push(previewUrl);
      }
    }

    setImages(prev => [...prev, ...newImages]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  // SIMPLE FALLBACK: Convert images to base64 data URLs
  const processImagesLocally = async (): Promise<string[]> => {
    if (images.length === 0) return uploadedImageUrls;

    console.log(`🔄 Processing ${images.length} images locally...`);
    
    const processedUrls: string[] = [...uploadedImageUrls];

    for (const image of images) {
      try {
        // Convert image to base64 data URL
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.readAsDataURL(image);
        });
        
        processedUrls.push(dataUrl);
        console.log('✅ Image processed locally');
      } catch (error) {
        console.warn('⚠️ Failed to process image:', error);
        // Continue with other images
      }
    }

    console.log(`✅ All ${images.length} images processed locally`);
    return processedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!formData.title.trim() || !formData.description.trim()) {
      showError('Please fill in all required fields (Title and Description).');
      return;
    }

    setLoading(true);

    try {
      console.log('🔄 Starting crime report submission...', { formData, user });

      // Process images locally first
      const allImageUrls = await processImagesLocally();

      const reportData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        incident_time: formData.incident_time ? new Date(formData.incident_time).toISOString() : undefined,
        report_type: formData.report_type,
        severity: formData.severity,
        status: formData.status,
        witness_info: formData.witness_info,
        evidence_images: allImageUrls,
        contact_allowed: Boolean(formData.contact_allowed),
        ob_number: formData.ob_number,
        reported_by: user.id
      };

      let result;
      
      if (editReport) {
        console.log('🔄 Updating existing crime report...');
        result = await reportsAPI.updateCrimeReport(editReport.id, reportData);
      } else {
        console.log('🔄 Creating new crime report...');
        result = await reportsAPI.createCrimeReport(reportData);
      }

      console.log('✅ Crime report saved successfully:', result);
      
      // Show success message
      const successMsg = editReport ? 'Crime report updated successfully!' : 'Crime report created successfully!';
      if (images.length > 0) {
        showSuccess(successMsg + ' Images have been saved with the report.');
      } else {
        showSuccess(successMsg);
      }
      
      // Close modal and refresh after delay
      setTimeout(() => {
        handleModalClose();
        onReportCreated();
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Error saving crime report:', error);
      
      let errorMessage = 'Error saving crime report. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      }
      
      showError(errorMessage);
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

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const location = `${latitude}, ${longitude}`;
          setFormData(prev => ({
            ...prev,
            location: location
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
          showError('Unable to get current location. Please enter manually.');
        }
      );
    } else {
      showError('Geolocation is not supported by this browser.');
    }
  };

  const handleModalClose = () => {
    // Clean up image preview URLs
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setFormData({
      title: '',
      description: '',
      location: '',
      incident_time: '',
      report_type: '',
      severity: 'medium',
      status: 'active',
      witness_info: '',
      contact_allowed: false,
      ob_number: generateShortOBNumber('C')
    });
    setImages([]);
    setImagePreviews([]);
    setUploadedImageUrls([]);
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
                  {editReport ? 'Edit Crime Report' : 'Report Crime Incident'}
                </h2>
                <p className="text-gray-400 mt-1">
                  {editReport ? 'Update crime incident details' : 'Report criminal activities or suspicious behavior'}
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
              {/* OB Number Display */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-blue-300">Case Reference</h3>
                    <p className="text-lg font-bold text-white">{formData.ob_number}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Incident Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                    Incident Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Brief description of the incident"
                  />
                </div>

                <div>
                  <label htmlFor="report_type" className="block text-sm font-medium text-gray-300 mb-2">
                    Report Type *
                  </label>
                  <select
                    id="report_type"
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
                  <label htmlFor="severity" className="block text-sm font-medium text-gray-300 mb-2">
                    Severity Level *
                  </label>
                  <select
                    id="severity"
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

                {/* Status Field */}
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-2">
                    Status *
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="active">Active</option>
                    <option value="resolved">Resolved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Location and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-2">
                    Incident Location *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      required
                      className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="123 Main Street, City or coordinates"
                    />
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="hidden sm:inline">Current</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="incident_time" className="block text-sm font-medium text-gray-300 mb-2">
                    Incident Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    id="incident_time"
                    name="incident_time"
                    value={formData.incident_time}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label htmlFor="image-upload" className="block text-sm font-medium text-gray-300 mb-2">
                  Evidence Images (Stored with report)
                </label>
                <div className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center">
                  <input
                    type="file"
                    id="image-upload"
                    name="image-upload"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                    className="hidden"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                  >
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-400 text-sm">Click to upload images</span>
                    <span className="text-gray-500 text-xs">PNG, JPG, JPEG up to 5MB</span>
                    <span className="text-green-400 text-xs mt-2">✓ Images will be saved with the report</span>
                  </label>
                </div>

                {/* Image Previews */}
                {(imagePreviews.length > 0 || uploadedImageUrls.length > 0) && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      {uploadedImageUrls.length > 0 ? 'Report Images:' : 'New Images:'}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {/* Existing uploaded images */}
                      {uploadedImageUrls.map((url, index) => (
                        <div key={`existing-${index}`} className="relative group">
                          <Image
                            src={url}
                            alt={`Evidence ${index + 1}`}
                            width={100}
                            height={100}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeUploadedImage(index)}
                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      {/* New image previews */}
                      {imagePreviews.map((preview, index) => (
                        <div key={`new-${index}`} className="relative group">
                          <Image
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            width={100}
                            height={100}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                  Detailed Description *
                </label>
                <textarea
                  id="description"
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
                <label htmlFor="witness_info" className="block text-sm font-medium text-gray-300 mb-2">
                  Witness Information
                </label>
                <textarea
                  id="witness_info"
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
                  id="contact_allowed"
                  name="contact_allowed"
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
                  onClick={handleModalClose}
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

      {/* Success Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setLoading(false);
        }}
        title="Success"
        message={successMessage}
        type="success"
        confirmText="OK"
        showCancel={false}
      />

      {/* Error Modal */}
      <ConfirmationModal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          setLoading(false);
        }}
        title="Error"
        message={errorMessage}
        type="error"
        confirmText="OK"
        showCancel={false}
      />
    </>
  );
}