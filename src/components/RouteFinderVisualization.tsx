import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { ArrowRight, MapPin, FileDown, Loader2 } from 'lucide-react';
import { Node, Link, VisualizationType } from '@/types/networkTypes';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import NetworkSidebar from './NetworkSidebar';
import BaseVisualization from './BaseVisualization';

interface RouteFinderProps {
  nodeData: Node[];
  linkData: Link[];
  onCreditsClick?: () => void;
  colorTheme?: string;
  nodeSize?: number;
  linkColor?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  customNodeColors?: Record<string, string>;
  dynamicColorThemes?: Record<string, Record<string, string>>;
  visualizationType?: VisualizationType;
  onVisualizationTypeChange?: (type: VisualizationType) => void;

  
  // No need to add these props as they aren't used in this component
  // networkTitle?: string;
  // onTitleChange?: (title: string) => void;
  // isCollapsed?: boolean;
  // onToggleSidebar?: () => void;
}

// Define a path type to hold route information
interface Route {
  path: string[];
  distance: number;
  pathNodes: Node[];
  pathLinks: Link[];
  group: number;        // Group number (1 for shortest, 2 for second shortest, etc.)
  alternativeIndex: number; // Alternative index within the group (0 for main, 1-2 for alternatives)
}

// Helper function to get node ID regardless of node format
const getNodeId = (node: { id: string } | string): string => {
  if (typeof node === 'object' && node !== null) {
    return node.id;
  }
  return String(node);
};

// Cache to store computed routes to avoid redundant calculations
const routeCache = new Map<string, Route[]>();

