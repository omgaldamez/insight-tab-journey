/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { ChordDiagramConfig } from '@/hooks/useChordDiagram';
import { RefreshCw, Zap } from 'lucide-react';

interface ParticleControlsWithApplyProps {
  config: ChordDiagramConfig;
  onConfigChange: (updates: Partial<ChordDiagramConfig>) => void;
  particlesInitialized: boolean;
  onInitializeParticles?: () => void;
}

const ParticleControlsWithApply: React.FC<ParticleControlsWithApplyProps> = ({
  config,
  onConfigChange,
  particlesInitialized,
  onInitializeParticles
}) => {
  // Local state for particle settings
  const [pendingChanges, setPendingChanges] = useState<Partial<ChordDiagramConfig>>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Helper to get current value (prioritize pending changes, fall back to config)
  const getCurrentValue = <T extends keyof ChordDiagramConfig>(key: T): ChordDiagramConfig[T] => {
    return pendingChanges[key] !== undefined 
      ? pendingChanges[key] as ChordDiagramConfig[T] 
      : config[key];
  };
  
  // Extract current values from config or pending changes
  const particleDensity = getCurrentValue('particleDensity');
  const particleSize = getCurrentValue('particleSize');
  const particleSizeVariation = getCurrentValue('particleSizeVariation');
  const particleBlur = getCurrentValue('particleBlur');
  const particleDistribution = getCurrentValue('particleDistribution');
  const particleColor = getCurrentValue('particleColor');
  const particleOpacity = getCurrentValue('particleOpacity');
  const particleStrokeColor = getCurrentValue('particleStrokeColor');
  const particleStrokeWidth = getCurrentValue('particleStrokeWidth');
  const particleMovement = getCurrentValue('particleMovement');
  const particleMovementAmount = getCurrentValue('particleMovementAmount');
  const particlesOnlyRealConnections = getCurrentValue('particlesOnlyRealConnections');
  
  // Handler for range inputs
  const handleRangeChange = (field: keyof ChordDiagramConfig, value: number) => {
    setPendingChanges(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };
  
  // Handler for color inputs
  const handleColorChange = (field: keyof ChordDiagramConfig, value: string) => {
    setPendingChanges(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };
  
  // Handler for select/option inputs
  const handleSelectChange = (field: 'particleDistribution', value: string) => {
    setPendingChanges(prev => ({ 
      ...prev, 
      [field]: value as 'uniform' | 'random' | 'gaussian' 
    }));
    setHasChanges(true);
  };

  // Handler for toggle changes
  const handleToggleChange = (field: keyof ChordDiagramConfig) => {
    setPendingChanges(prev => ({ 
      ...prev, 
      [field]: !getCurrentValue(field) 
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
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-semibold text-white/80">Particle Settings</h3>
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
      
      {/* Toggle for real connections only */}
      <div className="flex items-center mt-2">
        <label className="flex items-center cursor-pointer">
          <div className="relative mr-2">
            <input
              type="checkbox"
              className="sr-only"
              checked={particlesOnlyRealConnections}
              onChange={() => {
                // If turning off "real connections only" (showing all), confirm
                const newValue = !particlesOnlyRealConnections;
                
                if (!newValue && !window.confirm(
                  "Adding particles to all connections may significantly impact performance. Continue?"
                )) {
                  return; // Don't change if user cancels
                }
                
                handleToggleChange('particlesOnlyRealConnections');
              }}
            />
            <div className={`w-8 h-4 rounded-full transition-colors ${particlesOnlyRealConnections ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
            <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${particlesOnlyRealConnections ? 'translate-x-4' : ''}`}></div>
          </div>
          <span className="text-xs font-medium">Real connections only</span>
          <span className="text-xs ml-1 text-gray-400">(better performance)</span>
        </label>
      </div>

      {/* Settings for minimal connection particles - only visible when showing all connections */}
      {!particlesOnlyRealConnections && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <h4 className="text-xs font-semibold mb-1.5 text-white/80">Minimal Connection Particles</h4>
          
          {/* Color Control */}
          <div className="flex items-center mt-1.5 text-xs">
            <label className="mr-2">Color:</label>
            <input
              type="color"
              value={getCurrentValue('minimalConnectionParticleColor')}
              onChange={(e) => handleColorChange('minimalConnectionParticleColor', e.target.value)}
              className="w-6 h-6 rounded cursor-pointer"
            />
            <div className="flex items-center ml-2 flex-grow">
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={getCurrentValue('minimalConnectionParticleOpacity')}
                onChange={(e) => handleRangeChange('minimalConnectionParticleOpacity', parseFloat(e.target.value))}
                className="flex-grow h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="ml-2">{getCurrentValue('minimalConnectionParticleOpacity').toFixed(1)}</span>
            </div>
          </div>
          
          {/* Size Control */}
          <div className="flex items-center justify-between mt-1.5 text-xs">
            <label>Size: {getCurrentValue('minimalConnectionParticleSize').toFixed(1)}</label>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={getCurrentValue('minimalConnectionParticleSize')}
              onChange={(e) => handleRangeChange('minimalConnectionParticleSize', parseFloat(e.target.value))}
              className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          {/* Size Variation */}
          <div className="flex items-center justify-between mt-1.5 text-xs">
            <label>Variation: {getCurrentValue('minimalConnectionParticleSizeVariation').toFixed(1)}</label>
            <input
              type="range"
              min="0"
              max="1.0"
              step="0.1"
              value={getCurrentValue('minimalConnectionParticleSizeVariation')}
              onChange={(e) => handleRangeChange('minimalConnectionParticleSizeVariation', parseFloat(e.target.value))}
              className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Stroke Controls */}
          <div className="flex items-center mt-2 text-xs">
            <label className="mr-2">Stroke:</label>
            <input
              type="color"
              value={getCurrentValue('minimalConnectionParticleStrokeColor')}
              onChange={(e) => handleColorChange('minimalConnectionParticleStrokeColor', e.target.value)}
              className="w-6 h-6 rounded cursor-pointer"
            />
            <div className="flex items-center ml-2 flex-grow">
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.05"
                value={getCurrentValue('minimalConnectionParticleStrokeWidth')}
                onChange={(e) => handleRangeChange('minimalConnectionParticleStrokeWidth', parseFloat(e.target.value))}
                className="flex-grow h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <span className="ml-2">{getCurrentValue('minimalConnectionParticleStrokeWidth').toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Particle Settings */}
      <div className="border-t border-white/10 mt-2 pt-2">
        <h4 className="text-xs font-semibold mb-1.5 text-white/80">Main Particle Settings</h4>
        
        {/* Particle Density Control */}
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <label>Density: {particleDensity}</label>
          <input
            type="range"
            min="20"
            max="500"
            step="10"
            value={particleDensity}
            onChange={(e) => handleRangeChange('particleDensity', parseFloat(e.target.value))}
            className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        {/* Particle Size Control */}
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <label>Size: {particleSize.toFixed(1)}</label>
          <input
            type="range"
            min="0.2"
            max="5.0"
            step="0.1"
            value={particleSize}
            onChange={(e) => handleRangeChange('particleSize', parseFloat(e.target.value))}
            className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        {/* Particle Size Variation Control */}
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <label>Variation: {particleSizeVariation.toFixed(1)}</label>
          <input
            type="range"
            min="0"
            max="1.0"
            step="0.1"
            value={particleSizeVariation}
            onChange={(e) => handleRangeChange('particleSizeVariation', parseFloat(e.target.value))}
            className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        {/* Particle Color Control */}
        <div className="flex items-center mt-2 text-xs">
          <label className="mr-2">Color:</label>
          <input
            type="color"
            value={particleColor}
            onChange={(e) => handleColorChange('particleColor', e.target.value)}
            className="w-6 h-6 rounded cursor-pointer"
          />
          <div className="flex items-center ml-2 flex-grow">
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={particleOpacity}
              onChange={(e) => handleRangeChange('particleOpacity', parseFloat(e.target.value))}
              className="flex-grow h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <span className="ml-2">{particleOpacity.toFixed(1)}</span>
          </div>
        </div>
        
        {/* Particle Stroke Controls */}
        <div className="flex items-center mt-2 text-xs">
          <label className="mr-2">Stroke:</label>
          <input
            type="color"
            value={particleStrokeColor}
            onChange={(e) => handleColorChange('particleStrokeColor', e.target.value)}
            className="w-6 h-6 rounded cursor-pointer"
          />
          <div className="flex items-center ml-2 flex-grow">
            <input
              type="range"
              min="0"
              max="1.0"
              step="0.05"
              value={particleStrokeWidth}
              onChange={(e) => handleRangeChange('particleStrokeWidth', parseFloat(e.target.value))}
              className="flex-grow h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
            <span className="ml-2">{particleStrokeWidth.toFixed(1)}</span>
          </div>
        </div>
        
        {/* Distribution Control */}
        <div className="mt-2">
          <div className="text-xs mb-1">Distribution:</div>
          <div className="grid grid-cols-3 gap-1">
            {['uniform', 'random', 'gaussian'].map((dist) => (
              <button
                key={dist}
                className={`text-xs py-1 rounded-sm ${particleDistribution === dist ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}
                onClick={() => handleSelectChange('particleDistribution', dist as any)}
              >
                {dist.charAt(0).toUpperCase() + dist.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Particle Blur Control */}
        <div className="flex items-center justify-between mt-2 text-xs">
          <label>Blur: {particleBlur.toFixed(1)}px</label>
          <input
            type="range"
            min="0"
            max="3.0"
            step="0.1"
            value={particleBlur}
            onChange={(e) => handleRangeChange('particleBlur', parseFloat(e.target.value))}
            className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
      
      {/* Movement Controls */}
      <div className="border-t border-white/10 mt-2 pt-2">
        <h4 className="text-xs font-semibold mb-1.5 text-white/80">Particle Movement</h4>
        
        {/* Add particle movement controls */}
        <div className="flex items-center">
          <label className="flex items-center cursor-pointer">
            <div className="relative mr-2">
              <input
                type="checkbox"
                className="sr-only"
                checked={particleMovement}
                onChange={() => handleToggleChange('particleMovement')}
              />
              <div className={`w-8 h-4 rounded-full transition-colors ${particleMovement ? 'bg-green-500' : 'bg-gray-500'}`}></div>
              <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${particleMovement ? 'translate-x-4' : ''}`}></div>
            </div>
            <span className="text-xs">Subtle Movement</span>
          </label>
        </div>
        
        {/* Only show movement amplitude if movement is enabled */}
        {particleMovement && (
          <div className="flex items-center justify-between mt-1.5 text-xs">
            <label>Amplitude: {particleMovementAmount.toFixed(1)}</label>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={particleMovementAmount}
              onChange={(e) => handleRangeChange('particleMovementAmount', parseFloat(e.target.value))}
              className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}
      </div>
      
      {/* Apply and Generate Buttons */}
      <div className="space-y-2 pt-2 border-t border-white/10 mt-2">
        {hasChanges && (
          <button 
            onClick={applyChanges}
            className="w-full py-1.5 bg-green-600 hover:bg-green-500 rounded text-xs font-medium flex items-center justify-center"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Apply Particle Changes
          </button>
        )}
        
        {onInitializeParticles && (
          <button
            onClick={onInitializeParticles}
            disabled={!config.particleMode}
            className={`w-full py-1.5 rounded text-xs font-medium flex items-center justify-center 
              ${particlesInitialized 
                ? 'bg-blue-600 hover:bg-blue-500' 
                : 'bg-green-600 hover:bg-green-500'}`}
          >
            <Zap className="w-3 h-3 mr-1" />
            {particlesInitialized ? 'Regenerate Particles' : 'Generate Particles'}
          </button>
        )}
      </div>
      {/* Generation speed control */}
<div className="border-t border-white/10 mt-2 pt-2">
  <h4 className="text-xs font-semibold mb-1.5 text-white/80">Generation Speed</h4>
  <div className="flex items-center justify-between mt-1.5 text-xs">
    <label>Delay: {getCurrentValue('particleGenerationDelay')}ms</label>
    <input
      type="range"
      min="5"
      max="100"
      step="5"
      value={getCurrentValue('particleGenerationDelay')}
      onChange={(e) => handleRangeChange('particleGenerationDelay', parseInt(e.target.value))}
      className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
    />
  </div>
  <div className="text-xs text-gray-400 mt-1">
    Lower = faster but may cause lag
  </div>
</div>
<div className="border-t border-white/10 mt-2 pt-2">
  <h4 className="text-xs font-semibold mb-1.5 text-white/80">Performance Optimization</h4>
  <div className="flex items-center mt-1.5">
    <label className="flex items-center cursor-pointer">
      <div className="relative mr-2">
        <input
          type="checkbox"
          className="sr-only"
          checked={getCurrentValue('highPerformanceMode')}
          onChange={() => handleToggleChange('highPerformanceMode')}
        />
        <div className={`w-8 h-4 rounded-full transition-colors ${getCurrentValue('highPerformanceMode') ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
        <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${getCurrentValue('highPerformanceMode') ? 'translate-x-4' : ''}`}></div>
      </div>
      <span className="text-xs font-medium">High Performance Mode</span>
      <span className="text-xs ml-1 text-gray-400">(faster, lower quality)</span>
    </label>
  </div>
</div>
    </div>
  );
};

export default ParticleControlsWithApply;