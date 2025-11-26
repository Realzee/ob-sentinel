// components/control-room/OpenStreetMap.tsx
'use client';

import { useEffect, useRef } from 'react';

interface Report {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  location: {
    lat: number;
    lng: number;
  };
  timestamp: string;
  assignedController?: string;
}

interface OpenStreetMapProps {
  reports: Report[];
  onReportSelect: (report: Report) => void;
}

export default function OpenStreetMap({ reports, onReportSelect }: OpenStreetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Dynamically import Leaflet only on client side
    const initMap = async () => {
      const L = await import('leaflet');
      
      // Fix for default markers in Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // Initialize map
      const map = L.map(mapRef.current!).setView([40.7128, -74.0060], 12);
      mapInstanceRef.current = map;

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      // Add markers for reports
      updateMarkers(L, map, reports, onReportSelect);
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
    updateMarkers(L, mapInstanceRef.current, reports, onReportSelect);
  }, [reports, onReportSelect]);

  const updateMarkers = (L: any, map: any, reports: Report[], onReportSelect: (report: Report) => void) => {
    // Remove existing markers
    markersRef.current.forEach(marker => {
      marker.remove();
    });

    // Add new markers
    markersRef.current = reports.map(report => {
      const getMarkerColor = (status: string, priority: string) => {
        if (status === 'resolved') return '#10B981'; // green
        if (priority === 'high') return '#EF4444'; // red
        if (priority === 'medium') return '#F59E0B'; // orange
        return '#EAB308'; // yellow
      };

      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background-color: ${getMarkerColor(report.status, report.priority)};
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            font-size: 12px;
          ">!</div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([report.location.lat, report.location.lng], { icon: customIcon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width: 250px; font-family: system-ui, sans-serif;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1F2937;">${report.title}</h3>
            <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px;">${report.description}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="padding: 4px 8px; background: ${getMarkerColor(report.status, report.priority)}; color: white; border-radius: 4px; font-size: 12px; font-weight: 500;">
                ${report.status} • ${report.priority}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #9CA3AF;">
              <span>${new Date(report.timestamp).toLocaleDateString()}</span>
              <span>${report.assignedController || 'Unassigned'}</span>
            </div>
            <button 
              onclick="window.selectReport && window.selectReport('${report.id}')" 
              style="width: 100%; margin-top: 8px; padding: 6px 12px; background: #3B82F6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;"
            >
              View Details
            </button>
          </div>
        `);

      marker.on('click', () => {
        onReportSelect(report);
      });

      return marker;
    });

    // Add global function for popup buttons
    (window as any).selectReport = (reportId: string) => {
      const report = reports.find(r => r.id === reportId);
      if (report) onReportSelect(report);
    };
  };

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full rounded-lg"
      style={{ minHeight: '400px' }}
    />
  );
}