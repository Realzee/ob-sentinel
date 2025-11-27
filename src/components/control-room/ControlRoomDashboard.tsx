// src/components/control-room/ControlRoomDashboard.tsx
import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Shield, 
  Users, 
  MapPin, 
  Car, 
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { reportsAPI, getDataFromPaginatedResponse, type VehicleAlert, type CrimeReport, type DashboardStats } from '@/lib/supabase';

const ControlRoomDashboard: React.FC = () => {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [vehicleAlerts, setVehicleAlerts] = useState<VehicleAlert[]>([]);
  const [crimeReports, setCrimeReports] = useState<CrimeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'vehicles' | 'crimes'>('vehicles');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [stats, vehiclesResponse, crimesResponse] = await Promise.all([
        reportsAPI.getDashboardStats(),
        reportsAPI.getVehicleAlerts(),
        reportsAPI.getCrimeReports()
      ]);

      setDashboardStats(stats);
      
      // Extract data from PaginatedResponse
      setVehicleAlerts(getDataFromPaginatedResponse(vehiclesResponse));
      setCrimeReports(getDataFromPaginatedResponse(crimesResponse));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadDashboardData();
  };

  // Filter functions using the data arrays
  const filteredVehicleAlerts = vehicleAlerts.filter(alert => {
    const matchesSearch = 
      alert.license_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.vehicle_make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.vehicle_model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.reason.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const filteredCrimeReports = crimeReports.filter(report => {
    const matchesSearch = 
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.report_type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || report.severity === severityFilter;

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'recovered': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSeverityFilter('all');
  };

  const formatDisplayDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting display date:', error);
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Control Room Dashboard</h1>
          <p className="text-gray-600">
            Real-time monitoring and management of security incidents
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={refreshData}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600">Today&apos;s Reports</h3>
            <FileText className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold mt-2">{dashboardStats?.todayReports || 0}</div>
          <p className="text-xs text-gray-500 mt-1">
            New incidents reported today
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600">Active Incidents</h3>
            <AlertTriangle className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold mt-2">{dashboardStats?.activeReports || 0}</div>
          <p className="text-xs text-gray-500 mt-1">
            Currently being investigated
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600">Critical Alerts</h3>
            <Shield className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-red-600 mt-2">{dashboardStats?.criticalReports || 0}</div>
          <p className="text-xs text-gray-500 mt-1">
            Require immediate attention
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600">Resolved Cases</h3>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold mt-2">
            {(dashboardStats?.resolvedVehicles || 0) + (dashboardStats?.resolvedCrimes || 0)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Successfully resolved incidents
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports, license plates, locations..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
              </select>
              <Filter className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={severityFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSeverityFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <Filter className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {(searchQuery || statusFilter !== 'all' || severityFilter !== 'all') && (
              <button 
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reports Tabs */}
      <div className="space-y-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'vehicles'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Car className="h-4 w-4" />
              Vehicle Alerts ({filteredVehicleAlerts.length})
            </button>
            <button
              onClick={() => setActiveTab('crimes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'crimes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="h-4 w-4" />
              Crime Reports ({filteredCrimeReports.length})
            </button>
          </nav>
        </div>

        {/* Vehicle Alerts Tab */}
        {activeTab === 'vehicles' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Vehicle Alerts</h2>
              </div>
              <div className="p-6">
                {filteredVehicleAlerts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No vehicle alerts found matching your criteria</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium">License Plate</th>
                          <th className="text-left py-3 px-4 font-medium">Vehicle</th>
                          <th className="text-left py-3 px-4 font-medium">Reason</th>
                          <th className="text-left py-3 px-4 font-medium">Location</th>
                          <th className="text-left py-3 px-4 font-medium">Severity</th>
                          <th className="text-left py-3 px-4 font-medium">Status</th>
                          <th className="text-left py-3 px-4 font-medium">Reported</th>
                          <th className="text-left py-3 px-4 font-medium">OB Number</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredVehicleAlerts.map((alert) => (
                          <tr key={alert.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-mono font-bold">
                              {alert.license_plate}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium">
                                {alert.vehicle_make} {alert.vehicle_model}
                              </div>
                              <div className="text-sm text-gray-500">
                                {alert.vehicle_color} {alert.year || ''}
                              </div>
                            </td>
                            <td className="py-3 px-4 max-w-xs truncate">
                              {alert.reason}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="text-sm">{alert.last_seen_location}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                                {alert.severity.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(alert.status)}`}>
                                {alert.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {formatDisplayDate(alert.created_at)}
                            </td>
                            <td className="py-3 px-4 font-mono text-sm">
                              {alert.ob_number}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Crime Reports Tab */}
        {activeTab === 'crimes' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Crime Reports</h2>
              </div>
              <div className="p-6">
                {filteredCrimeReports.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No crime reports found matching your criteria</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium">Title</th>
                          <th className="text-left py-3 px-4 font-medium">Type</th>
                          <th className="text-left py-3 px-4 font-medium">Location</th>
                          <th className="text-left py-3 px-4 font-medium">Description</th>
                          <th className="text-left py-3 px-4 font-medium">Severity</th>
                          <th className="text-left py-3 px-4 font-medium">Status</th>
                          <th className="text-left py-3 px-4 font-medium">Incident Time</th>
                          <th className="text-left py-3 px-4 font-medium">OB Number</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCrimeReports.map((report) => (
                          <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">
                              {report.title}
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                {report.report_type.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="text-sm">{report.location}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 max-w-xs">
                              <div className="truncate" title={report.description}>
                                {report.description}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(report.severity)}`}>
                                {report.severity.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
                                {report.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {report.incident_time 
                                ? formatDisplayDate(report.incident_time)
                                : 'Unknown'
                              }
                            </td>
                            <td className="py-3 px-4 font-mono text-sm">
                              {report.ob_number}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            <Car className="h-4 w-4" />
            New Vehicle Alert
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            <FileText className="h-4 w-4" />
            New Crime Report
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            <Users className="h-4 w-4" />
            Manage Users
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            <MapPin className="h-4 w-4" />
            View Map
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlRoomDashboard;