/* eslint-disable prefer-const */
import React, { useState, useEffect, useRef } from 'react';
import { Node, Link, VisualizationType } from '@/types/networkTypes';
import NetworkVisualization from './NetworkVisualization';
import ThreeDVisualization from './ThreeDVisualization';
import { useToast } from "@/components/ui/use-toast";
import NetworkSidebar from './NetworkSidebar';
import { TooltipDetail, TooltipTrigger } from './TooltipSettings';

interface VisualizationCoordinatorProps {
  nodeData: Node[];
  linkData: Link[];
  onCreditsClick: () => void;
}

const VisualizationCoordinator: React.FC<VisualizationCoordinatorProps> = ({
  nodeData,
  linkData,
  onCreditsClick
}) => {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Basic visualization settings
  const [fixNodesOnDrag, setFixNodesOnDrag] = useState(true);
  const [visualizationType, setVisualizationType] = useState<VisualizationType>('network');
  
  // 3D specific settings
  const [threeDLayout, setThreeDLayout] = useState<'3d-sphere' | '3d-network'>('3d-sphere');
  const [threeDSortMode, setThreeDSortMode] = useState<'alphabetical' | 'category' | 'connections' | 'none'>('none');
  const [threeDCenterNode, setThreeDCenterNode] = useState<string | null>(null);
  
  // Basic theming props that all visualization types can use
  const [colorTheme, setColorTheme] = useState('default');
  const [nodeSize, setNodeSize] = useState(1.0);
  const [linkColor, setLinkColor] = useState('#999999');
  const [backgroundColor, setBackgroundColor] = useState('#f5f5f5');
  const [backgroundOpacity, setBackgroundOpacity] = useState(1.0);
  const [customNodeColors, setCustomNodeColors] = useState<Record<string, string>>({});
  const [dynamicColorThemes, setDynamicColorThemes] = useState<Record<string, Record<string, string>>>({
    default: {},
    bright: {},
    pastel: {},
    ocean: {},
    autumn: {},
    monochrome: {},
    custom: {}
  });
  
  // Add tooltip settings
  const [tooltipDetail, setTooltipDetail] = useState<TooltipDetail>('simple');
  const [tooltipTrigger, setTooltipTrigger] = useState<TooltipTrigger>('hover');
  
  // 3D specific settings
  const [rotationSpeed, setRotationSpeed] = useState(0.001);
  const [showLabels, setShowLabels] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    networkControls: true,
    nodeControls: true,
    colorControls: false,
    networkInfo: false,
    visualizationType: true,
    threeDControls: true,
    tooltipSettings: true
  });

  // Initialize dynamic color themes with categories from nodes
  useEffect(() => {
    if (nodeData.length > 0 && Object.keys(dynamicColorThemes.default).length === 0) {
      const categories = Array.from(new Set(nodeData.map(node => node.category)));
      
      // Generate color palette
      const baseColors = [
        "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", 
        "#1abc9c", "#34495e", "#e67e22", "#27ae60", "#8e44ad",
        "#16a085", "#d35400", "#2980b9", "#c0392b", "#f1c40f"
      ];
      
      // For each theme, generate appropriate colors
      const themes = {
        default: {} as Record<string, string>,
        bright: {} as Record<string, string>,
        pastel: {} as Record<string, string>,
        ocean: {} as Record<string, string>,
        autumn: {} as Record<string, string>,
        monochrome: {} as Record<string, string>,
        custom: {} as Record<string, string>
      };
      
      // Assign colors to categories for each theme
      categories.forEach((category, index) => {
        const baseColor = baseColors[index % baseColors.length];
        
        // Default theme - base colors
        themes.default[category] = baseColor;
        
        // Bright theme - lighter, more saturated colors
        const hsl = hexToHSL(baseColor);
        themes.bright[category] = hslToHex(hsl.h, Math.min(100, hsl.s + 20), Math.min(70, hsl.l + 15));
        
        // Pastel theme - higher lightness, lower saturation
        themes.pastel[category] = hslToHex(hsl.h, Math.max(30, hsl.s - 30), Math.min(85, hsl.l + 25));
        
        // Ocean theme - shifted toward blues
        themes.ocean[category] = hslToHex(
          (hsl.h + 210) % 360, 
          Math.min(90, 60 + index * 3), 
          Math.max(30, 70 - index * 2)
        );
        
        // Autumn theme - shifted toward oranges and browns
        themes.autumn[category] = hslToHex(
          (30 + index * 15) % 60, 
          Math.min(90, 70 + index * 2), 
          Math.max(30, 60 - index * 3)
        );
        
        // Monochrome theme - grayscale variants
        const grayValue = 20 + (index * 10) % 50;
        themes.monochrome[category] = hslToHex(0, 0, grayValue);
      });
      
      // Custom theme starts as a copy of default
      themes.custom = {...themes.default};
      
      setDynamicColorThemes(themes);
    }
  }, [nodeData, dynamicColorThemes]);

  // Helper for color generation
  const hexToHSL = (hex: string) => {
    // Convert hex to RGB first
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    }
    
    // Convert RGB to HSL
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };

  const hslToHex = (h: number, s: number, l: number) => {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Handler for toggling node fixing behavior
  const handleToggleFixNodes = () => {
    setFixNodesOnDrag(prev => !prev);
    toast({
      title: fixNodesOnDrag ? "Nodes now follow simulation" : "Nodes now stay fixed",
      description: fixNodesOnDrag 
        ? "Nodes will return to simulation flow after dragging" 
        : "Nodes will remain where you drop them"
    });
  };

  // Handler for visualization type change
  const handleVisualizationTypeChange = (type: VisualizationType) => {
    setVisualizationType(type);
    
    toast({
      title: `Switched to ${type} visualization`,
      description: type === '3d' 
        ? "Now viewing the network as a 3D graph. Click and drag to rotate, use scroll to zoom."
        : `Now viewing the network as a ${type} graph.`
    });
    
    // If switching to 3D, ensure 3D controls are expanded
    if (type === '3d') {
      setExpandedSections(prev => ({
        ...prev,
        threeDControls: true,
        networkControls: false, // Hide network controls when in 3D
      }));
    } else {
      setExpandedSections(prev => ({
        ...prev,
        networkControls: true,
        threeDControls: false, // Hide 3D controls when not in 3D
      }));
    }
  };
  
  // Handler for parameter changes (e.g., node size)
  const onParameterChange = (type: string, value: number) => {
    switch (type) {
      case "nodeSize":
        setNodeSize(value);
        break;
      default:
        break;
    }
  };
  
  // Handler for rotation speed change
  const handleRotationSpeedChange = (speed: number) => {
    setRotationSpeed(speed);
    toast({
      title: "Rotation Speed Updated",
      description: speed === 0 
        ? "Auto-rotation disabled" 
        : `Rotation speed set to ${(speed * 1000).toFixed(1)}`
    });
  };
  
  // Handler for 3D layout type change
  const handleThreeDLayoutChange = (layoutType: '3d-sphere' | '3d-network') => {
    setThreeDLayout(layoutType);
    toast({
      title: "3D Layout Changed",
      description: layoutType === '3d-sphere'
        ? "Using spherical layout - nodes arranged in a spherical pattern"
        : "Using network layout - force-directed graph in 3D space with right-click node positioning"
    });
  };

  // Handler for 3D sort mode change
  const handleThreeDSortModeChange = (mode: 'alphabetical' | 'category' | 'connections' | 'none') => {
    setThreeDSortMode(mode);
    
    let description = "Nodes arranged in default order";
    if (mode === 'alphabetical') description = "Nodes arranged alphabetically by ID";
    if (mode === 'category') description = "Nodes arranged by category groups";
    if (mode === 'connections') description = "Nodes arranged by connection count (most connected first)";
    
    toast({
      title: "Sphere Ordering Changed",
      description
    });
  };

  // Handler for center node change
  const handleThreeDCenterNodeChange = (nodeId: string | null) => {
    setThreeDCenterNode(nodeId);
    
    toast({
      title: nodeId ? "Center Node Set" : "Center Node Removed",
      description: nodeId 
        ? `Node "${nodeId}" placed at center of sphere for centrality analysis` 
        : "Reverting to balanced sphere layout with no central node"
    });
  };
  
  // Handler for toggling labels
  const handleToggleLabels = () => {
    setShowLabels(prev => !prev);
    toast({
      title: showLabels ? "Labels Hidden" : "Labels Shown",
      description: showLabels 
        ? "Node labels will be hidden" 
        : "Node labels will be displayed"
    });
  };
  
  // Handler for resetting the camera view
  const handleResetView = () => {
    toast({
      title: "View Reset",
      description: threeDLayout === '3d-network' 
        ? "Camera position has been reset to default view and all nodes unfixed" 
        : "Camera position has been reset to default view"
    });
  };
  
  // Handler for zooming in
  const handleZoomIn = () => {
    toast({
      title: "Zooming In",
      description: "Camera zoomed in closer to the graph"
    });
  };
  
  // Handler for zooming out
  const handleZoomOut = () => {
    toast({
      title: "Zooming Out",
      description: "Camera zoomed out to see more of the graph"
    });
  };
  
  // Handler for toggling sections
  const handleToggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };

  // Apply background colors
  const onApplyBackgroundColors = (bg: string, txt: string, link: string, opacity: number, nodeStroke: string) => {
    setBackgroundColor(bg);
    setLinkColor(link);
    setBackgroundOpacity(opacity);
  };

  // Reset background colors
  const onResetBackgroundColors = () => {
    setBackgroundColor('#f5f5f5');
    setLinkColor('#999999');
    setBackgroundOpacity(1.0);
  };

  // Apply individual color
  const onApplyIndividualColor = (nodeId: string, color: string) => {
    setCustomNodeColors(prev => ({...prev, [nodeId]: color}));
  };

  // Reset individual color
  const onResetIndividualColor = (nodeId: string) => {
    setCustomNodeColors(prev => {
      const newColors = {...prev};
      delete newColors[nodeId];
      return newColors;
    });
  };

  // Reset all graph settings
  const onResetGraph = () => {
    setNodeSize(1.0);
    setCustomNodeColors({});
    setColorTheme('default');
  };

  // Add handler for tooltip detail change
  const handleTooltipDetailChange = (detail: TooltipDetail) => {
    setTooltipDetail(detail);
    toast({
      title: `Tooltip Detail: ${detail === 'simple' ? 'Simple' : 'Detailed'}`,
      description: `Showing ${detail === 'simple' ? 'basic' : 'comprehensive'} node information`
    });
  };

  // Add handler for tooltip trigger change
  const handleTooltipTriggerChange = (trigger: TooltipTrigger) => {
    setTooltipTrigger(trigger);
    toast({
      title: `Tooltip Mode: ${trigger.charAt(0).toUpperCase() + trigger.slice(1)}`,
      description: trigger === 'hover' 
        ? 'Tooltips will show on hover' 
        : trigger === 'click' 
          ? 'Tooltips will show on click and dismiss on click outside' 
          : 'Tooltips will stay visible until new selection'
    });
  };

  // Create common props for visualizations
  const commonVisualizationProps = {
    nodeData,
    linkData,
    onCreditsClick,
    fixNodesOnDrag,
    visualizationType,
    onVisualizationTypeChange: handleVisualizationTypeChange,
    colorTheme,
    nodeSize,
    linkColor,
    backgroundColor,
    backgroundOpacity,
    customNodeColors,
    dynamicColorThemes,
    tooltipDetail,
    tooltipTrigger,
    onTooltipDetailChange: handleTooltipDetailChange,
    onTooltipTriggerChange: handleTooltipTriggerChange
  };

  return (
    <div ref={containerRef} className="w-full h-[calc(100vh-14rem)] rounded-lg border border-border overflow-hidden bg-card flex">
      {visualizationType === '3d' ? (
        <div className="w-full flex">
          {/* Sidebar for 3D visualization */}
          <NetworkSidebar
            linkDistance={75}
            linkStrength={1.0}
            nodeCharge={-300}
            nodeSize={nodeSize}
            nodeGroup="all"
            colorTheme={colorTheme}
            activeColorTab="presets"
            expandedSections={expandedSections}
            selectedNode={null}
            selectedNodeConnections={{ to: [], from: [] }}
            nodeCounts={{ total: nodeData.length }}
            colorThemes={dynamicColorThemes[colorTheme] || {}}
            nodes={nodeData}
            customNodeColors={customNodeColors}
            backgroundColor={backgroundColor}
            textColor="#ffffff"
            linkColor={linkColor}
            nodeStrokeColor="#000000"
            backgroundOpacity={backgroundOpacity}
            title="3D Network Visualization"
            isCollapsed={false}
            uniqueCategories={Array.from(new Set(nodeData.map(node => node.category)))}
            fixNodesOnDrag={fixNodesOnDrag}
            visualizationType={visualizationType}
            tooltipDetail={tooltipDetail}
            tooltipTrigger={tooltipTrigger}
            rotationSpeed={rotationSpeed}
            showLabels={showLabels}
            threeDLayout={threeDLayout}
            threeDSortMode={threeDSortMode}
            threeDCenterNode={threeDCenterNode}
            onParameterChange={onParameterChange}
            onNodeGroupChange={() => {}}
            onColorThemeChange={setColorTheme}
            onApplyGroupColors={() => {}}
            onApplyIndividualColor={onApplyIndividualColor}
            onResetIndividualColor={onResetIndividualColor}
            onApplyBackgroundColors={onApplyBackgroundColors}
            onResetBackgroundColors={onResetBackgroundColors}
            onResetSimulation={() => {}}
            onDownloadData={() => {}}
            onDownloadGraph={() => {}}
            onResetGraph={onResetGraph}
            onToggleSection={handleToggleSection}
            onColorTabChange={() => {}}
            onTitleChange={() => {}}
            onToggleSidebar={() => {}}
            onToggleFixNodes={handleToggleFixNodes}
            onVisualizationTypeChange={handleVisualizationTypeChange}
            onTooltipDetailChange={handleTooltipDetailChange}
            onTooltipTriggerChange={handleTooltipTriggerChange}
            onRotationSpeedChange={handleRotationSpeedChange}
            onToggleLabels={handleToggleLabels}
            onResetView={handleResetView}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onThreeDLayoutChange={handleThreeDLayoutChange}
            onThreeDSortModeChange={handleThreeDSortModeChange}
            onThreeDCenterNodeChange={handleThreeDCenterNodeChange}
          />

          {/* The actual 3D visualization */}
          <div className="flex-1">
            <ThreeDVisualization
              nodeData={nodeData}
              linkData={linkData}
              colorTheme={colorTheme}
              nodeSize={nodeSize}
              linkColor={linkColor}
              backgroundColor={backgroundColor}
              backgroundOpacity={backgroundOpacity}
              customNodeColors={customNodeColors}
              dynamicColorThemes={dynamicColorThemes}
              onCreditsClick={onCreditsClick}
              layoutType={threeDLayout}
              sortMode={threeDSortMode}
              centerNodeId={threeDCenterNode}
            />
          </div>
        </div>
      ) : (
        // For non-3D visualizations, use the NetworkVisualization component without a key
        // This prevents remounting when switching between network, radial, and arc types
        <NetworkVisualization
          {...commonVisualizationProps}
        />
      )}
    </div>
  );
};

export default VisualizationCoordinator;
