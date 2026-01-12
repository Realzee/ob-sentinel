// components/control-room/IncidentQueue.tsx
'use client';

import { useState } from 'react';
import CustomButton from '@/components/ui/CustomButton';

// Local Incident interface
interface Incident {
  id: string;
  title: string;
  description: string;
  location: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  obNumber: string;
  reporter: string;
  reportedAt: string;
  type: string;
  assignedTeam?: string;
}

interface ResponseTeam {
  id: string;
  name: string;
  status: 'available' | 'en_route' | 'busy' | 'offline';
  members: string[];
  currentLocation?: string;
  assignedIncidents: string[];
  lastUpdate: string;
}

interface IncidentQueueProps {
  incidents: Incident[];
  teams: ResponseTeam[];
  onAssignTeam: (incidentId: string, teamId: string) => void;
  onUpdateStatus: (incidentId: string, status: string) => void;
  onSelectIncident: (incident: Incident) => void;
}

export default function IncidentQueue({ 
  incidents, 
  teams, 
  onAssignTeam, 
  onUpdateStatus,
  onSelectIncident 
}: IncidentQueueProps) {
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);

  const getSeverityBadge = (severity: string) => {
    const colors = {
      critical: 'bg-red-500 border-red-600',
      high: 'bg-orange-500 border-orange-600',
      medium: 'bg-yellow-500 border-yellow-600',
      low: 'bg-green-500 border-green-600'
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full border ${colors[severity as keyof typeof colors] || 'bg-gray-500'} text-white`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-blue-500 border-blue-600',
      pending: 'bg-yellow-500 border-yellow-600',
      resolved: 'bg-green-500 border-green-600',
      recovered: 'bg-green-500 border-green-600',
      rejected: 'bg-red-500 border-red-600'
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full border ${colors[status as keyof typeof colors] || 'bg-gray-500'} text-white`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">📋 Incident Queue</h2>
        <div className="text-sm text-gray-400">
          Showing {incidents.length} active incidents
        </div>
      </div>

      <div className="space-y-4">
        {incidents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No active incidents. All clear! 🎉
          </div>
        ) : (
          incidents.map((incident) => (
            <div
              key={incident.id}
              className={`bg-gray-700 rounded-lg border-l-4 ${
                incident.severity === 'critical' ? 'border-l-red-500' :
                incident.severity === 'high' ? 'border-l-orange-500' :
                incident.severity === 'medium' ? 'border-l-yellow-500' :
                'border-l-green-500'
              } hover:bg-gray-600 transition-colors cursor-pointer`}
              onClick={() => onSelectIncident(incident)}
            >
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-white text-lg">
                        {incident.title}
                      </h3>
                      {getSeverityBadge(incident.severity)}
                      {getStatusBadge(incident.status)}
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-2">
                      {incident.description}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-400">
                      <span>📍 {incident.location}</span>
                      <span>🕒 {getTimeAgo(incident.reportedAt)}</span>
                      <span>🔢 {incident.obNumber}</span>
                      <span>👤 {incident.reporter}</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    {!incident.assignedTeam && (
                      <select
                        className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-xs text-white"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onAssignTeam(incident.id, e.target.value)}
                        value=""
                      >
                        <option value="">Assign Team</option>
                        {teams.filter(t => t.status === 'available').map(team => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    )}
                    
                    {incident.assignedTeam && (
                      <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
                        Assigned: {teams.find(t => t.id === incident.assignedTeam)?.name}
                      </span>
                    )}
                    
                    <select
                      className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-xs text-white"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onUpdateStatus(incident.id, e.target.value)}
                      value={incident.status}
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                      <option value="recovered">Recovered</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedIncident === incident.id && (
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium text-gray-300 mb-2">Details</h4>
                        <div className="space-y-1 text-gray-400">
                          <div>Type: {incident.type}</div>
                          <div>Reported: {new Date(incident.reportedAt).toLocaleString()}</div>
                          <div>Case: {incident.obNumber}</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-300 mb-2">Actions</h4>
                        <div className="flex space-x-2">
                          <CustomButton size="sm" variant="primary">
                            View Details
                          </CustomButton>
                          <CustomButton size="sm" variant="secondary">
                            Add Note
                          </CustomButton>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Queue Statistics */}
      {incidents.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-500">
                {incidents.filter(i => i.severity === 'critical').length}
              </div>
              <div className="text-xs text-gray-400">Critical</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-500">
                {incidents.filter(i => i.severity === 'high').length}
              </div>
              <div className="text-xs text-gray-400">High</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-500">
                {incidents.filter(i => i.severity === 'medium').length}
              </div>
              <div className="text-xs text-gray-400">Medium</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">
                {incidents.filter(i => i.severity === 'low').length}
              </div>
              <div className="text-xs text-gray-400">Low</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}