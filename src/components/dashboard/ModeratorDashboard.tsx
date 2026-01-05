'use client';

import { useState, useEffect } from 'react';
import { reportsAPI, VehicleAlert, CrimeReport, ReportStatus } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ModeratorDashboardProps {
  user: any;
}

export default function ModeratorDashboard({ user }: ModeratorDashboardProps) {
  const [vehicleAlerts, setVehicleAlerts] = useState<VehicleAlert[]>([]);
  const [crimeReports, setCrimeReports] = useState<CrimeReport[]>([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  async function updateReportStatus(reportId: string, type: 'vehicle' | 'crime', status: ReportStatus) {
    try {
      if (type === 'vehicle') {
        await reportsAPI.updateVehicleAlert(reportId, { status });
      } else {
        await reportsAPI.updateCrimeReport(reportId, { status });
      }
      await loadData();
    } catch (error) {
      console.error('Error updating report:', error);
    }
  }

  const pendingVehicles = vehicleAlerts.filter(alert => alert.status === 'pending');
  const pendingCrimes = crimeReports.filter(report => report.status === 'pending');

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
        <h1 className="text-3xl font-bold text-gray-900">Moderator Dashboard</h1>
        <p className="text-gray-600">Review and manage community reports</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Pending Vehicle Alerts</h3>
          <p className="text-3xl font-bold text-orange-600">{pendingVehicles.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Pending Crime Reports</h3>
          <p className="text-3xl font-bold text-red-600">{pendingCrimes.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Reports Today</h3>
          <p className="text-3xl font-bold text-blue-600">
            {vehicleAlerts.length + crimeReports.length}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-4">
          {['pending', 'vehicles', 'crimes'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Pending Reviews */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          {/* Pending Vehicle Alerts */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Pending Vehicle Alerts</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {pendingVehicles.slice(0, 5).map((alert) => (
                <div key={alert.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {alert.license_plate} - {alert.vehicle_make} {alert.vehicle_model}
                      </h3>
                      <p className="text-gray-600 mt-1">{alert.reason}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Last seen: {alert.last_seen_location} • {new Date(alert.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => updateReportStatus(alert.id, 'vehicle', 'approved' as ReportStatus)}
                      >
                        Review
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateReportStatus(alert.id, 'vehicle', 'resolved' as ReportStatus)}
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {pendingVehicles.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  No pending vehicle alerts
                </div>
              )}
            </div>
          </div>

          {/* Pending Crime Reports */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Pending Crime Reports</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {pendingCrimes.slice(0, 5).map((report) => (
                <div key={report.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{report.title}</h3>
                      <p className="text-gray-600 mt-1">{report.description.substring(0, 100)}...</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {report.location} • {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report);
                          setIsModalOpen(true);
                        }}
                      >
                        Review
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateReportStatus(report.id, 'crime', 'resolved' as ReportStatus)}
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {pendingCrimes.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  No pending crime reports
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Report Details"
        size="lg"
      >
        {selectedReport && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <p className="mt-1 text-sm text-gray-900">{selectedReport.title}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <p className="mt-1 text-sm text-gray-900">{selectedReport.description}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <p className="mt-1 text-sm text-gray-900">{selectedReport.location}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Incident Type</label>
              <p className="mt-1 text-sm text-gray-900">{selectedReport.report_type}</p>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => updateReportStatus(selectedReport.id, 'crime', 'rejected' as ReportStatus)}
              >
                Reject
              </Button>
              <Button
                variant="primary"
                onClick={() => updateReportStatus(selectedReport.id, 'crime', 'approved' as ReportStatus)}
              >
                Mark Under Review
              </Button>
              <Button
                variant="primary"
                onClick={() => updateReportStatus(selectedReport.id, 'crime', 'resolved' as ReportStatus)}
              >
                Resolve
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}