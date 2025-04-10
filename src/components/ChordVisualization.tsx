const handleToggleColoredRibbons = () => {
  setUseColoredRibbons(prev => !prev);
  
  // Notify user of mode change
  toast({
    title: setUseColoredRibbons ? "Monochrome Ribbons" : "Colored Ribbons",
    description: setUseColoredRibbons 
      ? "Using neutral gray for all connection ribbons" 
      : "Using category colors for connection ribbons",
  });
};/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { Node as NetworkNode, Link, VisualizationType } from '@/types/networkTypes';

interface Node extends NetworkNode {
category: string;
}
import { toast, useToast } from "@/components/ui/use-toast";
import BaseVisualization from './BaseVisualization';
import { NetworkLegend } from './NetworkComponents';
import useNetworkColors from '@/hooks/useNetworkColors';
import { TooltipDetail, TooltipTrigger } from './TooltipSettings';
import { setupClickAwayListener } from './TooltipUtils';
import NetworkTooltip from './NetworkTooltip';
import { Eye, EyeOff } from 'lucide-react';
import { NodeData } from '@/types/types';
import VisualizationControls from './VisualizationControls';
import useFullscreenStyles from '@/hooks/useFullscreenStyles';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { dataURItoBlob } from '@/utils/visualizationUtils';

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

interface DetailedNode {
id: string;
category: string;
categoryIndex: number;
nodeIndex: number;
connections: number;
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
const [isLoading, setIsLoading] = useState(true);
const [visualizationError, setVisualizationError] = useState<string | null>(null);
const [selectedNode, setSelectedNode] = useState<Node | null>(null);
const [selectedNodeConnections, setSelectedNodeConnections] = useState<{ to: string[]; from: string[] }>({ to: [], from: [] });
const [expandedSections, setExpandedSections] = useState({
  networkControls: true,
  nodeControls: true,
  colorControls: false,
  networkInfo: false,
  visualizationType: true,
  tooltipSettings: true
});
const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
const [categoryNodeCounts, setCategoryNodeCounts] = useState<Record<string, number>>({});
const [categoryMatrix, setCategoryMatrix] = useState<number[][]>([]);
const [nodeCounts, setNodeCounts] = useState<{ total: number }>({ total: 0 });
const [evenDistribution, setEvenDistribution] = useState(false); // Distribution toggle
const [showDetailedView, setShowDetailedView] = useState(false); // Toggle for detailed view
const [detailedNodeData, setDetailedNodeData] = useState<DetailedNode[]>([]);
const [detailedMatrix, setDetailedMatrix] = useState<number[][]>([]);
const [nodesByCategory, setNodesByCategory] = useState<Record<string, Node[]>>({});
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

// New state: Toggle to show all nodes or only those with connections
const [showAllNodes, setShowAllNodes] = useState(true);

// Toggle for colored or monochrome ribbons
const [useColoredRibbons, setUseColoredRibbons] = useState(true);

// Toggle for filled or stroke-only ribbons
const [ribbonFillEnabled, setRibbonFillEnabled] = useState(true);

// New state variables for chord diagram visualization settings
const [chordStrokeWidth, setChordStrokeWidth] = useState(0.5);
const [chordOpacity, setChordOpacity] = useState(0.75);
const [chordStrokeOpacity, setChordStrokeOpacity] = useState(1.0);
const [arcOpacity, setArcOpacity] = useState(0.8);
const [controlsPanelVisible, setControlsPanelVisible] = useState(true);

// State to track if we need to redraw the visualization
const [needsRedraw, setNeedsRedraw] = useState(false);

// Use the color hooks
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

// Apply fullscreen styles
useFullscreenStyles();

// Create zoom functionality specifically for chord visualization
const setupChordZoom = useCallback(() => {
  if (!svgRef.current || !contentRef.current) return;
  
  // Create a zoom behavior
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 4]) // Limit zoom scale
    .on("zoom", (event) => {
      if (contentRef.current) {
        // Apply transform to the content group
        d3.select(contentRef.current).attr("transform", event.transform.toString());
      }
    });
  
  // Apply zoom to SVG
  const svg = d3.select(svgRef.current);
  svg.call(zoom);
  
  // Initial position and scale to fit the visualization
  const fitChordDiagram = () => {
    if (!containerRef.current || !svgRef.current || !contentRef.current) return;
    
    try {
      // Get container dimensions
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      // Get content dimensions (using the bounding box)
      const bounds = contentRef.current.getBBox();
      
      // Calculate scale to fit with padding
      const padding = 40;
      const scale = 0.9 * Math.min(
        width / (bounds.width + padding * 2),
        height / (bounds.height + padding * 2)
      );
      
      // Calculate translation to center the content
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Create transform
      const transform = d3.zoomIdentity
        .translate(centerX, centerY)
        .scale(scale);
      
      // Apply transform with transition
      svg.transition()
        .duration(500)
        .call(zoom.transform, transform);
    } catch (error) {
      console.error("Error fitting chord diagram:", error);
    }
  };
  
  // Call fit function after a short delay
  setTimeout(fitChordDiagram, 300);
  
  return { zoom, fitChordDiagram };
}, []);

// Set up click away listener for tooltips
useEffect(() => {
  const cleanup = setupClickAwayListener(tooltipRef, tooltipTrigger);
  return cleanup;
}, [tooltipTrigger]);

// Set up zoom after the visualization is loaded
useEffect(() => {
  if (!isLoading) {
    // Set up zoom after the visualization is loaded
    const zoomControl = setupChordZoom();
    
    // Clean up
    return () => {
      if (svgRef.current && zoomControl) {
        d3.select(svgRef.current).on('.zoom', null);
      }
    };
  }
}, [isLoading, setupChordZoom]);

