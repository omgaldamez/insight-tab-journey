import React, { useRef, useState, useEffect } from 'react';
import { Node, Link, VisualizationType } from '@/types/networkTypes';
import { useToast } from '@/components/ui/use-toast';
import BaseVisualization from './BaseVisualization';
import { NetworkLegend } from './NetworkComponents';
import useNetworkColors from '@/hooks/useNetworkColors';
import { TooltipDetail, TooltipTrigger } from './TooltipSettings';
import NetworkTooltip from './NetworkTooltip';
import VisualizationControls from './VisualizationControls';
import useFullscreenStyles from '@/hooks/useFullscreenStyles';
import ChordAnimationControls from './ChordAnimationControls';
import ConnectionInfoBox from './ConnectionInfoBox';
import ChordDiagramControls from './ChordDiagramControls';
import { downloadChordDiagram } from '@/utils/chordUtils';
import useChordDiagram from '@/hooks/useChordDiagram';
import ParticleMetricsPanel from './ParticleMetricsPanel';
import { useConfigPresets } from '@/hooks/useConfigPresets';
import '@/styles/visualization.css';
import { Maximize, Download } from 'lucide-react';

interface ChordVisualizationProps {
  onCreditsClick: () => void;
  nodeData: Node[];
  linkData: Link[];
  visualizationType?: VisualizationType;
  onVisualizationTypeChange?: (type: VisualizationType) => void;
  fixNodesOnDrag?: boolean;
  colorTheme?: string;
  nodeSize?: number;
  linkColor?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  customNodeColors?: Record<string, string>;
  dynamicColorThemes?: Record<string, Record<string, string>>;
  tooltipDetail?: TooltipDetail;
  tooltipTrigger?: TooltipTrigger;
  onTooltipDetailChange?: (detail: TooltipDetail) => void;
  onTooltipTriggerChange?: (trigger: TooltipTrigger) => void;
}

