// components/control-room/LiveMap.tsx
'use client';

import { useState } from 'react';
import type { Incident } from './ControlRoomDashboard';

interface LiveMapProps {
  incidents: Incident[];
  teams: any[];
  onIncidentSelect: (incident: Incident) => void;
}

export default function LiveMap({ incidents, teams, onIncidentSelect }: LiveMapProps) {
  const [mapLoaded, setMapLoaded] = useState(false);

  // Simple grid-based map for mock purposes
  // In a real app, you'd integrate with Google Maps, Mapbox, etc.
  
  const getIncidentIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const getTeamIcon = (status: string) => {
    switch (status) {
      case 'available': return '🟢';
      case 'en_route': return '🟡';
      case 'busy': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">📍 Live Incident Map</h2>
        <div className="text-sm text-gray-400">
          {incidents.length} active incidents • {teams.length} response teams
        </div>
      </div>

      {/* Mock Map Grid */}
      <div className="relative bg-gray-900 rounded-lg h-96 border border-gray-600 overflow-hidden">
        {/* Grid Background */}
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex">
              {Array.from({ length: 10 }).map((_, j) => (
                <div key={j} className="w-1/10 h-16 border border-gray-700"></div>
              ))}
            </div>
          ))}
        </div>

        {/* Mock Incidents on Map */}
        {incidents.map((incident, index) => {
          // Simple positioning for mock - real app would use coordinates
          const top = 20 + (index * 15) % 70;
          const left = 20 + (index * 25) % 70;
          
          return (
            <button
              key={incident.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-125 transition-transform ${
                incident.severity === 'critical' ? 'animate-pulse' : ''
              }`}
              style={{ top: `${top}%`, left: `${left}%` }}
              onClick={() => onIncidentSelect(incident)}
              title={`${incident.title} - ${incident.severity}`}
            >
              <div className="text-2xl">
                {getIncidentIcon(incident.severity)}
              </div>
            </button>
          );
        })}

        {/* Mock Teams on Map */}
        {teams.map((team, index) => {
          const top = 30 + (index * 20) % 60;
          const left = 70 + (index * 15) % 20;
          
          return (
            <div
              key={team.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ top: `${top}%`, left: `${left}%` }}
            >
              <div className="text-xl">
                {getTeamIcon(team.status)}
              </div>
              <div className="text-xs text-white bg-black bg-opacity-50 px-1 rounded mt-1 whitespace-nowrap">
                {team.name}
              </div>
            </div>
          );
        })}

        {/* Map Legend */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 rounded-lg p-3">
          <div className="text-sm font-medium text-white mb-2">Legend</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <span>🔴</span><span className="text-gray-300">Critical</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🟠</span><span className="text-gray-300">High</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🟡</span><span className="text-gray-300">Medium</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🟢</span><span className="text-gray-300">Low</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="text-sm text-gray-400">Incident Distribution</div>
          <div className="flex space-x-2 mt-1">
            <div className="flex-1 bg-red-500 rounded h-2"></div>
            <div className="flex-1 bg-orange-500 rounded h-2"></div>
            <div className="flex-1 bg-yellow-500 rounded h-2"></div>
            <div className="flex-1 bg-green-500 rounded h-2"></div>
          </div>
        </div>
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="text-sm text-gray-400">Team Coverage</div>
          <div className="text-lg font-bold text-white mt-1">
            {((teams.filter(t => t.status === 'available').length / teams.length) * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
}