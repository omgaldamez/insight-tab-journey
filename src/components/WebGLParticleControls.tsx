import React, { useState, useEffect } from 'react';
import { ChordDiagramConfig } from '@/hooks/useChordDiagram';
import { RefreshCw, Cpu, Zap, AlertTriangle, Check } from 'lucide-react';

interface WebGLParticleControlsProps {
  config: ChordDiagramConfig;
  onConfigChange: (updates: Partial<ChordDiagramConfig>) => void;
  particleMetrics?: {
    totalParticles: number;
    totalChordsWithParticles: number;
  };
}

const WebGLParticleControls: React.FC<WebGLParticleControlsProps> = ({
  config,
  onConfigChange,
  particleMetrics
}) => {
  // Local state for WebGL settings
  const [pendingChanges, setPendingChanges] = useState<Partial<ChordDiagramConfig>>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Auto-recommendation state
  const [showRecommendation, setShowRecommendation] = useState(false);
  
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
    setShowRecommendation(false); // Hide recommendation when toggled manually
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
  
  // Effect to determine if WebGL recommendation should be shown
  useEffect(() => {
    // Only recommend if not already enabled
    if (!config.useWebGLRenderer && config.particleMode) {
      // Recommend based on particle count (threshold is 2000 particles)
      const totalParticles = particleMetrics?.totalParticles || 0;
      const shouldRecommend = totalParticles > 2000;
      
      if (shouldRecommend) {
        setShowRecommendation(true);
      }
    } else {
      setShowRecommendation(false);
    }
  }, [config.useWebGLRenderer, config.particleMode, particleMetrics?.totalParticles]);
  
  // Apply WebGL recommendation
  const applyRecommendation = () => {
    setPendingChanges({ useWebGLRenderer: true });
    setHasChanges(true);
    setShowRecommendation(false);
  };
  
  // Dismiss recommendation
  const dismissRecommendation = () => {
    setShowRecommendation(false);
  };

  // Format particle count with commas
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  return (
    <div className="border-t border-white/10 mt-2 pt-2">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-semibold text-white/80 flex items-center">
          <Cpu className="w-3 h-3 mr-1" />
          WebGL Acceleration
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
      
      {/* Performance recommendation alert */}
      {showRecommendation && (
        <div className="mt-2 mb-3 p-2 bg-yellow-500/20 rounded-md border border-yellow-500/30">
          <div className="flex items-start">
            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-yellow-300">
                Performance Recommendation
              </p>
              <p className="text-xs mt-1 text-yellow-200/80">
                You have {formatNumber(particleMetrics?.totalParticles || 0)} particles. 
                Enable WebGL for up to 10x better performance.
              </p>
              <div className="flex space-x-2 mt-2">
                <button
                  onClick={applyRecommendation}
                  className="text-xs px-2 py-1 bg-yellow-600/50 hover:bg-yellow-500/50 rounded-sm flex items-center"
                >
                  <Zap className="w-3 h-3 mr-1" />
                  Enable WebGL
                </button>
                <button
                  onClick={dismissRecommendation}
                  className="text-xs px-2 py-1 bg-gray-600/50 hover:bg-gray-500/50 rounded-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main WebGL toggle */}
      <div className="bg-blue-900/20 p-2 rounded-md mt-2 border border-blue-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <div className="relative mr-2">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={getCurrentValue('useWebGLRenderer')}
                  onChange={handleToggleWebGL}
                />
                <div className={`w-9 h-5 rounded-full transition-colors ${
                  getCurrentValue('useWebGLRenderer') ? 'bg-blue-500' : 'bg-gray-500'
                }`}></div>
                <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform transform ${
                  getCurrentValue('useWebGLRenderer') ? 'translate-x-4' : ''
                }`}></div>
              </div>
              <div>
                <span className="text-xs font-medium flex items-center">
                  {getCurrentValue('useWebGLRenderer') ? (
                    <Check className="w-3 h-3 mr-1 text-green-400" />
                  ) : null}
                  WebGL Rendering 
                  {getCurrentValue('useWebGLRenderer') ? 
                    <span className="ml-1 text-green-400">Enabled</span> : 
                    <span className="ml-1 text-gray-400">Disabled</span>}
                </span>
                <span className="text-xs block mt-0.5 text-blue-300/70">
                  {getCurrentValue('useWebGLRenderer') ? 
                    "Hardware accelerated particle rendering active" : 
                    "Enable for dramatically better performance with many particles"}
                </span>
              </div>
            </label>
          </div>
          
          {/* Apply button for smaller screens */}
          {hasChanges && (
            <button 
              onClick={applyChanges}
              className="px-2 py-1 text-xs bg-green-600 hover:bg-green-500 rounded-sm flex items-center lg:hidden"
            >
              Apply
            </button>
          )}
        </div>

        {/* Particle count information */}
        {config.particleMode && particleMetrics && (
          <div className="text-xs mt-2 text-blue-200/80 flex items-center">
            <Zap className="w-3 h-3 mr-1 text-blue-300" />
            <span>
              {formatNumber(particleMetrics.totalParticles)} particles 
              across {particleMetrics.totalChordsWithParticles} chords
            </span>
          </div>
        )}
      </div>
      
      {/* Quality Settings - only visible when WebGL is enabled */}
      {getCurrentValue('useWebGLRenderer') && (
        <div className="mt-3">
          <div className="text-xs mb-1 flex justify-between items-center">
            <span>Render Quality:</span>
            <span className="text-xs text-blue-300">
              {getCurrentValue('webGLParticleQuality') === 'low' && "Fastest"}
              {getCurrentValue('webGLParticleQuality') === 'medium' && "Balanced"}
              {getCurrentValue('webGLParticleQuality') === 'high' && "Best Quality"}
            </span>
          </div>
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