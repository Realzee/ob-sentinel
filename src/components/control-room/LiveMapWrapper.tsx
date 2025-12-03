// components/control-room/LiveMapWrapper.tsx (Updated)
'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
  iconUrl: '/leaflet/images/marker-icon.png',
  shadowUrl: '/leaflet/images/marker-shadow.png',
});

interface LiveMapProps {
  vehicleReports: any[];
  crimeReports: any[];
  selectedEvent?: {
    id: string;
    lat: number;
    lng: number;
    type: 'vehicle' | 'crime' | 'other';
  };
  onEventSelect?: (eventId: string) => void;
}

export default function LiveMapWrapper({ 
  vehicleReports, 
  crimeReports, 
  selectedEvent,
  onEventSelect 
}: LiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !containerRef.current) return;

    if (!mapRef.current) {
      // Initialize map
      mapRef.current = L.map(containerRef.current).setView([-26.195246, 28.034088], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add vehicle markers
    vehicleReports.forEach(report => {
      const coords = parseCoordinates(report.last_seen_location);
      if (coords) {
        const marker = L.marker([coords.lat, coords.lng], {
          icon: createVehicleIcon(),
        })
          .addTo(mapRef.current!)
          .bindPopup(`
            <div style="min-width: 200px;">
              <strong style="color: #FF0000;">🚗 Vehicle Alert</strong><br/>
              <b>Plate:</b> ${report.license_plate || 'Unknown'}<br/>
              <b>Vehicle:</b> ${report.vehicle_make} ${report.vehicle_model}<br/>
              <b>Color:</b> ${report.vehicle_color}<br/>
              <b>Reason:</b> ${report.reason}<br/>
              <b>Status:</b> ${report.status}<br/>
              <b>Severity:</b> ${report.severity}<br/>
              <small>${new Date(report.created_at).toLocaleString()}</small>
            </div>
          `);

        marker.on('click', () => {
          if (onEventSelect) {
            onEventSelect(report.id);
          }
        });

        markersRef.current.push(marker);
      }
    });

    // Add crime markers
    crimeReports.forEach(report => {
      const coords = parseCoordinates(report.location);
      if (coords) {
        const marker = L.marker([coords.lat, coords.lng], {
          icon: createCrimeIcon(),
        })
          .addTo(mapRef.current!)
          .bindPopup(`
            <div style="min-width: 200px;">
              <strong style="color: #FFFF00;">🚨 Crime Report</strong><br/>
              <b>Title:</b> ${report.title}<br/>
              <b>Type:</b> ${report.report_type}<br/>
              <b>Location:</b> ${report.location}<br/>
              <b>Description:</b> ${report.description.substring(0, 100)}...<br/>
              <b>Status:</b> ${report.status}<br/>
              <b>Severity:</b> ${report.severity}<br/>
              <small>${new Date(report.created_at).toLocaleString()}</small>
            </div>
          `);

        marker.on('click', () => {
          if (onEventSelect) {
            onEventSelect(report.id);
          }
        });

        markersRef.current.push(marker);
      }
    });

    // Fit bounds to show all markers
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapRef.current.fitBounds(group.getBounds().pad(0.1));
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isClient, vehicleReports, crimeReports]);

  // Handle selected event focus
  useEffect(() => {
    if (selectedEvent && mapRef.current) {
      // Find the marker for the selected event
      const selectedMarker = markersRef.current.find(marker => {
        const latLng = marker.getLatLng();
        return latLng.lat === selectedEvent.lat && latLng.lng === selectedEvent.lng;
      });

      if (selectedMarker) {
        // Highlight selected marker
        selectedMarker.setIcon(
          selectedEvent.type === 'vehicle' 
            ? createSelectedVehicleIcon() 
            : createSelectedCrimeIcon()
        );
        
        // Center and zoom to marker
        mapRef.current.setView(selectedMarker.getLatLng(), 15);
        selectedMarker.openPopup();
      }
    }
  }, [selectedEvent]);

  const parseCoordinates = (location: string): { lat: number; lng: number } | null => {
    if (!location) return null;
    
    // Try to parse coordinates from string
    const parts = location.split(',');
    if (parts.length === 2) {
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    
    // Return default Johannesburg coordinates if parsing fails
    return { lat: -26.195246, lng: 28.034088 };
  };

  const createVehicleIcon = () => {
    return L.divIcon({
      className: 'vehicle-marker',
      html: `<div style="
        background: #FF0000;
        color: white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">🚗</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  const createCrimeIcon = () => {
    return L.divIcon({
      className: 'crime-marker',
      html: `<div style="
        background: #FFFF00;
        color: black;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        border: 2px solid black;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">🚨</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  const createSelectedVehicleIcon = () => {
    return L.divIcon({
      className: 'selected-vehicle-marker',
      html: `<div style="
        background: white;
        color: #FF0000;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        border: 3px solid #FF0000;
        box-shadow: 0 4px 8px rgba(255,0,0,0.4);
        animation: pulse 1.5s infinite;
      ">🚗</div>
      <style>
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255,0,0,0.7); }
          70% { box-shadow: 0 0 0 10px rgba(255,0,0,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,0,0,0); }
        }
      </style>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const createSelectedCrimeIcon = () => {
    return L.divIcon({
      className: 'selected-crime-marker',
      html: `<div style="
        background: black;
        color: #FFFF00;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        border: 3px solid #FFFF00;
        box-shadow: 0 4px 8px rgba(255,255,0,0.4);
        animation: pulse-yellow 1.5s infinite;
      ">🚨</div>
      <style>
        @keyframes pulse-yellow {
          0% { box-shadow: 0 0 0 0 rgba(255,255,0,0.7); }
          70% { box-shadow: 0 0 0 10px rgba(255,255,0,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,0,0); }
        }
      </style>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  if (!isClient) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="text-gray-400 mt-2">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />
      
      {/* Map Controls Overlay */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        <button
          onClick={() => {
            if (mapRef.current && markersRef.current.length > 0) {
              const group = L.featureGroup(markersRef.current);
              mapRef.current.fitBounds(group.getBounds().pad(0.1));
            }
          }}
          className="bg-black/80 text-white p-2 rounded-lg hover:bg-black"
          title="Fit to all markers"
        >
          ↻
        </button>
      </div>
    </div>
  );
}