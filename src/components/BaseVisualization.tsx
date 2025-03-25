import React, { useRef, useState, ReactNode, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { NetworkVisualizationProps, Node, Link } from '@/types/networkTypes';
import NetworkSidebar from "./NetworkSidebar";
import { hexToRgb } from '@/utils/visualizationUtils';
import { NetworkError, LoadingIndicator, EmptyData } from './NetworkComponents';
import ZoomControls from "./ZoomControls";
import * as d3 from 'd3';

// BaseVisualization props extending NetworkVisualizationProps
interface BaseVisualizationProps extends NetworkVisualizationProps {
  children: ReactNode;
  isLoading: boolean;
  visualizationError: string | null;
  selectedNode: Node | null;
  selectedNodeConnections: { to: string[]; from: string[] };
  expandedSections: {
    networkControls: boolean;
    nodeControls: boolean;
    colorControls: boolean;
    networkInfo: boolean;
    visualizationType: boolean;
  };
  uniqueCategories: string[];
  nodeCounts: { [key: string]: number; total: number };
  processedData: { nodes: Node[], links: Link[] };
  sidebar: {
    linkDistance: number;
    linkStrength: number;
    nodeCharge: number;
    localNodeSize: number;
    nodeGroup: string;
    localColorTheme: string;
    activeColorTab: string;
    localBackgroundColor: string;
    textColor: string;
    localLinkColor: string;
    nodeStrokeColor: string;
    localBackgroundOpacity: number;
    isSidebarCollapsed: boolean;
    networkTitle: string;
    localFixNodesOnDrag: boolean;
    localVisualizationType: "network" | "radial" | "arc";
  };
  handlers: {
    handleParameterChange: (type: string, value: number) => void;
    handleNodeGroupChange: (group: string) => void;
    handleColorThemeChange: (theme: string) => void;
    handleApplyGroupColors: (categoryColorMap: {[key: string]: string}) => void;
    handleApplyIndividualColor: (nodeId: string, color: string) => void;
    handleResetIndividualColor: (nodeId: string) => void;
    handleApplyBackgroundColors: (
      bgColor: string, 
      txtColor: string, 
      lnkColor: string, 
      opacity: number,
      nodeStrokeClr: string
    ) => void;
    handleResetBackgroundColors: () => void;
    handleResetSimulation: () => void;
    handleResetGraph: () => void;
    toggleSection: (section: string) => void;
    handleColorTabChange: (tab: string) => void;
    handleTitleChange: (title: string) => void;
    toggleSidebar: () => void;
    handleToggleFixNodes: () => void;
    handleVisualizationTypeChange: (type: "network" | "radial" | "arc") => void;
    reinitializeVisualization: () => void;
    downloadData: (format: string) => void;
    downloadGraph: (format: string) => void;
  };
  customNodeColorsState: {[key: string]: string};
  dynamicColorThemesState: {[key: string]: {[key: string]: string}};
  onZoomToFit?: (duration?: number) => void; // Add this line
}

const BaseVisualization: React.FC<BaseVisualizationProps> = ({ 
  children,
  isLoading,
  visualizationError,
  nodeData,
  linkData,
  selectedNode,
  selectedNodeConnections,
  expandedSections,
  uniqueCategories,
  nodeCounts,
  processedData,
  sidebar,
  handlers,
  customNodeColorsState,
  dynamicColorThemesState
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRefs = useRef<{[key: string]: SVGSVGElement | null}>({});

  // Handle zoom controls
  const handleZoomIn = () => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    const g = svg.querySelector('g');
    if (!g) return;

    // Get current transform
    const transform = g.getAttribute('transform');
    if (!transform) return;

    // Parse the current transform values
    let scale = 1;
    let translateX = 0;
    let translateY = 0;

    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
    if (scaleMatch && scaleMatch[1]) {
      scale = parseFloat(scaleMatch[1]);
    }

    const translateMatch = transform.match(/translate\(([^,]+),([^)]+)\)/);
    if (translateMatch && translateMatch[1] && translateMatch[2]) {
      translateX = parseFloat(translateMatch[1]);
      translateY = parseFloat(translateMatch[2]);
    }

    // Increase scale by 25%
    const newScale = scale * 1.25;
    
    // Apply new transform
    g.setAttribute('transform', `translate(${translateX},${translateY}) scale(${newScale})`);
  };

  const handleZoomOut = () => {
    if (!containerRef.current) return;
    const svg = containerRef.current.querySelector('svg');
    if (!svg) return;

    const g = svg.querySelector('g');
    if (!g) return;

    // Get current transform
    const transform = g.getAttribute('transform');
    if (!transform) return;

    // Parse the current transform values
    let scale = 1;
    let translateX = 0;
    let translateY = 0;

    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
    if (scaleMatch && scaleMatch[1]) {
      scale = parseFloat(scaleMatch[1]);
    }

    const translateMatch = transform.match(/translate\(([^,]+),([^)]+)\)/);
    if (translateMatch && translateMatch[1] && translateMatch[2]) {
      translateX = parseFloat(translateMatch[1]);
      translateY = parseFloat(translateMatch[2]);
    }

    // Decrease scale by 20%
    const newScale = scale * 0.8;
    
    // Apply new transform
    g.setAttribute('transform', `translate(${translateX},${translateY}) scale(${newScale})`);
  };

  const handleResetZoom = () => {
    if (!containerRef.current) return;
    
    // Find all SVG elements and reset each one
    const svgs = containerRef.current.querySelectorAll('svg');
    svgs.forEach(svg => {
      const g = svg.querySelector('g');
      if (!g) return;
      
      // Reset transform to identity transform
      g.setAttribute('transform', 'translate(0,0) scale(1)');
      
      // Calculate a better fit based on SVG and content dimensions
      try {
        const svgWidth = svg.clientWidth;
        const svgHeight = svg.clientHeight;
        
        const content = g;
        const bounds = content.getBBox();
        
        // Calculate scale to fit content
        const scale = 0.9 * Math.min(
          svgWidth / bounds.width,
          svgHeight / bounds.height
        );
        
        // Calculate translation to center content
        const translateX = (svgWidth - bounds.width * scale) / 2 - bounds.x * scale;
        const translateY = (svgHeight - bounds.height * scale) / 2 - bounds.y * scale;
        
        // Apply the centered transform
        g.setAttribute('transform', `translate(${translateX},${translateY}) scale(${scale})`);
      } catch (error) {
        console.error("Error resetting zoom:", error);
      }
    });
  };

  // Apply auto-centering when visualization type changes
  useEffect(() => {
    if (isLoading) return;
    
    // Allow time for the visualization to render
    const timer = setTimeout(() => {
      handleResetZoom();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [sidebar.localVisualizationType, isLoading]);

  // Check for empty data
  if (nodeData.length === 0 || linkData.length === 0) {
    return <EmptyData />;
  }

  return (
    <div className="w-full h-[calc(100vh-14rem)] rounded-lg border border-border overflow-hidden bg-card flex">
      {isLoading ? (
        <LoadingIndicator message={`Loading ${sidebar.localVisualizationType.charAt(0).toUpperCase() + sidebar.localVisualizationType.slice(1)} Visualization...`} />
      ) : (
        <>
          {/* Display visualization error if any */}
          {visualizationError && (
            <NetworkError error={visualizationError} onReset={handlers.reinitializeVisualization} />
          )}

          {/* Sidebar Component - Always present regardless of visualization type */}
          <NetworkSidebar
            linkDistance={sidebar.linkDistance}
            linkStrength={sidebar.linkStrength}
            nodeCharge={sidebar.nodeCharge}
            nodeSize={sidebar.localNodeSize}
            nodeGroup={sidebar.nodeGroup}
            colorTheme={sidebar.localColorTheme}
            activeColorTab={sidebar.activeColorTab}
            expandedSections={expandedSections}
            selectedNode={selectedNode}
            selectedNodeConnections={selectedNodeConnections}
            nodeCounts={nodeCounts}
            colorThemes={dynamicColorThemesState[sidebar.localColorTheme] || {}}
            nodes={processedData.nodes}
            customNodeColors={customNodeColorsState}
            backgroundColor={sidebar.localBackgroundColor}
            textColor={sidebar.textColor}
            linkColor={sidebar.localLinkColor}
            nodeStrokeColor={sidebar.nodeStrokeColor}
            backgroundOpacity={sidebar.localBackgroundOpacity}
            title={sidebar.networkTitle}
            isCollapsed={sidebar.isSidebarCollapsed}
            fixNodesOnDrag={sidebar.localFixNodesOnDrag}
            visualizationType={sidebar.localVisualizationType}
            onParameterChange={handlers.handleParameterChange}
            onNodeGroupChange={handlers.handleNodeGroupChange}
            onColorThemeChange={handlers.handleColorThemeChange}
            onApplyGroupColors={handlers.handleApplyGroupColors}
            onApplyIndividualColor={handlers.handleApplyIndividualColor}
            onResetIndividualColor={handlers.handleResetIndividualColor}
            onApplyBackgroundColors={handlers.handleApplyBackgroundColors}
            onResetBackgroundColors={handlers.handleResetBackgroundColors}
            onResetSimulation={handlers.handleResetSimulation}
            onDownloadData={handlers.downloadData}
            onDownloadGraph={handlers.downloadGraph}
            onResetGraph={handlers.handleResetGraph}
            onToggleSection={handlers.toggleSection}
            onColorTabChange={handlers.handleColorTabChange}
            onTitleChange={handlers.handleTitleChange}
            onToggleSidebar={handlers.toggleSidebar}
            uniqueCategories={uniqueCategories}
            onToggleFixNodes={handlers.handleToggleFixNodes}
            onVisualizationTypeChange={handlers.handleVisualizationTypeChange}
          />
          
          {/* Main Content - Changes based on visualization type */}
          <div className="flex-1 relative" ref={containerRef}>
            {children}
            
            {/* Zoom Controls */}
            <ZoomControls
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onReset={handleResetZoom}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default BaseVisualization;