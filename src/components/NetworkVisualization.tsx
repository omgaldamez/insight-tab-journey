import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from 'd3';
import { useToast } from "@/components/ui/use-toast";
import FileButtons from "./FileButtons";
import { 
  NetworkVisualizationProps, 
  Node, 
  Link, 
  SimulatedNode, 
  SimulatedLink,
  CategoryCounts 
} from '@/types/networkTypes';
import RadialVisualization from './RadialVisualization';
import ArcVisualization from './ArcVisualization';
import BaseVisualization from './BaseVisualization';
import { 
  hexToRgb, 
  generateDynamicColorThemes,
  getNodeColor
} from '@/utils/visualizationUtils';
import NetworkTooltip from './NetworkTooltip';
// Import utility functions from separate file
import { 
  showTooltip, 
  moveTooltip, 
  hideTooltip,
  findNodeConnections 
} from './TooltipUtils';
import {
  NetworkLegend,
  NetworkHelper,
  EmptyData
} from './NetworkComponents';
import useZoomPan from '@/hooks/useZoomPan';
import useFileExport from '@/hooks/useFileExport';

// Import VisualizationType explicitly 
import { VisualizationType } from './NetworkSidebar';

// Declare global type for timeout IDs
declare global {
  interface Window {
    resizeTimeoutId?: number;
    paramUpdateTimeout?: number;
  }
}

