// components/maps/ControllerMap.tsx
'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
  iconUrl: '/leaflet/images/marker-icon.png',
  shadowUrl: '/leaflet/images/marker-shadow.png',
});

interface ControllerMapProps {
  vehicleReports: any[];
  crimeReports: any[];
  responders: any[];
}

export default function ControllerMap({ vehicleReports, crimeReports, responders }: ControllerMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    mapRef.current = L.map(mapContainerRef.current).setView([-26.195246, 28.034088], 12);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

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
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add vehicle report markers
    vehicleReports.forEach((report) => {
      const location = report.last_seen_location;
      if (location) {
        try {
          const [lat, lng] = location.split(',').map((coord: string) => parseFloat(coord.trim()));
          
          if (!isNaN(lat) && !isNaN(lng)) {
            const vehicleIcon = L.divIcon({
              html: `<div class="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs bg-red-500">V</div>`,
              className: 'custom-marker',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });

            const marker = L.marker([lat, lng], { icon: vehicleIcon })
              .addTo(mapRef.current!)
              .bindPopup(`
                <div class="p-2">
                  <strong>Vehicle: ${report.license_plate}</strong><br/>
                  <small>${report.last_seen_location}</small><br/>
                  <small>Status: ${report.status}</small>
                </div>
              `);

            markersRef.current.push(marker);
          }
        } catch (error) {
          console.error('Error parsing location:', location);
        }
      }
    });

    // Add crime report markers
    crimeReports.forEach((report) => {
      const location = report.location;
      if (location) {
        try {
          const [lat, lng] = location.split(',').map((coord: string) => parseFloat(coord.trim()));
          
          if (!isNaN(lat) && !isNaN(lng)) {
            const crimeIcon = L.divIcon({
              html: `<div class="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs bg-blue-500">C</div>`,
              className: 'custom-marker',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });

            const marker = L.marker([lat, lng], { icon: crimeIcon })
              .addTo(mapRef.current!)
              .bindPopup(`
                <div class="p-2">
                  <strong>Crime: ${report.title}</strong><br/>
                  <small>${report.location}</small><br/>
                  <small>Type: ${report.report_type}</small>
                </div>
              `);

            markersRef.current.push(marker);
          }
        } catch (error) {
          console.error('Error parsing location:', location);
        }
      }
    });

    // Add responder markers
    responders.forEach((responder) => {
      if (responder.currentLocation) {
        try {
          const [lat, lng] = responder.currentLocation.split(',').map((coord: string) => parseFloat(coord.trim()));
          
          if (!isNaN(lat) && !isNaN(lng)) {
            const responderIcon = L.divIcon({
              html: `<div class="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs bg-green-500">R</div>`,
              className: 'custom-marker',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });

            const marker = L.marker([lat, lng], { icon: responderIcon })
              .addTo(mapRef.current!)
              .bindPopup(`
                <div class="p-2">
                  <strong>Responder: ${responder.name}</strong><br/>
                  <small>Status: ${responder.status}</small><br/>
                  <small>Role: ${responder.role}</small>
                </div>
              `);

            markersRef.current.push(marker);
          }
        } catch (error) {
          console.error('Error parsing location:', responder.currentLocation);
        }
      }
    });

    // Fit bounds to show all markers
    if (markersRef.current.length > 0) {
      const group = new L.FeatureGroup(markersRef.current);
      mapRef.current.fitBounds(group.getBounds().pad(0.1));
    }

  }, [vehicleReports, crimeReports, responders]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full rounded-xl"
      style={{ minHeight: '400px' }}
    />
  );
}