// components/control-room/EventStack.tsx
'use client';

import { useState, useEffect } from 'react';

interface EventReport {
  id: string;
  type: 'vehicle' | 'crime' | 'other';
  title: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
    zone?: string;
    area?: string;
    region?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  status: 'active' | 'pending' | 'resolved';
  counters?: {
    witnesses?: number;
    evidence?: number;
    related?: number;
  };
  vehicleDetails?: {
    license_plate: string;
    make: string;
    model: string;
    color: string;
  };
}

interface EventStackProps {
  vehicleReports: any[];
  crimeReports: any[];
  onSelectEvent: (event: EventReport) => void;
  selectedEventId?: string;
}

export default function EventStack({ 
  vehicleReports, 
  crimeReports, 
  onSelectEvent,
  selectedEventId 
}: EventStackProps) {
  const [events, setEvents] = useState<EventReport[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    setIsBrowser(typeof window !== 'undefined');
  }, []);

  // Transform reports into event format
  useEffect(() => {
    const transformEvents = () => {
      const now = new Date().toISOString();
      setLastUpdate(now);
      
      const newEvents: EventReport[] = [];
      
      // Transform vehicle reports
      vehicleReports.forEach(report => {
        const event: EventReport = {
          id: report.id,
          type: 'vehicle',
          title: `Vehicle Alert: ${report.license_plate || 'Unknown'}`,
          description: report.reason || 'Vehicle alert reported',
          location: {
            lat: parseFloat(report.last_seen_location?.split(',')[0]) || 0,
            lng: parseFloat(report.last_seen_location?.split(',')[1]) || 0,
            address: report.last_seen_location || 'Unknown location',
            zone: report.zone || 'Zone A',
            area: report.area || 'Urban',
            region: report.region || 'Region 1'
          },
          severity: report.severity || 'medium',
          timestamp: report.created_at,
          status: report.status || 'active',
          counters: {
            witnesses: 1,
            evidence: report.evidence_images?.length || 0
          },
          vehicleDetails: {
            license_plate: report.license_plate,
            make: report.vehicle_make,
            model: report.vehicle_model,
            color: report.vehicle_color
          }
        };
        newEvents.unshift(event); // Add to beginning (newest first)
      });
      
      // Transform crime reports
      crimeReports.forEach(report => {
        const event: EventReport = {
          id: report.id,
          type: 'crime',
          title: report.title || 'Crime Report',
          description: report.description || 'Crime incident reported',
          location: {
            lat: parseFloat(report.location?.split(',')[0]) || 0,
            lng: parseFloat(report.location?.split(',')[1]) || 0,
            address: report.location || 'Unknown location',
            zone: report.zone || 'Zone B',
            area: report.area || 'Urban',
            region: report.region || 'Region 1'
          },
          severity: report.severity || 'medium',
          timestamp: report.created_at,
          status: report.status || 'active',
          counters: {
            witnesses: report.witness_info ? 1 : 0,
            evidence: report.evidence_images?.length || 0,
            related: 0
          }
        };
        newEvents.unshift(event); // Add to beginning (newest first)
      });
      
      // Sort by timestamp (newest first)
      newEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setEvents(newEvents);
    };
    
    transformEvents();
    
    // Auto-update every 5 seconds
    if (isBrowser) {
      const interval = setInterval(transformEvents, 5000);
      return () => clearInterval(interval);
    }
  }, [vehicleReports, crimeReports, isBrowser]);

  // Get event style based on type
  const getEventStyle = (event: EventReport, isSelected: boolean) => {
    const baseStyles: React.CSSProperties = {
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    };
    
    if (isSelected) {
      // Inverted colors for selected state
      switch (event.type) {
        case 'vehicle':
          return {
            ...baseStyles,
            backgroundColor: '#FFFFFF', // White background
            color: '#FF0000', // Red text
            border: '2px solid #FF0000'
          };
        case 'crime':
          return {
            ...baseStyles,
            backgroundColor: '#000000', // Black background
            color: '#FFFF00', // Yellow text
            border: '2px solid #FFFF00'
          };
        default:
          return {
            ...baseStyles,
            backgroundColor: '#FFFFFF', // White background
            color: '#000000', // Black text
            border: '2px solid #CCCCCC'
          };
      }
    } else {
      // Normal state
      switch (event.type) {
        case 'vehicle':
          return {
            ...baseStyles,
            backgroundColor: '#FF0000', // Red background
            color: '#FFFFFF' // White text
          };
        case 'crime':
          return {
            ...baseStyles,
            backgroundColor: '#FFFF00', // Yellow background
            color: '#000000' // Black text
          };
        default:
          return {
            ...baseStyles,
            backgroundColor: '#000000', // Black background
            color: '#CCCCCC' // Light grey text
          };
      }
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse"></span>;
      case 'high':
        return <span className="inline-block w-2 h-2 rounded-full bg-white"></span>;
      default:
        return <span className="inline-block w-2 h-2 rounded-full bg-gray-300"></span>;
    }
  };

  // Show loading state on server
  if (!isBrowser) {
    return (
      <div className="h-full rounded-xl border border-gray-700 overflow-hidden bg-gray-900 p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-800 rounded mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 p-4 border-b border-gray-800">
        <div className="flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">Live Event Stack</h3>
          <div className="flex items-center space-x-2">
            <div className="text-xs text-gray-400">
              {events.length} events
            </div>
            <div className="text-xs text-gray-500">
              Updated: {lastUpdate ? formatTime(lastUpdate) : 'Just now'}
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center space-x-4 mt-3">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FF0000' }}></div>
            <span className="text-xs text-gray-300">Vehicle</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FFFF00' }}></div>
            <span className="text-xs text-gray-300">Crime</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 rounded bg-black"></div>
            <span className="text-xs text-gray-300">Other</span>
          </div>
        </div>
      </div>
      
      {/* Event List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-2">
          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No active events
            </div>
          ) : (
            events.map((event) => {
              const isSelected = selectedEventId === event.id;
              return (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  style={getEventStyle(event, isSelected)}
                  className="rounded-lg p-3 hover:opacity-90 active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between">
                    {/* Left Column: Event/Zone Description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        {getSeverityBadge(event.severity)}
                        <span className="font-bold text-sm truncate">
                          {event.title}
                        </span>
                      </div>
                      <div className="text-xs opacity-90 truncate">
                        {event.description}
                      </div>
                      <div className="text-xs mt-1 flex items-center space-x-2">
                        <span>{event.location.zone}</span>
                        <span className="opacity-70">•</span>
                        <span>{formatTime(event.timestamp)}</span>
                      </div>
                    </div>
                    
                    {/* Middle Columns: Area, Region */}
                    <div className="flex items-center space-x-3 ml-4">
                      <div className="text-center">
                        <div className="text-xs opacity-80">Area</div>
                        <div className="text-sm font-medium">
                          {event.location.area}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs opacity-80">Region</div>
                        <div className="text-sm font-medium">
                          {event.location.region}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Columns: Counters and Status */}
                    <div className="flex items-center space-x-4 ml-4">
                      <div className="text-center">
                        <div className="text-xs opacity-80">Status</div>
                        <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                          event.status === 'active' ? 'bg-green-500/20 text-green-300' :
                          event.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {event.status}
                        </div>
                      </div>
                      
                      {event.counters && (
                        <div className="flex items-center space-x-3">
                          {event.counters.witnesses !== undefined && (
                            <div className="text-center">
                              <div className="text-xs opacity-80">Wit.</div>
                              <div className="text-sm font-medium">
                                {event.counters.witnesses}
                              </div>
                            </div>
                          )}
                          {event.counters.evidence !== undefined && (
                            <div className="text-center">
                              <div className="text-xs opacity-80">Evid.</div>
                              <div className="text-sm font-medium">
                                {event.counters.evidence}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Vehicle details if applicable */}
                  {event.type === 'vehicle' && event.vehicleDetails && (
                    <div className="mt-2 pt-2 border-t border-current border-opacity-20">
                      <div className="text-xs flex items-center space-x-4">
                        <span>Plate: {event.vehicleDetails.license_plate}</span>
                        <span>Make: {event.vehicleDetails.make}</span>
                        <span>Color: {event.vehicleDetails.color}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-gray-900 p-3 border-t border-gray-800">
        <div className="text-xs text-gray-500 text-center">
          Click any event to focus on map • Auto-refresh every 5s
        </div>
      </div>
    </div>
  );
}