// components/dashboards/ResponderDashboard.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { reportsAPI, authAPI } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import CustomButton from '@/components/ui/CustomButton';
import dynamic from 'next/dynamic';

// Dynamically import the OpenStreetMap component
const ResponderMap = dynamic(() => import('@/components/maps/ResponderMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900 rounded-xl flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-400 mt-2">Loading map...</p>
      </div>
    </div>
  ),
});

interface ResponderDashboardProps {
  user: any;
}

export default function ResponderDashboard({ user }: ResponderDashboardProps) {
  const [assignedReports, setAssignedReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState<'available' | 'busy' | 'offline'>('available');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showReportDetails, setShowReportDetails] = useState(false);

  const userId = user?.id;

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
          // Default to Johannesburg coordinates
          setCurrentLocation([-26.195246, 28.034088]);
        }
      );
    } else {
      setCurrentLocation([-26.195246, 28.034088]);
    }
  }, []);

  const loadAssignedReports = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get reports assigned to this responder using the new method
      const reports = await authAPI.getResponderAssignedReports(userId);
      setAssignedReports(reports);

    } catch (error) {
      console.error('Error loading assigned reports:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadAssignedReports();
      
      // Set up periodic refresh
      const interval = setInterval(loadAssignedReports, 30000);
      return () => clearInterval(interval);
    }
  }, [userId, loadAssignedReports]);

  const handleUpdateStatus = async (newStatus: 'available' | 'busy' | 'offline') => {
    try {
      await authAPI.updateResponderStatus(userId, newStatus);
      setStatus(newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, reportType: 'vehicle' | 'crime', newStatus: string) => {
    try {
      if (reportType === 'vehicle') {
        await reportsAPI.updateVehicleAlert(reportId, { status: newStatus });
      } else {
        await reportsAPI.updateCrimeReport(reportId, { status: newStatus });
      }
      
      // Update the dispatch record status
      await authAPI.updateResponderDispatchStatus(userId, reportId, newStatus);
      
      // Reload reports
      await loadAssignedReports();
      
    } catch (error) {
      console.error('Error updating report status:', error);
    }
  };

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setShowReportDetails(true);
  };

  const handleNavigateToReport = (report: any) => {
    const location = report.last_seen_location || report.location;
    if (location && currentLocation) {
      try {
        // Parse coordinates
        const [lat, lng] = location.split(',').map((coord: string) => parseFloat(coord.trim()));
        
        // Open navigation in new tab (using OpenStreetMaps)
        const url = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${currentLocation[0]},${currentLocation[1]};${lat},${lng}`;
        window.open(url, '_blank');
      } catch (error) {
        console.error('Error parsing location for navigation:', error);
        alert('Unable to parse location coordinates for navigation.');
      }
    } else {
      alert('No location available for this report.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading Responder Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-white">Responder Dashboard</h1>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  status === 'available' ? 'bg-green-500 animate-pulse' :
                  status === 'busy' ? 'bg-yellow-500' :
                  'bg-gray-500'
                }`}></div>
                <span className="text-sm text-gray-400 capitalize">{status}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                Assigned: {assignedReports.length} reports
              </div>
              <CustomButton
                onClick={loadAssignedReports}
                variant="secondary"
                size="sm"
              >
                Refresh
              </CustomButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Status Controls */}
        <div className="mb-6">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">Update Your Status</h3>
            <div className="flex space-x-3">
              <CustomButton
                onClick={() => handleUpdateStatus('available')}
                variant={status === 'available' ? 'success' : 'secondary'}
                size="sm"
              >
                Available
              </CustomButton>
              <CustomButton
                onClick={() => handleUpdateStatus('busy')}
                variant={status === 'busy' ? 'warning' : 'secondary'}
                size="sm"
              >
                Busy
              </CustomButton>
              <CustomButton
                onClick={() => handleUpdateStatus('offline')}
                variant={status === 'offline' ? 'danger' : 'secondary'}
                size="sm"
              >
                Offline
              </CustomButton>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="mb-6 h-[500px] rounded-xl border border-gray-700 overflow-hidden">
          <ResponderMap
            assignedReports={assignedReports}
            currentLocation={currentLocation}
            onReportSelect={handleViewReport}
          />
        </div>

        {/* Assigned Reports */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-xl font-semibold text-white">Assigned Reports</h3>
          </div>
          <div className="p-6">
            {assignedReports.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No assigned reports</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignedReports.map((report) => {
                  const reportType = report.license_plate ? 'vehicle' : 'crime';
                  
                  return (
                    <div key={report.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-semibold text-white">
                            {report.license_plate || report.title}
                          </div>
                          <div className="text-sm text-gray-400">
                            {report.last_seen_location || report.location}
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          report.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                          report.severity === 'high' ? 'bg-orange-500/20 text-orange-300' :
                          'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {report.severity}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-400 mb-4">
                        <div>Type: {reportType === 'vehicle' ? 'Vehicle Alert' : 'Crime Report'}</div>
                        <div>Reported: {new Date(report.created_at).toLocaleString()}</div>
                        {reportType === 'vehicle' && (
                          <div>
                            {report.vehicle_make} {report.vehicle_model} • {report.vehicle_color}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <CustomButton
                          onClick={() => handleViewReport(report)}
                          variant="primary"
                          size="sm"
                        >
                          View Details
                        </CustomButton>
                        
                        <CustomButton
                          onClick={() => handleNavigateToReport(report)}
                          variant="success"
                          size="sm"
                        >
                          Navigate To
                        </CustomButton>
                        
                        <select
                          onChange={(e) => handleUpdateReportStatus(report.id, reportType, e.target.value)}
                          className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm text-white"
                          defaultValue={report.status}
                        >
                          <option value="dispatched">Dispatched</option>
                          <option value="en_route">En Route</option>
                          <option value="on_scene">On Scene</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Report Details Modal */}
      {showReportDetails && selectedReport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-semibold text-white">Report Details</h3>
                <button
                  onClick={() => {
                    setShowReportDetails(false);
                    setSelectedReport(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                {selectedReport.license_plate ? (
                  <>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Vehicle Details</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-400">License Plate</div>
                          <div className="text-white">{selectedReport.license_plate}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Make & Model</div>
                          <div className="text-white">{selectedReport.vehicle_make} {selectedReport.vehicle_model}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Color</div>
                          <div className="text-white">{selectedReport.vehicle_color}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Year</div>
                          <div className="text-white">{selectedReport.vehicle_year || 'Unknown'}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Incident Details</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-400">Reason</div>
                          <div className="text-white">{selectedReport.reason}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Severity</div>
                          <div className="text-white capitalize">{selectedReport.severity}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Status</div>
                          <div className="text-white capitalize">{selectedReport.status}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Last Seen</div>
                          <div className="text-white">{selectedReport.last_seen_location}</div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Crime Details</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-400">Title</div>
                          <div className="text-white">{selectedReport.title}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Type</div>
                          <div className="text-white">{selectedReport.report_type}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Location</div>
                          <div className="text-white">{selectedReport.location}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Severity</div>
                          <div className="text-white capitalize">{selectedReport.severity}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Description</h4>
                      <div className="text-white bg-gray-900/50 p-3 rounded border border-gray-700">
                        {selectedReport.description}
                      </div>
                    </div>
                  </>
                )}
                
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Additional Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-400">Reported By</div>
                      <div className="text-white">{selectedReport.reporter_email || 'Unknown'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Reported At</div>
                      <div className="text-white">{new Date(selectedReport.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                
                {selectedReport.evidence_images && selectedReport.evidence_images.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">Evidence Images</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedReport.evidence_images.map((image: string, index: number) => (
                        <div key={index} className="aspect-square bg-gray-900 rounded border border-gray-700 overflow-hidden">
                          <img 
                            src={image} 
                            alt={`Evidence ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3 mt-6">
                <CustomButton
                  onClick={() => handleNavigateToReport(selectedReport)}
                  variant="success"
                  className="flex-1"
                >
                  Navigate To Location
                </CustomButton>
                <CustomButton
                  onClick={() => setShowReportDetails(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  Close
                </CustomButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}