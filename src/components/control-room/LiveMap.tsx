// components/control-room/LiveMap.tsx
'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different report types
const createCustomIcon = (color: string) => {
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
    className: 'custom-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

interface Report {
  id: string;
  license_plate?: string;
  title?: string;
  last_seen_location?: string;
  location?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  latitude?: number;
  longitude?: number;
  created_at: string;
}

interface LiveMapProps {
  vehicleReports: Report[];
  crimeReports: Report[];
}

export default function LiveMap({ vehicleReports, crimeReports }: LiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup>(L.layerGroup());

  // Function to geocode location string to coordinates
  const geocodeLocation = async (location: string): Promise<[number, number] | null> => {
    try {
      // This is a simple implementation - you might want to use a proper geocoding service
      // For demo purposes, we'll return mock coordinates based on the location string
      const mockCoordinates: { [key: string]: [number, number] } = {
        'new york': [40.7128, -74.0060],
        'los angeles': [34.0522, -118.2437],
        'chicago': [41.8781, -87.6298],
        'houston': [29.7604, -95.3698],
        'phoenix': [33.4484, -112.0740],
        'philadelphia': [39.9526, -75.1652],
        'san antonio': [29.4241, -98.4936],
        'san diego': [32.7157, -117.1611],
        'dallas': [32.7767, -96.7970],
        'san jose': [37.3382, -121.8863],
      };

      const normalizedLocation = location.toLowerCase();
      for (const [key, coords] of Object.entries(mockCoordinates)) {
        if (normalizedLocation.includes(key)) {
          return coords;
        }
      }

      // Fallback: generate random coordinates within US bounds
      return [39.8283 + (Math.random() - 0.5) * 20, -98.5795 + (Math.random() - 0.5) * 30];
    } catch (error) {
      console.error('Error geocoding location:', error);
      return null;
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    mapRef.current = L.map(mapContainerRef.current).setView([39.8283, -98.5795], 4); // Center on US

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(mapRef.current);

    // Add marker layer group to map
    markersRef.current.addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.clearLayers();

    // Process and add markers for all reports
    const processReports = async () => {
      const allReports = [
        ...vehicleReports.map(report => ({ ...report, type: 'vehicle' as const })),
        ...crimeReports.map(report => ({ ...report, type: 'crime' as const }))
      ];

      for (const report of allReports) {
        const location = report.last_seen_location || report.location;
        if (!location) continue;

        let coordinates: [number, number] | null = null;

        // Use provided coordinates if available
        if (report.latitude && report.longitude) {
          coordinates = [report.latitude, report.longitude];
        } else {
          // Geocode the location string
          coordinates = await geocodeLocation(location);
        }

        if (!coordinates) continue;

        // Determine icon color based on type and severity
        let iconColor = '#3B82F6'; // Default blue
        if (report.type === 'vehicle') {
          iconColor = report.severity === 'critical' ? '#EF4444' : 
                     report.severity === 'high' ? '#F97316' : 
                     '#EAB308'; // red, orange, yellow
        } else {
          iconColor = report.severity === 'critical' ? '#DC2626' : 
                     report.severity === 'high' ? '#EA580C' : 
                     '#CA8A04'; // darker red, orange, yellow for crimes
        }

        const icon = createCustomIcon(iconColor);

        // Create marker
        const marker = L.marker(coordinates, { icon })
          .addTo(markersRef.current);

        // Create popup content
        const popupContent = `
          <div style="min-width: 200px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: ${
              report.type === 'vehicle' ? '#EF4444' : '#3B82F6'
            };">
              ${report.type === 'vehicle' ? '🚗 Vehicle Alert' : '🚨 Crime Report'}
            </div>
            <div style="margin-bottom: 6px;">
              <strong>${
                report.type === 'vehicle' 
                  ? report.license_plate 
                  : report.title
              }</strong>
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
              Location: ${location}
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
              Severity: <span style="color: ${
                report.severity === 'critical' ? '#EF4444' : 
                report.severity === 'high' ? '#F97316' : 
                '#EAB308'
              };">${report.severity}</span>
            </div>
            <div style="font-size: 11px; color: #999;">
              Reported: ${new Date(report.created_at).toLocaleDateString()}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
      }

      // Fit map to show all markers if there are any
      const markers = markersRef.current.getLayers() as L.Marker[];
      if (markers.length > 0 && mapRef.current) {
        const group = new L.FeatureGroup(markers);
        mapRef.current.fitBounds(group.getBounds().pad(0.1));
      }
    };

    processReports();
  }, [vehicleReports, crimeReports]);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-white">Live Incident Map</h3>
        <div className="flex items-center space-x-4 text-sm text-gray-400">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Vehicle Alerts</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Crime Reports</span>
          </div>
        </div>
      </div>
      <div 
        ref={mapContainerRef} 
        className="w-full h-96 rounded-lg border border-gray-600"
        style={{ minHeight: '400px' }}
      />
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-400">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-red-600"></div>
          <span>Critical</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
          <span>High</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <span>Medium</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span>Low/Crime</span>
        </div>
      </div>
    </div>
  );
}