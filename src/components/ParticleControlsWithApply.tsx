/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { ChordDiagramConfig } from '@/hooks/useChordDiagram';
import { RefreshCw, Zap } from 'lucide-react';
import WebGLParticleControls from './WebGLParticleControls';

interface ParticleControlsWithApplyProps {
  config: ChordDiagramConfig;
  onConfigChange: (updates: Partial<ChordDiagramConfig>) => void;
}

const ParticleControlsWithApply: React.FC<ParticleControlsWithApplyProps> = ({
  config,
  onConfigChange
}) => {
  // Local state for particle settings
  const [pendingChanges, setPendingChanges] = useState<Partial<ChordDiagramConfig>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showWebGLControls, setShowWebGLControls] = useState(false);
  
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
  
  // Apply all pending changes
  const applyChanges = () => {
    if (Object.keys(pendingChanges).length > 0) {
      onConfigChange(pendingChanges);
      setPendingChanges({});
      setHasChanges(false);
    }
  };
  
  // Toggle WebGL controls visibility
  const toggleWebGLControls = () => {
    setShowWebGLControls(!showWebGLControls);
  };
  
  // Reset local state to match config
  useEffect(() => {
    setPendingChanges({});
    setHasChanges(false);
  }, [config.particleMode]); // Reset when switching particle mode
  
  return (
    <div className="border-t border-white/10 mt-2 pt-2">
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
      
      {/* WebGL toggle button */}
      <button
        onClick={toggleWebGLControls}
        className="flex items-center justify-between w-full text-xs px-2 py-1.5 bg-blue-600/30 hover:bg-blue-600/40 rounded mt-2"
      >
        <span className="flex items-center">
          <Zap className="w-3 h-3 mr-1" />
          WebGL Acceleration
        </span>
        <span className="text-xs opacity-70">
          {showWebGLControls ? "Hide Options ▲" : "Show Options ▼"}
        </span>
      </button>
      
      {/* WebGL Controls (collapsible) */}
      {showWebGLControls && (
        <WebGLParticleControls 
          config={config}
          onConfigChange={onConfigChange}
        />
      )}
      {/* Toggle for real connections only */}
<div className="flex items-center mt-2 border-t border-white/10 pt-2">
  <label className="flex items-center cursor-pointer">
    <div className="relative mr-2">
      <input
        type="checkbox"
        className="sr-only"
        checked={getCurrentValue('particlesOnlyRealConnections')}
        onChange={() => {
          // If turning off "real connections only" (showing all), confirm
          const newValue = !getCurrentValue('particlesOnlyRealConnections');
          
          if (!newValue && !confirm(
            "Adding particles to all connections may significantly impact performance. Continue?"
          )) {
            return; // Don't change if user cancels
          }
          
          setPendingChanges(prev => ({ 
            ...prev, 
            particlesOnlyRealConnections: newValue
          }));
          setHasChanges(true);
        }}
      />
      <div className={`w-8 h-4 rounded-full transition-colors ${getCurrentValue('particlesOnlyRealConnections') ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
      <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${getCurrentValue('particlesOnlyRealConnections') ? 'translate-x-4' : ''}`}></div>
    </div>
    <span className="text-xs font-medium">Real connections only</span>
    <span className="text-xs ml-1 text-gray-400">(better performance)</span>
  </label>
</div>

{/* Settings for minimal connection particles - only visible when showing all connections */}
{!getCurrentValue('particlesOnlyRealConnections') && (
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
  </div>
)}
      {/* Performance note for detailed view */}
      {config.showDetailedView && !showWebGLControls && (
        <div className="mt-2 text-xs p-2 bg-yellow-500/20 text-yellow-300 rounded">
          <strong>Performance Tip:</strong> Enable WebGL acceleration above for better performance with many particles.
        </div>
      )}
      
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
      
      {/* Add particle movement controls */}
      <div className="flex items-center mt-2">
        <label className="flex items-center cursor-pointer">
          <div className="relative mr-2">
            <input
              type="checkbox"
              className="sr-only"
              checked={getCurrentValue('particleMovement')}
              onChange={() => {
                setPendingChanges(prev => ({ 
                  ...prev, 
                  particleMovement: !getCurrentValue('particleMovement')
                }));
                setHasChanges(true);
              }}
            />
            <div className={`w-8 h-4 rounded-full transition-colors ${getCurrentValue('particleMovement') ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${getCurrentValue('particleMovement') ? 'translate-x-4' : ''}`}></div>
          </div>
          <span className="text-xs">Subtle Movement</span>
        </label>
      </div>
      
      {/* Only show movement amplitude if movement is enabled */}
      {getCurrentValue('particleMovement') && (
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <label>Amplitude: {getCurrentValue('particleMovementAmount').toFixed(1)}</label>
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={getCurrentValue('particleMovementAmount')}
            onChange={(e) => handleRangeChange('particleMovementAmount', parseFloat(e.target.value))}
            className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}
      
      {/* Apply button for large changes */}
      {hasChanges && (
        <button 
          onClick={applyChanges}
          className="w-full mt-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-xs font-medium"
        >
          Apply Particle Changes
        </button>
      )}
    </div>
  );
};

export default ParticleControlsWithApply;