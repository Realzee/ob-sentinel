'use client';

import { useState, useEffect } from 'react';
import { VehicleAlert, CrimeReport, isVehicleAlert, isCrimeReport } from '@/lib/supabase';
import Image from 'next/image';

interface ReportActionsModalProps {
  open: boolean;
  onClose: () => void;
  report: VehicleAlert | CrimeReport | null;
  onEdit: () => void;
  onViewLocation: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

export default function ReportActionsModal({
  open,
  onClose,
  report,
  onEdit,
  onViewLocation,
  onDelete,
  canDelete
}: ReportActionsModalProps) {
  const [imageError, setImageError] = useState(false);

  // Reset image error when report changes
  useEffect(() => {
    setImageError(false);
  }, [report]);

  if (!open || !report) return null;

  // Helper functions to safely access report properties
  const getVehicleDisplayInfo = (report: VehicleAlert) => {
    return {
      licensePlate: report.license_plate,
      color: report.vehicle_color,
      make: report.vehicle_make,
      model: report.vehicle_model,
      year: report.year,
      location: report.last_seen_location,
      time: report.last_seen_time,
      reason: report.reason,
      notes: report.notes,
      severity: report.severity,
      status: report.status,
      images: report.evidence_images || []
    };
  };

  const getCrimeDisplayInfo = (report: CrimeReport) => {
    return {
      title: report.title,
      description: report.description,
      location: report.location,
      time: report.incident_time,
      type: report.report_type,
      severity: report.severity,
      status: report.status,
      witnessInfo: report.witness_info,
      contactAllowed: report.contact_allowed,
      images: report.evidence_images || []
    };
  };

  const hasLocation = () => {
    if (isVehicleAlert(report)) {
      return !!report.last_seen_location;
    } else if (isCrimeReport(report)) {
      return !!report.location;
    }
    return false;
  };

  const hasImages = () => {
    const images = isVehicleAlert(report) 
      ? report.evidence_images 
      : isCrimeReport(report) 
        ? report.evidence_images 
        : [];
    return images && images.length > 0;
  };

  const getPrimaryImage = () => {
    const images = isVehicleAlert(report) 
      ? report.evidence_images 
      : isCrimeReport(report) 
        ? report.evidence_images 
        : [];
    return images && images.length > 0 ? images[0] : null;
  };

  const renderVehicleDetails = () => {
    if (!isVehicleAlert(report)) return null;
    const vehicleInfo = getVehicleDisplayInfo(report);

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">License Plate:</span>
            <div className="text-white font-medium">{vehicleInfo.licensePlate}</div>
          </div>
          <div>
            <span className="text-gray-400">Color:</span>
            <div className="text-white font-medium">{vehicleInfo.color}</div>
          </div>
          <div>
            <span className="text-gray-400">Make:</span>
            <div className="text-white font-medium">{vehicleInfo.make}</div>
          </div>
          <div>
            <span className="text-gray-400">Model:</span>
            <div className="text-white font-medium">{vehicleInfo.model}</div>
          </div>
          {vehicleInfo.year && (
            <div>
              <span className="text-gray-400">Year:</span>
              <div className="text-white font-medium">{vehicleInfo.year}</div>
            </div>
          )}
          <div>
            <span className="text-gray-400">Severity:</span>
            <div className="text-white font-medium capitalize">{vehicleInfo.severity}</div>
          </div>
        </div>
        
        {vehicleInfo.reason && (
          <div>
            <span className="text-gray-400">Reason:</span>
            <div className="text-white mt-1">{vehicleInfo.reason}</div>
          </div>
        )}
        
        {vehicleInfo.notes && (
          <div>
            <span className="text-gray-400">Notes:</span>
            <div className="text-white mt-1">{vehicleInfo.notes}</div>
          </div>
        )}
      </div>
    );
  };

  const renderCrimeDetails = () => {
    if (!isCrimeReport(report)) return null;
    const crimeInfo = getCrimeDisplayInfo(report);

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="col-span-2">
            <span className="text-gray-400">Title:</span>
            <div className="text-white font-medium">{crimeInfo.title}</div>
          </div>
          <div>
            <span className="text-gray-400">Type:</span>
            <div className="text-white font-medium capitalize">{crimeInfo.type?.replace('_', ' ')}</div>
          </div>
          <div>
            <span className="text-gray-400">Severity:</span>
            <div className="text-white font-medium capitalize">{crimeInfo.severity}</div>
          </div>
        </div>
        
        <div>
          <span className="text-gray-400">Description:</span>
          <div className="text-white mt-1">{crimeInfo.description}</div>
        </div>
        
        {crimeInfo.witnessInfo && (
          <div>
            <span className="text-gray-400">Witness Info:</span>
            <div className="text-white mt-1">{crimeInfo.witnessInfo}</div>
          </div>
        )}
      </div>
    );
  };

  const primaryImage = getPrimaryImage();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-black bg-opacity-75" 
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="relative inline-block w-full max-w-2xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl sm:my-8 sm:align-middle sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Report Details
              </h2>
              <p className="text-gray-400 mt-1">
                {isVehicleAlert(report) ? 'Vehicle Report' : 'Crime Report'}
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

          <div className="space-y-6">
            {/* Image Preview */}
            {primaryImage && !imageError && (
              <div className="flex justify-center">
                <div className="relative w-full max-w-xs h-48 rounded-lg overflow-hidden">
                  <Image
                    src={primaryImage}
                    alt="Report evidence"
                    fill
                    className="object-cover"
                    onError={() => setImageError(true)}
                  />
                </div>
              </div>
            )}

            {/* Status and Severity Badges */}
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                report.status === 'resolved' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                report.status === 'rejected' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}>
                {report.status.replace('_', ' ')}
              </span>
              <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                report.severity === 'critical' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                report.severity === 'high' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                report.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                'bg-green-500/20 text-green-300 border border-green-500/30'
              }`}>
                {report.severity} severity
              </span>
            </div>

            {/* Report Details */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3">
                {isVehicleAlert(report) ? 'Vehicle Information' : 'Incident Details'}
              </h3>
              {isVehicleAlert(report) ? renderVehicleDetails() : renderCrimeDetails()}
            </div>

            {/* Location Information */}
            {hasLocation() && (
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">Location</h3>
                <p className="text-gray-300">
                  {isVehicleAlert(report) ? report.last_seen_location : report.location}
                </p>
                {isVehicleAlert(report) && report.last_seen_time && (
                  <p className="text-gray-400 text-sm mt-1">
                    Last seen: {new Date(report.last_seen_time).toLocaleString()}
                  </p>
                )}
                {isCrimeReport(report) && report.incident_time && (
                  <p className="text-gray-400 text-sm mt-1">
                    Incident time: {new Date(report.incident_time).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700">
              <button
                onClick={onEdit}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit Report</span>
              </button>
              
              {hasLocation() && (
                <button
                  onClick={onViewLocation}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>View Location</span>
                </button>
              )}
              
              {canDelete && (
                <button
                  onClick={onDelete}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete Report</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}