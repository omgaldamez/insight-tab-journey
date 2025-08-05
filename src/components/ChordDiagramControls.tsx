/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { ChordDiagramConfig } from '@/hooks/useChordDiagram';
import { Eye, EyeOff, ChevronDown, ChevronUp, LayoutDashboard, Circle, Waves, Play, Cpu, Zap, Square, RefreshCw, ZapOff, BarChart, AlertTriangle } from 'lucide-react';
import ParticleControlsWithApply from './ParticleControlsWithApply';
import WebGLParticleControls from './WebGLParticleControls';

interface ChordDiagramControlsProps {
  config: ChordDiagramConfig;
  onConfigChange: (updates: Partial<ChordDiagramConfig>) => void;
  onToggleControlPanel: () => void;
  onLayerToggle?: (layerName: string, value: boolean) => void;
  controlsPanelVisible: boolean;
  particlesInitialized: boolean;
  isGeneratingParticles: boolean;
  onInitializeParticles: () => void;
  onCancelParticleGeneration: () => void;
  onToggleParticleMetrics: () => void;
  showParticleMetrics: boolean;
  onProgressiveGeneration: (enabled: boolean) => void;
  progressiveGenerationEnabled: boolean;
  particleMetrics: {
    totalParticles: number;
    totalChordsWithParticles: number;
    chordsGenerated: number;
    totalChords: number;
    renderTime: number;
    fps: number;
  };
}

// Tab options for the controls panel
type ControlTab = 'display' | 'arcs' | 'ribbons' | 'particles' | 'animation' | '3d';

