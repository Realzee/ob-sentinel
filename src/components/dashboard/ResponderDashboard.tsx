// components/dashboard/ResponderDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { reportsAPI } from '@/lib/supabase';
import CustomButton from '@/components/ui/CustomButton';
import { useRouter } from 'next/navigation';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

export default function ResponderDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [assignedReports, setAssignedReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState<any>(null);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadAssignedReports();
    }
  }, [user]);

  const loadAssignedReports = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const reports = await reportsAPI.getResponderAssignedReports(user.id);
      setAssignedReports(reports);
    } catch (error) {
      console.error('Error loading assigned reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptReport = async (report: any) => {
    try {
      setSelectedReport(report);
      setShowAcceptConfirm(true);
    } catch (error) {
      console.error('Error accepting report:', error);
    }
  };

  const confirmAcceptReport = async () => {
    if (!selectedReport) return;
    
    try {
      const reportType = selectedReport.license_plate ? 'vehicle' : 'crime';
      await reportsAPI.updateReportWithResponderAction(
        selectedReport.id,
        reportType,
        {
          status: 'in_progress',
          responder_action: 'accepted'
        },
        user?.id
      );
      setActiveReport(selectedReport);
      setShowAcceptConfirm(false);
      setSelectedReport(null);
      loadAssignedReports();
    } catch (error) {
      console.error('Error accepting report:', error);
    }
  };

  const handleCompleteReport = async (report: any) => {
    try {
      setSelectedReport(report);
      setShowCompleteConfirm(true);
    } catch (error) {
      console.error('Error completing report:', error);
    }
  };

  const confirmCompleteReport = async () => {
    if (!selectedReport) return;
    
    try {
      const reportType = selectedReport.license_plate ? 'vehicle' : 'crime';
      await reportsAPI.updateReportWithResponderAction(
        selectedReport.id,
        reportType,
        {
          status: 'resolved',
          responder_action: 'completed',
          resolution_notes: 'Resolved by responder'
        },
        user?.id
      );
      setActiveReport(null);
      setShowCompleteConfirm(false);
      setSelectedReport(null);
      loadAssignedReports();
    } catch (error) {
      console.error('Error completing report:', error);
    }
  };

  const handleNavigateToLocation = (location: string) => {
    if (!location) return;
    
    // Try to parse as coordinates first
    const coords = location.split(',').map(coord => coord.trim());
    if (coords.length === 2) {
      const [lat, lng] = coords;
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        // Open Google Maps with coordinates
        window.open(`https://www.google.com/maps?q=${latNum},${lngNum}`, '_blank');
        return;
      }
    }
    
    // If not coordinates, search for the location
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(location)}`, '_blank');
  };

  const getReportTitle = (report: any) => {
    if (report.license_plate) {
      return `Vehicle: ${report.license_plate}`;
    } else {
      return `Crime: ${report.title}`;
    }
  };

  const getReportDetails = (report: any) => {
    if (report.license_plate) {
      return `${report.vehicle_make} ${report.vehicle_model} • ${report.vehicle_color}`;
    } else {
      return report.description.substring(0, 100) + (report.description.length > 100 ? '...' : '');
    }
  };

  const getReportLocation = (report: any) => {
    return report.last_seen_location || report.location || 'Location not specified';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-300';
      case 'in_progress': return 'bg-blue-500/20 text-blue-300';
      case 'resolved': return 'bg-green-500/20 text-green-300';
      case 'dispatched': return 'bg-purple-500/20 text-purple-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-300';
      case 'high': return 'bg-orange-500/20 text-orange-300';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300';
      case 'low': return 'bg-green-500/20 text-green-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showAcceptConfirm}
        onClose={() => {
          setShowAcceptConfirm(false);
          setSelectedReport(null);
        }}
        onConfirm={confirmAcceptReport}
        title="Accept Assignment"
        message={`Are you sure you want to accept this assignment: ${selectedReport ? getReportTitle(selectedReport) : ''}?`}
        variant="success"
        confirmText="Accept"
        cancelText="Cancel"
      />

      <ConfirmationModal
        isOpen={showCompleteConfirm}
        onClose={() => {
          setShowCompleteConfirm(false);
          setSelectedReport(null);
        }}
        onConfirm={confirmCompleteReport}
        title="Complete Assignment"
        message={`Are you sure you want to mark this assignment as complete: ${selectedReport ? getReportTitle(selectedReport) : ''}?`}
        variant="success"
        confirmText="Mark Complete"
        cancelText="Cancel"
      />

      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-white">🚨 Responder Dashboard</h1>
              <span className="text-sm text-gray-400">Manage your assigned reports</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">{user?.email}</span>
              <CustomButton
                onClick={() => router.push('/dashboard')}
                variant="secondary"
                size="sm"
              >
                Back to Dashboard
              </CustomButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Active Report View */}
        {activeReport && (
          <div className="mb-6 bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Active Assignment</h2>
                <p className="text-gray-400">{getReportTitle(activeReport)}</p>
              </div>
              <CustomButton
                onClick={() => setActiveReport(null)}
                variant="secondary"
                size="sm"
              >
                Close
              </CustomButton>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm text-gray-400 mb-2">Location</h3>
                  <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                    <p className="text-white">{getReportLocation(activeReport)}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm text-gray-400 mb-2">Details</h3>
                  <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                    <p className="text-white">{getReportDetails(activeReport)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm text-gray-400 mb-2">Severity</h3>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 text-xs rounded-full ${getSeverityColor(activeReport.severity)}`}>
                      {activeReport.severity.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(activeReport.status)}`}>
                      {activeReport.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm text-gray-400 mb-2">Reported</h3>
                  <p className="text-white">
                    {new Date(activeReport.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                <CustomButton
                  onClick={() => handleNavigateToLocation(getReportLocation(activeReport))}
                  variant="primary"
                  className="flex-1"
                >
                  Navigate to Location
                </CustomButton>
                <CustomButton
                  onClick={() => handleCompleteReport(activeReport)}
                  variant="success"
                  className="flex-1"
                >
                  Mark as Complete
                </CustomButton>
              </div>
            </div>
          </div>
        )}

        {/* Assigned Reports */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Your Assignments</h2>
            <p className="text-sm text-gray-400">
              {assignedReports.filter(r => r.status !== 'resolved').length} active assignments
            </p>
          </div>
          
          <div className="p-6">
            {assignedReports.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-lg">No assignments yet.</p>
                <p className="text-gray-500 mt-2">Check back later or contact your controller.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignedReports.map((report) => (
                  <div key={report.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-white text-lg">
                            {getReportTitle(report)}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(report.status)}`}>
                            {report.status}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor(report.severity)}`}>
                            {report.severity} priority
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">
                          {getReportDetails(report)}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>📍 {getReportLocation(report)}</span>
                          <span>•</span>
                          <span>🕐 {new Date(report.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        {report.status === 'pending' && !activeReport && (
                          <CustomButton
                            onClick={() => handleAcceptReport(report)}
                            variant="primary"
                            size="sm"
                          >
                            Accept
                          </CustomButton>
                        )}
                        {report.status === 'in_progress' && (
                          <CustomButton
                            onClick={() => handleCompleteReport(report)}
                            variant="success"
                            size="sm"
                          >
                            Complete
                          </CustomButton>
                        )}
                        <CustomButton
                          onClick={() => handleNavigateToLocation(getReportLocation(report))}
                          variant="secondary"
                          size="sm"
                        >
                          Navigate
                        </CustomButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}