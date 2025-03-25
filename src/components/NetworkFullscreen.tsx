import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, AlertCircle } from "lucide-react";
import NetworkVisualization from "./NetworkVisualization";
import NetworkSidebar from "./NetworkSidebar";
import { useToast } from "@/components/ui/use-toast";
import { NodeData, LinkData } from "@/types/types";
import { safeSessionRetrieve } from "@/utils/storageUtils";
import ZoomControls from "./ZoomControls";
import * as d3 from 'd3';
import { VisualizationType } from './NetworkSidebar';
import './visualization.css'; // Import the CSS

// Helper function to generate dynamic color themes
const generateDynamicColorThemes = (categories: string[], colorPalette: string[]) => {
  const baseThemes: Record<string, Record<string, string>> = {
    default: {},
    bright: {},
    pastel: {},
    ocean: {},
    autumn: {},
    monochrome: {},
    custom: {}
  };

  // Default theme with standard colors
  categories.forEach((category, index) => {
    const colorIndex = index % colorPalette.length;
    baseThemes.default[category] = colorPalette[colorIndex];
  });

  // Bright theme with vibrant colors
  categories.forEach((category, index) => {
    const colorIndex = index % colorPalette.length;
    const baseColor = d3.rgb(colorPalette[colorIndex]);
    baseThemes.bright[category] = d3.rgb(
      Math.min(255, baseColor.r + 40),
      Math.min(255, baseColor.g + 40),
      Math.min(255, baseColor.b + 40)
    ).toString();
  });

  // Pastel theme with lighter colors
  categories.forEach((category, index) => {
    const colorIndex = index % colorPalette.length;
    const baseColor = d3.rgb(colorPalette[colorIndex]);
    const h = d3.hsl(baseColor).h;
    baseThemes.pastel[category] = d3.hsl(h, 0.6, 0.8).toString();
  });

  // Add default for other categories
  Object.keys(baseThemes).forEach(theme => {
    baseThemes[theme as keyof typeof baseThemes]["Otro"] = "#95a5a6";
  });

  return baseThemes;
};

