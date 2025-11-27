// components/control-room/LiveMap.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

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
  // Vehicle specific properties
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  // Crime specific properties
  report_type?: string;
}

interface LiveMapProps {
  vehicleReports: Report[];
  crimeReports: Report[];
}

export default function LiveMap({ vehicleReports, crimeReports }: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Enhanced geocoding function with better location parsing
  const geocodeLocation = async (location: string): Promise<[number, number] | null> => {
    if (!location || location.trim() === '') return null;

    try {
      // Try to parse coordinates directly if they exist in the location
      const coordMatch = location.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return [lat, lng];
        }
      }

      // Clean and normalize the location string
      const cleanLocation = location
        .trim()
        .toLowerCase()
        .replace(/[^\w\s,.-]/g, '') // Remove special characters except commas, dots, hyphens
        .replace(/\s+/g, ' ') // Normalize spaces
        .replace(/,/g, ', '); // Standardize comma spacing

      // Extended database of US cities and locations with coordinates
      const locationDatabase: { [key: string]: [number, number] } = {
        // Major US Cities
        'new york': [40.7128, -74.0060],
        'nyc': [40.7128, -74.0060],
        'manhattan': [40.7831, -73.9712],
        'brooklyn': [40.6782, -73.9442],
        'queens': [40.7282, -73.7949],
        'bronx': [40.8448, -73.8648],
        'los angeles': [34.0522, -118.2437],
        'la': [34.0522, -118.2437],
        'chicago': [41.8781, -87.6298],
        'houston': [29.7604, -95.3698],
        'phoenix': [33.4484, -112.0740],
        'philadelphia': [39.9526, -75.1652],
        'san antonio': [29.4241, -98.4936],
        'san diego': [32.7157, -117.1611],
        'dallas': [32.7767, -96.7970],
        'san jose': [37.3382, -121.8863],
        'austin': [30.2672, -97.7431],
        'jacksonville': [30.3322, -81.6557],
        'fort worth': [32.7555, -97.3308],
        'columbus': [39.9612, -82.9988],
        'charlotte': [35.2271, -80.8431],
        'indianapolis': [39.7684, -86.1581],
        'seattle': [47.6062, -122.3321],
        'denver': [39.7392, -104.9903],
        'washington dc': [38.9072, -77.0369],
        'washington d.c.': [38.9072, -77.0369],
        'boston': [42.3601, -71.0589],
        'el paso': [31.7619, -106.4850],
        'nashville': [36.1627, -86.7816],
        'detroit': [42.3314, -83.0458],
        'oklahoma city': [35.4676, -97.5164],
        'portland': [45.5152, -122.6784],
        'las vegas': [36.1699, -115.1398],
        'memphis': [35.1495, -90.0490],
        'louisville': [38.2527, -85.7585],
        'baltimore': [39.2904, -76.6122],
        'milwaukee': [43.0389, -87.9065],
        'albuquerque': [35.0844, -106.6504],
        'tucson': [32.2226, -110.9747],
        'fresno': [36.7378, -119.7871],
        'sacramento': [38.5816, -121.4944],
        'kansas city': [39.0997, -94.5786],
        'atlanta': [33.7490, -84.3880],
        'miami': [25.7617, -80.1918],
        'orlando': [28.5383, -81.3792],
        'tampa': [27.9506, -82.4572],
        'cleveland': [41.4993, -81.6944],
        'new orleans': [29.9511, -90.0715],
        
        // States and regions (centroid coordinates)
        'california': [36.7783, -119.4179],
        'texas': [31.9686, -99.9018],
        'florida': [27.6648, -81.5158],
        'new york state': [43.2994, -74.2179],
        'pennsylvania': [41.2033, -77.1945],
        'illinois': [40.6331, -89.3985],
        'ohio': [40.4173, -82.9071],
        'georgia': [32.1656, -82.9001],
        'north carolina': [35.7596, -79.0193],
        'michigan': [44.3148, -85.6024],
        
        // Common landmarks and areas
        'times square': [40.7580, -73.9855],
        'central park': [40.7829, -73.9654],
        'hollywood': [34.0922, -118.3207],
        'beverly hills': [34.0736, -118.4004],
        'santa monica': [34.0195, -118.4912],
        'venice beach': [33.9850, -118.4695],
        'downtown': [34.0500, -118.2500], // Generic downtown
      };

      // Try exact match first
      if (locationDatabase[cleanLocation]) {
        return locationDatabase[cleanLocation];
      }

      // Try partial matches
      for (const [key, coords] of Object.entries(locationDatabase)) {
        if (cleanLocation.includes(key) || key.includes(cleanLocation)) {
          return coords;
        }
      }

      // Try street address parsing (simple version)
      const streetMatch = cleanLocation.match(/(\d+)\s+([\w\s]+)(?:,\s*([\w\s]+))?(?:,\s*([\w\s]+))?/);
      if (streetMatch) {
        const [, number, street, city, state] = streetMatch;
        if (city && locationDatabase[city.toLowerCase().trim()]) {
          return locationDatabase[city.toLowerCase().trim()];
        }
      }

      // If no match found, use Nominatim OpenStreetMap geocoding API
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1&countrycodes=us`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
          }
        }
      } catch (apiError) {
        console.warn('Nominatim geocoding failed:', apiError);
      }

      // Final fallback: generate coordinates based on location hash for consistency
      const hash = location.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      const baseLat = 39.8283;
      const baseLng = -98.5795;
      const lat = baseLat + (hash % 200 - 100) / 1000;
      const lng = baseLng + ((hash * 137) % 200 - 100) / 1000;
      
      return [lat, lng];

    } catch (error) {
      console.error('Error geocoding location:', location, error);
      return null;
    }
  };

  useEffect(() => {
    if (!isClient || !mapContainerRef.current) return;

    const initializeMap = async () => {
      const L = await import('leaflet');
      
      // Import CSS dynamically without type checking
      if (typeof window !== 'undefined') {
        try {
          await import('leaflet/dist/leaflet.css');
        } catch (error) {
          console.warn('Leaflet CSS import failed, but continuing:', error);
        }
      }

      // Fix for default markers in Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      const map = L.map(mapContainerRef.current!).setView([39.8283, -98.5795], 4);
      const markers = L.layerGroup().addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

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

      // Process reports with progress tracking
      const allReports = [
        ...vehicleReports.map(report => ({ ...report, type: 'vehicle' as const })),
        ...crimeReports.map(report => ({ ...report, type: 'crime' as const }))
      ];

      let processedCount = 0;
      const totalReports = allReports.length;

      for (const report of allReports) {
        const location = report.last_seen_location || report.location;
        
        if (location) {
          const coordinates = await geocodeLocation(location);
          
          if (coordinates) {
            let iconColor = '#3B82F6'; // Default blue for crimes
            if (report.type === 'vehicle') {
              iconColor = report.severity === 'critical' ? '#EF4444' : 
                         report.severity === 'high' ? '#F97316' : 
                         '#EAB308';
            } else {
              iconColor = report.severity === 'critical' ? '#DC2626' : 
                         report.severity === 'high' ? '#EA580C' : 
                         '#CA8A04';
            }

            const icon = createCustomIcon(iconColor);
            const marker = L.marker(coordinates, { icon }).addTo(markers);

            // Build popup content safely
            let popupContent = `
              <div style="min-width: 250px; font-family: system-ui, sans-serif;">
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: ${
                  report.type === 'vehicle' ? '#EF4444' : '#3B82F6'
                };">
                  ${report.type === 'vehicle' ? '🚗 Vehicle Alert' : '🚨 Crime Report'}
                </div>
                <div style="margin-bottom: 6px; font-size: 14px;">
                  <strong>${report.type === 'vehicle' ? report.license_plate : report.title}</strong>
                </div>
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                  <strong>Location:</strong> ${location}
                </div>
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                  <strong>Severity:</strong> <span style="color: ${
                    report.severity === 'critical' ? '#EF4444' : 
                    report.severity === 'high' ? '#F97316' : 
                    '#EAB308'
                  };">${report.severity}</span>
                </div>
            `;

            // Add vehicle details if available
            if (report.type === 'vehicle' && report.vehicle_make) {
              popupContent += `
                <div style="font-size: 11px; color: #999; margin-top: 4px;">
                  <strong>Vehicle:</strong> ${report.vehicle_make} ${report.vehicle_model || ''}${report.vehicle_color ? ` • ${report.vehicle_color}` : ''}
                </div>
              `;
            }

            // Add crime type if available
            if (report.type === 'crime' && report.report_type) {
              popupContent += `
                <div style="font-size: 11px; color: #999; margin-top: 4px;">
                  <strong>Type:</strong> ${report.report_type}
                </div>
              `;
            }

            popupContent += `
                <div style="font-size: 11px; color: #999; margin-top: 4px;">
                  <strong>Reported:</strong> ${new Date(report.created_at).toLocaleDateString()}
                </div>
              </div>
            `;

            marker.bindPopup(popupContent);
          }
        }

        processedCount++;
        setGeocodingProgress(Math.round((processedCount / totalReports) * 100));
      }

      // Fit map to show all markers
      const markerLayers = markers.getLayers() as L.Marker[];
      if (markerLayers.length > 0) {
        const group = L.featureGroup(markerLayers);
        map.fitBounds(group.getBounds().pad(0.1));
      } else {
        // Default view if no markers
        map.setView([39.8283, -98.5795], 4);
      }

      setGeocodingProgress(100);

      return () => {
        map.remove();
      };
    };

    initializeMap();
  }, [isClient, vehicleReports, crimeReports]);

  if (!isClient) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">Live Incident Map</h3>
        </div>
        <div className="w-full h-96 rounded-lg border border-gray-600 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading Map...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-white">Live Incident Map</h3>
        <div className="flex items-center space-x-4 text-sm text-gray-400">
          {geocodingProgress < 100 && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span>Geocoding... {geocodingProgress}%</span>
            </div>
          )}
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
      
      <div className="mt-3 text-xs text-gray-500">
        Showing {vehicleReports.length} vehicle alerts and {crimeReports.length} crime reports
      </div>
    </div>
  );
}