const ChordDiagramControls: React.FC<ChordDiagramControlsProps> = ({
  config,
  onConfigChange,
  onToggleControlPanel,
  onLayerToggle,
  controlsPanelVisible,
  particlesInitialized,
  isGeneratingParticles,
  onInitializeParticles,
  onCancelParticleGeneration,
  onToggleParticleMetrics,
  showParticleMetrics,
  onProgressiveGeneration,
  progressiveGenerationEnabled,
  particleMetrics
}) => {
  // Destructure all config values for easier access
  const {
    chordStrokeWidth,
    chordOpacity,
    chordStrokeOpacity,
    arcOpacity,
    chordWidthVariation,
    chordWidthPosition,
    chordWidthCustomPosition,
    strokeWidthVariation,
    strokeWidthPosition,
    strokeWidthCustomPosition,
    useGeometricShapes,
    shapeType,
    shapeSize,
    shapeSpacing,
    shapeFill,
    shapeStroke,
    particleMode,
    particleDensity,
    particleSize,
    particleSizeVariation,
    particleBlur,
    particleDistribution,
    particleColor,
    particleOpacity,
    useFadeTransition,
    transitionDuration,
    showDetailedView,
    showAllNodes,
    evenDistribution,
    useColoredRibbons,
    ribbonFillEnabled,
    animationSpeed,
    useWebGLRenderer,
    uniformWidth,
    widthScaling,
    symmetricConnections,
    minWidth,
    maxWidth
  } = config;

  // State for active tab
  const [activeTab, setActiveTab] = useState<ControlTab>('display');

  
// In the ChordDiagramControls component
const handleToggleChange = (field: keyof ChordDiagramConfig) => {
  if ((field === 'showParticlesLayer' || field === 'showGeometricShapesLayer') && onLayerToggle) {
    onLayerToggle(field, !config[field]);
  } else {
    onConfigChange({ [field]: !config[field] });
  }
};

  // Create handlers for range inputs
  const handleRangeChange = (field: keyof ChordDiagramConfig, value: number) => {
    onConfigChange({ [field]: value });
  };

  // Create handlers for color inputs
  const handleColorChange = (field: keyof ChordDiagramConfig, value: string) => {
    onConfigChange({ [field]: value });
  };

  // Create handlers for select/option inputs
  const handleSelectChange = (
    field: 'chordWidthPosition' | 'strokeWidthPosition' | 'shapeType' | 'particleDistribution',
    value: string
  ) => {
    switch (field) {
      case 'chordWidthPosition':
        onConfigChange({ 
          [field]: value as 'start' | 'middle' | 'end' | 'custom' 
        });
        break;
      case 'strokeWidthPosition':
        onConfigChange({ 
          [field]: value as 'start' | 'middle' | 'end' | 'custom' 
        });
        break;
      case 'shapeType':
        onConfigChange({ 
          [field]: value as 'circle' | 'square' | 'diamond' 
        });
        break;
      case 'particleDistribution':
        onConfigChange({ 
          [field]: value as 'uniform' | 'random' | 'gaussian' 
        });
        break;
    }
  };

  // Show WebGL recommendation based on particle count
  const showWebGLRecommendation = particleMode && !useWebGLRenderer && particleMetrics.totalParticles > 2000;

  return (
    <div className="absolute bottom-4 left-4 z-10 max-w-xs overflow-auto min-w-0">
      {/* Collapsible panel */}
      <div 
        className={`bg-black/70 text-white rounded-md transition-all duration-300 overflow-hidden ${
          controlsPanelVisible ? 'max-h-[24rem]' : 'max-h-10 opacity-90'
        }`}
      >
        {/* Toggle header */}
        <div 
          className="px-3 py-2 flex justify-between items-center cursor-pointer sticky top-0 bg-black/90 z-10 border-b border-white/10"
          onClick={onToggleControlPanel}
        >
  
          <span className="text-sm font-medium">Chord Controls</span>
          <button className="text-white/70 hover:text-white">
            {controlsPanelVisible ? 
              <ChevronDown className="h-4 w-4" /> : 
              <ChevronUp className="h-4 w-4" />
            }
          </button>
        </div>
        
        {/* Panel content - only visible when expanded */}
        <div className={`${controlsPanelVisible ? 'block' : 'hidden'}`}>
          {/* WebGL recommendation alert - shown at the top for better visibility */}
          {showWebGLRecommendation && (
            <div className="m-3 p-2 bg-yellow-500/20 rounded-md border border-yellow-500/30">
              <div className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-yellow-300">
                    Performance Alert
                  </p>
                  <p className="text-xs mt-1 text-yellow-200/80">
                    You have {particleMetrics.totalParticles.toLocaleString()} particles. 
                    Switch to the 3D/WebGL tab and enable hardware acceleration for better performance.
                  </p>
                  <button
                    onClick={() => setActiveTab('3d')}
                    className="mt-2 text-xs px-2 py-1 bg-yellow-600/50 hover:bg-yellow-500/50 rounded-sm flex items-center"
                  >
                    <Cpu className="w-3 h-3 mr-1" />
                    Go to WebGL Settings
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Tabs navigation */}
          <div className="flex flex-wrap border-b border-white/10">
            <button 
  className={`w-1/3 sm:w-1/4 py-2 px-1 text-xs font-medium flex items-center justify-center ${activeTab === 'display' ? 'bg-blue-500/20 text-blue-300' : 'hover:bg-white/10'}`}
  onClick={() => setActiveTab('display')}
            >
              <LayoutDashboard className="w-3 h-3 mr-1" />
              Display
            </button>
            <button 
  className={`flex-1 py-2 px-1 text-xs font-medium flex items-center justify-center ${activeTab === 'arcs' ? 'bg-orange-500/20 text-orange-300' : 'hover:bg-white/10'}`}
  onClick={() => setActiveTab('arcs')}
>
  <Circle className="w-3 h-3 mr-1" />
  Arcs
</button>
            <button 
              className={`flex-1 py-2 px-1 text-xs font-medium flex items-center justify-center ${activeTab === 'ribbons' ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-white/10'}`}
              onClick={() => setActiveTab('ribbons')}
            >
              <Waves className="w-3 h-3 mr-1" />
              Ribbons
            </button>
            <button 
              className={`flex-1 py-2 px-1 text-xs font-medium flex items-center justify-center ${activeTab === 'particles' ? 'bg-green-500/20 text-green-300' : 'hover:bg-white/10'}`}
              onClick={() => setActiveTab('particles')}
            >
              <Circle className="w-3 h-3 mr-1" />
              Particles
            </button>
            <button 
              className={`flex-1 py-2 px-1 text-xs font-medium flex items-center justify-center ${activeTab === '3d' ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-white/10'} ${
                // Highlight tab if WebGL recommendation is active
                showWebGLRecommendation ? 'animate-pulse ring-1 ring-yellow-400' : ''
              }`}
              onClick={() => setActiveTab('3d')}
            >
              <Cpu className="w-3 h-3 mr-1" />
              3D/WebGL
            </button>
            <button 
              className={`flex-1 py-2 px-1 text-xs font-medium flex items-center justify-center ${activeTab === 'animation' ? 'bg-yellow-500/20 text-yellow-300' : 'hover:bg-white/10'}`}
              onClick={() => setActiveTab('animation')}
            >
              <Play className="w-3 h-3 mr-1" />
              Animation
            </button>
          </div>
          
          {/* Scrollable tab content */}
          <div className="overflow-y-auto max-h-[16rem] px-3 py-2 overflow-x-hidden">
            {/* Display Tab */}
            {activeTab === 'display' && (
              <div className="space-y-3">
                <div className="text-xs mb-2 text-white/80">
                  {showDetailedView 
                    ? "Detailed view shows individual nodes. Use 'Show All Nodes' to include unconnected nodes, and connection width controls to adjust visual appearance."
                    : "Hover over arcs and chords for details. The chord width represents connection strength."
                  }
                </div>
                
                {/* Visualization Mode Controls */}
                <div className="border-t border-white/10 mt-2 pt-2">
                  <h3 className="text-xs font-semibold mb-1.5 text-white/80">Visualization Mode</h3>
                  
                  {/* Detailed View Control */}
                  <div className="flex items-center mt-1.5">
                    <label className="flex items-center cursor-pointer">
                      <div className="relative mr-2">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={showDetailedView}
                          onChange={() => handleToggleChange('showDetailedView')}
                        />
                        <div className={`w-8 h-4 rounded-full transition-colors ${showDetailedView ? 'bg-purple-500' : 'bg-gray-500'}`}></div>
                        <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${showDetailedView ? 'translate-x-4' : ''}`}></div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs">Detailed View</span>
                        {showDetailedView ? 
                          <Eye className="w-3 h-3 text-purple-300" /> : 
                          <EyeOff className="w-3 h-3 text-gray-400" />
                        }
                      </div>
                    </label>
                  </div>
                  
                  {/* Show All Nodes Control */}
                  <div className="flex items-center mt-1.5">
                    <label className="flex items-center cursor-pointer">
                      <div className="relative mr-2">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={showAllNodes}
                          onChange={() => handleToggleChange('showAllNodes')}
                        />
                        <div className={`w-8 h-4 rounded-full transition-colors ${showAllNodes ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                        <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${showAllNodes ? 'translate-x-4' : ''}`}></div>
                      </div>
                      <span className="text-xs">Show All Nodes</span>
                    </label>
                  </div>
                  
                  {/* Distribution Control - Only relevant in category view */}
                  {!showDetailedView && (
                    <div className="flex items-center mt-1.5">
                      <label className="flex items-center cursor-pointer">
                        <div className="relative mr-2">
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={evenDistribution}
                            onChange={() => handleToggleChange('evenDistribution')}
                          />
                          <div className={`w-8 h-4 rounded-full transition-colors ${evenDistribution ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
                          <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${evenDistribution ? 'translate-x-4' : ''}`}></div>
                        </div>
                        <span className="text-xs">Even Distribution</span>
                      </label>
                    </div>
                  )}
                </div>
                
                {/* Connection Width Controls */}
                <div className="border-t border-white/10 mt-2 pt-2">
                  <h3 className="text-xs font-semibold mb-1.5 text-white/80">Connection Width</h3>
                  
                  {/* Uniform Width Control */}
                  <div className="flex items-center mt-1.5">
                    <label className="flex items-center cursor-pointer">
                      <div className="relative mr-2">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={uniformWidth}
                          onChange={() => handleToggleChange('uniformWidth')}
                        />
                        <div className={`w-8 h-4 rounded-full transition-colors ${uniformWidth ? 'bg-orange-500' : 'bg-gray-500'}`}></div>
                        <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${uniformWidth ? 'translate-x-4' : ''}`}></div>
                      </div>
                      <span className="text-xs">Uniform Width</span>
                    </label>
                  </div>
                  
                  {/* Symmetric Connections Control */}
                  <div className="flex items-center mt-1.5">
                    <label className="flex items-center cursor-pointer">
                      <div className="relative mr-2">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={symmetricConnections}
                          onChange={() => handleToggleChange('symmetricConnections')}
                        />
                        <div className={`w-8 h-4 rounded-full transition-colors ${symmetricConnections ? 'bg-cyan-500' : 'bg-gray-500'}`}></div>
                        <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${symmetricConnections ? 'translate-x-4' : ''}`}></div>
                      </div>
                      <span className="text-xs">Symmetric Connections</span>
                    </label>
                  </div>
                  
                  {/* Width Scaling Control */}
                  {!uniformWidth && (
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <label>Width Scaling: {widthScaling.toFixed(1)}x</label>
                      <input
                        type="range"
                        min="0.1"
                        max="5.0"
                        step="0.1"
                        value={widthScaling}
                        onChange={(e) => onConfigChange({ widthScaling: parseFloat(e.target.value) })}
                        className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                  
                  {/* Min Width Control */}
                  {!uniformWidth && (
                    <div className="flex items-center justify-between mt-1.5 text-xs">
                      <label>Min Width: {minWidth.toFixed(2)}</label>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={minWidth}
                        onChange={(e) => onConfigChange({ minWidth: parseFloat(e.target.value) })}
                        className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                  
                  {/* Max Width Control */}
                  {!uniformWidth && (
                    <div className="flex items-center justify-between mt-1.5 text-xs">
                      <label>Max Width: {maxWidth.toFixed(1)}</label>
                      <input
                        type="range"
                        min="1.0"
                        max="10.0"
                        step="0.5"
                        value={maxWidth}
                        onChange={(e) => onConfigChange({ maxWidth: parseFloat(e.target.value) })}
                        className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                  
                  {/* Minimal Connection Customization */}
                  <div className="border-t border-white/5 mt-2 pt-2">
                    <h4 className="text-xs font-medium mb-1.5 text-white/70">Forced Connections</h4>
                    
                    {/* Show Minimal Connections Toggle */}
                    <div className="flex items-center mt-1.5">
                      <label className="flex items-center cursor-pointer">
                        <div className="relative mr-2">
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={config.showMinimalConnections}
                            onChange={() => onConfigChange({ showMinimalConnections: !config.showMinimalConnections })}
                          />
                          <div className={`w-8 h-4 rounded-full transition-colors ${config.showMinimalConnections ? 'bg-gray-400' : 'bg-gray-600'}`}></div>
                          <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${config.showMinimalConnections ? 'translate-x-4' : ''}`}></div>
                        </div>
                        <span className="text-xs">Show Forced</span>
                      </label>
                    </div>
                    
                    {/* Minimal Connection Controls - only show when enabled */}
                    {config.showMinimalConnections && (
                      <div className="ml-2 mt-2 space-y-2">
                        {/* Minimal Connection Width */}
                        <div className="flex items-center justify-between text-xs">
                          <label>Width: {config.minimalConnectionWidth.toFixed(2)}</label>
                          <input
                            type="range"
                            min="0.05"
                            max="1.0"
                            step="0.01"
                            value={config.minimalConnectionWidth}
                            onChange={(e) => onConfigChange({ minimalConnectionWidth: parseFloat(e.target.value) })}
                            className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        
                        {/* Minimal Connection Width Scaling */}
                        <div className="flex items-center justify-between text-xs">
                          <label>Scaling: {config.minimalConnectionWidthScaling.toFixed(1)}x</label>
                          <input
                            type="range"
                            min="0.1"
                            max="3.0"
                            step="0.1"
                            value={config.minimalConnectionWidthScaling}
                            onChange={(e) => onConfigChange({ minimalConnectionWidthScaling: parseFloat(e.target.value) })}
                            className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        
                        {/* Minimal Connection Color */}
                        <div className="flex items-center justify-between text-xs">
                          <label>Color:</label>
                          <input
                            type="color"
                            value={config.minimalConnectionColor}
                            onChange={(e) => onConfigChange({ minimalConnectionColor: e.target.value })}
                            className="w-8 h-4 rounded border-none cursor-pointer"
                          />
                        </div>
                        
                        {/* Minimal Connection Opacity */}
                        <div className="flex items-center justify-between text-xs">
                          <label>Opacity: {(config.minimalConnectionOpacity * 100).toFixed(0)}%</label>
                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={config.minimalConnectionOpacity}
                            onChange={(e) => onConfigChange({ minimalConnectionOpacity: parseFloat(e.target.value) })}
                            className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

{activeTab === 'arcs' && (
  <div className="space-y-3">
    <h3 className="text-xs font-semibold mb-1.5 text-white/80">Arc Appearance</h3>
    
    {/* Arc Opacity Control */}
    <div className="flex items-center justify-between mt-1.5 text-xs">
      <label>Opacity: {config.arcOpacity.toFixed(2)}</label>
      <input
        type="range"
        min="0.1"
        max="1.0"
        step="0.05"
        value={config.arcOpacity}
        onChange={(e) => onConfigChange({ arcOpacity: parseFloat(e.target.value) })}
        className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
      />
    </div>
    
    {/* Arc Stroke Width Control */}
    <div className="flex items-center justify-between mt-2 text-xs">
      <label>Stroke Width: {config.arcStrokeWidth?.toFixed(1) || "1.0"}</label>
      <input
        type="range"
        min="0.1"
        max="3.0"
        step="0.1"
        value={config.arcStrokeWidth || 1.0}
        onChange={(e) => onConfigChange({ arcStrokeWidth: parseFloat(e.target.value) })}
        className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
      />
    </div>
    
    {/* Arc Stroke Color Control */}
    <div className="flex items-center mt-2 justify-between text-xs">
      <label>Stroke Color:</label>
      <div className="flex items-center">
        <input
          type="color"
          value={config.arcStrokeColor || '#ffffff'}
          onChange={(e) => onConfigChange({ arcStrokeColor: e.target.value })}
          className="w-6 h-6 rounded cursor-pointer"
        />
        <div 
          className="ml-2 w-4 h-4 rounded" 
          style={{backgroundColor: config.arcStrokeColor || '#ffffff'}}
        />
      </div>
    </div>
    
    {/* Arc Corner Radius Control */}
    <div className="flex items-center justify-between mt-2 text-xs">
      <label>Corner Radius: {(config.arcCornerRadius || 0).toFixed(1)}</label>
      <input
        type="range"
        min="0"
        max="10"
        step="0.5"
        value={config.arcCornerRadius || 0}
        onChange={(e) => onConfigChange({ arcCornerRadius: parseFloat(e.target.value) })}
        className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  </div>
)}
            
{/* Ribbons Tab */}
{activeTab === 'ribbons' && (
  <div className="space-y-3">
    {/* Main Ribbon Toggles */}
    <div className="mb-2">
      <h3 className="text-xs font-semibold mb-1.5 text-white/80">Ribbon Display</h3>
      
      {/* Show Ribbons Toggle */}
      <div className="flex items-center mt-1.5">
        <label className="flex items-center cursor-pointer">
          <div className="relative mr-2">
            <input
              type="checkbox"
              className="sr-only"
              checked={config.showChordRibbons}
              onChange={() => handleToggleChange('showChordRibbons')}
            />
            <div className={`w-8 h-4 rounded-full transition-colors ${config.showChordRibbons ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
            <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${config.showChordRibbons ? 'translate-x-4' : ''}`}></div>
          </div>
          <span className="text-xs">Show Chord Ribbons</span>
        </label>
      </div>
      
      {/* Colored Ribbons Control */}
      <div className="flex items-center mt-1.5">
        <label className="flex items-center cursor-pointer">
          <div className="relative mr-2">
            <input
              type="checkbox"
              className="sr-only"
              checked={useColoredRibbons}
              onChange={() => handleToggleChange('useColoredRibbons')}
            />
            <div className={`w-8 h-4 rounded-full transition-colors ${useColoredRibbons ? 'bg-pink-500' : 'bg-gray-500'}`}></div>
            <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${useColoredRibbons ? 'translate-x-4' : ''}`}></div>
          </div>
          <span className="text-xs">Colored Ribbons</span>
        </label>
      </div>
      
      {/* Ribbon Fill Control */}
      <div className="flex items-center mt-1.5">
        <label className="flex items-center cursor-pointer">
          <div className="relative mr-2">
            <input
              type="checkbox"
              className="sr-only"
              checked={ribbonFillEnabled}
              onChange={() => handleToggleChange('ribbonFillEnabled')}
            />
            <div className={`w-8 h-4 rounded-full transition-colors ${ribbonFillEnabled ? 'bg-indigo-500' : 'bg-gray-500'}`}></div>
            <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${ribbonFillEnabled ? 'translate-x-4' : ''}`}></div>
          </div>
          <span className="text-xs">Filled Ribbons</span>
        </label>
      </div>
      
      {/* Real Connections Only Toggle */}
      <div className="flex items-center mt-1.5">
        <label className="flex items-center cursor-pointer">
          <div className="relative mr-2">
            <input
              type="checkbox"
              className="sr-only"
              checked={config.showOnlyRealConnectionsRibbons}
              onChange={() => handleToggleChange('showOnlyRealConnectionsRibbons')}
            />
            <div className={`w-8 h-4 rounded-full transition-colors ${config.showOnlyRealConnectionsRibbons ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
            <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${config.showOnlyRealConnectionsRibbons ? 'translate-x-4' : ''}`}></div>
          </div>
          <span className="text-xs">Real Connections Only</span>
        </label>
      </div>
    </div>
    
   {/* Ribbon Style Controls - wrap in a grid for better layout */}
   <div className="border-t border-white/10 mt-2 pt-2">
      <h3 className="text-xs font-semibold mb-1.5 text-white/80">Ribbon Appearance</h3>
      
      <div className="grid grid-cols-1 gap-2">
      {/* Fill Color Control - Only when not using colored ribbons */}
      {!useColoredRibbons && (
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <label>Fill Color:</label>
          <div className="flex items-center">
            <input
              type="color"
              value={config.ribbonFillColor}
              onChange={(e) => onConfigChange({ ribbonFillColor: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer"
            />
            <div 
              className="ml-2 w-4 h-4 rounded" 
              style={{backgroundColor: config.ribbonFillColor}}
            />
          </div>
        </div>
      )}
      
      {/* Stroke Color Control */}
      <div className="flex items-center justify-between mt-2 text-xs">
        <label>Stroke Color:</label>
        <div className="flex items-center">
          <input
            type="color"
            value={config.ribbonStrokeColor}
            onChange={(e) => onConfigChange({ ribbonStrokeColor: e.target.value })}
            className="w-6 h-6 rounded cursor-pointer"
          />
          <div 
            className="ml-2 w-4 h-4 rounded" 
            style={{backgroundColor: config.ribbonStrokeColor}}
          />
        </div>
      </div>
      
      {/* Fill Opacity Control - only enabled when filled ribbons is on */}
      <div className="flex items-center justify-between mt-2 text-xs">
        <label className={ribbonFillEnabled ? '' : 'text-gray-500'}>
          Fill Opacity: {chordOpacity.toFixed(2)}
        </label>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.05"
          value={chordOpacity}
          disabled={!ribbonFillEnabled}
          onChange={(e) => handleRangeChange('chordOpacity', parseFloat(e.target.value))}
          className={`w-28 h-2 ${ribbonFillEnabled ? 'bg-gray-600' : 'bg-gray-700'} rounded-lg appearance-none cursor-pointer`}
        />
      </div>
      
      {/* Global Ribbon Opacity Control */}
      <div className="flex items-center justify-between mt-2 text-xs">
        <label>Ribbon Opacity: {config.ribbonOpacity.toFixed(2)}</label>
        <input
          type="range"
          min="0.05"
          max="1.0"
          step="0.05"
          value={config.ribbonOpacity}
          onChange={(e) => handleRangeChange('ribbonOpacity', parseFloat(e.target.value))}
          className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      
      {/* Stroke Width Control */}
      <div className="flex items-center justify-between mt-2 text-xs">
        <label>Stroke Width: {chordStrokeWidth.toFixed(1)}</label>
        <input
          type="range"
          min="0.1"
          max="3.0"
          step="0.1"
          value={chordStrokeWidth}
          onChange={(e) => handleRangeChange('chordStrokeWidth', parseFloat(e.target.value))}
          className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      
      {/* Stroke Opacity Control */}
      <div className="flex items-center justify-between mt-2 text-xs">
        <label>Stroke Opacity: {chordStrokeOpacity.toFixed(2)}</label>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.05"
          value={chordStrokeOpacity}
          onChange={(e) => handleRangeChange('chordStrokeOpacity', parseFloat(e.target.value))}
          className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
        />
      </div>

    </div>
    
{/* Connection Type Styling */}
<div className="border-t border-white/10 mt-4 pt-2">
  <h3 className="text-xs font-semibold mb-1.5 text-white/80">Connection Type Styling</h3>
  
  {/* Real Connections styling */}
  <div className="bg-gray-700/50 p-2 rounded-md mb-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium">Real Connections</span>
      
      {/* Toggle to show/hide real connections */}
      <div className="relative inline-block w-8 h-4">
        <input
          type="checkbox"
          className="sr-only"
          checked={!config.hideRealConnections} // New config property
          onChange={() => onConfigChange({ hideRealConnections: !config.hideRealConnections })}
          id="real-connections-toggle"
        />
        <label 
          htmlFor="real-connections-toggle"
          className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition ${
            !config.hideRealConnections ? 'bg-blue-500' : 'bg-gray-500'
          }`}
        >
          <span 
            className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${
              !config.hideRealConnections ? 'translate-x-4' : ''
            }`}
          ></span>
        </label>
      </div>
    </div>
    
    {/* Only show these controls if real connections are visible */}
    {!config.hideRealConnections && (
      <div className="mt-2">
        {/* Real connection color control */}
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <label>Color:</label>
          <div className="flex items-center">
            <input
              type="color"
              value={config.realConnectionRibbonColor}
              onChange={(e) => onConfigChange({ realConnectionRibbonColor: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer"
            />
          </div>
        </div>
        
        {/* Real connection opacity control */}
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <label>Opacity: {config.realConnectionRibbonOpacity.toFixed(2)}</label>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={config.realConnectionRibbonOpacity}
            onChange={(e) => onConfigChange({ realConnectionRibbonOpacity: parseFloat(e.target.value) })}
            className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        {/* Real connection stroke properties */}
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <label>Stroke Color:</label>
          <div className="flex items-center">
            <input
              type="color"
              value={config.realConnectionRibbonStrokeColor}
              onChange={(e) => onConfigChange({ realConnectionRibbonStrokeColor: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <label>Stroke Width: {config.realConnectionRibbonStrokeWidth.toFixed(1)}</label>
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            value={config.realConnectionRibbonStrokeWidth}
            onChange={(e) => onConfigChange({ realConnectionRibbonStrokeWidth: parseFloat(e.target.value) })}
            className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <label>Stroke Opacity: {config.realConnectionRibbonStrokeOpacity.toFixed(2)}</label>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={config.realConnectionRibbonStrokeOpacity}
            onChange={(e) => onConfigChange({ realConnectionRibbonStrokeOpacity: parseFloat(e.target.value) })}
            className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    )}
  </div>
  
  {/* Minimal Connections styling */}
  <div className="bg-gray-700/50 p-2 rounded-md mt-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium">Minimal Connections</span>
      
      {/* Toggle to show/hide minimal connections */}
      <div className="relative inline-block w-8 h-4">
        <input
          type="checkbox"
          className="sr-only"
          checked={!config.hideMinimalConnections} // New config property
          onChange={() => onConfigChange({ hideMinimalConnections: !config.hideMinimalConnections })}
          id="minimal-connections-toggle"
        />
        <label 
          htmlFor="minimal-connections-toggle"
          className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition ${
            !config.hideMinimalConnections ? 'bg-blue-500' : 'bg-gray-500'
          }`}
        >
          <span 
            className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${
              !config.hideMinimalConnections ? 'translate-x-4' : ''
            }`}
          ></span>
        </label>
      </div>
    </div>
    
    {/* Only show these controls if minimal connections are visible */}
    {!config.hideMinimalConnections && (
      <div className="mt-2">
        {/* Minimal connection color control */}
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <label>Color:</label>
          <div className="flex items-center">
            <input
              type="color"
              value={config.minimalConnectionRibbonColor}
              onChange={(e) => onConfigChange({ minimalConnectionRibbonColor: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer"
            />
          </div>
        </div>
        
        {/* Minimal connection opacity control */}
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <label>Opacity: {config.minimalConnectionRibbonOpacity.toFixed(2)}</label>
          <input
            type="range"
            min="0.05"
            max="0.5"
            step="0.05"
            value={config.minimalConnectionRibbonOpacity}
            onChange={(e) => onConfigChange({ minimalConnectionRibbonOpacity: parseFloat(e.target.value) })}
            className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        {/* Minimal connection stroke properties */}
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <label>Stroke Color:</label>
          <div className="flex items-center">
            <input
              type="color"
              value={config.minimalConnectionRibbonStrokeColor}
              onChange={(e) => onConfigChange({ minimalConnectionRibbonStrokeColor: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <label>Stroke Width: {config.minimalConnectionRibbonStrokeWidth.toFixed(1)}</label>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.1"
            value={config.minimalConnectionRibbonStrokeWidth}
            onChange={(e) => onConfigChange({ minimalConnectionRibbonStrokeWidth: parseFloat(e.target.value) })}
            className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <label>Stroke Opacity: {config.minimalConnectionRibbonStrokeOpacity.toFixed(2)}</label>
          <input
            type="range"
            min="0.1"
            max="0.5"
            step="0.05"
            value={config.minimalConnectionRibbonStrokeOpacity}
            onChange={(e) => onConfigChange({ minimalConnectionRibbonStrokeOpacity: parseFloat(e.target.value) })}
            className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    )}
  </div>
  
  {/* Connection threshold control */}
  <div className="mt-3">
    <div className="flex items-center justify-between text-xs">
      <label>Real Connection Threshold: {config.realConnectionThreshold.toFixed(2)}</label>
      <input
        type="range"
        min="0.05"
        max="1.0"
        step="0.05"
        value={config.realConnectionThreshold}
        onChange={(e) => onConfigChange({ realConnectionThreshold: parseFloat(e.target.value) })}
        className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
      />
    </div>
    <div className="text-xs text-gray-400 mt-1">
      Connections with values above this threshold are considered "real"
    </div>
  </div>
</div>
    
    
    {/* Width Variation Controls - Keep your existing section */}
    <div className="border-t border-white/10 mt-2 pt-2">
      <h3 className="text-xs font-semibold mb-1.5 text-white/80">Width Variation</h3>
      {/* ... existing width variation controls ... */}
    </div>
  </div>
  </div>
)}
            
            {/* Particles Tab */}
            {activeTab === 'particles' && (
              <div className="space-y-3">
                {/* Header area with metrics toggle */}
                <div className="flex justify-between">
                  <h3 className="text-xs font-semibold mb-1.5 text-white/80">Visual Effects</h3>
                  
                  {/* Toggle for metrics panel */}
                  <button
                    onClick={onToggleParticleMetrics}
                    className={`text-xs flex items-center px-1.5 py-0.5 rounded ${showParticleMetrics ? 'bg-green-600/40 text-green-300' : 'bg-gray-600/40 text-gray-300'}`}
                    title={showParticleMetrics ? "Hide metrics panel" : "Show metrics panel"}
                  >
                    <BarChart className="w-3 h-3 mr-1" />
                    {showParticleMetrics ? "Hide" : "Metrics"}
                  </button>
                </div>
                
                {/* Enhanced visualization mode selector */}
                <div className="bg-gray-800/70 p-2 rounded-md mb-3">
                  <div className="text-xs font-medium mb-2 text-white/90">Visualization Style</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        if (particleMode) {
                          // If switching from particles to shapes, confirm
                          if (window.confirm("Switching to geometric shapes will disable particle mode. Continue?")) {
                            onConfigChange({ 
                              useGeometricShapes: true,
                              particleMode: false 
                            });
                          }
                        } else {
                          // Just enable shapes if particles not active
                          onConfigChange({ useGeometricShapes: true });
                        }
                      }}
                      className={`py-2 px-3 rounded-md flex flex-col items-center justify-center ${
                        useGeometricShapes ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <Square className="w-5 h-5 mb-1" />
                      <span className="text-xs">Shapes</span>
                      <span className="text-xs opacity-70 mt-0.5">
                        {useGeometricShapes ? 'Active' : 'Inactive'}
                      </span>
                    </button>
                    
                    <button
  onClick={() => {
    if (useGeometricShapes) {
      // If switching from shapes to particles, confirm
      if (window.confirm("Switching to particles will disable geometric shapes. Continue?")) {
        onConfigChange({ 
          useGeometricShapes: false,
          particleMode: true,
          showParticlesLayer: true  // Ensure the layer is also enabled
        });
      }
    } else {
      // Just toggle particle mode if shapes not active
      const newParticleMode = !particleMode;
      onConfigChange({ 
        particleMode: newParticleMode,
        showParticlesLayer: newParticleMode  // Keep layer state in sync
      });
    }
  }}
                      className={`py-2 px-3 rounded-md flex flex-col items-center justify-center ${
                        particleMode ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <Circle className="w-5 h-5 mb-1" />
                      <span className="text-xs">Particles</span>
                      <span className="text-xs opacity-70 mt-0.5">
                        {particleMode ? 'Active' : 'Inactive'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* WebGL recommendation for particle mode */}
                {particleMode && !useWebGLRenderer && particleMetrics.totalParticles > 2000 && (
                  <div className="mb-3 p-2 bg-yellow-500/20 rounded-md border border-yellow-500/30">
                    <div className="flex items-start">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-yellow-300">
                          Performance Recommendation
                        </p>
                        <p className="text-xs mt-1 text-yellow-200/80">
                          For better performance with {particleMetrics.totalParticles.toLocaleString()} particles, 
                          enable WebGL rendering in the 3D/WebGL tab.
                        </p>
                        <button
                          onClick={() => setActiveTab('3d')}
                          className="mt-2 text-xs px-2 py-1 bg-yellow-600/50 hover:bg-yellow-500/50 rounded-sm flex items-center"
                        >
                          <Cpu className="w-3 h-3 mr-1" />
                          Go to WebGL Settings
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Use ParticleControlsWithApply when particle mode is enabled */}
                {particleMode && (
  <div>
    {!particlesInitialized && !isGeneratingParticles && (
      <div className="mb-3 p-2 bg-blue-500/20 rounded-md border border-blue-500/30">
        <button
          onClick={onInitializeParticles}
          className="w-full py-1.5 bg-blue-600/70 hover:bg-blue-500/70 rounded text-xs font-medium"
        >
          Initialize Particles
        </button>
      </div>
    )}

<div className="flex items-center justify-between mt-1.5 text-xs">
  <label>Max Particles Per Chord: {config.maxParticlesPerChord}</label>
  <input
    type="range"
    min="50"
    max="500"
    step="50"
    value={config.maxParticlesPerChord}
    onChange={(e) => onConfigChange({ maxParticlesPerChord: parseInt(e.target.value) })}
    className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
  />
</div>

    <ParticleControlsWithApply 
      config={config}
      onConfigChange={onConfigChange}
      particlesInitialized={particlesInitialized}
      onInitializeParticles={onInitializeParticles}
    />
  </div>
)}
                
                {/* Geometric Shapes Controls - only shown when shapes are enabled */}
                {useGeometricShapes && (
                  <div className="border-t border-white/10 mt-2 pt-2">
                    <h3 className="text-xs font-semibold mb-1.5 text-white/80">Shape Settings</h3>
                    
                    {/* Shape Type Control */}
                    <div className="mt-1">
                      <div className="text-xs mb-1">Shape Type:</div>
                      <div className="grid grid-cols-3 gap-1">
                        {['circle', 'square', 'diamond'].map((type) => (
                          <button
                            key={type}
                            className={`text-xs py-1 rounded-sm ${shapeType === type ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}
                            onClick={() => handleSelectChange('shapeType', type as any)}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Shape Size Control */}
                    <div className="flex items-center justify-between mt-1.5 text-xs">
                      <label>Size: {shapeSize.toFixed(1)}</label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="0.5"
                        value={shapeSize}
                        onChange={(e) => handleRangeChange('shapeSize', parseFloat(e.target.value))}
                        className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    
                    {/* Shape Spacing Control */}
                    <div className="flex items-center justify-between mt-1.5 text-xs">
                      <label>Spacing: {shapeSpacing}</label>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        step="1"
                        value={shapeSpacing}
                        onChange={(e) => handleRangeChange('shapeSpacing', parseInt(e.target.value))}
                        className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    
                    {/* Shape Color Controls */}
                    <div className="flex items-center space-x-3 mt-2">
                      <div className="flex items-center">
                        <label className="text-xs mr-1">Fill:</label>
                        <input
                          type="color"
                          value={shapeFill}
                          onChange={(e) => handleColorChange('shapeFill', e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center">
                        <label className="text-xs mr-1">Stroke:</label>
                        <input
                          type="color"
                          value={shapeStroke}
                          onChange={(e) => handleColorChange('shapeStroke', e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Particle generation controls - only visible when particle mode is ON */}
                {particleMode && (
                  <div className={`mt-2 p-2 rounded ${particlesInitialized ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
                    {isGeneratingParticles ? (
                      <div className="text-xs">
                        <div className="flex justify-between mb-1">
                          <span>Generating particles...</span>
                          <span>{Math.round((particleMetrics.chordsGenerated / particleMetrics.totalChords) * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden mb-2">
                          <div 
                            className="h-full bg-green-500 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${(particleMetrics.chordsGenerated / particleMetrics.totalChords) * 100}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-gray-300 text-xs">
                          <span>Chords: {particleMetrics.chordsGenerated}/{particleMetrics.totalChords}</span>
                          <span>Particles: {particleMetrics.totalParticles}</span>
                        </div>
                        <button
                          onClick={onCancelParticleGeneration}
                          className="w-full mt-2 py-1 bg-red-700/50 hover:bg-red-600/60 rounded text-xs font-medium flex items-center justify-center"
                        >
                          <ZapOff className="w-3 h-3 mr-1" />
                          Cancel Generation
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-green-300 flex items-center">
                            <Zap className="w-3 h-3 mr-1" />
                            {particlesInitialized ? "Particles Generated" : "Particle Generation"}
                          </span>
                          {particlesInitialized && <span>{particleMetrics.totalParticles} total</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
{/* Visualization Layers Section */}
<div className="border-t border-white/10 mt-2 pt-2">
  <h3 className="text-xs font-semibold mb-1.5 text-white/80">Visualization Layers</h3>
  
  <div className="text-xs mb-2 text-white/70">
    Control which visual elements are displayed and how they interact.
  </div>
  
  {/* Chord Ribbons Layer */}
  <div className="flex items-center mt-1.5">
    <label className="flex items-center cursor-pointer">
      <div className="relative mr-2">
        <input
          type="checkbox"
          className="sr-only"
          checked={config.showChordRibbons}
          onChange={() => handleToggleChange('showChordRibbons')}
        />
        <div className={`w-8 h-4 rounded-full transition-colors ${config.showChordRibbons ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
        <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${config.showChordRibbons ? 'translate-x-4' : ''}`}></div>
      </div>
      <span className="text-xs">Show Chord Ribbons</span>
    </label>
  </div>
  
  {config.showChordRibbons && (
    <>
      {/* Ribbon Opacity Control */}
      <div className="flex items-center justify-between mt-1.5 text-xs pl-6">
        <label>Ribbon Opacity: {config.ribbonOpacity.toFixed(2)}</label>
        <input
          type="range"
          min="0.05"
          max="1.0"
          step="0.05"
          value={config.ribbonOpacity}
          onChange={(e) => handleRangeChange('ribbonOpacity', parseFloat(e.target.value))}
          className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      
      {/* Real Connections Only for Ribbons */}
      <div className="flex items-center mt-1.5 pl-6">
        <label className="flex items-center cursor-pointer">
          <div className="relative mr-2">
            <input
              type="checkbox"
              className="sr-only"
              checked={config.showOnlyRealConnectionsRibbons}
              onChange={() => handleToggleChange('showOnlyRealConnectionsRibbons')}
            />
            <div className={`w-8 h-4 rounded-full transition-colors ${config.showOnlyRealConnectionsRibbons ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
            <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${config.showOnlyRealConnectionsRibbons ? 'translate-x-4' : ''}`}></div>
          </div>
          <span className="text-xs">Real connections only</span>
        </label>
      </div>
    </>
  )}
  
  {/* Geometric Shapes Layer */}
  <div className="flex items-center mt-3">
    <label className="flex items-center cursor-pointer">
      <div className="relative mr-2">
        <input
          type="checkbox"
          className="sr-only"
          checked={config.showGeometricShapesLayer}
          onChange={() => handleToggleChange('showGeometricShapesLayer')}
        />
        <div className={`w-8 h-4 rounded-full transition-colors ${config.showGeometricShapesLayer ? 'bg-purple-500' : 'bg-gray-500'}`}></div>
        <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${config.showGeometricShapesLayer ? 'translate-x-4' : ''}`}></div>
      </div>
      <span className="text-xs">Show Geometric Shapes</span>
    </label>
  </div>
  
  {config.showGeometricShapesLayer && (
    <>
      {/* Real Connections Only for Shapes */}
      <div className="flex items-center mt-1.5 pl-6">
        <label className="flex items-center cursor-pointer">
          <div className="relative mr-2">
            <input
              type="checkbox"
              className="sr-only"
              checked={config.showOnlyRealConnectionsShapes}
              onChange={() => handleToggleChange('showOnlyRealConnectionsShapes')}
            />
            <div className={`w-8 h-4 rounded-full transition-colors ${config.showOnlyRealConnectionsShapes ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
            <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${config.showOnlyRealConnectionsShapes ? 'translate-x-4' : ''}`}></div>
          </div>
          <span className="text-xs">Real connections only</span>
        </label>
      </div>

{/* Ribbon Color Controls - Only show when Chord Ribbons are enabled */}
{config.showChordRibbons && (
  <div className="flex items-center gap-2 mt-2 pl-6">
    <div className="flex items-center">
      <label className="text-xs mr-1">Stroke:</label>
      <input
        type="color"
        value={config.ribbonStrokeColor}
        onChange={(e) => handleColorChange('ribbonStrokeColor', e.target.value)}
        className="w-5 h-5 rounded cursor-pointer"
      />
    </div>
    
    {!config.useColoredRibbons && (
      <div className="flex items-center">
        <label className="text-xs mr-1">Fill:</label>
        <input
          type="color"
          value={config.ribbonFillColor}
          onChange={(e) => handleColorChange('ribbonFillColor', e.target.value)}
          className="w-5 h-5 rounded cursor-pointer"
        />
      </div>
    )}
  </div>
)}

    </>
  )}
  
  {/* Particles Layer */}
  <div className="flex items-center mt-3">
    <label className="flex items-center cursor-pointer">
      <div className="relative mr-2">
        <input
          type="checkbox"
          className="sr-only"
          checked={config.showParticlesLayer}
          onChange={() => handleToggleChange('showParticlesLayer')}
        />
        <div className={`w-8 h-4 rounded-full transition-colors ${config.showParticlesLayer ? 'bg-green-500' : 'bg-gray-500'}`}></div>
        <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${config.showParticlesLayer ? 'translate-x-4' : ''}`}></div>
      </div>
      <span className="text-xs">Show Particles</span>
    </label>
  </div>
  
  {/* Note about combined modes */}
  <div className="text-xs mt-3 text-white/60">
    You can show multiple layer types simultaneously for interesting visual effects.
  </div>
</div>

{/* New Connection Filtering Section */}
<div className="border-t border-white/10 mt-4 pt-2">
  <h3 className="text-xs font-semibold mb-1.5 text-white/80">Connection Filtering</h3>
  
  <div className="text-xs mb-2 text-white/70">
    Control which connections are shown across all layers.
  </div>
  
  {/* Master toggle for all layers */}
  <div className="flex items-center mt-2">
    <label className="flex items-center cursor-pointer">
      <div className="relative mr-2">
        <input
          type="checkbox"
          className="sr-only"
          checked={config.filterRealConnectionsOnly}
          onChange={() => onConfigChange({ 
            filterRealConnectionsOnly: !config.filterRealConnectionsOnly,
            // Apply to all layers for consistency when enabling
            showOnlyRealConnectionsRibbons: !config.filterRealConnectionsOnly,
            showOnlyRealConnectionsShapes: !config.filterRealConnectionsOnly,
            particlesOnlyRealConnections: !config.filterRealConnectionsOnly
          })}
        />
        <div className={`w-8 h-4 rounded-full transition-colors ${config.filterRealConnectionsOnly ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
        <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${config.filterRealConnectionsOnly ? 'translate-x-4' : ''}`}></div>
      </div>
      <span className="text-xs font-medium">Show real connections only</span>
      <span className="text-xs ml-1 text-gray-400">(all layers)</span>
    </label>
  </div>
  
  {/* Individual layer overrides - only shown when master filter is active */}
  {config.filterRealConnectionsOnly && (
    <div className="mt-2 pl-4 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs">Ribbons:</label>
        <div className="relative inline-block w-8 h-4">
          <input
            type="checkbox"
            className="sr-only"
            checked={config.showOnlyRealConnectionsRibbons}
            onChange={() => onConfigChange({ showOnlyRealConnectionsRibbons: !config.showOnlyRealConnectionsRibbons })}
            id="ribbon-connections-toggle"
          />
          <label 
            htmlFor="ribbon-connections-toggle"
            className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition ${config.showOnlyRealConnectionsRibbons ? 'bg-blue-500' : 'bg-gray-500'}`}
          >
            <span 
              className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${config.showOnlyRealConnectionsRibbons ? 'translate-x-4' : ''}`}
            ></span>
          </label>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <label className="text-xs">Shapes:</label>
        <div className="relative inline-block w-8 h-4">
          <input
            type="checkbox"
            className="sr-only"
            checked={config.showOnlyRealConnectionsShapes}
            onChange={() => onConfigChange({ showOnlyRealConnectionsShapes: !config.showOnlyRealConnectionsShapes })}
            id="shapes-connections-toggle"
          />
          <label 
            htmlFor="shapes-connections-toggle"
            className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition ${config.showOnlyRealConnectionsShapes ? 'bg-purple-500' : 'bg-gray-500'}`}
          >
            <span 
              className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${config.showOnlyRealConnectionsShapes ? 'translate-x-4' : ''}`}
            ></span>
          </label>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <label className="text-xs">Particles:</label>
        <div className="relative inline-block w-8 h-4">
          <input
            type="checkbox"
            className="sr-only"
            checked={config.particlesOnlyRealConnections}
            onChange={() => onConfigChange({ particlesOnlyRealConnections: !config.particlesOnlyRealConnections })}
            id="particles-connections-toggle"
          />
          <label 
            htmlFor="particles-connections-toggle"
            className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition ${config.particlesOnlyRealConnections ? 'bg-green-500' : 'bg-gray-500'}`}
          >
            <span 
              className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${config.particlesOnlyRealConnections ? 'translate-x-4' : ''}`}
            ></span>
          </label>
        </div>
      </div>
    </div>
  )}
</div>

            {/* 3D/WebGL Tab */}
            {activeTab === '3d' && (
              <div className="space-y-3">
                {/* Improved WebGL Controls with more prominence */}
                <WebGLParticleControls 
                  config={config}
                  onConfigChange={onConfigChange}
                  particleMetrics={particleMetrics}
                />
                
                {/* Additional explanation text */}
                {useWebGLRenderer && (
                  <div className="mt-3 text-xs p-2 bg-blue-500/20 text-blue-300 rounded">
                    <div className="flex items-start">
                      <Cpu className="w-3.5 h-3.5 text-blue-400 mr-1.5 mt-0.5 flex-shrink-0" />
                      <p>
                        <strong>WebGL Rendering Active</strong>: Your particle effects are using 
                        hardware acceleration for smoother performance, especially with large numbers
                        of particles.
                      </p>
                    </div>
                  </div>
                )}
                
                {!useWebGLRenderer && particleMode && (
                  <div className="mt-3 text-xs p-2 bg-gray-700 rounded">
                    <p className="text-white/70">
                      WebGL rendering uses your graphics card to accelerate particle rendering,
                      providing significantly better performance than standard SVG rendering.
                      Enable it when using many particles or in detailed view.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Animation Tab */}
            {activeTab === 'animation' && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold mb-1.5 text-white/80">Animation Settings</h3>
                
                {/* Animation Speed Control */}
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <label>Speed: {animationSpeed.toFixed(1)}x</label>
                  <input
                    type="range"
                    min="0.5"
                    max="10.0"
                    step="0.5"
                    value={animationSpeed}
                    onChange={(e) => handleRangeChange('animationSpeed', parseFloat(e.target.value))}
                    className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                {/* Visual Effects Section */}
<div className="border-t border-white/10 mt-3 pt-3">
  <h3 className="text-xs font-semibold mb-1.5 text-white/80">Visual Effects</h3>
  
  {/* Ribbon Animation Toggle */}
  <div className="flex items-center justify-between mt-1.5">
    <label className="text-xs">Ribbon Animation:</label>
    <div className="relative inline-block w-8 h-4">
      <input 
        type="checkbox" 
        className="sr-only"
        checked={config.ribbonAnimationEnabled}
        onChange={() => onConfigChange({ ribbonAnimationEnabled: !config.ribbonAnimationEnabled })}
        id="ribbon-animation-toggle"
      />
      <label 
        htmlFor="ribbon-animation-toggle"
        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition ${
          config.ribbonAnimationEnabled ? 'bg-blue-500' : 'bg-gray-500'
        }`}
      >
        <span 
          className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${
            config.ribbonAnimationEnabled ? 'translate-x-4' : ''
          }`}
        ></span>
      </label>
    </div>
  </div>
  
  {/* Arc Animation Toggle */}
  <div className="flex items-center justify-between mt-1.5">
    <label className="text-xs">Arc Animation:</label>
    <div className="relative inline-block w-8 h-4">
      <input 
        type="checkbox" 
        className="sr-only"
        checked={config.arcAnimationEnabled}
        onChange={() => onConfigChange({ arcAnimationEnabled: !config.arcAnimationEnabled })}
        id="arc-animation-toggle"
      />
      <label 
        htmlFor="arc-animation-toggle"
        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition ${
          config.arcAnimationEnabled ? 'bg-purple-500' : 'bg-gray-500'
        }`}
      >
        <span 
          className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${
            config.arcAnimationEnabled ? 'translate-x-4' : ''
          }`}
        ></span>
      </label>
    </div>
  </div>
  
  {/* Blur Effect Toggle */}
  <div className="flex items-center justify-between mt-1.5">
    <label className="text-xs">Blur/Glow Effect:</label>
    <div className="relative inline-block w-8 h-4">
      <input 
        type="checkbox" 
        className="sr-only"
        checked={config.blurEffectEnabled}
        onChange={() => onConfigChange({ blurEffectEnabled: !config.blurEffectEnabled })}
        id="blur-effect-toggle"
      />
      <label 
        htmlFor="blur-effect-toggle"
        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition ${
          config.blurEffectEnabled ? 'bg-cyan-500' : 'bg-gray-500'
        }`}
      >
        <span 
          className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${
            config.blurEffectEnabled ? 'translate-x-4' : ''
          }`}
        ></span>
      </label>
    </div>
  </div>
  
  {/* Animation Effect Selector - only visible when animation is enabled */}
  {(config.ribbonAnimationEnabled || config.arcAnimationEnabled) && (
    <div className="mt-3 space-y-2">
      <div className="text-xs mb-1">Animation Type:</div>
      <div className="grid grid-cols-3 gap-1">
        {['wave', 'pulse', 'rotate'].map((effect) => (
          <button
            key={effect}
            className={`text-xs py-1 rounded-sm capitalize ${
              config.animationEffect === effect ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
            }`}
            onClick={() => onConfigChange({ animationEffect: effect as 'rotate' | 'wave' | 'pulse' })}
          >
            {effect}
          </button>
        ))}
      </div>
    </div>
  )}
  
  {/* Blur Amount Slider - only visible when blur is enabled */}
  {config.blurEffectEnabled && (
    <div className="flex items-center justify-between mt-3 text-xs">
      <label>Blur Amount: {config.blurEffectAmount.toFixed(1)}</label>
      <input
        type="range"
        min="0.5"
        max="5.0"
        step="0.5"
        value={config.blurEffectAmount}
        onChange={(e) => onConfigChange({ blurEffectAmount: parseFloat(e.target.value) })}
        className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  )}
  
  {/* Animation Speed Control */}
  {(config.ribbonAnimationEnabled || config.arcAnimationEnabled) && (
    <div className="flex items-center justify-between mt-3 text-xs">
      <label>Effect Speed: {config.animationSpeedMultiplier.toFixed(1)}x</label>
      <input
        type="range"
        min="0.5"
        max="3.0"
        step="0.1"
        value={config.animationSpeedMultiplier}
        onChange={(e) => onConfigChange({ animationSpeedMultiplier: parseFloat(e.target.value) })}
        className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  )}
</div>

{/* Glow Effect Toggle */}
<div className="flex items-center justify-between mt-1.5">
  <label className="text-xs">Glow Effect:</label>
  <div className="relative inline-block w-8 h-4">
    <input 
      type="checkbox" 
      className="sr-only"
      checked={config.glowEffectEnabled}
      onChange={() => onConfigChange({ glowEffectEnabled: !config.glowEffectEnabled })}
      id="glow-effect-toggle"
    />
    <label 
      htmlFor="glow-effect-toggle"
      className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition ${
        config.glowEffectEnabled ? 'bg-blue-500' : 'bg-gray-500'
      }`}
    >
      <span 
        className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${
          config.glowEffectEnabled ? 'translate-x-4' : ''
        }`}
      ></span>
    </label>
  </div>
</div>

{/* Individual Glow Colors Toggle */}
{config.glowEffectEnabled && (
  <div className="flex items-center justify-between mt-3">
    <label className="text-xs">Individual Category Glow:</label>
    <div className="relative inline-block w-8 h-4">
      <input 
        type="checkbox" 
        className="sr-only"
        checked={config.useIndividualGlowColors}
        onChange={() => onConfigChange({ useIndividualGlowColors: !config.useIndividualGlowColors })}
        id="individual-glow-toggle"
      />
      <label 
        htmlFor="individual-glow-toggle"
        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition ${
          config.useIndividualGlowColors ? 'bg-green-500' : 'bg-gray-500'
        }`}
      >
        <span 
          className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${
            config.useIndividualGlowColors ? 'translate-x-4' : ''
          }`}
        ></span>
      </label>
    </div>
  </div>
)}

{/* Category Glow Color Picker */}
{config.glowEffectEnabled && config.useIndividualGlowColors && (
  <div className="mt-3 border-t border-white/10 pt-2">
    <div className="text-xs font-medium mb-2">Category Glow Colors</div>
    <div className="max-h-32 overflow-y-auto pr-1">
      {Object.entries(config.categoryGlowColors).map(([category, color]) => (
        <div key={category} className="flex items-center justify-between mt-1 text-xs">
          <div className="truncate max-w-24">{category}</div>
          <div className="flex items-center gap-1">
            <div 
              className="w-4 h-4 rounded-full border border-white/30"
              style={{ backgroundColor: color }}
            ></div>
            <input
              type="color"
              value={color}
              onChange={(e) => {
                const newColors = {...config.categoryGlowColors, [category]: e.target.value};
                onConfigChange({ categoryGlowColors: newColors });
              }}
              className="w-5 h-5 rounded cursor-pointer"
            />
          </div>
        </div>
      ))}
    </div>
    
    {/* Randomize All Category Colors */}
    <button
      onClick={() => {
        const newColors = {...config.categoryGlowColors};
        Object.keys(newColors).forEach(category => {
          const hue = Math.floor(Math.random() * 360);
          newColors[category] = `hsl(${hue}, 100%, 50%)`;
        });
        onConfigChange({ categoryGlowColors: newColors });
      }}
      className="w-full mt-2 text-xs py-1 bg-gray-700 hover:bg-gray-600 rounded-sm flex items-center justify-center"
    >
      <RefreshCw className="w-3 h-3 mr-1" />
      Randomize All Colors
    </button>
  </div>
)}

{/* Only show glow controls if glow effect is enabled */}
{config.glowEffectEnabled && (
  <>
    {/* Dark Mode Toggle */}
    <div className="flex items-center justify-between mt-1.5">
      <label className="text-xs">Invert Colors (Dark):</label>
      <div className="relative inline-block w-8 h-4">
        <input 
          type="checkbox" 
          className="sr-only"
          checked={config.glowEffectDarkMode}
          onChange={() => onConfigChange({ glowEffectDarkMode: !config.glowEffectDarkMode })}
          id="glow-dark-mode-toggle"
        />
        <label 
          htmlFor="glow-dark-mode-toggle"
          className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition ${
            config.glowEffectDarkMode ? 'bg-purple-500' : 'bg-gray-500'
          }`}
        >
          <span 
            className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${
              config.glowEffectDarkMode ? 'translate-x-4' : ''
            }`}
          ></span>
        </label>
      </div>
    </div>
    
    {/* Glow Size Slider */}
    <div className="flex items-center justify-between mt-3 text-xs">
      <label>Glow Size: {config.glowEffectSize.toFixed(1)}px</label>
      <input
        type="range"
        min="1"
        max="20"
        step="0.5"
        value={config.glowEffectSize}
        onChange={(e) => onConfigChange({ glowEffectSize: parseFloat(e.target.value) })}
        className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
      />
    </div>
    
    {/* Glow Intensity Slider */}
    <div className="flex items-center justify-between mt-3 text-xs">
      <label>Glow Intensity: {config.glowEffectIntensity.toFixed(1)}</label>
      <input
        type="range"
        min="0.5"
        max="3.0"
        step="0.1"
        value={config.glowEffectIntensity}
        onChange={(e) => onConfigChange({ glowEffectIntensity: parseFloat(e.target.value) })}
        className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
      />
    </div>
    
    {/* Glow Color Picker with Preview */}
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <label className="text-xs">Glow Color:</label>
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-6 rounded-full border border-white/30"
            style={{ backgroundColor: config.glowEffectColor }}
          ></div>
          <input
            type="color"
            value={config.glowEffectColor}
            onChange={(e) => onConfigChange({ glowEffectColor: e.target.value })}
            className="w-6 h-6 rounded cursor-pointer"
          />
        </div>
      </div>
    </div>
    
    {/* Random Color Generator */}
    <div className="mt-3">
      <button
        onClick={() => {
          // Generate random color
          const randomColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
          onConfigChange({ glowEffectColor: randomColor });
        }}
        className="text-xs w-full py-1.5 bg-gray-700 hover:bg-gray-600 rounded-sm flex items-center justify-center"
      >
        <div className="flex items-center">
          <RefreshCw className="w-3 h-3 mr-1" />
          Random Color: {config.glowEffectColor.toUpperCase()}
        </div>
      </button>
    </div>
  </>
)}

                {/* Fade Transition Toggle */}
                <div className="flex items-center justify-between mt-2">
                  <label className="text-xs">Source-to-Target Fade:</label>
                  <div className="relative inline-block w-8 h-4">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={useFadeTransition}
                      onChange={() => handleToggleChange('useFadeTransition')}
                      id="fade-toggle"
                    />
                    <label 
                      htmlFor="fade-toggle"
                      className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition ${useFadeTransition ? 'bg-purple-500' : 'bg-gray-500'}`}
                    >
                      <span 
                        className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${useFadeTransition ? 'translate-x-4' : ''}`}
                      ></span>
                    </label>
                  </div>
                </div>
                
                {/* Transition Duration (only visible when fade is enabled) */}
                {useFadeTransition && (
                  <div className="flex items-center justify-between mt-1.5 text-xs">
                    <label>Duration: {transitionDuration}ms</label>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="100"
                      value={transitionDuration}
                      onChange={(e) => handleRangeChange('transitionDuration', parseFloat(e.target.value))}
                      className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
                
                <div className="text-xs mt-3 text-white/60">
                  Use the animation controls at the top of the visualization to play, pause, and navigate through connection animations.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChordDiagramControls;