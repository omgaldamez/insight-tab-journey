/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { ChordDiagramConfig } from '@/hooks/useChordDiagram';
import { Eye, EyeOff, ChevronDown, ChevronUp, LayoutDashboard, Circle, Waves, Play, Cpu, Zap, Square, RefreshCw, ZapOff, BarChart } from 'lucide-react';
import ParticleControlsWithApply from './ParticleControlsWithApply';
import WebGLParticleControls from './WebGLParticleControls';

interface ChordDiagramControlsProps {
  config: ChordDiagramConfig;
  onConfigChange: (updates: Partial<ChordDiagramConfig>) => void;
  onToggleControlPanel: () => void;
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
type ControlTab = 'display' | 'ribbons' | 'particles' | 'animation' | '3d';

const ChordDiagramControls: React.FC<ChordDiagramControlsProps> = ({
  config,
  onConfigChange,
  onToggleControlPanel,
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
    useDirectionalStyling,
    sourceChordOpacity,
    targetChordOpacity,
    sourceChordColor,
    targetChordColor,
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
    useWebGLRenderer
  } = config;

  // State for active tab
  const [activeTab, setActiveTab] = useState<ControlTab>('display');
  // State for showing WebGL controls
  const [showWebGLControls, setShowWebGLControls] = useState(false);

  // Create a handler for toggle type inputs
  const handleToggleChange = (field: keyof ChordDiagramConfig) => {
    onConfigChange({ [field]: !config[field] });
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

  return (
    <div className="absolute bottom-4 left-4 z-10 max-w-xs">
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
          {/* Tabs navigation */}
          <div className="flex border-b border-white/10">
            <button 
              className={`flex-1 py-2 px-1 text-xs font-medium flex items-center justify-center ${activeTab === 'display' ? 'bg-blue-500/20 text-blue-300' : 'hover:bg-white/10'}`}
              onClick={() => setActiveTab('display')}
            >
              <LayoutDashboard className="w-3 h-3 mr-1" />
              Display
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
              className={`flex-1 py-2 px-1 text-xs font-medium flex items-center justify-center ${activeTab === '3d' ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-white/10'}`}
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
          <div className="overflow-y-auto max-h-[16rem] px-3 py-2">
            {/* Display Tab */}
            {activeTab === 'display' && (
              <div className="space-y-3">
                <div className="text-xs mb-2 text-white/80">
                  Hover over arcs and chords for details. The chord width represents connection strength.
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
                  
                  {/* Distribution Control */}
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
                </div>
                
                {/* Opacity & Width Controls */}
                <div className="border-t border-white/10 mt-2 pt-2">
                  <h3 className="text-xs font-semibold mb-1.5 text-white/80">Opacity & Width</h3>
                  
                  {/* Arc Opacity Control */}
                  <div className="flex items-center justify-between mt-1.5 text-xs">
                    <label>Arc: {arcOpacity.toFixed(2)}</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={arcOpacity}
                      onChange={(e) => handleRangeChange('arcOpacity', parseFloat(e.target.value))}
                      className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Ribbons Tab */}
            {activeTab === 'ribbons' && (
              <div className="space-y-3">
                {/* Ribbon Style Controls */}
                <div className="mb-2">
                  <h3 className="text-xs font-semibold mb-1.5 text-white/80">Ribbon Styling</h3>
                  
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
                  
                  {/* Directional Styling Control */}
                  <div className="flex items-center mt-1.5">
                    <label className="flex items-center cursor-pointer">
                      <div className="relative mr-2">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={useDirectionalStyling}
                          onChange={() => handleToggleChange('useDirectionalStyling')}
                        />
                        <div className={`w-8 h-4 rounded-full transition-colors ${useDirectionalStyling ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
                        <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${useDirectionalStyling ? 'translate-x-4' : ''}`}></div>
                      </div>
                      <span className="text-xs">Direction Styling</span>
                    </label>
                  </div>
                </div>
                
                {/* Fill Opacity Control - only enabled when filled ribbons is on */}
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <label className={ribbonFillEnabled ? '' : 'text-gray-500'}>Fill: {chordOpacity.toFixed(2)}</label>
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
                
                {/* Stroke Opacity Control */}
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <label>Stroke: {chordStrokeOpacity.toFixed(2)}</label>
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
                
                {/* Stroke Width Control */}
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <label>Width: {chordStrokeWidth.toFixed(1)}</label>
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
                
                {/* Directional Styling Controls (when enabled) */}
                {useDirectionalStyling && (
                  <div className="border-t border-white/10 mt-2 pt-2">
                    <h3 className="text-xs font-semibold mb-1.5 text-white/80">Direction Colors</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-xs">
                        <label>Source:</label>
                        <input
                          type="color"
                          value={sourceChordColor}
                          onChange={(e) => handleColorChange('sourceChordColor', e.target.value)}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={sourceChordOpacity}
                          onChange={(e) => handleRangeChange('sourceChordOpacity', parseFloat(e.target.value))}
                          className="w-16 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer ml-1"
                        />
                        <span className="text-xs ml-1">{sourceChordOpacity.toFixed(1)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs">
                        <label>Target:</label>
                        <input
                          type="color"
                          value={targetChordColor}
                          onChange={(e) => handleColorChange('targetChordColor', e.target.value)}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={targetChordOpacity}
                          onChange={(e) => handleRangeChange('targetChordOpacity', parseFloat(e.target.value))}
                          className="w-16 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer ml-1"
                        />
                        <span className="text-xs ml-1">{targetChordOpacity.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Width Variation Controls */}
                <div className="border-t border-white/10 mt-2 pt-2">
                  <h3 className="text-xs font-semibold mb-1.5 text-white/80">Width Variation</h3>
                  
                  {/* Width Variation Control */}
                  <div className="flex items-center justify-between text-xs mt-1.5">
                    <label>Variation: {chordWidthVariation.toFixed(1)}x</label>
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={chordWidthVariation}
                      onChange={(e) => handleRangeChange('chordWidthVariation', parseFloat(e.target.value))}
                      className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  {/* Width Position Control */}
                  <div className="mt-2">
                    <div className="text-xs mb-1">Position:</div>
                    <div className="grid grid-cols-4 gap-1">
                      {['start', 'middle', 'end', 'custom'].map((pos) => (
                        <button
                          key={pos}
                          className={`text-xs py-1 rounded-sm ${chordWidthPosition === pos ? 'bg-blue-500 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}
                          onClick={() => handleSelectChange('chordWidthPosition', pos as any)}
                        >
                          {pos.charAt(0).toUpperCase() + pos.slice(1)}
                        </button>
                      ))}
                    </div>
                    
                    {/* Custom Position Slider (only visible when 'custom' is selected) */}
                    {chordWidthPosition === 'custom' && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs">
                          <label>Custom: {(chordWidthCustomPosition * 100).toFixed(0)}%</label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={chordWidthCustomPosition}
                            onChange={(e) => handleRangeChange('chordWidthCustomPosition', parseFloat(e.target.value))}
                            className="w-28 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
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
                
                {/* Toggle controls area - for enabling/disabling modes */}
                <div className="flex items-center justify-between mt-2">
                  {/* Particle Mode Button */}
                  <button
                    onClick={() => {
                      if (config.particleMode && particlesInitialized) {
                        if (window.confirm("Disabling particle mode will remove all particles. Continue?")) {
                          onConfigChange({ particleMode: false });
                        }
                      } else {
                        // Just toggle the mode - generation happens separately
                        onConfigChange({ particleMode: !config.particleMode });
                      }
                    }}
                    className={`flex-1 mr-1 py-1.5 text-xs font-medium rounded flex items-center justify-center ${
                      config.particleMode ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                  >
                    <Circle className="w-3 h-3 mr-1" />
                    {config.particleMode ? "Particles: ON" : "Particles: OFF"}
                  </button>
                  
                  {/* Shapes Mode Button */}
                  <button
                    onClick={() => {
                      if (!config.useGeometricShapes && config.particleMode) {
                        if (window.confirm("Enabling geometric shapes will disable particle mode. Continue?")) {
                          onConfigChange({ 
                            useGeometricShapes: true,
                            particleMode: false 
                          });
                        }
                      } else {
                        onConfigChange({ useGeometricShapes: !config.useGeometricShapes });
                      }
                    }}
                    className={`flex-1 ml-1 py-1.5 text-xs font-medium rounded flex items-center justify-center ${
                      config.useGeometricShapes ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                  >
                    <Square className="w-3 h-3 mr-1" />
                    {config.useGeometricShapes ? "Shapes: ON" : "Shapes: OFF"}
                  </button>
                </div>

                {/* Use ParticleControlsWithApply when particle mode is enabled */}
                {config.particleMode && (
                  <ParticleControlsWithApply 
                    config={config}
                    onConfigChange={onConfigChange}
                    particlesInitialized={particlesInitialized}
                    onInitializeParticles={onInitializeParticles}
                  />
                )}
                
                {/* Geometric Shapes Controls - only shown when shapes are enabled */}
                {config.useGeometricShapes && (
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
                
                {/* Particle generation controls - only visible when particle mode is ON and not inside ParticleControlsWithApply */}
                {config.particleMode && (
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
                        
{/* High performance mode toggle */}
<div className="flex justify-between items-center text-xs mt-2">
  <span className="flex items-center">
    <Zap className="w-3 h-3 mr-1 text-yellow-400" />
    High Performance Mode:
  </span>
  <div className="relative inline-block w-8 h-4">
    <input 
      type="checkbox" 
      className="sr-only"
      checked={config.highPerformanceMode}
      onChange={() => onConfigChange({ highPerformanceMode: !config.highPerformanceMode })}
      id="high-perf-toggle"
    />
    <label 
      htmlFor="high-perf-toggle"
      className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition ${config.highPerformanceMode ? 'bg-yellow-500' : 'bg-gray-500'}`}
    >
      <span 
        className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${config.highPerformanceMode ? 'transform translate-x-4' : ''}`}
      ></span>
    </label>
  </div>
</div>
{config.highPerformanceMode && (
  <div className="text-xs text-yellow-300/70 mt-1 italic">
    Reduces visual quality for better performance
  </div>
)}

                        {/* Progressive generation toggle */}
                        <div className="flex justify-between items-center text-xs mb-2">
                          <span>Progressive Generation:</span>
                          <div className="relative inline-block w-8 h-4">
                            <input 
                              type="checkbox" 
                              className="sr-only"
                              checked={progressiveGenerationEnabled}
                              onChange={(e) => onProgressiveGeneration(e.target.checked)}
                              id="progressive-toggle"
                            />
                            <label 
                              htmlFor="progressive-toggle"
                              className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition ${progressiveGenerationEnabled ? 'bg-purple-500' : 'bg-gray-500'}`}
                            >
                              <span 
                                className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${progressiveGenerationEnabled ? 'transform translate-x-4' : ''}`}
                              ></span>
                            </label>
                          </div>
                        </div>

{/* High performance mode toggle */}
<div className="flex justify-between items-center text-xs mt-2">
  <span className="flex items-center">
    <Zap className="w-3 h-3 mr-1 text-yellow-400" />
    High Performance Mode:
  </span>
  <div className="relative inline-block w-8 h-4">
    <input 
      type="checkbox" 
      className="sr-only"
      checked={config.highPerformanceMode}
      onChange={() => onConfigChange({ highPerformanceMode: !config.highPerformanceMode })}
      id="high-perf-toggle"
    />
    <label 
      htmlFor="high-perf-toggle"
      className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition ${config.highPerformanceMode ? 'bg-yellow-500' : 'bg-gray-500'}`}
    >
      <span 
        className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${config.highPerformanceMode ? 'transform translate-x-4' : ''}`}
      ></span>
    </label>
  </div>
</div>
{config.highPerformanceMode && (
  <div className="text-xs text-yellow-300/70 mt-1 italic">
    Reduces visual quality for better performance
  </div>
)}

                      </div>
                    )}
                  </div>
                )}
                
                {/* WebGL toggle button */}
                <button
                  onClick={() => setShowWebGLControls(!showWebGLControls)}
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
              </div>
            )}

            {/* 3D/WebGL Tab */}
            {activeTab === '3d' && (
              <div className="space-y-3">
                <div className="mb-2 text-xs text-white/80">
                  WebGL rendering dramatically improves performance for particle effects, especially with large datasets.
                </div>
                
                {/* WebGL Controls */}
                <WebGLParticleControls 
                  config={config}
                  onConfigChange={onConfigChange}
                />
                
                {/* Additional WebGL note - especially if particles enabled but WebGL disabled */}
                {particleMode && !useWebGLRenderer && (
                  <div className="mt-3 text-xs p-2 bg-blue-500/20 text-blue-300 rounded">
                    <strong>Performance Tip:</strong> Enable WebGL rendering for much better performance with particle effects.
                  </div>
                )}
                
                {/* WebGL with Detailed View note */}
                {showDetailedView && useWebGLRenderer && particleMode && (
                  <div className="mt-3 text-xs p-2 bg-green-500/20 text-green-300 rounded">
                    <strong>Performance Benefit:</strong> WebGL is especially helpful in detailed view with many nodes and particles.
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
                        className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${useFadeTransition ? 'transform translate-x-4' : ''}`}
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