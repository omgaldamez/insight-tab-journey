 
import React, { useState, useEffect } from 'react';
import { ChordDiagramConfig } from '@/hooks/useChordDiagram';
import { RefreshCw, Cpu } from 'lucide-react';

interface WebGLParticleControlsProps {
  config: ChordDiagramConfig;
  onConfigChange: (updates: Partial<ChordDiagramConfig>) => void;
}

const WebGLParticleControls: React.FC<WebGLParticleControlsProps> = ({
  config,
  onConfigChange
}) => {
  // Local state for WebGL settings
  const [pendingChanges, setPendingChanges] = useState<Partial<ChordDiagramConfig>>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Helper to get current value (prioritize pending changes, fall back to config)
  const getCurrentValue = <T extends keyof ChordDiagramConfig>(key: T): ChordDiagramConfig[T] => {
    return pendingChanges[key] !== undefined 
      ? pendingChanges[key] as ChordDiagramConfig[T] 
      : config[key];
  };
  
  // Toggle WebGL renderer
  const handleToggleWebGL = () => {
    setPendingChanges(prev => ({ 
      ...prev, 
      useWebGLRenderer: !getCurrentValue('useWebGLRenderer')
    }));
    setHasChanges(true);
  };
  
  // Change quality setting
  const handleQualityChange = (quality: 'low' | 'medium' | 'high') => {
    setPendingChanges(prev => ({ 
      ...prev, 
      webGLParticleQuality: quality
    }));
    setHasChanges(true);
  };
  
  // Apply all pending changes
  const applyChanges = () => {
    if (Object.keys(pendingChanges).length > 0) {
      onConfigChange(pendingChanges);
      setPendingChanges({});
      setHasChanges(false);
    }
  };
  
  // Reset local state to match config
  useEffect(() => {
    setPendingChanges({});
    setHasChanges(false);
  }, [config.particleMode]); // Reset when switching particle mode
  
  return (
    <div className="border-t border-white/10 mt-2 pt-2">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-semibold text-white/80 flex items-center">
          <Cpu className="w-3 h-3 mr-1" />
          WebGL Rendering
        </h3>
        {hasChanges && (
          <button 
            onClick={applyChanges}
            className="px-2 py-1 text-xs bg-green-600 hover:bg-green-500 rounded-sm flex items-center"
            title="Apply changes to see effect"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Apply
          </button>
        )}
      </div>
      
      {/* Toggle WebGL rendering */}
      <div className="flex items-center mt-2">
        <label className="flex items-center cursor-pointer">
          <div className="relative mr-2">
            <input
              type="checkbox"
              className="sr-only"
              checked={getCurrentValue('useWebGLRenderer')}
              onChange={handleToggleWebGL}
            />
            <div className={`w-8 h-4 rounded-full transition-colors ${
              getCurrentValue('useWebGLRenderer') ? 'bg-blue-500' : 'bg-gray-500'
            }`}></div>
            <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${
              getCurrentValue('useWebGLRenderer') ? 'translate-x-4' : ''
            }`}></div>
          </div>
          <span className="text-xs">Use WebGL Rendering</span>
        </label>
      </div>
      
      {/* Performance Note */}
      <div className="text-xs my-2 text-white/60">
        WebGL rendering significantly improves performance for particle effects, especially in detailed view with many nodes.
      </div>
      
      {/* Quality Settings - only visible when WebGL is enabled */}
      {getCurrentValue('useWebGLRenderer') && (
        <div className="mt-2">
          <div className="text-xs mb-1">Render Quality:</div>
          <div className="grid grid-cols-3 gap-1">
            {['low', 'medium', 'high'].map((quality) => (
              <button
                key={quality}
                className={`text-xs py-1 rounded-sm ${
                  getCurrentValue('webGLParticleQuality') === quality 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                }`}
                onClick={() => handleQualityChange(quality as 'low' | 'medium' | 'high')}
              >
                {quality.charAt(0).toUpperCase() + quality.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Quality explanation */}
          <div className="text-xs mt-2 text-white/60">
            {getCurrentValue('webGLParticleQuality') === 'low' && 
              "Low quality uses fewer particles for maximum performance."
            }
            {getCurrentValue('webGLParticleQuality') === 'medium' && 
              "Medium quality balances visual quality and performance."
            }
            {getCurrentValue('webGLParticleQuality') === 'high' && 
              "High quality uses more particles for best visual appearance."
            }
          </div>
        </div>
      )}
      
      {/* Performance impact warning */}
      {config.showDetailedView && getCurrentValue('useWebGLRenderer') && (
        <div className="mt-2 text-xs p-2 bg-yellow-500/20 text-yellow-300 rounded">
          <strong>Note:</strong> WebGL rendering is especially helpful in detailed view where there are many particles.
        </div>
      )}
      
      {/* Apply button */}
      {hasChanges && (
        <button 
          onClick={applyChanges}
          className="w-full mt-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium"
        >
          Apply WebGL Settings
        </button>
      )}
    </div>
  );
};

export default WebGLParticleControls;