// Define color palette
const COLOR_PALETTE = [
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

const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({ 
  onCreditsClick, 
  nodeData = [],
  linkData = [],
  visualizationType = 'network',
  onVisualizationTypeChange,
  fixNodesOnDrag = true,
  colorTheme = 'default',
  nodeSize = 1.0,
  linkColor = '#999999',
  backgroundColor = '#f5f5f5',
  backgroundOpacity = 1.0,
  customNodeColors = {},
  dynamicColorThemes = {},
  onSvgRef
}) => {
  // References
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<SVGGElement>(null);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);
  
  // References to track previous parameter values for determining significant changes
  const prevLinkDistanceRef = useRef<number>(70);
  const prevNodeChargeRef = useRef<number>(-300);
  const prevLinkStrengthRef = useRef<number>(1.0);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [linkDistance, setLinkDistance] = useState(70);
  const [linkStrength, setLinkStrength] = useState(1.0);
  const [nodeCharge, setNodeCharge] = useState(-300);
  const [localNodeSize, setLocalNodeSize] = useState(nodeSize);
  const [customNodeColorsState, setCustomNodeColorsState] = useState<Record<string, string>>(customNodeColors || {});
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedNodeConnections, setSelectedNodeConnections] = useState<{ to: string[]; from: string[] }>({ to: [], from: [] });
  const [expandedSections, setExpandedSections] = useState({
    networkControls: true,
    nodeControls: true,
    colorControls: false,
    networkInfo: false,
    visualizationType: true
  });
  const [nodeGroup, setNodeGroup] = useState('all');
  const [localColorTheme, setLocalColorTheme] = useState(colorTheme);
  const [activeColorTab, setActiveColorTab] = useState('presets');
  const [localBackgroundColor, setLocalBackgroundColor] = useState(backgroundColor);
  const [textColor, setTextColor] = useState("#ffffff");
  const [localLinkColor, setLocalLinkColor] = useState(linkColor);
  const [nodeStrokeColor, setNodeStrokeColor] = useState("#000000");
  const [localBackgroundOpacity, setLocalBackgroundOpacity] = useState(backgroundOpacity);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [networkTitle, setNetworkTitle] = useState("Untitled Network");
  const [processedData, setProcessedData] = useState<{ nodes: Node[], links: Link[] }>({ nodes: [], links: [] });
  const [nodeCounts, setNodeCounts] = useState<CategoryCounts>({ total: 0 });
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [dynamicColorThemesState, setDynamicColorThemesState] = useState<Record<string, Record<string, string>>>(dynamicColorThemes || {});
  const [visualizationError, setVisualizationError] = useState<string | null>(null);
  const [localFixNodesOnDrag, setLocalFixNodesOnDrag] = useState(fixNodesOnDrag);
  const [localVisualizationType, setLocalVisualizationType] = useState<VisualizationType>(visualizationType);
  
  const { toast } = useToast();

  // Pass SVG ref to parent if needed (for fullscreen mode)
  useEffect(() => {
    if (onSvgRef && svgRef.current) {
      onSvgRef(svgRef.current);
    }
  }, [onSvgRef, svgRef.current]);

  const { zoomToFit, getTransform } = useZoomPan({
    svgRef, 
    contentRef,
    containerRef,
    isReady: !isLoading && processedData.nodes.length > 0
  });

  const { downloadData, downloadGraph } = useFileExport({
    svgRef,
    nodes: processedData.nodes,
    links: processedData.links,
    networkTitle,
    onNotify: (title, message, isError) => {
      toast({
        title,
        description: message,
        variant: isError ? "destructive" : "default"
      });
    },
    backgroundColor: localBackgroundColor,
    backgroundOpacity: localBackgroundOpacity,
    textColor,
    linkColor: localLinkColor,
    nodeStrokeColor,
    getTransform
  });

  // Process imported data
  useEffect(() => {
    if (nodeData.length === 0 || linkData.length === 0) {
      console.log("Data not yet available in processing effect");
      return;
    }

    console.log("Processing data in NetworkVisualization:", 
      { nodeCount: nodeData.length, linkCount: linkData.length });

    try {
      // Process nodes
      const processedNodes: Node[] = nodeData.map(node => {
        const idKey = Object.keys(node).find(key => 
          key.toLowerCase() === 'id' || 
          key.toLowerCase() === 'name' || 
          key.toLowerCase() === 'node' ||
          key.toLowerCase() === 'node id'
        ) || Object.keys(node)[0]; // Fallback to first key if none found

        const categoryKey = Object.keys(node).find(key => 
          key.toLowerCase() === 'category' || 
          key.toLowerCase() === 'type' || 
          key.toLowerCase() === 'node type' ||
          key.toLowerCase() === 'node category'
        ) || (Object.keys(node).length > 1 ? Object.keys(node)[1] : 'default'); // Fallback to second key or 'default'

        return {
          id: String(node[idKey] || 'node-' + Math.random().toString(36).substring(2, 9)),
          category: String(node[categoryKey] || 'default')
        };
      });

      // Process links
      const processedLinks: Link[] = linkData.map(link => {
        const sourceKey = Object.keys(link).find(key => 
          key.toLowerCase() === 'source' || 
          key.toLowerCase() === 'from'
        ) || Object.keys(link)[0]; // Fallback to first key

        const targetKey = Object.keys(link).find(key => 
          key.toLowerCase() === 'target' || 
          key.toLowerCase() === 'to'
        ) || (Object.keys(link).length > 1 ? Object.keys(link)[1] : null); // Fallback to second key

        if (!sourceKey || !targetKey) {
          console.error("Cannot identify source or target keys in link data:", link);
          return { source: "", target: "" }; // Will be filtered out later
        }

        return {
          source: String(link[sourceKey] || ''),
          target: String(link[targetKey] || '')
        };
      }).filter(link => link.source && link.target); // Filter out invalid links

      // Find unique categories
      const categories = processedNodes.map(node => node.category);
      const uniqueCats = Array.from(new Set(categories)).filter(Boolean);
      setUniqueCategories(uniqueCats);

      // Generate dynamic color themes
      const themes = generateDynamicColorThemes(uniqueCats, COLOR_PALETTE);
      setDynamicColorThemesState(themes);

      // Calculate node counts by category
      const counts: CategoryCounts = { total: processedNodes.length };
      
      uniqueCats.forEach(category => {
        counts[category] = processedNodes.filter(node => node.category === category).length;
      });

      setNodeCounts(counts);
      setProcessedData({ nodes: processedNodes, links: processedLinks });
      
      // Set loading to false after a short delay to show the visualization
      setTimeout(() => {
        setIsLoading(false);
        toast({
          title: "Network Data Loaded",
          description: "Interactive visualization is now ready",
        });
      }, 1000);
    } catch (error) {
      console.error("Error processing data:", error);
      toast({
        title: "Data Processing Error",
        description: "Failed to process the uploaded data files",
        variant: "destructive"
      });
    }
  }, [nodeData, linkData, toast]);

  // Create drag behavior
  const createDragBehavior = useCallback((simulation: d3.Simulation<Node, Link>) => {
    return d3.drag<SVGCircleElement, SimulatedNode>()
      .on("start", function(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        
        // Make the dragged node appear on top
        d3.select(this).raise();
      })
      .on("drag", function(event, d) {
        d.fx = event.x;
        d.fy = event.y;
        
        // Ensure smooth dragging by applying changes immediately
        d3.select(this)
          .attr("cx", d.fx)
          .attr("cy", d.fy);
          
        // Update connected links immediately for responsive dragging
        const svg = d3.select(svgRef.current);
        svg.selectAll<SVGLineElement, Link>(".link")
          .filter(l => {
            const source = typeof l.source === 'object' ? l.source.id : l.source;
            const target = typeof l.target === 'object' ? l.target.id : l.target;
            return source === d.id || target === d.id;
          })
          .each(function(l) {
            const isSource = (typeof l.source === 'object' ? l.source.id : l.source) === d.id;
            
            if (isSource) {
              d3.select(this)
                .attr("x1", d.fx)
                .attr("y1", d.fy);
            } else {
              d3.select(this)
                .attr("x2", d.fx)
                .attr("y2", d.fy);
            }
          });
          
        // Update the label position
        svg.selectAll<SVGTextElement, Node>(".node-label")
          .filter(n => n.id === d.id)
          .attr("x", d.fx)
          .attr("y", d.fy);
      })
      .on("end", function(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        
        // If fixNodesOnDrag is false, release the node back to the simulation
        if (!localFixNodesOnDrag) {
          d.fx = null;
          d.fy = null;
          
          // Very gentle alpha to allow local repositioning without disrupting the whole layout
          simulation.alpha(0.05).restart();
          console.log("Node released with minimal alpha to avoid layout shifts");
        }
      });
  }, [localFixNodesOnDrag]);

  // Create D3 visualization
  useEffect(() => {
    // Make sure all refs are ready
    if (isLoading || !svgRef.current || processedData.nodes.length === 0 || localVisualizationType !== 'network') {
      console.log("Not ready to create visualization yet:", {
        isLoading,
        hasSvgRef: !!svgRef.current,
        hasContainerRef: !!containerRef.current,
        nodeCount: processedData.nodes.length,
        visualizationType: localVisualizationType
      });
      return;
    }

    // This is a critical check to ensure the container is rendered
    if (!containerRef.current) {
      console.log("Container ref not ready, waiting...");
      // Try again after a short delay
      const timer = setTimeout(() => {
        console.log("Retrying visualization after delay");
        if (containerRef.current) {
          // Force a re-render once the container is ready
          setIsLoading(prev => !prev);
          setTimeout(() => setIsLoading(prev => !prev), 10);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  
    console.log("Creating D3 visualization");
    
    try {
      // Clear any existing elements
      d3.select(svgRef.current).selectAll("*").remove();
      
      // Create a new root SVG group
      const g = d3.select(svgRef.current)
        .append("g");
      
      // Store reference to the content group
      contentRef.current = g.node() as SVGGElement;
      
      const width = containerRef.current.clientWidth || 800; // Fallback width
      const height = containerRef.current.clientHeight || 600; // Fallback height
      
      console.log(`Container dimensions: ${width}x${height}`);
      
      // Filter nodes based on selection
      const filteredNodes = nodeGroup === 'all' 
        ? processedData.nodes
        : processedData.nodes.filter(node => node.category === nodeGroup);
      
      // Create filtered links
      const nodeIds = new Set(filteredNodes.map(node => node.id));
      const filteredLinks = processedData.links.filter(link => {
        const sourceId = typeof link.source === 'object' 
          ? link.source.id 
          : link.source;
        const targetId = typeof link.target === 'object' 
          ? link.target.id 
          : link.target;
        return nodeIds.has(sourceId) && nodeIds.has(targetId);
      });
      
      console.log(`Rendering ${filteredNodes.length} nodes and ${filteredLinks.length} links`);
      
      // Create simulation with stronger initial forces to spread nodes
      const simulation = d3.forceSimulation<Node>(filteredNodes)
        .force("link", d3.forceLink<Node, Link>(filteredLinks)
          .id(d => d.id)
          .distance(linkDistance * 2) // Double distance initially to spread nodes
          .strength(linkStrength))
        .force("charge", d3.forceManyBody()
          .strength(nodeCharge * 2)) // Stronger repulsion initially
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(d => 10 * localNodeSize));

      // Store current parameter values in refs
      prevLinkDistanceRef.current = linkDistance;
      prevNodeChargeRef.current = nodeCharge;
      prevLinkStrengthRef.current = linkStrength;

      // CRITICAL: Store the simulation in our ref
      simulationRef.current = simulation;

      // Add x/y positions if not already set
      filteredNodes.forEach(node => {
        if (node.x === undefined) {
          // Position nodes in a circle for better initial layout
          const angle = Math.random() * 2 * Math.PI;
          const radius = Math.min(width, height) * 0.4 * Math.random();
          node.x = width / 2 + radius * Math.cos(angle);
          node.y = height / 2 + radius * Math.sin(angle);
        }
      });

      // Run simulation with high alpha to allow nodes to spread out
      simulation.alpha(1).restart();

      // After initial positioning, restore normal parameters
      setTimeout(() => {
        const linkForce = simulation.force("link") as d3.ForceLink<Node, Link>;
        if (linkForce) {
          linkForce.distance(linkDistance);
        }
        
        const chargeForce = simulation.force("charge") as d3.ForceManyBody<Node>;
        if (chargeForce) {
          chargeForce.strength(nodeCharge);
        }
        
        simulation.alpha(0.3).restart();
      }, 1000);
      
      // Create links with proper type casting
      const link = g.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(filteredLinks)
        .enter()
        .append("line")
        .attr("class", "link")
        .attr("stroke", localLinkColor)
        .attr("stroke-width", 1.5);
      
      // Create nodes
      const node = g.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(filteredNodes)
        .enter()
        .append("circle")
        .attr("class", "node")
        .attr("r", d => 7 * localNodeSize)
        .attr("fill", d => getNodeColor(d, customNodeColorsState, localColorTheme, dynamicColorThemesState))
        .attr("stroke", nodeStrokeColor)
        .attr("stroke-width", 1);
      
      // Create node labels
      const nodeLabel = g.append("g")
        .attr("class", "node-labels")
        .selectAll("text")
        .data(filteredNodes)
        .enter()
        .append("text")
        .attr("class", "node-label")
        .attr("dy", "0.3em")
        .text(d => d.id.length > 15 ? d.id.substring(0, 12) + '...' : d.id)
        .style("fill", textColor)
        .style("font-size", d => `${8 * Math.min(1.2, localNodeSize)}px`)
        .style("text-shadow", `0 1px 2px rgba(0, 0, 0, 0.7)`);
      
      // Create and apply drag behavior
      const dragBehavior = createDragBehavior(simulation);
      node.call(dragBehavior as d3.DragBehavior<SVGCircleElement, unknown, Node>);
      
      // Event handlers
      node
        .on("mouseover", function(event, d) {
          showTooltip(event, d, tooltipRef, processedData.links);
        })
        .on("mousemove", function(event) {
          moveTooltip(event, tooltipRef, svgRef);
        })
        .on("mouseout", function() {
          hideTooltip(tooltipRef);
        })
        .on("click", function(event, d) {
          event.stopPropagation();
          handleNodeClick(d);
        });
      
      // Click anywhere else to reset highlighting
      d3.select(svgRef.current).on("click", resetNodeSelection);
      
      // Update function for simulation
      simulation.on("tick", () => {
        // Update link positions
        link
          .attr("x1", d => {
            const source = d.source as SimulatedNode;
            return source.x !== undefined ? source.x : 0;
          })
          .attr("y1", d => {
            const source = d.source as SimulatedNode;
            return source.y !== undefined ? source.y : 0;
          })
          .attr("x2", d => {
            const target = d.target as SimulatedNode;
            return target.x !== undefined ? target.x : 0;
          })
          .attr("y2", d => {
            const target = d.target as SimulatedNode;
            return target.y !== undefined ? target.y : 0;
          });
        
        // Update node positions
        node
          .attr("cx", d => d.x !== undefined ? d.x : 0)
          .attr("cy", d => d.y !== undefined ? d.y : 0);
        
        // Update label positions
        nodeLabel
          .attr("x", d => d.x !== undefined ? d.x : 0)
          .attr("y", d => d.y !== undefined ? d.y : 0);
      });
      
      // Apply background color to the container
      if (containerRef.current) {
        const bgColor = hexToRgb(localBackgroundColor);
        containerRef.current.style.backgroundColor = `rgba(${bgColor.r}, ${bgColor.g}, ${bgColor.b}, ${localBackgroundOpacity})`;
      }
      
      console.log("D3 visualization created successfully");

      // Return cleanup function
      return () => {
        if (simulation) simulation.stop();
        simulationRef.current = null;
      };

    } catch (error) {
      console.error("Error creating D3 visualization:", error);
      setVisualizationError(error instanceof Error ? error.message : "Unknown error creating visualization");
      toast({
        title: "Error",
        description: `Failed to create the visualization: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    }
  }, [
    isLoading, 
    nodeGroup, 
    processedData, 
    localVisualizationType, 
    createDragBehavior, 
    linkDistance, 
    linkStrength, 
    nodeCharge, 
    localNodeSize, 
    localColorTheme, 
    customNodeColorsState, 
    dynamicColorThemesState, 
    textColor, 
    localLinkColor, 
    nodeStrokeColor, 
    localBackgroundColor, 
    localBackgroundOpacity
  ]);

  // Update visualization when parameters change - with gentle approach to prevent flickering
  useEffect(() => {
    if (isLoading || !svgRef.current || !simulationRef.current) return;
    
    // Clear any existing timeout to prevent rapid updates
    if (window.paramUpdateTimeout) {
      clearTimeout(window.paramUpdateTimeout);
    }
    
    // Use a debounce timeout to handle rapid parameter changes (e.g. slider dragging)
    window.paramUpdateTimeout = window.setTimeout(() => {
      try {
        console.log("Updating visualization parameters with gentle approach");
        const simulation = simulationRef.current;
        
        // Select all the elements we need to update
        const svg = d3.select(svgRef.current);
        const nodes = svg.selectAll<SVGCircleElement, Node>(".node");
        const labels = svg.selectAll<SVGTextElement, Node>(".node-label");
        const links = svg.selectAll<SVGLineElement, Link>(".link");
        
        // Update link distance/strength
        const linkForce = simulation.force("link") as d3.ForceLink<Node, Link> | null;
        if (linkForce) {
          linkForce.distance(linkDistance).strength(linkStrength);
        }
        
        // Update charge
        const chargeForce = simulation.force("charge") as d3.ForceManyBody<Node> | null;
        if (chargeForce) {
          chargeForce.strength(nodeCharge);
        }
        
        // Update node sizes
        nodes.attr("r", d => 7 * localNodeSize);
        
        // Update collision radius
        const collisionForce = simulation.force("collision") as d3.ForceCollide<Node> | null;
        if (collisionForce) {
          collisionForce.radius(d => (7 * localNodeSize) + 2);
        }
        
        // Update text size
        labels.style("font-size", `${8 * Math.min(1.2, localNodeSize)}px`);
        
        // Update node colors
        nodes.attr("fill", d => getNodeColor(d, customNodeColorsState, localColorTheme, dynamicColorThemesState));
          
        // Update node stroke
        nodes.attr("stroke", nodeStrokeColor)
             .attr("stroke-width", 1);
        
        // Update labels color
        labels.style("fill", textColor);
        
        // Update link color
        links.attr("stroke", localLinkColor);
        
        // Update background color
        if (containerRef.current) {
          const bgColor = hexToRgb(localBackgroundColor);
          containerRef.current.style.backgroundColor = `rgba(${bgColor.r}, ${bgColor.g}, ${bgColor.b}, ${localBackgroundOpacity})`;
        }
        
        // IMPORTANT: Determine if this is a significant change that needs higher alpha
        const isSignificantChange = 
          Math.abs(linkDistance - prevLinkDistanceRef.current) > 5 ||
          Math.abs(nodeCharge - prevNodeChargeRef.current) > 50 ||
          Math.abs(linkStrength - prevLinkStrengthRef.current) > 0.2;
        
        // Choose alpha based on significance of change
        const alphaValue = isSignificantChange ? 0.3 : 0.01;
        
        // Store current values for next comparison
        prevLinkDistanceRef.current = linkDistance;
        prevNodeChargeRef.current = nodeCharge;
        prevLinkStrengthRef.current = linkStrength;
        
        // Apply gentle alpha and restart simulation
        simulation.alpha(alphaValue).restart();
        
        // CRITICAL: Don't call zoomToFit() here - we want to preserve the current zoom level
        console.log(`Applied physics update with alpha: ${alphaValue}`);
        
      } catch (error) {
        console.error("Error updating visualization:", error);
        setVisualizationError(error instanceof Error ? error.message : "Unknown error updating visualization");
      }
    }, 150); // Increased debounce delay to prevent too many updates while dragging sliders
    
    return () => {
      if (window.paramUpdateTimeout) {
        clearTimeout(window.paramUpdateTimeout);
      }
    };
  }, [
    localNodeSize, 
    linkDistance, 
    linkStrength, 
    nodeCharge, 
    localColorTheme, 
    customNodeColorsState,
    localBackgroundColor,
    textColor,
    localLinkColor,
    nodeStrokeColor,
    localBackgroundOpacity,
    dynamicColorThemesState,
    isLoading
  ]);

  // Add a new useEffect hook for handling resize events without auto zoom
  useEffect(() => {
    if (isLoading || !svgRef.current || !containerRef.current) return;

    const handleResize = () => {
      // Clear any existing timeout to prevent multiple executions
      if (window.resizeTimeoutId) {
        window.clearTimeout(window.resizeTimeoutId);
      }

      // Delay execution to avoid too many consecutive calls
      window.resizeTimeoutId = window.setTimeout(() => {
        console.log("Window resize detected - updating visualization");
        
        if (!simulationRef.current || !containerRef.current || !svgRef.current) return;
        
        // Get the new container dimensions
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        console.log(`New container dimensions: ${width}x${height}`);
        
        // Update the center force
        const centerForce = simulationRef.current.force("center") as d3.ForceCenter<Node>;
        if (centerForce) {
          centerForce.x(width / 2).y(height / 2);
        }
        
        // IMPORTANT: Don't automatically zoom to fit on resize
        // Only restart the simulation with low alpha
        simulationRef.current.alpha(0.1).restart();
        
      }, 200);
    };

    // Add event listener for window resize
    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.resizeTimeoutId) {
        window.clearTimeout(window.resizeTimeoutId);
      }
    };
  }, [isLoading]);

  // Handle node click
  const handleNodeClick = useCallback((d: Node) => {
    console.log("Node selected:", d);
    setSelectedNode(d);
    
    // Find connections for this node
    const { sourceLinks, targetLinks } = findNodeConnections(d, processedData.links);
    
    // Prepare connected nodes lists for the UI
    const toConnections = sourceLinks.map(link => {
      const targetName = typeof link.target === 'object' ? link.target.id : link.target;
      return targetName;
    });
    
    const fromConnections = targetLinks.map(link => {
      const sourceName = typeof link.source === 'object' ? link.source.id : link.source;
      return sourceName;
    });
    
    setSelectedNodeConnections({
      to: toConnections,
      from: fromConnections
    });
    
    // Make network info section visible if it's not already
    if (!expandedSections.networkInfo) {
      setExpandedSections(prev => ({
        ...prev,
        networkInfo: true
      }));
    }
    
    // Highlight connections in the visualization
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      
      svg.selectAll(".node")
        .attr('opacity', (n: Node) => {
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
      
      svg.selectAll(".link")
        .attr('opacity', (l: Link) => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          const isConnected = (sourceId === d.id || targetId === d.id);
          return isConnected ? 1 : 0.1;
        });
      
      svg.selectAll(".node-label")
        .attr('opacity', (n: Node) => {
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
    }
  }, [expandedSections, processedData.links]);

  // Reset node selection
  const resetNodeSelection = useCallback(() => {
    setSelectedNode(null);
    
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.selectAll('.node').attr('opacity', 1);
      svg.selectAll('.link').attr('opacity', 1);
      svg.selectAll('.node-label').attr('opacity', 1);
    }
  }, []);

  // Function to toggle section expansion
  const toggleSection = (section: string) => {
    console.log("Toggling section:", section);
    setExpandedSections({
      ...expandedSections,
      [section]: !expandedSections[section as keyof typeof expandedSections]
    });
  };
  
  // Function to toggle sidebar collapse
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
    
    // When expanding the sidebar after being collapsed, we need to refit the visualization
    if (isSidebarCollapsed) {
      // Delay to allow DOM to update first
      setTimeout(() => {
        // Trigger a resize to refit the visualization
        window.dispatchEvent(new Event('resize'));
      }, 150);
    }
  };
  
  // Handle title change
  const handleTitleChange = (newTitle: string) => {
    setNetworkTitle(newTitle);
  };

  // Handle toggle fix nodes
  const handleToggleFixNodes = () => {
    const newValue = !localFixNodesOnDrag;
    console.log("Toggling fixNodesOnDrag:", newValue);
    setLocalFixNodesOnDrag(newValue);
    
    // Get current simulation
    const currentSimulation = simulationRef.current;
    
    // Apply changes immediately
    if (svgRef.current && currentSimulation) {
      try {
        console.log("Applying fixNodesOnDrag change to simulation");
        
        // When turning off fixed nodes, reset all fx/fy values
        if (!newValue) {
          const svg = d3.select(svgRef.current);
          svg.selectAll<SVGCircleElement, SimulatedNode>(".node")
            .each(function(d) {
              // Unfix all nodes
              d.fx = null;
              d.fy = null;
            });
          
          // Apply higher alpha
          currentSimulation.alpha(0.3).restart();
          console.log("Restarted simulation with moderate alpha 0.3 after unfixing nodes");
        }
        
        toast({
          title: newValue ? "Nodes will stay fixed" : "Nodes will follow simulation",
          description: newValue 
            ? "Nodes will remain where you drop them" 
            : "Nodes will return to simulation flow after dragging"
        });
      } catch (error) {
        console.error("Error toggling fix nodes:", error);
        toast({
          title: "Error",
          description: "Failed to update node behavior",
          variant: "destructive"
        });
      }
    } else {
      console.log("Cannot apply fix nodes toggle - references not available");
    }
  };

  // Handle visualization type change
  const handleVisualizationTypeChange = (type: VisualizationType) => {
    console.log(`Changing visualization type to: ${type}`);
    setLocalVisualizationType(type);
    
    // Call the parent handler if provided
    if (onVisualizationTypeChange) {
      onVisualizationTypeChange(type);
    }
    
    toast({
      title: `Switched to ${type} visualization`,
      description: `Now viewing the network as a ${type} graph.`
    });
    
    // For now, if switching back to network, reinitialize to make sure everything is fresh
    if (type === 'network') {
      reinitializeVisualization();
    }
  };

  // Function to properly clean up and reinitialize the visualization
  const reinitializeVisualization = () => {
    console.log("Reinitializing visualization");
    
    try {
      // Clean up existing simulation
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      
      // Clear SVG
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll("*").remove();
      }
      
      // Set a flag to trigger the useEffect that creates the visualization
      setIsLoading(true);
      
      // Delay to allow for DOM updates
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
      
      // Clear any error state
      setVisualizationError(null);
    } catch (error) {
      console.error("Error reinitializing visualization:", error);
      setVisualizationError(error instanceof Error ? error.message : "Unknown error during reinitialization");
    }
  };

  // Handle parameter change - ONLY update state values, don't apply directly to simulation
  const handleParameterChange = (type: string, value: number) => {
    console.log(`Parameter changed: ${type} = ${value}`);
    
    // Just update the state values - don't touch the simulation directly
    switch (type) {
      case "nodeSize":
        setLocalNodeSize(value);
        break;
      case "linkDistance":
        setLinkDistance(value);
        break;
      case "linkStrength":
        setLinkStrength(value);
        break;
      case "nodeCharge":
        setNodeCharge(value);
        break;
      default:
        break;
    }
  };

  // Handle node group change
  const handleNodeGroupChange = (group: string) => {
    console.log(`Node group changed to: ${group}`);
    setNodeGroup(group);
    // Full reinitialize is needed for this change
    reinitializeVisualization();
  };

  // Handle color theme change
  const handleColorThemeChange = (theme: string) => {
    console.log(`Color theme changed to: ${theme}`);
    setLocalColorTheme(theme);
  };

  // Handle color tab change
  const handleColorTabChange = (tab: string) => {
    console.log(`Color tab changed to: ${tab}`);
    setActiveColorTab(tab);
  };

  // Handle apply group colors
  const handleApplyGroupColors = (categoryColorMap: Record<string, string>) => {
    console.log("Applying group colors", categoryColorMap);
    
    // Create a copy of the dynamic color themes
    const updatedThemes = { ...dynamicColorThemesState };
    
    // Update the custom theme with the new category colors
    updatedThemes.custom = { ...updatedThemes.custom };
    
    // Apply each category color from the map
    Object.keys(categoryColorMap).forEach(category => {
      updatedThemes.custom[category] = categoryColorMap[category];
    });
    
    // Update the dynamic color themes
    setDynamicColorThemesState(updatedThemes);
    
    // Set the color theme to custom
    setLocalColorTheme('custom');
    
    toast({
      title: "Group Colors Applied",
      description: "Custom colors have been applied to categories",
    });
  };

  // Handle apply individual color
  const handleApplyIndividualColor = (nodeId: string, color: string) => {
    console.log(`Applying individual color for node ${nodeId}: ${color}`);
    setCustomNodeColorsState(prev => ({
      ...prev,
      [nodeId]: color
    }));
  };

  // Handle reset individual color
  const handleResetIndividualColor = (nodeId: string) => {
    console.log(`Resetting individual color for node ${nodeId}`);
    setCustomNodeColorsState(prev => {
      const newColors = { ...prev };
      delete newColors[nodeId];
      return newColors;
    });
  };

  // Handle apply background colors
  const handleApplyBackgroundColors = (
    bgColor: string, 
    txtColor: string, 
    lnkColor: string, 
    opacity: number,
    nodeStrokeClr: string
  ) => {
    console.log(`Applying background colors: bg=${bgColor}, text=${txtColor}, link=${lnkColor}, opacity=${opacity}, nodeStroke=${nodeStrokeClr}`);
    setLocalBackgroundColor(bgColor);
    setTextColor(txtColor);
    setLocalLinkColor(lnkColor);
    setLocalBackgroundOpacity(opacity);
    setNodeStrokeColor(nodeStrokeClr);
  };

  // Handle reset background colors
  const handleResetBackgroundColors = () => {
    console.log("Resetting background colors");
    setLocalBackgroundColor("#f5f5f5");
    setTextColor("#ffffff");
    setLocalLinkColor("#999999");
    setLocalBackgroundOpacity(1.0);
    setNodeStrokeColor("#000000");
  };

  // Handle reset simulation - IMPROVED VERSION
  const handleResetSimulation = () => {
    console.log("Resetting simulation");
    
    // Reset state values to defaults
    setLinkDistance(70);
    setLinkStrength(1.0);
    setNodeCharge(-300);
    setLocalNodeSize(1.0);
    
    // Update reference values
    prevLinkDistanceRef.current = 70;
    prevNodeChargeRef.current = -300;
    prevLinkStrengthRef.current = 1.0;
    
    // Get current simulation
    const currentSimulation = simulationRef.current;
    
    // Apply changes to the simulation
    if (currentSimulation && svgRef.current) {
      try {
        console.log("Applying reset to simulation directly");
        
        // Reset all node positions and fixed states
        const svg = d3.select(svgRef.current);
        svg.selectAll<SVGCircleElement, SimulatedNode>(".node")
          .each(function(d) {
            // Completely unfix all nodes
            d.fx = null;
            d.fy = null;
            
            // Reset velocities
            d.vx = 0;
            d.vy = 0;
          });
        
        // Apply default force parameters
        const linkForce = currentSimulation.force("link") as d3.ForceLink<Node, Link>;
        if (linkForce) {
          linkForce.distance(70).strength(1.0);
        }
        
        const chargeForce = currentSimulation.force("charge") as d3.ForceManyBody<Node>;
        if (chargeForce) {
          chargeForce.strength(-300);
        }
        
        // Update visual elements
        svg.selectAll<SVGCircleElement, Node>(".node")
           .attr("r", 7);
        
        svg.selectAll<SVGTextElement, Node>(".node-label")
           .style("font-size", "8px");
        
        // CRITICAL: Restart with high alpha
        currentSimulation.alpha(1.0).restart();
        console.log("Simulation fully reset with alpha 1.0");
        
        toast({
          title: "Simulation Reset",
          description: "Physics parameters have been reset to default values",
        });
      } catch (error) {
        console.error("Error resetting simulation:", error);
        toast({
          title: "Error",
          description: `Failed to reset simulation: ${error instanceof Error ? error.message : "Unknown error"}`,
          variant: "destructive"
        });
      }
    } else {
      console.log("Cannot reset simulation - references not available");
      toast({
        title: "Reset Physics",
        description: "Parameters reset to defaults but simulation not available for update",
      });
    }
  };

  // Handle reset graph
  const handleResetGraph = () => {
    console.log("Resetting graph");
    
    // Reset all visual properties
    setNodeGroup('all');
    setLocalColorTheme('default');
    setCustomNodeColorsState({});
    setLocalBackgroundColor("#f5f5f5");
    setTextColor("#ffffff");
    setLocalLinkColor("#999999");
    setLocalBackgroundOpacity(1.0);
    setNodeStrokeColor("#000000");
    
    // Reset nodes positions and unfix all nodes
    if (svgRef.current && processedData.nodes.length > 0) {
      const svg = d3.select(svgRef.current);
      svg.selectAll<SVGCircleElement, SimulatedNode>(".node")
        .each(function(d) {
          d.fx = null;
          d.fy = null;
        });
    }
    
    // Reset simulation physics
    handleResetSimulation();
    
    // Reinitialize visualization to ensure clean state
    setTimeout(() => {
      reinitializeVisualization();
    }, 100);
    
    toast({
      title: "Graph Reset",
      description: "All graph settings have been reset to default values",
    });
  };

  // Handle reset selection (refreshes the page)
  const handleResetSelection = () => {
    // Instead of window.location.reload(), let's do a soft reset
    setNodeGroup('all');
    setSelectedNode(null);
    resetNodeSelection();
    reinitializeVisualization();
  };

  // Check for empty data
  if (nodeData.length === 0 || linkData.length === 0) {
    return <EmptyData />;
  }

  // Create sidebar state and handlers for passing to BaseVisualization
  const sidebarState = {
    linkDistance,
    linkStrength,
    nodeCharge,
    localNodeSize,
    nodeGroup,
    localColorTheme,
    activeColorTab,
    localBackgroundColor,
    textColor,
    localLinkColor,
    nodeStrokeColor,
    localBackgroundOpacity,
    isSidebarCollapsed,
    networkTitle,
    localFixNodesOnDrag,
    localVisualizationType
  };

  const handlers = {
    handleParameterChange,
    handleNodeGroupChange,
    handleColorThemeChange,
    handleApplyGroupColors,
    handleApplyIndividualColor,
    handleResetIndividualColor,
    handleApplyBackgroundColors,
    handleResetBackgroundColors,
    handleResetSimulation,
    handleResetGraph,
    toggleSection,
    handleColorTabChange,
    handleTitleChange,
    toggleSidebar,
    handleToggleFixNodes,
    handleVisualizationTypeChange,
    reinitializeVisualization,
    downloadData,
    downloadGraph,
    handleZoomToFit: zoomToFit // Pass zoomToFit to handlers
  };

  // Render appropriate visualization type with shared sidebar
  if (localVisualizationType === 'radial') {
    return (
      <BaseVisualization
        children={
          <div className="w-full h-full">
            <RadialVisualization
              onCreditsClick={onCreditsClick}
              nodeData={nodeData}
              linkData={linkData}
              visualizationType={localVisualizationType}
              onVisualizationTypeChange={handleVisualizationTypeChange}
              colorTheme={localColorTheme}
              nodeSize={localNodeSize}
              linkColor={localLinkColor}
              backgroundColor={localBackgroundColor}
              backgroundOpacity={localBackgroundOpacity}
              customNodeColors={customNodeColorsState}
              dynamicColorThemes={dynamicColorThemesState[localColorTheme] || {}}
            />
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
        processedData={processedData}
        sidebar={sidebarState}
        handlers={handlers}
        customNodeColorsState={customNodeColorsState}
        dynamicColorThemesState={dynamicColorThemesState}
      />
    );
  } else if (localVisualizationType === 'arc') {
    return (
      <BaseVisualization
        children={
          <div className="w-full h-full">
            <ArcVisualization
              onCreditsClick={onCreditsClick}
              nodeData={nodeData}
              linkData={linkData}
              visualizationType={localVisualizationType}
              onVisualizationTypeChange={handleVisualizationTypeChange}
              colorTheme={localColorTheme}
              nodeSize={localNodeSize}
              linkColor={localLinkColor}
              backgroundColor={localBackgroundColor}
              backgroundOpacity={localBackgroundOpacity}
              customNodeColors={customNodeColorsState}
              dynamicColorThemes={dynamicColorThemesState[localColorTheme] || {}}
            />
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
        processedData={processedData}
        sidebar={sidebarState}
        handlers={handlers}
        customNodeColorsState={customNodeColorsState}
        dynamicColorThemesState={dynamicColorThemesState}
      />
    );
  } 

  // For network visualization type
  return (
    <BaseVisualization
      children={
        <>
          <div 
            ref={containerRef} 
            className="w-full h-full relative" 
            id="network-visualization-container" 
            style={{
              backgroundColor: `rgba(${hexToRgb(localBackgroundColor).r}, ${hexToRgb(localBackgroundColor).g}, ${hexToRgb(localBackgroundColor).b}, ${localBackgroundOpacity})`
            }}
          >
            <svg 
              ref={svgRef} 
              className="w-full h-full"
            />
            
            {/* File Buttons */}
            <FileButtons 
              onDownloadData={downloadData}
              onDownloadGraph={downloadGraph}
              onResetSelection={handleResetSelection}
              nodeData={nodeData}
              linkData={linkData}
            />
            
            {/* Tooltip */}
            <div 
              ref={tooltipRef} 
              className="absolute bg-black/85 text-white px-3 py-2 rounded-md text-sm pointer-events-none z-50 max-w-64" 
              style={{ 
                opacity: 0,
                transition: 'opacity 0.15s ease-in-out',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                transform: 'translate(0, 0)',
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            />
            
            {/* Network components */}
            <NetworkTooltip tooltipRef={tooltipRef} nodes={processedData.nodes} links={processedData.links} />
            <NetworkLegend categories={uniqueCategories} colorTheme={localColorTheme} dynamicColorThemes={dynamicColorThemesState} colorPalette={COLOR_PALETTE} />
            <NetworkHelper />
          </div>
        </>
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
      processedData={processedData}
      sidebar={sidebarState}
      handlers={handlers}
      customNodeColorsState={customNodeColorsState}
      dynamicColorThemesState={dynamicColorThemesState}
      onZoomToFit={zoomToFit} // Pass zoomToFit directly for use in the sidebar
    />
  );
};

export default NetworkVisualization;