import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { ArrowRight, MapPin } from 'lucide-react';
import { Node, Link, VisualizationType } from '@/types/networkTypes';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
}

// Define a path type to hold route information
interface Route {
  path: string[];
  distance: number;
  pathNodes: Node[];
  pathLinks: Link[];
}

// Helper function to get node ID regardless of node format
const getNodeId = (node: { id: string } | string | null): string => {
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
  customNodeColors = {}
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
  const findAlternatePaths = useCallback((startNodeId: string, endNodeId: string, maxPaths: number = 3): Route[] => {
    perfRef.current.start("findAlternatePaths");
    
    // Check cache first
    const cacheKey = `${startNodeId}-${endNodeId}-${maxPaths}`;
    if (routeCache.has(cacheKey)) {
      const cachedRoutes = routeCache.get(cacheKey)!;
      perfRef.current.logPerformance("findAlternatePaths (cached)");
      return cachedRoutes;
    }
    
    if (!startNodeId || !endNodeId || startNodeId === endNodeId) return [];
    if (!adjacencyList.has(startNodeId) || !adjacencyList.has(endNodeId)) return [];

    // Time limit for search to prevent hanging
    const startTime = performance.now();
    const MAX_SEARCH_TIME = 3000; // 3 seconds max

    // Find all paths using BFS with path tracking instead of DFS
    // This will find shorter paths first, which is usually what we want
    const allPaths: string[][] = [];
    const visitedPaths = new Set<string>();
    const queue: string[][] = [[startNodeId]];
    const maxPathLength = Math.min(10, nodeData.length); // Stricter limit for large graphs
    
    while (queue.length > 0 && performance.now() - startTime < MAX_SEARCH_TIME) {
      const path = queue.shift()!;
      const currentNode = path[path.length - 1];
      
      // Check if we found a path to the target
      if (currentNode === endNodeId) {
        allPaths.push([...path]);
        // If we have enough paths, we can stop
        if (allPaths.length >= maxPaths) {
          break;
        }
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
    
    // Sort paths by length and get the top paths
    const sortedPaths = allPaths
      .sort((a, b) => a.length - b.length)
      .slice(0, maxPaths);
    
    // Convert paths to Route objects with distance and nodes/links
    const routes = sortedPaths.map(path => {
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
        pathLinks
      };
    });
    
    // Cache the result
    routeCache.set(cacheKey, routes);
    
    perfRef.current.logPerformance("findAlternatePaths");
    return routes;
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

    return (
      <div className="space-y-4">
        {routes.map((route, index) => (
          <Card 
            key={index}
            className={`overflow-hidden transition-all cursor-pointer ${
              index === highlightedRouteIndex 
                ? 'border-2 border-blue-500 shadow-md' 
                : 'hover:shadow-md'
            }`}
            onClick={() => handleSelectRoute(index)}
          >
            <CardHeader className="p-3 pb-0">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant={index === 0 ? "default" : (index === 1 ? "secondary" : "outline")}>
                    Route {index + 1}
                  </Badge>
                  <span className="text-sm font-normal">
                    {route.distance} {route.distance === 1 ? 'connection' : 'connections'}
                  </span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className="flex items-center gap-1 flex-wrap">
                {route.path.map((nodeId, i) => (
                  <React.Fragment key={i}>
                    <Badge variant="outline" className={`
                      ${nodeId === sourceNode ? 'bg-orange-100 text-orange-700 border-orange-200' : ''}
                      ${nodeId === targetNode ? 'bg-green-100 text-green-700 border-green-200' : ''}
                    `}>
                      {nodeId}
                    </Badge>
                    {i < route.path.length - 1 && (
                      <ArrowRight size={12} className="text-gray-400" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
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