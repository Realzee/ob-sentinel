// components/control-room/ControlRoomDashboard.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { reportsAPI, VehicleAlert, CrimeReport, Profile } from '@/lib/supabase';
import LiveMap from '@/components/control-room/LiveMap';
import IncidentQueue from '@/components/control-room/IncidentQueue';
import TeamManagement from '@/components/control-room/TeamManagement';
import AnalyticsPanel from '@/components/control-room/AnalyticsPanel';
import CommunicationsHub from '@/components/control-room/CommunicationsHub';
import CustomButton from '@/components/ui/CustomButton';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface ControlRoomDashboardProps {
  user: any;
}

// Export the Incident interface so other components can use it
export interface Incident {
  id: string;
  type: 'vehicle' | 'crime';
  title: string;
  description: string;
  location: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'active' | 'resolved' | 'recovered' | 'rejected';
  reportedAt: string;
  reporter: string;
  assignedTeam?: string;
  coordinates: { lat: number; lng: number };
  obNumber: string;
  rawData?: any;
}

interface ResponseTeam {
  id: string;
  name: string;
  status: 'available' | 'en_route' | 'busy' | 'offline';
  members: string[];
  currentLocation?: string;
  assignedIncidents: string[];
  lastUpdate: string;
  coordinates: { lat: number; lng: number };
}

