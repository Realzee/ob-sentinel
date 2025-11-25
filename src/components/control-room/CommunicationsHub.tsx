// components/control-room/CommunicationsHub.tsx
'use client';

import CustomButton from '@/components/ui/CustomButton';

interface CommunicationsHubProps {
  selectedIncident: any;
  onQuickAction: (action: string, incidentId?: string) => void;
}

export default function CommunicationsHub({ selectedIncident, onQuickAction }: CommunicationsHubProps) {
  const quickActions = [
    {
      id: 'notify-police',
      label: 'Notify Police',
      icon: '👮',
      description: 'Alert local law enforcement',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      id: 'request-backup',
      label: 'Request Backup',
      icon: '🆘',
      description: 'Request additional resources',
      color: 'bg-orange-600 hover:bg-orange-700'
    },
    {
      id: 'update-public',
      label: 'Update Public',
      icon: '📢',
      description: 'Issue public safety alert',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      id: 'escalate',
      label: 'Escalate',
      icon: '🚨',
      description: 'Escalate to senior management',
      color: 'bg-red-600 hover:bg-red-700'
    }
  ];

  const handleQuickAction = (actionId: string) => {
    if (selectedIncident) {
      onQuickAction(actionId, selectedIncident.id);
    } else {
      onQuickAction(actionId);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">📞 Communications Hub</h2>
        <div className="text-sm text-gray-400">
          Quick Actions
        </div>
      </div>

      {/* Selected Incident Info */}
      {selectedIncident && (
        <div className="bg-gray-700 rounded-lg p-3 mb-4">
          <div className="text-sm text-gray-300 mb-1">Selected Incident:</div>
          <div className="text-white font-medium truncate">{selectedIncident.title}</div>
          <div className="text-xs text-gray-400">{selectedIncident.obNumber}</div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-3">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleQuickAction(action.id)}
            disabled={!selectedIncident && ['notify-police', 'escalate'].includes(action.id)}
            className={`w-full ${action.color} text-white rounded-lg p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-xl">{action.icon}</span>
              <div className="flex-1">
                <div className="font-semibold">{action.label}</div>
                <div className="text-sm opacity-90">{action.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Communication Templates */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <h3 className="font-semibold text-white mb-3">Quick Templates</h3>
        <div className="space-y-2">
          <CustomButton
            variant="secondary"
            size="sm"
            className="w-full justify-start"
            onClick={() => onQuickAction('template-status-update')}
          >
            📋 Status Update Request
          </CustomButton>
          <CustomButton
            variant="secondary"
            size="sm"
            className="w-full justify-start"
            onClick={() => onQuickAction('template-resource-request')}
          >
            🔧 Resource Request
          </CustomButton>
          <CustomButton
            variant="secondary"
            size="sm"
            className="w-full justify-start"
            onClick={() => onQuickAction('template-situation-report')}
          >
            📊 Situation Report
          </CustomButton>
        </div>
      </div>

      {/* Recent Communications */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <h3 className="font-semibold text-white mb-3">Recent Activity</h3>
        <div className="space-y-2 text-sm">
          <div className="text-gray-400 flex justify-between">
            <span>Police notified - Vehicle theft</span>
            <span>2 min ago</span>
          </div>
          <div className="text-gray-400 flex justify-between">
            <span>Backup requested - Assault incident</span>
            <span>5 min ago</span>
          </div>
          <div className="text-gray-400 flex justify-between">
            <span>Public alert - Suspicious activity</span>
            <span>12 min ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}