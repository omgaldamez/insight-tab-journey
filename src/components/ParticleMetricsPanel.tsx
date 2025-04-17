import React, { useState, useEffect } from 'react';
import { GripVertical, Activity, TimerIcon, Cpu, ZapOff, Zap } from 'lucide-react';

interface ParticleMetricsProps {
  isVisible: boolean;
  totalParticles: number;
  totalChordsWithParticles: number;
  chordsGenerated: number;
  totalChords: number;
  renderTime: number;
  fps: number;
  useWebGL: boolean;
  isGenerating: boolean;
  onCancelGeneration?: () => void;
}

const ParticleMetricsPanel: React.FC<ParticleMetricsProps> = ({
  isVisible,
  totalParticles,
  totalChordsWithParticles,
  chordsGenerated,
  totalChords,
  renderTime,
  fps,
  useWebGL,
  isGenerating,
  onCancelGeneration
}) => {
  // State for collapsed view
  const [isCollapsed, setIsCollapsed] = useState(false);
  // State to track peak FPS and particle count
  const [peakFps, setPeakFps] = useState(0);
  const [minFps, setMinFps] = useState(9999);
  
  // Update peak metrics
  useEffect(() => {
    if (fps > 0 && fps > peakFps) {
      setPeakFps(fps);
    }
    
    if (fps > 0 && fps < minFps) {
      setMinFps(fps);
    }
  }, [fps, peakFps, minFps]);
  
  if (!isVisible) {
    return null;
  }
  
  // Calculate progress percentage
  const progressPercentage = totalChords > 0 ? (chordsGenerated / totalChords) * 100 : 0;
  // Calculate FPS color based on value
  const getFpsColor = (fps: number) => {
    if (fps < 15) return 'text-red-300';
    if (fps < 30) return 'text-yellow-300';
    return 'text-green-300';
  };
  
  return (
    <div className="particle-metrics-panel p-3 bg-black/70 text-white rounded-md shadow-lg max-w-xs"
         style={{ touchAction: "none" }}>
      {/* Header with grip icon for drag indication */}
      <div className="flex items-center justify-between mb-2 border-b border-white/20 pb-1 cursor-move" style={{ touchAction: 'none' }}>
        <div className="flex items-center">
          <GripVertical className="h-4 w-4 mr-1 text-gray-400" />
          <h3 className="text-xs font-semibold">Particle Metrics</h3>
        </div>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-xs px-1.5 py-0.5 rounded hover:bg-white/20"
        >
          {isCollapsed ? "Show details" : "Hide details"}
        </button>
      </div>
      
      {/* Progress bar for chord generation */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1 text-xs">
          <span>Chords: {chordsGenerated} of {totalChords}</span>
          <span className="flex items-center">
            {isGenerating && (
              <span className="animate-pulse mr-1 text-green-300">Generating</span>
            )}
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-300 ease-out ${isGenerating ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        
        {/* Cancel generation button (only visible during generation) */}
        {isGenerating && onCancelGeneration && (
          <button
            onClick={onCancelGeneration}
            className="mt-1 text-xs py-0.5 px-2 bg-red-700/50 hover:bg-red-600/60 rounded text-white/90 flex items-center justify-center w-full"
          >
            <ZapOff className="h-3 w-3 mr-1" />
            Cancel Generation
          </button>
        )}
      </div>
      
      {/* Metrics information */}
      {!isCollapsed && (
        <div className="text-sm">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
            <div className="flex items-center">
              <Activity className="h-3 w-3 mr-1 text-blue-300" />
              <span className="text-xs text-gray-300">Total Particles:</span>
            </div>
            <div className="text-xs text-right font-medium">
              {totalParticles.toLocaleString()}
            </div>
            
            <div className="flex items-center">
              <Activity className="h-3 w-3 mr-1 text-purple-300" />
              <span className="text-xs text-gray-300">Chords with Particles:</span>
            </div>
            <div className="text-xs text-right font-medium">
              {totalChordsWithParticles} / {totalChords}
            </div>
            
            <div className="flex items-center">
              <TimerIcon className="h-3 w-3 mr-1 text-green-300" />
              <span className="text-xs text-gray-300">Render Time:</span>
            </div>
            <div className="text-xs text-right font-medium">
              {renderTime.toFixed(1)} ms
            </div>
            
            <div className="flex items-center">
              <TimerIcon className="h-3 w-3 mr-1 text-yellow-300" />
              <span className="text-xs text-gray-300">Current FPS:</span>
            </div>
            <div className={`text-xs text-right font-medium ${getFpsColor(fps)}`}>
              {fps.toFixed(1)} FPS
            </div>
            
            {peakFps > 0 && (
              <>
                <div className="flex items-center">
                  <TimerIcon className="h-3 w-3 mr-1 text-green-300" />
                  <span className="text-xs text-gray-300">Peak FPS:</span>
                </div>
                <div className="text-xs text-right font-medium text-green-300">
                  {peakFps.toFixed(1)} FPS
                </div>
                
                <div className="flex items-center">
                  <TimerIcon className="h-3 w-3 mr-1 text-red-300" />
                  <span className="text-xs text-gray-300">Min FPS:</span>
                </div>
                <div className="text-xs text-right font-medium text-red-300">
                  {minFps === 9999 ? 'N/A' : minFps.toFixed(1) + ' FPS'}
                </div>
              </>
            )}
          </div>
          
          <div className="mt-2 pt-1 border-t border-white/20 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Renderer:</span>
              <span className={`font-medium ${useWebGL ? 'text-green-300' : 'text-yellow-300'}`}>
                {useWebGL ? 'WebGL (Hardware Accelerated)' : 'SVG (Software)'}
              </span>
            </div>
            
            <div className="mt-1 flex justify-between items-center">
              <span className="text-gray-300">Particles per Chord:</span>
              <span className="font-medium">
                {totalChordsWithParticles > 0 ? Math.round(totalParticles / totalChordsWithParticles) : 0}
              </span>
            </div>
            
            {!useWebGL && totalParticles > 5000 && (
              <div className="mt-1 text-yellow-300 text-xs">
                Consider enabling WebGL for better performance
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Minimal view when collapsed */}
      {isCollapsed && (
        <div className="text-xs flex justify-between items-center">
          <span>{totalParticles.toLocaleString()} particles</span>
          <span className="text-gray-400">|</span>
          <span className={getFpsColor(fps)}>{fps.toFixed(0)} FPS</span>
          <span className="text-gray-400">|</span>
          <span className={useWebGL ? 'text-green-300' : 'text-yellow-300'}>
            {useWebGL ? 'WebGL' : 'SVG'}
          </span>
        </div>
      )}
    </div>
  );
};

export default ParticleMetricsPanel;