// Extract unique categories and map nodes to categories
useEffect(() => {
  if (nodeData.length > 0) {
    const categories = Array.from(new Set(nodeData.map(node => node.category)));
    setUniqueCategories(categories);

    // Count nodes in each category
    const counts: Record<string, number> = {};
    const nodesByCat: Record<string, Node[]> = {};
    
    categories.forEach(category => {
      const nodesInCategory = nodeData.filter(node => node.category === category);
      counts[category] = nodesInCategory.length;
      nodesByCat[category] = nodesInCategory;
    });
    
    setCategoryNodeCounts(counts);
    setNodesByCategory(nodesByCat);
    setNodeCounts({ total: nodeData.length });

    // Generate color themes if needed
    if (Object.keys(colors.dynamicColorThemes.default).length === 0) {
      colors.generateDynamicColorThemes(categories);
    }
  }
}, [nodeData]);

// Create the connectivity matrix for chord diagram - Memoized to avoid recalculation
useEffect(() => {
  if (uniqueCategories.length === 0 || linkData.length === 0) return;

  try {
    console.log(`Creating matrix with ${uniqueCategories.length} categories`);
    
    // Create a matrix of connections between categories
    const matrix: number[][] = Array(uniqueCategories.length).fill(0).map(() => 
      Array(uniqueCategories.length).fill(0)
    );

    // Map for fast category lookups
    const categoryMap = new Map<string, { category: string, id: string }>();
    nodeData.forEach(node => {
      categoryMap.set(node.id, { category: node.category, id: node.id });
    });

    // Fill the matrix with connection counts
    let totalConnections = 0;
    linkData.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      const sourceNode = categoryMap.get(sourceId);
      const targetNode = categoryMap.get(targetId);
      
      if (sourceNode && targetNode) {
        const sourceIndex = uniqueCategories.indexOf(sourceNode.category);
        const targetIndex = uniqueCategories.indexOf(targetNode.category);
        
        if (sourceIndex !== -1 && targetIndex !== -1) {
          // Increment connection count from source category to target category
          matrix[sourceIndex][targetIndex] += 1;
          totalConnections++;
        }
      }
    });
    
    console.log(`Matrix created with ${totalConnections} total connections`);
    
    // Only add minimal values for empty categories if showAllNodes is true
    // This ensures categories without connections only appear when the toggle is on
    if (showAllNodes) {
      // Add a small value for every category to ensure it appears
      // This is critical for categories with no outgoing links
      for (let i = 0; i < uniqueCategories.length; i++) {
        // Ensure each category has at least a minimal value for incoming connections
        let hasIncoming = false;
        for (let j = 0; j < uniqueCategories.length; j++) {
          if (i !== j && matrix[j][i] > 0) {
            hasIncoming = true;
            break;
          }
        }
        
        if (!hasIncoming) {
          // If no incoming connections, add minimal ones from other categories
          for (let j = 0; j < uniqueCategories.length; j++) {
            if (i !== j) {
              matrix[j][i] = 0.2; // Add slightly larger value for better visibility
            }
          }
        }
        
        // Also ensure each category has at least a minimal value for outgoing connections
        let hasOutgoing = false;
        for (let j = 0; j < uniqueCategories.length; j++) {
          if (i !== j && matrix[i][j] > 0) {
            hasOutgoing = true;
            break;
          }
        }
        
        if (!hasOutgoing) {
          // If no outgoing connections, add minimal ones to other categories
          for (let j = 0; j < uniqueCategories.length; j++) {
            if (i !== j) {
              matrix[i][j] = 0.2; // Add slightly larger value for better visibility
            }
          }
        }
      }
    }

    setCategoryMatrix(matrix);
    
    // Process detailed node data for the detailed view
    const detailedNodes: DetailedNode[] = [];
    let nodeCounter = 0;
    
    // Create a sorted array of categories and nodes
    uniqueCategories.forEach((category, categoryIndex) => {
      const nodesInCategory = nodeData.filter(node => node.category === category);
      
      // Sort nodes by connection count
      const nodesWithConnectionCounts = nodesInCategory.map(node => {
        const connections = linkData.filter(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          return sourceId === node.id || targetId === node.id;
        }).length;
        
        return {
          node,
          connections
        };
      });
      
      // Sort by connection count descending
      nodesWithConnectionCounts.sort((a, b) => b.connections - a.connections);
      
      // In detailed view, skip nodes with no connections unless showAllNodes is true
      const filteredNodes = showAllNodes 
        ? nodesWithConnectionCounts 
        : nodesWithConnectionCounts.filter(item => item.connections > 0);
      
      // Add nodes to detailed nodes array
      filteredNodes.forEach(({ node, connections }, nodeIndex) => {
        detailedNodes.push({
          id: node.id,
          category: category,
          categoryIndex: categoryIndex,
          nodeIndex: nodeCounter++,
          connections
        });
      });
    });
    
    setDetailedNodeData(detailedNodes);
    
    // Create a detailed connection matrix for node-to-node relationships
    const nodeMatrix: number[][] = Array(detailedNodes.length).fill(0).map(() => 
      Array(detailedNodes.length).fill(0)
    );
    
    // Fast node lookup by id
    const nodeMap = new Map<string, number>();
    detailedNodes.forEach((node, index) => {
      nodeMap.set(node.id, index);
    });
    
    // Fill the detailed matrix with connections
    linkData.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      const sourceIndex = nodeMap.get(sourceId);
      const targetIndex = nodeMap.get(targetId);
      
      if (sourceIndex !== undefined && targetIndex !== undefined) {
        nodeMatrix[sourceIndex][targetIndex] += 1;
      }
    });
    
    setDetailedMatrix(nodeMatrix);
    setIsLoading(false);
    
    // Mark that we need to redraw
    setNeedsRedraw(true);
  } catch (error) {
    console.error("Error creating chord matrix:", error);
    setVisualizationError("Failed to create chord diagram matrix");
    setIsLoading(false);
  }
}, [
  uniqueCategories, 
  nodeData, 
  linkData, 
  showAllNodes // Only recalculate when this changes
]);

