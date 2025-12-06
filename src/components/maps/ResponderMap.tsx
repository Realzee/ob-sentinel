// components/maps/ResponderMap.tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
  iconUrl: '/leaflet/images/marker-icon.png',
  shadowUrl: '/leaflet/images/marker-shadow.png',
});

interface ResponderMapProps {
  assignedReports: any[];
  currentLocation: [number, number] | null;
  onReportSelect: (report: any) => void;
}

// Custom icons
const createCustomIcon = (type: 'vehicle' | 'crime' | 'responder', status?: string) => {
  const color = type === 'vehicle' ? 'red' : type === 'crime' ? 'blue' : 'green';
  const iconSize = type === 'responder' ? [32, 32] : [28, 28];
  
  return L.divIcon({
    html: `
      <div class="w-${type === 'responder' ? '8' : '7'} h-${type === 'responder' ? '8' : '7'} rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg border-2 border-white ${status === 'critical' ? 'animate-pulse' : ''}" 
           style="background-color: ${color};">
        ${type === 'vehicle' ? 'V' : type === 'crime' ? 'C' : 'R'}
      </div>
    `,
    className: 'custom-marker',
    iconSize: iconSize as [number, number],
    iconAnchor: [iconSize[0] / 2, iconSize[1] / 2]
  });
};

