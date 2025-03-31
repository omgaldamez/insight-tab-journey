/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from 'd3';
import { useToast } from "@/components/ui/use-toast";
import FileButtons from "./FileButtons";
import { 
  Node, 
  Link, 
  SimulatedNode, 
  SimulatedLink,
  CategoryCounts,
  VisualizationType
} from '@/types/networkTypes';
import ArcVisualization from './ArcVisualization';
import BaseVisualization from './BaseVisualization';
import { downloadNodeAsJson, downloadNodeAsText, findNodeConnections } from './TooltipUtils';
import {
  NetworkLegend,
  NetworkHelper,
  EmptyData
} from './NetworkComponents';
import useZoomPan from '@/hooks/useZoomPan';
import useFileExport from '@/hooks/useFileExport';
import ZoomControls from './ZoomControls';
import NetworkTooltip from './NetworkTooltip';
import useNetworkColors from '@/hooks/useNetworkColors';
import VisualizationControls from './VisualizationControls';
import Rad360Visualization from './Rad360Visualization';
import ArcLinealVisualization from './ArcLinealVisualization';
import { TooltipDetail, TooltipTrigger } from './TooltipSettings';
import NodeDetailModal from './NodeDetailModal';
import { 
  showTooltip, 
  moveTooltip, 
  hideTooltip, 
  setupClickAwayListener,
  getNodeTextRepresentation,
  getNodeJsonRepresentation
} from './TooltipUtils';
import NodeNavVisualization from './NodeNavVisualization';


// Define interfaces for handling both raw data and processed nodes/links
interface NodeData {
  id?: string;
  name?: string;
  category?: string;
  type?: string;
  [key: string]: string | number | boolean | undefined;
}

interface LinkData {
  source?: string | Node | { id: string };
  target?: string | Node | { id: string };
  from?: string;
  to?: string;
  [key: string]: string | number | boolean | undefined | { id: string } | Node;
}

interface NetworkVisualizationProps {
  onCreditsClick: () => void;
  nodeData: NodeData[] | Node[]; 
  linkData: LinkData[] | Link[];
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
  onSvgRef?: (svg: SVGSVGElement) => void;
  // Add tooltip props
  tooltipDetail?: TooltipDetail;
  tooltipTrigger?: TooltipTrigger;
  onTooltipDetailChange?: (detail: TooltipDetail) => void;
  onTooltipTriggerChange?: (trigger: TooltipTrigger) => void;
}

// Global type for timeout IDs
declare global {
  interface Window {
    resizeTimeoutId?: number;
    paramUpdateTimeout?: number;
  }
}

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
  onSvgRef,
  // Add tooltip props with defaults
  tooltipDetail: propTooltipDetail,
  tooltipTrigger: propTooltipTrigger,
  onTooltipDetailChange,
  onTooltipTriggerChange
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
  
  // Track if parameter changes are being applied to prevent unnecessary updates
  const isUpdatingRef = useRef<boolean>(false);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [linkDistance, setLinkDistance] = useState(70);
  const [linkStrength, setLinkStrength] = useState(1.0);
  const [nodeCharge, setNodeCharge] = useState(-300);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedNodeConnections, setSelectedNodeConnections] = useState<{ to: string[]; from: string[] }>({ to: [], from: [] });
  const [expandedSections, setExpandedSections] = useState({
    networkControls: true,
    nodeControls: true,
    colorControls: false,
    networkInfo: false,
    visualizationType: true,
    threeDControls: false,
    tooltipSettings: true
  });
  const [nodeGroup, setNodeGroup] = useState('all');
  const [activeColorTab, setActiveColorTab] = useState('presets');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [networkTitle, setNetworkTitle] = useState("Untitled Network");
  const [processedData, setProcessedData] = useState<{ nodes: Node[], links: Link[] }>({ nodes: [], links: [] });
  const [nodeCounts, setNodeCounts] = useState<CategoryCounts>({ total: 0 });
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [visualizationError, setVisualizationError] = useState<string | null>(null);
  const [localFixNodesOnDrag, setLocalFixNodesOnDrag] = useState(fixNodesOnDrag);
  const [localVisualizationType, setLocalVisualizationType] = useState<VisualizationType>(visualizationType);
  const [forceUpdate, setForceUpdate] = useState(false);  // For forcing re-renders when needed
  const [dataLoaded, setDataLoaded] = useState(false);  // Track if data has been loaded
  // Initialize tooltip state from props if provided, otherwise use defaults
  const [tooltipDetail, setTooltipDetail] = useState<TooltipDetail>(propTooltipDetail || 'simple');
  const [tooltipTrigger, setTooltipTrigger] = useState<TooltipTrigger>(propTooltipTrigger || 'hover');
  const [showNodeModal, setShowNodeModal] = useState<boolean>(false);
  
  const visualizationInitialized = useRef(false);  // Track if visualization has been initialized
  const { toast } = useToast();

  // Use the network colors hook
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

  // Enhanced zoom and pan functionality
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
    nodesDraggable: true  // Allow dragging nodes
  });

  // Setup the file export hook
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
    backgroundColor: colors.backgroundColor,
    backgroundOpacity: colors.backgroundOpacity,
    textColor: colors.textColor,
    linkColor: colors.linkColor,
    nodeStrokeColor: colors.nodeStrokeColor,
    getTransform
  });

  // Sync tooltipDetail with props if they change
  useEffect(() => {
    if (propTooltipDetail && propTooltipDetail !== tooltipDetail) {
      setTooltipDetail(propTooltipDetail);
    }
  }, [propTooltipDetail]);

  // Sync tooltipTrigger with props if they change
  useEffect(() => {
    if (propTooltipTrigger && propTooltipTrigger !== tooltipTrigger) {
      setTooltipTrigger(propTooltipTrigger);
    }
  }, [propTooltipTrigger]);

  // Add event listener for close button in tooltips
  useEffect(() => {
    if (!tooltipRef.current) return;
    
    const handleTooltipInteraction = (e: MouseEvent) => {
      // Check if clicked element is the close button
      const target = e.target as HTMLElement;
      if (target.classList.contains('tooltip-close-btn')) {
        // Hide the tooltip
        d3.select(tooltipRef.current)
          .style("opacity", "0")
          .style("visibility", "hidden");
        
        e.stopPropagation(); // Prevent event from bubbling
      }
    };
    
    // Add the event listener to the tooltip
    tooltipRef.current.addEventListener('click', handleTooltipInteraction);
    
    // Clean up
    return () => {
      if (tooltipRef.current) {
        tooltipRef.current.removeEventListener('click', handleTooltipInteraction);
      }
    };
  }, [tooltipRef]);

  // Helper function to highlight node connections - Defined at the top level, outside of any closures
  const highlightNodeConnections = (node: Node, sourceLinks: Link[], targetLinks: Link[]) => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    
    svg.selectAll(".node")
      .attr('opacity', (n: Node) => {
        if (n.id === node.id) return 1;
        
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
        const isConnected = (sourceId === node.id || targetId === node.id);
        return isConnected ? 1 : 0.1;
      });
    
    svg.selectAll(".node-label")
      .attr('opacity', (n: Node) => {
        if (n.id === node.id) return 1;
        
        const isConnected = sourceLinks.some(link => {
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          return targetId === n.id;
        }) || targetLinks.some(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          return sourceId === n.id;
        });
        
        return isConnected ? 1 : 0.2;
      });
  };