// Special function to fix SVG for export in Chord visualization
const fixSvgForExport = () => {
  if (!svgRef.current) return null;
  
  // Create a deep clone of the SVG element
  const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
  
  // Get dimensions
  const containerWidth = containerRef.current?.clientWidth || 800;
  const containerHeight = containerRef.current?.clientHeight || 600;
  
  // Explicitly set width and height
  svgClone.setAttribute('width', containerWidth.toString());
  svgClone.setAttribute('height', containerHeight.toString());
  
  // This is critical for fixing the viewBox issue
  // Reset any existing viewBox and preserve the entire content
  svgClone.setAttribute('viewBox', `0 0 ${containerWidth} ${containerHeight}`);
  
  // Get current transform from the content group
  const contentGroup = svgRef.current.querySelector('g');
  let transform = contentGroup?.getAttribute('transform') || '';
  
  // Find the main group in the clone
  const mainGroup = svgClone.querySelector('g');
  if (mainGroup) {
    // If we have a transform from zoom, apply it to ensure export matches current view
    if (transform) {
      mainGroup.setAttribute('transform', transform);
    } else {
      // Otherwise center the diagram for export
      mainGroup.setAttribute('transform', `translate(${containerWidth/2}, ${containerHeight/2})`);
    }
  }
  
  // Add a background rectangle
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('width', containerWidth.toString());
  bgRect.setAttribute('height', containerHeight.toString());
  bgRect.setAttribute('fill', colors.backgroundColor);
  bgRect.setAttribute('opacity', colors.backgroundOpacity.toString());
  bgRect.setAttribute('x', '0');
  bgRect.setAttribute('y', '0');
  
  // Insert background at beginning
  if (svgClone.firstChild) {
    svgClone.insertBefore(bgRect, svgClone.firstChild);
  } else {
    svgClone.appendChild(bgRect);
  }
  
  // Add CSS to ensure elements are visible in export
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    path { fill-opacity: ${chordOpacity}; stroke: white; stroke-width: ${chordStrokeWidth}; }
    text { font-family: Arial, sans-serif; fill: ${colors.textColor}; text-anchor: middle; }
  `;
  svgClone.insertBefore(style, svgClone.firstChild);
  
  return svgClone;
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
  
  try {
    // Create a custom SVG for export that captures the entire visualization
    const exportSvg = fixSvgForExport();
    if (!exportSvg) return;
    
    // Get dimensions
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // Serialize SVG for export
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(exportSvg);
    
    // Generate filename
    const fileName = `chord-diagram`;
    
    if (format === 'svg') {
      // Download as SVG
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      saveAs(blob, `${fileName}.svg`);
      
      toast({
        title: "Download Started",
        description: "Visualization downloading as SVG"
      });
    } else {
      // For other formats, convert to image
      const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
      const imgSrc = `data:image/svg+xml;base64,${svgBase64}`;
      
      // Create canvas for rendering
      const canvas = document.createElement('canvas');
      // Use a larger scale for better quality
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }
      
      // Fill background
      ctx.fillStyle = colors.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Load SVG into image
      const img = new Image();
      img.onload = () => {
        // Draw SVG on canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Handle different export formats
        if (format === 'png') {
          const dataUrl = canvas.toDataURL('image/png');
          saveAs(dataURItoBlob(dataUrl), `${fileName}.png`);
        } else if (format === 'jpg' || format === 'jpeg') {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          saveAs(dataURItoBlob(dataUrl), `${fileName}.jpg`);
        } else if (format === 'pdf') {
          try {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
              orientation: width > height ? 'landscape' : 'portrait',
              unit: 'px',
              format: [width, height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, width, height);
            pdf.save(`${fileName}.pdf`);
          } catch (pdfError) {
            console.error("PDF creation error:", pdfError);
            toast({
              title: "PDF Export Failed",
              description: "Could not create PDF file"
            });
            return;
          }
        }
        
        toast({
          title: "Download Started",
          description: `Visualization downloading as ${format.toUpperCase()}`
        });
      };
      
      img.onerror = (error) => {
        console.error("Error loading SVG for export:", error);
        toast({
          title: "Export Failed",
          description: "Could not render visualization for download"
        });
      };
      
      img.src = imgSrc;
    }
  } catch (error) {
    console.error("Error exporting visualization:", error);
    toast({
      title: "Export Error",
      description: `Failed to export: ${error instanceof Error ? error.message : String(error)}`
    });
  }
};

// Helper function to get category color
const getCategoryColor = (category: string) => {
  return colors.getNodeColor({ id: "", category });
};

// Helper function to get node color
const getNodeColor = (node: { id: string, category: string }) => {
  // First check for custom node color
  if (customNodeColors && customNodeColors[node.id]) {
    return customNodeColors[node.id];
  }
  
  // Otherwise use category color
  return colors.getNodeColor(node);
};

// Functions for handling zoom controls
const handleZoomIn = () => {
  if (!svgRef.current) return;
  
  const svg = d3.select(svgRef.current);
  const g = svg.select('g');
  
  if (!g.empty()) {
    // Get current transform
    const transformAttr = g.attr('transform') || '';
    const scaleMatch = transformAttr.match(/scale\(([^)]+)\)/);
    const translateMatch = transformAttr.match(/translate\(([^,]+),([^)]+)\)/);
    
    // Extract current scale and translation
    let scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    let translateX = translateMatch ? parseFloat(translateMatch[1]) : 0;
    let translateY = translateMatch ? parseFloat(translateMatch[2]) : 0;
    
    // Calculate new scale
    const newScale = scale * 1.2;
    
    // Apply new transform
    g.transition()
      .duration(300)
      .attr('transform', `translate(${translateX},${translateY}) scale(${newScale})`);
  }
};

const handleZoomOut = () => {
  if (!svgRef.current) return;
  
  const svg = d3.select(svgRef.current);
  const g = svg.select('g');
  
  if (!g.empty()) {
    // Get current transform
    const transformAttr = g.attr('transform') || '';
    const scaleMatch = transformAttr.match(/scale\(([^)]+)\)/);
    const translateMatch = transformAttr.match(/translate\(([^,]+),([^)]+)\)/);
    
    // Extract current scale and translation
    let scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
    let translateX = translateMatch ? parseFloat(translateMatch[1]) : 0;
    let translateY = translateMatch ? parseFloat(translateMatch[2]) : 0;
    
    // Calculate new scale
    const newScale = scale * 0.8;
    
    // Apply new transform
    g.transition()
      .duration(300)
      .attr('transform', `translate(${translateX},${translateY}) scale(${newScale})`);
  }
};

const handleZoomReset = () => {
  if (!svgRef.current || !containerRef.current) return;
  
  const svg = d3.select(svgRef.current);
  const g = svg.select('g');
  
  if (!g.empty()) {
    // Get container dimensions for centering
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // Reset to centered position with scale 1
    g.transition()
      .duration(300)
      .attr('transform', `translate(${width/2},${height/2}) scale(1)`);
  }
};

// Use useMemo to calculate the matrix for rendering to avoid recalculation on every render
const prepareMatrixForVisualization = useMemo(() => {
  if (!categoryMatrix.length) return [];
  
  let matrixToUse: number[][] = [];
  
  if (showDetailedView) {
    // For detailed view, directly use the detailed matrix with some enhancements
    matrixToUse = detailedMatrix.map(row => 
      row.map(value => value === 0 ? 0.1 : value) // Add minimal values to ensure all connections
    );
  } else {
    // Start with the category matrix including our minimal connection values
    matrixToUse = [...categoryMatrix.map(row => [...row])]; // Deep copy
  }
  
  // Apply even distribution if selected
  if (evenDistribution && !showDetailedView) {
    // For category view with even distribution
    matrixToUse = matrixToUse.map(row => {
      const rowSum = row.reduce((a, b) => a + b, 0);
      if (rowSum <= 0.2 * (uniqueCategories.length - 1)) {
        // If just minimal connections, enhance them slightly for visibility
        return row.map(val => val === 0 ? 0 : (val <= 0.2 ? 0.3 : val));
      }
      
      // Calculate a base value for distribution
      return row.map((val, idx) => {
        // Keep diagonal at 0
        if (row === matrixToUse[idx]) return 0;
        // Scale other values - ensure minimal values stay visible
        return val <= 0.2 ? 0.3 : Math.max(1, val / rowSum * 10);
      });
    });
  }
  
  // Force symmetrical connections to ensure all groups are displayed
  // This is critical for showing categories that only have incoming or outgoing connections
  if (!showDetailedView) {
    for (let i = 0; i < uniqueCategories.length; i++) {
      for (let j = 0; j < uniqueCategories.length; j++) {
        if (i !== j) {
          // Ensure both directions have some value when either has a value
          const maxVal = Math.max(matrixToUse[i][j], matrixToUse[j][i]);
          if (maxVal > 0) {
            if (matrixToUse[i][j] === 0) matrixToUse[i][j] = 0.1;
            if (matrixToUse[j][i] === 0) matrixToUse[j][i] = 0.1;
          }
        }
      }
    }
  }
  
  return matrixToUse;
}, [
  categoryMatrix, 
  detailedMatrix, 
  showDetailedView, 
  evenDistribution, 
  uniqueCategories
]);

// Render the chord diagram
useEffect(() => {
  if (isLoading || !svgRef.current || !containerRef.current || uniqueCategories.length === 0 || !needsRedraw) {
    return;
  }

  try {
    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const outerRadius = Math.min(width, height) * 0.5 - 60;
    const innerRadius = outerRadius - 20;

    // Get matrix to use from our memoized function
    let matrixToUse = prepareMatrixForVisualization;
    
    // Create the chord layout with special configuration to preserve all groups
    const chord = d3.chord()
      .padAngle(0.03) // Smaller pad angle
      .sortSubgroups(d3.descending);

    const chords = chord(matrixToUse);
    
    // Debug info
    console.log(`Generated ${chords.groups.length} chord groups out of ${uniqueCategories.length} categories`);
    
    // Create explicit group data to ensure all categories are represented
    let groupData = [...chords.groups]; // Start with the existing chord groups
    
    // Check for missing categories
    const existingIndices = new Set(groupData.map(g => g.index));
    for (let i = 0; i < uniqueCategories.length; i++) {
      if (!existingIndices.has(i)) {
        console.log(`Adding missing group for category ${uniqueCategories[i]} at index ${i}`);
        // Calculate an appropriate angle for this missing group
        const segmentAngle = 2 * Math.PI / uniqueCategories.length;
        const startAngle = i * segmentAngle;
        const endAngle = startAngle + segmentAngle * 0.9; // 90% of full segment
        
        // Add the missing group with minimal value
        groupData.push({
          index: i,
          startAngle,
          endAngle,
          value: 0.5 // Minimal value for visibility
        });
      }
    }
    
    // Sort groups by index to maintain consistent ordering
    groupData.sort((a, b) => a.index - b.index);

    // Create the arc generator
    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);
    
    // Create the ribbon generator
    const ribbon = d3.ribbon()
      .radius(innerRadius - 1); // Slightly smaller to prevent overlap

    // Create main visualization group centered in the SVG
    const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);
    
    // Store reference to the content group
    contentRef.current = g.node() as SVGGElement;

    // Add the groups (arcs) - using our potentially modified groupData
    const groups = g.append("g")
      .selectAll("g")
      .data(groupData)
      .join("g");

    // Add the arc paths with enhanced visual styling and dynamic opacity
    groups.append("path")
      .attr("fill", (d) => {
        if (showDetailedView) {
          // For detailed view, get the node's category
          if (d.index < detailedNodeData.length) {
            const node = detailedNodeData[d.index];
            return getCategoryColor(node.category);
          }
          return "#999"; // Fallback
        } else {
          // For category view - use the index from the data point itself
          return getCategoryColor(uniqueCategories[d.index]);
        }
      })
      .attr("stroke", "#ffffff")
      .attr("stroke-width", chordStrokeWidth) // Use dynamic stroke width
      .attr("opacity", arcOpacity) // Apply opacity from state
      .attr("d", arc as any);

    // Add labels for each group
    groups.append("text")
      .each((d: any) => { d.angle = (d.startAngle + d.endAngle) / 2; })
      .attr("dy", ".35em")
      .attr("transform", (d: any) => {
        // Position text based on angle
        return `rotate(${(d.angle * 180 / Math.PI - 90)})` +
          `translate(${outerRadius + 10})` +
          `${d.angle > Math.PI ? "rotate(180)" : ""}`;
      })
      .attr("text-anchor", (d: any) => d.angle > Math.PI ? "end" : "start")
      .text((d) => {
        if (showDetailedView) {
          // For detailed view, show node name
          if (d.index < detailedNodeData.length) {
            const node = detailedNodeData[d.index];
            return node.id;
          }
          return ""; // Fallback
        } else {
          // For category view, show category name and count
          const category = uniqueCategories[d.index];
          const count = categoryNodeCounts[category] || 0;
          return `${category} (${count})`;
        }
      })
      .style("font-size", () => showDetailedView ? "8px" : "11px") // Larger text
      .style("font-weight", "500") // Slightly bold
      .style("fill", colors.textColor)
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.4)"); // Add text shadow for better contrast

    // Add the chords (ribbons) with enhanced visual styling and dynamic opacity/stroke
    g.append("g")
      .attr("fill-opacity", ribbonFillEnabled ? chordOpacity : 0) // Use 0 opacity for stroke-only mode
      .selectAll("path")
      .data(chords)
      .join("path")
      .attr("d", ribbon as any)
      .attr("fill", d => {
        // If using monochrome ribbons, return a neutral color
        if (!useColoredRibbons) {
          return "#999999"; // Neutral gray for monochrome mode
        }
        
        // Otherwise use category colors
        if (showDetailedView) {
          // For detailed view, use source node's category
          if (d.source.index < detailedNodeData.length) {
            const sourceNode = detailedNodeData[d.source.index];
            return getCategoryColor(sourceNode.category);
          }
          return "#999"; // Fallback
        } else {
          // For category view, use source category color
          const sourceCategory = uniqueCategories[d.source.index];
          return getCategoryColor(sourceCategory);
        }
      })
      .attr("stroke", d => {
        // For monochrome mode, use a darker gray for stroke
        if (!useColoredRibbons) {
          return d3.rgb("#777777").toString();
        }
        
        // Otherwise, apply a slightly darker stroke color based on the fill
        if (showDetailedView && d.source.index < detailedNodeData.length) {
          const sourceNode = detailedNodeData[d.source.index];
          const baseColor = getCategoryColor(sourceNode.category);
          // Darken the color for stroke - simple approach
          return d3.rgb(baseColor).darker(0.8).toString();
        } else {
          const baseColor = getCategoryColor(uniqueCategories[d.source.index]);
          return d3.rgb(baseColor).darker(0.8).toString();
        }
      })
      .attr("stroke-width", chordStrokeWidth) // Use dynamic stroke width
      .attr("stroke-opacity", chordStrokeOpacity) // Use dynamic stroke opacity
      .style("opacity", d => {
        // In stroke-only mode, ensure better visibility by using a higher opacity
        if (!ribbonFillEnabled) {
          return 1.0;
        }
        
        // Vary opacity based on connection strength for visual interest
        if (showDetailedView) {
          if (d.source.index < detailedNodeData.length && d.target.index < detailedNodeData.length) {
            const value = detailedMatrix[d.source.index][d.target.index];
            // Scale opacity between 0.5 and 0.9 based on value
            return Math.max(0.5, Math.min(0.9, 0.5 + value / 10));
          }
        } else {
          // For category matrix, scale opacity based on connection strength
          if (d.source.index < categoryMatrix.length && d.target.index < categoryMatrix[0].length) {
            const value = categoryMatrix[d.source.index][d.target.index];
            if (value <= 0.2) return 0.5; // Minimal connections get base opacity
            // Scale between 0.6 and 0.9 for actual connections
            return Math.max(0.6, Math.min(0.9, 0.6 + value / 20));
          }
        }
        return 0.6; // Default opacity
      })
      .on("click", function(event, d) {
        event.stopPropagation(); // Stop event propagation
        
        // Highlight this chord
        d3.select(this)
          .style("opacity", 1)
          .attr("stroke-width", chordStrokeWidth * 1.5)
          .attr("stroke", "#ffffff");
      
        // Get tooltip details based on view mode
        let tooltipContent = "";
        
        if (showDetailedView) {
          // Detailed node-to-node connection info
          if (d.source.index < detailedNodeData.length && d.target.index < detailedNodeData.length) {
            const sourceNode = detailedNodeData[d.source.index];
            const targetNode = detailedNodeData[d.target.index];
            const value = detailedMatrix[d.source.index][d.target.index];
            
            tooltipContent = `
              <div class="font-medium text-base">${sourceNode.id} → ${targetNode.id}</div>
              <div class="text-sm mt-1">${sourceNode.category} → ${targetNode.category}</div>
              <div class="mt-1 border-t pt-1 border-white/20">Connections: <span class="font-bold">${value}</span></div>
              <div class="text-xs mt-2 text-blue-300">Click elsewhere to dismiss</div>
            `;
          } else {
            tooltipContent = "<div class='text-center py-1'>No detailed data available</div>";
          }
        } else {
          // Category-to-category connection info
          const sourceCategory = uniqueCategories[d.source.index];
          const targetCategory = uniqueCategories[d.target.index];
          
          // Get the actual value from our matrix
          let value = "Minimal";
          if (d.source.index < categoryMatrix.length && d.target.index < categoryMatrix[0].length) {
            const actualValue = categoryMatrix[d.source.index][d.target.index];
            if (actualValue > 0.2) value = actualValue.toString();
          }
          
          tooltipContent = `
            <div class="font-medium text-base">${sourceCategory} → ${targetCategory}</div>
            <div class="mt-1 border-t pt-1 border-white/20">Connections: <span class="font-bold">${value}</span></div>
            <div class="text-xs mt-2 text-blue-300">Click elsewhere to dismiss</div>
          `;
        }
        
        // Show tooltip - using container relative positioning
        const tooltip = d3.select(tooltipRef.current);
        const containerRect = containerRef.current.getBoundingClientRect();
        
        // Calculate position relative to the container
        const xPos = event.clientX - containerRect.left + 15;
        const yPos = event.clientY - containerRect.top - 10;
        
        tooltip
          .style("visibility", "visible")
          .style("opacity", "1")
          .style("left", `${xPos}px`)
          .style("top", `${yPos}px`)
          .style("pointer-events", "auto") // Make tooltip clickable
          .html(tooltipContent);
      })
      .attr("cursor", "pointer"); // Just add a pointer cursor instead

    // Add a title showing relationship info on hover
    groups
    .on("click", function(event, d) {
      event.stopPropagation(); // Stop event propagation
      
      // Highlight this arc
      d3.select(this).select("path")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", chordStrokeWidth * 1.5);
        
       // Enhanced tooltip for group hovering
       let tooltipContent = "";
        
       if (showDetailedView) {
         // Individual node info
         if (d.index < detailedNodeData.length) {
           const node = detailedNodeData[d.index];
           const category = node.category;
           
           // Count connections
           const outgoing = detailedMatrix[d.index].reduce((sum, val) => sum + val, 0);
           const incoming = detailedMatrix.reduce((sum, row) => sum + row[d.index], 0);
           
           tooltipContent = `
             <div class="font-medium text-base pb-1">${node.id}</div>
             <div class="text-sm">Category: <span class="font-medium">${category}</span></div>
             <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
               <div>
                 <span class="text-xs text-white/70">Outgoing</span><br>
                 <span class="font-bold">${outgoing}</span>
               </div>
               <div>
                 <span class="text-xs text-white/70">Incoming</span><br>
                 <span class="font-bold">${incoming}</span>
               </div>
               <div class="col-span-2 border-t border-white/20 pt-1 text-center">
                 <span class="text-xs text-white/70">Total</span>
                 <span class="font-bold ml-2">${outgoing + incoming}</span>
               </div>
             </div>
             <div class="text-xs mt-2 text-blue-300">Click elsewhere to dismiss</div>
           `;
         } else {
           tooltipContent = "<div class='text-center py-1'>No detailed data available</div>";
         }
       } else {
         // Category info
         const index = d.index;
         if (index < uniqueCategories.length) {
           const category = uniqueCategories[index];
           
           // Count outgoing and incoming connections
           let outgoing = 0;
           let incoming = 0;
           
           if (index < categoryMatrix.length) {
             outgoing = categoryMatrix[index].reduce((sum, val) => sum + val, 0);
             incoming = categoryMatrix.reduce((sum, row) => 
               index < row.length ? sum + row[index] : sum, 0);
           }
           
           // Format display values
           const outgoingDisplay = outgoing > 0.2 ? outgoing.toFixed(0) : 'None/Minimal';
           const incomingDisplay = incoming > 0.2 ? incoming.toFixed(0) : 'None/Minimal';
           const totalDisplay = outgoing + incoming > 0.4 ? (outgoing + incoming).toFixed(0) : 'None/Minimal';
           
           tooltipContent = `
             <div class="font-medium text-base pb-1">${category}</div>
             <div class="text-sm">Nodes: <span class="font-medium">${categoryNodeCounts[category] || 0}</span></div>
             <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
               <div>
                 <span class="text-xs text-white/70">Outgoing</span><br>
                 <span class="font-bold">${outgoingDisplay}</span>
               </div>
               <div>
                 <span class="text-xs text-white/70">Incoming</span><br>
                 <span class="font-bold">${incomingDisplay}</span>
               </div>
               <div class="col-span-2 border-t border-white/20 pt-1 text-center">
                 <span class="text-xs text-white/70">Total</span>
                 <span class="font-bold ml-2">${totalDisplay}</span>
               </div>
             </div>
             <div class="text-xs mt-2 text-blue-300">Click elsewhere to dismiss</div>
           `;
         } else {
           tooltipContent = "<div class='text-center py-1'>Category data not available</div>";
         }
       }
       
       // Show tooltip - using container relative positioning
       const tooltip = d3.select(tooltipRef.current);
       const containerRect = containerRef.current.getBoundingClientRect();
       
       // Calculate position relative to the container
       const xPos = event.clientX - containerRect.left + 15;
       const yPos = event.clientY - containerRect.top - 10;
         
       tooltip
         .style("visibility", "visible")
         .style("opacity", "1")
         .style("left", `${xPos}px`)
         .style("top", `${yPos}px`)
         .style("pointer-events", "auto") // Make tooltip clickable
         .style("background-color", "rgba(0, 0, 0, 0.85)")
         .style("border", "1px solid rgba(255, 255, 255, 0.2)")
         .style("box-shadow", "0 4px 15px rgba(0, 0, 0, 0.3)")
         .html(tooltipContent);
    })
    .attr("cursor", "pointer"); // Just add a pointer cursor instead

    // Set background color
    if (containerRef.current) {
      const { r, g, b } = colors.rgbBackgroundColor;
      containerRef.current.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${colors.backgroundOpacity})`;
    }

    // Reset the redraw flag
    setNeedsRedraw(false);

  } catch (error) {
    console.error("Error rendering chord diagram:", error);
    setVisualizationError("Failed to render chord diagram");
  }
}, [
  isLoading, 
  needsRedraw, // Only redraw when this flag is set
  prepareMatrixForVisualization, // Use memoized matrix
  chordStrokeWidth,
  chordOpacity,
  arcOpacity,
  colors,
  detailedNodeData,
  showDetailedView,
  uniqueCategories,
  categoryNodeCounts,
  categoryMatrix,
  detailedMatrix
]);

// Effect for handling view mode changes - sets the redraw flag
useEffect(() => {
  if (!isLoading) {
    setNeedsRedraw(true);
  }
}, [
  showDetailedView, 
  showAllNodes, 
  evenDistribution, 
  chordStrokeWidth, 
  chordOpacity,
  chordStrokeOpacity, 
  arcOpacity,
  useColoredRibbons,
  ribbonFillEnabled
]);

useEffect(() => {
  const handleDocumentClick = (event: MouseEvent) => {
    // Skip if we're not clicked on a tooltip or a chord/arc
    if (!tooltipRef.current) return;
    
    // Check if clicked element is inside tooltip
    const isTooltip = tooltipRef.current.contains(event.target as unknown as globalThis.Node);
    
    // Check if clicked element is a chord or arc
    const isChordOrArc = (
      (event.target instanceof SVGPathElement && event.target.closest('svg') === svgRef.current) ||
      (event.target instanceof SVGGElement && event.target.closest('svg') === svgRef.current)
    );
    
    if (!isTooltip && !isChordOrArc) {
      // Hide tooltip when clicked elsewhere
      d3.select(tooltipRef.current)
        .style("opacity", "0")
        .style("visibility", "hidden");
      
      // Reset any highlighted elements
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll("path")
          .style("opacity", null)
          .attr("stroke-width", null);
      }
    }
  };
  
  // Add the event listener
  document.addEventListener('click', handleDocumentClick);
  
  // Clean up
  return () => {
    document.removeEventListener('click', handleDocumentClick);
  };
}, []);