export default function ControlRoomDashboard({ user }: ControlRoomDashboardProps) {
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [responseTeams, setResponseTeams] = useState<ResponseTeam[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [activeView, setActiveView] = useState<'map' | 'list' | 'analytics'>('map');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const router = useRouter();

  // Generate random coordinates around Johannesburg area
  const generateRandomCoordinates = () => {
    const baseLat = -26.2041; // Johannesburg latitude
    const baseLng = 28.0473;  // Johannesburg longitude
    const lat = baseLat + (Math.random() - 0.5) * 0.1; // ~11km variation
    const lng = baseLng + (Math.random() - 0.5) * 0.1; // ~11km variation
    return { lat, lng };
  };

  // Generate team coordinates (closer to center for better visibility)
  const generateTeamCoordinates = () => {
    const baseLat = -26.2041;
    const baseLng = 28.0473;
    const lat = baseLat + (Math.random() - 0.5) * 0.05; // ~5.5km variation
    const lng = baseLng + (Math.random() - 0.5) * 0.05; // ~5.5km variation
    return { lat, lng };
  };

  // Mock response teams - in real app, this would come from your database
  const mockTeams: ResponseTeam[] = [
    {
      id: 'team-1',
      name: 'Team Alpha',
      status: 'available',
      members: ['John D.', 'Sarah M.'],
      currentLocation: 'Command Center',
      assignedIncidents: [],
      lastUpdate: new Date().toISOString(),
      coordinates: generateTeamCoordinates()
    },
    {
      id: 'team-2',
      name: 'Team Bravo',
      status: 'en_route',
      members: ['Mike R.', 'Lisa T.'],
      currentLocation: 'Downtown Area',
      assignedIncidents: [],
      lastUpdate: new Date().toISOString(),
      coordinates: generateTeamCoordinates()
    },
    {
      id: 'team-3',
      name: 'Team Charlie',
      status: 'busy',
      members: ['David K.', 'Emma P.'],
      currentLocation: 'North District',
      assignedIncidents: [],
      lastUpdate: new Date().toISOString(),
      coordinates: generateTeamCoordinates()
    }
  ];

  const loadIncidents = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading incidents for control room...');

      const [vehicleAlerts, crimeReports] = await Promise.all([
        reportsAPI.getVehicleAlerts(),
        reportsAPI.getCrimeReports(),
      ]);

      // Transform vehicle alerts to incidents
      const vehicleIncidents: Incident[] = (vehicleAlerts || []).map(alert => {
        const coordinates = generateRandomCoordinates();
        
        return {
          id: alert.id,
          type: 'vehicle',
          title: `Stolen Vehicle: ${alert.license_plate}`,
          description: `${alert.vehicle_make} ${alert.vehicle_model} - ${alert.reason}`,
          location: alert.last_seen_location,
          severity: alert.severity,
          status: alert.status,
          reportedAt: alert.created_at,
          reporter: 'Anonymous', // Would map to user profile
          obNumber: alert.ob_number || 'OBV-UNKNOWN',
          rawData: alert,
          coordinates: coordinates
        };
      });

      // Transform crime reports to incidents
      const crimeIncidents: Incident[] = (crimeReports || []).map(crime => {
        const coordinates = generateRandomCoordinates();
        
        return {
          id: crime.id,
          type: 'crime',
          title: crime.title,
          description: crime.description,
          location: crime.location,
          severity: crime.severity,
          status: crime.status,
          reportedAt: crime.created_at,
          reporter: 'Anonymous', // Would map to user profile
          obNumber: crime.ob_number || 'OBC-UNKNOWN',
          rawData: crime,
          coordinates: coordinates
        };
      });

      // Combine and filter only active incidents
      const allIncidents = [...vehicleIncidents, ...crimeIncidents];
      const activeOnly = allIncidents.filter(incident => 
        incident.status === 'active' || incident.status === 'pending'
      );

      setActiveIncidents(activeOnly);
      setResponseTeams(mockTeams);
      setLastUpdate(new Date().toLocaleTimeString());

      console.log(`✅ Control Room: ${activeOnly.length} active incidents loaded`);

    } catch (error) {
      console.error('❌ Error loading control room data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIncidents();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadIncidents, 30000);
    
    return () => clearInterval(interval);
  }, [loadIncidents]);

  const handleAssignTeam = (incidentId: string, teamId: string) => {
    setActiveIncidents(prev => 
      prev.map(incident => 
        incident.id === incidentId 
          ? { ...incident, assignedTeam: teamId }
          : incident
      )
    );

    setResponseTeams(prev =>
      prev.map(team =>
        team.id === teamId
          ? { 
              ...team, 
              assignedIncidents: [...team.assignedIncidents, incidentId],
              status: 'en_route'
            }
          : team
      )
    );

    console.log(`✅ Assigned incident ${incidentId} to team ${teamId}`);
  };

  const handleUpdateStatus = (incidentId: string, newStatus: string) => {
    // Convert string to the proper Incident status type
    const validStatus = ['pending', 'active', 'resolved', 'recovered', 'rejected'].includes(newStatus) 
      ? newStatus as Incident['status'] 
      : 'active';
    
    setActiveIncidents(prev =>
      prev.map(incident =>
        incident.id === incidentId
          ? { ...incident, status: validStatus }
          : incident
      )
    );

    console.log(`✅ Updated incident ${incidentId} to ${validStatus}`);
  };

  const handleTeamUpdate = (teamId: string, updates: any) => {
    setResponseTeams(prev =>
      prev.map(team =>
        team.id === teamId ? { ...team, ...updates } : team
      )
    );
  };

  const handleQuickAction = (action: string, incidentId?: string) => {
    console.log(`Quick action: ${action} for incident ${incidentId || 'general'}`);
    // Handle quick actions like notify police, request backup, etc.
    
    // Show success message for demo purposes
    if (incidentId) {
      // showSuccess(`Action "${action}" executed for incident`);
    } else {
      // showSuccess(`Action "${action}" executed`);
    }
  };

  const showSuccess = (message: string) => {
    // This would show a success notification
    console.log(`✅ ${message}`);
  };

  const showError = (message: string) => {
    // This would show an error notification
    console.error(`❌ ${message}`);
  };

  const getSeverityColor = (severity: Incident['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: Incident['status']) => {
    switch (status) {
      case 'active': return 'border-l-blue-500';
      case 'pending': return 'border-l-yellow-500';
      case 'resolved': return 'border-l-green-500';
      case 'recovered': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  // Fix: Create a proper handler function for incident selection
  const handleSelectIncident = useCallback((incident: Incident) => {
    setSelectedIncident(incident);
  }, []);

  // Handle navigation back to main dashboard
  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="text-white mt-4">Loading Control Room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                  <Image 
                    src="/rapid911-T.png" 
                    alt="RAPID REPORT" 
                    width={24} 
                    height={24}
                    className="rounded"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">CONTROL ROOM</h1>
                  <p className="text-xs text-gray-400">Live Incident Management</p>
                </div>
              </div>
              
              {/* View Toggle */}
              <div className="flex space-x-2 ml-6">
                <CustomButton
                  onClick={() => setActiveView('map')}
                  variant={activeView === 'map' ? 'danger' : 'secondary'}
                  size="sm"
                >
                  🗺️ Map View
                </CustomButton>
                <CustomButton
                  onClick={() => setActiveView('list')}
                  variant={activeView === 'list' ? 'danger' : 'secondary'}
                  size="sm"
                >
                  📋 List View
                </CustomButton>
                <CustomButton
                  onClick={() => setActiveView('analytics')}
                  variant={activeView === 'analytics' ? 'danger' : 'secondary'}
                  size="sm"
                >
                  📈 Analytics
                </CustomButton>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Back to Dashboard Button */}
              <CustomButton
                onClick={handleBackToDashboard}
                variant="secondary"
                size="sm"
                className="flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Dashboard</span>
              </CustomButton>

              <div className="text-right">
                <div className="text-sm font-medium text-white">
                  {user?.full_name || user?.email?.split('@')[0] || 'Controller'}
                </div>
                <div className="text-xs text-gray-400">
                  Last update: {lastUpdate}
                </div>
              </div>
              
              <CustomButton
                onClick={loadIncidents}
                variant="secondary"
                size="sm"
                loading={loading}
              >
                🔄 Refresh
              </CustomButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-red-500">
            <div className="text-2xl font-bold text-white">
              {activeIncidents.filter(i => i.severity === 'critical').length}
            </div>
            <div className="text-sm text-gray-400">Critical Incidents</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-orange-500">
            <div className="text-2xl font-bold text-white">
              {activeIncidents.length}
            </div>
            <div className="text-sm text-gray-400">Active Incidents</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-blue-500">
            <div className="text-2xl font-bold text-white">
              {responseTeams.filter(t => t.status === 'available').length}
            </div>
            <div className="text-sm text-gray-400">Available Teams</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-green-500">
            <div className="text-2xl font-bold text-white">
              {activeIncidents.filter(i => i.status === 'resolved').length}
            </div>
            <div className="text-sm text-gray-400">Resolved Today</div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content Area - 3/4 width */}
          <div className="xl:col-span-3">
            {activeView === 'map' && (
              <LiveMap 
                incidents={activeIncidents}
                teams={responseTeams}
                onIncidentSelect={handleSelectIncident}
              />
            )}
            
            {activeView === 'list' && (
              <IncidentQueue
                incidents={activeIncidents}
                teams={responseTeams}
                onAssignTeam={handleAssignTeam}
                onUpdateStatus={handleUpdateStatus}
                onSelectIncident={handleSelectIncident}
              />
            )}
            
            {activeView === 'analytics' && (
              <AnalyticsPanel incidents={activeIncidents} />
            )}
          </div>

          {/* Sidebar - 1/4 width */}
          <div className="space-y-6">
            <TeamManagement 
              teams={responseTeams}
              incidents={activeIncidents}
              onTeamUpdate={handleTeamUpdate}
            />
            
            <CommunicationsHub 
              selectedIncident={selectedIncident}
              onQuickAction={handleQuickAction}
            />
          </div>
        </div>

        {/* Selected Incident Details Panel */}
        {selectedIncident && (
          <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-4 z-50">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedIncident.title}
                  </h3>
                  <p className="text-gray-400">{selectedIncident.description}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm">
                    <span className="text-gray-400">📍 {selectedIncident.location}</span>
                    <span className="text-gray-400">🕒 {new Date(selectedIncident.reportedAt).toLocaleTimeString()}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      selectedIncident.severity === 'critical' ? 'bg-red-500' :
                      selectedIncident.severity === 'high' ? 'bg-orange-500' :
                      selectedIncident.severity === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}>
                      {selectedIncident.severity.toUpperCase()}
                    </span>
                    <span className="text-gray-400">📌 Lat: {selectedIncident.coordinates.lat.toFixed(4)}, Lng: {selectedIncident.coordinates.lng.toFixed(4)}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <CustomButton
                    onClick={() => setSelectedIncident(null)}
                    variant="secondary"
                    size="sm"
                  >
                    Close
                  </CustomButton>
                  <CustomButton
                    onClick={() => handleUpdateStatus(selectedIncident.id, 'resolved')}
                    variant="success"
                    size="sm"
                  >
                    Mark Resolved
                  </CustomButton>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}