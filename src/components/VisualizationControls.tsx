/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { RefObject, useState } from 'react';
import { ChevronDown, ChevronUp, Settings } from 'lucide-react';
import FileButtons from './FileButtons';
import ZoomControls from './ZoomControls';
import FullscreenButton from './FullscreenButton';
import { NodeData, LinkData } from '@/types/types';
import { VisualizationType } from '@/types/networkTypes';

interface VisualizationControlsProps {
  containerRef: RefObject<HTMLDivElement>;
  nodeData: NodeData[];
  linkData: LinkData[];
  visualizationType?: VisualizationType;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onDownloadData?: (format: string) => void;
  onDownloadGraph?: (format: string) => void;
  onResetSelection?: () => void;
  isZoomInitialized?: boolean;
  showFileButtons?: boolean;
  showZoomControls?: boolean;
  showFullscreenButton?: boolean;
  // Chord diagram specific props
  chordStrokeWidth?: number;
  chordOpacity?: number;
  chordStrokeOpacity?: number;
  arcOpacity?: number;
  // Direction-based styling props
  sourceChordOpacity?: number;
  targetChordOpacity?: number;
  sourceChordColor?: string;
  targetChordColor?: string;
  useDirectionalStyling?: boolean;
  // Variable width props
  chordWidthVariation?: number;
  chordWidthPosition?: 'start' | 'middle' | 'end' | 'custom';
  chordWidthCustomPosition?: number;
  // Stroke width variation props
  strokeWidthVariation?: number;
  strokeWidthPosition?: 'start' | 'middle' | 'end' | 'custom';
  strokeWidthCustomPosition?: number;
  // Geometric shapes props
  useGeometricShapes?: boolean;
  shapeType?: 'circle' | 'square' | 'diamond';
  shapeSize?: number;
  shapeSpacing?: number;
  shapeFill?: string;
  shapeStroke?: string;
  // Particle mode props
  particleMode?: boolean;
  particleDensity?: number;
  particleSizeBase?: number;
  particleSizeVariation?: number;
  particleBlur?: number;
  particleDistribution?: 'uniform' | 'random' | 'gaussian';
  particleColor?: string;
  particleOpacity?: number;
  // Enhanced animation props
  animationSpeed?: number;
  useFadeTransition?: boolean;
  transitionDuration?: number;
  // Original handlers
  onChordStrokeWidthChange?: (width: number) => void;
  onChordOpacityChange?: (opacity: number) => void;
  onChordStrokeOpacityChange?: (opacity: number) => void;
  onArcOpacityChange?: (opacity: number) => void;
  // Direction-based styling handlers
  onSourceChordOpacityChange?: (opacity: number) => void;
  onTargetChordOpacityChange?: (opacity: number) => void;
  onSourceChordColorChange?: (color: string) => void;
  onTargetChordColorChange?: (color: string) => void;
  onToggleDirectionalStyling?: (enabled: boolean) => void;
  // Variable width handlers
  onChordWidthVariationChange?: (variation: number) => void;
  onChordWidthPositionChange?: (position: 'start' | 'middle' | 'end' | 'custom') => void;
  onChordWidthCustomPositionChange?: (position: number) => void;
  // Stroke width variation handlers
  onStrokeWidthVariationChange?: (variation: number) => void;
  onStrokeWidthPositionChange?: (position: 'start' | 'middle' | 'end' | 'custom') => void;
  onStrokeWidthCustomPositionChange?: (position: number) => void;
  // Shape handlers
  onToggleGeometricShapes?: (enabled: boolean) => void;
  onShapeTypeChange?: (type: 'circle' | 'square' | 'diamond') => void;
  onShapeSizeChange?: (size: number) => void;
  onShapeSpacingChange?: (spacing: number) => void;
  onShapeFillChange?: (color: string) => void;
  onShapeStrokeChange?: (color: string) => void;
  // Particle handlers
  onToggleParticleMode?: (enabled: boolean) => void;
  onParticleDensityChange?: (density: number) => void;
  onParticleSizeChange?: (size: number) => void;
  onParticleSizeVariationChange?: (variation: number) => void;
  onParticleBlurChange?: (blur: number) => void;
  onParticleDistributionChange?: (distribution: 'uniform' | 'random' | 'gaussian') => void;
  onParticleColorChange?: (color: string) => void;
  onParticleOpacityChange?: (opacity: number) => void;
  // Enhanced animation handlers
  onAnimationSpeedChange?: (speed: number) => void;
  onToggleFadeTransition?: (enabled: boolean) => void;
  onTransitionDurationChange?: (duration: number) => void;
}

