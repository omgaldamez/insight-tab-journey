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
  chordStrokeOpacity?: number; // Added stroke opacity prop
  arcOpacity?: number; 
  onChordStrokeWidthChange?: (width: number) => void;
  onChordOpacityChange?: (opacity: number) => void;
  onChordStrokeOpacityChange?: (opacity: number) => void; // Added stroke opacity handler
  onArcOpacityChange?: (opacity: number) => void;
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
  chordStrokeOpacity = 1.0, // Default value for stroke opacity
  arcOpacity = 0.8,
  onChordStrokeWidthChange = () => {},
  onChordOpacityChange = () => {},
  onChordStrokeOpacityChange = () => {}, // Default empty handler
  onArcOpacityChange = () => {}
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
              <div className="space-y-2 mb-3">
                <div className="border-t border-gray-200 pt-2 text-xs font-medium">Chord Diagram Settings</div>
                
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
                
                {/* Chord Stroke Opacity Control - New */}
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