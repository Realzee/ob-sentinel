// components/control-room/TeamManagement.tsx
'use client';

interface TeamManagementProps {
  teams: any[];
  incidents: any[];
  onTeamUpdate: (teamId: string, updates: any) => void;
}

export default function TeamManagement({ teams, incidents, onTeamUpdate }: TeamManagementProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'en_route': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'en_route': return 'En Route';
      case 'busy': return 'Busy';
      default: return 'Offline';
    }
  };

  const handleStatusChange = (teamId: string, newStatus: string) => {
    onTeamUpdate(teamId, { status: newStatus });
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">🚔 Response Teams</h2>
        <div className="text-sm text-gray-400">
          {teams.filter(t => t.status === 'available').length}/{teams.length} available
        </div>
      </div>

      <div className="space-y-4">
        {teams.map((team) => (
          <div key={team.id} className="bg-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-white text-lg">{team.name}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(team.status)}`}></div>
                  <span className="text-sm text-gray-300">{getStatusText(team.status)}</span>
                </div>
              </div>
              
              <select
                value={team.status}
                onChange={(e) => handleStatusChange(team.id, e.target.value)}
                className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-xs text-white"
              >
                <option value="available">Available</option>
                <option value="en_route">En Route</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            <div className="text-sm text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>Members:</span>
                <span className="text-white">{team.members.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span>Location:</span>
                <span className="text-white">{team.currentLocation || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span>Assigned Incidents:</span>
                <span className="text-white">{team.assignedIncidents.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Update:</span>
                <span className="text-white">
                  {new Date(team.lastUpdate).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {team.assignedIncidents.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-600">
                <div className="text-xs text-gray-400">Assigned To:</div>
                <div className="space-y-1 mt-1">
                  {team.assignedIncidents.map((incidentId: string) => {
                    const incident = incidents.find(i => i.id === incidentId);
                    return incident ? (
                      <div key={incidentId} className="text-xs bg-gray-600 rounded px-2 py-1">
                        {incident.title}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Team Statistics */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-500">
              {teams.filter(t => t.status === 'available').length}
            </div>
            <div className="text-xs text-gray-400">Available</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-500">
              {teams.filter(t => t.status === 'en_route').length}
            </div>
            <div className="text-xs text-gray-400">En Route</div>
          </div>
        </div>
      </div>
    </div>
  );
}