// components/control-room/ControlRoomDashboard.tsx (Enhanced with modals)
'use client';

import { useState, useEffect } from 'react';
import { reportsAPI, authAPI } from '@/lib/supabase';
import LiveMap from './LiveMap';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import CustomButton from '@/components/ui/CustomButton';

export default function ControlRoomDashboard() {
  const [vehicleReports, setVehicleReports] = useState<any[]>([]);
  const [crimeReports, setCrimeReports] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'vehicles' | 'crimes'>('overview');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger' as 'danger' | 'warning' | 'success'
  });

  useEffect(() => {
    setIsClient(true);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [vehiclesData, crimesData, statsData] = await Promise.all([
        reportsAPI.getVehicleAlerts(),
        reportsAPI.getCrimeReports(),
        reportsAPI.getDashboardStats()
      ]);

      const activeVehicles = vehiclesData.filter((vehicle: any) => 
        ['active', 'pending'].includes(vehicle.status)
      );
      
      const activeCrimes = crimesData.filter((crime: any) => 
        ['active', 'pending'].includes(crime.status)
      );

      setVehicleReports(activeVehicles);
      setCrimeReports(activeCrimes);
      setStats(statsData);
      
    } catch (error) {
      console.error('Error loading control room data:', error);
    } finally {
      setLoading(false);
    }
  };

  const showConfirmationModal = (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'success';
  }) => {
    setModalConfig({
      ...config,
      variant: config.variant || 'danger'
    });
    setModalOpen(true);
  };

  const handleResolveReport = async (reportId: string, type: 'vehicle' | 'crime') => {
    showConfirmationModal({
      title: 'Resolve Report',
      message: `Are you sure you want to mark this ${type} report as resolved?`,
      variant: 'success',
      onConfirm: async () => {
        try {
          if (type === 'vehicle') {
            await reportsAPI.updateVehicleAlert(reportId, { status: 'resolved' });
            setVehicleReports(prev => prev.filter(report => report.id !== reportId));
          } else {
            await reportsAPI.updateCrimeReport(reportId, { status: 'resolved' });
            setCrimeReports(prev => prev.filter(report => report.id !== reportId));
          }
          setModalOpen(false);
        } catch (error) {
          console.error('Error resolving report:', error);
        }
      }
    });
  };

  const handleEscalateReport = async (reportId: string, type: 'vehicle' | 'crime') => {
    showConfirmationModal({
      title: 'Escalate Report',
      message: `Are you sure you want to escalate this ${type} report to critical priority?`,
      variant: 'warning',
      onConfirm: async () => {
        try {
          if (type === 'vehicle') {
            await reportsAPI.updateVehicleAlert(reportId, { severity: 'critical' });
            setVehicleReports(prev => prev.map(report => 
              report.id === reportId ? { ...report, severity: 'critical' } : report
            ));
          } else {
            await reportsAPI.updateCrimeReport(reportId, { severity: 'critical' });
            setCrimeReports(prev => prev.map(report => 
              report.id === reportId ? { ...report, severity: 'critical' } : report
            ));
          }
          setModalOpen(false);
        } catch (error) {
          console.error('Error escalating report:', error);
        }
      }
    });
  };

  const handleExportData = () => {
    showConfirmationModal({
      title: 'Export Data',
      message: 'This will export all current reports data. Do you want to continue?',
      variant: 'success',
      onConfirm: () => {
        // Implement export functionality
        console.log('Exporting data...');
        setModalOpen(false);
      }
    });
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading Control Room...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading Control Room Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        variant={modalConfig.variant}
      />

      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <h1 className="text-xl font-bold text-white">Control Room</h1>
              <div className="flex space-x-1">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'vehicles', label: 'Vehicle Alerts' },
                  { id: 'crimes', label: 'Crime Reports' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <CustomButton
                onClick={loadData}
                disabled={loading}
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
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Stats and Map */}
            <div className="lg:col-span-2">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { value: stats?.activeReports || 0, label: "Active Reports", color: "bg-orange-600" },
                  { value: vehicleReports.length, label: "Vehicle Alerts", color: "bg-red-600" },
                  { value: crimeReports.length, label: "Crime Reports", color: "bg-blue-600" },
                  { value: stats?.todayReports || 0, label: "Today's Total", color: "bg-green-600" }
                ].map((stat, index) => (
                  <div key={index} className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-white">{stat.value}</div>
                        <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${stat.color}`}></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Map */}
              <div className="mb-6">
                <LiveMap vehicleReports={vehicleReports} crimeReports={crimeReports} />
              </div>

              {/* Recent Activity */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
                <div className="px-6 py-4 border-b border-gray-700">
                  <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {[...vehicleReports.slice(0, 3), ...crimeReports.slice(0, 2)].map((report, index) => (
                      <div key={report.id || index} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            report.license_plate ? 'bg-red-500' : 'bg-blue-500'
                          }`}></div>
                          <div>
                            <div className="font-semibold text-white">
                              {report.license_plate ? `Vehicle: ${report.license_plate}` : `Crime: ${report.title}`}
                            </div>
                            <div className="text-sm text-gray-400">
                              {report.last_seen_location || report.location}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(report.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right column - Quick Actions */}
            <div className="space-y-6">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <CustomButton
                    onClick={() => window.open('/bolo-generator', '_blank')}
                    variant="primary"
                    size="md"
                    className="w-full"
                  >
                    Generate BOLO Report
                  </CustomButton>
                  <CustomButton
                    onClick={handleExportData}
                    variant="success"
                    size="md"
                    className="w-full"
                  >
                    Export Data
                  </CustomButton>
                  <CustomButton
                    variant="secondary"
                    size="md"
                    className="w-full"
                  >
                    System Status
                  </CustomButton>
                </div>
              </div>
              
              {/* System Status */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">API</span>
                    <span className="text-green-400 text-sm font-medium">Online</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Database</span>
                    <span className="text-green-400 text-sm font-medium">Connected</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Reports</span>
                    <span className="text-blue-400 text-sm font-medium">Active</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Map Service</span>
                    <span className="text-green-400 text-sm font-medium">Online</span>
                  </div>
                </div>
              </div>

              {/* Alert Summary */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Alert Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Critical</span>
                    <span className="text-red-400 font-semibold">
                      {vehicleReports.filter(v => v.severity === 'critical').length + 
                       crimeReports.filter(c => c.severity === 'critical').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">High Priority</span>
                    <span className="text-orange-400 font-semibold">
                      {vehicleReports.filter(v => v.severity === 'high').length + 
                       crimeReports.filter(c => c.severity === 'high').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Medium Priority</span>
                    <span className="text-yellow-400 font-semibold">
                      {vehicleReports.filter(v => v.severity === 'medium').length + 
                       crimeReports.filter(c => c.severity === 'medium').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vehicle Alerts Tab */}
        {activeTab === 'vehicles' && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">Active Vehicle Alerts</h3>
                <span className="text-sm text-gray-400 bg-gray-900 px-3 py-1 rounded-full">
                  {vehicleReports.length} active
                </span>
              </div>
              <div className="p-6">
                {vehicleReports.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No active vehicle alerts</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicleReports.map((report) => (
                      <div key={report.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-semibold text-white text-lg">{report.license_plate}</div>
                            <div className="text-sm text-gray-400">
                              {report.vehicle_make} {report.vehicle_model} • {report.vehicle_color}
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
                        <div className="text-sm text-gray-400 mb-3">
                          <div>Location: {report.last_seen_location}</div>
                          <div>Reported: {new Date(report.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="flex space-x-2">
                          <CustomButton
                            onClick={() => handleResolveReport(report.id, 'vehicle')}
                            variant="success"
                            size="sm"
                          >
                            Resolve
                          </CustomButton>
                          <CustomButton
                            onClick={() => handleEscalateReport(report.id, 'vehicle')}
                            variant="danger"
                            size="sm"
                          >
                            Escalate
                          </CustomButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Crime Reports Tab */}
        {activeTab === 'crimes' && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">Active Crime Reports</h3>
                <span className="text-sm text-gray-400 bg-gray-900 px-3 py-1 rounded-full">
                  {crimeReports.length} active
                </span>
              </div>
              <div className="p-6">
                {crimeReports.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No active crime reports</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {crimeReports.map((report) => (
                      <div key={report.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-semibold text-white text-lg">{report.title}</div>
                            <div className="text-sm text-gray-400">
                              {report.report_type} • {report.location}
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
                        <div className="text-sm text-gray-400 mb-3">
                          <div>Reported: {new Date(report.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="flex space-x-2">
                          <CustomButton
                            onClick={() => handleResolveReport(report.id, 'crime')}
                            variant="success"
                            size="sm"
                          >
                            Resolve
                          </CustomButton>
                          <CustomButton
                            onClick={() => handleEscalateReport(report.id, 'crime')}
                            variant="danger"
                            size="sm"
                          >
                            Escalate
                          </CustomButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}