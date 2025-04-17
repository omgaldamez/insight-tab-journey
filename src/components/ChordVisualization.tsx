import React, { useRef, useState } from 'react';
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showParticleMetrics, setShowParticleMetrics] = useState(true);

  // Apply fullscreen styles
  useFullscreenStyles();

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
    onJumpToFrame: chord.jumpToFrame  // Add this new prop
  };

  // Toggle sidebar state handler
  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
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
    
    downloadChordDiagram(
      format,
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
      })
    );
  };

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
            className="w-full h-full relative"
            style={{
              backgroundColor: `rgba(${colors.rgbBackgroundColor.r}, ${colors.rgbBackgroundColor.g}, ${colors.rgbBackgroundColor.b}, ${colors.backgroundOpacity})`,
              touchAction: "none" // Important for proper touch handling
            }}
          >
           {/* Add a style tag for particle transitions */}
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
            
            {/* Use the updated VisualizationControls component */}
            <VisualizationControls
              containerRef={containerRef}
              nodeData={nodeData.map(node => ({
                ...node,
                // Add any missing properties required by NodeData here
              }))}
              linkData={linkData.map(link => ({
                ...link,
                source: typeof link.source === 'object' ? link.source.id : link.source,
                target: typeof link.target === 'object' ? link.target.id : link.target,
              }))}
              visualizationType={visualizationType}
              onDownloadData={() => {}}
              onDownloadGraph={handleDownloadGraph}
              onResetSelection={() => chord.setNeedsRedraw(true)}
              showZoomControls={false}
              onZoomIn={chord.handleZoomIn}
              onZoomOut={chord.handleZoomOut}
              onResetZoom={chord.handleZoomReset}
              
              // Basic chord controls
              chordStrokeWidth={chord.chordConfig.chordStrokeWidth}
              chordOpacity={chord.chordConfig.chordOpacity}
              chordStrokeOpacity={chord.chordConfig.chordStrokeOpacity}
              arcOpacity={chord.chordConfig.arcOpacity}
              onChordStrokeWidthChange={(width) => chord.updateConfig({ chordStrokeWidth: width })}
              onChordOpacityChange={(opacity) => chord.updateConfig({ chordOpacity: opacity })}
              onChordStrokeOpacityChange={(opacity) => chord.updateConfig({ chordStrokeOpacity: opacity })}
              onArcOpacityChange={(opacity) => chord.updateConfig({ arcOpacity: opacity })}
              
              // Direction-based styling
              useDirectionalStyling={chord.chordConfig.useDirectionalStyling}
              sourceChordOpacity={chord.chordConfig.sourceChordOpacity}
              targetChordOpacity={chord.chordConfig.targetChordOpacity}
              sourceChordColor={chord.chordConfig.sourceChordColor}
              targetChordColor={chord.chordConfig.targetChordColor}
              onToggleDirectionalStyling={(val) => chord.updateConfig({ useDirectionalStyling: val })}
              onSourceChordOpacityChange={(val) => chord.updateConfig({ sourceChordOpacity: val })}
              onTargetChordOpacityChange={(val) => chord.updateConfig({ targetChordOpacity: val })}
              onSourceChordColorChange={(val) => chord.updateConfig({ sourceChordColor: val })}
              onTargetChordColorChange={(val) => chord.updateConfig({ targetChordColor: val })}
              
              // Variable width
              chordWidthVariation={chord.chordConfig.chordWidthVariation}
              chordWidthPosition={chord.chordConfig.chordWidthPosition}
              chordWidthCustomPosition={chord.chordConfig.chordWidthCustomPosition}
              onChordWidthVariationChange={(val) => chord.updateConfig({ chordWidthVariation: val })}
              onChordWidthPositionChange={(val) => chord.updateConfig({ chordWidthPosition: val })}
              onChordWidthCustomPositionChange={(val) => chord.updateConfig({ chordWidthCustomPosition: val })}

              // Particle props
              particleMode={chord.chordConfig.particleMode}
              particleDensity={chord.chordConfig.particleDensity}
              particleSizeBase={chord.chordConfig.particleSize}
              particleSizeVariation={chord.chordConfig.particleSizeVariation}
              particleBlur={chord.chordConfig.particleBlur}
              particleDistribution={chord.chordConfig.particleDistribution}
              particleColor={chord.chordConfig.particleColor}
              particleOpacity={chord.chordConfig.particleOpacity}
              onToggleParticleMode={(val) => chord.updateConfig({ particleMode: val })}
              onParticleDensityChange={(val) => chord.updateConfig({ particleDensity: val })}
              onParticleSizeChange={(val) => chord.updateConfig({ particleSize: val })}
              onParticleSizeVariationChange={(val) => chord.updateConfig({ particleSizeVariation: val })}
              onParticleBlurChange={(val) => chord.updateConfig({ particleBlur: val })}
              onParticleDistributionChange={(val) => chord.updateConfig({ particleDistribution: val })}
              onParticleColorChange={(val) => chord.updateConfig({ particleColor: val })}
              onParticleOpacityChange={(val) => chord.updateConfig({ particleOpacity: val })}
              
              // Stroke variation props
              strokeWidthVariation={chord.chordConfig.strokeWidthVariation}
              strokeWidthPosition={chord.chordConfig.strokeWidthPosition}
              strokeWidthCustomPosition={chord.chordConfig.strokeWidthCustomPosition}
              onStrokeWidthVariationChange={(val) => chord.updateConfig({ strokeWidthVariation: val })}
              onStrokeWidthPositionChange={(val) => chord.updateConfig({ strokeWidthPosition: val })}
              onStrokeWidthCustomPositionChange={(val) => chord.updateConfig({ strokeWidthCustomPosition: val })}
              
              // Geometric shapes
              useGeometricShapes={chord.chordConfig.useGeometricShapes}
              shapeType={chord.chordConfig.shapeType}
              shapeSize={chord.chordConfig.shapeSize}
              shapeSpacing={chord.chordConfig.shapeSpacing}
              shapeFill={chord.chordConfig.shapeFill}
              shapeStroke={chord.chordConfig.shapeStroke}
              onToggleGeometricShapes={(val) => chord.updateConfig({ useGeometricShapes: val })}
              onShapeTypeChange={(val) => chord.updateConfig({ shapeType: val })}
              onShapeSizeChange={(val) => chord.updateConfig({ shapeSize: val })}
              onShapeSpacingChange={(val) => chord.updateConfig({ shapeSpacing: val })}
              onShapeFillChange={(val) => chord.updateConfig({ shapeFill: val })}
              onShapeStrokeChange={(val) => chord.updateConfig({ shapeStroke: val })}
              
              // Enhanced animation
              animationSpeed={chord.chordConfig.animationSpeed}
              useFadeTransition={chord.chordConfig.useFadeTransition}
              transitionDuration={chord.chordConfig.transitionDuration}
              onAnimationSpeedChange={(val) => chord.updateConfig({ animationSpeed: val })}
              onToggleFadeTransition={(val) => chord.updateConfig({ useFadeTransition: val })}
              onTransitionDurationChange={(val) => chord.updateConfig({ transitionDuration: val })}
            />
            
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
            


{/* Add the Particle Metrics Panel RIGHT AFTER the ConnectionInfoBox */}
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

{/* Use our updated ChordDiagramControls component with particle generation support */}
<ChordDiagramControls
  config={chord.chordConfig}
  onConfigChange={chord.updateConfig}
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