import React, { useEffect, useRef, useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import * as d3 from 'd3';
import { NodeData, LinkData } from "@/types/types";
import { AlertCircle } from "lucide-react";
import VisualizationControls from "./VisualizationControls";
import { VisualizationType } from "./NetworkSidebar";
import useNetworkColors from "@/hooks/useNetworkColors";

interface RadialVisualizationProps {
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
  
  // Use the network colors hook with improved initialization
  const colors = useNetworkColors({
    initialColorTheme: colorTheme,
    initialNodeSize: nodeSize,
    initialLinkColor: linkColor,
    initialBackgroundColor: backgroundColor,
    initialTextColor: "#ffffff",
    initialNodeStrokeColor: "#ffffff",
    initialBackgroundOpacity: backgroundOpacity,
    initialCustomNodeColors: customNodeColors,
    initialDynamicColorThemes: dynamicColorThemes
  });

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
      console.log(`Radial visualization render attempt ${renderAttemptRef.current}`);
      
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

  // Process the imported data only once
  useEffect(() => {
    // Skip if we've already processed the data
    if (dataLoaded && processedData.nodes.length > 0) {
      console.log("Radial data already processed, skipping");
      return;
    }

    if (nodeData.length === 0 || linkData.length === 0) {
      console.log("Data not yet available for Radial visualization");
      return;
    }

    try {
      console.log("Processing data for Radial visualization");
      
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
        console.log("Generating color themes for radial visualization");
        colors.generateDynamicColorThemes(uniqueCats);
      }

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
      
      // Mark data as loaded to prevent reprocessing
      setDataLoaded(true);
      
      // Set loading to false after a short delay to show the visualization
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
    } catch (error) {
      console.error("Error processing radial data:", error);
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
    
    console.log("Creating D3 Radial visualization");
  
    try {
      // Clear any existing elements
      d3.select(svgRef.current).selectAll("*").remove();
      
      // Get container dimensions - using default values as fallback
      const containerWidth = containerRef.current.clientWidth || 800;
      const containerHeight = containerRef.current.clientHeight || 600;
      
      console.log(`Radial visualization container size: ${containerWidth}x${containerHeight}`);
      
      // Set explicit SVG dimensions to match container
      const svg = d3.select(svgRef.current)
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet");
      
      // Create a main container group for the visualization
      const g = svg.append("g")
        .attr("transform", `translate(${containerWidth/2}, ${containerHeight/2})`)
        .attr("class", "main-container");
      
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
        color: colors.getNodeColor({ id: "", category: category }) // Use the proper color getter
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
      
      // Calculate a good radius based on container size
      const maxRadius = Math.min(containerWidth, containerHeight) * 0.4;
      
      // Place nodes in concentric circles
      nodesByDepth.forEach((nodes, depth) => {
        // For each depth level, distribute nodes evenly in a circle
        const levelCount = nodes.length;
        const levelRadius = maxRadius * (Number(depth) + 1) / (maxDepth + 1.5); // Scaled radius
        
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
      const link = g.append("g")
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
            return colors.getNodeColor(source);
          }
          
          // Fall back to the default link color
          return colors.linkColor;
        })
        .attr("stroke-width", 1.5 * colors.nodeSize)
        .attr("stroke-opacity", 0.6);
      
      // Create nodes with proper color assignment
      const node = g.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(processedData.nodes)
        .enter()
        .append("circle")
        .attr("class", "node")
        .attr("r", (d: Node) => (d.depth === 0 ? 8 : 5) * colors.nodeSize)
        .attr("cx", d => d.x || 0)
        .attr("cy", d => d.y || 0)
        .attr("fill", d => {
          // Try custom node color
          if (customNodeColors && customNodeColors[(d as Node).id]) {
            return customNodeColors[(d as Node).id];
          }
          
          // Try theme color from the current theme
          const currentTheme = colors.dynamicColorThemes[colors.colorTheme] || {};
          if (currentTheme[d.category]) {
            return currentTheme[d.category];
          }
          
          // Direct category lookup as fallback
          const categoryIndex = Math.abs(
            d.category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
          ) % DEFAULT_COLOR_PALETTE.length;
          
          return DEFAULT_COLOR_PALETTE[categoryIndex];
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);
      
      // Add labels - with improved positioning logic
      const nodeLabel = g.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(processedData.nodes)
        .enter()
        .append("text")
        .attr("class", "node-label")
        .attr("x", d => {
          const x = d.x || 0;
          const angle = Math.atan2(d.y || 0, x);
          const offset = ((d.depth === 0 ? 8 : 5) * colors.nodeSize) + 5;
          return x + offset * Math.cos(angle);
        })
        .attr("y", d => {
          const y = d.y || 0;
          const angle = Math.atan2(y, d.x || 0);
          const offset = ((d.depth === 0 ? 8 : 5) * colors.nodeSize) + 5;
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
        .style("font-size", `${Math.max(8, 10 * colors.nodeSize)}px`)
        .style("fill", "#333")
        .style("text-shadow", "0 1px 2px rgba(255,255,255,0.7)")
        .style("pointer-events", "none");
      
      // Add tooltips - improved positioning
      node.on("mouseover", function(event, d) {
        if (!tooltipRef.current) return;
        
        // Highlight the selected node
        d3.select(this)
          .attr("r", (d.depth === 0 ? 8 : 5) * colors.nodeSize * 1.5)
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
          .attr("r", (d: Node) => (d.depth === 0 ? 8 : 5) * colors.nodeSize)
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
          g.attr("transform", `translate(${containerWidth/2 + event.transform.x}, ${containerHeight/2 + event.transform.y}) scale(${event.transform.k})`);
        });

      // Apply zoom to the SVG
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
      console.log("Radial visualization created successfully!");
      
    } catch (error) {
      console.error("Error creating D3 radial visualization:", error);
      setVisualizationError(error instanceof Error ? error.message : "Unknown error creating visualization");
      setIsLoading(false);
      
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
          <p className="text-sm text-muted-foreground animate-pulse">Loading Radial Graph Data...</p>
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

export default RadialVisualization;