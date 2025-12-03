// components/control-room/LiveMapWrapper.tsx
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the MapContainer with no SSR
const MapContainer = dynamic(() => import('./MapContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900 rounded-xl flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        <p className="text-gray-400 mt-2">Loading map...</p>
      </div>
    </div>
  ),
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

export default function LiveMapWrapper(props: LiveMapProps) {
  return <MapContainer {...props} />;
}