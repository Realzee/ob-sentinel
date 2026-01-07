'use client';

import { useState, useEffect } from 'react';
import { reportsAPI, VehicleAlert, CrimeReport } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface UserDashboardProps {
  user: any;
}

export default function UserDashboard({ user }: UserDashboardProps) {
  const [vehicleAlerts, setVehicleAlerts] = useState<VehicleAlert[]>([]);
  const [crimeReports, setCrimeReports] = useState<CrimeReport[]>([]);
  const [activeTab, setActiveTab] = useState('report');
  const [loading, setLoading] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<'vehicle' | 'crime'>('vehicle');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [vehiclesData, crimesData] = await Promise.all([
        reportsAPI.getVehicleAlerts(),
        reportsAPI.getCrimeReports()
      ]);
      setVehicleAlerts(vehiclesData);
      setCrimeReports(crimesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function submitReport(formData: any) {
    try {
      if (reportType === 'vehicle') {
        await reportsAPI.createVehicleAlert({
          ...formData,
          reported_by: user.id,
          status: 'pending'
        });
      } else {
        await reportsAPI.createCrimeReport({
          ...formData,
          reported_by: user.id,
          status: 'pending'
        });
      }
      await loadData();
      setIsReportModalOpen(false);
    } catch (error) {
      console.error('Error submitting report:', error);
    }
  }

  const userReports = {
    vehicles: vehicleAlerts.filter(alert => alert.reported_by === user.id),
    crimes: crimeReports.filter(report => report.reported_by === user.id)
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="lg" className="mx-auto" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Community Safety Dashboard</h1>
        <p className="text-gray-600">Report incidents and view community alerts</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <Button
            variant="primary"
            onClick={() => {
              setReportType('vehicle');
              setIsReportModalOpen(true);
            }}
            className="w-full"
          >
            Report Suspicious Vehicle
          </Button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <Button
            variant="primary"
            onClick={() => {
              setReportType('crime');
              setIsReportModalOpen(true);
            }}
            className="w-full"
          >
            Report Crime Incident
          </Button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">My Reports</h3>
          <p className="text-3xl font-bold text-blue-600">
            {userReports.vehicles.length + userReports.crimes.length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Community Alerts</h3>
          <p className="text-3xl font-bold text-orange-600">
            {vehicleAlerts.length + crimeReports.length}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-4">
          {['report', 'my_reports', 'alerts', 'map'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </button>
          ))}
        </nav>
      </div>

      {/* My Reports */}
      {activeTab === 'my_reports' && (
        <div className="space-y-6">
          {/* My Vehicle Reports */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">My Vehicle Reports</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {userReports.vehicles.map((alert) => (
                <div key={alert.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {alert.license_plate} - {alert.vehicle_make} {alert.vehicle_model}
                      </h3>
                      <p className="text-gray-600 mt-1">{alert.reason}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          alert.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          alert.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          String(alert.status) === 'under_review' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {String(alert.status).replace('_', ' ')}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(alert.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {userReports.vehicles.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  No vehicle reports submitted yet
                </div>
              )}
            </div>
          </div>

          {/* My Crime Reports */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">My Crime Reports</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {userReports.crimes.map((report) => (
                <div key={report.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{report.title}</h3>
                      <p className="text-gray-600 mt-1">{report.description.substring(0, 100)}...</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          String(report.status) === 'under_review' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {String(report.status).replace('_', ' ')}
                        </span>
                        <span className="text-sm text-gray-500">
                          {report.location} • {new Date(report.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {userReports.crimes.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  No crime reports submitted yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Community Alerts */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {/* Vehicle Alerts */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Community Vehicle Alerts</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {vehicleAlerts.slice(0, 10).map((alert) => (
                <div key={alert.id} className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {alert.severity}
                    </span>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {alert.license_plate} - {alert.vehicle_make} {alert.vehicle_model} ({alert.vehicle_color})
                      </h3>
                      <p className="text-gray-600 mt-1">{alert.reason}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Last seen: {alert.last_seen_location} • {new Date(alert.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Crime Reports */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Community Crime Reports</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {crimeReports.slice(0, 10).map((report) => (
                <div key={report.id} className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      report.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      report.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {report.severity}
                    </span>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{report.title}</h3>
                      <p className="text-gray-600 mt-1">{report.description.substring(0, 150)}...</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {report.location} • {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title={reportType === 'vehicle' ? 'Report Suspicious Vehicle' : 'Report Crime Incident'}
        size="lg"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const data = Object.fromEntries(formData);
          submitReport(data);
        }}>
          <div className="space-y-4">
            {reportType === 'vehicle' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">License Plate *</label>
                    <input
                      type="text"
                      name="license_plate"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vehicle Make *</label>
                    <input
                      type="text"
                      name="vehicle_make"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vehicle Model</label>
                    <input
                      type="text"
                      name="vehicle_model"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Color</label>
                    <input
                      type="text"
                      name="vehicle_color"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason for Alert *</label>
                  <textarea
                    name="reason"
                    required
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Why is this vehicle suspicious?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Seen Location *</label>
                  <input
                    type="text"
                    name="last_seen_location"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Incident Title *</label>
                  <input
                    type="text"
                    name="title"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description *</label>
                  <textarea
                    name="description"
                    required
                    rows={4}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Please provide detailed information about the incident..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location *</label>
                    <input
                      type="text"
                      name="location"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Incident Type</label>
                    <select
                      name="report_type"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="theft">Theft</option>
                      <option value="assault">Assault</option>
                      <option value="vandalism">Vandalism</option>
                      <option value="suspicious_activity">Suspicious Activity</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </>
            )}
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => setIsReportModalOpen(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
              >
                Submit Report
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}