'use client';

import { useState, useEffect } from 'react';
import { reportsAPI, ReportStatus, supabase } from '@/lib/supabase';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import Image from 'next/image';

interface VehicleReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportCreated: () => void;
  user: any;
  editReport?: any;
}

// Define severity type to match the expected union type
type SeverityType = 'low' | 'medium' | 'high' | 'critical';

export default function VehicleReportModal({ 
  isOpen, 
  onClose, 
  onReportCreated, 
  user, 
  editReport 
}: VehicleReportModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    license_plate: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_color: '',
    year: '',
    reason: '',
    last_seen_location: '',
    last_seen_time: '',
    severity: 'medium' as SeverityType,
    status: 'active' as ReportStatus,
    notes: ''
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
        status: editReport.status || 'active',
        notes: editReport.notes || ''
      });
      // Load existing images if editing
      if (editReport.evidence_images) {
        setUploadedImageUrls(editReport.evidence_images);
      }
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
        status: 'active',
        notes: ''
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

  const uploadImagesToStorage = async (reportId: string): Promise<string[]> => {
    if (images.length === 0) return uploadedImageUrls;

    setUploading(true);
    const uploadedUrls: string[] = [...uploadedImageUrls];

    try {
      for (const image of images) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${reportId}/${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('vehicle-evidence')
          .upload(fileName, image);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('vehicle-evidence')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    } finally {
      setUploading(false);
    }

    return uploadedUrls;
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
        year: formData.year ? parseInt(formData.year) : undefined,
        reason: formData.reason,
        last_seen_location: formData.last_seen_location,
        last_seen_time: formData.last_seen_time ? new Date(formData.last_seen_time).toISOString() : undefined,
        severity: formData.severity,
        status: formData.status,
        notes: formData.notes,
        reported_by: user.id,
        evidence_images: uploadedImageUrls
      };

      let result;
      if (editReport) {
        console.log('🔄 Updating existing report...');
        const allImageUrls = await uploadImagesToStorage(editReport.id);
        result = await reportsAPI.updateVehicleAlert(editReport.id, {
          ...reportData,
          evidence_images: allImageUrls
        });
      } else {
        console.log('🔄 Creating new report...');
        result = await reportsAPI.createVehicleAlert(reportData);
        if (images.length > 0) {
          const imageUrls = await uploadImagesToStorage(result.id);
          await reportsAPI.updateVehicleAlert(result.id, {
            evidence_images: imageUrls
          });
        }
      }

      console.log('✅ Report saved successfully:', result);
      
      // Close modal first for better UX
      onClose();
      
      // Then show success message
      showSuccess(editReport ? 'Vehicle report updated successfully!' : 'Vehicle report created successfully!');
      
      // Then trigger the refresh
      onReportCreated();
      
    } catch (error: any) {
      console.error('❌ Error saving vehicle report:', error);
      
      let errorMessage = 'Error saving vehicle report. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      }
      
      showError(errorMessage);
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

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const location = `${latitude}, ${longitude}`;
          setFormData(prev => ({
            ...prev,
            last_seen_location: location
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
      license_plate: '',
      vehicle_make: '',
      vehicle_model: '',
      vehicle_color: '',
      year: '',
      reason: '',
      last_seen_location: '',
      last_seen_time: '',
      severity: 'medium',
      status: 'active',
      notes: ''
    });
    setImages([]);
    setImagePreviews([]);
    setUploadedImageUrls([]);
    onClose();
  };

  // FIX: Make sure to return null when not open
  if (!isOpen) return null;

  // FIX: Return proper JSX
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

                {/* Status Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status *
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                  >
                    <option value="active">Active</option>
                    <option value="recovered">Recovered</option>
                    <option value="resolved">Resolved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Location and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Seen Location *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      name="last_seen_location"
                      value={formData.last_seen_location}
                      onChange={handleChange}
                      required
                      className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
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

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Evidence Images
                </label>
                <div className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                    className="hidden"
                    id="image-upload"
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
                  </label>
                </div>

                {/* Image Previews */}
                {(imagePreviews.length > 0 || uploadedImageUrls.length > 0) && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Uploaded Images:</h4>
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
                  disabled={loading || uploading}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  {(loading || uploading) ? (
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

      {/* Error Modal */}
      <ConfirmationModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Error"
        message={errorMessage}
        type="error"
        confirmText="OK"
        showCancel={false}
      />
    </>
  );
}