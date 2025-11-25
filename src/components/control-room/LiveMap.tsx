// components/control-room/LiveMap.tsx
'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Incident } from './ControlRoomDashboard';

// Fix for default markers in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different severity levels
const createCustomIcon = (severity: string) => {
  const color = {
    critical: '#dc2626', // red-600
    high: '#ea580c',     // orange-600
    medium: '#ca8a04',   // yellow-600
    low: '#16a34a'       // green-600
  }[severity] || '#6b7280'; // gray-500

  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 10px;
        font-weight: bold;
      "></div>
    `,
    className: 'custom-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// Team status icons
const createTeamIcon = (status: string) => {
  const color = {
    available: '#16a34a', // green-600
    en_route: '#ca8a04',  // yellow-600
    busy: '#dc2626',      // red-600
    offline: '#6b7280'    // gray-500
  }[status] || '#6b7280';

  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
      "></div>
    `,
    className: 'team-marker',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

interface LiveMapProps {
  incidents: Incident[];
  teams: any[];
  onIncidentSelect: (incident: Incident) => void;
}

// Component to handle map updates
function MapUpdater({ incidents, teams }: { incidents: Incident[], teams: any[] }) {
  const map = useMap();

  useEffect(() => {
    if (incidents.length > 0) {
      const group = new L.FeatureGroup(
        incidents.map(incident => 
          L.marker([incident.coordinates?.lat || 0, incident.coordinates?.lng || 0])
        )
      );
      map.fitBounds(group.getBounds().pad(0.1));
    } else {
      // Default to a reasonable location if no incidents
      map.setView([-26.2041, 28.0473], 10); // Default to Johannesburg
    }
  }, [incidents, map]);

  return null;
}

export default function LiveMap({ incidents, teams, onIncidentSelect }: LiveMapProps) {
  const [mapLoaded, setMapLoaded] = useState(false);

  // Generate mock coordinates for incidents if they don't have them
  const incidentsWithCoords = incidents.map((incident, index) => {
    if (incident.coordinates) return incident;
    
    // Generate mock coordinates around Johannesburg area
    const baseLat = -26.2041;
    const baseLng = 28.0473;
    const lat = baseLat + (Math.random() - 0.5) * 0.1; // ~11km variation
    const lng = baseLng + (Math.random() - 0.5) * 0.1; // ~11km variation
    
    return {
      ...incident,
      coordinates: { lat, lng }
    };
  });

  // Generate mock coordinates for teams
  const teamsWithCoords = teams.map((team, index) => {
    if (team.coordinates) return team;
    
    const baseLat = -26.2041;
    const baseLng = 28.0473;
    const lat = baseLat + (Math.random() - 0.5) * 0.05; // ~5.5km variation
    const lng = baseLng + (Math.random() - 0.5) * 0.05; // ~5.5km variation
    
    return {
      ...team,
      coordinates: { lat, lng }
    };
  });

  useEffect(() => {
    setMapLoaded(true);
  }, []);

  if (!mapLoaded) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">📍 Live Incident Map</h2>
          <div className="text-sm text-gray-400">Loading map...</div>
        </div>
        <div className="bg-gray-900 rounded-lg h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
            <p className="text-white mt-2">Loading OpenStreetMap...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">📍 Live Incident Map</h2>
        <div className="text-sm text-gray-400">
          {incidents.length} active incidents • {teams.length} response teams
        </div>
      </div>

      <div className="relative bg-gray-900 rounded-lg border border-gray-600 overflow-hidden">
        <MapContainer
          center={[-26.2041, 28.0473]} // Johannesburg coordinates
          zoom={10}
          style={{ height: '400px', width: '100%' }}
          className="rounded-lg"
        >
          {/* OpenStreetMap Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Update map bounds based on incidents */}
          <MapUpdater incidents={incidentsWithCoords} teams={teamsWithCoords} />

          {/* Incident Markers */}
          {incidentsWithCoords.map((incident) => (
            <Marker
              key={incident.id}
              position={[incident.coordinates.lat, incident.coordinates.lng]}
              icon={createCustomIcon(incident.severity)}
              eventHandlers={{
                click: () => onIncidentSelect(incident),
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-bold text-gray-900 text-sm mb-1">
                    {incident.title}
                  </h3>
                  <p className="text-gray-600 text-xs mb-2">
                    {incident.description.substring(0, 100)}...
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Severity:</span>
                      <span className={`font-medium ${
                        incident.severity === 'critical' ? 'text-red-600' :
                        incident.severity === 'high' ? 'text-orange-600' :
                        incident.severity === 'medium' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {incident.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Location:</span>
                      <span className="text-gray-700">{incident.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Time:</span>
                      <span className="text-gray-700">
                        {new Date(incident.reportedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Team Markers */}
          {teamsWithCoords.map((team) => (
            <Marker
              key={team.id}
              position={[team.coordinates.lat, team.coordinates.lng]}
              icon={createTeamIcon(team.status)}
            >
              <Popup>
                <div className="p-2 min-w-[180px]">
                  <h3 className="font-bold text-gray-900 text-sm mb-1">
                    {team.name}
                  </h3>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className={`font-medium ${
                        team.status === 'available' ? 'text-green-600' :
                        team.status === 'en_route' ? 'text-yellow-600' :
                        team.status === 'busy' ? 'text-red-600' :
                        'text-gray-500'
                      }`}>
                        {team.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Members:</span>
                      <span className="text-gray-700">{team.members.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Location:</span>
                      <span className="text-gray-700">{team.currentLocation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Assigned:</span>
                      <span className="text-gray-700">{team.assignedIncidents.length}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Map Legend */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 rounded-lg p-3 z-[1000]">
          <div className="text-sm font-medium text-white mb-2">Legend</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-600 rounded-full border border-white"></div>
              <span className="text-gray-300">Critical</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-600 rounded-full border border-white"></div>
              <span className="text-gray-300">High</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-600 rounded-full border border-white"></div>
              <span className="text-gray-300">Medium</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-600 rounded-full border border-white"></div>
              <span className="text-gray-300">Low</span>
            </div>
            <div className="pt-1 border-t border-gray-600 mt-1">
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-3 h-3 bg-green-600 rounded-full border border-white"></div>
                <span className="text-gray-300">Available Team</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-600 rounded-full border border-white"></div>
                <span className="text-gray-300">En Route Team</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="text-sm text-gray-400">Map Coverage</div>
          <div className="text-lg font-bold text-white mt-1">
            Johannesburg Area
          </div>
        </div>
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="text-sm text-gray-400">Real-time Data</div>
          <div className="text-lg font-bold text-white mt-1">
            OpenStreetMap
          </div>
        </div>
      </div>
    </div>
  );
}