'use client';

import { isVehicleAlert, isCrimeReport } from '@/lib/supabase';

interface ReportActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: any;
  reportType: 'vehicles' | 'crimes';
  onEdit: () => void;
  onViewLocation: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

export default function ReportActionsModal({
  isOpen,
  onClose,
  report,
  reportType,
  onEdit,
  onViewLocation,
  onDelete,
  canDelete
}: ReportActionsModalProps) {
  if (!isOpen || !report) return null;

  const hasLocation = () => {
    if (isVehicleAlert(report)) {
      return !!report.last_seen_location;
    } else if (isCrimeReport(report)) {
      return !!report.location;
    }
    return false;
  };

  const hasImages = () => {
    return report.evidence_images && report.evidence_images.length > 0;
  };

  const getReportDetails = () => {
    if (isVehicleAlert(report)) {
      return {
        type: 'Vehicle Report',
        title: report.license_plate,
        subtitle: `${report.vehicle_make} ${report.vehicle_model} • ${report.vehicle_color}`,
        obNumber: report.ob_number,
        location: report.last_seen_location,
        time: report.last_seen_time,
        reason: report.reason,
        notes: report.notes
      };
    } else if (isCrimeReport(report)) {
      return {
        type: 'Crime Report',
        title: report.title,
        subtitle: report.report_type,
        obNumber: report.ob_number,
        location: report.location,
        time: report.incident_time,
        description: report.description,
        witnessInfo: report.witness_info
      };
    }
    return {
      type: 'Report',
      title: '',
      subtitle: '',
      obNumber: '',
      location: '',
      time: '',
      description: ''
    };
  };

  const details = getReportDetails();

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
              <h2 className="text-2xl font-bold text-white">Report Details</h2>
              <p className="text-gray-400 mt-1">{details.type}</p>
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

          {/* Report Details */}
          <div className="space-y-4 mb-6">
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{details.title}</h3>
                  <p className="text-gray-300 text-sm">{details.subtitle}</p>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                  report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                  report.status === 'resolved' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                  report.status === 'rejected' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                  'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {report.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">OB Number</p>
                  <p className="text-blue-400 font-mono">{details.obNumber}</p>
                </div>
                <div>
                  <p className="text-gray-400">Severity</p>
                  <p className="flex items-center space-x-1">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      report.severity === 'critical' ? 'bg-red-500' :
                      report.severity === 'high' ? 'bg-orange-500' :
                      report.severity === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}></span>
                    <span className="capitalize text-white">{report.severity}</span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Reported</p>
                  <p className="text-white">{new Date(report.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-400">Last Updated</p>
                  <p className="text-white">{new Date(report.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Location */}
            {details.location && (
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Location</h4>
                <p className="text-white">{details.location}</p>
                {details.time && (
                  <p className="text-gray-400 text-sm mt-1">
                    {new Date(details.time).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Description/Reason */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <h4 className="text-sm font-medium text-gray-300 mb-2">
                {isVehicleAlert(report) ? 'Reason for Report' : 'Description'}
              </h4>
              <p className="text-white">
                {isVehicleAlert(report) ? details.reason : details.description}
              </p>
            </div>

            {/* Additional Notes or Witness Info */}
            {(details.notes || details.witnessInfo) && (
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  {isVehicleAlert(report) ? 'Additional Notes' : 'Witness Information'}
                </h4>
                <p className="text-white">
                  {isVehicleAlert(report) ? details.notes : details.witnessInfo}
                </p>
              </div>
            )}

            {/* Evidence Images */}
            {hasImages() && (
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Evidence Images</h4>
                <p className="text-white text-sm">
                  {report.evidence_images.length} image(s) attached
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-700">
            <button
              onClick={onEdit}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              Edit Report
            </button>
            
            {hasLocation() && (
              <button
                onClick={onViewLocation}
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
              >
                View Location
              </button>
            )}

            {canDelete && (
              <button
                onClick={onDelete}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
              >
                Delete Report
              </button>
            )}

            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}