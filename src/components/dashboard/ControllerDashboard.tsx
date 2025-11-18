'use client';

import { useState, useEffect } from 'react';
import { reportsAPI, dispatchAPI, VehicleAlert, CrimeReport } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ControllerDashboardProps {
  user: any;
}

export default function ControllerDashboard({ user }: ControllerDashboardProps) {
  const [vehicleAlerts, setVehicleAlerts] = useState<VehicleAlert[]>([]);
  const [crimeReports, setCrimeReports] = useState<CrimeReport[]>([]);
  const [activeTab, setActiveTab] = useState('dispatch');
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);

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

  async function createDispatchLog(incidentId: string, incidentType: 'vehicle' | 'crime', action: string) {
    try {
      await dispatchAPI.createDispatchLog({
        incident_id: incidentId,
        incident_type: incidentType,
        assigned_to: user.id,
        action_taken: action,
        status: 'dispatched'
      });
      await loadData();
    } catch (error) {
      console.error('Error creating dispatch log:', error);
    }
  }

  const activeIncidents = [
    ...vehicleAlerts.filter(alert => alert.status === 'under_review'),
    ...crimeReports.filter(report => report.status === 'under_review')
  ];

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
        <h1 className="text-3xl font-bold text-gray-900">Controller Dashboard</h1>
        <p className="text-gray-600">Dispatch management and incident coordination</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Incidents</h3>
          <p className="text-3xl font-bold text-red-600">{activeIncidents.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Vehicle Alerts</h3>
          <p className="text-3xl font-bold text-orange-600">{vehicleAlerts.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Crime Reports</h3>
          <p className="text-3xl font-bold text-blue-600">{crimeReports.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Urgent Cases</h3>
          <p className="text-3xl font-bold text-purple-600">
            {vehicleAlerts.filter(v => v.severity === 'critical').length +
             crimeReports.filter(c => c.severity === 'critical').length}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-4">
          {['dispatch', 'vehicles', 'crimes', 'map'].map((tab) => (
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

      {/* Dispatch Center */}
      {activeTab === 'dispatch' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Active Incidents Requiring Dispatch</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {activeIncidents.map((incident) => (
              <div key={incident.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {incident.severity}
                      </span>
                      <h3 className="text-lg font-medium text-gray-900">
                        {'license_plate' in incident ? 
                          `Vehicle: ${incident.license_plate}` : 
                          `Crime: ${incident.title}`
                        }
                      </h3>
                    </div>
                    <p className="text-gray-600 mt-1">
                      {'license_plate' in incident ? incident.reason : incident.description.substring(0, 150)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Location: {'license_plate' in incident ? incident.last_seen_location : incident.location}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedIncident(incident);
                        setIsDispatchModalOpen(true);
                      }}
                    >
                      Dispatch
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const type = 'license_plate' in incident ? 'vehicle' : 'crime';
                        createDispatchLog(incident.id, type, 'Monitoring situation');
                      }}
                    >
                      Monitor
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {activeIncidents.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                No active incidents requiring dispatch
              </div>
            )}
          </div>
        </div>
      )}

      {/* Critical Vehicle Alerts */}
      {activeTab === 'vehicles' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Critical Vehicle Alerts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    License Plate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Seen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vehicleAlerts
                  .filter(alert => alert.severity === 'critical' || alert.severity === 'high')
                  .map((alert) => (
                  <tr key={alert.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {alert.license_plate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {alert.vehicle_make} {alert.vehicle_model} ({alert.vehicle_color})
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {alert.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {alert.last_seen_location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedIncident(alert);
                          setIsDispatchModalOpen(true);
                        }}
                      >
                        Dispatch Unit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dispatch Modal */}
      <Modal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        title="Dispatch Unit"
        size="md"
      >
        {selectedIncident && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900">Incident Details</h4>
              <p className="text-sm text-gray-600 mt-1">
                {'license_plate' in selectedIncident ? 
                  `Vehicle Alert: ${selectedIncident.license_plate}` : 
                  `Crime Report: ${selectedIncident.title}`
                }
              </p>
              <p className="text-sm text-gray-600">
                Location: {'license_plate' in selectedIncident ? 
                  selectedIncident.last_seen_location : 
                  selectedIncident.location
                }
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dispatch Instructions
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Enter dispatch instructions and unit assignment..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority Level
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical Priority</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => setIsDispatchModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const type = 'license_plate' in selectedIncident ? 'vehicle' : 'crime';
                  createDispatchLog(selectedIncident.id, type, 'Unit dispatched to location');
                  setIsDispatchModalOpen(false);
                }}
              >
                Dispatch Unit
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}