const RouteFinderVisualization: React.FC<RouteFinderProps> = ({
  nodeData,
  linkData,
  colorTheme = 'default',
  customNodeColors = {},
  visualizationType,
  onVisualizationTypeChange,
}) => {
  // Performance monitoring
  const perfRef = useRef({
    lastOperation: '',
    startTime: 0,
    logPerformance: (operation: string) => {
      const elapsed = performance.now() - perfRef.current.startTime;
      console.log(`Performance: ${operation} took ${elapsed.toFixed(2)}ms`);
      perfRef.current.lastOperation = operation;
      perfRef.current.startTime = performance.now();
    },
    start: (operation: string) => {
      perfRef.current.lastOperation = operation;
      perfRef.current.startTime = performance.now();
    }
  });

  // Refs for SVG and container
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for visualization
  const [sourceNode, setSourceNode] = useState<string>('');
  const [targetNode, setTargetNode] = useState<string>('');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('routeOptions');
  const [highlightedRouteIndex, setHighlightedRouteIndex] = useState<number>(-1);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [simulation, setSimulation] = useState<d3.Simulation<Node, Link> | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [adjacencyList, setAdjacencyList] = useState<Map<string, string[]>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
const [networkTitle, setNetworkTitle] = useState("Route Finder");
const [activeColorTab, setActiveColorTab] = useState('presets');
const [expandedSections, setExpandedSections] = useState({
  networkControls: true,
  nodeControls: true,
  colorControls: false,
  networkInfo: false,
  visualizationType: true,
  threeDControls: false,
  tooltipSettings: true,
  routeControls: true
});
const [selectedNode, setSelectedNode] = useState<Node | null>(null);
const [selectedNodeConnections, setSelectedNodeConnections] = useState<{ to: string[]; from: string[] }>({ to: [], from: [] });
const [nodeGroup, setNodeGroup] = useState('all');
const [nodeCounts, setNodeCounts] = useState<{ total: number }>({ total: 0 });
  
  // Prepare adjacency list once when link data changes
  useEffect(() => {
    try {
      perfRef.current.start("Building adjacency list");
      console.log(`Building adjacency list for ${linkData.length} links`);
      
      // Create adjacency list from links - do this once and store
      const newAdjacencyList = new Map<string, string[]>();
      
      for (let i = 0; i < linkData.length; i++) {
        const link = linkData[i];
        const source = getNodeId(link.source);
        const target = getNodeId(link.target);
        
        if (!newAdjacencyList.has(source)) {
          newAdjacencyList.set(source, []);
        }
        if (!newAdjacencyList.has(target)) {
          newAdjacencyList.set(target, []);
        }
        
        // Add both directions for undirected graph
        newAdjacencyList.get(source)!.push(target);
        newAdjacencyList.get(target)!.push(source);
      }
      
      setAdjacencyList(newAdjacencyList);
      perfRef.current.logPerformance("Building adjacency list");
    } catch (err) {
      console.error("Error building adjacency list:", err);
      setError("Failed to process link data. Please try a smaller dataset.");
    }
  }, [linkData]);
  
  // Prepare node and link data
  useEffect(() => {
    if (nodeData.length > 0) {
      console.log(`Processing ${nodeData.length} nodes`);
      
      try {
        // Find unique categories
        const categories = Array.from(new Set(nodeData.map(node => node.category)));
        setUniqueCategories(categories);
        
        // Set default source/target nodes, but don't trigger route calculation yet
        if (!sourceNode && nodeData.length >= 1) {
          setSourceNode(nodeData[0].id);
        }
        if (!targetNode && nodeData.length >= 2) {
          setTargetNode(nodeData[1].id);
        }
      } catch (err) {
        console.error("Error processing nodes:", err);
        setError("Failed to process node data. Please try a smaller dataset.");
      }
    }
  }, [nodeData, sourceNode, targetNode]);

  // Optimized function to find shortest path using BFS with early termination
  const findShortestPath = useCallback((startNodeId: string, endNodeId: string): string[] | null => {
    if (!startNodeId || !endNodeId || startNodeId === endNodeId) return null;
    if (!adjacencyList.has(startNodeId) || !adjacencyList.has(endNodeId)) return null;

    // BFS implementation
    const visited = new Set<string>();
    const queue: { node: string; path: string[] }[] = [{ node: startNodeId, path: [startNodeId] }];
    
    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      
      if (node === endNodeId) {
        return path;
      }
      
      if (!visited.has(node)) {
        visited.add(node);
        
        const neighbors = adjacencyList.get(node) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            // Early termination check - stop if path gets too long
            if (path.length > 10) continue; // Avoid extremely long paths
            queue.push({ node: neighbor, path: [...path, neighbor] });
          }
        }
      }
    }
    
    return null; // No path found
  }, [adjacencyList]);

  // Optimized function to find alternate paths - with timeout and path length limiting
  // Enhanced to find multiple alternatives for each stop count
  const findAlternatePaths = useCallback((startNodeId: string, endNodeId: string, maxPathsPerLength: number = 3): Route[] => {
    perfRef.current.start("findAlternatePaths");
    
    // Check cache first
    const cacheKey = `${startNodeId}-${endNodeId}-${maxPathsPerLength}`;
    if (routeCache.has(cacheKey)) {
      const cachedRoutes = routeCache.get(cacheKey)!;
      perfRef.current.logPerformance("findAlternatePaths (cached)");
      return cachedRoutes;
    }
    
    if (!startNodeId || !endNodeId || startNodeId === endNodeId) return [];
    if (!adjacencyList.has(startNodeId) || !adjacencyList.has(endNodeId)) return [];

    // Time limit for search to prevent hanging
    const startTime = performance.now();
    const MAX_SEARCH_TIME = 5000; // 5 seconds max - increased for more thorough search

    // Find all paths using BFS with path tracking
    const allPaths: string[][] = [];
    const visitedPaths = new Set<string>();
    const queue: string[][] = [[startNodeId]];
    const maxPathLength = Math.min(15, nodeData.length); // Increased limit for more paths
    
    while (queue.length > 0 && performance.now() - startTime < MAX_SEARCH_TIME) {
      const path = queue.shift()!;
      const currentNode = path[path.length - 1];
      
      // Check if we found a path to the target
      if (currentNode === endNodeId) {
        allPaths.push([...path]);
        continue;
      }
      
      // Don't go too deep
      if (path.length >= maxPathLength) continue;
      
      // Process neighbors
      const neighbors = adjacencyList.get(currentNode) || [];
      for (const neighbor of neighbors) {
        // Skip if already in this path (avoid cycles)
        if (path.includes(neighbor)) continue;
        
        // Create potential new path
        const newPath = [...path, neighbor];
        const pathKey = newPath.join("-");
        
        // Skip if we've already considered this exact path
        if (visitedPaths.has(pathKey)) continue;
        
        visitedPaths.add(pathKey);
        queue.push(newPath);
      }
    }
    
    if (performance.now() - startTime >= MAX_SEARCH_TIME) {
      console.warn("Path finding timed out - returning partial results");
    }
    
    // Group paths by length
    const pathsByLength: Map<number, string[][]> = new Map();
    
    allPaths.forEach(path => {
      const length = path.length - 1; // Convert to number of connections
      if (!pathsByLength.has(length)) {
        pathsByLength.set(length, []);
      }
      pathsByLength.get(length)!.push(path);
    });
    
    // Sort lengths and take top 3 lengths
    const sortedLengths = Array.from(pathsByLength.keys()).sort((a, b) => a - b);
    const topLengths = sortedLengths.slice(0, 3);
    
    // For each length, take up to 3 paths
    const selectedPaths: string[][] = [];
    
    topLengths.forEach(length => {
      const pathsOfThisLength = pathsByLength.get(length) || [];
      
      // For paths of the same length, we need a way to differentiate them
      // We can use a simple heuristic - paths with more diverse nodes might be better alternatives
      // This is just a simple way to ensure we get different paths
      pathsOfThisLength.sort((a, b) => {
        // Simple heuristic: sum of character codes can give us a consistent,
        // yet somewhat arbitrary way to sort paths of same length
        const sumA = a.reduce((sum, nodeId) => sum + nodeId.charCodeAt(0), 0);
        const sumB = b.reduce((sum, nodeId) => sum + nodeId.charCodeAt(0), 0);
        return sumA - sumB;
      });
      
      // Take up to maxPathsPerLength paths of this length
      selectedPaths.push(...pathsOfThisLength.slice(0, maxPathsPerLength));
    });
    
    // Mark route groups - routes with the same number of connections
    const routes = selectedPaths.map(path => {
      // Get the links and nodes for this path
      const pathLinks: Link[] = [];
      const nodeSet = new Set<string>(path);
      
      // Find links that connect nodes in this path
      for (let i = 0; i < path.length - 1; i++) {
        const source = path[i];
        const target = path[i + 1];
        
        // Find the link in the linkData array
        for (const link of linkData) {
          const s = getNodeId(link.source);
          const t = getNodeId(link.target);
          
          if ((s === source && t === target) || (s === target && t === source)) {
            pathLinks.push(link);
            break;
          }
        }
      }
      
      // Find the nodes in the path
      const pathNodes = nodeData.filter(node => nodeSet.has(node.id));
      
      return {
        path,
        distance: path.length - 1, // Number of links
        pathNodes,
        pathLinks,
        group: 0, // Will be filled later
        alternativeIndex: 0 // Will be filled later
      };
    });
    
    // Group routes by distance
    const routesByDistance: Map<number, Route[]> = new Map();
    
    routes.forEach(route => {
      if (!routesByDistance.has(route.distance)) {
        routesByDistance.set(route.distance, []);
      }
      routesByDistance.get(route.distance)!.push(route);
    });
    
    // Set group and alternative indices
    let groupIndex = 1;
    const finalRoutes: Route[] = [];
    
    Array.from(routesByDistance.keys())
      .sort((a, b) => a - b)
      .forEach(distance => {
        const routesWithThisDistance = routesByDistance.get(distance)!;
        
        routesWithThisDistance.forEach((route, alternativeIndex) => {
          route.group = groupIndex;
          route.alternativeIndex = alternativeIndex;
          finalRoutes.push(route);
        });
        
        groupIndex++;
      });
    
    // Cache the result
    routeCache.set(cacheKey, finalRoutes);
    
    perfRef.current.logPerformance("findAlternatePaths");
    return finalRoutes;
  }, [adjacencyList, linkData, nodeData]);

  // Debounced route calculation with a ref to track previous calculations
  const previousCalcRef = useRef({ source: '', target: '' });
  
  useEffect(() => {
    // Skip if no nodes selected, same node selected for source and target, or already processing
    if (!sourceNode || !targetNode || sourceNode === targetNode || isProcessing) {
      return;
    }
    
    // Avoid calculation if there's no adjacency list yet
    if (!adjacencyList.size) {
      return;
    }
    
    // Skip if we've already calculated routes for this source-target pair
    if (previousCalcRef.current.source === sourceNode && 
        previousCalcRef.current.target === targetNode &&
        routes.length > 0) {
      return;
    }
    
    const calculateRoutes = async () => {
      setIsProcessing(true);
      
      try {
        // Add a small delay to let the UI render before heavy computation
        await new Promise(resolve => setTimeout(resolve, 50));
        
        perfRef.current.start("Calculate routes");
        console.log(`Calculating routes from ${sourceNode} to ${targetNode}`);
        
        const newRoutes = findAlternatePaths(sourceNode, targetNode, 3);
        
        // Update routes only if we got results or we don't have routes yet
        if (newRoutes.length > 0 || routes.length === 0) {
          setRoutes(newRoutes);
          
          if (newRoutes.length > 0) {
            // Set highlighted route to the first one
            setHighlightedRouteIndex(0);
          } else {
            setHighlightedRouteIndex(-1);
          }
          
          // Remember that we calculated this source-target pair
          previousCalcRef.current = { source: sourceNode, target: targetNode };
        }
        
        perfRef.current.logPerformance("Calculate routes");
      } catch (err) {
        console.error("Error calculating routes:", err);
        setError("Failed to calculate routes between these nodes. Try different nodes.");
      } finally {
        setIsProcessing(false);
      }
    };
    
    // Use setTimeout for a simple debounce
    const timerId = setTimeout(calculateRoutes, 300);
    return () => clearTimeout(timerId);
  }, [sourceNode, targetNode, findAlternatePaths, adjacencyList, isProcessing, routes.length]);

  // Track visualization initialization with a ref
  const visualizationInitialized = useRef(false);

  // Create optimized D3 visualization
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodeData.length === 0) {
      return;
    }

    // Skip re-initialization if already done (except when linkData/customNodeColors changes)
    if (visualizationInitialized.current) {
      return;
    }

    perfRef.current.start("D3 visualization setup");
    
    try {
      // Mark visualization as initialized
      visualizationInitialized.current = true;
      
      // Clear any existing elements
      d3.select(svgRef.current).selectAll("*").remove();
      
      // Create a new root SVG group
      const svg = d3.select(svgRef.current);
      const g = svg.append("g");
      
      const width = containerRef.current.clientWidth || 800;
      const height = containerRef.current.clientHeight || 600;
      
      // Use limited number of nodes for large datasets
      const maxNodesForForceLayout = 200;
      const nodeSubset = nodeData.length > maxNodesForForceLayout 
        ? nodeData.slice(0, maxNodesForForceLayout) 
        : nodeData;
      
      console.log(`Setting up D3 visualization with ${nodeSubset.length} nodes`);
      
      // Create simulation with reduced physics for large datasets
      const sim = d3.forceSimulation<Node>(nodeSubset)
        .force("link", d3.forceLink<Node, Link>(linkData)
          .id(d => d.id)
          .distance(75)
          .strength(nodeData.length > 100 ? 0.3 : 1.0)) // Reduce strength for large datasets
        .force("charge", d3.forceManyBody()
          .strength(nodeData.length > 100 ? -100 : -300)) // Reduce charge for large datasets
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(d => 7 + 2))
        .alphaDecay(nodeData.length > 100 ? 0.05 : 0.02); // Faster decay for large datasets
      
      setSimulation(sim);
      
      // Create links
      const link = g.append("g")
        .attr("class", "links")
        .selectAll<SVGLineElement, Link>("line")
        .data(linkData)
        .enter()
        .append("line")
        .attr("class", "link")
        .attr("stroke", "#999")
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.6);
      
      // Get node color based on category
      const getNodeColor = (node: Node) => {
        // Check for custom color for this specific node
        if (customNodeColors[node.id]) {
          return customNodeColors[node.id];
        }
        
        // Default color map based on categories
        const colorMap: Record<string, string> = {
          'Person': '#4299E1', // blue
          'Organization': '#48BB78', // green
          'Location': '#ED8936', // orange
          'Event': '#9F7AEA', // purple
          'Concept': '#F56565', // red
          'default': '#A0AEC0' // gray
        };
        
        return colorMap[node.category] || colorMap.default;
      };
      
      // Handler for node click with debouncing
      const handleNodeClick = (function() {
        let lastClickTime = 0;
        const DEBOUNCE_TIME = 300; // ms
        
        return function(event: React.MouseEvent<SVGCircleElement, MouseEvent>, d: Node) {
          event.stopPropagation(); // Prevent event bubbling
          
          // Debounce clicks
          const now = Date.now();
          if (now - lastClickTime < DEBOUNCE_TIME) {
            return;
          }
          lastClickTime = now;
          
          // Set as source or target node based on current state
          if (!sourceNode || (targetNode && sourceNode !== d.id && targetNode !== d.id)) {
            setSourceNode(d.id);
          } else if (!targetNode || sourceNode !== d.id) {
            setTargetNode(d.id);
          }
        };
      })();
      
      // Create nodes with optimized event handling
      const node = g.append("g")
        .attr("class", "nodes")
        .selectAll<SVGCircleElement, Node>("circle")
        .data(nodeSubset)
        .enter()
        .append("circle")
        .attr("class", "node")
        .attr("r", 7)
        .attr("fill", d => getNodeColor(d))
        .attr("stroke", "#000")
        .attr("stroke-width", 1.5)
        .attr("cx", (d: Node) => d.x !== undefined ? d.x : width / 2)
        .attr("cy", (d: Node) => d.y !== undefined ? d.y : height / 2)
        .on("click", handleNodeClick);
      
      // Only add labels for smaller datasets
      if (nodeSubset.length <= 100) {
        const nodeLabel = g.append("g")
          .attr("class", "node-labels")
          .selectAll("text")
          .data(nodeSubset)
          .enter()
          .append("text")
          .attr("class", "node-label")
          .attr("dy", "0.35em")
          .attr("text-anchor", "middle")
          .text(d => d.id.length > 10 ? d.id.substring(0, 8) + '...' : d.id)
          .style("fill", "#fff")
          .style("font-size", "8px")
          .style("text-shadow", "0 1px 2px rgba(0,0,0,0.7)")
          .style("pointer-events", "none")
          .attr("x", (d: Node) => d.x !== undefined ? d.x : width / 2)
          .attr("y", (d: Node) => d.y !== undefined ? d.y : height / 2);
        
        // Update function for simulation with labels
        sim.on("tick", () => {
          link
            .attr("x1", d => {
              const source = typeof d.source === 'object' ? d.source.x : width/2;
              return source !== undefined ? source : width/2;
            })
            .attr("y1", d => {
              const source = typeof d.source === 'object' ? d.source.y : height/2;
              return source !== undefined ? source : height/2;
            })
            .attr("x2", d => {
              const target = typeof d.target === 'object' ? d.target.x : width/2;
              return target !== undefined ? target : width/2;
            })
            .attr("y2", d => {
              const target = typeof d.target === 'object' ? d.target.y : height/2;
              return target !== undefined ? target : height/2;
            });
          
          node
            .attr("cx", (d: Node) => d.x !== undefined ? d.x : width/2)
            .attr("cy", (d: Node) => d.y !== undefined ? d.y : height/2);
          
          nodeLabel
            .attr("x", (d: Node) => d.x !== undefined ? d.x : width/2)
            .attr("y", (d: Node) => d.y !== undefined ? d.y : height/2);
        });
      } else {
        // Simplified update function for large datasets (no labels)
        sim.on("tick", () => {
          link
            .attr("x1", d => {
              const source = typeof d.source === 'object' ? d.source.x : width/2;
              return source !== undefined ? source : width/2;
            })
            .attr("y1", d => {
              const source = typeof d.source === 'object' ? d.source.y : height/2;
              return source !== undefined ? source : height/2;
            })
            .attr("x2", d => {
              const target = typeof d.target === 'object' ? d.target.x : width/2;
              return target !== undefined ? target : width/2;
            })
            .attr("y2", d => {
              const target = typeof d.target === 'object' ? d.target.y : height/2;
              return target !== undefined ? target : height/2;
            });
          
          node
            .attr("cx", (d: Node) => d.x !== undefined ? d.x : width/2)
            .attr("cy", (d: Node) => d.y !== undefined ? d.y : height/2);
        });
      }
      
      // Add zoom capability
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 10])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        });
      
      svg.call(zoom);
      
      // Limit simulation steps for large datasets
      if (nodeData.length > 100) {
        sim.alpha(0.3).restart();
        
        // Stop simulation after a certain number of ticks for large graphs
        let tickCount = 0;
        const maxTicks = 300;
        
        const originalTick = sim.tick;
        sim.tick = function() {
          tickCount++;
          if (tickCount >= maxTicks) {
            sim.stop();
            console.log("Stopped simulation after", maxTicks, "ticks");
            return true;
          }
          return originalTick.call(this);
        };
      } else {
        // For smaller graphs, let it run longer
        sim.alpha(0.3).restart();
      }
      
      perfRef.current.logPerformance("D3 visualization setup");
    } catch (err) {
      console.error("Error setting up D3 visualization:", err);
      setError("Failed to set up visualization. Please try a smaller dataset.");
    }
    
    // Clean up function - important for memory management
    return () => {
      if (simulation) {
        simulation.stop();
        setSimulation(null);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeData, linkData, customNodeColors, sourceNode, targetNode]);
  
  // Reset visualization initialization when component remounts or data changes significantly
  useEffect(() => {
    return () => {
      visualizationInitialized.current = false;
    };
  }, [nodeData.length, linkData.length]);

  // Update path highlights when routes or highlighted route changes
  // Use a ref to track the last highlight state to avoid unnecessary updates
  const lastHighlightRef = useRef({
    routeId: '',
    highlightedIndex: -1
  });

  useEffect(() => {
    if (!svgRef.current || routes.length === 0 || highlightedRouteIndex < 0) return;
    
    // Calculate a unique ID for the current route to compare with previous
    const selectedRoute = routes[highlightedRouteIndex];
    const currentRouteId = selectedRoute ? `${sourceNode}-${targetNode}-${selectedRoute.path.join('-')}` : '';
    
    // Skip update if we're highlighting the same route
    if (lastHighlightRef.current.routeId === currentRouteId && 
        lastHighlightRef.current.highlightedIndex === highlightedRouteIndex) {
      return;
    }
    
    perfRef.current.start("Update path highlights");
    
    try {
      const svg = d3.select(svgRef.current);
      
      // Reset all link styles first
      svg.selectAll(".link")
        .attr("stroke", "#999")
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.6);
      
      // Reset all node styles
      svg.selectAll<SVGCircleElement, Node>(".node")
        .filter((d: Node) => d.id !== sourceNode && d.id !== targetNode)
        .attr("fill", d => {
          // Custom node colors logic
          if (customNodeColors[d.id]) {
            return customNodeColors[d.id];
          }
          
          // Default color map
          const colorMap: Record<string, string> = {
            'Person': '#4299E1',
            'Organization': '#48BB78',
            'Location': '#ED8936',
            'Event': '#9F7AEA',
            'Concept': '#F56565',
            'default': '#A0AEC0'
          };
          
          return colorMap[d.category] || colorMap.default;
        })
        .attr("r", 7)
        .attr("stroke", "#000")
        .attr("stroke-width", 1.5);
      
      // Color palette for different routes
      const routeColors = ["#E63946", "#4361EE", "#FCBF49"];
      
      // Highlight the selected route
      if (selectedRoute) {
        // Highlight source and target nodes first
        svg.selectAll<SVGCircleElement, Node>(".node")
          .filter(d => d.id === sourceNode)
          .attr("fill", "#ff5722")  // Source node in orange
          .attr("r", 9)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 2);
          
        svg.selectAll<SVGCircleElement, Node>(".node")
          .filter(d => d.id === targetNode)
          .attr("fill", "#4caf50")  // Target node in green
          .attr("r", 9)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 2);
        
        // Create a set of path segments for faster lookups
        const pathSegments = new Set<string>();
        for (let i = 0; i < selectedRoute.path.length - 1; i++) {
          const a = selectedRoute.path[i];
          const b = selectedRoute.path[i + 1];
          pathSegments.add(`${a}-${b}`);
          pathSegments.add(`${b}-${a}`); // Add both directions
        }
        
        // Highlight links in the path
        svg.selectAll<SVGLineElement, Link>(".link")
          .filter((link: Link) => {
            const source = getNodeId(link.source);
            const target = getNodeId(link.target);
            return pathSegments.has(`${source}-${target}`) || pathSegments.has(`${target}-${source}`);
          })
          .attr("stroke", routeColors[highlightedRouteIndex % routeColors.length])
          .attr("stroke-width", 3)
          .attr("stroke-opacity", 1);
        
        // Create a set of path nodes for faster lookups
        const pathNodeSet = new Set(selectedRoute.path);
        
        // Highlight nodes in the path (excluding source/target)
        svg.selectAll<SVGCircleElement, Node>(".node")
          .filter((d: Node) => 
            pathNodeSet.has(d.id) && 
            d.id !== sourceNode && 
            d.id !== targetNode)
          .attr("fill", routeColors[highlightedRouteIndex % routeColors.length])
          .attr("r", 8)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 2);
          
        // Update the last highlight ref to avoid redundant updates
        lastHighlightRef.current = {
          routeId: currentRouteId,
          highlightedIndex: highlightedRouteIndex
        };
      }
      
      perfRef.current.logPerformance("Update path highlights");
    } catch (err) {
      console.error("Error updating path highlights:", err);
    }
  }, [routes, highlightedRouteIndex, sourceNode, targetNode, customNodeColors]);

  // Handle reset
  const handleReset = () => {
    setSourceNode('');
    setTargetNode('');
    setRoutes([]);
    setHighlightedRouteIndex(-1);
    setError(null);
  };

  // Handle route selection
  const handleSelectRoute = (index: number) => {
    setHighlightedRouteIndex(index);
  };

  // Generate route summary
  const renderRouteSummary = () => {
    if (error) {
      return (
        <div className="p-4 bg-red-50 rounded-md text-center text-red-500 border border-red-200">
          <p>{error}</p>
          <Button 
            variant="outline" 
            className="w-full mt-2 text-red-500 border-red-200 hover:bg-red-100" 
            onClick={handleReset}
          >
            Reset
          </Button>
        </div>
      );
    }
    
    if (isProcessing) {
      return (
        <div className="p-4 bg-blue-50 rounded-md text-center text-blue-500">
          <p>Calculating routes...</p>
          <div className="mt-2 flex justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      );
    }
    
    if (routes.length === 0) {
      return (
        <div className="p-4 bg-gray-100 rounded-md text-center text-gray-500">
          <p>Select source and target nodes to view possible routes</p>
        </div>
      );
    }

    // Group routes by distance group
    const routeGroups = new Map<number, Route[]>();
    routes.forEach(route => {
      if (!routeGroups.has(route.group)) {
        routeGroups.set(route.group, []);
      }
      routeGroups.get(route.group)!.push(route);
    });

    const orderedGroups = Array.from(routeGroups.entries()).sort((a, b) => a[0] - b[0]);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-gray-700">Found {routes.length} possible route{routes.length !== 1 ? 's' : ''}</h3>
          <Button 
            size="sm"
            variant="outline"
            onClick={generatePdfReport}
            disabled={generatingPDF}
            className="gap-1 text-xs"
          >
            {generatingPDF ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileDown size={14} />
                Export PDF
              </>
            )}
          </Button>
        </div>
        
        {orderedGroups.map(([group, groupRoutes]) => {
          // Sort routes within group by alternativeIndex
          const sortedGroupRoutes = [...groupRoutes].sort((a, b) => a.alternativeIndex - b.alternativeIndex);
          const mainRoute = sortedGroupRoutes[0];
          const alternatives = sortedGroupRoutes.slice(1);
          
          return (
            <div key={group} className="space-y-2">
              {/* Main route */}
              <Card 
                className={`overflow-hidden transition-all cursor-pointer ${
                  sortedGroupRoutes.some(r => routes.indexOf(r) === highlightedRouteIndex)
                    ? 'border-l-4 border-l-blue-500'
                    : ''
                }`}
              >
                <CardHeader className="p-3 pb-0 bg-gradient-to-r from-blue-50 to-transparent">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge variant="default">
                        Route {group}
                      </Badge>
                      <span className="text-sm font-normal">
                        {mainRoute.distance} {mainRoute.distance === 1 ? 'connection' : 'connections'}
                      </span>
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent 
                  className={`p-3 pt-2 ${
                    routes.indexOf(mainRoute) === highlightedRouteIndex
                      ? 'bg-blue-50'
                      : ''
                  }`}
                  onClick={() => handleSelectRoute(routes.indexOf(mainRoute))}
                >
                  <div className="flex items-center gap-1 flex-wrap">
                    {mainRoute.path.map((nodeId, i) => (
                      <React.Fragment key={i}>
                        <Badge variant="outline" className={`
                          ${nodeId === sourceNode ? 'bg-orange-100 text-orange-700 border-orange-200' : ''}
                          ${nodeId === targetNode ? 'bg-green-100 text-green-700 border-green-200' : ''}
                        `}>
                          {nodeId}
                        </Badge>
                        {i < mainRoute.path.length - 1 && (
                          <ArrowRight size={12} className="text-gray-400" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </CardContent>
                
                {/* Alternatives */}
                {alternatives.length > 0 && (
                  <div className="border-t border-gray-100">
                    <div className="px-3 py-1 text-xs text-gray-500 bg-gray-50">
                      Alternative Routes (same number of connections)
                    </div>
                    
                    {alternatives.map((route, altIndex) => (
                      <div 
                        key={altIndex}
                        className={`px-3 py-2 border-t border-gray-100 cursor-pointer text-sm ${
                          routes.indexOf(route) === highlightedRouteIndex
                            ? 'bg-blue-50'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleSelectRoute(routes.indexOf(route))}
                      >
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge variant="outline" className="bg-gray-100 text-gray-700">
                            Alt {altIndex + 1}
                          </Badge>
                          {route.path.map((nodeId, i) => (
                            <React.Fragment key={i}>
                              <Badge variant="outline" className={`
                                text-xs py-0 px-1
                                ${nodeId === sourceNode ? 'bg-orange-50 text-orange-700 border-orange-100' : ''}
                                ${nodeId === targetNode ? 'bg-green-50 text-green-700 border-green-100' : ''}
                              `}>
                                {nodeId}
                              </Badge>
                              {i < route.path.length - 1 && (
                                <ArrowRight size={8} className="text-gray-300" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          );
        })}
        
        {/* Hidden div to render PDF content - not visible to user */}
        <div 
          ref={pdfContentRef} 
          className="fixed left-0 top-0 w-0 h-0 overflow-hidden opacity-0 pointer-events-none"
          aria-hidden="true"
        >
          <div id="pdf-content" className="bg-white p-8 w-[794px]">
            <h1 className="text-2xl font-bold text-blue-900">Route Analysis Report</h1>
            <p className="text-gray-600">From {sourceNode} to {targetNode}</p>
            <div className="mt-4">
              {orderedGroups.map(([group, groupRoutes]) => {
                const sortedGroupRoutes = [...groupRoutes].sort((a, b) => a.alternativeIndex - b.alternativeIndex);
                return (
                  <div key={group} className="mb-4 border p-3 rounded">
                    <h3 className="font-medium">Route {group}: {sortedGroupRoutes[0].distance} connections</h3>
                    <div className="flex flex-wrap items-center gap-1 mt-2">
                      {sortedGroupRoutes[0].path.map((nodeId, i) => (
                        <React.Fragment key={i}>
                          <span className={`px-2 py-1 rounded text-sm
                            ${nodeId === sourceNode ? 'bg-orange-100 text-orange-700' : ''}
                            ${nodeId === targetNode ? 'bg-green-100 text-green-700' : ''}
                            ${nodeId !== sourceNode && nodeId !== targetNode ? 'bg-blue-50 text-blue-700' : ''}
                          `}>
                            {nodeId}
                          </span>
                          {i < sortedGroupRoutes[0].path.length - 1 && (
                            <span className="text-gray-400">→</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    
                    {sortedGroupRoutes.slice(1).map((route, altIndex) => (
                      <div key={altIndex} className="mt-2 pt-2 border-t border-gray-200">
                        <h4 className="text-sm font-medium">Alternative {altIndex + 1}</h4>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {route.path.map((nodeId, i) => (
                            <React.Fragment key={i}>
                              <span className={`px-2 py-0.5 rounded text-xs
                                ${nodeId === sourceNode ? 'bg-orange-50 text-orange-700' : ''}
                                ${nodeId === targetNode ? 'bg-green-50 text-green-700' : ''}
                                ${nodeId !== sourceNode && nodeId !== targetNode ? 'bg-gray-50 text-gray-700' : ''}
                              `}>
                                {nodeId}
                              </span>
                              {i < route.path.length - 1 && (
                                <span className="text-gray-300">→</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Additional information about dataset size
  const renderDatasetInfo = () => {
    return (
      <div className="mt-4 text-xs text-gray-500">
        <p>Dataset: {nodeData.length} nodes, {linkData.length} connections</p>
        {nodeData.length > 100 && (
          <p className="text-amber-600 mt-1">
            Large dataset detected: visualization limited to {Math.min(nodeData.length, 200)} nodes
          </p>
        )}
      </div>
    );
  };
  
  // PDF Generation
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  
  // Function to generate PDF report of routes
  const generatePdfReport = async () => {
    if (routes.length === 0) {
      setError("Please select source and target nodes to generate routes first");
      return;
    }
    
    try {
      setGeneratingPDF(true);
      
      // Create PDF document with A4 dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // PDF dimensions
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      
      // Add title
      pdf.setFontSize(20);
      pdf.setTextColor(0, 51, 102);
      pdf.text('Route Analysis Report', margin, margin + 5);
      
      // Add subtitle with source and target
      pdf.setFontSize(14);
      pdf.setTextColor(60, 60, 60);
      pdf.text(`From "${sourceNode}" to "${targetNode}"`, margin, margin + 15);
      
      // Add date
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      const dateStr = new Date().toLocaleDateString();
      pdf.text(`Generated on ${dateStr}`, margin, margin + 22);
      
      // Add horizontal line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, margin + 27, pageWidth - margin, margin + 27);
      
      // Add dataset info
      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Network: ${nodeData.length} nodes, ${linkData.length} connections`, margin, margin + 35);
      
      // Add route summary title
      pdf.setFontSize(16);
      pdf.setTextColor(0, 102, 102);
      pdf.text('Route Summary', margin, margin + 45);
      
      // Group routes by distance group
      const routeGroups = new Map<number, Route[]>();
      routes.forEach(route => {
        if (!routeGroups.has(route.group)) {
          routeGroups.set(route.group, []);
        }
        routeGroups.get(route.group)!.push(route);
      });

      const orderedGroups = Array.from(routeGroups.entries()).sort((a, b) => a[0] - b[0]);
      
      // Add routes information
      let yPosition = margin + 55;
      
      // For each group of routes
      for (const [groupIndex, groupRoutes] of orderedGroups) {
        // Sort routes within group by alternativeIndex
        const sortedGroupRoutes = [...groupRoutes].sort((a, b) => a.alternativeIndex - b.alternativeIndex);
        const mainRoute = sortedGroupRoutes[0];
        const alternatives = sortedGroupRoutes.slice(1);
        
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = margin + 20;
        }
        
        // Main route header
        pdf.setFillColor(240, 248, 255); // Light blue background
        pdf.roundedRect(margin, yPosition, contentWidth, 10, 2, 2, 'F');
        
        pdf.setFontSize(13);
        pdf.setTextColor(0, 51, 102);
        pdf.text(`Route ${groupIndex}: ${mainRoute.distance} ${mainRoute.distance === 1 ? 'connection' : 'connections'}`, margin + 5, yPosition + 7);
        
        yPosition += 16;
        
        // Main route path
        pdf.setFontSize(10);
        
        // Layout nodes with arrows
        let currentX = margin + 5;
        let currentY = yPosition;
        let lineCounter = 0;
        
        // Draw main route path
        for (let j = 0; j < mainRoute.path.length; j++) {
          const nodeId = mainRoute.path[j];
          const nodeText = nodeId;
          const textWidth = pdf.getTextWidth(nodeText) + 10; // Padding
          
          // Check if we need to move to next line
          if (currentX + textWidth + 10 > pageWidth - margin && j > 0) {
            currentX = margin + 10;
            currentY += 10;
            lineCounter = 0;
          }
          
          // Node with color background
          let bgColor;
          if (nodeId === sourceNode) {
            bgColor = [255, 235, 210]; // Light orange for source
          } else if (nodeId === targetNode) {
            bgColor = [220, 255, 220]; // Light green for target
          } else {
            bgColor = [230, 240, 255]; // Light blue for intermediate
          }
          
          pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
          pdf.roundedRect(currentX, currentY - 4, textWidth, 6, 2, 2, 'F');
          
          // Node text
          pdf.setTextColor(0, 0, 0);
          pdf.text(nodeText, currentX + 5, currentY);
          
          // Add arrow if not the last node
          if (j < mainRoute.path.length - 1) {
            currentX += textWidth + 2;
            pdf.setDrawColor(150, 150, 150);
            pdf.line(currentX, currentY - 1, currentX + 5, currentY - 1);
            pdf.line(currentX + 5, currentY - 1, currentX + 3, currentY - 2);
            pdf.line(currentX + 5, currentY - 1, currentX + 3, currentY);
            currentX += 8;
          } else {
            currentX += textWidth + 10;
          }
          
          lineCounter++;
        }
        
        // Update y position based on how many lines were used
        const mainRouteLines = Math.ceil(mainRoute.path.length / 7); // Approximate nodes per line
        yPosition += mainRouteLines * 10;
        
        // Add alternatives if any
        if (alternatives.length > 0) {
          // Alternatives header
          pdf.setFontSize(11);
          pdf.setTextColor(90, 90, 90);
          pdf.text("Alternative Routes (same distance):", margin + 5, yPosition + 5);
          
          yPosition += 10;
          
          // Draw each alternative route
          for (let i = 0; i < alternatives.length; i++) {
            const route = alternatives[i];
            
            // Check if we need a new page
            if (yPosition > pageHeight - 40) {
              pdf.addPage();
              yPosition = margin + 20;
            }
            
            // Alternative route header
            pdf.setFillColor(245, 245, 245); // Light gray background
            pdf.roundedRect(margin + 5, yPosition, contentWidth - 10, 8, 2, 2, 'F');
            
            pdf.setFontSize(10);
            pdf.setTextColor(80, 80, 80);
            pdf.text(`Alternative ${i + 1}`, margin + 10, yPosition + 5.5);
            
            yPosition += 12;
            
            // Alternative route path
            pdf.setFontSize(9);
            
            // Layout nodes with arrows
            currentX = margin + 15;
            currentY = yPosition;
            lineCounter = 0;
            
            // Draw alternative route path
            for (let j = 0; j < route.path.length; j++) {
              const nodeId = route.path[j];
              const nodeText = nodeId;
              const textWidth = pdf.getTextWidth(nodeText) + 6; // Smaller padding
              
              // Check if we need to move to next line
              if (currentX + textWidth + 10 > pageWidth - margin && j > 0) {
                currentX = margin + 15;
                currentY += 8;
                lineCounter = 0;
              }
              
              // Node with color background (lighter colors for alternatives)
              let bgColor;
              if (nodeId === sourceNode) {
                bgColor = [255, 245, 230]; // Lighter orange for source
              } else if (nodeId === targetNode) {
                bgColor = [240, 255, 240]; // Lighter green for target
              } else {
                bgColor = [245, 250, 255]; // Lighter blue for intermediate
              }
              
              pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
              pdf.roundedRect(currentX, currentY - 3, textWidth, 5, 1, 1, 'F');
              
              // Node text
              pdf.setTextColor(60, 60, 60);
              pdf.text(nodeText, currentX + 3, currentY);
              
              // Add arrow if not the last node
              if (j < route.path.length - 1) {
                currentX += textWidth + 2;
                pdf.setDrawColor(180, 180, 180);
                pdf.line(currentX, currentY - 1, currentX + 4, currentY - 1);
                pdf.line(currentX + 4, currentY - 1, currentX + 2, currentY - 2);
                pdf.line(currentX + 4, currentY - 1, currentX + 2, currentY);
                currentX += 6;
              } else {
                currentX += textWidth + 10;
              }
              
              lineCounter++;
            }
            
            // Update y position based on how many lines were used
            const altRouteLines = Math.ceil(route.path.length / 8); // Approximate nodes per line
            yPosition += altRouteLines * 8 + 5;
          }
        }
        
        // Add some spacing between route groups
        yPosition += 15;
        
        // Add divider between route groups
        pdf.setDrawColor(230, 230, 230);
        pdf.line(margin, yPosition - 8, pageWidth - margin, yPosition - 8);
      }
      
      // Capture the visualization as image
      if (svgRef.current) {
        try {
          const canvas = await html2canvas(svgRef.current as unknown as HTMLElement, {
            backgroundColor: "#f8f8f8",
            scale: 2
          });
          
          // Make sure we have space for the visualization
          if (yPosition + 120 > pageHeight) {
            pdf.addPage();
            yPosition = margin;
          } else {
            // Add some space
            yPosition += 10;
          }
          
          // Add title for visualization
          pdf.setFontSize(16);
          pdf.setTextColor(0, 102, 102);
          pdf.text('Network Visualization', margin, yPosition + 10);
          
          // Add the network visualization image
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = contentWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Check if image would go off page
          if (yPosition + imgHeight + 25 > pageHeight) {
            pdf.addPage();
            yPosition = margin;
          }
          
          pdf.addImage(imgData, 'PNG', margin, yPosition + 15, imgWidth, imgHeight);
          
          // Add caption
          pdf.setFontSize(9);
          pdf.setTextColor(100, 100, 100);
          pdf.text('Network graph showing the highlighted route between nodes', margin, yPosition + imgHeight + 20);
        } catch (err) {
          console.error("Error capturing visualization:", err);
        }
      }
      
      // Add footer
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Generated with Route Finder Visualization Tool', margin, pageHeight - 10);
      
      // Save the PDF
      pdf.save(`route-analysis-${sourceNode}-to-${targetNode}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      setError("Failed to generate PDF report. Please try again.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Memoize node dropdowns to prevent unnecessary re-renders
  const NodeSelectionDropdowns = React.memo(() => (
    <div className="mb-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Source Node
        </label>
        <Select
          value={sourceNode}
          onValueChange={setSourceNode}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select source node" />
          </SelectTrigger>
          <SelectContent>
            {nodeData.slice(0, 100).map(node => (
              <SelectItem 
                key={node.id} 
                value={node.id}
                disabled={node.id === targetNode}
              >
                {node.id}
              </SelectItem>
            ))}
            {nodeData.length > 100 && (
              <div className="px-2 py-1 text-xs text-amber-500">
                Showing first 100 of {nodeData.length} nodes
              </div>
            )}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Target Node
        </label>
        <Select
          value={targetNode}
          onValueChange={setTargetNode}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select target node" />
          </SelectTrigger>
          <SelectContent>
            {nodeData.slice(0, 100).map(node => (
              <SelectItem 
                key={node.id} 
                value={node.id}
                disabled={node.id === sourceNode}
              >
                {node.id}
              </SelectItem>
            ))}
            {nodeData.length > 100 && (
              <div className="px-2 py-1 text-xs text-amber-500">
                Showing first 100 of {nodeData.length} nodes
              </div>
            )}
          </SelectContent>
        </Select>
      </div>
      
      <Button 
        variant="outline" 
        className="w-full" 
        onClick={handleReset}
      >
        Reset Selection
      </Button>
    </div>
  ));

  return (
    <div className="flex w-full h-full">
      {/* Left sidebar with route options */}
      <div className="w-64 bg-gray-50 p-3 border-r border-gray-200 overflow-y-auto flex flex-col">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <MapPin size={18} /> Route Finder
        </h2>
        
        {/* Node selection dropdowns */}
        <NodeSelectionDropdowns />
        
        <Tabs 
          value={selectedTab} 
          onValueChange={setSelectedTab}
          className="flex-1 flex flex-col"
        >
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="routeOptions">Routes</TabsTrigger>
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="routeOptions" className="flex-1 overflow-y-auto">
            {renderRouteSummary()}
            {renderDatasetInfo()}
          </TabsContent>
          
          <TabsContent value="instructions" className="flex-1 overflow-y-auto">
            <div className="space-y-3 text-sm">
              <p className="font-medium">How to use the Route Finder:</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Select a <span className="text-orange-600 font-medium">source node</span> from the dropdown or by clicking a node</li>
                <li>Select a <span className="text-green-600 font-medium">target node</span> from the dropdown or by clicking another node</li>
                <li>The visualization will show up to 3 possible routes between the nodes</li>
                <li>Click on a route in the list to highlight it in the visualization</li>
              </ol>
              <p className="mt-2">
                The route with the fewest connections is shown first. Click on different routes to compare them.
              </p>
              {nodeData.length > 100 && (
                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-amber-700">
                  <p className="font-medium">Performance Note:</p>
                  <p>Large dataset detected ({nodeData.length} nodes, {linkData.length} links). Some features have been optimized for performance.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Main visualization area */}
      <div className="flex-1 relative">
        <div 
          ref={containerRef} 
          className="w-full h-full relative bg-gray-100"
          style={{ touchAction: "none" }}
        >
          <svg 
            ref={svgRef} 
            className="w-full h-full"
            style={{ pointerEvents: "all" }}
          />
          
          {/* Route info overlay - only render when needed */}
          {routes.length > 0 && highlightedRouteIndex >= 0 && routes[highlightedRouteIndex] && (
            <div className="absolute top-4 left-4 bg-white/90 p-3 rounded-md shadow-md max-w-xs">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <MapPin size={14} />
                Route {highlightedRouteIndex + 1} Summary
              </h3>
              <div className="text-xs mt-1">
                <p>From <span className="font-medium text-orange-600">{sourceNode}</span> to <span className="font-medium text-green-600">{targetNode}</span></p>
                <p>Distance: {routes[highlightedRouteIndex].distance} connections</p>
                <p>Intermediate nodes: {routes[highlightedRouteIndex].path.length - 2}</p>
              </div>
            </div>
          )}
          
          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-lg font-medium">Processing...</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Error overlay */}
          {error && !isProcessing && (
            <div className="absolute top-4 right-4 bg-red-50 p-3 rounded-md shadow-md max-w-xs border border-red-200">
              <h3 className="text-sm font-semibold text-red-500">Error</h3>
              <p className="text-xs mt-1 text-red-600">{error}</p>
              <Button 
                variant="outline" 
                className="w-full mt-2 text-red-500 border-red-200 hover:bg-red-100" 
                onClick={() => setError(null)}
                size="sm"
              >
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteFinderVisualization;