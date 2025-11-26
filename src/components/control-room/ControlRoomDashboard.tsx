// components/control-room/ControlRoomDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/components/providers/AuthProvider';

// Dynamically import the map component to avoid SSR issues
const OpenStreetMap = dynamic(() => import('./OpenStreetMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
        <p className="text-white mt-2">Loading Map...</p>
      </div>
    </div>
  ),
});

interface Report {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  location: {
    lat: number;
    lng: number;
  };
  timestamp: string;
  assignedController?: string;
}

export default function ControlRoomDashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([
    {
      id: '1',
      title: 'Power Outage',
      description: 'Complete power outage in downtown area',
      status: 'pending',
      priority: 'high',
      location: { lat: 40.7128, lng: -74.0060 },
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Water Leak',
      description: 'Major water leak reported on Main Street',
      status: 'in-progress',
      priority: 'medium',
      location: { lat: 40.7589, lng: -73.9851 },
      timestamp: new Date().toISOString(),
      assignedController: user?.email,
    },
    {
      id: '3',
      title: 'Traffic Signal Failure',
      description: 'Traffic signal not working at intersection',
      status: 'pending',
      priority: 'high',
      location: { lat: 40.7505, lng: -73.9934 },
      timestamp: new Date().toISOString(),
    },
  ]);

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [activeTab, setActiveTab] = useState<'reports' | 'map' | 'controllers'>('reports');

  // Update reports when user changes
  useEffect(() => {
    if (user) {
      setReports(prev => prev.map(report => 
        report.assignedController && report.assignedController === user.email 
          ? { ...report, assignedController: user.email }
          : report
      ));
    }
  }, [user]);

  const handleAssignToMe = (reportId: string) => {
    setReports(reports.map(report => 
      report.id === reportId 
        ? { ...report, status: 'in-progress', assignedController: user?.email }
        : report
    ));
  };

  const handleResolveReport = (reportId: string) => {
    setReports(reports.map(report => 
      report.id === reportId 
        ? { ...report, status: 'resolved' }
        : report
    ));
  };

  const handleAddReport = () => {
    const newReport: Report = {
      id: Date.now().toString(),
      title: 'New Incident',
      description: 'Description of the new incident',
      status: 'pending',
      priority: 'medium',
      location: { lat: 40.7128, lng: -74.0060 },
      timestamp: new Date().toISOString(),
    };
    setReports([...reports, newReport]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'in-progress': return 'bg-blue-500';
      case 'resolved': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Tabs */}
      <div className="flex space-x-1 mb-6">
        {[
          { id: 'reports', label: 'Incident Reports' },
          { id: 'map', label: 'Live Map' },
          { id: 'controllers', label: 'Controller Actions' },
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

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reports List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Incident Reports</h2>
              <button
                onClick={handleAddReport}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                + New Report
              </button>
            </div>
            
            <div className="space-y-4">
              {reports.map(report => (
                <div
                  key={report.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedReport?.id === report.id
                      ? 'border-red-500 bg-gray-800'
                      : 'border-gray-700 bg-gray-900 hover:bg-gray-800'
                  }`}
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-white">{report.title}</h3>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs text-white ${getPriorityColor(report.priority)}`}>
                        {report.priority}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{report.description}</p>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{new Date(report.timestamp).toLocaleString()}</span>
                    <span>{report.assignedController || 'Unassigned'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report Details */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Report Details</h3>
              {selectedReport ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm">Title</label>
                    <p className="text-white font-medium">{selectedReport.title}</p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Description</label>
                    <p className="text-white">{selectedReport.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm">Status</label>
                      <p className="text-white">
                        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${getStatusColor(selectedReport.status)}`}></span>
                        {selectedReport.status}
                      </p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Priority</label>
                      <p className="text-white">
                        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${getPriorityColor(selectedReport.priority)}`}></span>
                        {selectedReport.priority}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Assigned To</label>
                    <p className="text-white">{selectedReport.assignedController || 'Unassigned'}</p>
                  </div>
                  <div className="space-y-2">
                    {selectedReport.status === 'pending' && (
                      <button
                        onClick={() => handleAssignToMe(selectedReport.id)}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Assign to Me
                      </button>
                    )}
                    {selectedReport.status === 'in-progress' && selectedReport.assignedController === user?.email && (
                      <button
                        onClick={() => handleResolveReport(selectedReport.id)}
                        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Mark as Resolved
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-center">Select a report to view details</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map Tab */}
      {activeTab === 'map' && (
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white">Live Incident Map</h2>
            <p className="text-gray-400">Real-time visualization of all reported incidents</p>
          </div>
          <div className="h-96">
            <OpenStreetMap reports={reports} onReportSelect={setSelectedReport} />
          </div>
        </div>
      )}

      {/* Controller Actions Tab */}
      {activeTab === 'controllers' && (
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4">Controller Actions</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                    Send Alert
                  </button>
                  <button className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors">
                    Request Backup
                  </button>
                  <button className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
                    Emergency Protocol
                  </button>
                </div>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">System Status</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Controllers</span>
                    <span className="text-green-500">12</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pending Reports</span>
                    <span className="text-yellow-500">{reports.filter(r => r.status === 'pending').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Incidents</span>
                    <span className="text-red-500">{reports.filter(r => r.status === 'in-progress').length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">Your Activity</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Assigned Reports</span>
                    <span className="text-white">{reports.filter(r => r.assignedController === user?.email).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Resolved Today</span>
                    <span className="text-green-500">3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Response Time</span>
                    <span className="text-white">12m</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Activity Log</h3>
              <div className="space-y-2">
                {reports.slice(0, 5).map(report => (
                  <div key={report.id} className="flex items-center space-x-3 text-sm">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(report.status)}`}></span>
                    <span className="text-gray-400 flex-1">{report.title}</span>
                    <span className="text-gray-500">{new Date(report.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}