/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import * as d3 from 'd3';
import { NodeData, LinkData } from "@/types/types";
import { AlertCircle } from "lucide-react";
import VisualizationControls from "./VisualizationControls";
import { VisualizationType } from "./NetworkSidebar";
import useNetworkColors from "@/hooks/useNetworkColors";

interface ArcLinealVisualizationProps {
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
  // Additional props for UI controls
  onDownloadData?: (format: string) => void;
  onDownloadGraph?: (format: string) => void;
  onResetSelection?: () => void;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  category: string;
  x?: number;
  y?: number;
  index?: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
}

// Default color palette for consistency
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

const ArcLinealVisualization: React.FC<ArcLinealVisualizationProps> = ({
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
      console.log(`ArcLineal visualization render attempt ${renderAttemptRef.current}`);
      
      // Force a re-render
      setRenderKey(prev => prev + 1);
      
      // Schedule another attempt if needed
      if (!visualizationInitialized.current && renderAttemptRef.current < 5) {
        setTimeout(attemptRender, 300 * renderAttemptRef.current);
      }
    };
    
    // Start the first scheduled attempt
    const timer = setTimeout(attemptRender, 300);
    return () => clearTimeout(timer);
  }, []);

  // Process the imported data only once
  useEffect(() => {
    // Skip if we've already processed the data
    if (dataLoaded && processedData.nodes.length > 0) {
      console.log("ArcLineal data already processed, skipping");
      return;
    }

    if (nodeData.length === 0 || linkData.length === 0) {
      console.log("Data not yet available for ArcLineal visualization");
      return;
    }

    try {
      console.log("Processing data for ArcLineal visualization");
      
      // Process nodes
      const processedNodes: Node[] = nodeData.map((node, index) => ({
        id: node.id,
        category: node.category,
        index: index // Store the index for ordering
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
        console.log("Generating color themes for ArcLineal visualization");
        colors.generateDynamicColorThemes(uniqueCats);
      }

      setProcessedData({ nodes: processedNodes, links: processedLinks });
      
      // Mark data as loaded to prevent reprocessing
      setDataLoaded(true);
      
      // Set loading to false after a short delay
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
    } catch (error) {
      console.error("Error processing ArcLineal data:", error);
      setVisualizationError(`Data processing error: ${error instanceof Error ? error.message : String(error)}`);
      setIsLoading(false);
      
      toast({
        title: "Data Processing Error",
        description: "Failed to process the uploaded data files",
        variant: "destructive"
      });
    }
   
  }, [nodeData, linkData, toast, colors]);

  // Create D3 visualization
  useEffect(() => {
    if (isLoading || !svgRef.current || !containerRef.current || processedData.nodes.length === 0) {
      return;
    }
    
    console.log("Creating D3 ArcLineal visualization");
  
    try {
      // Clear any existing elements
      d3.select(svgRef.current).selectAll("*").remove();
      
      // Get container dimensions
      const containerWidth = containerRef.current.clientWidth || 800;
      const containerHeight = containerRef.current.clientHeight || 600;
      
      console.log(`ArcLineal visualization container size: ${containerWidth}x${containerHeight}`);
      
      // Set explicit SVG dimensions
      const svg = d3.select(svgRef.current)
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet");
      
      // Create a main container group for the visualization
      const g = svg.append("g")
        .attr("transform", `translate(0, 0)`)
        .attr("class", "main-container");
      
      // Add a background
      g.append("rect")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .attr("x", 0)
        .attr("y", 0)
        .attr("fill", colors.backgroundColor)
        .attr("opacity", colors.backgroundOpacity);
      
      // Add a legend
      const legendData = uniqueCategories.map(category => ({
        category,
        color: colors.getNodeColor({ id: "", category: category })
      }));

      const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${containerWidth - 150}, 30)`);
      
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
      
      // Create a node map for fast lookups
      const nodeById = new Map(processedData.nodes.map(node => [node.id, node]));
      
      // Configure a horizontal layout
      // Sort nodes by category for better grouping
      const sortedNodes = [...processedData.nodes].sort((a, b) => {
        if (a.category === b.category) {
          return a.id.localeCompare(b.id);
        }
        return a.category.localeCompare(b.category);
      });
      
      // Calculate horizontal spacing - leave margin on both sides (15% of width)
      const marginX = containerWidth * 0.15;  
      const usableWidth = containerWidth - (marginX * 2);
      const nodeSpacing = usableWidth / (sortedNodes.length - 1 || 1);
      
      // Set Y position for all nodes - position them at 75% of container height
      const nodeY = containerHeight * 0.75;
      
      // Position nodes horizontally
      sortedNodes.forEach((node, i) => {
        node.x = marginX + (i * nodeSpacing);
        node.y = nodeY;
      });
      
      // Filter links to only include those with valid nodes
      const filteredLinks = processedData.links.filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return nodeById.has(sourceId) && nodeById.has(targetId);
      });
      
      // Create curved arcs for links
      const link = g.append("g")
        .attr("class", "links")
        .selectAll("path")
        .data(filteredLinks)
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", d => {
          const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
          const targetId = typeof d.target === 'object' ? d.target.id : d.target;
          
          const source = nodeById.get(sourceId);
          const target = nodeById.get(targetId);
          
          if (!source || !target) return "";
          
          const sourceX = source.x || 0;
          const sourceY = source.y || 0;
          const targetX = target.x || 0;
          const targetY = target.y || 0;
          
          // Calculate arc height based on the distance between nodes
          // Farther nodes get higher arcs
          const distance = Math.abs(sourceX - targetX);
          const arcHeight = -distance * 0.5; // Negative to curve upward
          
          // Use a quadratic Bézier curve
          const midX = (sourceX + targetX) / 2;
          const midY = sourceY + arcHeight;
          
          return `M${sourceX},${sourceY} Q${midX},${midY} ${targetX},${targetY}`;
        })
        .attr("fill", "none")
        .attr("stroke", d => {
          // Get source node for styling based on category
          const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
          const source = nodeById.get(sourceId);
          
          if (source) {
            // Use source node's category color but with partial opacity
            return d3.color(colors.getNodeColor(source))?.copy({opacity: 0.6})?.toString() || colors.linkColor;
          }
          
          return colors.linkColor;
        })
        .attr("stroke-width", 1.5 * colors.nodeSize)
        .attr("stroke-opacity", 0.6);
      
      // Create nodes with proper color assignment
      const node = g.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(sortedNodes)
        .enter()
        .append("circle")
        .attr("class", "node")
        .attr("r", 6 * colors.nodeSize)
        .attr("cx", d => d.x || 0)
        .attr("cy", d => d.y || 0)
        .attr("fill", d => colors.getNodeColor(d))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);
      
      // Add labels below the nodes
      const nodeLabel = g.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(sortedNodes)
        .enter()
        .append("text")
        .attr("class", "node-label")
        .attr("x", d => d.x || 0)
        .attr("y", d => (d.y || 0) + 20) // Position labels below nodes
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "hanging")
        .text(d => d.id.length > 15 ? d.id.substring(0, 12) + '...' : d.id)
        .style("font-size", `${Math.max(8, 10 * colors.nodeSize)}px`)
        .style("fill", "#333")
        .style("text-shadow", "0 1px 2px rgba(255,255,255,0.7)")
        .style("pointer-events", "none");
      
      // Add tooltips and interactions
      node.on("mouseover", function(event, d) {
        if (!tooltipRef.current) return;
        
        // Highlight the selected node
        d3.select(this)
          .attr("r", 6 * colors.nodeSize * 1.5)
          .attr("stroke", "#000")
          .attr("stroke-width", 2);
        
        // Find connections for this node
        const sourceLinks = filteredLinks.filter(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          return sourceId === d.id;
        });
        
        const targetLinks = filteredLinks.filter(link => {
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          return targetId === d.id;
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
          return isConnected ? 2 * colors.nodeSize : 1.5 * colors.nodeSize;
        });
        
        // Highlight connected labels
        nodeLabel.attr('opacity', n => {
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
        
        // Count connections for tooltip
        const connections = sourceLinks.length + targetLinks.length;
        
        // Prepare tooltip content
        let tooltipContent = `<strong>${d.id}</strong><br/>Category: ${d.category}<br/>Connections: ${connections}<br/><br/>`;
        
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
        
        // Position tooltip
        const x = event.clientX - containerRect.left + 10;
        const y = event.clientY - containerRect.top - 10; // Position above the cursor
        
        tooltip
          .style("left", `${x}px`)
          .style("top", `${y}px`);
      })
      .on("mousemove", function(event) {
        if (!tooltipRef.current || !containerRef.current) return;
        
        // Calculate tooltip dimensions
        const tooltipWidth = tooltipRef.current.offsetWidth || 200;
        const tooltipHeight = tooltipRef.current.offsetHeight || 100;
        
        const containerRect = containerRef.current.getBoundingClientRect();
        
        // Calculate position relative to the container
        let xPos = event.clientX - containerRect.left + 15;
        let yPos = event.clientY - containerRect.top - tooltipHeight - 10; // Position above cursor
        
        // Check if tooltip would go off right edge
        if (xPos + tooltipWidth > containerRect.width) {
          xPos = event.clientX - containerRect.left - tooltipWidth - 15;
        }
        
        // Check if tooltip would go off top edge
        if (yPos < 0) {
          yPos = event.clientY - containerRect.top + 20; // Position below cursor
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
          .attr("r", 6 * colors.nodeSize)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5);
        
        // Reset opacity for all nodes, links, and labels
        node.attr('opacity', 1);
        link.attr('opacity', 0.6)
            .attr('stroke-width', 1.5 * colors.nodeSize);
        nodeLabel.attr('opacity', 1);
        
        // Hide tooltip
        d3.select(tooltipRef.current)
          .style("opacity", 0)
          .style("visibility", "hidden");
      });
      
      // Add zoom behavior
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 3])
        .on("zoom", (event) => {
          g.attr("transform", event.transform.toString());
        });

      // Apply zoom to the SVG
      d3.select(svgRef.current).call(zoom);
      zoomRef.current = zoom;
      
      // Fit visualization to view
      const initialScale = 0.9;
      const initialTranslateX = (containerWidth - (containerWidth * initialScale)) / 2;
      const initialTranslateY = (containerHeight - (containerHeight * initialScale)) / 2;
      
      d3.select(svgRef.current)
        .call(zoom.transform, d3.zoomIdentity
          .translate(initialTranslateX, initialTranslateY)
          .scale(initialScale)
        );
      
      // Reset zoom on double-click
      d3.select(svgRef.current).on("dblclick.zoom", null);
      d3.select(svgRef.current).on("dblclick", () => {
        d3.select(svgRef.current)
          .transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity
            .translate(initialTranslateX, initialTranslateY)
            .scale(initialScale)
          );
      });

      // Mark visualization as initialized
      visualizationInitialized.current = true;
      console.log("ArcLineal visualization created successfully!");
      
    } catch (error) {
      console.error("Error creating D3 ArcLineal visualization:", error);
      setVisualizationError(error instanceof Error ? error.message : "Unknown error creating visualization");
      setIsLoading(false);
      
      toast({
        title: "Error",
        description: `Failed to create the ArcLineal visualization: ${error instanceof Error ? error.message : String(error)}`,
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
    renderKey
  ]);

  // Cleanup function when component unmounts
  useEffect(() => {
    return () => {
      if (svgRef.current) {
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
    
    // Fit visualization to view
    const containerWidth = containerRef.current?.clientWidth || 800;
    const containerHeight = containerRef.current?.clientHeight || 600;
    const initialScale = 0.9;
    const initialTranslateX = (containerWidth - (containerWidth * initialScale)) / 2;
    const initialTranslateY = (containerHeight - (containerHeight * initialScale)) / 2;
    
    svg.transition()
      .duration(500)
      .call(zoom.transform, d3.zoomIdentity
        .translate(initialTranslateX, initialTranslateY)
        .scale(initialScale)
      );
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading ArcLineal Graph Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative"
      style={{ 
        backgroundColor: `rgba(${colors.rgbBackgroundColor.r}, ${colors.rgbBackgroundColor.g}, ${colors.rgbBackgroundColor.b}, ${colors.backgroundOpacity})`
      }}
    >
      <svg 
        ref={svgRef} 
        className="w-full h-full"
      />
      
      {/* Shared UI Controls */}
      <VisualizationControls
        containerRef={containerRef}
        nodeData={nodeData}
        linkData={linkData}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onDownloadData={onDownloadData}
        onDownloadGraph={onDownloadGraph}
        onResetSelection={onResetSelection}
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
      
      {/* Loading indicator when not initialized */}
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

export default ArcLinealVisualization;