// Update colors when theme changes
useEffect(() => {
  if (isLoading || !svgRef.current) return;

  // Set redraw flag to true when colors change
  setNeedsRedraw(true);
  
}, [colors.colorTheme, colors.textColor, colors.backgroundColor, colors.backgroundOpacity]);

// Handle window resize
useEffect(() => {
  const handleResize = () => {
    setNeedsRedraw(true);
  };

  window.addEventListener('resize', handleResize);
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);

// Toggle detailed view handler
const handleToggleDetailedView = () => {
  setShowDetailedView(prev => !prev);
  
  // Notify user of mode change
  toast({
    title: showDetailedView ? "Category View" : "Detailed View",
    description: showDetailedView 
      ? "Showing connections between categories" 
      : "Showing connections between individual nodes",
  });
};

// Toggle show all nodes handler
const handleToggleShowAllNodes = () => {
  setShowAllNodes(prev => !prev);
  
  // Notify user of mode change
  toast({
    title: showAllNodes ? "Showing Connected Nodes Only" : "Showing All Nodes",
    description: showAllNodes 
      ? "Only displaying nodes with actual connections" 
      : "Displaying all nodes even without connections",
  });
};

// Toggle ribbon fill handler
const handleToggleRibbonFill = () => {
  setRibbonFillEnabled(prev => !prev);
  
  // Notify user of mode change
  toast({
    title: ribbonFillEnabled ? "Stroke-Only Ribbons" : "Filled Ribbons",
    description: ribbonFillEnabled 
      ? "Showing only strokes for a more minimal look" 
      : "Using filled ribbons with color and opacity",
  });
};

// Handle chord stroke opacity change
const handleChordStrokeOpacityChange = (opacity: number) => {
  setChordStrokeOpacity(opacity);
  setNeedsRedraw(true);
};

// Toggle sidebar state handler
const handleToggleSidebar = () => {
  setIsSidebarCollapsed(prev => !prev);
};

// Handlers for chord diagram settings
const handleChordStrokeWidthChange = (width: number) => {
  setChordStrokeWidth(width);
  setNeedsRedraw(true);
};

const handleChordOpacityChange = (opacity: number) => {
  setChordOpacity(opacity);
  setNeedsRedraw(true);
};

const handleArcOpacityChange = (opacity: number) => {
  setArcOpacity(opacity);
  setNeedsRedraw(true);
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

const handlers = {
  handleParameterChange: (type: string, value: number) => {
    if (type === "nodeSize") {
      colors.setNodeSize(value);
      setNeedsRedraw(true);
    }
  },
  handleNodeGroupChange: () => {},
  handleColorThemeChange: (theme: string) => {
    colors.setColorTheme(theme);
    setNeedsRedraw(true);
  },
  handleApplyGroupColors: () => {},
  handleApplyIndividualColor: () => {},
  handleResetIndividualColor: () => {},
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
    setNeedsRedraw(true);
  },
  handleResetBackgroundColors: () => {
    colors.resetBackgroundColors();
    setNeedsRedraw(true);
  },
  handleResetSimulation: () => {
    setNeedsRedraw(true);
  },
  handleResetGraph: () => {
    colors.resetAllColors();
    setNeedsRedraw(true);
  },
  toggleSection: (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
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
  // New handlers for chord diagram settings
  handleChordStrokeWidthChange,
  handleChordOpacityChange,
  handleArcOpacityChange
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
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ overflow: "visible" }}
          />
          
          {/* Use the updated VisualizationControls component */}
          <VisualizationControls
            containerRef={containerRef}
            nodeData={nodeData as NodeData[]}
            linkData={linkData.map(link => ({
              ...link,
              source: typeof link.source === 'object' ? link.source.id : link.source,
              target: typeof link.target === 'object' ? link.target.id : link.target,
            }))}
            visualizationType={visualizationType}
            onDownloadData={() => {}}
            onDownloadGraph={handleDownloadGraph}
            onResetSelection={() => setNeedsRedraw(true)}
            showZoomControls={false}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleZoomReset}
            chordStrokeWidth={chordStrokeWidth}
            chordOpacity={chordOpacity}
            chordStrokeOpacity={chordStrokeOpacity}
            arcOpacity={arcOpacity}
            onChordStrokeWidthChange={handleChordStrokeWidthChange}
            onChordOpacityChange={handleChordOpacityChange}
            onChordStrokeOpacityChange={handleChordStrokeOpacityChange}
            onArcOpacityChange={handleArcOpacityChange}
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
            categories={uniqueCategories}
            colorTheme={colors.colorTheme}
            dynamicColorThemes={colors.dynamicColorThemes}
            colorPalette={Object.values(colors.dynamicColorThemes.default || {})}
          />
          
          {/* Control Panel with all toggles */}
          <div className="absolute bottom-4 left-4 z-10">
            {/* Collapsible panel */}
            <div 
              className={`bg-black/70 text-white rounded-md transition-all duration-300 overflow-hidden ${
                controlsPanelVisible ? 'max-h-72 opacity-100' : 'max-h-10 opacity-90'
              }`}
            >
              {/* Toggle header */}
              <div 
                className="px-3 py-2 flex justify-between items-center cursor-pointer"
                onClick={() => setControlsPanelVisible(!controlsPanelVisible)}
              >
                <span className="text-sm font-medium">Chord Controls</span>
                <button className="text-white/70 hover:text-white">
                  {controlsPanelVisible ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Panel content - only visible when expanded */}
              <div className={`px-3 pb-2 ${controlsPanelVisible ? 'block' : 'hidden'}`}>
                <div className="text-xs mb-2">Hover over arcs and chords for details. The chord width shows connection strength.</div>
                
                {/* Visualization Mode Controls */}
                <div className="border-t border-white/10 mt-2 pt-2">
                  <h3 className="text-xs font-semibold mb-1 text-white/80">Visualization Mode</h3>
                  
                  {/* Distribution Control */}
                  <div className="flex items-center mt-1">
                    <label className="flex items-center cursor-pointer">
                      <div className="relative mr-2">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={evenDistribution}
                          onChange={() => setEvenDistribution(!evenDistribution)}
                        />
                        <div className={`w-8 h-4 rounded-full transition-colors ${evenDistribution ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
                        <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${evenDistribution ? 'translate-x-4' : ''}`}></div>
                      </div>
                      <span className="text-xs">Even Distribution</span>
                    </label>
                  </div>
                  
                  {/* Show All Nodes Control */}
                  <div className="flex items-center mt-1">
                    <label className="flex items-center cursor-pointer">
                      <div className="relative mr-2">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={showAllNodes}
                          onChange={handleToggleShowAllNodes}
                        />
                        <div className={`w-8 h-4 rounded-full transition-colors ${showAllNodes ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                        <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${showAllNodes ? 'translate-x-4' : ''}`}></div>
                      </div>
                      <span className="text-xs">Show All Nodes</span>
                    </label>
                  </div>
                  
                  {/* Detailed View Control */}
                  <div className="flex items-center mt-1">
                    <label className="flex items-center cursor-pointer">
                      <div className="relative mr-2">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={showDetailedView}
                          onChange={handleToggleDetailedView}
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
                </div>
                
                {/* Ribbon Style Controls */}
                <div className="border-t border-white/10 mt-2 pt-2">
                  <h3 className="text-xs font-semibold mb-1 text-white/80">Ribbon Style</h3>
                  
                  {/* Colored Ribbons Control */}
                  <div className="flex items-center mt-1">
                    <label className="flex items-center cursor-pointer">
                      <div className="relative mr-2">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={useColoredRibbons}
                          onChange={handleToggleColoredRibbons}
                        />
                        <div className={`w-8 h-4 rounded-full transition-colors ${useColoredRibbons ? 'bg-pink-500' : 'bg-gray-500'}`}></div>
                        <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${useColoredRibbons ? 'translate-x-4' : ''}`}></div>
                      </div>
                      <span className="text-xs">Colored Ribbons</span>
                    </label>
                  </div>
                  
                  {/* Ribbon Fill Control */}
                  <div className="flex items-center mt-1">
                    <label className="flex items-center cursor-pointer">
                      <div className="relative mr-2">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={ribbonFillEnabled}
                          onChange={handleToggleRibbonFill}
                        />
                        <div className={`w-8 h-4 rounded-full transition-colors ${ribbonFillEnabled ? 'bg-indigo-500' : 'bg-gray-500'}`}></div>
                        <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform transform ${ribbonFillEnabled ? 'translate-x-4' : ''}`}></div>
                      </div>
                      <span className="text-xs">Filled Ribbons</span>
                    </label>
                  </div>
                </div>
                
                {/* Opacity & Width Controls */}
                <div className="border-t border-white/10 mt-2 pt-2">
                  <h3 className="text-xs font-semibold mb-1 text-white/80">Opacity & Width</h3>
                  
                  {/* Fill Opacity Control - only enabled when filled ribbons is on */}
                  <div className="flex items-center justify-between mt-1 text-xs">
                    <label className={ribbonFillEnabled ? '' : 'text-gray-500'}>Fill: {chordOpacity.toFixed(2)}</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={chordOpacity}
                      disabled={!ribbonFillEnabled}
                      onChange={(e) => setChordOpacity(parseFloat(e.target.value))}
                      className={`w-28 h-2 ${ribbonFillEnabled ? 'bg-gray-200' : 'bg-gray-700'} rounded-lg appearance-none cursor-pointer`}
                    />
                  </div>
                  
                  {/* Stroke Opacity Control */}
                  <div className="flex items-center justify-between mt-1 text-xs">
                    <label>Stroke: {chordStrokeOpacity.toFixed(2)}</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={chordStrokeOpacity}
                      onChange={(e) => setChordStrokeOpacity(parseFloat(e.target.value))}
                      className="w-28 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  {/* Stroke Width Control */}
                  <div className="flex items-center justify-between mt-1 text-xs">
                    <label>Width: {chordStrokeWidth.toFixed(1)}</label>
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.1"
                      value={chordStrokeWidth}
                      onChange={(e) => setChordStrokeWidth(parseFloat(e.target.value))}
                      className="w-28 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  {/* Arc Opacity Control */}
                  <div className="flex items-center justify-between mt-1 text-xs">
                    <label>Arc: {arcOpacity.toFixed(2)}</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={arcOpacity}
                      onChange={(e) => setArcOpacity(parseFloat(e.target.value))}
                      className="w-28 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
                
                {/* Show additional info about current view */}
                <div className="mt-2 text-xs text-gray-300 border-t border-white/10 pt-2">
                  {showDetailedView
                    ? `${detailedNodeData.length} nodes with connections`
                    : `${uniqueCategories.length} categories with relationships`
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
    nodeData={nodeData}
    linkData={linkData}
    onCreditsClick={onCreditsClick}
    isLoading={isLoading}
    visualizationError={visualizationError}
    selectedNode={selectedNode}
    selectedNodeConnections={selectedNodeConnections}
    expandedSections={expandedSections}
    uniqueCategories={uniqueCategories}
    nodeCounts={nodeCounts}
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

function setUseColoredRibbons(arg0: (prev: any) => boolean) {
  throw new Error('Function not implemented.');
}
