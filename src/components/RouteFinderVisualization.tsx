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

const RouteFinderVisualization: React.FC<RouteFinderProps> = ({
  nodeData,
  linkData,
  colorTheme = 'default',
  customNodeColors = {}
}) => {
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
  
  // Prepare node and link data
  useEffect(() => {
    if (nodeData.length > 0) {
      // Find unique categories
      const categories = Array.from(new Set(nodeData.map(node => node.category)));
      setUniqueCategories(categories);
      
      // Set default source/target nodes if none selected
      if (!sourceNode && nodeData.length >= 1) {
        setSourceNode(nodeData[0].id);
      }
      if (!targetNode && nodeData.length >= 2) {
        setTargetNode(nodeData[1].id);
      }
    }
  }, [nodeData, sourceNode, targetNode]);

  // Function to find shortest path using BFS
  const findShortestPath = useCallback((startNodeId: string, endNodeId: string): string[] | null => {
    if (!startNodeId || !endNodeId || startNodeId === endNodeId) return null;

    // Create adjacency list from links
    const adjacencyList = new Map<string, string[]>();
    linkData.forEach(link => {
      const source = typeof link.source === 'object' ? link.source.id : link.source;
      const target = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (!adjacencyList.has(source)) {
        adjacencyList.set(source, []);
      }
      if (!adjacencyList.has(target)) {
        adjacencyList.set(target, []);
      }
      
      // Add both directions for undirected graph
      adjacencyList.get(source)!.push(target);
      adjacencyList.get(target)!.push(source);
    });

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
            queue.push({ node: neighbor, path: [...path, neighbor] });
          }
        }
      }
    }
    
    return null; // No path found
  }, [linkData]);

  // Function to find alternate paths using a modified DFS
  const findAlternatePaths = useCallback((startNodeId: string, endNodeId: string, maxPaths: number = 3): Route[] => {
    if (!startNodeId || !endNodeId || startNodeId === endNodeId) return [];

    // Create adjacency list from links
    const adjacencyList = new Map<string, string[]>();
    linkData.forEach(link => {
      const source = typeof link.source === 'object' ? link.source.id : String(link.source);
      const target = typeof link.target === 'object' ? link.target.id : String(link.target);
      
      if (!adjacencyList.has(source)) {
        adjacencyList.set(source, []);
      }
      if (!adjacencyList.has(target)) {
        adjacencyList.set(target, []);
      }
      
      // Add both directions for undirected graph
      adjacencyList.get(source)!.push(target);
      adjacencyList.get(target)!.push(source);
    });

    // Find all paths using DFS with limited path length to prevent excessively long paths
    const paths: string[][] = [];
    const maxPathLength = nodeData.length; // Limit to avoid cycles and extremely long paths
    
    const dfs = (currentNode: string, targetNode: string, visited: Set<string>, path: string[]) => {
      if (path.length > maxPathLength) return;
      if (currentNode === targetNode) {
        paths.push([...path]);
        return;
      }
      
      const neighbors = adjacencyList.get(currentNode) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          path.push(neighbor);
          dfs(neighbor, targetNode, visited, path);
          path.pop();
          visited.delete(neighbor);
        }
      }
    };
    
    const visited = new Set<string>([startNodeId]);
    dfs(startNodeId, endNodeId, visited, [startNodeId]);
    
    // Sort paths by length and get the top paths
    const sortedPaths = paths
      .sort((a, b) => a.length - b.length)
      .slice(0, maxPaths);
    
    // Convert paths to Route objects with distance and nodes/links
    return sortedPaths.map(path => {
      // Create pairs of nodes to find the links
      const pathLinks: Link[] = [];
      for (let i = 0; i < path.length - 1; i++) {
        const source = path[i];
        const target = path[i + 1];
        
        const link = linkData.find((l: Link) => {
            const s = typeof l.source === 'object' ? (l.source as Node).id : String(l.source);
            const t = typeof l.target === 'object' ? (l.target as Node).id : String(l.target);
            return (s === source && t === target) || (s === target && t === source);
          });
        
        if (link) pathLinks.push(link);
      }
      
      // Find the nodes in the path
      const pathNodes = nodeData.filter(node => path.includes(node.id));
      
      return {
        path,
        distance: path.length - 1, // Number of links
        pathNodes,
        pathLinks
      };
    });
  }, [linkData, nodeData]);

  // Update routes when source or target node changes
  useEffect(() => {
    if (sourceNode && targetNode && sourceNode !== targetNode) {
      const routes = findAlternatePaths(sourceNode, targetNode, 3);
      setRoutes(routes);
      
      if (routes.length > 0) {
        // Set highlighted route to the first one
        setHighlightedRouteIndex(0);
      } else {
        setHighlightedRouteIndex(-1);
      }
    } else {
      setRoutes([]);
      setHighlightedRouteIndex(-1);
    }
  }, [sourceNode, targetNode, findAlternatePaths]);

  // Create D3 visualization
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodeData.length === 0) {
      return;
    }

    // Clear any existing elements
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Create a new root SVG group
    const svg = d3.select(svgRef.current);
    const g = svg.append("g");
    
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;
    
    // Create simulation
    const sim = d3.forceSimulation<Node>(nodeData)
      .force("link", d3.forceLink<Node, Link>(linkData)
        .id(d => d.id)
        .distance(75)
        .strength(1.0))
      .force("charge", d3.forceManyBody()
        .strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => 7 + 2));
    
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
      .attr("stroke-width", 1.5);
    
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
    
    // Create nodes
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll<SVGCircleElement, Node>("circle")
      .data(nodeData)
      .enter()
      .append("circle")
      .attr("class", "node")
      .attr("r", 7)
      .attr("fill", d => getNodeColor(d))
      .attr("stroke", "#000")
      .attr("stroke-width", 1.5)
      .on("click", function(event, d: Node) {
        // Set as source or target node based on current state
        if (!sourceNode || (targetNode && sourceNode !== d.id && targetNode !== d.id)) {
          setSourceNode(d.id);
        } else if (!targetNode || sourceNode !== d.id) {
          setTargetNode(d.id);
        }
      });
    
    // Create node labels
    const nodeLabel = g.append("g")
      .attr("class", "node-labels")
      .selectAll("text")
      .data(nodeData)
      .enter()
      .append("text")
      .attr("class", "node-label")
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(d => d.id.length > 10 ? d.id.substring(0, 8) + '...' : d.id)
      .style("fill", "#fff")
      .style("font-size", "8px")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.7)")
      .style("pointer-events", "none");
    
    // Update function for simulation
    sim.on("tick", () => {
      link
        .attr("x1", d => {
          const source = d.source as Node;
          return source.x !== undefined ? source.x : 0;
        })
        .attr("y1", d => {
          const source = d.source as Node;
          return source.y !== undefined ? source.y : 0;
        })
        .attr("x2", d => {
          const target = d.target as Node;
          return target.x !== undefined ? target.x : 0;
        })
        .attr("y2", d => {
          const target = d.target as Node;
          return target.y !== undefined ? target.y : 0;
        });
      
      node
        .attr("cx", (d: Node) => d.x !== undefined ? d.x : 0)
        .attr("cy", (d: Node) => d.y !== undefined ? d.y : 0);
      
      nodeLabel
        .attr("x", (d: Node) => d.x !== undefined ? d.x : 0)
        .attr("y", (d: Node) => d.y !== undefined ? d.y : 0);
    });
    
    // Add zoom capability
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom);
    
    // Set the simulation to a low alpha to keep it slightly active
    sim.alpha(0.3).restart();
    
    // Clean up function
    return () => {
      if (sim) sim.stop();
    };
  }, [nodeData, linkData, customNodeColors]);

  // Update path highlights when routes or highlighted route changes
  useEffect(() => {
    if (!svgRef.current || routes.length === 0 || highlightedRouteIndex < 0) return;
    
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
    const selectedRoute = routes[highlightedRouteIndex];
    
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
      
      // Highlight links in the path
      svg.selectAll<SVGLineElement, Link>(".link")
        .filter((link: Link) => {
          const source = typeof link.source === 'object' ? (link.source as Node).id : String(link.source);
          const target = typeof link.target === 'object' ? (link.target as Node).id : String(link.target);
          
          // Check if this link is in the path
          for (let i = 0; i < selectedRoute.path.length - 1; i++) {
            const a = selectedRoute.path[i];
            const b = selectedRoute.path[i + 1];
            
            if ((source === a && target === b) || (source === b && target === a)) {
              return true;
            }
          }
          return false;
        })
        .attr("stroke", routeColors[highlightedRouteIndex % routeColors.length])
        .attr("stroke-width", 3)
        .attr("stroke-opacity", 1);
      
      // Highlight nodes in the path (excluding source/target)
      svg.selectAll<SVGCircleElement, Node>(".node")
        .filter((d: Node) => 
          selectedRoute.path.includes(d.id) && 
          d.id !== sourceNode && 
          d.id !== targetNode)
        .attr("fill", routeColors[highlightedRouteIndex % routeColors.length])
        .attr("r", 8)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2);
    }
  }, [routes, highlightedRouteIndex, sourceNode, targetNode, customNodeColors]);

  // Handle reset
  const handleReset = () => {
    setSourceNode('');
    setTargetNode('');
    setRoutes([]);
    setHighlightedRouteIndex(-1);
  };

  // Handle route selection
  const handleSelectRoute = (index: number) => {
    setHighlightedRouteIndex(index);
  };

  // Generate route summary
  const renderRouteSummary = () => {
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

  return (
    <div className="flex w-full h-full">
      {/* Left sidebar with route options */}
      <div className="w-64 bg-gray-50 p-3 border-r border-gray-200 overflow-y-auto flex flex-col">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <MapPin size={18} /> Route Finder
        </h2>
        
        {/* Node selection dropdowns */}
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
                {nodeData.map(node => (
                  <SelectItem 
                    key={node.id} 
                    value={node.id}
                    disabled={node.id === targetNode}
                  >
                    {node.id}
                  </SelectItem>
                ))}
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
                {nodeData.map(node => (
                  <SelectItem 
                    key={node.id} 
                    value={node.id}
                    disabled={node.id === sourceNode}
                  >
                    {node.id}
                  </SelectItem>
                ))}
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
          
          {/* Route info overlay */}
          {routes.length > 0 && highlightedRouteIndex >= 0 && (
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
        </div>
      </div>
    </div>
  );
};

export default RouteFinderVisualization;