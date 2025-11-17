'use client';

import { VehicleAlert, CrimeReport } from '@/lib/supabase'; // Add imports

interface ReportActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: VehicleAlert | CrimeReport | null; // Use the proper types
  reportType: 'vehicles' | 'crimes';
  onEdit: () => void;
  onViewLocation: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

// Type guards
const isVehicleAlert = (report: any): report is VehicleAlert => {
  return report && 'license_plate' in report;
};

const isCrimeReport = (report: any): report is CrimeReport => {
  return report && 'title' in report;
};

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-3 sm:px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-black bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform theme-card rounded-xl sm:rounded-2xl">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-red-800 flex justify-between items-center">
            <h3 className="text-lg font-medium text-white theme-text-glow">Report Actions</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {/* Report Details */}
            <div className="mb-4">
              <h4 className="font-semibold text-white mb-2 theme-text-glow">Report Details</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <p><strong>Type:</strong> {reportType === 'vehicles' ? 'Vehicle Report' : 'Crime Report'}</p>
                <p><strong>Status:</strong> <span className="capitalize">{report.status.replace('_', ' ')}</span></p>
                <p><strong>Severity:</strong> <span className="capitalize">{report.severity}</span></p>
                <p><strong>Reported:</strong> {new Date(report.created_at).toLocaleDateString()}</p>
                {isVehicleAlert(report) ? (
                  <>
                    <p><strong>License Plate:</strong> {report.license_plate}</p>
                    <p><strong>Vehicle:</strong> {report.vehicle_make} {report.vehicle_model} {report.vehicle_color}</p>
                    <p><strong>Location:</strong> {report.last_seen_location}</p>
                  </>
                ) : isCrimeReport(report) ? (
                  <>
                    <p><strong>Title:</strong> {report.title}</p>
                    <p><strong>Location:</strong> {report.location}</p>
                    <p><strong>Type:</strong> {report.report_type}</p>
                  </>
                ) : null}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  onEdit();
                  onClose();
                }}
                className="w-full theme-button-secondary py-2 px-4 rounded-lg font-medium transition-all"
              >
                Edit Report
              </button>

              {(isVehicleAlert(report) && report.last_seen_location) || 
               (isCrimeReport(report) && report.location) ? (
                <button
                  onClick={() => {
                    onViewLocation();
                    onClose();
                  }}
                  className="w-full theme-border py-2 px-4 rounded-lg font-medium text-white bg-black hover:bg-blue-900/20 transition-all"
                >
                  View on OpenStreetMap
                </button>
              ) : null}

              {canDelete && (
                <button
                  onClick={() => {
                    onDelete();
                    onClose();
                  }}
                  className="w-full bg-red-900 border border-red-700 py-2 px-4 rounded-lg font-medium text-white hover:bg-red-800 transition-all"
                >
                  Delete Report
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}