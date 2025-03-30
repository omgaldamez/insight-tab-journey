import React, { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import * as d3 from 'd3';
import { NodeData, LinkData } from "@/types/types";
import { AlertCircle } from "lucide-react";
import { VisualizationType } from "./NetworkSidebar";
import FileButtons from "./FileButtons";
import useNetworkColors from "@/hooks/useNetworkColors";

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
  dynamicColorThemes?: {[key: string]: string};
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
  dynamicColorThemes = {}
}) => {
  const { toast } = useToast();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [visualizationError, setVisualizationError] = useState<string | null>(null);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [processedData, setProcessedData] = useState<{ nodes: Node[], links: Link[] }>({ nodes: [], links: [] });

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
    initialDynamicColorThemes: { [colorTheme]: dynamicColorThemes }
  });

  // Process the imported data
  useEffect(() => {
    if (nodeData.length === 0 || linkData.length === 0) {
      console.log("Data not yet available in processing effect");
      return;
    }

    console.log("Processing data in ArcVisualization:", 
      { nodeCount: nodeData.length, linkCount: linkData.length });

    try {
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
      
      // Generate color themes - ONLY when needed
      if (uniqueCats.length > 0 && Object.keys(colors.dynamicColorThemes).length <= 1) {
        colors.generateDynamicColorThemes(uniqueCats);
      }

      setProcessedData({ nodes: processedNodes, links: processedLinks });
      
      // Set loading to false after a short delay to show the visualization
      setTimeout(() => {
        setIsLoading(false);
        toast({
          title: "Arc Graph Data Loaded",
          description: "Interactive visualization is now ready",
        });
      }, 500);
    } catch (error) {
      console.error("Error processing data:", error);
      toast({
        title: "Data Processing Error",
        description: "Failed to process the uploaded data files",
        variant: "destructive"
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeData, linkData, toast]);

  // Create D3 visualization
  useEffect(() => {
    if (isLoading || !svgRef.current || !containerRef.current || processedData.nodes.length === 0) {
      console.log("Not ready to create Arc visualization yet");
      return;
    }
  
    console.log("Creating D3 Arc visualization");
  
    try {
      // Clear any existing elements
      d3.select(svgRef.current).selectAll("*").remove();
      
      const margin = { top: 40, right: 40, bottom: 40, left: 40 };
      const width = containerRef.current.clientWidth - margin.left - margin.right;
      const height = containerRef.current.clientHeight - margin.top - margin.bottom;
      
      console.log(`Container dimensions: ${width}x${height}`);
      
      // Create SVG
      const svg = d3.select(svgRef.current)
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);
      
      // Add a legend
      const legendData = uniqueCategories.map(category => ({
        category,
        color: colors.dynamicColorThemes[colors.colorTheme]?.[category] || 
               d3.schemeCategory10[uniqueCategories.indexOf(category) % 10]
      }));

      const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 150}, 20)`);
      
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
          
          const radius = height - 100;
          node.x = width / 2 + radius * Math.cos(angle);
          node.y = height - 50 - radius * Math.sin(angle);
          node.index = nodeIndex - 1;
        });
      });
      
      // Set background
      svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", colors.backgroundColor)
        .attr("opacity", colors.backgroundOpacity);
      
      // Create arcs for links
      const link = svg.append("g")
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
          const arcHeight = Math.min(distance * 0.5, height * 0.33);
          
          // Calculate midpoint
          const midX = (sourceX + targetX) / 2;
          const midY = (sourceY + targetY) / 2 - arcHeight;
          
          return `M${sourceX},${sourceY} Q${midX},${midY} ${targetX},${targetY}`;
        })
        .attr("fill", "none")
        .attr("stroke", d => {
          // Get source and target nodes for styling based on categories
          const source = typeof d.source === 'object' ? d.source : nodeMap.get(d.source as string);
          const target = typeof d.target === 'object' ? d.target : nodeMap.get(d.target as string);
          
          if (source) {
            // Get color for the link based on source node's category
            const sourceCategory = source.category;
            const themeColors = colors.dynamicColorThemes[colors.colorTheme] || {};
            if (themeColors[sourceCategory]) {
              return themeColors[sourceCategory];
            }
          }
          
          // Fall back to the default link color
          return colors.linkColor;
        })
        .attr("stroke-width", 2 * Math.max(0.7, colors.nodeSize * 0.75))
        .attr("stroke-opacity", 0.85) // Increased opacity for better visibility
        .attr("stroke-linecap", "round"); // Rounded ends for smoother appearance
      
      // Create nodes
      const node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(processedData.nodes)
        .enter()
        .append("circle")
        .attr("class", "node")
        .attr("r", 5 * colors.nodeSize)
        .attr("cx", d => d.x || 0)
        .attr("cy", d => d.y || 0)
        .attr("fill", d => colors.getNodeColor(d))
        .attr("stroke", colors.nodeStrokeColor)
        .attr("stroke-width", 1.5);
      
      // Add labels
      const label = svg.append("g")
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
      
      // Add tooltips
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
        
        // Show tooltip
        const tooltip = d3.select(tooltipRef.current);
        tooltip
          .style("visibility", "visible")
          .style("opacity", 1)
          .html(tooltipContent);
        
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;
        
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
        
        // Small offset from cursor
        const offsetX = 15;
        const offsetY = 10;
        
        // Adjust position if tooltip would go off the right or bottom edge
        let xPos = event.clientX - containerRef.current.getBoundingClientRect().left + offsetX;
        let yPos = event.clientY - containerRef.current.getBoundingClientRect().top + offsetY;
        
        // Check if tooltip would go off right edge
        if (xPos + tooltipWidth > containerRef.current.clientWidth) {
          xPos = event.clientX - containerRef.current.getBoundingClientRect().left - tooltipWidth - offsetX;
        }
        
        // Check if tooltip would go off bottom edge
        if (yPos + tooltipHeight > containerRef.current.clientHeight) {
          yPos = event.clientY - containerRef.current.getBoundingClientRect().top - tooltipHeight - offsetY;
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
          svg.attr("transform", `translate(${margin.left + event.transform.x}, ${margin.top + event.transform.y}) scale(${event.transform.k})`);
        });

      d3.select(svgRef.current).call(zoom);
      
      // Reset zoom on double-click
      d3.select(svgRef.current).on("dblclick.zoom", null);
      d3.select(svgRef.current).on("dblclick", () => {
        d3.select(svgRef.current)
          .transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity);
      });

      // Ensure the SVG visualization is properly centered
      const svgWidth = svgRef.current.clientWidth;
      const svgHeight = svgRef.current.clientHeight;
      
      // Set the viewBox to ensure proper sizing and centering
      d3.select(svgRef.current)
        .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet");
      
    } catch (error) {
      console.error("Error creating D3 arc visualization:", error);
      setVisualizationError(error instanceof Error ? error.message : "Unknown error creating visualization");
      toast({
        title: "Error",
        description: `Failed to create the arc visualization: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isLoading, 
    processedData, 
    uniqueCategories, 
    toast
    // Not including colors properties as dependencies to prevent
    // unnecessary re-renders while still having access to current values
  ]);



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

  // Return just the visualization content (will be wrapped by BaseVisualization)
  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      style={{ 
        backgroundColor: `rgba(${colors.rgbBackgroundColor.r}, ${colors.rgbBackgroundColor.g}, ${colors.rgbBackgroundColor.b}, ${colors.backgroundOpacity})`
      }}
    >
      <svg 
        ref={svgRef} 
        className="w-full h-full"
        viewBox={`0 0 ${containerRef.current?.clientWidth || 800} ${containerRef.current?.clientHeight || 600}`}
        preserveAspectRatio="xMidYMid meet"
      />
      
      {/* File Buttons */}
      <FileButtons 
        onDownloadData={() => {}}
        onDownloadGraph={() => {}}
        onResetSelection={() => {}}
        nodeData={nodeData}
        linkData={linkData}
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
    </div>
  );
};

export default ArcVisualization;