const NetworkFullscreen: React.FC = () => {
  const [nodeData, setNodeData] = useState<NodeData[]>([]);
  const [linkData, setLinkData] = useState<LinkData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataWarning, setDataWarning] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { toast } = useToast();

  // Add states for sidebar functionality
  const [visualizationType, setVisualizationType] = useState<VisualizationType>('network');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    networkControls: true,
    nodeControls: true,
    colorControls: false,
    networkInfo: false,
    visualizationType: true
  });
  const [nodeGroup, setNodeGroup] = useState('all');
  const [colorTheme, setColorTheme] = useState('default');
  const [fixNodesOnDrag, setFixNodesOnDrag] = useState(true);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [selectedNodeConnections, setSelectedNodeConnections] = useState({ to: [] as string[], from: [] as string[] });
  const [nodeCounts, setNodeCounts] = useState<{ [key: string]: number; total: number }>({ total: 0 });
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [dynamicColorThemes, setDynamicColorThemes] = useState<Record<string, Record<string, string>>>({});
  const [customNodeColors, setCustomNodeColors] = useState<Record<string, string>>({});

  // Define color palette using useMemo
  const COLOR_PALETTE = React.useMemo(() => [
    "#e74c3c", // Red
    "#3498db", // Blue
    "#2ecc71", // Green
    "#f39c12", // Orange
    "#9b59b6", // Purple
    "#1abc9c", // Teal
    "#34495e", // Dark Blue
    "#e67e22", // Dark Orange
    "#27ae60", // Dark Green
    "#8e44ad", // Dark Purple
    "#16a085", // Dark Teal
    "#d35400", // Rust
    "#2980b9", // Royal Blue
    "#c0392b", // Dark Red
    "#f1c40f"  // Yellow
  ], []);

  // Capture the SVG ref in fullscreen mode
  const handleSvgRef = (ref: SVGSVGElement | null) => {
    svgRef.current = ref;
  };

  // Handle resize for fullscreen mode
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && svgRef.current) {
        // Get the container dimensions
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        // Update SVG dimensions
        const svg = d3.select(svgRef.current);
        svg.attr("width", width)
           .attr("height", height);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Call once to ensure proper initial sizing
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    // Load data from sessionStorage
    try {
      const retrievedNodeData = safeSessionRetrieve<NodeData[]>("network_node_data");
      const retrievedLinkData = safeSessionRetrieve<LinkData[]>("network_link_data");
      
      if (retrievedNodeData && retrievedNodeData.length > 0) {
        setNodeData(retrievedNodeData);
        
        // Process node categories for sidebar
        const categories = retrievedNodeData.map(node => {
          const categoryKey = Object.keys(node).find(key => 
            key.toLowerCase() === 'category' || 
            key.toLowerCase() === 'type' ||
            key.toLowerCase() === 'node type' ||
            key.toLowerCase() === 'node category'
          ) || '';
          
          return String(node[categoryKey] || 'default');
        });
        
        // Set unique categories
        const uniqueCats = Array.from(new Set(categories)).filter(Boolean);
        setUniqueCategories(uniqueCats);
        
        // Set node counts
        const counts: { [key: string]: number; total: number } = { total: retrievedNodeData.length };
        uniqueCats.forEach(category => {
          counts[category] = categories.filter(c => c === category).length;
        });
        setNodeCounts(counts);
        
        // Generate dynamic color themes
        const themes = generateDynamicColorThemes(uniqueCats, COLOR_PALETTE);
        setDynamicColorThemes(themes);
        
        if (retrievedLinkData && retrievedLinkData.length > 0) {
          setLinkData(retrievedLinkData);
          
          if (retrievedNodeData.length > 10 && retrievedLinkData.length < retrievedNodeData.length / 2) {
            setDataWarning("Limited connection data is available. Some network relationships may not be displayed.");
          }
        } else {
          setLinkData([]);
          setDataWarning("No connection data available. Only nodes are displayed.");
        }
        
        setIsLoading(false);
        
        toast({
          title: "Network Visualization Loaded",
          description: "Fullscreen mode is now active",
        });
      } else {
        setIsLoading(false);
        toast({
          title: "Data Not Found",
          description: "No network data available. Please go back and try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error loading network data:", error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: `Failed to load network data: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive"
      });
    }
  }, [toast, COLOR_PALETTE]);

  const handleClose = () => {
    window.close();
  };

  // Toggle sidebar collapse
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Handle visualization type change
  const handleVisualizationTypeChange = (type: VisualizationType) => {
    setVisualizationType(type);
    toast({
      title: `Switched to ${type} visualization`,
      description: `Now viewing the network as a ${type} graph.`
    });
  };
  
  // Toggle section in sidebar
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };
  
  // Mock functions for the sidebar
  const handleParameterChange = (type: string, value: number) => {
    console.log(`Parameter changed: ${type} = ${value}`);
    // In a real implementation, this would update the visualization
  };
  
  const handleNodeGroupChange = (group: string) => {
    setNodeGroup(group);
    console.log(`Node group changed to: ${group}`);
  };
  
  const handleColorThemeChange = (theme: string) => {
    setColorTheme(theme);
    console.log(`Color theme changed to: ${theme}`);
  };
  
  const handleToggleFixNodes = () => {
    setFixNodesOnDrag(!fixNodesOnDrag);
    toast({
      title: fixNodesOnDrag ? "Nodes will follow simulation" : "Nodes will stay fixed",
      description: fixNodesOnDrag 
        ? "Nodes will return to simulation flow after dragging" 
        : "Nodes will remain where you drop them"
    });
  };

  const handleApplyGroupColors = (categoryColorMap: {[key: string]: string}) => {
    console.log("Apply group colors:", categoryColorMap);
    
    // Update the dynamic color themes
    const updatedThemes = { ...dynamicColorThemes };
    updatedThemes.custom = { ...updatedThemes.custom };
    
    Object.keys(categoryColorMap).forEach(category => {
      updatedThemes.custom[category] = categoryColorMap[category];
    });
    
    setDynamicColorThemes(updatedThemes);
    setColorTheme('custom');
  };

  const handleApplyIndividualColor = (nodeId: string, color: string) => {
    console.log(`Apply color ${color} to node ${nodeId}`);
    setCustomNodeColors(prev => ({
      ...prev,
      [nodeId]: color
    }));
  };

  const handleResetIndividualColor = (nodeId: string) => {
    console.log(`Reset color for node ${nodeId}`);
    setCustomNodeColors(prev => {
      const newColors = { ...prev };
      delete newColors[nodeId];
      return newColors;
    });
  };

  // Custom zoom controls for fullscreen mode
  const handleZoomIn = () => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const g = svg.select('g');
    
    if (!g.empty()) {
      const transform = g.attr('transform') || '';
      const scaleMatch = transform.match(/scale\(([^)]+)\)/);
      let scale = 1;
      
      if (scaleMatch && scaleMatch[1]) {
        scale = parseFloat(scaleMatch[1]);
      }
      
      const newScale = scale * 1.25;
      g.attr('transform', transform.replace(/scale\([^)]+\)/, `scale(${newScale})`));
    }
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const g = svg.select('g');
    
    if (!g.empty()) {
      const transform = g.attr('transform') || '';
      const scaleMatch = transform.match(/scale\(([^)]+)\)/);
      let scale = 1;
      
      if (scaleMatch && scaleMatch[1]) {
        scale = parseFloat(scaleMatch[1]);
      }
      
      const newScale = scale * 0.8;
      g.attr('transform', transform.replace(/scale\([^)]+\)/, `scale(${newScale})`));
    }
  };

  const handleResetZoom = () => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const g = svg.select('g');
    
    if (!g.empty()) {
      g.attr('transform', 'translate(0,0) scale(1)');
      
      // Calculate a better fit based on SVG and content dimensions
      try {
        const svgWidth = svgRef.current.clientWidth;
        const svgHeight = svgRef.current.clientHeight;
        
        const content = g.node();
        if (content) {
          const bounds = (content as SVGGraphicsElement).getBBox();
          
          // Calculate scale to fit content
          const scale = 0.9 * Math.min(
            svgWidth / bounds.width,
            svgHeight / bounds.height
          );
          
          // Calculate translation to center content
          const translateX = (svgWidth - bounds.width * scale) / 2 - bounds.x * scale;
          const translateY = (svgHeight - bounds.height * scale) / 2 - bounds.y * scale;
          
          // Apply the centered transform
          g.attr('transform', `translate(${translateX},${translateY}) scale(${scale})`);
        }
      } catch (error) {
        console.error("Error resetting zoom:", error);
      }
    }
  };

  // Handling other functions
  const handleApplyBackgroundColors = (
    bgColor: string, 
    txtColor: string, 
    lnkColor: string, 
    opacity: number,
    nodeStrokeClr: string
  ) => {
    console.log(`Apply background colors: bg=${bgColor}, text=${txtColor}, link=${lnkColor}`);
  };

  const handleResetBackgroundColors = () => {
    console.log("Reset background colors");
  };

  const handleResetSimulation = () => {
    console.log("Reset simulation");
  };

  const handleResetGraph = () => {
    console.log("Reset graph");
  };

  const handleColorTabChange = (tab: string) => {
    console.log("Change color tab:", tab);
  };

  const handleTitleChange = (title: string) => {
    console.log("Change title:", title);
  };

  const handleDownloadData = (format: string) => {
    console.log("Download data as:", format);
  };

  const handleDownloadGraph = (format: string) => {
    console.log("Download graph as:", format);
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin"></div>
          <p className="text-gray-600">Loading network visualization...</p>
        </div>
      </div>
    );
  }

  if (nodeData.length === 0) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">No Data Available</h2>
          <p className="text-gray-500 mb-6">
            No network data was found. Please go back to the main page and try again.
          </p>
          <Button onClick={() => window.close()}>Close Window</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fullscreen-container h-screen w-full flex flex-col">
      <div className="flex justify-between items-center p-4 bg-gray-800 text-white">
        <div className="flex items-center flex-wrap">
          <h1 className="text-xl font-semibold">Network Visualization - Fullscreen Mode</h1>
          
          {dataWarning && (
            <div className="ml-4 flex items-center text-amber-300 text-sm">
              <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
              <span>{dataWarning}</span>
            </div>
          )}
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-white hover:bg-gray-700"
          onClick={handleClose}
        >
          <X className="h-5 w-5 mr-1" />
          <span>Close</span>
        </Button>
      </div>
      
      <div className="flex-1 flex">
        {/* Include sidebar in fullscreen mode */}
        <div className="sidebar-container">
          <NetworkSidebar
            linkDistance={70}
            linkStrength={1.0}
            nodeCharge={-300}
            nodeSize={1.0}
            nodeGroup={nodeGroup}
            colorTheme={colorTheme}
            activeColorTab={'presets'}
            expandedSections={expandedSections}
            selectedNode={selectedNode}
            selectedNodeConnections={selectedNodeConnections}
            nodeCounts={nodeCounts}
            colorThemes={dynamicColorThemes[colorTheme] || {}}
            nodes={nodeData}
            customNodeColors={customNodeColors}
            backgroundColor={'#f5f5f5'}
            textColor={'#ffffff'}
            linkColor={'#999999'}
            nodeStrokeColor={'#000000'}
            backgroundOpacity={1.0}
            title={'Network Visualization'}
            isCollapsed={isSidebarCollapsed}
            fixNodesOnDrag={fixNodesOnDrag}
            visualizationType={visualizationType}
            uniqueCategories={uniqueCategories}
            onParameterChange={handleParameterChange}
            onNodeGroupChange={handleNodeGroupChange}
            onColorThemeChange={handleColorThemeChange}
            onApplyGroupColors={handleApplyGroupColors}
            onApplyIndividualColor={handleApplyIndividualColor}
            onResetIndividualColor={handleResetIndividualColor}
            onApplyBackgroundColors={handleApplyBackgroundColors}
            onResetBackgroundColors={handleResetBackgroundColors}
            onResetSimulation={handleResetSimulation}
            onDownloadData={handleDownloadData}
            onDownloadGraph={handleDownloadGraph}
            onResetGraph={handleResetGraph}
            onToggleSection={toggleSection}
            onColorTabChange={handleColorTabChange}
            onTitleChange={handleTitleChange}
            onToggleSidebar={toggleSidebar}
            onToggleFixNodes={handleToggleFixNodes}
            onVisualizationTypeChange={handleVisualizationTypeChange}
          />
        </div>

        {/* Main visualization area */}
        <div 
          className="visualization-content" 
          ref={containerRef}
        >
          <NetworkVisualization 
            onCreditsClick={() => {}} 
            nodeData={nodeData}
            linkData={linkData}
            onSvgRef={handleSvgRef}
            visualizationType={visualizationType}
            onVisualizationTypeChange={handleVisualizationTypeChange}
            fixNodesOnDrag={fixNodesOnDrag}
            colorTheme={colorTheme}
            customNodeColors={customNodeColors}
            dynamicColorThemes={dynamicColorThemes}
          />
          
          {/* Add ZoomControls explicitly for fullscreen mode */}
          <div className="zoom-controls">
            <ZoomControls
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onReset={handleResetZoom}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkFullscreen;