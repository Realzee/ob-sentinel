// components/control-room/LiveMap.tsx
'use client';

import { useState, useEffect } from 'react';

interface LiveMapProps {
  vehicleReports: any[];
  crimeReports: any[];
}

export default function LiveMap({ vehicleReports, crimeReports }: LiveMapProps) {
  const [isClient, setIsClient] = useState(false);
  const totalReports = vehicleReports.length + crimeReports.length;

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="h-full bg-gray-800 rounded-lg p-4">
        <div className="h-64 bg-gray-700 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Live Map</h3>
      
      <div className="h-64 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg border border-gray-600 flex items-center justify-center">
        <div className="text-center text-gray-300">
          <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold mb-2">Interactive Map</h4>
          <p className="text-gray-400 text-sm mb-4">Real-time location tracking</p>
          
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="text-red-400 font-semibold">{vehicleReports.length}</div>
                <div className="text-gray-500 text-xs">Vehicle Alerts</div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 font-semibold">{crimeReports.length}</div>
                <div className="text-gray-500 text-xs">Crime Reports</div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            Map integration coming in next update
          </div>
        </div>
      </div>
    </div>
  );
}