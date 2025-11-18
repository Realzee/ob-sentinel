'use client';

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

  const hasLocation = reportType === 'vehicles' 
    ? report.last_seen_location 
    : report.location;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-black bg-opacity-75" onClick={onClose}></div>

        {/* Modal panel */}
        <div className="relative inline-block w-full max-w-md px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl sm:my-8 sm:align-middle sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Report Actions</h3>
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
          <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
            <h4 className="font-semibold text-white mb-2">Report Details</h4>
            <div className="space-y-2 text-sm text-gray-300">
              <div>
                <span className="font-medium">Type:</span> {reportType === 'vehicles' ? 'Vehicle Report' : 'Crime Report'}
              </div>
              <div>
                <span className="font-medium">Status:</span> 
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                  report.status === 'resolved' ? 'bg-green-500/20 text-green-300' :
                  report.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                  'bg-blue-500/20 text-blue-300'
                }`}>
                  {report.status.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="font-medium">Severity:</span>
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  report.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                  report.severity === 'high' ? 'bg-orange-500/20 text-orange-300' :
                  report.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-green-500/20 text-green-300'
                }`}>
                  {report.severity}
                </span>
              </div>
              <div>
                <span className="font-medium">Created:</span> {new Date(report.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => {
                onEdit();
                onClose();
              }}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit Report</span>
            </button>

            {hasLocation && (
              <button
                onClick={() => {
                  onViewLocation();
                  onClose();
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>View Location</span>
              </button>
            )}

            {canDelete && (
              <button
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete Report</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}