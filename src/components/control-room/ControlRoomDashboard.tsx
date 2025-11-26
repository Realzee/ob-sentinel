// components/control-room/ControlRoomDashboard.tsx
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

  // Ensure this only runs on client side
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

      // Filter active reports only for control room
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

  // Show loading state during SSR
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
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">Control Room</h1>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Stats and Reports */}
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

            {/* Reports Sections */}
            <div className="space-y-6">
              {/* Vehicle Reports */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
                <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-white">Active Vehicle Alerts</h3>
                  <span className="text-sm text-gray-400 bg-gray-900 px-3 py-1 rounded-full">
                    {vehicleReports.length} active
                  </span>
                </div>
                <div className="p-6">
                  {vehicleReports.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No active vehicle alerts</p>
                  ) : (
                    <div className="space-y-3">
                      {vehicleReports.slice(0, 5).map((report) => (
                        <div key={report.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-white">{report.license_plate}</div>
                              <div className="text-sm text-gray-400">
                                {report.vehicle_make} {report.vehicle_model} • {report.vehicle_color}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {report.last_seen_location} • {new Date(report.created_at).toLocaleDateString()}
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Crime Reports */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
                <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-white">Active Crime Reports</h3>
                  <span className="text-sm text-gray-400 bg-gray-900 px-3 py-1 rounded-full">
                    {crimeReports.length} active
                  </span>
                </div>
                <div className="p-6">
                  {crimeReports.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No active crime reports</p>
                  ) : (
                    <div className="space-y-3">
                      {crimeReports.slice(0, 5).map((report) => (
                        <div key={report.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-white">{report.title}</div>
                              <div className="text-sm text-gray-400">
                                {report.report_type} • {report.location}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(report.created_at).toLocaleDateString()}
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
                        </div>
                      ))}
                    </div>
                  )}
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
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}