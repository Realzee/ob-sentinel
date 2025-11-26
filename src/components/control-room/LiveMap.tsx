// components/control-room/LiveMap.tsx
'use client';

import { useEffect, useRef } from 'react';

interface VehicleReport {
  id: string;
  license_plate: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  last_seen_location: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  created_at: string;
  latitude?: number;
  longitude?: number;
}

interface CrimeReport {
  id: string;
  title: string;
  report_type: string;
  location: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  created_at: string;
  latitude?: number;
  longitude?: number;
}

interface LiveMapProps {
  vehicleReports: VehicleReport[];
  crimeReports: CrimeReport[];
}

// Sample coordinates for demo (you can replace with actual coordinates from your data)
const SAMPLE_COORDINATES = [
  { lat: 40.7128, lng: -74.0060 }, // New York
  { lat: 40.7589, lng: -73.9851 }, // Times Square
  { lat: 40.7505, lng: -73.9934 }, // Empire State
  { lat: 40.6892, lng: -74.0445 }, // Statue of Liberty
  { lat: 40.7812, lng: -73.9665 }, // Central Park
];

export default function LiveMap({ vehicleReports, crimeReports }: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = async () => {
      try {
        const L = await import('leaflet');
        
        // Fix for default markers in Next.js
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Initialize map centered on New York
        const map = L.map(mapRef.current!).setView([40.7128, -74.0060], 12);
        mapInstanceRef.current = map;

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map);

        // Add markers for reports
        updateMarkers(L, map, vehicleReports, crimeReports);

      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
      markersRef.current.forEach(marker => {
        marker.remove();
      });
    };
  }, []);

  // Update markers when reports change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const L = require('leaflet');
    updateMarkers(L, mapInstanceRef.current, vehicleReports, crimeReports);
  }, [vehicleReports, crimeReports]);

  const updateMarkers = (L: any, map: any, vehicles: VehicleReport[], crimes: CrimeReport[]) => {
    // Remove existing markers
    markersRef.current.forEach(marker => {
      marker.remove();
    });
    markersRef.current = [];

    // Add vehicle markers
    vehicles.forEach((vehicle, index) => {
      const coordIndex = index % SAMPLE_COORDINATES.length;
      const coords = SAMPLE_COORDINATES[coordIndex];
      
      const getVehicleColor = (severity: string) => {
        switch (severity) {
          case 'critical': return '#DC2626'; // red-600
          case 'high': return '#EA580C'; // orange-600
          case 'medium': return '#D97706'; // amber-600
          default: return '#CA8A04'; // yellow-600
        }
      };

      const vehicleIcon = L.divIcon({
        className: 'vehicle-marker',
        html: `
          <div style="
            background-color: ${getVehicleColor(vehicle.severity)};
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            font-size: 14px;
          ">🚗</div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: vehicleIcon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width: 250px; font-family: system-ui, sans-serif;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1F2937;">Vehicle Alert</h3>
            <div style="display: grid; gap: 4px; font-size: 14px;">
              <div><strong>Plate:</strong> ${vehicle.license_plate}</div>
              <div><strong>Vehicle:</strong> ${vehicle.vehicle_color} ${vehicle.vehicle_make} ${vehicle.vehicle_model}</div>
              <div><strong>Location:</strong> ${vehicle.last_seen_location}</div>
              <div><strong>Severity:</strong> <span style="color: ${getVehicleColor(vehicle.severity)}; font-weight: bold">${vehicle.severity}</span></div>
              <div><strong>Reported:</strong> ${new Date(vehicle.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        `);

      markersRef.current.push(marker);
    });

    // Add crime markers
    crimes.forEach((crime, index) => {
      const coordIndex = (index + vehicles.length) % SAMPLE_COORDINATES.length;
      const coords = SAMPLE_COORDINATES[coordIndex];
      
      const getCrimeColor = (severity: string) => {
        switch (severity) {
          case 'critical': return '#7C2D12'; // red-900
          case 'high': return '#9A3412'; // orange-800
          case 'medium': return '#B45309'; // amber-700
          default: return '#D97706'; // amber-600
        }
      };

      const crimeIcon = L.divIcon({
        className: 'crime-marker',
        html: `
          <div style="
            background-color: ${getCrimeColor(crime.severity)};
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            font-size: 14px;
          ">🚨</div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: crimeIcon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width: 250px; font-family: system-ui, sans-serif;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1F2937;">Crime Report</h3>
            <div style="display: grid; gap: 4px; font-size: 14px;">
              <div><strong>Type:</strong> ${crime.report_type}</div>
              <div><strong>Title:</strong> ${crime.title}</div>
              <div><strong>Location:</strong> ${crime.location}</div>
              <div><strong>Severity:</strong> <span style="color: ${getCrimeColor(crime.severity)}; font-weight: bold">${crime.severity}</span></div>
              <div><strong>Reported:</strong> ${new Date(crime.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        `);

      markersRef.current.push(marker);
    });
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-white">Live Incident Map</h3>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span className="text-gray-400">Vehicle Alerts</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-amber-800 rounded-full"></div>
            <span className="text-gray-400">Crime Reports</span>
          </div>
        </div>
      </div>
      <div 
        ref={mapRef} 
        className="w-full h-96 rounded-lg border border-gray-600"
      />
      <div className="mt-3 text-xs text-gray-400">
        Showing {vehicleReports.length} vehicle alerts and {crimeReports.length} crime reports
      </div>
    </div>
  );
}