// Process node selection function (updated for tooltip detail handling)
const processNodeSelection = (d: Node) => {
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
  
  // For click and persistent modes, show the tooltip differently
  if (tooltipTrigger === 'click' || tooltipTrigger === 'persistent') {
    // Don't show modal for persistent mode
    if (tooltipTrigger !== 'persistent') {
      // Show the modal for click mode after a short delay
      setTimeout(() => {
        setShowNodeModal(true);
      }, 300);
    }
  }
  
  // Highlight connections in the visualization
  highlightNodeConnections(d, sourceLinks, targetLinks);
};
  
// Reset node selection function (ensure it clears tooltip as well)
const resetNodeSelection = () => {
  setSelectedNode(null);
  
  if (svgRef.current) {
    const svg = d3.select(svgRef.current);
    svg.selectAll('.node').attr('opacity', 1);
    svg.selectAll('.link').attr('opacity', 1);
    svg.selectAll('.node-label').attr('opacity', 1);
  }
  
  // Also hide any visible tooltips
  if (tooltipRef.current) {
    d3.select(tooltipRef.current)
      .style("opacity", "0")
      .style("visibility", "hidden");
  }
};

  // Add the useEffect for click away listener (outside tooltips in click mode)
  useEffect(() => {
    const cleanup = setupClickAwayListener(tooltipRef, tooltipTrigger);
    return cleanup;
  }, [tooltipTrigger, tooltipRef]);

  useEffect(() => {
    const cleanup = setupClickAwayListener(tooltipRef, tooltipTrigger);
    return cleanup;
  }, [tooltipTrigger]);

  // Pass SVG ref to parent if needed (for fullscreen mode)
  useEffect(() => {
    if (onSvgRef && svgRef.current) {
      onSvgRef(svgRef.current);
    }
  }, [onSvgRef]);

  // Force reinitialize zoom after visualization is ready
  useEffect(() => {
    if (!isLoading && svgRef.current && contentRef.current) {
      // Short delay to ensure D3 visualization is fully rendered
      const timer = setTimeout(() => {
        console.log("Force reinitializing zoom after visualization is ready");
        reinitializeZoom();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, reinitializeZoom]);

  // Update local visualization type when prop changes
  useEffect(() => {
    if (visualizationType !== localVisualizationType) {
      setLocalVisualizationType(visualizationType);
    }
  }, [visualizationType]);

  // Apply force parameters to simulation
  const applyForceParametersToSimulation = useCallback(() => {
    if (!simulationRef.current || localVisualizationType !== 'network') return;
    
    // Skip if already updating to prevent recursive updates
    if (isUpdatingRef.current) {
      console.log("Already updating forces, skipping");
      return false;
    }

    // Set flag to prevent recursive updates
    isUpdatingRef.current = true;
    
    const simulation = simulationRef.current;
    
    try {
      console.log("Directly applying all force parameters to simulation");
      
      // IMPORTANT: Stop the simulation first
      simulation.stop();
      
      // Recreate ALL forces from scratch for maximum reliability
      
      // 1. Store existing nodes and links
      const nodes = simulation.nodes();
      const linkForce = simulation.force("link") as d3.ForceLink<Node, Link>;
      const links = linkForce ? linkForce.links() : [];
      
      // 2. Remove all existing forces
      simulation.force("link", null)
                .force("charge", null)
                .force("center", null)
                .force("collision", null);
      
      // 3. Get container dimensions for center force
      let width = 800, height = 600; // Fallback values
      if (containerRef.current) {
        width = containerRef.current.clientWidth;
        height = containerRef.current.clientHeight;
      }
      
      // 4. Recreate all forces with current parameters
      simulation.force("link", d3.forceLink<Node, Link>(links)
                  .id(d => d.id)
                  .distance(linkDistance)
                  .strength(linkStrength))
                .force("charge", d3.forceManyBody<Node>()
                  .strength(nodeCharge))
                .force("center", d3.forceCenter(width / 2, height / 2))
                .force("collision", d3.forceCollide<Node>()
                  .radius(d => 7 * colors.nodeSize + 2)
                  .strength(1));
      
      console.log("Recreated all forces with current parameters:", {
        linkDistance,
        linkStrength,
        nodeCharge,
        nodeSize: colors.nodeSize
      });
      
      // 5. Completely reheat the simulation
      simulation.alphaTarget(0.3)  // Target higher alpha to keep simulation active
                .alpha(1.0)        // Maximum alpha value to ensure movement
                .restart();        // Restart with these values
      
      // 6. After a short time, reset alphaTarget to allow cooling
      setTimeout(() => {
        if (simulationRef.current) {
          simulationRef.current.alphaTarget(0);
          console.log("Reset alphaTarget to 0 after force parameter update");
          
          // Clear updating flag after a short delay
          setTimeout(() => {
            isUpdatingRef.current = false;
          }, 100);
        }
      }, 500);
      
      console.log("Simulation completely reheated with maximum alpha");
      
      return true;
    } catch (error) {
      console.error("Error recreating forces:", error);
      isUpdatingRef.current = false;
      return false;
    }
  }, [linkDistance, linkStrength, nodeCharge, colors.nodeSize, localVisualizationType, containerRef]);

  // Add this effect to apply force parameters when they change
  useEffect(() => {
    if (!visualizationInitialized.current || localVisualizationType !== 'network') return;
    
    // Skip initial render to avoid double-initialization
    const isInitialRender = 
      prevLinkDistanceRef.current === linkDistance &&
      prevLinkStrengthRef.current === linkStrength &&
      prevNodeChargeRef.current === nodeCharge;
    
    if (isInitialRender) {
      console.log("Skipping initial force parameter update");
      return;
    }
    
    // Skip if already updating
    if (isUpdatingRef.current) {
      console.log("Already updating, skipping force parameter effect");
      return;
    }
    
    console.log("Force parameters changed, completely recreating forces");
    applyForceParametersToSimulation();
    
    // Update refs for next comparison
    prevLinkDistanceRef.current = linkDistance;
    prevLinkStrengthRef.current = linkStrength;
    prevNodeChargeRef.current = nodeCharge;
    
  }, [linkDistance, linkStrength, nodeCharge, localVisualizationType, applyForceParametersToSimulation]);

  // Add initialization of color themes from categories
  useEffect(() => {
    if (
      nodeData.length > 0 && 
      uniqueCategories.length > 0 && 
      (!colors.dynamicColorThemes.default || 
      Object.keys(colors.dynamicColorThemes.default).length === 0)
    ) {
      console.log("Initializing color themes from categories");
      colors.generateDynamicColorThemes(uniqueCategories);
    }
  }, [nodeData, uniqueCategories, colors]);

  // Process imported data - only do this once
  useEffect(() => {
    // Skip if we've already processed the data
    if (dataLoaded && processedData.nodes.length > 0) {
      console.log("Network data already processed, skipping");
      return;
    }

    if (nodeData.length === 0 || linkData.length === 0) {
      console.log("Data not yet available for processing");
      return;
    }

    console.log("Processing data in NetworkVisualization:", 
      { nodeCount: nodeData.length, linkCount: linkData.length });

    try {
      // Process nodes
      const processedNodes: Node[] = nodeData.map(node => {
        // If node is already a Node type, use it directly
        if (typeof node === 'object' && 'id' in node && 'category' in node) {
          return {
            id: String(node.id),
            category: String(node.category)
          };
        }

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
        // If link is already a Link type, use it directly
        if (typeof link === 'object' && 'source' in link && 'target' in link) {
          return {
            source: typeof link.source === 'object' ? String(link.source.id) : String(link.source),
            target: typeof link.target === 'object' ? String(link.target.id) : String(link.target)
          };
        }

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

      // Generate dynamic color themes if needed
      if (uniqueCats.length > 0 && Object.keys(colors.dynamicColorThemes).length <= 1) {
        console.log("Generating color themes for categories:", uniqueCats);
        colors.generateDynamicColorThemes(uniqueCats);
      }

      // Calculate node counts by category
      const counts: CategoryCounts = { total: processedNodes.length };
      uniqueCats.forEach(category => {
        counts[category] = processedNodes.filter(node => node.category === category).length;
      });
      setNodeCounts(counts);
      setProcessedData({ nodes: processedNodes, links: processedLinks });
      
      // Mark data as loaded to prevent reprocessing
      setDataLoaded(true);
      
      // Set loading to false after a short delay to show the visualization
      setTimeout(() => {
        setIsLoading(false);
        toast({
          title: "Network Data Loaded",
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
  }, [nodeData, linkData, toast, colors]);

  // Create drag behavior with direct state access to fix the fixNodesOnDrag toggle issue
  const createDragBehavior = useCallback(() => {
    if (!simulationRef.current) {
      console.error("Cannot create drag behavior - simulation not initialized");
      return d3.drag<SVGCircleElement, SimulatedNode>();
    }
    
    console.log("Creating new drag behavior with fixNodesOnDrag:", localFixNodesOnDrag);
    
    const simulation = simulationRef.current;
    
    return d3.drag<SVGCircleElement, SimulatedNode>()
      .on("start", function(event, d) {
        // Prevent event from propagating to avoid conflicts with zoom
        if (event.sourceEvent) event.sourceEvent.stopPropagation();
        
        // Reheat the simulation when dragging starts
        if (!event.active) {
          simulation.alphaTarget(0.3).restart();
          console.log("Reheated simulation for dragging");
        }
        
        // Always store the initial position when starting to drag
        d.fx = d.x;
        d.fy = d.y;
        
        // Make the dragged node appear on top
        d3.select(this).raise();
        
        console.log("Drag start:", d.id);
      })
      .on("drag", function(event, d) {
        // Prevent event from propagating
        if (event.sourceEvent) event.sourceEvent.stopPropagation();
        
        // Move the node to follow the cursor
        d.fx = event.x;
        d.fy = event.y;
        
        // Update visual position immediately
        d3.select(this)
          .attr("cx", d.fx)
          .attr("cy", d.fy);
          
        // Update connected links immediately
        if (svgRef.current) {
          const svg = d3.select(svgRef.current);
          
          svg.selectAll<SVGLineElement, Link>(".link")
            .filter(l => {
              const source = typeof l.source === 'object' ? l.source.id : l.source;
              const target = typeof l.target === 'object' ? l.target.id : l.target;
              return source === d.id || target === d.id;
            })
            .each(function(l) {
              const element = d3.select(this);
              const isSource = (typeof l.source === 'object' ? l.source.id : l.source) === d.id;
              
              if (isSource) {
                element.attr("x1", d.fx).attr("y1", d.fy);
              } else {
                element.attr("x2", d.fx).attr("y2", d.fy);
              }
            });
            
          // Update label position
          svg.selectAll<SVGTextElement, Node>(".node-label")
            .filter(n => n.id === d.id)
            .attr("x", d.fx)
            .attr("y", d.fy);
        }
      })
      .on("end", function(event, d) {
        // Prevent event from propagating
        if (event.sourceEvent) event.sourceEvent.stopPropagation();
        
        if (!event.active) {
          // Always cool down the simulation when dragging ends
          simulation.alphaTarget(0);
        }
        
        // CRITICAL: Force a direct check of fixNodesOnDrag from component state
        // This ensures we always use the latest value, not the closure-captured one
        const currentFixed = document.getElementById('network-visualization-container')?.getAttribute('data-fix-nodes') === 'true';
        
        if (!currentFixed) {
          console.log("Releasing node:", d.id);
          d.fx = null;
          d.fy = null;
          
          // Apply alpha boost to allow nodes to reposition
          simulation.alpha(0.3).restart();
        } else {
          console.log("Keeping node fixed at:", d.id, d.fx, d.fy);
        }
      });
  }, [svgRef]); // Remove localFixNodesOnDrag dependency to avoid recreating the behavior

  // Function to directly update the drag behavior on all nodes
  const updateDragBehaviorOnAllNodes = useCallback(() => {
    if (!svgRef.current || !simulationRef.current) return;
    
    try {
      console.log("Updating drag behavior on all nodes with fixNodesOnDrag:", localFixNodesOnDrag);
      
      const svg = d3.select(svgRef.current);
      const dragBehavior = createDragBehavior();
      
      // Apply the updated drag behavior to all nodes
      svg.selectAll<SVGCircleElement, SimulatedNode>(".node")
        .call(dragBehavior as d3.DragBehavior<SVGCircleElement, unknown, SimulatedNode>);
      
      // If we're turning off node fixing, also release all currently fixed nodes
      if (!localFixNodesOnDrag) {
        console.log("Releasing all fixed nodes due to toggle change");
        
        svg.selectAll<SVGCircleElement, SimulatedNode>(".node")
          .each(function(d) {
            d.fx = null;
            d.fy = null;
          });
        
        // Apply higher alpha to reposition nodes
        simulationRef.current.alpha(1).restart();
      }
    } catch (error) {
      console.error("Error updating drag behavior on nodes:", error);
    }
  }, [createDragBehavior, localFixNodesOnDrag]);

  // Update drag behavior when fixNodesOnDrag changes
  useEffect(() => {
    if (!visualizationInitialized.current || localVisualizationType !== 'network') return;
    
    console.log("fixNodesOnDrag changed to:", localFixNodesOnDrag);
    updateDragBehaviorOnAllNodes();
    
  }, [localFixNodesOnDrag, localVisualizationType, updateDragBehaviorOnAllNodes]);

  // Create D3 visualization - only for network visualization type
  useEffect(() => {
    // Skip if visualization type is not network
    if (localVisualizationType !== 'network') {
      return;
    }

    // Skip if already initialized and just updating colors
    if (visualizationInitialized.current && svgRef.current) {
      try {
        console.log("Updating existing Network visualization");
        const svg = d3.select(svgRef.current);
        
        // Update node colors
        svg.selectAll<SVGCircleElement, Node>(".node")
          .attr("fill", (d: Node) => colors.getNodeColor(d))
          .attr("r", (_d: Node) => 7 * colors.nodeSize);
          
        // Update node labels
        svg.selectAll(".node-label")
          .style("font-size", d => `${8 * Math.min(1.2, colors.nodeSize)}px`)
          .style("fill", colors.textColor);
          
        // Update link colors
        svg.selectAll(".link")
          .attr("stroke", colors.linkColor)
          .attr("stroke-width", 1.5);
          
        // Update background if container exists
        if (containerRef.current) {
          const { r, g, b } = colors.rgbBackgroundColor;
          containerRef.current.style.backgroundColor = 
            `rgba(${r}, ${g}, ${b}, ${colors.backgroundOpacity})`;
        }
        
        // Apply current physics parameters to the existing simulation
        if (simulationRef.current) {
          const simulation = simulationRef.current;
          
          // Update charge force
          simulation.force("charge", d3.forceManyBody().strength(nodeCharge));
          
          // Update link force
          const linkForce = simulation.force("link") as d3.ForceLink<Node, Link>;
          if (linkForce) {
            linkForce.distance(linkDistance).strength(linkStrength);
          }
          
          // Update collision force
          simulation.force("collision", d3.forceCollide().radius(d => 7 * colors.nodeSize + 2));
          
          // Reheat simulation slightly to show changes
          simulation.alpha(0.3).restart();
        }
        
        return; // Skip full rebuild
      } catch (error) {
        console.error("Error updating Network visualization:", error);
        // Continue to rebuild if update fails
      }
    }

    // Make sure all refs are ready
    if (isLoading || !svgRef.current || processedData.nodes.length === 0) {
      console.log("Not ready to create visualization yet:", {
        isLoading,
        hasSvgRef: !!svgRef.current,
        hasContainerRef: !!containerRef.current,
        nodeCount: processedData.nodes.length,
        visualizationType: localVisualizationType
      });
      return;
    }
    
    // Debug log to track re-renders
    console.log("Rendering NetworkVisualization, isLoading:", isLoading);

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
      
      // Set explicit pointer-events to all to ensure zoom works
      d3.select(svgRef.current).style("pointer-events", "all");
      
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
        .force("collision", d3.forceCollide().radius(d => 10 * colors.nodeSize).strength(1));

      console.log("Initial simulation parameters:", {
        linkDistance: linkDistance * 2,
        linkStrength,
        nodeCharge: nodeCharge * 2,
        nodeSize: colors.nodeSize,
        collisionRadius: 10 * colors.nodeSize
      });

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
        console.log("Resetting simulation forces to normal values after initial positioning");
        
        const linkForce = simulation.force("link") as d3.ForceLink<Node, Link>;
        if (linkForce) {
          linkForce.distance(linkDistance).strength(linkStrength);
          console.log(`Reset link force: distance=${linkDistance}, strength=${linkStrength}`);
        }
        
        const chargeForce = simulation.force("charge") as d3.ForceManyBody<Node>;
        if (chargeForce) {
          chargeForce.strength(nodeCharge);
          console.log(`Reset charge force: ${nodeCharge}`);
        }
        
        const collisionForce = simulation.force("collision") as d3.ForceCollide<Node>;
        if (collisionForce) {
          collisionForce.radius(d => 7 * colors.nodeSize + 2).strength(1);
          console.log(`Reset collision radius: ${7 * colors.nodeSize + 2}`);
        }
        
        // Use higher alpha for more visible effect
        simulation.alpha(0.5).restart();
        console.log("Simulation restarted with alpha 0.5 after resetting forces");
      }, 1000);
      
      // Create links with proper type casting
      const link = g.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(filteredLinks)
        .enter()
        .append("line")
        .attr("class", "link")
        .attr("stroke", colors.linkColor)
        .attr("stroke-width", 1.5);
      
      // Create nodes with proper color handling
      const node = g.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(filteredNodes)
        .enter()
        .append("circle")
        .attr("class", "node")
        .attr("r", d => 7 * colors.nodeSize)
        .attr("fill", d => colors.getNodeColor(d)) // Use the proper color getter function
        .attr("stroke", colors.nodeStrokeColor || "#ffffff")
        .attr("stroke-width", 1.5);
      
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
        .style("fill", colors.textColor)
        .style("font-size", d => `${8 * Math.min(1.2, colors.nodeSize)}px`)
        .style("text-shadow", `0 1px 2px rgba(0, 0, 0, 0.7)`);
      
      // Create and apply drag behavior
      const dragBehavior = createDragBehavior();
      
      // Ensure the drag behavior is correctly initialized on all nodes
      try {
        node.call(dragBehavior as d3.DragBehavior<SVGCircleElement, unknown, Node>);
        console.log("Drag behavior initialized on all nodes");
      } catch (error) {
        console.error("Error initializing drag behavior:", error);
      }
      
      // Event handlers - using direct function instead of reference
      node
  .on("mouseover", function(event, d) {
    // Show the simple tooltip on hover with "Click for more details"
    showTooltip(
      event, 
      d, 
      tooltipRef, 
      processedData.links, 
      'simple',  // Always use simple view for hover
      'hover',   // Use hover mode for initial tooltip
      svgRef,
      null       // Don't process node selection on hover
    );
  })
  .on("mousemove", function(event) {
    // Only move the tooltip if it's not in persistent mode
    moveTooltip(event, tooltipRef, svgRef, 'hover');
  })
  .on("mouseout", function() {
    // Only hide the tooltip if it's not in persistent mode
    hideTooltip(tooltipRef, 'hover', selectedNode?.id);
  })
  .on("click", function(event, d) {
    event.stopPropagation();
    
    // Process node selection to update the sidebar
    processNodeSelection(d);
    
    // Always show detailed tooltip on click that stays visible
    showTooltip(
      event, 
      d, 
      tooltipRef, 
      processedData.links, 
      'detailed',   // Always use detailed view for clicks
      'persistent', // Always use persistent mode for click tooltips
      svgRef,
      null          // Don't re-trigger node selection
    );
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
        const { r, g, b } = colors.rgbBackgroundColor;
        containerRef.current.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${colors.backgroundOpacity})`;
      }
      
      console.log("D3 visualization created successfully");
      
      // Mark visualization as initialized
      visualizationInitialized.current = true;
      
      // Force reinitialize zoom after a short delay
      setTimeout(() => {
        reinitializeZoom();
      }, 200);

      // Set initial tooltip settings as DOM attributes
      if (containerRef.current) {
        containerRef.current.setAttribute('data-tooltip-detail', tooltipDetail);
        containerRef.current.setAttribute('data-tooltip-trigger', tooltipTrigger);
        console.log(`Initialized tooltip DOM attributes: detail=${tooltipDetail}, trigger=${tooltipTrigger}`);
      }

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
    toast,
    reinitializeZoom,
    forceUpdate,  // Include forceUpdate to trigger re-renders when needed
    tooltipDetail,
    tooltipTrigger,
    colors
  ]);

  // Update colors when they change
  useEffect(() => {
    // Skip if visualization type is not network
    if (localVisualizationType !== 'network') {
      return;
    }

    // Skip if not initialized yet
    if (!visualizationInitialized.current || !svgRef.current) {
      return;
    }
    
    try {
      console.log("Updating network visualization colors");
      const svg = d3.select(svgRef.current);
      
      // Update node colors
      svg.selectAll<SVGCircleElement, Node>(".node")
        .attr("fill", (d: Node) => colors.getNodeColor(d))
        .attr("r", (_d: Node) => 7 * colors.nodeSize)
        .attr("stroke", colors.nodeStrokeColor);
        
      // Update node labels
      svg.selectAll(".node-label")
        .style("font-size", `${8 * Math.min(1.2, colors.nodeSize)}px`)
        .style("fill", colors.textColor);
        
      // Update link colors
      svg.selectAll(".link")
        .attr("stroke", colors.linkColor)
        .attr("stroke-width", 1.5);
        
      // Update background if container exists
      if (containerRef.current) {
        const { r, g, b } = colors.rgbBackgroundColor;
        containerRef.current.style.backgroundColor = 
          `rgba(${r}, ${g}, ${b}, ${colors.backgroundOpacity})`;
      }
      
      console.log("Colors updated successfully");
    } catch (error) {
      console.error("Error updating visualization colors:", error);
    }
  }, [
    colors.colorTheme,
    colors.nodeSize,
    colors.textColor,
    colors.linkColor,
    colors.backgroundColor,
    colors.backgroundOpacity,
    colors.nodeStrokeColor,
    colors.customNodeColors,
    localVisualizationType
  ]);

// Also add an effect to update DOM attributes when tooltipDetail or tooltipTrigger changes
useEffect(() => {
  if (containerRef.current) {
    containerRef.current.setAttribute('data-tooltip-detail', tooltipDetail);
    containerRef.current.setAttribute('data-tooltip-trigger', tooltipTrigger);
    console.log(`Updated tooltip DOM attributes: detail=${tooltipDetail}, trigger=${tooltipTrigger}`);
  }
}, [tooltipDetail, tooltipTrigger]);

  // Cleanup function when component unmounts
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll("*").remove();
      }
      visualizationInitialized.current = false;
    };
  }, []);

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
        
        // Reinitialize zoom after resize
        setTimeout(() => {
          reinitializeZoom();
        }, 200);
        
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
  }, [isLoading, reinitializeZoom]);

// Modified tooltip handlers to ensure they work correctly
const handleTooltipDetailChange = (detail: TooltipDetail) => {
  console.log(`Changing tooltip detail to: ${detail}`);
  setTooltipDetail(detail);
  
  // Force redraw tooltips if one is currently visible
  if (tooltipRef.current && d3.select(tooltipRef.current).style("visibility") === "visible") {
    // If a tooltip is visible and a node is selected, redraw it with new detail level
    if (selectedNode) {
      const event = new MouseEvent('mouseover'); // Create a synthetic event
      showTooltip(
        event, 
        selectedNode, 
        tooltipRef, 
        processedData.links, 
        detail, // Use the new detail level
        tooltipTrigger,
        svgRef, // Pass the svgRef
        (node) => { processNodeSelection(node); }
      );
    }
  }
  
  if (onTooltipDetailChange) {
    onTooltipDetailChange(detail);
  } 
  
  toast({
    title: `Tooltip Detail: ${detail === 'simple' ? 'Simple' : 'Detailed'}`,
    description: `Showing ${detail === 'simple' ? 'basic' : 'comprehensive'} node information`
  });
};

const handleTooltipTriggerChange = (trigger: TooltipTrigger) => {
  console.log(`Changing tooltip trigger to: ${trigger}`);
  setTooltipTrigger(trigger);
  
  // Store the trigger mode in a DOM attribute
  if (containerRef.current) {
    containerRef.current.setAttribute('data-tooltip-trigger', trigger);
  }
  
  // Hide any visible tooltip when changing modes
  if (tooltipRef.current) {
    d3.select(tooltipRef.current)
      .style("opacity", "0")
      .style("visibility", "hidden");
  }
  
  if (onTooltipTriggerChange) {
    onTooltipTriggerChange(trigger);
  }
  
  toast({
    title: `Tooltip Mode: ${trigger.charAt(0).toUpperCase() + trigger.slice(1)}`,
    description: trigger === 'hover' 
      ? 'Tooltips will show on hover' 
      : trigger === 'click' 
        ? 'Tooltips will show on click and dismiss on click outside' 
        : 'Tooltips will stay visible until new selection'
  });
};

// Updated handler for exporting node data to actually download files
const handleExportNodeData = (format: 'text' | 'json') => {
  if (!selectedNode) return;
  
  try {
    if (format === 'text') {
      // Use the existing downloadNodeAsText function to download file
      downloadNodeAsText(selectedNode, processedData.links);
    } else {
      // Use the existing downloadNodeAsJson function to download file
      downloadNodeAsJson(selectedNode, processedData.links);
    }
    
    toast({
      title: 'Download Started',
      description: `Node data downloaded as ${format.toUpperCase()} file`,
    });
  } catch (error) {
    console.error('Failed to download: ', error);
    toast({
      title: 'Download Failed',
      description: 'Could not download the file',
      variant: 'destructive'
    });
  }
};

  // Update the handleSliderChange function to apply forces more directly and with higher alpha
  const handleSliderChange = useCallback((type: string, value: number) => {
    console.log(`Slider changed: ${type} = ${value}`);
    
    // Skip if not in network visualization
    if (localVisualizationType !== 'network') {
      console.log(`Skipping slider update for ${type} - not in network visualization`);
      return;
    }
    
    // Skip if simulation not available
    if (!simulationRef.current || !svgRef.current) {
      console.warn(`Cannot update ${type} - simulation or SVG reference missing`);
      return;
    }
    
    const simulation = simulationRef.current;
    const svg = d3.select(svgRef.current);
    
    try {
      // Stop the simulation before making changes
      simulation.stop();

      // Apply changes DIRECTLY with more aggressive alpha values
      switch (type) {
        case "nodeSize":
          console.log(`Applying node size: ${value}`);
          
          // Update node circles
          svg.selectAll<SVGCircleElement, Node>(".node")
            .attr("r", d => 7 * value);
          
          // Update node labels
          svg.selectAll<SVGTextElement, Node>(".node-label")
            .style("font-size", `${8 * Math.min(1.2, value)}px`);
          
          // Update collision radius with new value
          simulation.force("collision", d3.forceCollide<Node>()
            .radius(d => 7 * value + 2)
            .strength(1));
          break;
          
        case "linkDistance":
          { console.log(`Applying link distance: ${value}`);
          
          // Completely rebuild the link force for more reliable updates
          const oldLinkForce = simulation.force("link") as d3.ForceLink<Node, Link>;
          if (oldLinkForce) {
            const links = oldLinkForce.links();
            const strength = oldLinkForce.strength();
            
            simulation.force("link", d3.forceLink<Node, Link>(links)
              .id(d => d.id)
              .distance(value)
              .strength(strength));
              
            console.log("Rebuilt link force with distance:", value);
          }
          break; }
          
        case "linkStrength":
          { console.log(`Applying link strength: ${value}`);
          
          // Completely rebuild the link force for more reliable updates
          const oldStrengthForce = simulation.force("link") as d3.ForceLink<Node, Link>;
          if (oldStrengthForce) {
            const links = oldStrengthForce.links();
            const distance = oldStrengthForce.distance();
            
            simulation.force("link", d3.forceLink<Node, Link>(links)
              .id(d => d.id)
              .distance(distance)
              .strength(value));
              
            console.log("Rebuilt link force with strength:", value);
          }
          break; }
          
        case "nodeCharge":
          console.log(`Applying node charge: ${value}`);
          
          // Rebuild the charge force entirely
          simulation.force("charge", d3.forceManyBody<Node>().strength(value));
          console.log("Rebuilt charge force with strength:", value);
          break;
      }
      
      // Use a higher alpha to ensure changes are visible
      simulation.alpha(0.8).restart();
      
      console.log(`Simulation restarted after ${type} change with alpha 0.8`);
      
    } catch (error) {
      console.error(`Error updating ${type}:`, error);
    }
  }, [localVisualizationType]);

  // Function to toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
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

  // Handle toggle fix nodes - Simplified and more direct
  const handleToggleFixNodes = () => {
    const newValue = !localFixNodesOnDrag;
    console.log("Toggling fixNodesOnDrag from", localFixNodesOnDrag, "to", newValue);
    
    // Update local state
    setLocalFixNodesOnDrag(newValue);
    
    // Update the DOM attribute for direct access from drag handlers
    if (containerRef.current) {
      containerRef.current.setAttribute('data-fix-nodes', newValue ? 'true' : 'false');
    }
    
    // Skip direct handling if we're not in network visualization
    if (localVisualizationType !== 'network') {
      console.log("Not in network visualization, skipping direct toggle handling");
      
      toast({
        title: newValue ? "Nodes will stay fixed" : "Nodes will follow simulation",
        description: newValue 
          ? "Nodes will remain where you drop them" 
          : "Nodes will return to simulation flow after dragging"
      });
      
      return;
    }
    
    // Handle direct manipulation of the simulation
    if (simulationRef.current && svgRef.current) {
      try {
        const simulation = simulationRef.current;
        const svg = d3.select(svgRef.current);
        
        // Stop simulation to make changes
        simulation.stop();
        
        // If turning off node fixing, release all fixed nodes
        if (!newValue) {
          console.log("Releasing all fixed nodes");
          
          svg.selectAll<SVGCircleElement, SimulatedNode>(".node")
            .each(function(d) {
              // Release all fixed positions
              d.fx = null;
              d.fy = null;
              
              // Also reset velocities for clean movement
              d.vx = 0;
              d.vy = 0;
            });
            
          // Apply high alpha to ensure visible movement
          simulation.alpha(0.5).restart();
        } else {
          // Just restart with low alpha if fixing nodes
          simulation.alpha(0.1).restart();
        }
        
        console.log("Applied toggle change to network nodes");
      } catch (error) {
        console.error("Error handling fix nodes toggle:", error);
      }
    } else {
      console.log("Cannot directly update simulation - missing references");
    }
    
    toast({
      title: newValue ? "Nodes will stay fixed" : "Nodes will follow simulation",
      description: newValue 
        ? "Nodes will remain where you drop them" 
        : "Nodes will return to simulation flow after dragging"
    });
  };

  // Handle visualization type change - simplified to minimize state changes
  const handleVisualizationTypeChange = (type: VisualizationType) => {
    // Skip if type hasn't changed to prevent unnecessary rerenders
    if (type === localVisualizationType) return;
    
    console.log(`Changing visualization type to: ${type}`);
    
    // Directly update local visualization type
    setLocalVisualizationType(type);
    
    // Call the parent handler if provided, but only after a brief delay
    if (onVisualizationTypeChange) {
      onVisualizationTypeChange(type);
    }
    
    toast({
      title: `Switched to ${type} visualization`,
      description: `Now viewing the network as a ${type} graph.`
    });
  };

  // Completely rewrite the Reset Simulation function to properly reset everything
  const handleResetSimulation = () => {
    console.log("Completely resetting simulation");
    
    // Skip if not network visualization
    if (localVisualizationType !== 'network') {
      console.log("Skipping simulation reset - not in network visualization");
      return;
    }
    
    // Reset state values to defaults
    setLinkDistance(70);
    setLinkStrength(1.0);
    setNodeCharge(-300);
    colors.setNodeSize(1.0);
    
    // Update reference values
    prevLinkDistanceRef.current = 70;
    prevNodeChargeRef.current = -300;
    prevLinkStrengthRef.current = 1.0;
    
    // Get current simulation
    const currentSimulation = simulationRef.current;
    
    if (!currentSimulation || !svgRef.current) {
      console.log("Simulation not available - performing complete reinitialization");
      reinitializeVisualization();
      return;
    }
    
    try {
      // Stop the current simulation
      currentSimulation.stop();
      
      // Get container dimensions
      let width = 800, height = 600;
      if (containerRef.current) {
        width = containerRef.current.clientWidth;
        height = containerRef.current.clientHeight;
      }
      
      // Get the current nodes and links
      const nodes = currentSimulation.nodes();
      
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
          
          // Randomize positions to create a fresh layout
          const angle = Math.random() * 2 * Math.PI;
          const radius = Math.min(width, height) * 0.4 * Math.random();
          d.x = width / 2 + radius * Math.cos(angle);
          d.y = height / 2 + radius * Math.sin(angle);
        });
      
      // Get all links (independent of the old forces)
      const links = processedData.links.filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        // Only include links where both nodes exist in the current visualization
        return nodes.some(n => n.id === sourceId) && nodes.some(n => n.id === targetId);
      });
      
      // Clear ALL existing forces
      currentSimulation.force("link", null)
                     .force("charge", null)
                     .force("center", null)
                     .force("collision", null);
      
      // Recreate forces with default parameters
      currentSimulation.force("link", d3.forceLink<Node, Link>(links)
                       .id(d => d.id)
                       .distance(70)
                       .strength(1.0))
                     .force("charge", d3.forceManyBody<Node>()
                       .strength(-300))
                     .force("center", d3.forceCenter(width / 2, height / 2))
                     .force("collision", d3.forceCollide<Node>()
                       .radius(d => 7 * 1.0 + 2)
                       .strength(1));
      
      // Update visual elements
      svg.selectAll<SVGCircleElement, Node>(".node")
         .attr("r", 7);
      
      svg.selectAll<SVGTextElement, Node>(".node-label")
         .style("font-size", "8px");
      
      // Restart with maximum alpha for complete reheat
      currentSimulation.alpha(1.0).restart();
      
      console.log("Simulation fully reset and reheated");
      
      toast({
        title: "Physics Reset",
        description: "Network parameters have been reset to default values",
      });
    } catch (error) {
      console.error("Error during simulation reset:", error);
      toast({
        title: "Reset Failed",
        description: "Could not reset network physics. Trying full reinitialization...",
        variant: "destructive"
      });
      
      // Fall back to complete reinitialization
      setTimeout(() => {
        reinitializeVisualization();
      }, 100);
    }
  };

  // Complete reinitialization function 
  const reinitializeVisualization = () => {
    console.log("Completely reinitializing visualization");
    
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
      
      // Reset visualization initialized flag
      visualizationInitialized.current = false;
      
      // Reset all parameters to defaults
      setLinkDistance(70);
      setLinkStrength(1.0);
      setNodeCharge(-300);
      colors.setNodeSize(1.0);
      
      // Update reference values
      prevLinkDistanceRef.current = 70;
      prevNodeChargeRef.current = -300;
      prevLinkStrengthRef.current = 1.0;
      
      // Set a flag to trigger the useEffect that creates the visualization
      setIsLoading(true);
      
      // Delay to allow for DOM updates
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
      
      // Clear any error state
      setVisualizationError(null);
      
      toast({
        title: "Visualization Reset",
        description: "Network visualization has been completely reinitialized",
      });
    } catch (error) {
      console.error("Error reinitializing visualization:", error);
      setVisualizationError(error instanceof Error ? error.message : "Unknown error during reinitialization");
      
      toast({
        title: "Error",
        description: "Failed to reinitialize the visualization. Please try reloading the page.",
        variant: "destructive"
      });
    }
  };

  // Handle parameter change - Update to ensure correct state updates
  const handleParameterChange = (type: string, value: number) => {
    console.log(`Parameter change called: ${type} = ${value}`);
    
    // Skip if not in network visualization
    if (localVisualizationType !== 'network') {
      console.log(`Skipping parameter change for ${type} - not in network visualization`);
      return;
    }
    
    // Update state based on parameter type
    switch (type) {
      case "nodeSize":
        colors.setNodeSize(value);
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
    
    // Store this new value in the DOM for direct access if needed
    if (containerRef.current) {
      containerRef.current.setAttribute(`data-${type}`, value.toString());
    }
    
    // Apply change immediately to the simulation
    handleSliderChange(type, value);
  };

  // Handle node group change
  const handleNodeGroupChange = (group: string) => {
    console.log(`Node group changed to: ${group}`);
    
    // Only apply if network visualization
    if (localVisualizationType !== 'network') {
      console.log(`Skipping node group change - not in network visualization`);
      return;
    }
    
    setNodeGroup(group);
    // Full reinitialize is needed for this change
    reinitializeVisualization();
  };

  // Handle color theme change
  const handleColorThemeChange = (theme: string) => {
    console.log(`Color theme changed to: ${theme}`);
    
    // Use the hook's method to update the theme
    colors.setColorTheme(theme);
    
    // Force a re-render to update visuals
    setForceUpdate(prev => !prev);
    
    // Add a toast notification for feedback
    toast({
      title: `Color Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`,
      description: "Color theme has been updated"
    });
  };

  // Handle color tab change
  const handleColorTabChange = (tab: string) => {
    console.log(`Color tab changed to: ${tab}`);
    colors.setActiveColorTab(tab);
  };

  // Handle apply group colors
  const handleApplyGroupColors = (categoryColorMap: Record<string, string>) => {
    console.log("Applying group colors", categoryColorMap);
    
    // Apply each category color individually
    Object.entries(categoryColorMap).forEach(([category, color]) => {
      if (colors.updateCategoryColor) {
        colors.updateCategoryColor(category, color);
      }
    });
    
    // Force update to refresh the visualization
    setForceUpdate(prev => !prev);
    
    toast({
      title: "Group Colors Applied",
      description: "Custom colors have been applied to categories",
    });
  };

  // Handle apply individual color
  const handleApplyIndividualColor = (nodeId: string, color: string) => {
    console.log(`Applying individual color for node ${nodeId}: ${color}`);
    if (colors.applyIndividualColor) {
      colors.applyIndividualColor(nodeId, color);
      // Force update to refresh the visualization
      setForceUpdate(prev => !prev);
    }
  };

  // Handle reset individual color
  const handleResetIndividualColor = (nodeId: string) => {
    console.log(`Resetting individual color for node ${nodeId}`);
    if (colors.resetIndividualColor) {
      colors.resetIndividualColor(nodeId);
      // Force update to refresh the visualization
      setForceUpdate(prev => !prev);
    }
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
    
    colors.setBackgroundColor(bgColor);
    colors.setTextColor(txtColor);
    colors.setLinkColor(lnkColor);
    colors.setBackgroundOpacity(opacity);
    colors.setNodeStrokeColor(nodeStrokeClr);
    
    // Force update to refresh the visualization
    setForceUpdate(prev => !prev);
  };

  // Handle reset background colors
  const handleResetBackgroundColors = () => {
    console.log("Resetting background colors");
    if (colors.resetBackgroundColors) {
      colors.resetBackgroundColors();
      // Force update to refresh
      setForceUpdate(prev => !prev);
    }
  };

  // Handle reset graph
  const handleResetGraph = () => {
    console.log("Resetting graph");
    
    // Skip if not network visualization
    if (localVisualizationType !== 'network') {
      console.log("Skipping graph reset - not in network visualization");
      return;
    }
    
    // Reset all visual properties
    setNodeGroup('all');
    if (colors.resetAllColors) {
      colors.resetAllColors();
    }
    
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
    localNodeSize: colors.nodeSize,
    nodeGroup,
    localColorTheme: colors.colorTheme,
    activeColorTab: colors.activeColorTab,
    localBackgroundColor: colors.backgroundColor,
    textColor: colors.textColor,
    localLinkColor: colors.linkColor,
    nodeStrokeColor: colors.nodeStrokeColor,
    localBackgroundOpacity: colors.backgroundOpacity,
    isSidebarCollapsed,
    networkTitle,
    localFixNodesOnDrag,
    localVisualizationType,
    tooltipDetail,
    tooltipTrigger
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
    handleZoomToFit: zoomToFit, 
    handleZoomIn: zoomIn,       
    handleZoomOut: zoomOut,     
    handleResetZoom: resetZoom,
    handleTooltipDetailChange: (detail: string) => handleTooltipDetailChange(detail as TooltipDetail),
    handleTooltipTriggerChange: (trigger: string) => handleTooltipTriggerChange(trigger as TooltipTrigger), 
    handleExportNodeData
  };

  // Direct visualization type checking
  const isArc = localVisualizationType === 'arc';
  const isNetwork = localVisualizationType === 'network';
  const isRad360 = localVisualizationType === 'rad360';
  const isArcLineal = localVisualizationType === 'arcLineal';
  const is3D = localVisualizationType === '3d';
  const isNodeNav = localVisualizationType === ('nodeNav' as VisualizationType);

  // IMPROVEMENT: Fully unmount non-active visualizations rather than hiding them
  return (
    <BaseVisualization
      children={
        <div className="w-full h-full">
          {/* Network Graph Container - fully unmounted when not active */}
          {isNetwork && (
            <div className="w-full h-full">
              <div 
                ref={containerRef} 
                className="w-full h-full relative" 
                id="network-visualization-container" 
                data-fix-nodes={localFixNodesOnDrag ? 'true' : 'false'}
                style={{
                  backgroundColor: `rgba(${colors.rgbBackgroundColor.r}, ${colors.rgbBackgroundColor.g}, ${colors.rgbBackgroundColor.b}, ${colors.backgroundOpacity})`,
                  touchAction: "none" // Important to prevent zoom/pan conflicts with touch events
                }}
              >
                <svg 
                  ref={svgRef} 
                  className="w-full h-full"
                  style={{ pointerEvents: "all" }} // Explicit pointer events to fix zoom
                />
                
                {/* File Buttons */}
                <FileButtons 
                  onDownloadData={downloadData}
                  onDownloadGraph={downloadGraph}
                  onResetSelection={handleResetSelection}
                  nodeData={nodeData.map(node => ({
                    id: node.id || '',
                    name: node.name || '',
                    category: node.category || '',
                    type: node.type || ''
                  }))}
                  linkData={linkData.map(link => ({
                    ...link,
                    source: typeof link.source === 'object' ? String(link.source.id) : String(link.source),
                    target: typeof link.target === 'object' ? String(link.target.id) : String(link.target),
                  }))}
                />
                
                {/* Zoom Controls */}
                <ZoomControls
                  onZoomIn={zoomIn}
                  onZoomOut={zoomOut}
                  onReset={zoomToFit}
                  isZoomInitialized={isZoomInitialized}
                />
                
                {/* Tooltip */}
                <div 
  ref={tooltipRef} 
  className="absolute bg-black/85 text-white px-3 py-2 rounded-md text-sm z-50"
  style={{ 
    opacity: 0,
    visibility: "hidden",
    transition: 'opacity 0.15s ease-in-out',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    maxWidth: '320px',
    maxHeight: '400px',
    overflowY: 'auto',
    pointerEvents: 'auto' // Important - allow interacting with tooltip content
  }}
/>
                
                {/* Network components */}
                <NetworkTooltip 
                  tooltipRef={tooltipRef} 
                  nodes={processedData.nodes} 
                  links={processedData.links} 
                  tooltipDetail={tooltipDetail}
                  tooltipTrigger={tooltipTrigger}
                />
                <NetworkLegend 
                  categories={uniqueCategories} 
                  colorTheme={colors.colorTheme} 
                  dynamicColorThemes={colors.dynamicColorThemes} 
                  colorPalette={Object.values(colors.dynamicColorThemes.default || {})}
                />
                <NetworkHelper />
                
                {/* Node detail modal */}
                <NodeDetailModal
                  node={selectedNode}
                  links={processedData.links}
                  isOpen={showNodeModal}
                  onClose={() => setShowNodeModal(false)}
                />
              </div>
            </div>
          )}
          
          {/* Arc Visualization Container - fully unmounted when not active */}
          {isArc && (
            <ArcVisualization
              onCreditsClick={onCreditsClick}
              nodeData={nodeData.map(node => ({
                id: String(node.id),
                name: node.name || '',
                category: node.category || '',
                type: node.type || ''
              }))}
              linkData={linkData.map(link => ({
                source: typeof link.source === 'object' ? link.source.id : link.source,
                target: typeof link.target === 'object' ? link.target.id : link.target,
              }))}
              visualizationType={localVisualizationType}
              onVisualizationTypeChange={handleVisualizationTypeChange}
              colorTheme={colors.colorTheme}
              nodeSize={colors.nodeSize}
              linkColor={colors.linkColor}
              backgroundColor={colors.backgroundColor}
              backgroundOpacity={colors.backgroundOpacity}
              customNodeColors={colors.customNodeColors}
              dynamicColorThemes={colors.dynamicColorThemes}
              onDownloadData={downloadData}
              onDownloadGraph={downloadGraph}
              onResetSelection={handleResetSelection}
            />
          )}

          {/* Rad360 Visualization Container - fully unmounted when not active */}
          {isRad360 && (
            <Rad360Visualization
              onCreditsClick={onCreditsClick}
              nodeData={nodeData.map(node => ({
                id: String(node.id),
                name: node.name || '',
                category: node.category || '',
                type: node.type || ''
              }))}
              linkData={linkData.map(link => ({
                source: typeof link.source === 'object' ? link.source.id : link.source,
                target: typeof link.target === 'object' ? link.target.id : link.target,
              }))}
              visualizationType={localVisualizationType}
              onVisualizationTypeChange={handleVisualizationTypeChange}
              colorTheme={colors.colorTheme}
              nodeSize={colors.nodeSize}
              linkColor={colors.linkColor}
              backgroundColor={colors.backgroundColor}
              backgroundOpacity={colors.backgroundOpacity}
              customNodeColors={colors.customNodeColors}
              dynamicColorThemes={colors.dynamicColorThemes}
              onDownloadData={downloadData}
              onDownloadGraph={downloadGraph}
              onResetSelection={handleResetSelection}
            />
          )}

          {/* ArcLineal Visualization Container - fully unmounted when not active */}
          {isArcLineal && (
            <ArcLinealVisualization
              onCreditsClick={onCreditsClick}
              nodeData={nodeData.map(node => ({
                id: String(node.id),
                name: node.name || '',
                category: node.category || '',
                type: node.type || ''
              }))}
              linkData={linkData.map(link => ({
                source: typeof link.source === 'object' ? link.source.id : link.source,
                target: typeof link.target === 'object' ? link.target.id : link.target,
              }))}
              visualizationType={localVisualizationType}
              onVisualizationTypeChange={handleVisualizationTypeChange}
              colorTheme={colors.colorTheme}
              nodeSize={colors.nodeSize}
              linkColor={colors.linkColor}
              backgroundColor={colors.backgroundColor}
              backgroundOpacity={colors.backgroundOpacity}
              customNodeColors={colors.customNodeColors}
              dynamicColorThemes={colors.dynamicColorThemes}
              onDownloadData={downloadData}
              onDownloadGraph={downloadGraph}
              onResetSelection={handleResetSelection}
            />
          )}

{isNodeNav && (
  <NodeNavVisualization
    onCreditsClick={onCreditsClick}
    nodeData={nodeData.map(node => ({
      id: String(node.id),
      name: node.name || '',
      category: node.category || '',
      type: node.type || ''
    }))}
    linkData={linkData.map(link => ({
      source: typeof link.source === 'object' ? link.source.id : link.source,
      target: typeof link.target === 'object' ? link.target.id : link.target,
    }))}
    visualizationType={localVisualizationType}
    onVisualizationTypeChange={handleVisualizationTypeChange}
    colorTheme={colors.colorTheme}
    nodeSize={colors.nodeSize}
    linkColor={colors.linkColor}
    backgroundColor={colors.backgroundColor}
    backgroundOpacity={colors.backgroundOpacity}
    customNodeColors={colors.customNodeColors}
    dynamicColorThemes={colors.dynamicColorThemes}
    onDownloadData={downloadData}
    onDownloadGraph={downloadGraph}
    onResetSelection={handleResetSelection}
  />
)}


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
      customNodeColorsState={colors.customNodeColors}
      dynamicColorThemesState={colors.dynamicColorThemes}
      onZoomToFit={zoomToFit}
      renderSidebar={true}
    />
  );
};

export default NetworkVisualization;