export default function ResponderMap({ assignedReports, currentLocation, onReportSelect }: ResponderMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const currentLocationMarkerRef = useRef<L.Marker | null>(null);

  // Initialize map
  const initializeMap = useCallback(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default to Johannesburg coordinates if no current location
    const defaultCenter: [number, number] = [-26.195246, 28.034088];
    const center = currentLocation || defaultCenter;

    mapRef.current = L.map(mapContainerRef.current).setView(center, 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    // Add scale control
    L.control.scale({ imperial: false }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [currentLocation]);

  // Update current location marker
  const updateCurrentLocation = useCallback(() => {
    if (!mapRef.current || !currentLocation) return;

    // Remove previous current location marker
    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.remove();
    }

    // Create current location marker
    const currentLocationIcon = L.divIcon({
      html: `
        <div class="relative">
          <div class="w-10 h-10 rounded-full bg-blue-500/20 border-2 border-blue-500 animate-pulse"></div>
          <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-blue-500 border-2 border-white"></div>
          <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white"></div>
        </div>
      `,
      className: 'current-location-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    currentLocationMarkerRef.current = L.marker(currentLocation, { icon: currentLocationIcon })
      .addTo(mapRef.current)
      .bindPopup('<div class="font-semibold">Your Current Location</div>')
      .openPopup();
  }, [currentLocation]);

  // Update report markers
  const updateReportMarkers = useCallback(() => {
    if (!mapRef.current) return;

    // Clear existing report markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add report markers
    assignedReports.forEach((report) => {
      const location = report.last_seen_location || report.location;
      if (location) {
        try {
          const [lat, lng] = location.split(',').map((coord: string) => parseFloat(coord.trim()));
          
          if (!isNaN(lat) && !isNaN(lng)) {
            const reportType = report.license_plate ? 'vehicle' : 'crime';
            const icon = createCustomIcon(reportType, report.severity);

            const marker = L.marker([lat, lng], { icon })
              .addTo(mapRef.current!)
              .bindPopup(`
                <div class="p-3 min-w-[200px]">
                  <div class="font-semibold text-gray-800 mb-1">
                    ${report.license_plate || report.title}
                  </div>
                  <div class="text-sm text-gray-600 mb-2">
                    ${report.last_seen_location || report.location}
                  </div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs px-2 py-1 rounded ${report.severity === 'critical' ? 'bg-red-100 text-red-800' : report.severity === 'high' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}">
                      ${report.severity}
                    </span>
                    <span class="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                      ${reportType === 'vehicle' ? 'Vehicle' : 'Crime'}
                    </span>
                  </div>
                  <button 
                    onclick="window.dispatchEvent(new CustomEvent('selectReport', { detail: '${report.id}' }))" 
                    class="w-full mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                  >
                    View Details
                  </button>
                </div>
              `);

            // Add click event
            marker.on('click', () => {
              onReportSelect(report);
            });

            markersRef.current.push(marker);
          }
        } catch (error) {
          console.error('Error parsing location:', location);
        }
      }
    });
  }, [assignedReports, onReportSelect]);

  // Fit bounds to show all markers
  const fitMapBounds = useCallback(() => {
    if (!mapRef.current || markersRef.current.length === 0) return;

    const group = new L.FeatureGroup(markersRef.current);
    
    // Add current location to bounds if available
    if (currentLocationMarkerRef.current) {
      group.addLayer(currentLocationMarkerRef.current);
    }

    mapRef.current.fitBounds(group.getBounds().pad(0.1));
  }, []);

  // Initialize map on mount
  useEffect(() => {
    initializeMap();
    
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initializeMap]);

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current) return;

    updateCurrentLocation();
    updateReportMarkers();
    fitMapBounds();
  }, [updateCurrentLocation, updateReportMarkers, fitMapBounds]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
        setTimeout(() => {
          if (mapRef.current && (markersRef.current.length > 0 || currentLocationMarkerRef.current)) {
            fitMapBounds();
          }
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitMapBounds]);

  // Add navigation controls if current location exists
  const handleCenterOnLocation = () => {
    if (mapRef.current && currentLocation) {
      mapRef.current.setView(currentLocation, 15);
    }
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const handleFitBounds = () => {
    fitMapBounds();
  };

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden">
      {/* Map container */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full rounded-xl"
        style={{ minHeight: '500px' }}
      />
      
      {/* Map controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col space-y-2">
        <button
          onClick={handleCenterOnLocation}
          disabled={!currentLocation}
          className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Center on my location"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
          title="Zoom in"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
        
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
          title="Zoom out"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
          </svg>
        </button>
        
        <button
          onClick={handleFitBounds}
          className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
          title="Fit to all markers"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="text-sm font-semibold text-gray-800 mb-2">Legend</div>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-xs text-gray-700">Vehicle Reports</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            <span className="text-xs text-gray-700">Crime Reports</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-xs text-gray-700">Your Location</span>
          </div>
          {assignedReports.some(r => r.severity === 'critical') && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-xs text-gray-700">Critical Reports</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats overlay */}
      {assignedReports.length > 0 && (
        <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="text-sm font-semibold text-gray-800 mb-1">Assigned Reports</div>
          <div className="flex items-center space-x-3">
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">
                {assignedReports.filter(r => r.license_plate).length}
              </div>
              <div className="text-xs text-gray-600">Vehicles</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {assignedReports.filter(r => !r.license_plate).length}
              </div>
              <div className="text-xs text-gray-600">Crimes</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-600">
                {assignedReports.filter(r => r.severity === 'critical').length}
              </div>
              <div className="text-xs text-gray-600">Critical</div>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {!mapRef.current && (
        <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-[999]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="text-white mt-4">Loading map...</p>
          </div>
        </div>
      )}

      {/* No reports message */}
      {assignedReports.length === 0 && mapRef.current && (
        <div className="absolute inset-0 flex items-center justify-center z-[800] pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-xl p-6 max-w-md mx-4">
            <div className="text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-white mb-2">No Assigned Reports</h3>
              <p className="text-gray-300 text-sm">
                You don't have any reports assigned to you yet. Reports will appear here once assigned by a controller.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add custom styles */}
      <style jsx global>{`
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .current-location-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .leaflet-popup-content {
          margin: 0 !important;
          padding: 0 !important;
        }
        
        .leaflet-popup-content-wrapper {
          border-radius: 8px !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        
        .leaflet-popup-tip {
          background: white !important;
        }
        
        .leaflet-control-attribution {
          font-size: 9px !important;
          background: rgba(255, 255, 255, 0.8) !important;
        }
        
        .leaflet-control-scale-line {
          background: rgba(255, 255, 255, 0.8) !important;
          border: 2px solid #666 !important;
          border-top: none !important;
          color: #333 !important;
          font-size: 10px !important;
        }
      `}</style>
    </div>
  );
}