/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// This is a revised version of the GroupableNetworkVisualization component
// focusing on fixing dragging issues and panning conflicts

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from 'd3';
import { useToast } from "@/components/ui/use-toast";
import { 
  Node, 
  Link, 
  SimulatedNode, 
  SimulatedLink,
  CategoryCounts,
  VisualizationType
} from '@/types/networkTypes';
import { downloadNodeAsJson, downloadNodeAsText, findNodeConnections } from './TooltipUtils';
import {
  NetworkLegend,
  NetworkHelper,
  EmptyData,
  LoadingIndicator
} from './NetworkComponents';
import useZoomPan from '@/hooks/useZoomPan';
import useFileExport from '@/hooks/useFileExport';
import ZoomControls from './ZoomControls';
import NetworkTooltip from './NetworkTooltip';
import useNetworkColors from '@/hooks/useNetworkColors';
import { TooltipDetail, TooltipTrigger } from './TooltipSettings';
import NodeDetailModal from './NodeDetailModal';
import { 
  showTooltip, 
  moveTooltip, 
  hideTooltip, 
  setupClickAwayListener
} from './TooltipUtils';
import FileButtons from "./FileButtons";
import { Button } from "@/components/ui/button";
import { Users, Layers, LucideGroup, Lock, Unlock, AlertCircle, List, Check, CheckSquare, Square, ChevronDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import NetworkSidebar from './NetworkSidebar';
import BaseVisualization from './BaseVisualization';

interface NodeGroup {
  id: string;
  nodes: Node[];
  category: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GroupableNetworkVisualizationProps {
  onCreditsClick: () => void;
  nodeData: any[]; 
  linkData: Link[];
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
  tooltipDetail?: TooltipDetail;
  tooltipTrigger?: TooltipTrigger;
  onTooltipDetailChange?: (detail: TooltipDetail) => void;
  onTooltipTriggerChange?: (trigger: TooltipTrigger) => void;
}

const GroupableNetworkVisualization: React.FC<GroupableNetworkVisualizationProps> = ({ 
  onCreditsClick, 
  nodeData = [],
  linkData = [],
  visualizationType = 'groupable',
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
  const selectionRectRef = useRef<SVGRectElement | null>(null);
  const dragStartedRef = useRef(false);
  
  // Main component state
  const [isLoading, setIsLoading] = useState(true);
  const [linkDistance, setLinkDistance] = useState(70);
  const [linkStrength, setLinkStrength] = useState(1.0);
  const [nodeCharge, setNodeCharge] = useState(-300);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedNodeConnections, setSelectedNodeConnections] = useState<{ to: string[]; from: string[] }>({ to: [], from: [] });
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [nodeCounts, setNodeCounts] = useState<CategoryCounts>({ total: 0 });
  const [localFixNodesOnDrag, setLocalFixNodesOnDrag] = useState(fixNodesOnDrag);
  const [dataLoaded, setDataLoaded] = useState(false);  
  const [tooltipDetail, setTooltipDetail] = useState<TooltipDetail>(propTooltipDetail || 'simple');
  const [tooltipTrigger, setTooltipTrigger] = useState<TooltipTrigger>(propTooltipTrigger || 'hover');
  const [showNodeModal, setShowNodeModal] = useState<boolean>(false);
  const [processedData, setProcessedData] = useState<{ nodes: Node[], links: Link[] }>({ nodes: [], links: [] });
  const [nodeGroup, setNodeGroup] = useState('all');
  const [networkTitle, setNetworkTitle] = useState("Groupable Network");
  const [visualizationError, setVisualizationError] = useState<string | null>(null);
  
  // Selection state
  const [showSelectionPanel, setShowSelectionPanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [listSelectedNodes, setListSelectedNodes] = useState<{[id: string]: boolean}>({});
  
  // Static mode to stop simulation and enable better selection
  const [staticMode, setStaticMode] = useState(true);

  // Grouping-specific state
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [groupedNodes, setGroupedNodes] = useState<NodeGroup[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [nextGroupId, setNextGroupId] = useState(1);
  const [selectionRect, setSelectionRect] = useState<{
    startX: number, 
    startY: number, 
    width: number, 
    height: number,
    visible: boolean
  }>({ startX: 0, startY: 0, width: 0, height: 0, visible: false });
  const [shouldCenterView, setShouldCenterView] = useState(true);

  
// Sidebar component state declarations
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
const [activeColorTab, setActiveColorTab] = useState('presets');
const [expandedSections, setExpandedSections] = useState({
  networkControls: true,
  nodeControls: true,
  colorControls: false,
  networkInfo: false,
  visualizationType: true,
  threeDControls: false,
  tooltipSettings: true,
  groupingControls: true,
  configPresets: true
});


const toggleSidebar = () => {
  setIsSidebarCollapsed(!isSidebarCollapsed);
};

const handleTitleChange = (title: string) => {
  setNetworkTitle(title);
};

const handleColorTabChange = (tab: string) => {
  setActiveColorTab(tab);
};

const toggleSection = (section: string) => {
  setExpandedSections(prev => ({
    ...prev,
    [section]: !prev[section as keyof typeof prev]
  }));
};

  // References to track values
  const visualizationInitialized = useRef(false);
  const isUpdatingRef = useRef<boolean>(false);
  const skipReinitializeRef = useRef<boolean>(false);
  
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
    reinitializeZoom,
    // Removed the zoom property as it does not exist
  } = useZoomPan({
    svgRef, 
    contentRef,
    containerRef,
    isReady: !isLoading && processedData.nodes.length > 0,
    nodesDraggable: true
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
  }, [propTooltipDetail, tooltipDetail]);

  // Sync tooltipTrigger with props if they change
  useEffect(() => {
    if (propTooltipTrigger && propTooltipTrigger !== tooltipTrigger) {
      setTooltipTrigger(propTooltipTrigger);
    }
  }, [propTooltipTrigger, tooltipTrigger]);

  // Apply nodes from list selection
  useEffect(() => {
    const nodes = Object.entries(listSelectedNodes)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => processedData.nodes.find(node => node.id === id))
      .filter(Boolean) as Node[];
    
    setSelectedNodes(nodes);
  }, [listSelectedNodes, processedData.nodes]);

  // Effect to stop simulation when in static mode
  useEffect(() => {
    if (simulationRef.current) {
      if (staticMode) {
        // Stop the simulation completely
        simulationRef.current.stop();
        
        // Fix all nodes in place 
        if (svgRef.current) {
          d3.select(svgRef.current)
            .selectAll<SVGCircleElement, SimulatedNode>(".node")
            .each(function(d) {
              // Fixed position to current position
              if (d.x !== undefined && d.y !== undefined) {
                d.fx = d.x;
                d.fy = d.y;
              }
            });
        }
      } else {
        // Restart simulation and release nodes if not being dragged
        if (!localFixNodesOnDrag) {
          if (svgRef.current) {
            d3.select(svgRef.current)
              .selectAll<SVGCircleElement, SimulatedNode>(".node")
              .each(function(d) {
                d.fx = null;
                d.fy = null;
              });
          }
          
          simulationRef.current.alpha(0.3).restart();
        }
      }
    }
  }, [staticMode, localFixNodesOnDrag]);

  // Process imported data
  useEffect(() => {
    if (dataLoaded && processedData.nodes.length > 0) {
      return;
    }

    if (nodeData.length === 0 || linkData.length === 0) {
      return;
    }

    try {
      // Process nodes
      const processedNodes: Node[] = nodeData.map(node => {
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
        ) || Object.keys(node)[0];

        const categoryKey = Object.keys(node).find(key => 
          key.toLowerCase() === 'category' || 
          key.toLowerCase() === 'type' || 
          key.toLowerCase() === 'node type' ||
          key.toLowerCase() === 'node category'
        ) || (Object.keys(node).length > 1 ? Object.keys(node)[1] : 'default');

        return {
          id: String(node[idKey] || 'node-' + Math.random().toString(36).substring(2, 9)),
          category: String(node[categoryKey] || 'default')
        };
      });

      // Process links
      const processedLinks: Link[] = linkData.map(link => {
        if (typeof link === 'object' && 'source' in link && 'target' in link) {
          return {
            source: typeof link.source === 'object' ? String(link.source.id) : String(link.source),
            target: typeof link.target === 'object' ? String(link.target.id) : String(link.target)
          };
        }

        const sourceKey = Object.keys(link).find(key => 
          key.toLowerCase() === 'source' || 
          key.toLowerCase() === 'from'
        ) || Object.keys(link)[0];

        const targetKey = Object.keys(link).find(key => 
          key.toLowerCase() === 'target' || 
          key.toLowerCase() === 'to'
        ) || (Object.keys(link).length > 1 ? Object.keys(link)[1] : null);

        if (!sourceKey || !targetKey) {
          console.error("Cannot identify source or target keys in link data:", link);
          return { source: "", target: "" };
        }

        return {
          source: String(link[sourceKey] || ''),
          target: String(link[targetKey] || '')
        };
      }).filter(link => link.source && link.target);

      // Find unique categories
      const categories = processedNodes.map(node => node.category);
      const uniqueCats = Array.from(new Set(categories)).filter(Boolean);
      setUniqueCategories(uniqueCats);

      // Generate dynamic color themes if needed
      if (uniqueCats.length > 0 && Object.keys(colors.dynamicColorThemes).length <= 1) {
        colors.generateDynamicColorThemes(uniqueCats);
      }

      // Calculate node counts by category
      const counts: CategoryCounts = { total: processedNodes.length };
      uniqueCats.forEach(category => {
        counts[category] = processedNodes.filter(node => node.category === category).length;
      });
      setNodeCounts(counts);
      setProcessedData({ nodes: processedNodes, links: processedLinks });
      
      setDataLoaded(true);
      
      setTimeout(() => {
        setIsLoading(false);
        toast({
          title: "Network Data Loaded",
          description: "Interactive groupable visualization is now ready",
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
  }, [nodeData, linkData, toast, colors, dataLoaded, processedData.nodes.length]);

  // Helper function to highlight node connections
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

  // Function to create a new group from selected nodes
  // Removed duplicate declaration of reinitializeVisualization

  const reinitializeVisualization = useCallback(() => {
    // If we should skip this reinitialization, reset the flag and return
    if (skipReinitializeRef.current) {
      skipReinitializeRef.current = false;
      return;
    }
    
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
      
      // Set a flag to trigger a center view on next render
      setShouldCenterView(true);
      
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
  }, [toast, setIsLoading, setVisualizationError, setShouldCenterView]);

  const createGroup = useCallback(() => {
    if (selectedNodes.length < 2) {
      toast({
        title: "Cannot create group",
        description: "Select at least 2 nodes to create a group",
        variant: "destructive"
      });
      return;
    }

    // Create a new group ID
    const groupId = `group-${nextGroupId}`;
    setNextGroupId(prev => prev + 1);

    // Calculate the centroid of the selected nodes for group position
    const sumX = selectedNodes.reduce((sum, node) => sum + (node.x || 0), 0);
    const sumY = selectedNodes.reduce((sum, node) => sum + (node.y || 0), 0);
    const centerX = sumX / selectedNodes.length;
    const centerY = sumY / selectedNodes.length;

    // Determine group category (use most common category)
    const categoryCounts: Record<string, number> = {};
    selectedNodes.forEach(node => {
      categoryCounts[node.category] = (categoryCounts[node.category] || 0) + 1;
    });
    
    let maxCount = 0;
    let groupCategory = selectedNodes[0].category;
    Object.entries(categoryCounts).forEach(([category, count]) => {
      if (count > maxCount) {
        maxCount = count;
        groupCategory = category;
      }
    });

    // Create new group
    const newGroup: NodeGroup = {
      id: groupId,
      nodes: [...selectedNodes],
      category: groupCategory,
      x: centerX,
      y: centerY
    };

    // Update the groups
    setGroupedNodes(prev => [...prev, newGroup]);

    // Update the processed data by removing the selected nodes and adding the group node
    setProcessedData(prev => {
      const selectedNodeIds = new Set(selectedNodes.map(node => node.id));
      
      // Create a new group node
      const groupNode: Node = {
        id: groupId,
        category: groupCategory,
      };

      // Keep all nodes except the ones now in the group
      const filteredNodes = prev.nodes.filter(node => !selectedNodeIds.has(node.id));
      
      // Process links to handle the new group
      const updatedLinks = prev.links.map(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        // If both source and target are in the group, remove this link (internal to the group)
        if (selectedNodeIds.has(sourceId) && selectedNodeIds.has(targetId)) {
          return null;
        }
        
        // If source is in the group, point to the group instead
        if (selectedNodeIds.has(sourceId)) {
          return { ...link, source: groupId };
        }
        
        // If target is in the group, point to the group instead
        if (selectedNodeIds.has(targetId)) {
          return { ...link, target: groupId };
        }
        
        // Otherwise, keep the link as is
        return link;
      }).filter(Boolean) as Link[];
      
      return {
        nodes: [...filteredNodes, groupNode],
        links: updatedLinks,
      };
    });

    // Clear selections
    setSelectedNodes([]);
    setListSelectedNodes({});

    toast({
      title: "Group Created",
      description: `Created group with ${selectedNodes.length} nodes`,
    });

    skipReinitializeRef.current = false;
    reinitializeVisualization();
  }, [selectedNodes, nextGroupId, toast, reinitializeVisualization]);

  // Function to ungroup a selected group
  const ungroup = useCallback((groupNode: Node) => {
    // Find the group by ID
    const group = groupedNodes.find(g => g.id === groupNode.id);
    if (!group) {
      toast({
        title: "Ungroup Failed",
        description: "Selected node is not a group",
        variant: "destructive"
      });
      return;
    }

    // Update the processed data by adding back original nodes and removing the group
    setProcessedData(prev => {
      // Get the position of the group node for positioning the ungrouped nodes
      const groupNodeInViz = prev.nodes.find(n => n.id === group.id);
      const groupX = groupNodeInViz?.x || 0;
      const groupY = groupNodeInViz?.y || 0;

      // Restore the original nodes with positions radiating from the group center
      const restoredNodes = group.nodes.map((node, index) => {
        const angle = (2 * Math.PI * index) / group.nodes.length;
        const radius = 40; // Distance from group center
        return {
          ...node,
          x: groupX + radius * Math.cos(angle),
          y: groupY + radius * Math.sin(angle),
          // Fix positions initially to prevent nodes from flying away
          fx: groupX + radius * Math.cos(angle),
          fy: groupY + radius * Math.sin(angle)
        };
      });

      // Remove the group node
      const filteredNodes = prev.nodes.filter(node => node.id !== group.id);
      
      // Process links to restore connections to the original nodes
      const originalNodeIdMap = new Map(group.nodes.map(node => [node.id, node]));
      
      const updatedLinks = prev.links.map(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        // If source is the group, find the right original node
        if (sourceId === group.id) {
          // For simplicity, connect to the first node in the group
          return { ...link, source: group.nodes[0].id };
        }
        
        // If target is the group, find the right original node
        if (targetId === group.id) {
          // For simplicity, connect to the first node in the group
          return { ...link, target: group.nodes[0].id };
        }
        
        // Otherwise, keep the link as is
        return link;
      });
      
      // Add back any internal links that were removed when grouping
      const internalLinks: Link[] = [];
      for (let i = 0; i < group.nodes.length; i++) {
        for (let j = i + 1; j < group.nodes.length; j++) {
          // Check if there was a link between these nodes in the original data
          const source = group.nodes[i].id;
          const target = group.nodes[j].id;
          internalLinks.push({ source, target });
        }
      }
      
      return {
        nodes: [...filteredNodes, ...restoredNodes],
        links: [...updatedLinks, ...internalLinks],
      };
    });

    // Remove the group from the grouped nodes list
    setGroupedNodes(prev => prev.filter(g => g.id !== group.id));

    toast({
      title: "Group Disbanded",
      description: `Ungrouped ${group.nodes.length} nodes`,
    });

    skipReinitializeRef.current = false;
    reinitializeVisualization();
  }, [groupedNodes, toast, reinitializeVisualization]);
  
  // Process node selection function
  const processNodeSelection = (d: Node, event: MouseEvent) => {
    if (selectionMode) {
      // In selection mode, add/remove the node from selection
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
        // Add to selection with modifier key
        setSelectedNodes(prev => {
          const isAlreadySelected = prev.some(node => node.id === d.id);
          if (isAlreadySelected) {
            return prev.filter(node => node.id !== d.id);
          } else {
            return [...prev, d];
          }
        });
        
        // Update the list selection state too
        setListSelectedNodes(prev => ({
          ...prev,
          [d.id]: !prev[d.id]
        }));
      } else {
        // Replace selection without modifier key
        setSelectedNodes([d]);
        
        // Reset list selection and select only this node
        const newSelection: {[id: string]: boolean} = {};
        processedData.nodes.forEach(node => {
          newSelection[node.id] = node.id === d.id;
        });
        setListSelectedNodes(newSelection);
      }
    } else {
      // Normal mode - select single node
      setSelectedNode(d);
      
      // Find connections for this node
      const { sourceLinks, targetLinks } = findNodeConnections(d, processedData.links);
      
      // Prepare connected nodes lists for the UI
      const toConnections = sourceLinks.map(link => {
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return targetId;
      });
      
      const fromConnections = targetLinks.map(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        return sourceId;
      });
      
      setSelectedNodeConnections({
        to: toConnections,
        from: fromConnections
      });
      
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
    }
  };

  // Check if a node is a group
  const isGroupNode = (node: Node) => {
    return groupedNodes.some(group => group.id === node.id);
  };

  // Reset node selection function
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

  // FIXED: Create drag behavior that properly separates dragging from panning
  const createDragBehavior = useCallback(() => {
    if (!simulationRef.current) {
      console.error("Cannot create drag behavior - simulation not initialized");
      return d3.drag<SVGCircleElement, SimulatedNode>();
    }
    
    const simulation = simulationRef.current;
    
    return d3.drag<SVGCircleElement, SimulatedNode>()
      .on("start", function(event, d) {
        // Critical: Immediately stop propagation to prevent zoom conflicts
        if (event.sourceEvent) event.sourceEvent.stopPropagation();
        
        dragStartedRef.current = true;
        
        // In selection mode, don't move nodes
        if (selectionMode) return;
        
        // Always store the initial position
        d.fx = d.x;
        d.fy = d.y;
        
        // Reheat simulation if not in static mode
        if (!staticMode && !event.active) {
          simulation.alphaTarget(0.3).restart();
        }
        
        // Make the dragged node appear on top
        d3.select(this).raise();
      })
      .on("drag", function(event, d) {
        // Critical: Prevent event from propagating to avoid panning conflicts
        if (event.sourceEvent) event.sourceEvent.stopPropagation();
        
        // In selection mode, don't move nodes
        if (selectionMode) return;
        
        // FIXED: Use the event directly for positioning - simpler and more reliable
        d.fx = event.x;
        d.fy = event.y;
        
        // Update the x and y positions too so they match
        d.x = d.fx;
        d.y = d.fy;
        
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
        // Critical: Prevent event from propagating
        if (event.sourceEvent) event.sourceEvent.stopPropagation();
        
        dragStartedRef.current = false;
        
        // In selection mode, don't move nodes
        if (selectionMode) return;
        
        // Cool down simulation
        if (!event.active) {
          simulation.alphaTarget(0);
        }
        
        // FIXED: Simplified condition to match other visualizations
        if (!staticMode && !localFixNodesOnDrag) {
          d.fx = null;
          d.fy = null;
          
          // Apply alpha boost to allow nodes to reposition
          simulation.alpha(0.3).restart();
        }
      });
  }, [selectionMode, staticMode, localFixNodesOnDrag]);

  // FIXED: Improved selection rectangle handling with better zoom coordination
  const handleSelectionStart = useCallback((event: d3.D3DragEvent<SVGSVGElement, unknown, unknown>) => {
    if (!selectionMode) return;
    
    // Get the current transform
    const transform = getTransform();
    
    // Get mouse position in SVG coordinates
    const [x, y] = d3.pointer(event, svgRef.current);
    
    // Transform to the original coordinate space
    const point = transform.invert([x, y]);
    
    setSelectionRect({
      startX: point[0],
      startY: point[1],
      width: 0,
      height: 0,
      visible: true
    });
    
    // Make selection rectangle visible
    if (selectionRectRef.current) {
      d3.select(selectionRectRef.current)
        .style("display", "block");
    }
  }, [selectionMode, getTransform]);

  const handleSelectionMove = useCallback((event: d3.D3DragEvent<SVGSVGElement, unknown, unknown>) => {
    if (!selectionMode || !selectionRect.visible) return;
    
    // Get the current transform
    const transform = getTransform();
    
    // Get current mouse position
    const [x, y] = d3.pointer(event, svgRef.current);
    
    // Transform to the original coordinate space
    const point = transform.invert([x, y]);
    
    const { startX, startY } = selectionRect;
    
    // Calculate rectangle dimensions
    const width = Math.abs(point[0] - startX);
    const height = Math.abs(point[1] - startY);
    const rectX = Math.min(startX, point[0]);
    const rectY = Math.min(startY, point[1]);
    
    // Update selection rectangle state
    setSelectionRect(prev => ({
      ...prev,
      width,
      height
    }));
    
    // Update the visual rectangle
    if (selectionRectRef.current) {
      d3.select(selectionRectRef.current)
        .attr("x", rectX)
        .attr("y", rectY)
        .attr("width", width)
        .attr("height", height);
    }
  }, [selectionMode, selectionRect, getTransform]);

  const handleSelectionEnd = useCallback((event: d3.D3DragEvent<SVGSVGElement, unknown, unknown>) => {
    if (!selectionMode || !selectionRect.visible) return;
    
    // Hide the selection rectangle
    if (selectionRectRef.current) {
      d3.select(selectionRectRef.current)
        .style("display", "none");
    }
    
    // Get selection rectangle bounds
    const { startX, startY, width, height } = selectionRect;
    const x = Math.min(startX, startX + width);
    const y = Math.min(startY, startY + height);
    const x2 = x + width;
    const y2 = y + height;
    
    // Reset selection rect visibility
    setSelectionRect(prev => ({
      ...prev,
      visible: false
    }));
    
    // Find all nodes inside the selection rectangle
    if (svgRef.current) {
      const selectedNodesArray: Node[] = [];
      const newListSelection = { ...listSelectedNodes };
      
      d3.select(svgRef.current)
        .selectAll<SVGCircleElement, Node>(".node")
        .each(function(d) {
          if (d.x === undefined || d.y === undefined) return;
          
          // Check if node is inside the selection rectangle
          if (d.x >= x && d.x <= x2 && d.y >= y && d.y <= y2) {
            selectedNodesArray.push(d);
            
            // Update the list selection too
            if (event.sourceEvent.shiftKey || event.sourceEvent.ctrlKey || event.sourceEvent.metaKey) {
              // Toggle selection state with modifier key
              newListSelection[d.id] = !newListSelection[d.id];
            } else {
              // Set to selected with no modifier
              newListSelection[d.id] = true;
            }
          } else if (!(event.sourceEvent.shiftKey || event.sourceEvent.ctrlKey || event.sourceEvent.metaKey)) {
            // Deselect nodes outside rectangle if no modifier key
            newListSelection[d.id] = false;
          }
        });
      
      // Update the list selection state
      setListSelectedNodes(newListSelection);
      
      // Update selected nodes
      if (event.sourceEvent.shiftKey || event.sourceEvent.ctrlKey || event.sourceEvent.metaKey) {
        // Add to selection with modifier key
        setSelectedNodes(prev => {
          const newSelection = [...prev];
          selectedNodesArray.forEach(node => {
            if (!prev.some(n => n.id === node.id)) {
              newSelection.push(node);
            } else {
              // Remove if already selected (toggle behavior)
              const index = newSelection.findIndex(n => n.id === node.id);
              if (index !== -1) {
                newSelection.splice(index, 1);
              }
            }
          });
          return newSelection;
        });
      } else {
        // Replace selection without modifier key
        setSelectedNodes(selectedNodesArray);
      }
    }
  }, [selectionMode, selectionRect, listSelectedNodes]);

  // FIXED: Initialize selection rect and selection drag behavior with better zoom handling
  useEffect(() => {
    if (!svgRef.current || isLoading) return;
    
    // Create selection rectangle if it doesn't exist
    const svg = d3.select(svgRef.current);
    
    if (svg.select(".selection-rect").empty()) {
      selectionRectRef.current = svg.append("rect")
        .attr("class", "selection-rect")
        .style("fill", "rgba(99, 102, 241, 0.15)")
        .style("stroke", "rgb(99, 102, 241)")
        .style("stroke-width", 1)
        .style("display", "none")
        .attr("rx", 2)
        .attr("ry", 2)
        .style("pointer-events", "none")
        .node();
    }
    
    // FIXED: Setup selection drag behavior
    // Create a separate transparent overlay for selection to avoid conflicts with zoom
    let overlay = svg.select(".selection-overlay");
    if (overlay.empty() && selectionMode) {
      overlay = svg.append("rect")
        .attr("class", "selection-overlay")
        .attr("width", "100%")
        .attr("height", "100%")
        .style("fill", "transparent")
        .style("pointer-events", selectionMode ? "all" : "none");
    } else if (!selectionMode) {
      svg.select(".selection-overlay").remove();
      return;
    }
    
    // Apply drag behavior only to the overlay
    const selectionDrag = d3.drag<SVGRectElement, unknown>()
      .filter(event => {
        return selectionMode && event.button === 0 && !dragStartedRef.current;
      })
      .on("start", handleSelectionStart)
      .on("drag", handleSelectionMove)
      .on("end", handleSelectionEnd);
    
    overlay.call(selectionDrag);
    
    // Update overlay visibility based on selection mode
    overlay.style("pointer-events", selectionMode ? "all" : "none");
    
    // Ensure static mode when in selection mode
    if (selectionMode && simulationRef.current) {
      simulationRef.current.stop();
    }
    
    return () => {
      if (!selectionMode) {
        svg.select(".selection-overlay").remove();
      }
    };
  }, [selectionMode, isLoading, handleSelectionStart, handleSelectionMove, handleSelectionEnd]);

  // Force reinitialize zoom after visualization is ready
  useEffect(() => {
    if (!isLoading && svgRef.current && contentRef.current) {
      // Short delay to ensure D3 visualization is fully rendered
      const timer = setTimeout(() => {
        reinitializeZoom();
        
        // After zoom is initialized, center the view if needed
        if (shouldCenterView) {
          setTimeout(() => {
            zoomToFit(500); // Smooth transition to fit the graph
            setShouldCenterView(false);
          }, 300);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, reinitializeZoom, zoomToFit, shouldCenterView]);

  // Update visualization when nodes are selected
  useEffect(() => {
    if (!svgRef.current || isLoading) return;
    
    const svg = d3.select(svgRef.current);
    
    // Skip reinitialization when updating node selection
    skipReinitializeRef.current = true;
    
    // Highlight selected nodes
    svg.selectAll<SVGCircleElement, Node>(".node")
      .classed("selected", (d: Node) => selectedNodes.some(n => n.id === d.id))
      .attr("stroke-width", (d: Node) => selectedNodes.some(n => n.id === d.id) ? 3 : 1.5)
      .attr("stroke", (d: Node) => selectedNodes.some(n => n.id === d.id) ? "#3b82f6" : colors.nodeStrokeColor);
      
  }, [selectedNodes, isLoading, colors.nodeStrokeColor]);

  // Create D3 visualization with improved initial layout and event handling
  useEffect(() => {
    // Make sure all refs are ready
    if (isLoading || !svgRef.current || processedData.nodes.length === 0) {
      return;
    }

    // Check if container is ready
    if (!containerRef.current) {
      const timer = setTimeout(() => {
        if (containerRef.current) {
          setIsLoading(prev => !prev);
          setTimeout(() => setIsLoading(prev => !prev), 10);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  
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
      
      // Position nodes in a deterministic layout
      const radius = Math.min(width, height) * 0.4; // Use a large radius for initial layout
      const spiralSpread = 10; // Adjust spread of the spiral
      
      filteredNodes.forEach((node, i) => {
        // Skip nodes that already have positions
        if (node.x !== undefined && node.y !== undefined) return;
        
        // Use a spiral layout for more evenly distributed nodes
        const angle = 0.5 * i;
        const spiralRadius = spiralSpread * Math.sqrt(i);
        
        // Set both x,y and fx,fy to the same position
        node.x = width / 2 + spiralRadius * Math.cos(angle);
        node.y = height / 2 + spiralRadius * Math.sin(angle);
        
        // In static mode, also fix the positions
        if (staticMode) {
          node.fx = node.x;
          node.fy = node.y;
        }
      });
      
      // Create simulation
      const simulation = d3.forceSimulation<Node>(filteredNodes)
        .force("link", d3.forceLink<Node, Link>(filteredLinks)
          .id(d => d.id)
          .distance(50) // Shorter distance for tighter clustering
          .strength(0.5)) // Weaker strength for less dramatic movements
        .force("charge", d3.forceManyBody()
          .strength(-300)) // Standard charge
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(d => 10 * colors.nodeSize));
      
      // Store simulation in ref
      simulationRef.current = simulation;
      
      // If in static mode, immediately stop the simulation after creating it
      if (staticMode) {
        // Just run a few ticks to get a reasonable layout, then stop
        simulation.tick(30); // Run 30 ticks to stabilize
        simulation.stop(); // Then stop completely
        
        // Fix all nodes in place
        filteredNodes.forEach(node => {
          if (node.x !== undefined && node.y !== undefined) {
            node.fx = node.x;
            node.fy = node.y;
          }
        });
      }

      // Create links
      const link = g.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(filteredLinks)
        .enter()
        .append("line")
        .attr("class", "link")
        .attr("stroke", colors.linkColor)
        .attr("stroke-width", 1.5);

      // Create selection rectangle as child of svg (not g for proper coords)
      selectionRectRef.current = d3.select(svgRef.current)
        .append("rect")
        .attr("class", "selection-rect")
        .style("fill", "rgba(99, 102, 241, 0.15)")
        .style("stroke", "rgb(99, 102, 241)")
        .style("stroke-width", 1)
        .style("display", "none")
        .attr("rx", 2)
        .attr("ry", 2)
        .style("pointer-events", "none")
        .node();
      
      // Create nodes with proper color handling
      const nodesContainer = g.append("g")
        .attr("class", "nodes");
      
      const node = nodesContainer.selectAll("circle")
        .data(filteredNodes)
        .enter()
        .append("circle")
        .attr("class", d => `node ${isGroupNode(d) ? 'group-node' : ''}`)
        .attr("r", d => {
          // Make group nodes larger
          return isGroupNode(d) ? 10 * colors.nodeSize : 7 * colors.nodeSize;
        })
        .attr("fill", d => colors.getNodeColor(d))
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
      
      try {
        node.call(dragBehavior as d3.DragBehavior<SVGCircleElement, unknown, Node>);
      } catch (error) {
        console.error("Error initializing drag behavior:", error);
      }
      
      // Event handlers for nodes
      node
        .on("mouseover", function(event, d) {
          // Show the simple tooltip on hover with "Click for more details"
          if (!selectionMode) {
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
          }
        })
        .on("mousemove", function(event) {
          // Only move the tooltip if it's not in persistent mode and not in selection mode
          if (!selectionMode) {
            moveTooltip(event, tooltipRef, svgRef, 'hover');
          }
        })
        .on("mouseout", function() {
          // Only hide the tooltip if it's not in persistent mode and not in selection mode
          if (!selectionMode) {
            hideTooltip(tooltipRef, 'hover', selectedNode?.id);
          }
        })
        .on("click", function(event, d) {
          event.stopPropagation();
          
          // Set flag to prevent reinitialization
          skipReinitializeRef.current = true;
          
          // Process node selection including selection mode handling
          processNodeSelection(d, event);
          
          // Always show detailed tooltip on click that stays visible (unless in selection mode)
          if (!selectionMode) {
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
          }
        });
      
      // FIXED: Click handling for background clicks to deselect
      // This needs to be on the container, not the SVG itself to avoid conflicts with zoom
      d3.select(containerRef.current).on("click", (event) => {
        // Ignore if coming from a node click
        if (event.target.classList.contains('node')) return;
        
        // Set flag to prevent reinitialization
        skipReinitializeRef.current = true;
        
        // Only reset selection if we're not in selection mode or if no modifier key is pressed
        if (!selectionMode || !(event.shiftKey || event.ctrlKey || event.metaKey)) {
          setSelectedNodes([]);
          
          // Also clear list selection
          const newSelection: {[id: string]: boolean} = {};
          processedData.nodes.forEach(node => {
            newSelection[node.id] = false;
          });
          setListSelectedNodes(newSelection);
        }
        resetNodeSelection();
      });
      
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
      
      // Mark visualization as initialized
      visualizationInitialized.current = true;
      
      // Force update positions once to ensure everything is in place
      simulation.tick(10);
      
      // Explicitly update element positions in the DOM
      node
        .attr("cx", d => d.x !== undefined ? d.x : 0)
        .attr("cy", d => d.y !== undefined ? d.y : 0);
      
      nodeLabel
        .attr("x", d => d.x !== undefined ? d.x : 0)
        .attr("y", d => d.y !== undefined ? d.y : 0);
      
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
      
// Initialize zoom using reinitializeZoom which returns the zoom behavior
const zoomBehavior = reinitializeZoom();
if (zoomBehavior && svgRef.current) {
  d3.select(svgRef.current).call(zoomBehavior);
}
      
      // Add an explicit center view call with delay to ensure everything is rendered
      setTimeout(() => {
        zoomToFit(500);
      }, 500);

      // Set initial tooltip settings as DOM attributes
      if (containerRef.current) {
        containerRef.current.setAttribute('data-tooltip-detail', tooltipDetail);
        containerRef.current.setAttribute('data-tooltip-trigger', tooltipTrigger);
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
  }, [isLoading, nodeGroup, processedData, createDragBehavior, linkDistance, linkStrength, nodeCharge, toast, reinitializeZoom, tooltipDetail, tooltipTrigger, colors, selectionMode, isGroupNode, zoomToFit, staticMode, selectedNode?.id, processNodeSelection]);

  // Apply nodes from list to selection
  const applySelectedNodes = () => {
    const selectedNodeIDs = Object.entries(listSelectedNodes)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);
    
    const nodesToSelect = processedData.nodes.filter(node => 
      selectedNodeIDs.includes(node.id)
    );
    
    setSelectedNodes(nodesToSelect);
    
    toast({
      title: "Selection Applied",
      description: `Selected ${nodesToSelect.length} nodes from list`
    });
  };

  // Toggle all nodes in a category
  const toggleCategoryNodes = (category: string) => {
    const nodesByCategory = processedData.nodes.filter(node => node.category === category);
    
    // Check if all nodes in this category are already selected
    const allSelected = nodesByCategory.every(node => listSelectedNodes[node.id]);
    
    // Toggle all nodes in this category
    const newSelection = { ...listSelectedNodes };
    nodesByCategory.forEach(node => {
      newSelection[node.id] = !allSelected;
    });
    
    setListSelectedNodes(newSelection);
  };

  // Toggle static mode - completely freezes node movement
  const toggleStaticMode = () => {
    setStaticMode(prev => !prev);
    
    toast({
      title: staticMode ? "Dynamic Mode Enabled" : "Static Mode Enabled",
      description: staticMode 
        ? "Nodes can now move based on forces (if not fixed)" 
        : "All nodes are fixed in place for easier selection"
    });
  };

  // Function to toggle selection mode
  const toggleSelectionMode = () => {
    // Toggle selection mode
    setSelectionMode(prev => !prev);
    
    // Clear any selected nodes when exiting selection mode
    if (selectionMode) {
      setSelectedNodes([]);
      
      // Clear list selection too
      const newSelection: {[id: string]: boolean} = {};
      processedData.nodes.forEach(node => {
        newSelection[node.id] = false;
      });
      setListSelectedNodes(newSelection);
    }
    
    // Set flag to prevent reinitialization
    skipReinitializeRef.current = true;
    
    // Notify the user
    toast({
      title: selectionMode ? "Selection Mode Disabled" : "Selection Mode Enabled",
      description: selectionMode 
        ? "Returned to normal node interaction mode" 
        : "Click or drag to select nodes for grouping"
    });
  };

  // Function to toggle node selection panel
  const toggleSelectionPanel = () => {
    setShowSelectionPanel(!showSelectionPanel);
  };



  // Modified tooltip handlers
  const handleTooltipDetailChange = (detail: TooltipDetail) => {
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
          null
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

  // Updated handler for exporting node data
  const handleExportNodeData = (format: 'text' | 'json') => {
    if (!selectedNode) return;
    
    try {
      if (format === 'text') {
        downloadNodeAsText(selectedNode, processedData.links);
      } else {
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

  // Handle visualization type change
  const handleVisualizationTypeChange = (type: VisualizationType) => {
    // Skip if type is the same
    if (type === 'groupable') return;
    
    // Call the parent handler if provided
    if (onVisualizationTypeChange) {
      onVisualizationTypeChange(type);
    }
    
    toast({
      title: `Switched to ${type} visualization`,
      description: `Now viewing the network as a ${type} graph.`
    });
  };

  // Handle reset selection (refreshes visualization)
  const handleResetSelection = () => {
    setNodeGroup('all');
    setSelectedNode(null);
    setSelectedNodes([]);
    setListSelectedNodes({});
    resetNodeSelection();
    reinitializeVisualization();
  };

  // Auto-enable static mode when in selection mode
  useEffect(() => {
    if (selectionMode && !staticMode) {
      setStaticMode(true);
      
      if (simulationRef.current) {
        simulationRef.current.stop();
        
        // Fix all nodes in place 
        if (svgRef.current) {
          d3.select(svgRef.current)
            .selectAll<SVGCircleElement, SimulatedNode>(".node")
            .each(function(d) {
              // Fixed position to current position
              if (d.x !== undefined && d.y !== undefined) {
                d.fx = d.x;
                d.fy = d.y;
              }
            });
        }
      }
    }
  }, [selectionMode, staticMode]);

  // Get filtered nodes for node list
  const getFilteredNodes = () => {
    if (!processedData.nodes.length) return [];
    
    return processedData.nodes
      .filter(node => 
        (filterCategory === 'all' || node.category === filterCategory) &&
        (searchTerm.trim() === '' || node.id.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => a.id.localeCompare(b.id));
  };

  // Get nodes grouped by category for list
  const getNodesByCategory = () => {
    const result: {[category: string]: Node[]} = {};
    
    uniqueCategories.forEach(category => {
      result[category] = processedData.nodes
        .filter(node => node.category === category)
        .filter(node => searchTerm.trim() === '' || node.id.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.id.localeCompare(b.id));
    });
    
    return result;
  };

  // Check for empty data
  if (nodeData.length === 0 || linkData.length === 0) {
    return <EmptyData />;
  }

  // If still loading, show a loading indicator
  if (isLoading) {
    return <LoadingIndicator message="Preparing groupable network visualization..." />;
  }

  return (
    <div 
      className="flex flex-row w-full h-full"
      style={{ touchAction: "none" }} // Important to prevent zoom/pan conflicts with touch events
    >
      {/* Node Selection Panel */}
      {showSelectionPanel && (
        <div className="w-80 bg-gray-800 text-white h-full overflow-y-auto shadow-lg flex flex-col">
          <div className="flex justify-between items-center p-5 pb-2">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-100">Node Selection</h1>
            </div>
            <button
              className="p-1.5 rounded-md hover:bg-gray-700"
              onClick={toggleSelectionPanel}
              title="Hide selection panel"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          
          <div className="px-5 mb-3">
            <button className="bg-gray-700 w-full p-2.5 rounded-md flex justify-between items-center cursor-pointer mb-1">
              <h2 className="text-base font-medium text-blue-400 m-0">Search &amp; Filter</h2>
              <ChevronDown className="w-4 h-4 text-white" />
            </button>
            <div className="mb-4 bg-gray-700 p-3 rounded-md">
              <div className="mb-2">
                <Input 
                  placeholder="Search nodes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 rounded-md border border-gray-600 bg-gray-700 text-white text-sm"
                />
              </div>
              
              <div className="mb-3">
                <Select
                  value={filterCategory}
                  onValueChange={setFilterCategory}
                >
                  <SelectTrigger className="w-full p-2 rounded-md border border-gray-600 bg-gray-700 text-white text-sm">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-gray-600 text-gray-200 hover:bg-gray-500 text-xs"
                  onClick={() => {
                    // Clear all selections
                    const newSelection: {[id: string]: boolean} = {};
                    processedData.nodes.forEach(node => {
                      newSelection[node.id] = false;
                    });
                    setListSelectedNodes(newSelection);
                  }}
                >
                  Clear All
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-gray-600 text-gray-200 hover:bg-gray-500 text-xs"
                  onClick={applySelectedNodes}
                >
                  Apply Selection
                </Button>
              </div>
            </div>
          </div>
          
          <div className="px-5 mb-3">
            <button className="bg-gray-700 w-full p-2.5 rounded-md flex justify-between items-center cursor-pointer mb-1">
              <h2 className="text-base font-medium text-blue-400 m-0">Selected Nodes</h2>
              <ChevronDown className="w-4 h-4 text-white" />
            </button>
            <div className="mb-4 bg-gray-700 p-3 rounded-md">
              <ScrollArea className="max-h-60">
                {filterCategory === 'all' ? (
                  // Display nodes grouped by category
                  Object.entries(getNodesByCategory()).map(([category, nodes]) => (
                    nodes.length > 0 && (
                      <div key={category} className="mb-2">
                        <div 
                          className="font-medium text-blue-400 text-sm mb-1 cursor-pointer flex items-center"
                          onClick={() => toggleCategoryNodes(category)}
                        >
                          <span className="mr-2">
                            {nodes.every(node => listSelectedNodes[node.id]) ? (
                              <CheckSquare className="w-3 h-3" />
                            ) : nodes.some(node => listSelectedNodes[node.id]) ? (
                              <div className="w-3 h-3 bg-indigo-500 opacity-50 rounded-sm"></div>
                            ) : (
                              <Square className="w-3 h-3" />
                            )}
                          </span>
                          {category} ({nodes.length})
                        </div>
                        <div className="pl-5">
                          {nodes.map(node => (
                            <div 
                              key={node.id} 
                              className="flex items-center text-xs py-1 cursor-pointer"
                              onClick={() => {
                                setListSelectedNodes(prev => ({
                                  ...prev,
                                  [node.id]: !prev[node.id]
                                }));
                              }}
                            >
                              <span className="mr-2">
                                {listSelectedNodes[node.id] ? (
                                  <CheckSquare className="w-3 h-3" />
                                ) : (
                                  <Square className="w-3 h-3" />
                                )}
                              </span>
                              <div 
                                className="w-2 h-2 rounded-full mr-1"
                                style={{
                                  backgroundColor: colors.getNodeColor(node)
                                }}
                              ></div>
                              <span className="truncate">{node.id}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))
                ) : (
                  // Display flat list of filtered nodes
                  <div>
                    {getFilteredNodes().map(node => (
                      <div 
                        key={node.id} 
                        className="flex items-center text-xs py-1 cursor-pointer"
                        onClick={() => {
                          setListSelectedNodes(prev => ({
                            ...prev,
                            [node.id]: !prev[node.id]
                          }));
                        }}
                      >
                        <span className="mr-2">
                          {listSelectedNodes[node.id] ? (
                            <CheckSquare className="w-3 h-3" />
                          ) : (
                            <Square className="w-3 h-3" />
                          )}
                        </span>
                        <div 
                          className="w-2 h-2 rounded-full mr-1"
                          style={{
                            backgroundColor: colors.getNodeColor(node)
                          }}
                        ></div>
                        <span className="truncate">{node.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
          
          <div className="px-5 mb-3">
            <Button
              className="flex items-center px-3 py-2 rounded-md bg-blue-600 text-white w-full"
              onClick={createGroup}
              disabled={selectedNodes.length < 2}
            >
              <LucideGroup className="w-4 h-4 mr-2" />
              Group Selected Nodes {selectedNodes.length > 0 ? `(${selectedNodes.length})` : ''}
            </Button>
          </div>
        </div>
      )}

      {/* Main visualization container */}
      <div 
        ref={containerRef} 
        className="flex-1 relative" 
        id="groupable-network-container" 
        data-fix-nodes={localFixNodesOnDrag ? 'true' : 'false'}
        style={{
          backgroundColor: `rgba(${colors.rgbBackgroundColor.r}, ${colors.rgbBackgroundColor.g}, ${colors.rgbBackgroundColor.b}, ${colors.backgroundOpacity})`,
          overflowX: "hidden", // Prevent horizontal scrolling
          height: "100%"       // Ensure height fills parent
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
        
        {/* Control Buttons */}
        <div className="absolute top-16 left-4 z-10 flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className={`flex items-center gap-2 ${staticMode ? 'bg-green-600 text-white' : 'bg-gray-700/90 hover:bg-gray-600'}`}
            onClick={toggleStaticMode}
          >
            {staticMode ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            {staticMode ? 'Nodes Fixed' : 'Nodes Free'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className={`flex items-center gap-2 ${selectionMode ? 'bg-indigo-600 text-white' : 'bg-gray-700/90 hover:bg-gray-600'}`}
            onClick={toggleSelectionMode}
          >
            <Users className="w-4 h-4" />
            {selectionMode ? 'Exit Selection' : 'Select Nodes'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className={`flex items-center gap-2 ${showSelectionPanel ? 'bg-indigo-600 text-white' : 'bg-gray-700/90 hover:bg-gray-600'}`}
            onClick={toggleSelectionPanel}
          >
            <List className="w-4 h-4" />
            {showSelectionPanel ? 'Hide Node List' : 'Show Node List'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 bg-gray-700/90 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={createGroup}
            disabled={selectedNodes.length < 2}
          >
            <LucideGroup className="w-4 h-4" />
            Group ({selectedNodes.length})
          </Button>
          
          {selectedNode && isGroupNode(selectedNode) && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-gray-700/90 hover:bg-gray-600"
              onClick={() => ungroup(selectedNode)}
            >
              <Layers className="w-4 h-4" />
              Ungroup
            </Button>
          )}
        </div>
        
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

        {/* Selection Mode Helper */}
        {selectionMode && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-indigo-600/90 text-white px-4 py-2 rounded-lg text-sm">
            <p className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Selection mode: Click nodes or drag to select multiple. Hold Shift to add to selection.
            </p>
          </div>
        )}
        
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
            <div className="mt-3 flex justify-end">
              <button
                className="px-3 py-1.5 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
                onClick={reinitializeVisualization}
              >
                Reset Visualization
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupableNetworkVisualization;