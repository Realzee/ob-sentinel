// components/control-room/AnalyticsPanel.tsx
'use client';

interface AnalyticsPanelProps {
  incidents: any[];
}

export default function AnalyticsPanel({ incidents }: AnalyticsPanelProps) {
  // Calculate statistics
  const totalIncidents = incidents.length;
  const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
  const highIncidents = incidents.filter(i => i.severity === 'high').length;
  const mediumIncidents = incidents.filter(i => i.severity === 'medium').length;
  const lowIncidents = incidents.filter(i => i.severity === 'low').length;

  const vehicleIncidents = incidents.filter(i => i.type === 'vehicle').length;
  const crimeIncidents = incidents.filter(i => i.type === 'crime').length;

  const activeIncidents = incidents.filter(i => i.status === 'active').length;
  const pendingIncidents = incidents.filter(i => i.status === 'pending').length;

  // Mock response time data
  const averageResponseTime = '4.2 min';
  const resolutionRate = '68%';

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">📈 Analytics & Intelligence</h2>
        <div className="text-sm text-gray-400">Live Statistics</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-4">Severity Distribution</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Critical</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: `${(criticalIncidents / totalIncidents) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm text-white w-8">{criticalIncidents}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">High</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full" 
                    style={{ width: `${(highIncidents / totalIncidents) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm text-white w-8">{highIncidents}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Medium</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ width: `${(mediumIncidents / totalIncidents) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm text-white w-8">{mediumIncidents}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Low</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${(lowIncidents / totalIncidents) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm text-white w-8">{lowIncidents}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Incident Types */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-4">Incident Types</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-300">Vehicle Reports</span>
              </div>
              <span className="text-lg font-bold text-white">{vehicleIncidents}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-300">Crime Reports</span>
              </div>
              <span className="text-lg font-bold text-white">{crimeIncidents}</span>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Avg Response Time</span>
              <span className="text-lg font-bold text-green-500">{averageResponseTime}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Resolution Rate</span>
              <span className="text-lg font-bold text-blue-500">{resolutionRate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Active Incidents</span>
              <span className="text-lg font-bold text-orange-500">{activeIncidents}</span>
            </div>
          </div>
        </div>

        {/* Status Overview */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-4">Status Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-300">Active</span>
              </div>
              <span className="text-sm font-bold text-white">{activeIncidents}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-300">Pending</span>
              </div>
              <span className="text-sm font-bold text-white">{pendingIncidents}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-300">Resolved Today</span>
              </div>
              <span className="text-sm font-bold text-white">
                {incidents.filter(i => i.status === 'resolved').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="mt-6 bg-gray-700 rounded-lg p-4">
        <h3 className="font-semibold text-white mb-3">📊 Quick Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="text-gray-300">
            • {criticalIncidents > 0 ? `${criticalIncidents} critical incidents require immediate attention` : 'No critical incidents'}
          </div>
          <div className="text-gray-300">
            • Vehicle reports make up {Math.round((vehicleIncidents / totalIncidents) * 100)}% of all incidents
          </div>
          <div className="text-gray-300">
            • Most incidents are currently {activeIncidents > pendingIncidents ? 'active' : 'pending review'}
          </div>
          <div className="text-gray-300">
            • System operating at {resolutionRate} efficiency
          </div>
        </div>
      </div>
    </div>
  );
}