const ChordVisualization: React.FC<ChordVisualizationProps> = ({
  onCreditsClick,
  nodeData,
  linkData,
  visualizationType = 'chord',
  onVisualizationTypeChange,
  colorTheme = 'default',
  nodeSize = 1.0,
  linkColor = '#999999',
  backgroundColor = '#f5f5f5',
  backgroundOpacity = 1.0,
  customNodeColors = {},
  dynamicColorThemes = {},
  tooltipDetail = 'simple',
  tooltipTrigger = 'hover',
  onTooltipDetailChange,
  onTooltipTriggerChange
}) => {
  const { toast } = useToast();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<SVGGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [controlsPanelVisible, setControlsPanelVisible] = useState(true);
  const [showParticleMetrics, setShowParticleMetrics] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Use fullscreen styles and hooks with the enhanced triggerSvgResize function
  const { isFullscreen, toggleFullscreen, triggerSvgResize } = useFullscreenStyles();

  // Use the network colors hook for color management
  const colors = useNetworkColors({
    initialColorTheme: colorTheme,
    initialNodeSize: nodeSize,
    initialLinkColor: linkColor,
    initialBackgroundColor: backgroundColor,
    initialTextColor: "#ffffff",
    initialNodeStrokeColor: "#000000",
    initialBackgroundOpacity: backgroundOpacity,
    initialCustomNodeColors: customNodeColors,
    initialDynamicColorThemes: dynamicColorThemes
  });

  const [localExpandedSections, setLocalExpandedSections] = useState({
    networkControls: true,
    nodeControls: true,
    colorControls: false,
    networkInfo: false,
    visualizationType: true,
    tooltipSettings: true,
    configPresets: true
  });

  // Use the chord diagram hook for diagram state and rendering
  const chord = useChordDiagram({
    nodeData,
    linkData,
    svgRef,
    containerRef,
    contentRef,
    tooltipRef,
    getNodeColor: colors.getNodeColor,
    textColor: colors.textColor,
    customNodeColors: colors.customNodeColors,
    colorTheme: colors.colorTheme,
    dynamicColorThemes: colors.dynamicColorThemes
  });

  // Animation controls props
  const animationControlsProps = {
    isPlaying: chord.chordConfig.isAnimating,
    currentIndex: chord.currentAnimatedIndex,
    totalCount: chord.totalRibbonCount,
    speed: chord.chordConfig.animationSpeed,
    onTogglePlay: chord.toggleAnimation,
    onPrevious: chord.goToPreviousRibbon,
    onNext: chord.goToNextRibbon,
    onReset: chord.resetAnimation,
    onSpeedChange: chord.changeAnimationSpeed,
    onJumpToFrame: chord.jumpToFrame
  };

  // Toggle sidebar state handler
  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  const handleLayerToggle = (layerName: string, value: boolean) => {
    console.log(`[LAYER-TOGGLE] Setting ${layerName} to ${value}`);
    
    // Handle specific layer toggles with special behavior
    if (layerName === 'showParticlesLayer') {
      // First update config
      chord.updateConfig({ 
        showParticlesLayer: value,
        particleMode: value // Keep particle mode in sync with layer visibility
      });
      
      // If enabling particles and they haven't been initialized, do so with safer approach
      if (value && !chord.particlesInitialized && !chord.isGeneratingParticles) {
        try {
          // Use a longer delay to ensure the config update is fully applied
          setTimeout(() => {
            console.log('[PARTICLE-INIT] Delayed initialization starting...');
            chord.initializeParticles();
          }, 300);
        } catch (err) {
          console.error('[PARTICLE-INIT] Error initializing particles:', err);
        }
      }
    } 
    else if (layerName === 'showGeometricShapesLayer') {
      chord.updateConfig({ 
        showGeometricShapesLayer: value,
        useGeometricShapes: value // Keep geometric shapes in sync with layer visibility
      });
    } 
    else if (layerName === 'showChordRibbons') {
      // For ribbons, just update the visibility without changing other settings
      chord.updateConfig({ showChordRibbons: value });
    }
    // Simple toggle for other layer settings
    else {
      chord.updateConfig({ [layerName]: value });
    }
    
    // Always redraw after layer changes
    chord.setNeedsRedraw(true);
  };

// Custom download function for Chord visualization
const handleDownloadGraph = (format: string) => {
  if (!svgRef.current || !containerRef.current) {
    toast({
      title: "Export Error",
      description: "Cannot download visualization - SVG not ready",
      variant: "destructive"
    });
    return;
  }
  
  // Parse the format to determine CSS inclusion
  const parts = format.split(':');
  const formatType = parts[0];
  const exportMode = parts[1] || 'current';
  
  // Default to with CSS effects unless specifically requested without
  const withCssEffects = !parts.includes('nocss');
  
  // For SVG format with 'nocss' specified, we want to exclude CSS effects
  const formatToUse = formatType === 'svg' && !withCssEffects 
    ? 'svg:current' // Force 'current' mode for consistent behavior
    : format;
  
  // Display the appropriate message
  const includesCss = withCssEffects ? "with" : "without";
  const toastTitle = formatType === 'all' 
    ? `Downloading All Formats` 
    : `Downloading ${formatType.toUpperCase()}`;
  const toastDescription = formatType === 'all'
    ? `Preparing all formats ${includesCss} CSS effects` 
    : `Preparing download ${includesCss} CSS effects`;
  
  toast({
    title: toastTitle,
    description: toastDescription
  });
  
  downloadChordDiagram(
    formatToUse,
    svgRef.current,
    containerRef.current,
    colors.backgroundColor,
    colors.backgroundOpacity,
    colors.textColor,
    chord.chordConfig.chordStrokeWidth,
    chord.chordConfig.chordOpacity,
    (message) => toast({
      title: "Export Error",
      description: message,
      variant: "destructive"
    }),
    (message) => toast({
      title: "Download Started",
      description: message
    }),
    withCssEffects // Pass the CSS effects flag
  );
};
  
  // Handle fullscreen toggle with additional SVG resize/redraw
  const handleFullscreenToggle = () => {
    if (containerRef.current) {
      toggleFullscreen(containerRef.current);
      
      // After toggling fullscreen, schedule a redraw with a slight delay
      // to ensure the chord diagram properly centers and adapts to the new size
      setTimeout(() => {
        chord.setNeedsRedraw(true);
        
        // Force a transform update on the SVG content
        if (svgRef.current && contentRef.current) {
          triggerSvgResize(svgRef);
          
          // Ensure proper centering in case the container dimensions changed
          const containerWidth = containerRef.current?.clientWidth || 800;
          const containerHeight = containerRef.current?.clientHeight || 600;
          
          // Force a reset to default view to ensure proper centering
          setTimeout(() => {
            chord.handleZoomReset();
          }, 150);
        }
      }, 100);
    }
  };

  // Listen for fullscreen changes and adjust SVG accordingly
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current && containerRef.current) {
        // Trigger a redraw when window size changes (including fullscreen)
        chord.setNeedsRedraw(true);
        
        // Give time for the browser to calculate new dimensions
        setTimeout(() => {
          // Reset zoom to fit content properly in the new container size
          chord.handleZoomReset();
        }, 150);
      }
    };
    
    // Listen for resize events
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [chord]);

  // Sidebar state and handlers
  const sidebarState = {
    linkDistance: 75,
    linkStrength: 1.0,
    nodeCharge: -300,
    localNodeSize: colors.nodeSize,
    nodeGroup: 'all',
    localColorTheme: colors.colorTheme,
    activeColorTab: colors.activeColorTab,
    localBackgroundColor: colors.backgroundColor,
    textColor: colors.textColor,
    localLinkColor: colors.linkColor,
    nodeStrokeColor: colors.nodeStrokeColor,
    localBackgroundOpacity: colors.backgroundOpacity,
    isSidebarCollapsed: isSidebarCollapsed,
    networkTitle: "Chord Diagram",
    localFixNodesOnDrag: false,
    localVisualizationType: visualizationType,
    tooltipDetail,
    tooltipTrigger
  };

  const { getCurrentConfig, applyConfig } = useConfigPresets({
    colors,
    tooltipDetail,
    setTooltipDetail: (detail) => {
      if (onTooltipDetailChange) {
        onTooltipDetailChange(detail);
      }
    },
    tooltipTrigger,
    setTooltipTrigger: (trigger) => {
      if (onTooltipTriggerChange) {
        onTooltipTriggerChange(trigger);
      }
    },
    networkTitle: "Chord Diagram",
    setNetworkTitle: () => {},
    expandedSections: localExpandedSections,
    setExpandedSections: setLocalExpandedSections,
    // Add these with default values
    linkDistance: null,
    setLinkDistance: () => {},
    linkStrength: null,
    setLinkStrength: () => {},
    nodeCharge: null,
    setNodeCharge: () => {},
    localFixNodesOnDrag: null,
    setLocalFixNodesOnDrag: () => {},
    // Include chord-specific settings
    chordConfig: chord.chordConfig,
    updateChordConfig: chord.updateConfig,
    reinitializeVisualization: chord.setNeedsRedraw,
    setForceUpdate: () => chord.setNeedsRedraw(true),
    visualizationType: 'chord'
  });

  const handlers = {
    handleParameterChange: (type: string, value: number) => {
      if (type === "nodeSize") {
        colors.setNodeSize(value);
        chord.setNeedsRedraw(true);
      }
    },
    handleNodeGroupChange: () => {},
    handleColorThemeChange: (theme: string) => {
      colors.setColorTheme(theme);
      chord.setNeedsRedraw(true);
    },
    
    handleApplyGroupColors: (categoryColorMap: {[key: string]: string}) => {
      // First switch to custom theme
      colors.setColorTheme('custom');
      
      // Then apply each category color individually
      Object.entries(categoryColorMap).forEach(([category, color]) => {
        colors.updateCategoryColor(category, color);
      });
      
      // Trigger a redraw of the chord diagram
      chord.setNeedsRedraw(true);
    },

    handleApplyIndividualColor: (nodeId: string, color: string) => {
      // Use the correct method from useNetworkColors to apply color to a specific node
      colors.applyIndividualColor(nodeId, color);
      chord.setNeedsRedraw(true);
    },

    handleResetIndividualColor: (nodeId: string) => {
      // Use the correct method from useNetworkColors to reset a node's custom color
      colors.resetIndividualColor(nodeId);
      chord.setNeedsRedraw(true);
    },

    handleApplyBackgroundColors: (
      bgColor: string, 
      txtColor: string, 
      lnkColor: string, 
      opacity: number,
      nodeStrokeColor: string
    ) => {
      colors.setBackgroundColor(bgColor);
      colors.setTextColor(txtColor);
      colors.setLinkColor(lnkColor);
      colors.setBackgroundOpacity(opacity);
      colors.setNodeStrokeColor(nodeStrokeColor);
      chord.setNeedsRedraw(true);
    },
    handleResetBackgroundColors: () => {
      colors.resetBackgroundColors();
      chord.setNeedsRedraw(true);
    },
    handleResetSimulation: () => {
      chord.setNeedsRedraw(true);
    },
    handleResetGraph: () => {
      colors.resetAllColors();
      chord.setNeedsRedraw(true);
    },
    toggleSection: (section: string) => {
      setLocalExpandedSections(prev => ({
        ...prev,
        [section]: !prev[section]
      }));
    },
    handleColorTabChange: (tab: string) => {
      colors.setActiveColorTab(tab);
    },
    handleTitleChange: () => {},
    toggleSidebar: handleToggleSidebar,
    handleToggleFixNodes: () => {},
    handleVisualizationTypeChange: (type: VisualizationType) => {
      if (onVisualizationTypeChange && type !== visualizationType) {
        onVisualizationTypeChange(type as VisualizationType);
      }
    },
    handleTooltipDetailChange: (detail: TooltipDetail) => {
      if (onTooltipDetailChange) {
        onTooltipDetailChange(detail);
      }
    },
    handleTooltipTriggerChange: (trigger: TooltipTrigger) => {
      if (onTooltipTriggerChange) {
        onTooltipTriggerChange(trigger);
      }
    },
    downloadData: () => {},
    downloadGraph: handleDownloadGraph,
    onGetCurrentConfig: getCurrentConfig,
    onApplyConfig: applyConfig
  };

  return (
    <BaseVisualization
      children={
        <div className="w-full h-full">
          <div
            ref={containerRef}
            id="network-visualization-container"
            className="w-full h-full relative"
            style={{
              backgroundColor: `rgba(${colors.rgbBackgroundColor.r}, ${colors.rgbBackgroundColor.g}, ${colors.rgbBackgroundColor.b}, ${colors.backgroundOpacity})`,
              touchAction: "none" // Important for proper touch handling
            }}
          >
          <style>
            {`
            .chord-particles circle {
              transition: opacity 300ms ease-out;
            }
            `}
          </style>
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ overflow: "visible" }}
          />
          {/* SVG Filter definition for animations and visual effects */}
          <svg className="chord-filter" style={{ position: 'absolute', width: 0, height: 0, visibility: 'hidden' }} 
              xmlns="http://www.w3.org/2000/svg" version="1.1">
            <defs>
              <filter id="chordBlurFilter">
                <feGaussianBlur id="chordBlur" stdDeviation="2.5"></feGaussianBlur>
                <feColorMatrix type="matrix" values="1 0 0 0 0
                            0 1 0 0 0
                            0 0 1 0 0
                            0 0 0 12 -8"></feColorMatrix>
              </filter>
            </defs>
          </svg>      
            
            {/* NetworkTooltip component for styling consistency */}
            <NetworkTooltip
              tooltipRef={tooltipRef}
              nodes={nodeData}
              links={linkData}
              tooltipDetail={tooltipDetail}
              tooltipTrigger={tooltipTrigger}
            />
            
            {/* Tooltip div */}
            <div
              ref={tooltipRef}
              className="absolute bg-black/85 text-white px-3 py-2 rounded-md text-sm z-50"
              style={{
                opacity: 0,
                visibility: "hidden",
                transition: 'opacity 0.15s ease-in-out',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                maxWidth: '320px',
                pointerEvents: 'none'
              }}
            />
            
            {/* Legend */}
            <NetworkLegend
              categories={chord.uniqueCategories}
              colorTheme={colors.colorTheme}
              dynamicColorThemes={colors.dynamicColorThemes}
              colorPalette={Object.values(colors.dynamicColorThemes.default || {})}
            />
            
            {/* Animation Controls - at top-left */}
            <div className="absolute top-4 left-4 z-50 transition-opacity cursor-move"
                onMouseDown={(e) => {
                  // Make the control panel draggable
                  if (e.currentTarget) {
                    const el = e.currentTarget;
                    const rect = el.getBoundingClientRect();
                    const offsetX = e.clientX - rect.left;
                    const offsetY = e.clientY - rect.top;
                    
                    const onMouseMove = (e: MouseEvent) => {
                      if (containerRef.current) {
                        const containerRect = containerRef.current.getBoundingClientRect();
                        const x = e.clientX - offsetX - containerRect.left;
                        const y = e.clientY - offsetY - containerRect.top;
                        
                        // Keep within container bounds
                        const maxX = containerRect.width - rect.width;
                        const maxY = containerRect.height - rect.height;
                        
                        el.style.left = `${Math.max(0, Math.min(maxX, x))}px`;
                        el.style.top = `${Math.max(0, Math.min(maxY, y))}px`;
                        el.style.right = 'auto';
                        el.style.bottom = 'auto';
                        el.style.transform = 'none';
                      }
                    };
                    
                    const onMouseUp = () => {
                      document.removeEventListener('mousemove', onMouseMove);
                      document.removeEventListener('mouseup', onMouseUp);
                    };
                    
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                  }
                }}
            >
              <ChordAnimationControls {...animationControlsProps} />
            </div>
            
            {/* Connection Info Box - at top-right */}
            <div className="absolute top-4 right-20 z-50 transition-opacity"
                onMouseDown={(e) => {
                  // Make the info box draggable
                  if (e.currentTarget) {
                    const el = e.currentTarget;
                    const rect = el.getBoundingClientRect();
                    const offsetX = e.clientX - rect.left;
                    const offsetY = e.clientY - rect.top;
                    
                    const onMouseMove = (e: MouseEvent) => {
                      if (containerRef.current) {
                        const containerRect = containerRef.current.getBoundingClientRect();
                        const x = e.clientX - offsetX - containerRect.left;
                        const y = e.clientY - offsetY - containerRect.top;
                        
                        // Keep within container bounds
                        const maxX = containerRect.width - rect.width;
                        const maxY = containerRect.height - rect.height;
                        
                        el.style.left = `${Math.max(0, Math.min(maxX, x))}px`;
                        el.style.top = `${Math.max(0, Math.min(maxY, y))}px`;
                        el.style.right = 'auto';
                        el.style.bottom = 'auto';
                        el.style.transform = 'none';
                      }
                    };
                    
                    const onMouseUp = () => {
                      document.removeEventListener('mousemove', onMouseMove);
                      document.removeEventListener('mouseup', onMouseUp);
                    };
                    
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                  }
                }}
            >
              <ConnectionInfoBox 
                isVisible={chord.currentAnimatedIndex > 0}
                connectionInfo={chord.currentConnectionInfo}
                showCategories={true}
              />
            </div>
            
            {/* Particle Metrics Panel - at bottom-left */}
            <div className="absolute bottom-4 left-4 z-50 transition-opacity cursor-move"
                onMouseDown={(e) => {
                  // Make the panel draggable
                  if (e.currentTarget) {
                    const el = e.currentTarget;
                    const rect = el.getBoundingClientRect();
                    const offsetX = e.clientX - rect.left;
                    const offsetY = e.clientY - rect.top;
                    
                    const onMouseMove = (e: MouseEvent) => {
                      if (containerRef.current) {
                        const containerRect = containerRef.current.getBoundingClientRect();
                        const x = e.clientX - offsetX - containerRect.left;
                        const y = e.clientY - offsetY - containerRect.top;
                        
                        // Keep within container bounds
                        const maxX = containerRect.width - rect.width;
                        const maxY = containerRect.height - rect.height;
                        
                        el.style.left = `${Math.max(0, Math.min(maxX, x))}px`;
                        el.style.top = `${Math.max(0, Math.min(maxY, y))}px`;
                        el.style.right = 'auto';
                        el.style.bottom = 'auto';
                        el.style.transform = 'none';
                      }
                    };
                    
                    const onMouseUp = () => {
                      document.removeEventListener('mousemove', onMouseMove);
                      document.removeEventListener('mouseup', onMouseUp);
                    };
                    
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                  }
                }}
            >
              <ParticleMetricsPanel 
                isVisible={showParticleMetrics && chord.chordConfig.particleMode}
                totalParticles={chord.particleMetrics.totalParticles}
                totalChordsWithParticles={chord.particleMetrics.totalChordsWithParticles}
                chordsGenerated={chord.particleMetrics.chordsGenerated}
                totalChords={chord.particleMetrics.totalChords}
                renderTime={chord.particleMetrics.renderTime}
                fps={chord.particleMetrics.fps}
                useWebGL={chord.chordConfig.useWebGLRenderer}
                isGenerating={chord.isGeneratingParticles}
                onCancelGeneration={chord.cancelParticleGeneration}
              />
            </div>

            {/* Keep the ChordDiagramControls component as is */}
            <ChordDiagramControls
              config={chord.chordConfig}
              onConfigChange={chord.updateConfig}
              onLayerToggle={handleLayerToggle}
              controlsPanelVisible={controlsPanelVisible}
              onToggleControlPanel={() => setControlsPanelVisible(prev => !prev)}
              particlesInitialized={chord.particlesInitialized}
              isGeneratingParticles={chord.isGeneratingParticles}
              onInitializeParticles={chord.initializeParticles}
              onCancelParticleGeneration={chord.cancelParticleGeneration}
              onToggleParticleMetrics={() => setShowParticleMetrics(prev => !prev)}
              showParticleMetrics={showParticleMetrics}
              onProgressiveGeneration={chord.toggleProgressiveGeneration}
              progressiveGenerationEnabled={chord.chordConfig.progressiveGenerationEnabled}
              particleMetrics={chord.particleMetrics}
            />

            {/* Replace the top-right buttons with custom ones */}
            <div className="absolute top-4 right-4 flex gap-2 z-50">
              {/* Fullscreen button */}
              <button
                onClick={handleFullscreenToggle}
                className="bg-white/90 text-black px-3 py-2 rounded-md shadow-md flex items-center gap-1.5 text-sm hover:bg-white"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen mode"}
              >
                <Maximize className="h-4 w-4" />
                <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
              </button>

