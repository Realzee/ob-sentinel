// components/control-room/ControlRoomDashboard.tsx (Enhanced with monitoring features)
'use client';

import { useState, useEffect } from 'react';
import { reportsAPI, authAPI, AuditLog as SupabaseAuditLog, DispatchRecord as SupabaseDispatchRecord } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import LiveMap from './LiveMapWrapper';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import CustomButton from '@/components/ui/CustomButton';

// Local interfaces that match the expected types
interface AuditLog {
  id: string;
  action: string;
  report_id: string;
  report_type: 'vehicle' | 'crime';
  user_id: string;
  user_email: string;
  timestamp: string;
  details: any;
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
  created_at: string;
  updated_at: string;
}

export default function ControlRoomDashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [vehicleReports, setVehicleReports] = useState<any[]>([]);
  const [crimeReports, setCrimeReports] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'vehicles' | 'crimes' | 'dispatch' | 'audit'>('overview');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dispatchRecords, setDispatchRecords] = useState<DispatchRecord[]>([]);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [dispatchForm, setDispatchForm] = useState({
    assignedTo: '',
    notes: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical'
  });
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger' as 'danger' | 'warning' | 'success'
  });

  useEffect(() => {
    setIsClient(true);
    loadData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    setRefreshInterval(interval);
    
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [vehiclesData, crimesData, statsData, auditData, dispatchData] = await Promise.all([
        reportsAPI.getVehicleAlerts(),
        reportsAPI.getCrimeReports(),
        reportsAPI.getDashboardStats(),
        reportsAPI.getAuditLogs(),
        reportsAPI.getDispatchRecords()
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
      
      // Filter out 'system' audit logs and convert to local type
      const filteredAuditLogs = (auditData as SupabaseAuditLog[])
        .filter(log => log.report_type !== 'system')
        .map(log => ({
          ...log,
          report_type: log.report_type as 'vehicle' | 'crime'
        }));
      setAuditLogs(filteredAuditLogs);
      
      // Convert dispatch records to local type
      setDispatchRecords(dispatchData as DispatchRecord[]);
      
    } catch (error) {
      console.error('Error loading control room data:', error);
    } finally {
      setLoading(false);
    }
  };

  const logAuditAction = async (action: string, reportId: string, reportType: 'vehicle' | 'crime', details: any) => {
    try {
      // Ensure user data exists
      if (!user?.id || !user?.email) {
        console.error('User data not available for audit logging');
        return;
      }
      
      await reportsAPI.logAuditAction({
        action,
        report_id: reportId,
        report_type: reportType,
        user_id: user.id,
        user_email: user.email,
        details
      });
    } catch (error) {
      console.error('Error logging audit action:', error);
    }
  };

  const getReportAgeColor = (createdAt: string) => {
    const hours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    if (hours > 24) return 'bg-red-500';
    if (hours > 12) return 'bg-orange-500';
    if (hours > 6) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-500';
      case 'active': return 'bg-blue-500';
      case 'dispatched': return 'bg-purple-500';
      case 'en_route': return 'bg-indigo-500';
      case 'on_scene': return 'bg-green-500';
      case 'resolved': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const handleLogout = async () => {
    showConfirmationModal({
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      variant: 'warning',
      onConfirm: async () => {
        await signOut();
        setModalOpen(false);
      }
    });
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
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
            await logAuditAction('resolve', reportId, 'vehicle', { status: 'resolved' });
          } else {
            await reportsAPI.updateCrimeReport(reportId, { status: 'resolved' });
            setCrimeReports(prev => prev.filter(report => report.id !== reportId));
            await logAuditAction('resolve', reportId, 'crime', { status: 'resolved' });
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
            await logAuditAction('escalate', reportId, 'vehicle', { severity: 'critical' });
          } else {
            await reportsAPI.updateCrimeReport(reportId, { severity: 'critical' });
            setCrimeReports(prev => prev.map(report => 
              report.id === reportId ? { ...report, severity: 'critical' } : report
            ));
            await logAuditAction('escalate', reportId, 'crime', { severity: 'critical' });
          }
          setModalOpen(false);
        } catch (error) {
          console.error('Error escalating report:', error);
        }
      }
    });
  };

  const handleOpenDispatchModal = (report: any) => {
    setSelectedReport(report);
    setDispatchModalOpen(true);
  };

  const handleDispatch = async () => {
    if (!selectedReport) return;
    
    try {
      const dispatchRecord = await reportsAPI.createDispatchRecord({
        report_id: selectedReport.id,
        report_type: selectedReport.license_plate ? 'vehicle' : 'crime',
        assigned_to: dispatchForm.assignedTo,
        status: 'dispatched',
        notes: dispatchForm.notes,
        priority: dispatchForm.priority
      });
      
      // Type assertion to local DispatchRecord type
      setDispatchRecords(prev => [...prev, dispatchRecord as DispatchRecord]);
      
      // Update report status
      if (selectedReport.license_plate) {
        await reportsAPI.updateVehicleAlert(selectedReport.id, { status: 'dispatched' });
      } else {
        await reportsAPI.updateCrimeReport(selectedReport.id, { status: 'dispatched' });
      }
      
      await logAuditAction('dispatch', selectedReport.id, 
        selectedReport.license_plate ? 'vehicle' : 'crime', 
        dispatchForm
      );
      
      setDispatchModalOpen(false);
      setDispatchForm({ assignedTo: '', notes: '', priority: 'medium' });
      setSelectedReport(null);
      
    } catch (error) {
      console.error('Error creating dispatch record:', error);
    }
  };

  const handleUpdateDispatchStatus = async (dispatchId: string, newStatus: DispatchRecord['status']) => {
    try {
      await reportsAPI.updateDispatchRecord(dispatchId, { status: newStatus });
      setDispatchRecords(prev => prev.map(record => 
        record.id === dispatchId ? { ...record, status: newStatus } : record
      ));
    } catch (error) {
      console.error('Error updating dispatch status:', error);
    }
  };

  const handleExportData = () => {
    showConfirmationModal({
      title: 'Export Data',
      message: 'This will export all current reports and audit data. Do you want to continue?',
      variant: 'success',
      onConfirm: async () => {
        try {
          // Implement export with audit trail
          const exportData = {
            timestamp: new Date().toISOString(),
            exported_by: user?.email,
            vehicleReports,
            crimeReports,
            auditLogs: auditLogs.slice(0, 100), // Last 100 entries
            dispatchRecords,
            stats
          };
          
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `control-room-export-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          // Log system audit action
          if (user?.id && user?.email) {
            try {
              await reportsAPI.logAuditAction({
                action: 'export',
                report_id: 'all',
                report_type: 'system',
                user_id: user.id,
                user_email: user.email,
                details: { type: 'full_export' }
              });
            } catch (auditError) {
              console.error('Error logging export audit:', auditError);
            }
          }
          
          setModalOpen(false);
        } catch (error) {
          console.error('Error exporting data:', error);
        }
      }
    });
  };

  // Check if user is admin for dashboard access
  const isAdmin = user?.user_metadata?.role === 'admin';

  if (!isClient || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading Control Room...</p>
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

      {/* Dispatch Modal */}
      {dispatchModalOpen && selectedReport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Dispatch Resources</h3>
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
                  <label className="block text-sm text-gray-400 mb-1">Assign To</label>
                  <input
                    type="text"
                    value={dispatchForm.assignedTo}
                    onChange={(e) => setDispatchForm({...dispatchForm, assignedTo: e.target.value})}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    placeholder="Unit/Team/Personnel"
                  />
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
                  <label className="block text-sm text-gray-400 mb-1">Notes/Special Instructions</label>
                  <textarea
                    value={dispatchForm.notes}
                    onChange={(e) => setDispatchForm({...dispatchForm, notes: e.target.value})}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white h-24"
                    placeholder="Special instructions, conditions, etc."
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <CustomButton
                  onClick={() => {
                    setDispatchModalOpen(false);
                    setSelectedReport(null);
                  }}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </CustomButton>
                <CustomButton
                  onClick={handleDispatch}
                  variant="primary"
                  className="flex-1"
                >
                  Dispatch
                </CustomButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-black/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                {isAdmin && (
                  <CustomButton
                    onClick={handleGoToDashboard}
                    variant="secondary"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Dashboard</span>
                  </CustomButton>
                )}
                <h1 className="text-xl font-bold text-white">Control Room</h1>
              </div>
              <div className="flex space-x-1">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'vehicles', label: 'Vehicle Alerts' },
                  { id: 'crimes', label: 'Crime Reports' },
                  { id: 'dispatch', label: 'Dispatch Log' },
                  { id: 'audit', label: 'Audit Trail' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.id
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
              <div className="flex items-center space-x-3">
                <span className="text-gray-300 text-sm">
                  {user?.email}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${user?.user_metadata?.role === 'admin' ? 'bg-purple-500/20 text-purple-300' :
                    user?.user_metadata?.role === 'moderator' ? 'bg-blue-500/20 text-blue-300' :
                      user?.user_metadata?.role === 'controller' ? 'bg-green-500/20 text-green-300' :
                        'bg-gray-500/20 text-gray-300'
                  }`}>
                  {user?.user_metadata?.role || 'user'}
                </span>
              </div>
              
              <div className="text-xs text-gray-500">
                Auto-refresh: 30s
              </div>
              
              <CustomButton
                onClick={loadData}
                disabled={loading}
                variant="secondary"
                size="sm"
              >
                {loading ? 'Refreshing...' : 'Refresh Now'}
              </CustomButton>
              
              <CustomButton
                onClick={handleLogout}
                variant="danger"
                size="sm"
                className="flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
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
              {/* Color Legend */}
              <div className="mb-6 bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                <h4 className="text-sm font-semibold text-white mb-3">Color Legend</h4>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-xs text-gray-400">Critical/24h+</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-xs text-gray-400">High/12h+</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-xs text-gray-400">Medium/6h+</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-xs text-gray-400">Recent</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-xs text-gray-400">Dispatched</span>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { value: stats?.activeReports || 0, label: "Active Reports", color: "bg-orange-600", trend: "+12%" },
                  { value: vehicleReports.length, label: "Vehicle Alerts", color: "bg-red-600", trend: "+5%" },
                  { value: crimeReports.length, label: "Crime Reports", color: "bg-blue-600", trend: "-3%" },
                  { value: dispatchRecords.filter(d => d.status === 'dispatched' || d.status === 'en_route').length, label: "Active Dispatch", color: "bg-purple-600", trend: "+8%" }
                ].map((stat, index) => (
                  <div key={index} className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-white">{stat.value}</div>
                        <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className={`w-3 h-3 rounded-full ${stat.color} mb-1`}></div>
                        <span className={`text-xs ${stat.trend.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                          {stat.trend}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Map */}
              <div className="mb-6">
                <LiveMap vehicleReports={vehicleReports} crimeReports={crimeReports} />
              </div>

              {/* Recent Activity with Color Coding */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
                <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-white">Active Monitoring</h3>
                  <span className="text-sm text-gray-400">
                    {vehicleReports.length + crimeReports.length} active incidents
                  </span>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {[...vehicleReports, ...crimeReports]
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .slice(0, 5)
                      .map((report) => {
                        const dispatchStatus = dispatchRecords.find(d => d.report_id === report.id);
                        return (
                          <div key={report.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${getReportAgeColor(report.created_at)}`}></div>
                                {dispatchStatus && (
                                  <div className={`w-3 h-3 rounded-full ${getStatusColor(dispatchStatus.status)}`}></div>
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-white">
                                  {report.license_plate ? `Vehicle: ${report.license_plate}` : `Crime: ${report.title}`}
                                </div>
                                <div className="text-sm text-gray-400 flex items-center space-x-2">
                                  <span>{report.last_seen_location || report.location}</span>
                                  {dispatchStatus && (
                                    <>
                                      <span className="text-gray-600">•</span>
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(dispatchStatus.status).replace('bg-', 'bg-').replace('500', '500/20')} ${getStatusColor(dispatchStatus.status).replace('bg-', 'text-')}300`}>
                                        {dispatchStatus.status}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <div className="text-xs text-gray-500">
                                  {new Date(report.created_at).toLocaleTimeString()}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {Math.round((Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60))}h ago
                                </div>
                              </div>
                              <CustomButton
                                onClick={() => handleOpenDispatchModal(report)}
                                variant="primary"
                                size="sm"
                              >
                                Dispatch
                              </CustomButton>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right column - Monitoring Panels */}
            <div className="space-y-6">
              {/* Quick Actions */}
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
                    Export with Audit Trail
                  </CustomButton>
                  <CustomButton
                    variant="secondary"
                    size="md"
                    className="w-full"
                    onClick={() => setActiveTab('dispatch')}
                  >
                    View Dispatch Log
                  </CustomButton>
                </div>
              </div>
              
              {/* Active Dispatch Status */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Active Dispatch</h3>
                <div className="space-y-3">
                  {dispatchRecords
                    .filter(d => d.status !== 'completed')
                    .slice(0, 3)
                    .map((dispatch) => {
                      const report = [...vehicleReports, ...crimeReports].find(r => r.id === dispatch.report_id);
                      return (
                        <div key={dispatch.id} className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium text-white text-sm">
                                {report?.license_plate || report?.title}
                              </div>
                              <div className="text-xs text-gray-400">Assigned: {dispatch.assigned_to}</div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(dispatch.status).replace('bg-', 'bg-').replace('500', '500/20')} ${getStatusColor(dispatch.status).replace('bg-', 'text-')}300`}>
                              {dispatch.status}
                            </span>
                          </div>
                          <div className="flex space-x-2 mt-2">
                            {['en_route', 'on_scene', 'completed'].map((status) => (
                              <button
                                key={status}
                                onClick={() => handleUpdateDispatchStatus(dispatch.id, status as any)}
                                className={`text-xs px-2 py-1 rounded ${dispatch.status === status ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-700'}`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  {dispatchRecords.filter(d => d.status !== 'completed').length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-4">No active dispatch</p>
                  )}
                </div>
              </div>

              {/* Aging Reports Alert */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Aging Alerts</h3>
                <div className="space-y-3">
                  {[...vehicleReports, ...crimeReports]
                    .filter(report => {
                      const hours = (Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60);
                      return hours > 12;
                    })
                    .slice(0, 3)
                    .map((report) => (
                      <div key={report.id} className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${getReportAgeColor(report.created_at)}`}></div>
                          <div className="flex-1">
                            <div className="font-medium text-white text-sm">
                              {report.license_plate || report.title}
                            </div>
                            <div className="text-xs text-gray-400">
                              {Math.round((Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60))} hours old
                            </div>
                          </div>
                          <CustomButton
                            onClick={() => handleEscalateReport(report.id, report.license_plate ? 'vehicle' : 'crime')}
                            variant="danger"
                            size="xs"
                          >
                            Escalate
                          </CustomButton>
                        </div>
                      </div>
                    ))}
                  {[...vehicleReports, ...crimeReports].filter(r => {
                    const hours = (Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60);
                    return hours > 12;
                  }).length === 0 && (
                    <p className="text-green-400 text-sm text-center py-4">No aging reports</p>
                  )}
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
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-400 bg-gray-900 px-3 py-1 rounded-full">
                    {vehicleReports.length} active
                  </span>
                  <div className="text-xs text-gray-500">
                    Color indicates report age
                  </div>
                </div>
              </div>
              <div className="p-6">
                {vehicleReports.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No active vehicle alerts</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicleReports.map((report) => {
                      const dispatch = dispatchRecords.find(d => d.report_id === report.id);
                      return (
                        <div key={report.id} className={`bg-gray-900/50 rounded-lg p-4 border border-gray-700 relative overflow-hidden`}>
                          {/* Age indicator bar */}
                          <div className={`absolute top-0 left-0 w-1 h-full ${getReportAgeColor(report.created_at)}`}></div>
                          
                          <div className="ml-3">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-semibold text-white text-lg">{report.license_plate}</div>
                                <div className="text-sm text-gray-400">
                                  {report.vehicle_make} {report.vehicle_model} • {report.vehicle_color}
                                </div>
                              </div>
                              <div className="flex flex-col items-end space-y-1">
                                <span className={`px-2 py-1 text-xs rounded-full ${report.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                                    report.severity === 'high' ? 'bg-orange-500/20 text-orange-300' :
                                      'bg-yellow-500/20 text-yellow-300'
                                  }`}>
                                  {report.severity}
                                </span>
                                {dispatch && (
                                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(dispatch.status).replace('bg-', 'bg-').replace('500', '500/20')} ${getStatusColor(dispatch.status).replace('bg-', 'text-')}300`}>
                                    {dispatch.status}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-sm text-gray-400 mb-3">
                              <div className="flex items-center space-x-2">
                                <span>Location: {report.last_seen_location}</span>
                                <span className="text-gray-600">•</span>
                                <span className={`text-xs ${getReportAgeColor(report.created_at).replace('bg-', 'text-')}`}>
                                  {Math.round((Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60))}h ago
                                </span>
                              </div>
                              <div>Reported: {new Date(report.created_at).toLocaleString()}</div>
                              {dispatch && (
                                <div className="mt-1 text-xs text-gray-500">
                                  Assigned to: {dispatch.assigned_to}
                                </div>
                              )}
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
                              {!dispatch && (
                                <CustomButton
                                  onClick={() => handleOpenDispatchModal(report)}
                                  variant="primary"
                                  size="sm"
                                >
                                  Dispatch
                                </CustomButton>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-400 bg-gray-900 px-3 py-1 rounded-full">
                    {crimeReports.length} active
                  </span>
                  <div className="text-xs text-gray-500">
                    Color indicates report age
                  </div>
                </div>
              </div>
              <div className="p-6">
                {crimeReports.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No active crime reports</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {crimeReports.map((report) => {
                      const dispatch = dispatchRecords.find(d => d.report_id === report.id);
                      return (
                        <div key={report.id} className={`bg-gray-900/50 rounded-lg p-4 border border-gray-700 relative overflow-hidden`}>
                          {/* Age indicator bar */}
                          <div className={`absolute top-0 left-0 w-1 h-full ${getReportAgeColor(report.created_at)}`}></div>
                          
                          <div className="ml-3">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-semibold text-white text-lg">{report.title}</div>
                                <div className="text-sm text-gray-400">
                                  {report.report_type} • {report.location}
                                </div>
                              </div>
                              <div className="flex flex-col items-end space-y-1">
                                <span className={`px-2 py-1 text-xs rounded-full ${report.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                                    report.severity === 'high' ? 'bg-orange-500/20 text-orange-300' :
                                      'bg-yellow-500/20 text-yellow-300'
                                  }`}>
                                  {report.severity}
                                </span>
                                {dispatch && (
                                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(dispatch.status).replace('bg-', 'bg-').replace('500', '500/20')} ${getStatusColor(dispatch.status).replace('bg-', 'text-')}300`}>
                                    {dispatch.status}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-sm text-gray-400 mb-3">
                              <div className="flex items-center space-x-2">
                                <span>Reported: {new Date(report.created_at).toLocaleString()}</span>
                                <span className="text-gray-600">•</span>
                                <span className={`text-xs ${getReportAgeColor(report.created_at).replace('bg-', 'text-')}`}>
                                  {Math.round((Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60))}h ago
                                </span>
                              </div>
                              {dispatch && (
                                <div className="mt-1 text-xs text-gray-500">
                                  Assigned to: {dispatch.assigned_to}
                                </div>
                              )}
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
                              {!dispatch && (
                                <CustomButton
                                  onClick={() => handleOpenDispatchModal(report)}
                                  variant="primary"
                                  size="sm"
                                >
                                  Dispatch
                                </CustomButton>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dispatch Log Tab */}
        {activeTab === 'dispatch' && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">Dispatch Log</h3>
                <span className="text-sm text-gray-400 bg-gray-900 px-3 py-1 rounded-full">
                  {dispatchRecords.length} total dispatches
                </span>
              </div>
              <div className="p-6">
                {dispatchRecords.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No dispatch records</p>
                ) : (
                  <div className="space-y-4">
                    {dispatchRecords
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((dispatch) => {
                        const report = [...vehicleReports, ...crimeReports].find(r => r.id === dispatch.report_id);
                        return (
                          <div key={dispatch.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-semibold text-white">
                                  {report?.license_plate || report?.title || 'Unknown Report'}
                                </div>
                                <div className="text-sm text-gray-400 mt-1">
                                  Assigned to: {dispatch.assigned_to} • Priority: {dispatch.priority}
                                </div>
                              </div>
                              <div className="flex flex-col items-end space-y-1">
                                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(dispatch.status).replace('bg-', 'bg-').replace('500', '500/20')} ${getStatusColor(dispatch.status).replace('bg-', 'text-')}300`}>
                                  {dispatch.status}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(dispatch.timestamp).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            {dispatch.notes && (
                              <div className="text-sm text-gray-400 mb-3 p-3 bg-gray-800/50 rounded border border-gray-700">
                                <div className="font-medium text-gray-300 mb-1">Special Instructions:</div>
                                {dispatch.notes}
                              </div>
                            )}
                            <div className="flex justify-between items-center">
                              <div className="text-xs text-gray-500">
                                Report Type: {dispatch.report_type} • Dispatched by: {auditLogs.find(a => 
                                  a.action === 'dispatch' && a.report_id === dispatch.report_id
                                )?.user_email || 'System'}
                              </div>
                              <div className="flex space-x-2">
                                {['dispatched', 'en_route', 'on_scene', 'completed'].map((status) => (
                                  <button
                                    key={status}
                                    onClick={() => handleUpdateDispatchStatus(dispatch.id, status as any)}
                                    className={`text-xs px-3 py-1 rounded ${dispatch.status === status ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-700'}`}
                                  >
                                    {status}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Audit Trail Tab */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">Audit Trail</h3>
                <span className="text-sm text-gray-400 bg-gray-900 px-3 py-1 rounded-full">
                  {auditLogs.length} audit entries
                </span>
              </div>
              <div className="p-6">
                {auditLogs.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No audit logs</p>
                ) : (
                  <div className="space-y-3">
                    {auditLogs
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice(0, 50)
                      .map((log) => (
                        <div key={log.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-white">{log.action.toUpperCase()}</div>
                              <div className="text-sm text-gray-400 mt-1">
                                {log.report_type} report • {log.details ? JSON.stringify(log.details) : 'No details'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-300">{log.user_email}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(log.timestamp).toLocaleString()}
                              </div>
                            </div>
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