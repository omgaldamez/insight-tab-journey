import React, { useEffect, useRef, useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import * as d3 from 'd3';
import { NodeData, LinkData } from "@/types/types";
import { AlertCircle } from "lucide-react";
import { VisualizationType } from "./NetworkSidebar";
import VisualizationControls from "./VisualizationControls";
import useNetworkColors from "@/hooks/useNetworkColors";
import useZoomPan from "@/hooks/useZoomPan";
import useFullscreenStyles from "@/hooks/useFullscreenStyles";
import { saveAs } from 'file-saver';
import { jsPDF } from "jspdf";
import { dataURItoBlob } from '@/utils/visualizationUtils';

interface ArcVisualizationProps {
  onCreditsClick?: () => void;
  nodeData: NodeData[];
  linkData: LinkData[];
  visualizationType: VisualizationType;
  onVisualizationTypeChange: (type: VisualizationType) => void;
  // Style properties
  colorTheme?: string;
  nodeSize?: number;
  linkColor?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  customNodeColors?: {[key: string]: string};
  dynamicColorThemes?: Record<string, Record<string, string>>;
  // Download/export functions
  onDownloadData?: (format: string) => void;
  onDownloadGraph?: (format: string) => void;
  onResetSelection?: () => void;
}

interface Node {
  id: string;
  category: string;
  index?: number;
  x?: number;
  y?: number;
}

interface Link {
  source: string | Node;
  target: string | Node;
  value?: number;
}

// Default color palette for direct category mapping when themes fail
const DEFAULT_COLOR_PALETTE = [
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
];

const ArcVisualization: React.FC<ArcVisualizationProps> = ({
  onCreditsClick = () => {},
  nodeData = [],
  linkData = [],
  visualizationType,
  onVisualizationTypeChange,
  colorTheme = 'default',
  nodeSize = 1.0,
  linkColor = '#999999',
  backgroundColor = '#f5f5f5',
  backgroundOpacity = 1.0,
  customNodeColors = {},
  dynamicColorThemes = {},
  onDownloadData,
  onDownloadGraph,
  onResetSelection
}) => {
  const { toast } = useToast();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<SVGGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [visualizationError, setVisualizationError] = useState<string | null>(null);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [processedData, setProcessedData] = useState<{ nodes: Node[], links: Link[] }>({ nodes: [], links: [] });
  const [dataLoaded, setDataLoaded] = useState(false);
  const visualizationInitialized = useRef(false);
  const zoomRef = useRef<d3.ZoomBehavior<Element, unknown> | null>(null);
  const renderAttemptRef = useRef(0);
  const [renderKey, setRenderKey] = useState(0);
  
  // Use the network colors hook
  const colors = useNetworkColors({
    initialColorTheme: colorTheme,
    initialNodeSize: nodeSize,
    initialLinkColor: linkColor,
    initialBackgroundColor: backgroundColor,
    initialTextColor: "#333333",
    initialNodeStrokeColor: "#ffffff",
    initialBackgroundOpacity: backgroundOpacity,
    initialCustomNodeColors: customNodeColors,
    initialDynamicColorThemes: dynamicColorThemes
  });

  // Use zoom and pan functionality
  const { 
    zoomToFit, 
    zoomIn, 
    zoomOut, 
    resetZoom, 
    getTransform,
    isZoomInitialized,
    reinitializeZoom
  } = useZoomPan({
    svgRef, 
    contentRef,
    containerRef,
    isReady: !isLoading && processedData.nodes.length > 0,
    nodesDraggable: true
  });

  // Apply fullscreen styles
  useFullscreenStyles();

  // Simple hexToRgb utility
  const hexToRgb = useCallback((hex: string): {r: number, g: number, b: number} => {
    // Default fallback color
    const fallback = {r: 245, g: 245, b: 245};
    
    // Regular expression to extract RGB components
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return fallback;
    
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
  }, []);

  // Process the imported data once
  useEffect(() => {
    // Skip if we've already processed the data
    if (dataLoaded && processedData.nodes.length > 0) {
      console.log("Arc data already processed, skipping");
      return;
    }

    if (nodeData.length === 0 || linkData.length === 0) {
      return;
    }

    try {
      console.log("Processing data for Arc visualization");
      
      // Process nodes
      const processedNodes: Node[] = nodeData.map(node => ({
        id: node.id,
        category: node.category
      }));

      // Process links
      const processedLinks: Link[] = linkData.map(link => ({
        source: link.source,
        target: link.target
      }));

      // Find unique categories
      const categories = processedNodes.map(node => node.category);
      const uniqueCats = Array.from(new Set(categories));
      setUniqueCategories(uniqueCats);
      
      // Generate color themes if needed
      if (uniqueCats.length > 0 && 
          (!colors.dynamicColorThemes.default || 
           Object.keys(colors.dynamicColorThemes.default).length === 0)) {
        colors.generateDynamicColorThemes(uniqueCats);
      }

      setProcessedData({ nodes: processedNodes, links: processedLinks });
      setDataLoaded(true);
      setIsLoading(false);
      
    } catch (error) {
      console.error("Error processing arc data:", error);
      setVisualizationError(`Data processing error: ${error instanceof Error ? error.message : String(error)}`);
      setIsLoading(false);
      
      toast({
        title: "Data Processing Error",
        description: "Failed to process the uploaded data files",
        variant: "destructive"
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeData, linkData]);
  
  // Force a render after a small delay - this helps with container sizing
  useEffect(() => {
    const timer = setTimeout(() => {
      setRenderKey(prev => prev + 1);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Schedule additional render attempts if visualization isn't initialized
  useEffect(() => {
    if (visualizationInitialized.current) return;
    
    const attemptRender = () => {
      if (visualizationInitialized.current) return;
      
      renderAttemptRef.current += 1;
      console.log(`Arc visualization render attempt ${renderAttemptRef.current}`);
      
      // Force a re-render
      setRenderKey(prev => prev + 1);
      
      // Schedule another attempt if we haven't succeeded and haven't tried too many times
      if (!visualizationInitialized.current && renderAttemptRef.current < 5) {
        setTimeout(attemptRender, 300 * renderAttemptRef.current); // Increase delay with each attempt
      }
    };
    
    // Start the first scheduled attempt
    const timer = setTimeout(attemptRender, 300);
    return () => clearTimeout(timer);
  }, []);

  // Special function to fix SVG for export in Arc visualization
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
    
    // Reset any transform on the main group to capture everything
    const mainGroup = svgClone.querySelector('g');
    if (mainGroup) {
      // Store original transform to apply later if needed
      const originalTransform = mainGroup.getAttribute('transform');
      
      // If the main group has a transform to center content, keep it
      if (originalTransform && originalTransform.includes('translate')) {
        // Keep the transform
      } else {
        // Otherwise reset transform
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
      .link { stroke: ${colors.linkColor}; stroke-opacity: 0.85; }
      .node { fill-opacity: 1; stroke: ${colors.nodeStrokeColor || '#fff'}; }
      .node-label { fill: ${colors.textColor}; }
      text { font-family: Arial, sans-serif; }
    `;
    svgClone.insertBefore(style, svgClone.firstChild);
    
    return svgClone;
  };

  // Custom download function for Arc visualization
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
      const fileName = `arc-diagram`;
      
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

  // Create D3 visualization
  useEffect(() => {
    if (isLoading || !svgRef.current || !containerRef.current || processedData.nodes.length === 0) {
      return;
    }
    
    console.log("Creating D3 Arc visualization");
    
    try {
      // Clear any existing elements
      d3.select(svgRef.current).selectAll("*").remove();
      
      // Get container dimensions
      const containerWidth = containerRef.current.clientWidth || 800;
      const containerHeight = containerRef.current.clientHeight || 600;
      
      console.log(`Arc visualization container size: ${containerWidth}x${containerHeight}`);
      
      // Set explicit SVG dimensions to match container
      const svg = d3.select(svgRef.current)
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet");
      
      // Create a main container group for the visualization that will be centered
      const g = svg.append("g")
        .attr("transform", `translate(${containerWidth/2}, ${containerHeight/2})`)
        .attr("class", "main-container");
      
      contentRef.current = g.node() as SVGGElement;
      
      // Add a background for the visualization area
      g.append("rect")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .attr("x", -containerWidth/2)
        .attr("y", -containerHeight/2)
        .attr("fill", colors.backgroundColor)
        .attr("opacity", colors.backgroundOpacity);
      
      // Add a legend
      const legendData = uniqueCategories.map(category => ({
        category,
        color: colors.dynamicColorThemes[colors.colorTheme]?.[category] || 
               d3.schemeCategory10[uniqueCategories.indexOf(category) % 10]
      }));

      const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${containerWidth/2 - 150}, ${-containerHeight/2 + 30})`);
      
      const legendTitle = legend.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .attr("font-size", "12px")
        .text("Categories");
        
      const legendItems = legend.selectAll(".legend-item")
        .data(legendData)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);
        
      legendItems.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", d => d.color);
        
      legendItems.append("text")
        .attr("x", 15)
        .attr("y", 8)
        .attr("font-size", "10px")
        .text(d => d.category);
      
      // Create a map of nodes for faster lookup
      const nodeMap = new Map(processedData.nodes.map(node => [node.id, node]));
      
      // Group nodes by category
      const nodesByCategory = d3.group(processedData.nodes, d => d.category);
      
      // Sort categories by number of nodes
      const sortedCategories = Array.from(nodesByCategory.keys())
        .sort((a, b) => {
          const nodesA = nodesByCategory.get(a) || [];
          const nodesB = nodesByCategory.get(b) || [];
          return nodesB.length - nodesA.length;
        });
      
      // Position nodes in an arc layout
      const totalNodes = processedData.nodes.length;
      const arcLength = Math.PI; // Half circle
      
      // Calculate a good radius based on container size
      const arcRadius = Math.min(containerWidth, containerHeight) * 0.4;
      
      // Assign positions to nodes along the bottom arc
      let nodeIndex = 0;
      
      sortedCategories.forEach(category => {
        const categoryNodes = nodesByCategory.get(category) || [];
        
        // Sort nodes by connection count
        categoryNodes.sort((a, b) => {
          const aConnections = processedData.links.filter(link => {
            const source = typeof link.source === 'object' ? link.source.id : link.source;
            const target = typeof link.target === 'object' ? link.target.id : link.target;
            return source === a.id || target === a.id;
          }).length;
          
          const bConnections = processedData.links.filter(link => {
            const source = typeof link.source === 'object' ? link.source.id : link.source;
            const target = typeof link.target === 'object' ? link.target.id : link.target;
            return source === b.id || target === b.id;
          }).length;
          
          return bConnections - aConnections;
        });
        
        categoryNodes.forEach(node => {
          const angle = (nodeIndex / (totalNodes - 1)) * arcLength + (Math.PI - arcLength) / 2;
          nodeIndex++;
          
          node.x = arcRadius * Math.cos(angle);
          node.y = arcRadius * Math.sin(angle);
          node.index = nodeIndex - 1;
        });
      });
      
      // Create arcs for links
      const link = g.append("g")
        .attr("class", "links")
        .selectAll("path")
        .data(processedData.links)
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", d => {
          const source = typeof d.source === 'object' ? d.source : nodeMap.get(d.source as string);
          const target = typeof d.target === 'object' ? d.target : nodeMap.get(d.target as string);
          
          if (!source || !source.x || !source.y || !target || !target.x || !target.y) {
            return "";
          }
          
          // Calculate control points for the arc
          const sourceX = source.x;
          const sourceY = source.y;
          const targetX = target.x;
          const targetY = target.y;
          
          // Calculate distance between nodes
          const dx = targetX - sourceX;
          const dy = targetY - sourceY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Make arc height proportional to distance
          const arcHeight = Math.min(distance * 0.5, containerHeight * 0.33);
          
          // Calculate midpoint
          const midX = (sourceX + targetX) / 2;
          const midY = (sourceY + targetY) / 2 - arcHeight;
          
          return `M${sourceX},${sourceY} Q${midX},${midY} ${targetX},${targetY}`;
        })
        .attr("fill", "none")
        .attr("stroke", d => {
          // Get source and target nodes for styling based on categories
          const source = typeof d.source === 'object' ? d.source : nodeMap.get(d.source as string);
          
          if (source) {
            // Get color for the link based on source node's category
            const currentTheme = colors.dynamicColorThemes[colors.colorTheme] || 
                                colors.dynamicColorThemes.default || {};
            if (currentTheme[source.category]) {
              return currentTheme[source.category];
            }
            
            // Direct category lookup using DEFAULT_COLOR_PALETTE as fallback
            if (source.category) {
              const categoryHash = source.category.split('')
                .reduce((acc, char) => acc + char.charCodeAt(0), 0);
              const index = Math.abs(categoryHash) % DEFAULT_COLOR_PALETTE.length;
              return DEFAULT_COLOR_PALETTE[index];
            }
          }
          
          // Fall back to the default link color
          return colors.linkColor;
        })
        .attr("stroke-width", 2 * Math.max(0.7, colors.nodeSize * 0.75))
        .attr("stroke-opacity", 0.85)
        .attr("stroke-linecap", "round");
      
      // Create nodes with robust color assignment
      const node = g.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(processedData.nodes)
        .enter()
        .append("circle")
        .attr("class", "node")
        .attr("r", 5 * colors.nodeSize)
        .attr("cx", d => d.x || 0)
        .attr("cy", d => d.y || 0)
        .attr("fill", d => {
          // Try custom node color
          if (customNodeColors && customNodeColors[d.id]) {
            return customNodeColors[d.id];
          }
          
          // Try theme color
          const currentTheme = colors.dynamicColorThemes[colors.colorTheme] || 
                              colors.dynamicColorThemes.default || {};
          if (currentTheme[d.category]) {
            return currentTheme[d.category];
          }
          
          // Direct category lookup
          if (d.category) {
            const categoryHash = d.category.split('')
              .reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const index = Math.abs(categoryHash) % DEFAULT_COLOR_PALETTE.length;
            return DEFAULT_COLOR_PALETTE[index];
          }
          
          // Fallback
          return "#95a5a6";
        })
        .attr("stroke", colors.nodeStrokeColor)
        .attr("stroke-width", 1.5);
      
      // Add labels - positioned correctly relative to nodes
      const label = g.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(processedData.nodes)
        .enter()
        .append("text")
        .attr("class", "node-label")
        .attr("x", d => (d.x || 0))
        .attr("y", d => (d.y || 0) - 8)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "auto")
        .text(d => d.id.length > 15 ? d.id.substring(0, 12) + '...' : d.id)
        .style("font-size", `${Math.max(8, 10 * colors.nodeSize)}px`)
        .style("fill", colors.textColor)
        .style("text-shadow", "0 1px 2px rgba(255,255,255,0.7)")
        .style("pointer-events", "none");
      
      // Add tooltips - improved positioning
      node.on("mouseover", function(event, d) {
        if (!tooltipRef.current) return;
        
        // Highlight the selected node
        d3.select(this)
          .attr("r", 8 * colors.nodeSize)
          .attr("stroke", "#000")
          .attr("stroke-width", 2);
        
        // Find connections for this node
        const sourceLinks = processedData.links.filter(link => {
          const source = typeof link.source === 'object' ? link.source.id : link.source;
          return source === d.id;
        });
        
        const targetLinks = processedData.links.filter(link => {
          const target = typeof link.target === 'object' ? link.target.id : link.target;
          return target === d.id;
        });
        
        // Highlight connected nodes
        node.attr('opacity', n => {
          if (n.id === d.id) return 1;
          
          const isConnected = sourceLinks.some(link => {
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return targetId === n.id;
          }) || targetLinks.some(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            return sourceId === n.id;
          });
          
          return isConnected ? 1 : 0.2;
        });
        
        // Highlight connected links
        link.attr('opacity', l => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          const isConnected = (sourceId === d.id || targetId === d.id);
          return isConnected ? 1 : 0.1;
        })
        .attr('stroke-width', l => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          const isConnected = (sourceId === d.id || targetId === d.id);
          return isConnected ? 3 * colors.nodeSize : 2 * Math.max(0.7, colors.nodeSize * 0.75);
        });
        
        // Highlight connected labels
        label.attr('opacity', n => {
          if (n.id === d.id) return 1;
          
          const isConnected = sourceLinks.some(link => {
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return targetId === n.id;
          }) || targetLinks.some(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            return sourceId === n.id;
          });
          
          return isConnected ? 1 : 0.2;
        });
        
        // Prepare tooltip content
        let tooltipContent = `<strong>${d.id}</strong><br/>Category: ${d.category}<br/>Connections: ${sourceLinks.length + targetLinks.length}<br/><br/>`;
        
        if (sourceLinks.length > 0) {
          tooltipContent += `<strong>Connected to:</strong><br/>`;
          sourceLinks.forEach(link => {
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            tooltipContent += `${targetId}<br/>`;
          });
          tooltipContent += `<br/>`;
        }
        
        if (targetLinks.length > 0) {
          tooltipContent += `<strong>Connected from:</strong><br/>`;
          targetLinks.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            tooltipContent += `${sourceId}<br/>`;
          });
        }
        
        // Show tooltip - position relative to container
        const tooltip = d3.select(tooltipRef.current);
        tooltip
          .style("visibility", "visible")
          .style("opacity", 1)
          .html(tooltipContent);
        
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;
        
        // Position tooltip relative to the event, not the node
        // This ensures proper positioning even with zoomed/transformed SVG
        const x = event.clientX - containerRect.left + 10;
        const y = event.clientY - containerRect.top + 10;
        
        tooltip
          .style("left", `${x}px`)
          .style("top", `${y}px`);
      })
      .on("mousemove", function(event) {
        if (!tooltipRef.current || !containerRef.current) return;
        
        // Calculate tooltip dimensions to prevent it from going off-screen
        const tooltipWidth = tooltipRef.current.offsetWidth || 200;
        const tooltipHeight = tooltipRef.current.offsetHeight || 100;
        
        const containerRect = containerRef.current.getBoundingClientRect();
        
        // Calculate position relative to the container
        let xPos = event.clientX - containerRect.left + 15;
        let yPos = event.clientY - containerRect.top + 10;
        
        // Check if tooltip would go off right edge
        if (xPos + tooltipWidth > containerRect.width) {
          xPos = event.clientX - containerRect.left - tooltipWidth - 15;
        }
        
        // Check if tooltip would go off bottom edge
        if (yPos + tooltipHeight > containerRect.height) {
          yPos = event.clientY - containerRect.top - tooltipHeight - 10;
        }
        
        // Follow the mouse with intelligent positioning
        d3.select(tooltipRef.current)
          .style("left", `${xPos}px`)
          .style("top", `${yPos}px`);
      })
      .on("mouseout", function() {
        if (!tooltipRef.current) return;
        
        // Restore node appearance
        d3.select(this)
          .attr("r", 5 * colors.nodeSize)
          .attr("stroke", colors.nodeStrokeColor)
          .attr("stroke-width", 1.5);
        
        // Reset opacity and width for all elements
        node.attr('opacity', 1);
        link.attr('opacity', 0.85)
            .attr('stroke-width', 2 * Math.max(0.7, colors.nodeSize * 0.75));
        label.attr('opacity', 1);
        
        // Hide tooltip
        d3.select(tooltipRef.current)
          .style("opacity", 0)
          .style("visibility", "hidden");
      });
      
      // Add zoom behavior
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 3])
        .on("zoom", (event) => {
          g.attr("transform", `translate(${containerWidth/2 + event.transform.x}, ${containerHeight/2 + event.transform.y}) scale(${event.transform.k})`);
        });

      d3.select(svgRef.current).call(zoom);
      zoomRef.current = zoom;
      
      // Reset zoom on double-click
      d3.select(svgRef.current).on("dblclick.zoom", null);
      d3.select(svgRef.current).on("dblclick", () => {
        d3.select(svgRef.current)
          .transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity);
      });

      // Mark visualization as initialized
      visualizationInitialized.current = true;
      
      console.log("Arc visualization created successfully!");
      
    } catch (error) {
      console.error("Error creating D3 arc visualization:", error);
      setVisualizationError(error instanceof Error ? error.message : "Unknown error creating visualization");
      setIsLoading(false);
      
      toast({
        title: "Error",
        description: `Failed to create the arc visualization: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    }
  }, [
    isLoading, 
    processedData, 
    uniqueCategories, 
    toast, 
    colors, 
    customNodeColors,
    colorTheme,
    nodeSize,
    backgroundColor,
    backgroundOpacity,
    renderKey // Include renderKey to trigger re-renders
  ]);

  // Cleanup function when component unmounts
  useEffect(() => {
    return () => {
      if (svgRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        d3.select(svgRef.current).selectAll("*").remove();
      }
      visualizationInitialized.current = false;
    };
  }, []);

  // Implement zoom control handlers
  const handleZoomIn = () => {
    if (!svgRef.current || !zoomRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const zoom = zoomRef.current;
    const currentZoom = d3.zoomTransform(svg.node() as Element);
    
    svg.transition()
      .duration(300)
      .call(
        zoom.transform,
        d3.zoomIdentity
          .translate(currentZoom.x, currentZoom.y)
          .scale(currentZoom.k * 1.3)
      );
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const zoom = zoomRef.current;
    const currentZoom = d3.zoomTransform(svg.node() as Element);
    
    svg.transition()
      .duration(300)
      .call(
        zoom.transform,
        d3.zoomIdentity
          .translate(currentZoom.x, currentZoom.y)
          .scale(currentZoom.k / 1.3)
      );
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const zoom = zoomRef.current;
    
    svg.transition()
      .duration(500)
      .call(zoom.transform, d3.zoomIdentity);
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading Arc Graph Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative"
      style={{ 
        backgroundColor: `rgba(${colors.rgbBackgroundColor.r}, ${colors.rgbBackgroundColor.g}, ${colors.rgbBackgroundColor.b}, ${colors.backgroundOpacity})`,
        touchAction: "none" // Prevent default touch actions
      }}
    >
      <svg 
        ref={svgRef} 
        className="w-full h-full"
      />
      
      {/* Visualization Controls */}
      <VisualizationControls
        containerRef={containerRef}
        nodeData={nodeData}
        linkData={linkData}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onDownloadData={onDownloadData || (() => {})}
        onDownloadGraph={handleDownloadGraph}
        onResetSelection={onResetSelection || (() => {})}
        isZoomInitialized={true}
      />
      
      {/* Tooltip */}
      <div 
        ref={tooltipRef} 
        className="absolute bg-black/85 text-white px-3 py-2 rounded-md text-sm pointer-events-none z-50 max-w-64" 
        style={{ 
          opacity: 0,
          visibility: "hidden",
          transition: 'opacity 0.15s ease-in-out',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      ></div>
      
      {/* Error message */}
      {visualizationError && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded shadow-lg z-50 max-w-md">
          <div className="flex items-center">
            <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
            <div>
              <h3 className="font-medium text-sm">Visualization Error</h3>
              <p className="text-xs mt-1">{visualizationError}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Only show loading indicator if visualizationInitialized is false */}
      {!visualizationInitialized.current && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
            <p className="text-sm text-muted-foreground">Preparing visualization...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArcVisualization;