import React, { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import * as d3 from 'd3';
import { NodeData, LinkData } from "@/types/types";
import { AlertCircle } from "lucide-react";
import FileButtons from "./FileButtons";
import { VisualizationType } from "./NetworkSidebar";

interface RadialVisualizationProps {
  onCreditsClick?: () => void;
  nodeData: NodeData[];
  linkData: LinkData[];
  visualizationType: VisualizationType;
  onVisualizationTypeChange: (type: VisualizationType) => void;
  // Propiedades de estilo
  colorTheme?: string;
  nodeSize?: number;
  linkColor?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  customNodeColors?: {[key: string]: string};
  dynamicColorThemes?: {[key: string]: string};
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  category: string;
  depth?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  angle?: number;
  radius?: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  value?: number;
}

// Interface for the processed link for d3.linkRadial
interface ProcessedRadialLink {
  source: Node;
  target: Node;
}

const RadialVisualization: React.FC<RadialVisualizationProps> = ({
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

  // Process the imported data
  useEffect(() => {
    if (nodeData.length === 0 || linkData.length === 0) {
      console.log("Data not yet available in processing effect");
      return;
    }

    console.log("Processing data in RadialVisualization:", 
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

      // Assign hierarchy depth (for radial layout)
      // Start with category nodes as root (depth 0)
      const nodeMap = new Map<string, Node>();
      const rootNodes = new Set<string>();
      
      // First pass: identify root nodes (categories)
      uniqueCats.forEach(category => {
        rootNodes.add(category);
      });
      
      // Create node map for quick lookup
      processedNodes.forEach(node => {
        node.depth = rootNodes.has(node.id) ? 0 : 1;
        nodeMap.set(node.id, node);
      });

      setProcessedData({ nodes: processedNodes, links: processedLinks });
      
      // Set loading to false after a short delay to show the visualization
      setTimeout(() => {
        setIsLoading(false);
        toast({
          title: "Radial Graph Data Loaded",
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
  }, [nodeData, linkData, toast]);

  // Create D3 visualization
  useEffect(() => {
    if (isLoading || !svgRef.current || !containerRef.current || processedData.nodes.length === 0) {
      console.log("Not ready to create Radial visualization yet");
      return;
    }
  
    console.log("Creating D3 Radial visualization");
  
    try {
      // Clear any existing elements
      d3.select(svgRef.current).selectAll("*").remove();
      
      const margin = { top: 40, right: 40, bottom: 40, left: 40 };
      const width = containerRef.current.clientWidth - margin.left - margin.right;
      const height = containerRef.current.clientHeight - margin.top - margin.bottom;
      const radius = Math.min(width, height) / 2.5; // Slightly smaller radius to accommodate legend
      
      console.log(`Container dimensions: ${width}x${height}, radius: ${radius}`);
      
      // Create SVG
      const svg = d3.select(svgRef.current)
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left + width/2}, ${margin.top + height/2})`);
      
      // Set background
      svg.append("rect")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("x", -(width/2 + margin.left))
        .attr("y", -(height/2 + margin.top))
        .attr("fill", backgroundColor)
        .attr("opacity", backgroundOpacity);
      
      // Color scale for categories
      const color = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(uniqueCategories);
        
      // Add a legend
      const legendData = uniqueCategories.map(category => ({
        category,
        color: dynamicColorThemes[category] || color(category) as string
      }));

      const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width/2 - 100}, ${-height/2 + 30})`);
      
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
      
      // Create a hierarchical structure
      // Find nodes with no incoming links (potential roots)
      const targetNodes = new Set(processedData.links.map(d => 
        typeof d.target === 'object' ? d.target.id : d.target
      ));
      
      const sourceNodes = new Set(processedData.links.map(d => 
        typeof d.source === 'object' ? d.source.id : d.source
      ));
      
      // Find nodes that are sources but not targets (these could be central nodes)
      const rootCandidates = [...sourceNodes].filter(id => !targetNodes.has(id));
      
      // If no clear root, use the first node
      const rootId = rootCandidates.length > 0 
        ? rootCandidates[0] 
        : processedData.nodes[0].id;
      
      console.log("Root node for radial layout:", rootId);
      
      // Create node map for fast lookups
      const nodeById = new Map(processedData.nodes.map(node => [node.id, node]));
      
      // Build an adjacency list representation
      const adjacencyList = new Map<string, string[]>();
      processedData.nodes.forEach(node => {
        adjacencyList.set(node.id, []);
      });
      
      processedData.links.forEach(link => {
        const source = typeof link.source === 'object' ? link.source.id : link.source;
        const target = typeof link.target === 'object' ? link.target.id : link.target;
        
        const sourceLinks = adjacencyList.get(source) || [];
        sourceLinks.push(target);
        adjacencyList.set(source, sourceLinks);
      });
      
      // Assign levels through breadth-first traversal
      const visited = new Set<string>();
      const queue: [string, number][] = [[rootId, 0]]; // [nodeId, level]
      
      while (queue.length > 0) {
        const [currentId, level] = queue.shift()!;
        
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        
        const node = nodeById.get(currentId);
        if (node) {
          node.depth = level;
          
          // Add neighbors to the queue
          const neighbors = adjacencyList.get(currentId) || [];
          neighbors.forEach(neighborId => {
            if (!visited.has(neighborId)) {
              queue.push([neighborId, level + 1]);
            }
          });
        }
      }
      
      // Handle nodes not reached in BFS (disconnected components)
      processedData.nodes.forEach(node => {
        if (node.depth === undefined) {
          // Assign a default depth for disconnected nodes
          node.depth = 2; // Put them in an outer ring
        }
      });
      
      // Compute max depth
      const maxDepth = Math.max(...processedData.nodes.map(node => node.depth || 0));
      
      // Enhanced radial layout assignment
      // Group nodes by depth
      const nodesByDepth = d3.group(processedData.nodes, d => d.depth);
      
      // Place nodes in concentric circles
      nodesByDepth.forEach((nodes, depth) => {
        // For each depth level, distribute nodes evenly in a circle
        const levelCount = nodes.length;
        const levelRadius = radius * (Number(depth) + 1) / (maxDepth + 1.5); // Scaled radius
        
        // First, sort nodes by category for more organized arrangement
        const sortedNodes = [...nodes].sort((a, b) => a.category.localeCompare(b.category));
        
        // Then place them in a circle with a small jitter effect to avoid perfect overlap
        sortedNodes.forEach((node, i) => {
          // Calculate angle with small random jitter to avoid perfect circles
          const angleStep = (2 * Math.PI) / levelCount;
          const baseAngle = i * angleStep;
          // Add very slight jitter for aesthetic purposes, but not enough to mess up the circular structure
          const jitter = Math.random() * 0.05 * angleStep;
          const angle = baseAngle + jitter;
          
          node.angle = angle;
          node.radius = levelRadius;
          node.x = levelRadius * Math.cos(angle);
          node.y = levelRadius * Math.sin(angle);
        });
      });
      
      // Filter links to only include those with valid nodes
      const filteredLinks = processedData.links.filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return nodeById.has(sourceId) && nodeById.has(targetId);
      });
      
      // Create links
      const link = svg.append("g")
        .attr("class", "links")
        .selectAll("path")
        .data(filteredLinks)
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", d => {
          const source = typeof d.source === 'object' ? d.source : nodeById.get(d.source as string);
          const target = typeof d.target === 'object' ? d.target : nodeById.get(d.target as string);
          
          if (!source || !target) return "";
          
          // Only use radial links between different levels for cleaner visualization
          const sourceDepth = source.depth || 0;
          const targetDepth = target.depth || 0;
          
          if (Math.abs(sourceDepth - targetDepth) === 0) {
            // For nodes on the same level, use a simple curved path
            const sourceAngle = source.angle || 0;
            const targetAngle = target.angle || 0;
            const sourceRadius = source.radius || 0;
            const targetRadius = target.radius || 0;
            
            // Calculate points in cartesian coordinates
            const sx = sourceRadius * Math.cos(sourceAngle);
            const sy = sourceRadius * Math.sin(sourceAngle);
            const tx = targetRadius * Math.cos(targetAngle);
            const ty = targetRadius * Math.sin(targetAngle);
            
            // Calculate midpoint with slight offset
            const midX = (sx + tx) / 2;
            const midY = (sy + ty) / 2;
            
            // Add curvature based on distance between points
            const distance = Math.sqrt(Math.pow(tx - sx, 2) + Math.pow(ty - sy, 2));
            const curveFactor = distance / 3;
            
            // Calculate normal vector for curve control point
            const nx = -(ty - sy) / distance;
            const ny = (tx - sx) / distance;
            
            // Control point coordinates
            const controlX = midX + nx * curveFactor;
            const controlY = midY + ny * curveFactor;
            
            return `M${sx},${sy} Q${controlX},${controlY} ${tx},${ty}`;
          } else {
            // For nodes on different levels, use radial links
            // Type-safe version of the linkRadial call
            const linkData: ProcessedRadialLink = {
              source: source,
              target: target
            };
            
            const radialLink = d3.linkRadial<ProcessedRadialLink, Node>()
              .angle(d => d.angle || 0)
              .radius(d => d.radius || 0);
              
            return radialLink(linkData);
          }
        })
        .attr("fill", "none")
        .attr("stroke", d => {
          // Get source node for styling based on category
          const source = typeof d.source === 'object' ? d.source : nodeById.get(d.source as string);
          
          if (source) {
            // Get color for the link based on source node's category
            const sourceCategory = source.category;
            if (dynamicColorThemes[sourceCategory]) {
              return dynamicColorThemes[sourceCategory];
            }
          }
          
          // Fall back to the default link color
          return linkColor;
        })
        .attr("stroke-width", 1.5 * nodeSize)
        .attr("stroke-opacity", 0.6);
      
      // Function to get node color based on customization
      function getNodeColor(d: Node): string {
        // First check for custom node color
        if (customNodeColors[d.id]) {
          return customNodeColors[d.id];
        }
        
        // Use the category color from current theme or fallback to d3 scheme
        return dynamicColorThemes[d.category] || color(d.category) as string;
      }
      
      // Create nodes
      const node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(processedData.nodes)
        .enter()
        .append("circle")
        .attr("class", "node")
        .attr("r", (d: Node) => (d.depth === 0 ? 8 : 5) * nodeSize)
        .attr("cx", d => d.x || 0)
        .attr("cy", d => d.y || 0)
        .attr("fill", d => getNodeColor(d))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);
      
      // Add labels (improved positioning)
      const nodeLabel = svg.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(processedData.nodes)
        .enter()
        .append("text")
        .attr("class", "node-label")
        .attr("x", d => {
          const x = d.x || 0;
          const angle = Math.atan2(d.y || 0, x);
          const offset = ((d.depth === 0 ? 8 : 5) * nodeSize) + 5;
          return x + offset * Math.cos(angle);
        })
        .attr("y", d => {
          const y = d.y || 0;
          const angle = Math.atan2(y, d.x || 0);
          const offset = ((d.depth === 0 ? 8 : 5) * nodeSize) + 5;
          return y + offset * Math.sin(angle);
        })
        .attr("text-anchor", d => {
          const x = d.x || 0;
          return x > 0 ? "start" : x < 0 ? "end" : "middle";
        })
        .attr("dominant-baseline", d => {
          const y = d.y || 0;
          return y > 0 ? "hanging" : y < 0 ? "auto" : "middle";
        })
        .text(d => d.id.length > 15 ? d.id.substring(0, 12) + '...' : d.id)
        .style("font-size", `${Math.max(8, 10 * nodeSize)}px`)
        .style("fill", "#333")
        .style("text-shadow", "0 1px 2px rgba(255,255,255,0.7)")
        .style("pointer-events", "none");
      
      // Add tooltips and highlighting
      node.on("mouseover", function(event, d) {
        if (!tooltipRef.current) return;
        
        // Highlight the selected node
        d3.select(this)
          .attr("r", (d.depth === 0 ? 8 : 5) * nodeSize * 1.5)
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
          return isConnected ? 2 * nodeSize : 1.5 * nodeSize;
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
          .attr("r", (d: Node) => (d.depth === 0 ? 8 : 5) * nodeSize)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5);
        
        // Reset opacity for all nodes, links, and labels
        node.attr('opacity', 1);
        link.attr('opacity', 0.6)
            .attr('stroke-width', 1.5 * nodeSize);
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
          svg.attr("transform", `translate(${margin.left + width/2 + event.transform.x}, ${margin.top + height/2 + event.transform.y}) scale(${event.transform.k})`);
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
      
    } catch (error) {
      console.error("Error creating D3 radial visualization:", error);
      setVisualizationError(error instanceof Error ? error.message : "Unknown error creating visualization");
      toast({
        title: "Error",
        description: `Failed to create the radial visualization: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    }
  }, [
    isLoading, 
    processedData, 
    uniqueCategories, 
    toast, 
    nodeSize, 
    linkColor, 
    backgroundColor, 
    backgroundOpacity, 
    customNodeColors, 
    dynamicColorThemes
  ]);

  // Function to convert hex to rgb
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 245, g: 245, b: 245 }; // Default to #f5f5f5
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading Radial Graph Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* Visualización */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ 
          backgroundColor: `rgba(${hexToRgb(backgroundColor).r}, ${hexToRgb(backgroundColor).g}, ${hexToRgb(backgroundColor).b}, ${backgroundOpacity})`
        }}
      >
        <svg 
          ref={svgRef} 
          className="w-full h-full"
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
        
        {/* Mensaje de error */}
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
    </div>
  );
};

export default RadialVisualization;