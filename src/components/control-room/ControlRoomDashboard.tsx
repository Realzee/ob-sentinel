// components/control-room/ControlRoomDashboard.tsx (Enhanced with Event Stack)
'use client';

import { useState, useEffect, useRef } from 'react';
import { reportsAPI, authAPI, AuditLog as SupabaseAuditLog, DispatchRecord as SupabaseDispatchRecord } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import EventStack from './EventStack';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import CustomButton from '@/components/ui/CustomButton';

// Dynamically import LiveMap with no SSR
const LiveMap = dynamic(() => import('./LiveMapWrapper'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900 rounded-xl flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        <p className="text-gray-400 mt-2">Loading map...</p>
      </div>
    </div>
  ),
});

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

interface EventReport {
  id: string;
  type: 'vehicle' | 'crime' | 'other';
  title: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
    zone?: string;
    area?: string;
    region?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  status: 'active' | 'pending' | 'resolved';
  counters?: {
    witnesses?: number;
    evidence?: number;
    related?: number;
  };
  vehicleDetails?: {
    license_plate: string;
    make: string;
    model: string;
    color: string;
  };
}

// Clock component
function DigitalClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="font-mono text-lg font-semibold text-white">
      {time.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })}
    </div>
  );
}

function AnalogClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourAngle = (hours * 30) + (minutes * 0.5);
  const minuteAngle = (minutes * 6) + (seconds * 0.1);
  const secondAngle = seconds * 6;

  return (
    <div className="relative w-8 h-8">
      <div className="absolute inset-0 rounded-full border-2 border-gray-400"></div>
      
      {/* Hour hand */}
      <div 
        className="absolute top-1/2 left-1/2 w-0.5 h-3 bg-white origin-bottom"
        style={{
          transform: `translate(-50%, -100%) rotate(${hourAngle}deg)`,
          transformOrigin: 'bottom center'
        }}
      ></div>
      
      {/* Minute hand */}
      <div 
        className="absolute top-1/2 left-1/2 w-0.5 h-4 bg-gray-300 origin-bottom"
        style={{
          transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)`,
          transformOrigin: 'bottom center'
        }}
      ></div>
      
      {/* Second hand */}
      <div 
        className="absolute top-1/2 left-1/2 w-px h-4 bg-red-500 origin-bottom"
        style={{
          transform: `translate(-50%, -100%) rotate(${secondAngle}deg)`,
          transformOrigin: 'bottom center'
        }}
      ></div>
      
      {/* Center dot */}
      <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
    </div>
  );
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
  
  // Track previous counts to detect new reports
  const prevVehicleCount = useRef(0);
  const prevCrimeCount = useRef(0);
  const prevStats = useRef<any>(null);
  
  // Audio for alert sound
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Event Stack states
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<{
    id: string;
    lat: number;
    lng: number;
    type: 'vehicle' | 'crime' | 'other';
  } | undefined>(undefined);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
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
    
    // Initialize audio element
    if (typeof window !== 'undefined') {
      alertAudioRef.current = new Audio('/sounds/alert.mp3');
      // Fallback to a simple beep sound if custom file doesn't exist
      alertAudioRef.current.onerror = () => {
        // Create a simple beep sound programmatically
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      };
    }
    
    loadData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadReportsOnly(); // Only refresh reports, not the entire page
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

      // Check for new reports before updating state
      const hasNewVehicles = activeVehicles.length > prevVehicleCount.current;
      const hasNewCrimes = activeCrimes.length > prevCrimeCount.current;
      
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
      
      // Play alert sound if new reports detected
      if ((hasNewVehicles || hasNewCrimes) && alertAudioRef.current) {
        playAlertSound();
      }
      
      // Update previous counts
      prevVehicleCount.current = activeVehicles.length;
      prevCrimeCount.current = activeCrimes.length;
      prevStats.current = statsData;
      
    } catch (error) {
      console.error('Error loading control room data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReportsOnly = async () => {
    try {
      const [vehiclesData, crimesData] = await Promise.all([
        reportsAPI.getVehicleAlerts(),
        reportsAPI.getCrimeReports()
      ]);

      const activeVehicles = vehiclesData.filter((vehicle: any) => 
        ['active', 'pending'].includes(vehicle.status)
      );
      
      const activeCrimes = crimesData.filter((crime: any) => 
        ['active', 'pending'].includes(crime.status)
      );

      // Check for new reports before updating state
      const hasNewVehicles = activeVehicles.length > prevVehicleCount.current;
      const hasNewCrimes = activeCrimes.length > prevCrimeCount.current;
      
      setVehicleReports(activeVehicles);
      setCrimeReports(activeCrimes);
      
      // Play alert sound if new reports detected
      if ((hasNewVehicles || hasNewCrimes) && alertAudioRef.current) {
        playAlertSound();
      }
      
      // Update previous counts
      prevVehicleCount.current = activeVehicles.length;
      prevCrimeCount.current = activeCrimes.length;
      
    } catch (error) {
      console.error('Error refreshing reports:', error);
    }
  };

  const playAlertSound = () => {
    if (alertAudioRef.current) {
      // Reset audio to start
      alertAudioRef.current.currentTime = 0;
      
      // Play the sound
      alertAudioRef.current.play().catch(error => {
        console.warn('Audio play failed:', error);
        // Fallback to system beep
        if (typeof window !== 'undefined' && window.Notification && Notification.permission === 'granted') {
          new Notification('New Report Alert', {
            body: 'New reports have been received',
            icon: '/favicon.ico'
          });
        }
      });
    }
  };

  // Helper function to parse coordinates
  const parseCoordinates = (location: string): { lat: number; lng: number } => {
    if (!location) return { lat: -26.195246, lng: 28.034088 };
    
    const parts = location.split(',');
    if (parts.length === 2) {
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    
    return { lat: -26.195246, lng: 28.034088 };
  };

  // Event Stack handlers
  const handleEventSelect = (event: EventReport) => {
    setSelectedEventId(event.id);
    setSelectedEvent({
      id: event.id,
      lat: event.location.lat,
      lng: event.location.lng,
      type: event.type
    });
  };

  const handleMapEventSelect = (eventId: string) => {
    setSelectedEventId(eventId);
    // Find the event in the combined lists
    const allEvents = [...vehicleReports, ...crimeReports];
    const event = allEvents.find(e => e.id === eventId);
    if (event) {
      const coords = parseCoordinates(event.last_seen_location || event.location);
      setSelectedEvent({
        id: eventId,
        lat: coords.lat,
        lng: coords.lng,
        type: event.license_plate ? 'vehicle' : 'crime'
      });
    }
  };

  // WhatsApp sharing functionality
  const handleShareToWhatsApp = (report: any, type: 'vehicle' | 'crime') => {
    setSelectedReport({...report, reportType: type});
    setWhatsappModalOpen(true);
  };

  const confirmWhatsappShare = () => {
    if (!selectedReport || typeof window === 'undefined') return;
    
    const phoneNumber = "27662855960";
    
    // Format message based on report type
    let message = "";
    if (selectedReport.reportType === 'vehicle') {
      message = `🚨 *VEHICLE ALERT*\n\n` +
                `*License Plate:* ${selectedReport.license_plate || 'Unknown'}\n` +
                `*Vehicle:* ${selectedReport.vehicle_make} ${selectedReport.vehicle_model} ${selectedReport.vehicle_color}\n` +
                `*Reason:* ${selectedReport.reason}\n` +
                `*Last Seen:* ${selectedReport.last_seen_location}\n` +
                `*Time:* ${new Date(selectedReport.created_at).toLocaleString()}\n` +
                `*Severity:* ${selectedReport.severity.toUpperCase()}\n` +
                `*Status:* ${selectedReport.status.toUpperCase()}\n\n` +
                `_Sent from Control Room Dashboard_`;
    } else {
      message = `🚨 *CRIME REPORT*\n\n` +
                `*Title:* ${selectedReport.title}\n` +
                `*Type:* ${selectedReport.report_type}\n` +
                `*Location:* ${selectedReport.location}\n` +
                `*Description:* ${selectedReport.description.substring(0, 150)}...\n` +
                `*Time:* ${new Date(selectedReport.created_at).toLocaleString()}\n` +
                `*Severity:* ${selectedReport.severity.toUpperCase()}\n` +
                `*Status:* ${selectedReport.status.toUpperCase()}\n\n` +
                `_Sent from Control Room Dashboard_`;
    }
    
    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    
    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank');
    
    // Log the share action
    logAuditAction('whatsapp_share', selectedReport.id, selectedReport.reportType, {
      phone_number: phoneNumber,
      report_type: selectedReport.reportType
    });
    
    setWhatsappModalOpen(false);
    setSelectedReport(null);
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

      {/* WhatsApp Share Modal */}
      {whatsappModalOpen && selectedReport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Share via WhatsApp</h3>
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
                  <label className="block text-sm text-gray-400 mb-1">Recipient</label>
                  <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.76.982.998-3.675-.236-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.826 9.826 0 012.9 6.994c-.004 5.45-4.438 9.88-9.888 9.88m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.333.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.333 11.893-11.893 0-3.18-1.24-6.162-3.495-8.411"/>
                        </svg>
                      </div>
                      <span>+27 66 285 5960</span>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-yellow-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                    <div className="text-sm text-yellow-300">
                      This will open WhatsApp and share the report details with the specified number. 
                      Make sure you have permission to share this information.
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <CustomButton
                  onClick={() => {
                    setWhatsappModalOpen(false);
                    setSelectedReport(null);
                  }}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </CustomButton>
                <CustomButton
                  onClick={confirmWhatsappShare}
                  variant="success"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.76.982.998-3.675-.236-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.826 9.826 0 012.9 6.994c-.004 5.45-4.438 9.88-9.888 9.88m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.333.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.333 11.893-11.893 0-3.18-1.24-6.162-3.495-8.411"/>
                    </svg>
                    <span>Share via WhatsApp</span>
                  </div>
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
              {/* Clock Display */}
              <div className="flex items-center space-x-3">
                <AnalogClock />
                <DigitalClock />
              </div>
              
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
                onClick={loadReportsOnly} // Changed to loadReportsOnly for faster refresh
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
        {/* Overview Tab with Event Stack */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left column - Event Stack */}
            <div className="lg:col-span-1">
              <div className="h-full rounded-xl border border-gray-700 overflow-hidden bg-gray-900">
                <EventStack
                  vehicleReports={vehicleReports}
                  crimeReports={crimeReports}
                  onSelectEvent={handleEventSelect}
                  selectedEventId={selectedEventId}
                />
              </div>
            </div>

            {/* Right column - Map and Stats */}
            <div className="lg:col-span-3">
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
              <div className="mb-6 h-[500px] rounded-xl border border-gray-700 overflow-hidden">
                <LiveMap
                  vehicleReports={vehicleReports}
                  crimeReports={crimeReports}
                  selectedEvent={selectedEvent}
                  onEventSelect={handleMapEventSelect}
                />
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
                              <CustomButton
                                onClick={() => handleShareToWhatsApp(report, 'vehicle')}
                                variant="success"
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.76.982.998-3.675-.236-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.826 9.826 0 012.9 6.994c-.004 5.45-4.438 9.88-9.888 9.88m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.333.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.333 11.893-11.893 0-3.18-1.24-6.162-3.495-8.411"/>
                                </svg>
                              </CustomButton>
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
                              <CustomButton
                                onClick={() => handleShareToWhatsApp(report, 'crime')}
                                variant="success"
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.76.982.998-3.675-.236-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.826 9.826 0 012.9 6.994c-.004 5.45-4.438 9.88-9.888 9.88m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.333.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.333 11.893-11.893 0-3.18-1.24-6.162-3.495-8.411"/>
                                </svg>
                              </CustomButton>
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
