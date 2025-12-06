// components/dashboards/ControllerDashboard.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { reportsAPI, authAPI } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import CustomButton from '@/components/ui/CustomButton';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import dynamic from 'next/dynamic';

// Dynamically import map component
const ControllerMap = dynamic(() => import('@/components/maps/ControllerMap'), {
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

interface ControllerDashboardProps {
  user: any;
}

interface DispatchRecord {
  id: string;
  report_id: string;
  report_type: 'vehicle' | 'crime';
  assigned_to: string;
  status: 'pending' | 'dispatched' | 'en_route' | 'on_scene' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  notes: string;
}

export default function ControllerDashboard({ user }: ControllerDashboardProps) {
  const [vehicleReports, setVehicleReports] = useState<any[]>([]);
  const [crimeReports, setCrimeReports] = useState<any[]>([]);
  const [activeResponders, setActiveResponders] = useState<any[]>([]);
  const [dispatchRecords, setDispatchRecords] = useState<DispatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeReports: 0,
    dispatched: 0,
    completed: 0,
    activeResponders: 0
  });
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    responderId: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    notes: ''
  });

  const userCompanyId = user?.company_id;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load reports for controller's company only
      const [vehiclesData, crimesData] = await Promise.all([
        reportsAPI.getVehicleAlerts(userCompanyId),
        reportsAPI.getCrimeReports(userCompanyId)
      ]);

      // Filter to show only active reports
      const activeVehicles = vehiclesData.filter((report: any) => 
        ['active', 'pending'].includes(report.status)
      );
      
      const activeCrimes = crimesData.filter((report: any) => 
        ['active', 'pending'].includes(report.status)
      );

      // Get responders for this company
      const respondersData = await authAPI.getRespondersByCompany(userCompanyId);
      
      // Get dispatch records
      const dispatchData = await reportsAPI.getDispatchRecords();
      
      // Filter dispatch records for this company
      const companyDispatchRecords = dispatchData.filter((record: any) => {
        // Check if report belongs to this company
        const report = [...activeVehicles, ...activeCrimes].find(r => r.id === record.report_id);
        return report;
      });

      // Filter responders to show only available/busy
      const activeRespondersList = respondersData.filter((responder: any) => 
        ['available', 'busy'].includes(responder.status)
      );

      setVehicleReports(activeVehicles);
      setCrimeReports(activeCrimes);
      setActiveResponders(activeRespondersList);
      setDispatchRecords(companyDispatchRecords);

      // Update stats
      setStats({
        activeReports: activeVehicles.length + activeCrimes.length,
        dispatched: companyDispatchRecords.filter((d: any) => 
          ['dispatched', 'en_route'].includes(d.status)
        ).length,
        completed: companyDispatchRecords.filter((d: any) => 
          d.status === 'completed'
        ).length,
        activeResponders: activeRespondersList.length
      });

    } catch (error) {
      console.error('Error loading controller data:', error);
    } finally {
      setLoading(false);
    }
  }, [userCompanyId]);

  useEffect(() => {
    if (userCompanyId) {
      loadData();
      
      // Set up auto-refresh
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [userCompanyId, loadData]);

  const handleDispatchReport = async (report: any) => {
    setSelectedReport(report);
    setShowDispatchModal(true);
  };

  const confirmDispatch = async () => {
    if (!selectedReport || !dispatchForm.responderId) return;

    try {
      const reportType = selectedReport.license_plate ? 'vehicle' : 'crime';
      
      // Create dispatch record
      const dispatchRecord = await reportsAPI.createDispatchRecord({
        report_id: selectedReport.id,
        report_type: reportType,
        assigned_to: dispatchForm.responderId,
        status: 'dispatched',
        priority: dispatchForm.priority,
        notes: dispatchForm.notes
      });

      // Update report status
      if (reportType === 'vehicle') {
        await reportsAPI.updateVehicleAlert(selectedReport.id, { status: 'dispatched' });
      } else {
        await reportsAPI.updateCrimeReport(selectedReport.id, { status: 'dispatched' });
      }

      // Refresh data
      await loadData();
      
      // Reset form
      setShowDispatchModal(false);
      setSelectedReport(null);
      setDispatchForm({
        responderId: '',
        priority: 'medium',
        notes: ''
      });

    } catch (error) {
      console.error('Error dispatching report:', error);
    }
  };

  const handleUpdateDispatchStatus = async (dispatchId: string, status: DispatchRecord['status']) => {
    try {
      await reportsAPI.updateDispatchRecord(dispatchId, { status });
      await loadData();
    } catch (error) {
      console.error('Error updating dispatch status:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading Controller Dashboard...</p>
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
              <h1 className="text-xl font-bold text-white">Controller Dashboard</h1>
              <span className="text-sm text-gray-400">
                Company: {user?.company?.name || 'Your Company'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <CustomButton
                onClick={loadData}
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
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold text-white">{stats.activeReports}</div>
            <div className="text-sm text-gray-400">Active Reports</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold text-yellow-500">{stats.dispatched}</div>
            <div className="text-sm text-gray-400">Dispatched</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
            <div className="text-sm text-gray-400">Completed</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <div className="text-2xl font-bold text-blue-500">{stats.activeResponders}</div>
            <div className="text-sm text-gray-400">Active Responders</div>
          </div>
        </div>

        {/* Map Section */}
        <div className="mb-6 h-[400px] rounded-xl border border-gray-700 overflow-hidden">
          <ControllerMap
            vehicleReports={vehicleReports}
            crimeReports={crimeReports}
            responders={activeResponders}
          />
        </div>

        {/* Reports and Responders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Reports */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 rounded-xl border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700">
                <h3 className="text-xl font-semibold text-white">Active Reports</h3>
              </div>
              <div className="p-6">
                {vehicleReports.length === 0 && crimeReports.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No active reports</p>
                ) : (
                  <div className="space-y-4">
                    {[...vehicleReports, ...crimeReports].map((report) => (
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
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            {new Date(report.created_at).toLocaleString()}
                          </span>
                          <CustomButton
                            onClick={() => handleDispatchReport(report)}
                            variant="primary"
                            size="sm"
                          >
                            Dispatch
                          </CustomButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active Responders */}
          <div>
            <div className="bg-gray-800/50 rounded-xl border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700">
                <h3 className="text-xl font-semibold text-white">Active Responders</h3>
              </div>
              <div className="p-6">
                {activeResponders.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No active responders</p>
                ) : (
                  <div className="space-y-4">
                    {activeResponders.map((responder) => (
                      <div key={responder.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-semibold text-white">
                              {responder.name || responder.email?.split('@')[0]}
                            </div>
                            <div className="text-sm text-gray-400">
                              {responder.status}
                            </div>
                          </div>
                          <div className={`w-3 h-3 rounded-full ${
                            responder.status === 'available' ? 'bg-green-500' :
                            responder.status === 'busy' ? 'bg-yellow-500' :
                            'bg-gray-500'
                          }`}></div>
                        </div>
                        {responder.currentLocation && (
                          <div className="text-sm text-gray-400 mb-3">
                            Location: {responder.currentLocation}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          Last update: {new Date().toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dispatch Log */}
        <div className="mt-6">
          <div className="bg-gray-800/50 rounded-xl border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-xl font-semibold text-white">Dispatch Log</h3>
            </div>
            <div className="p-6">
              {dispatchRecords.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No dispatch records</p>
              ) : (
                <div className="space-y-4">
                  {dispatchRecords.map((dispatch) => (
                    <div key={dispatch.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-semibold text-white">
                            Dispatch #{dispatch.id.slice(0, 8)}
                          </div>
                          <div className="text-sm text-gray-400">
                            Assigned to: {dispatch.assigned_to}
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            dispatch.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                            dispatch.status === 'en_route' ? 'bg-blue-500/20 text-blue-300' :
                            dispatch.status === 'dispatched' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-gray-500/20 text-gray-300'
                          }`}>
                            {dispatch.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(dispatch.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {dispatch.notes && (
                        <div className="text-sm text-gray-400 mb-3">
                          Notes: {dispatch.notes}
                        </div>
                      )}
                      <div className="flex space-x-2">
                        {['dispatched', 'en_route', 'on_scene', 'completed'].map((status) => (
                          <button
                            key={status}
                            onClick={() => handleUpdateDispatchStatus(dispatch.id, status as any)}
                            className={`text-xs px-3 py-1 rounded ${
                              dispatch.status === status ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-700'
                            }`}
                          >
                            Mark as {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Dispatch Modal */}
      {showDispatchModal && selectedReport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Dispatch Report</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Report</label>
                  <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                    {selectedReport.license_plate 
                      ? `Vehicle: ${selectedReport.license_plate}`
                      : `Crime: ${selectedReport.title}`
                    }
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Select Responder</label>
                  <select
                    value={dispatchForm.responderId}
                    onChange={(e) => setDispatchForm({...dispatchForm, responderId: e.target.value})}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Select a responder</option>
                    {activeResponders.map((responder) => (
                      <option key={responder.id} value={responder.id}>
                        {responder.name || responder.email?.split('@')[0]} ({responder.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Priority</label>
                  <select
                    value={dispatchForm.priority}
                    onChange={(e) => setDispatchForm({...dispatchForm, priority: e.target.value as any})}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Notes</label>
                  <textarea
                    value={dispatchForm.notes}
                    onChange={(e) => setDispatchForm({...dispatchForm, notes: e.target.value})}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white h-24"
                    placeholder="Special instructions for the responder..."
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <CustomButton
                  onClick={() => {
                    setShowDispatchModal(false);
                    setSelectedReport(null);
                  }}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </CustomButton>
                <CustomButton
                  onClick={confirmDispatch}
                  variant="primary"
                  className="flex-1"
                  disabled={!dispatchForm.responderId}
                >
                  Dispatch
                </CustomButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}