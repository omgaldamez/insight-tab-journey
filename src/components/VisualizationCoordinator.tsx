import React, { useState, useEffect, useRef } from 'react';
import { Node, Link, VisualizationType } from '@/types/networkTypes';
import NetworkVisualization from './NetworkVisualization';
import ThreeDVisualization from './ThreeDVisualization';
import ChordVisualization from './ChordVisualization';
import { useToast } from "@/components/ui/use-toast";
import NetworkSidebar from './NetworkSidebar';
import { TooltipDetail, TooltipTrigger } from './TooltipSettings';
import RouteFinderVisualization from './RouteFinderVisualization';
import GroupableNetworkVisualization from './GroupableNetworkVisualization';

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
  
  // Add this line to ensure all visualizations share the same sidebar collapsed state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // 3D specific settings
  const [threeDLayout, setThreeDLayout] = useState<'3d-sphere' | '3d-network'>('3d-sphere');
  const [threeDSortMode, setThreeDSortMode] = useState<'alphabetical' | 'category' | 'connections' | 'none'>('none');
  const [threeDCenterNode, setThreeDCenterNode] = useState<string | null>(null);
  const [nodePositioningEnabled, setNodePositioningEnabled] = useState(false);
  
  // Basic theming props that all visualization types can use
  const [colorTheme, setColorTheme] = useState('default');
  const [nodeSize, setNodeSize] = useState(1.0);
  const [linkColor, setLinkColor] = useState('#999999');
  const [backgroundColor, setBackgroundColor] = useState('#f5f5f5');
  const [backgroundOpacity, setBackgroundOpacity] = useState(1.0);
  const [customNodeColors, setCustomNodeColors] = useState<Record<string, string>>({});
  const [dynamicColorThemes, setDynamicColorThemes] = useState<Record<string, Record<string, string>>>({
    // Basic themes
    default: {},
    bright: {},
    pastel: {},
    ocean: {},
    autumn: {},
    monochrome: {},
    custom: {},
    
    // Monochromatic themes
    azureCascade: {},
    emeraldDepths: {},
    violetTwilight: {},
    roseReverie: {},
    amberGlow: {},
    
    // Categorical themes
    exoticPlumage: {},
    pixelNostalgia: {},
    culinaryPalette: {},
    urbanCanvas: {},
    
    // Divergent themes
    elementalContrast: {},
    forestToDesert: {},
    mysticMeadow: {},
    cosmicDrift: {}
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
  const [repulsionForce, setRepulsionForce] = useState(100);
  const [threeDLinkStrength, setThreeDLinkStrength] = useState(0.5);
  const [gravity, setGravity] = useState(0.1);

  // Add consistent network title state across all visualizations
  const [networkTitle, setNetworkTitle] = useState("Network Visualization");

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
      // Basic themes
      default: {} as Record<string, string>,
      bright: {} as Record<string, string>,
      pastel: {} as Record<string, string>,
      ocean: {} as Record<string, string>,
      autumn: {} as Record<string, string>,
      monochrome: {} as Record<string, string>,
      custom: {} as Record<string, string>,
      
      // Monochromatic themes
      azureCascade: {} as Record<string, string>,
      emeraldDepths: {} as Record<string, string>,
      violetTwilight: {} as Record<string, string>,
      roseReverie: {} as Record<string, string>,
      amberGlow: {} as Record<string, string>,
      
      // Categorical themes
      exoticPlumage: {} as Record<string, string>,
      pixelNostalgia: {} as Record<string, string>,
      culinaryPalette: {} as Record<string, string>,
      urbanCanvas: {} as Record<string, string>,
      
      // Divergent themes
      elementalContrast: {} as Record<string, string>,
      forestToDesert: {} as Record<string, string>,
      mysticMeadow: {} as Record<string, string>,
      cosmicDrift: {} as Record<string, string>
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
      
      // Monochromatic theme variants
      // Azure (blues)
      themes.azureCascade[category] = hslToHex(210 + (index * 15) % 40, 70, 40 + (index * 5) % 30);
      
      // Emerald (greens)
      themes.emeraldDepths[category] = hslToHex(120 + (index * 15) % 40, 70, 40 + (index * 5) % 30);
      
      // Violet (purples)
      themes.violetTwilight[category] = hslToHex(270 + (index * 15) % 40, 70, 40 + (index * 5) % 30);
      
      // Rose (pinks)
      themes.roseReverie[category] = hslToHex(330 + (index * 15) % 30, 70, 40 + (index * 5) % 30);
      
      // Amber (oranges)
      themes.amberGlow[category] = hslToHex(30 + (index * 15) % 30, 70, 40 + (index * 5) % 30);
      
      // Categorical vibrant themes
      // Exotic Plumage (vibrant tropical)
      const exoticHue = (index * 55) % 360;
      themes.exoticPlumage[category] = hslToHex(exoticHue, 85, 55);
      
      // Pixel Nostalgia (retro game colors)
      const pixelHue = (index * 45 + 15) % 360;
      themes.pixelNostalgia[category] = hslToHex(pixelHue, 80, 60);
      
      // Culinary (food-inspired colors)
      const culinaryHues = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
      const culinaryHue = culinaryHues[index % culinaryHues.length];
      themes.culinaryPalette[category] = hslToHex(culinaryHue, 70, 45 + (index % 3) * 10);
      
      // Urban (city landscape colors)
      const urbanHue = (index * 40) % 360;
      themes.urbanCanvas[category] = hslToHex(urbanHue, 40, 50);
      
      // Divergent themes
      // Elemental Contrast (fire to ice)
      const elementalValue = index / categories.length;
      themes.elementalContrast[category] = hslToHex(
        elementalValue < 0.5 ? 0 + (elementalValue * 2 * 60) : 180 + ((elementalValue - 0.5) * 2 * 60),
        70,
        50
      );
      
      // Forest to Desert
      themes.forestToDesert[category] = hslToHex(
        120 - (index % categories.length) * (90 / categories.length),
        60,
        40 + (index % categories.length) * (20 / categories.length)
      );
      
      // Mystic Meadow (purple to green)
      themes.mysticMeadow[category] = hslToHex(
        270 - (index % categories.length) * (150 / categories.length),
        70,
        50
      );
      
      // Cosmic Drift (pink to blue)
      themes.cosmicDrift[category] = hslToHex(
        330 - (index % categories.length) * (210 / categories.length),
        80,
        60 - (index % categories.length) * (20 / categories.length)
      );
    });
    
    // Custom theme starts as a copy of default
    themes.custom = {...themes.default};
    
    setDynamicColorThemes(themes);
  }
}, [nodeData, dynamicColorThemes]);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
    // You might want to add a toast notification here
    toast({
      title: isSidebarCollapsed ? "Sidebar Expanded" : "Sidebar Collapsed",
      description: isSidebarCollapsed ? "Showing detailed controls" : "Hiding sidebar for more view space"
    });
  };

  // Handle title change - this should be consistent across visualizations
  const handleTitleChange = (newTitle: string) => {
    setNetworkTitle(newTitle);
    toast({
      title: "Title Updated",
      description: `Visualization title changed to "${newTitle}"`
    });
  };

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
    // eslint-disable-next-line prefer-const
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

  // Handler for repulsion force change
  const handleRepulsionForceChange = (force: number) => {
    setRepulsionForce(force);
    toast({
      title: "Repulsion Force Updated",
      description: `Force strength set to ${force}`
    });
  };

  // Handler for 3D link strength change
  const handleThreeDLinkStrengthChange = (strength: number) => {
    setThreeDLinkStrength(strength);
    toast({
      title: "Link Strength Updated",
      description: `Link strength set to ${strength.toFixed(2)}`
    });
  };

  // Handler for gravity change
  const handleGravityChange = (value: number) => {
    setGravity(value);
    toast({
      title: "Gravity Updated",
      description: `Gravity force set to ${value.toFixed(2)}`
    });
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
      description: getVisualizationDescription(type)
    });
    
    // Adjust expanded sections based on visualization type
    if (type === '3d') {
      setExpandedSections(prev => ({
        ...prev,
        threeDControls: true,
        networkControls: false,
      }));
    } else if (type === 'chord') {
      setExpandedSections(prev => ({
        ...prev,
        networkControls: false,
        colorControls: true,
      }));
    } else {
      setExpandedSections(prev => ({
        ...prev,
        networkControls: true,
        threeDControls: false,
      }));
    }
  };

  // Helper function to get visualization descriptions
  const getVisualizationDescription = (type: VisualizationType): string => {
    switch (type) {
      case '3d':
        return "Now viewing the network as a 3D graph. Click and drag to rotate, use scroll to zoom.";
      case 'chord':
        return "Now viewing category relationships as a chord diagram. Hover over arcs and chords for details.";
      case 'network':
        return "Now viewing the network as a force-directed graph.";
      case 'arc':
        return "Now viewing the network as an arc diagram.";
      case 'rad360':
        return "Now viewing the network as a radial layout.";
      case 'arcLineal':
        return "Now viewing the network as an arc lineal diagram.";
      case 'nodeNav':
        return "Now using node navigator visualization.";
      case 'routeFinder':
        return "Now using route finder visualization.";
      case 'groupable':
        return "Now using groupable network visualization.";
      default:
        return `Now viewing the network as a ${type} graph.`;
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
        : "Using network layout - force-directed graph in 3D space with node positioning"
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
  
  // Handler for node positioning toggle
  const handleNodePositioningToggle = () => {
    setNodePositioningEnabled(prev => !prev);
    
    toast({
      title: nodePositioningEnabled ? "Node Positioning Disabled" : "Node Positioning Enabled",
      description: nodePositioningEnabled 
        ? "Click and drag will rotate the view" 
        : "Click and drag on nodes to position them. Toggle off to rotate view."
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

  function handleColorTabChange(tab: string): void {
    throw new Error('Function not implemented.');
  }

  function setActiveColorTab(tab: string): void {
    throw new Error('Function not implemented.');
  }

  function handleResetZoom(): void {
    throw new Error('Function not implemented.');
  }

  // Updated return statement with proper conditional rendering for each visualization type
  return (
    <div ref={containerRef} className="w-full h-[calc(100vh-14rem)] rounded-lg border border-border overflow-hidden bg-card flex">
{/* Route Finder Visualization */}
{visualizationType === 'routeFinder' && (
  <div className="w-full flex">
    {/* Add NetworkSidebar component here */}
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
      title="Route Finder"
      isCollapsed={isSidebarCollapsed}
      uniqueCategories={Array.from(new Set(nodeData.map(node => node.category)))}
      fixNodesOnDrag={fixNodesOnDrag}
      visualizationType={visualizationType}
      tooltipDetail={tooltipDetail}
      tooltipTrigger={tooltipTrigger}
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
      onColorTabChange={setActiveColorTab}
      onTitleChange={handleTitleChange}
      onToggleSidebar={handleToggleSidebar}
      onToggleFixNodes={handleToggleFixNodes}
      onVisualizationTypeChange={handleVisualizationTypeChange}
      onTooltipDetailChange={handleTooltipDetailChange}
      onTooltipTriggerChange={handleTooltipTriggerChange}
      onZoomToFit={() => {}}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      onResetView={handleResetZoom}
    />

    <div className="flex-1">
      <RouteFinderVisualization
        nodeData={nodeData}
        linkData={linkData}
        onCreditsClick={onCreditsClick}
        colorTheme={colorTheme}
        nodeSize={nodeSize}
        linkColor={linkColor}
        backgroundColor={backgroundColor}
        backgroundOpacity={backgroundOpacity}
        customNodeColors={customNodeColors}
        dynamicColorThemes={dynamicColorThemes}
        visualizationType={visualizationType}
        onVisualizationTypeChange={handleVisualizationTypeChange}
      />
    </div>
  </div>
)}

      {/* Chord Diagram Visualization */}
      {visualizationType === 'chord' && (
        <ChordVisualization
          nodeData={nodeData}
          linkData={linkData}
          onCreditsClick={onCreditsClick}
          colorTheme={colorTheme}
          nodeSize={nodeSize}
          linkColor={linkColor}
          backgroundColor={backgroundColor}
          backgroundOpacity={backgroundOpacity}
          customNodeColors={customNodeColors}
          dynamicColorThemes={dynamicColorThemes}
          visualizationType={visualizationType}
          onVisualizationTypeChange={handleVisualizationTypeChange}
          tooltipDetail={tooltipDetail}
          tooltipTrigger={tooltipTrigger}
          onTooltipDetailChange={handleTooltipDetailChange}
          onTooltipTriggerChange={handleTooltipTriggerChange}
        />
      )}

      {/* 3D Visualization */}
      {visualizationType === '3d' && (
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
            isCollapsed={isSidebarCollapsed}
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
            nodePositioningEnabled={nodePositioningEnabled}
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
            onToggleSidebar={handleToggleSidebar}
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
            onToggleNodePositioning={handleNodePositioningToggle}
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
              nodePositioningEnabled={nodePositioningEnabled}
            />
          </div>
        </div>
      )}

{/* Groupable Network Visualization */}
{visualizationType === 'groupable' && (
  <div className="w-full flex">
    {/* Add NetworkSidebar component here */}
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
      title="Groupable Network"
      isCollapsed={isSidebarCollapsed}
      uniqueCategories={Array.from(new Set(nodeData.map(node => node.category)))}
      fixNodesOnDrag={fixNodesOnDrag}
      visualizationType={visualizationType}
      tooltipDetail={tooltipDetail}
      tooltipTrigger={tooltipTrigger}
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
      onColorTabChange={handleColorTabChange}
      onTitleChange={handleTitleChange}
      onToggleSidebar={handleToggleSidebar}
      onToggleFixNodes={handleToggleFixNodes}
      onVisualizationTypeChange={handleVisualizationTypeChange}
      onTooltipDetailChange={handleTooltipDetailChange}
      onTooltipTriggerChange={handleTooltipTriggerChange}
      onZoomToFit={() => {}}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      onResetView={handleResetView}
    />

    <div className="flex-1">
      <GroupableNetworkVisualization
        nodeData={nodeData}
        linkData={linkData}
        onCreditsClick={onCreditsClick}
        fixNodesOnDrag={fixNodesOnDrag}
        visualizationType={visualizationType}
        onVisualizationTypeChange={handleVisualizationTypeChange}
        colorTheme={colorTheme}
        nodeSize={nodeSize}
        linkColor={linkColor}
        backgroundColor={backgroundColor}
        backgroundOpacity={backgroundOpacity}
        customNodeColors={customNodeColors}
        dynamicColorThemes={dynamicColorThemes}
        tooltipDetail={tooltipDetail}
        tooltipTrigger={tooltipTrigger}
        onTooltipDetailChange={handleTooltipDetailChange}
        onTooltipTriggerChange={handleTooltipTriggerChange}
      />
    </div>
  </div>
)}

      {/* Other Visualizations (network, arc, rad360, arcLineal, nodeNav) */}
      {visualizationType !== '3d' && 
        visualizationType !== 'routeFinder' && 
        visualizationType !== 'groupable' && 
        visualizationType !== 'chord' && (
        <NetworkVisualization
          nodeData={nodeData}
          linkData={linkData}
          onCreditsClick={onCreditsClick}
          fixNodesOnDrag={fixNodesOnDrag}
          visualizationType={visualizationType}
          onVisualizationTypeChange={handleVisualizationTypeChange}
          colorTheme={colorTheme}
          nodeSize={nodeSize}
          linkColor={linkColor}
          backgroundColor={backgroundColor}
          backgroundOpacity={backgroundOpacity}
          customNodeColors={customNodeColors}
          dynamicColorThemes={dynamicColorThemes}
          tooltipDetail={tooltipDetail}
          tooltipTrigger={tooltipTrigger}
          onTooltipDetailChange={handleTooltipDetailChange}
          onTooltipTriggerChange={handleTooltipTriggerChange}
        />
      )}
    </div>
  );
};

export default VisualizationCoordinator;