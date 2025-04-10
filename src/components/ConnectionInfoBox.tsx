import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';

interface ConnectionInfo {
  sourceId: string;
  sourceCategory: string;
  targetId: string;
  targetCategory: string;
  value?: number | string;
}

interface ConnectionInfoBoxProps {
  isVisible: boolean;
  connectionInfo?: ConnectionInfo | null;
  showCategories?: boolean;
}

const ConnectionInfoBox: React.FC<ConnectionInfoBoxProps> = ({
  isVisible,
  connectionInfo,
  showCategories = true
}) => {
  // State for collapsed view
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  if (!isVisible || !connectionInfo) {
    return null;
  }
  
  return (
    <div className="connection-info-box p-3 bg-black/70 text-white rounded-md shadow-lg cursor-move max-w-xs">
      {/* Header with grip icon for drag indication */}
      <div className="flex items-center justify-between mb-2 border-b border-white/20 pb-1">
        <div className="flex items-center">
          <GripVertical className="h-4 w-4 mr-1 text-gray-400" />
          <h3 className="text-xs font-semibold">Current Connection</h3>
        </div>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-xs px-1.5 py-0.5 rounded hover:bg-white/20"
        >
          {isCollapsed ? "Show details" : "Hide details"}
        </button>
      </div>
      
      {/* Connection information */}
      {!isCollapsed && (
        <div className="text-sm">
          <div className="mb-2">
            <span className="font-medium text-blue-300">From:</span>
            <div className="ml-2 mt-0.5">
              <div className="font-medium">{connectionInfo.sourceId}</div>
              {showCategories && (
                <div className="text-xs text-gray-300">{connectionInfo.sourceCategory}</div>
              )}
            </div>
          </div>
          
          <div className="mb-2">
            <span className="font-medium text-green-300">To:</span>
            <div className="ml-2 mt-0.5">
              <div className="font-medium">{connectionInfo.targetId}</div>
              {showCategories && (
                <div className="text-xs text-gray-300">{connectionInfo.targetCategory}</div>
              )}
            </div>
          </div>
          
          {connectionInfo.value && (
            <div className="text-xs mt-2 pt-1 border-t border-white/20">
              <span className="text-gray-300">Connections: </span>
              <span className="font-medium">{connectionInfo.value}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Minimal view when collapsed */}
      {isCollapsed && (
        <div className="text-xs">
          <span className="text-blue-300">{connectionInfo.sourceId}</span>
          {" → "}
          <span className="text-green-300">{connectionInfo.targetId}</span>
        </div>
      )}
    </div>
  );
};

export default ConnectionInfoBox;