const VisualizationControls: React.FC<VisualizationControlsProps> = ({
  containerRef,
  nodeData, 
  linkData,
  visualizationType,
  onZoomIn = () => {},
  onZoomOut = () => {},
  onResetZoom = () => {},
  onDownloadData = () => {},
  onDownloadGraph = () => {},
  onResetSelection = () => {},
  isZoomInitialized = true,
  showFileButtons = true,
  showZoomControls = true,
  showFullscreenButton = true,
  // Chord diagram specific props with defaults
  chordStrokeWidth = 0.5,
  chordOpacity = 0.75,
  chordStrokeOpacity = 1.0,
  arcOpacity = 0.8,
  // Direction-based styling defaults
  sourceChordOpacity = 0.8,
  targetChordOpacity = 0.6,
  sourceChordColor = '#3498db',
  targetChordColor = '#e74c3c',
  useDirectionalStyling = false,
  // Variable width defaults
  chordWidthVariation = 1.0,
  chordWidthPosition = 'middle' as 'start' | 'middle' | 'end' | 'custom',
  chordWidthCustomPosition = 0.5,
  // Stroke width variation defaults
  strokeWidthVariation = 1.0,
  strokeWidthPosition = 'middle' as 'start' | 'middle' | 'end' | 'custom',
  strokeWidthCustomPosition = 0.5,
  // Geometric shapes defaults
  useGeometricShapes = false,
  shapeType = 'circle' as 'circle' | 'square' | 'diamond',
  shapeSize = 3,
  shapeSpacing = 10,
  shapeFill = '#ffffff',
  shapeStroke = '#000000',
  // Particle mode defaults
  particleMode = false,
  particleDensity = 100,
  particleSizeBase = 1.2,
  particleSizeVariation = 0.5,
  particleBlur = 0,
  particleDistribution = 'random' as 'uniform' | 'random' | 'gaussian',
  particleColor = '#ffffff',
  particleOpacity = 0.7,
  // Enhanced animation defaults
  animationSpeed = 1.0,
  useFadeTransition = false,
  transitionDuration = 500,
  // Original handlers
  onChordStrokeWidthChange = () => {},
  onChordOpacityChange = () => {},
  onChordStrokeOpacityChange = () => {},
  onArcOpacityChange = () => {},
  // Direction-based styling handlers
  onSourceChordOpacityChange = () => {},
  onTargetChordOpacityChange = () => {},
  onSourceChordColorChange = () => {},
  onTargetChordColorChange = () => {},
  onToggleDirectionalStyling = () => {},
  // Variable width handlers
  onChordWidthVariationChange = () => {},
  onChordWidthPositionChange = () => {},
  onChordWidthCustomPositionChange = () => {},
  // Stroke width variation handlers
  onStrokeWidthVariationChange = () => {},
  onStrokeWidthPositionChange = () => {},
  onStrokeWidthCustomPositionChange = () => {},
  // Geometric shapes handlers
  onToggleGeometricShapes = () => {},
  onShapeTypeChange = () => {},
  onShapeSizeChange = () => {},
  onShapeSpacingChange = () => {},
  onShapeFillChange = () => {},
  onShapeStrokeChange = () => {},
  // Particle mode handlers
  onToggleParticleMode = () => {},
  onParticleDensityChange = () => {},
  onParticleSizeChange = () => {},
  onParticleSizeVariationChange = () => {},
  onParticleBlurChange = () => {},
  onParticleDistributionChange = () => {},
  onParticleColorChange = () => {},
  onParticleOpacityChange = () => {},
  // Enhanced animation handlers
  onAnimationSpeedChange = () => {},
  onToggleFadeTransition = () => {},
  onTransitionDurationChange = () => {}
}) => {
  // State for collapsible controls
  const [controlsCollapsed, setControlsCollapsed] = useState(true);
  // State for showing chord controls
  const [showChordControls, setShowChordControls] = useState(false);

  // Create a completely transformed version of the links
  const safeLinks = linkData.map(link => {
    return {
      // Omit problematic properties
      source: '',  // We'll override this
      target: '',  // We'll override this
      // Add processed properties
      processedSource: processNodeReference(link.source),
      processedTarget: processNodeReference(link.target)
    };
  });

  // Helper function to safely process a node reference
  function processNodeReference(nodeRef: any): string {
    if (nodeRef === null || nodeRef === undefined) {
      return '';
    }
    
    if (typeof nodeRef === 'object') {
      return nodeRef.id ? String(nodeRef.id) : '';
    }
    
    return String(nodeRef);
  }

  // Toggle for the controls collapse state
  const toggleControls = () => {
    setControlsCollapsed(!controlsCollapsed);
  };

  // Toggle for chord controls visibility based on visualization type
  React.useEffect(() => {
    setShowChordControls(visualizationType === 'chord');
  }, [visualizationType]);

  return (
    <>
      {/* Compact and collapsible control panel */}
      <div className="absolute top-4 right-4 z-50 flex flex-col items-end">
        {/* Main controls - always visible */}
        <div className="flex items-center space-x-2 mb-2">
          {/* File Buttons - Always visible */}
          {showFileButtons && (
            <FileButtons 
              onDownloadData={onDownloadData}
              onDownloadGraph={onDownloadGraph}
              onResetSelection={onResetSelection}
              nodeData={nodeData}
              linkData={safeLinks.map(link => ({
                source: link.processedSource,
                target: link.processedTarget
              }))}
            />
          )}
          
          {/* Control toggle button */}
          <button
            onClick={toggleControls}
            className="bg-white/90 text-black hover:bg-white rounded-md shadow-md p-2 flex items-center justify-center"
            title={controlsCollapsed ? "Show more controls" : "Hide controls"}
          >
            <Settings className="h-4 w-4 mr-1" />
            <span className="text-xs">Controls</span>
            {controlsCollapsed ? 
              <ChevronDown className="h-3 w-3 ml-1" /> : 
              <ChevronUp className="h-3 w-3 ml-1" />
            }
          </button>
        </div>
        
        {/* Expandable controls section */}
        {!controlsCollapsed && (
          <div className="bg-white/90 rounded-md shadow-md p-3 text-black mb-2 w-60">
            <div className="text-xs font-medium mb-2">Visualization Controls</div>
            
            {/* Chord-specific controls - only visible for chord visualization */}
            {showChordControls && (
              <div className="space-y-2 mb-3 max-h-72 overflow-y-auto pr-2">
                <div className="border-t border-gray-200 pt-2 text-xs font-medium">Chord Diagram Settings</div>
                
                {/* Basic Styles Section */}
                <div className="mt-2">
                  <div className="text-xs font-medium mb-1 text-gray-500">Basic Styles</div>
                  
                  {/* Stroke Width Control */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <label>Stroke Width: {chordStrokeWidth.toFixed(1)}</label>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.1"
                      value={chordStrokeWidth}
                      onChange={(e) => onChordStrokeWidthChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  {/* Chord Opacity Control */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <label>Ribbon Opacity: {chordOpacity.toFixed(2)}</label>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={chordOpacity}
                      onChange={(e) => onChordOpacityChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  {/* Chord Stroke Opacity Control */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <label>Stroke Opacity: {chordStrokeOpacity.toFixed(2)}</label>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={chordStrokeOpacity}
                      onChange={(e) => onChordStrokeOpacityChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  {/* Arc Opacity Control */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <label>Arc Opacity: {arcOpacity.toFixed(2)}</label>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={arcOpacity}
                      onChange={(e) => onArcOpacityChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
                
                {/* Directional Styling Section */}
                <div className="mt-4 pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="text-xs font-medium mb-1 text-gray-500">Directional Styling</div>
                    <div className="relative inline-block w-8 h-4 mr-2">
                      <input 
                        type="checkbox" 
                        className="opacity-0 w-0 h-0"
                        checked={useDirectionalStyling}
                        onChange={(e) => onToggleDirectionalStyling(e.target.checked)}
                        id="direction-toggle"
                      />
                      <label 
                        htmlFor="direction-toggle"
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition ${useDirectionalStyling ? 'bg-blue-500' : 'bg-gray-300'}`}
                      >
                        <span 
                          className={`absolute left-0.5 bottom-0.5 bg-white w-3 h-3 rounded-full transition-transform ${useDirectionalStyling ? 'transform translate-x-4' : ''}`}
                        ></span>
                      </label>
                    </div>
                  </div>
                  
                  {useDirectionalStyling && (
                    <div className="space-y-2 mt-1 pl-1">
                      {/* Source Chord Color & Opacity */}
                      <div className="flex items-center mb-1">
                        <label className="text-xs w-24">Source Color:</label>
                        <input
                          type="color"
                          value={sourceChordColor}
                          onChange={(e) => onSourceChordColorChange(e.target.value)}
                          className="w-6 h-6 rounded"
                        />
                        <div className="flex-1 ml-2">
                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={sourceChordOpacity}
                            onChange={(e) => onSourceChordOpacityChange(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Opacity: {sourceChordOpacity.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Target Chord Color & Opacity */}
                      <div className="flex items-center mb-1">
                        <label className="text-xs w-24">Target Color:</label>
                        <input
                          type="color"
                          value={targetChordColor}
                          onChange={(e) => onTargetChordColorChange(e.target.value)}
                          className="w-6 h-6 rounded"
                        />
                        <div className="flex-1 ml-2">
                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={targetChordOpacity}
                            onChange={(e) => onTargetChordOpacityChange(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Opacity: {targetChordOpacity.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Variable Width Section */}
                <div className="mt-4 pt-2 border-t border-gray-200">
                  <div className="text-xs font-medium mb-1 text-gray-500">Variable Width</div>
                  
                  {/* Width Variation Control */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <label>Width Variation: {chordWidthVariation.toFixed(1)}x</label>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={chordWidthVariation}
                      onChange={(e) => onChordWidthVariationChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  {/* Width Position Control */}
                  <div className="mt-2">
                    <div className="text-xs mb-1">Width Position:</div>
                    <div className="grid grid-cols-4 gap-1">
                      {['start', 'middle', 'end', 'custom'].map((pos) => (
                        <button
                          key={pos}
                          className={`text-xs py-1 px-2 rounded ${chordWidthPosition === pos ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                          onClick={() => onChordWidthPositionChange(pos as 'start' | 'middle' | 'end' | 'custom')}
                        >
                          {pos.charAt(0).toUpperCase() + pos.slice(1)}
                        </button>
                      ))}
                    </div>
                    
                    {/* Custom Position Slider (only visible when 'custom' is selected) */}
                    {chordWidthPosition === 'custom' && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs">
                          <label>Position: {(chordWidthCustomPosition * 100).toFixed(0)}%</label>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={chordWidthCustomPosition}
                          onChange={(e) => onChordWidthCustomPositionChange(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Stroke Variation Section */}
                <div className="mt-4 pt-2 border-t border-gray-200">
                  <div className="text-xs font-medium mb-1 text-gray-500">Stroke Variation</div>
                  
                  {/* Stroke Width Variation Control */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <label>Stroke Variation: {strokeWidthVariation.toFixed(1)}x</label>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={strokeWidthVariation}
                      onChange={(e) => onStrokeWidthVariationChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  {/* Stroke Width Position Control */}
                  <div className="mt-2">
                    <div className="text-xs mb-1">Stroke Position:</div>
                    <div className="grid grid-cols-4 gap-1">
                      {['start', 'middle', 'end', 'custom'].map((pos) => (
                        <button
                          key={pos}
                          className={`text-xs py-1 px-2 rounded ${strokeWidthPosition === pos ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                          onClick={() => onStrokeWidthPositionChange(pos as 'start' | 'middle' | 'end' | 'custom')}
                        >
                          {pos.charAt(0).toUpperCase() + pos.slice(1)}
                        </button>
                      ))}
                    </div>
                    
                    {/* Custom Position Slider (only visible when 'custom' is selected) */}
                    {strokeWidthPosition === 'custom' && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs">
                          <label>Position: {(strokeWidthCustomPosition * 100).toFixed(0)}%</label>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={strokeWidthCustomPosition}
                          onChange={(e) => onStrokeWidthCustomPositionChange(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Geometric Shapes Section */}
                <div className="mt-4 pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="text-xs font-medium mb-1 text-gray-500">Geometric Shapes</div>
                    <div className="relative inline-block w-8 h-4 mr-2">
                      <input 
                        type="checkbox" 
                        className="opacity-0 w-0 h-0"
                        checked={useGeometricShapes}
                        onChange={(e) => onToggleGeometricShapes(e.target.checked)}
                        id="shapes-toggle"
                      />
                      <label 
                        htmlFor="shapes-toggle"
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition ${useGeometricShapes ? 'bg-blue-500' : 'bg-gray-300'}`}
                      >
                        <span 
                          className={`absolute left-0.5 bottom-0.5 bg-white w-3 h-3 rounded-full transition-transform ${useGeometricShapes ? 'transform translate-x-4' : ''}`}
                        ></span>
                      </label>
                    </div>
                  </div>
                  
                  {useGeometricShapes && (
                    <div className="space-y-2 mt-1 pl-1">
                      {/* Shape Type Selection */}
                      <div className="mt-1">
                        <div className="text-xs mb-1">Shape Type:</div>
                        <div className="grid grid-cols-3 gap-1">
                          {['circle', 'square', 'diamond'].map((type) => (
                            <button
                              key={type}
                              className={`text-xs py-1 px-2 rounded ${shapeType === type ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                              onClick={() => onShapeTypeChange(type as 'circle' | 'square' | 'diamond')}
                            >
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Shape Size Control */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <label>Size: {shapeSize.toFixed(1)}</label>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="0.5"
                          value={shapeSize}
                          onChange={(e) => onShapeSizeChange(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      {/* Shape Spacing Control */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <label>Spacing: {shapeSpacing.toFixed(0)}</label>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="50"
                          step="1"
                          value={shapeSpacing}
                          onChange={(e) => onShapeSpacingChange(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      {/* Shape Colors */}
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center">
                          <label className="text-xs mr-1">Fill:</label>
                          <input
                            type="color"
                            value={shapeFill}
                            onChange={(e) => onShapeFillChange(e.target.value)}
                            className="w-6 h-6 rounded"
                          />
                        </div>
                        <div className="flex items-center">
                          <label className="text-xs mr-1">Stroke:</label>
                          <input
                            type="color"
                            value={shapeStroke}
                            onChange={(e) => onShapeStrokeChange(e.target.value)}
                            className="w-6 h-6 rounded"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Particle Mode Section */}
                <div className="mt-4 pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="text-xs font-medium mb-1 text-gray-500">Particle Mode</div>
                    <div className="relative inline-block w-8 h-4 mr-2">
                      <input 
                        type="checkbox" 
                        className="opacity-0 w-0 h-0"
                        checked={particleMode}
                        onChange={(e) => onToggleParticleMode(e.target.checked)}
                        id="particle-toggle"
                      />
                      <label 
                        htmlFor="particle-toggle"
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition ${particleMode ? 'bg-blue-500' : 'bg-gray-300'}`}
                      >
                        <span 
                          className={`absolute left-0.5 bottom-0.5 bg-white w-3 h-3 rounded-full transition-transform ${particleMode ? 'transform translate-x-4' : ''}`}
                        ></span>
                      </label>
                    </div>
                  </div>
                  
                  {particleMode && (
                    <div className="space-y-2 mt-1 pl-1">
                      {/* Particle Density Control */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <label>Density: {particleDensity}</label>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="500"
                          step="10"
                          value={particleDensity}
                          onChange={(e) => onParticleDensityChange(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      {/* Particle Size Control */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <label>Size: {particleSizeBase.toFixed(1)}</label>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="5.0"
                          step="0.1"
                          value={particleSizeBase}
                          onChange={(e) => onParticleSizeChange(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      {/* Particle Size Variation Control */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <label>Size Variation: {particleSizeVariation.toFixed(1)}</label>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1.0"
                          step="0.1"
                          value={particleSizeVariation}
                          onChange={(e) => onParticleSizeVariationChange(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      {/* Particle Blur Control */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <label>Blur: {particleBlur.toFixed(1)}px</label>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="3.0"
                          step="0.1"
                          value={particleBlur}
                          onChange={(e) => onParticleBlurChange(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      
                      {/* Distribution Type Selection */}
                      <div className="mt-1">
                        <div className="text-xs mb-1">Distribution:</div>
                        <div className="grid grid-cols-3 gap-1">
                          {['uniform', 'random', 'gaussian'].map((type) => (
                            <button
                              key={type}
                              className={`text-xs py-1 px-2 rounded ${particleDistribution === type ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                              onClick={() => onParticleDistributionChange(type as 'uniform' | 'random' | 'gaussian')}
                            >
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Particle Colors */}
                      <div className="flex items-center space-x-3 mt-2">
                        <div className="flex items-center">
                          <label className="text-xs mr-1">Color:</label>
                          <input
                            type="color"
                            value={particleColor}
                            onChange={(e) => onParticleColorChange(e.target.value)}
                            className="w-6 h-6 rounded"
                          />
                        </div>
                        <div className="flex items-center flex-1">
                          <label className="text-xs mr-1">Opacity:</label>
                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={particleOpacity}
                            onChange={(e) => onParticleOpacityChange(parseFloat(e.target.value))}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-xs ml-1">{particleOpacity.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Animation Settings Section */}
                <div className="mt-4 pt-2 border-t border-gray-200">
                  <div className="text-xs font-medium mb-1 text-gray-500">Animation Settings</div>
                  
                  {/* Animation Speed Control */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <label>Speed: {animationSpeed.toFixed(1)}x</label>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="10.0"
                      step="0.5"
                      value={animationSpeed}
                      onChange={(e) => onAnimationSpeedChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  {/* Fade Transition Toggle */}
                  <div className="flex items-center justify-between mt-2">
                    <label className="text-xs">Source-to-Target Fade:</label>
                    <div className="relative inline-block w-8 h-4">
                      <input 
                        type="checkbox" 
                        className="opacity-0 w-0 h-0"
                        checked={useFadeTransition}
                        onChange={(e) => onToggleFadeTransition(e.target.checked)}
                        id="fade-toggle"
                      />
                      <label 
                        htmlFor="fade-toggle"
                        className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full transition ${useFadeTransition ? 'bg-blue-500' : 'bg-gray-300'}`}
                      >
                        <span 
                          className={`absolute left-0.5 bottom-0.5 bg-white w-3 h-3 rounded-full transition-transform ${useFadeTransition ? 'transform translate-x-4' : ''}`}
                        ></span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Transition Duration (only visible when fade is enabled) */}
                  {useFadeTransition && (
                    <div className="space-y-1 mt-2">
                      <div className="flex justify-between text-xs">
                        <label>Duration: {transitionDuration}ms</label>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="2000"
                        step="100"
                        value={transitionDuration}
                        onChange={(e) => onTransitionDurationChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Fullscreen button in the expanded panel */}
            {showFullscreenButton && (
              <button
                onClick={() => containerRef.current?.requestFullscreen()}
                className="w-full text-center bg-gray-200 hover:bg-gray-300 rounded-md py-1.5 px-3 text-sm flex items-center justify-center"
              >
                <span>Enter Fullscreen</span>
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Fullscreen Button - standalone outside the collapsible panel */}
      {showFullscreenButton && !controlsCollapsed && (
        <div className="absolute top-4 left-4 z-50">
          <FullscreenButton containerRef={containerRef} />
        </div>
      )}
      
      {/* Zoom Controls - always at the bottom */}
      {showZoomControls && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <ZoomControls
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onReset={onResetZoom}
            isZoomInitialized={isZoomInitialized}
          />
        </div>
      )}
    </>
  );
};

export default VisualizationControls;