{/* Download dropdown */}
<div className="relative group">
  <button 
    className="bg-white/90 text-black px-3 py-2 rounded-md shadow-md flex items-center gap-1.5 text-sm hover:bg-white"
  >
    <Download className="h-4 w-4" />
    <span>Download</span>
  </button>
  <div className="absolute hidden group-hover:block right-0 top-full bg-white rounded-md shadow-lg overflow-hidden min-w-52 z-10 mt-1">
    <div className="px-4 py-2 bg-gray-100 text-sm font-medium">Standard Formats</div>
    <button 
      className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
      onClick={() => handleDownloadGraph('svg')}
    >
      SVG (with CSS effects)
    </button>
    <button 
      className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
      onClick={() => handleDownloadGraph('svg:nocss')}
    >
      SVG (without CSS effects)
    </button>
    <button 
      className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
      onClick={() => handleDownloadGraph('png')}
    >
      PNG
    </button>
    <button 
      className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
      onClick={() => handleDownloadGraph('jpg')}
    >
      JPG
    </button>
    <button 
      className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
      onClick={() => handleDownloadGraph('pdf')}
    >
      PDF
    </button>
    <button 
      className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
      onClick={() => handleDownloadGraph('tiff')}
    >
      TIFF (High Quality)
    </button>
    <div className="border-t border-gray-200"></div>
    <div className="px-4 py-2 bg-gray-100 text-sm font-medium">Download All</div>
    <button 
      className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
      onClick={() => handleDownloadGraph('all:clean:css')}
    >
      All with CSS effects
    </button>
    <button 
      className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
      onClick={() => handleDownloadGraph('all:clean:nocss')}
    >
      All without CSS effects
    </button>
  </div>
</div>
            </div>
          </div>
        </div>
      }
      nodeData={nodeData}
      linkData={linkData}
      onCreditsClick={onCreditsClick}
      isLoading={chord.isLoading}
      visualizationError={chord.visualizationError}
      selectedNode={chord.selectedNode}
      selectedNodeConnections={chord.selectedNodeConnections}
      expandedSections={localExpandedSections}
      uniqueCategories={chord.uniqueCategories}
      nodeCounts={chord.nodeCounts}
      processedData={{ nodes: nodeData, links: linkData }}
      sidebar={sidebarState}
      handlers={handlers}
      customNodeColorsState={colors.customNodeColors}
      dynamicColorThemesState={colors.dynamicColorThemes}
      renderSidebar={true}
    />
  );
};

export default ChordVisualization;