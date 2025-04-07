/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Node, Link, VisualizationType } from '@/types/networkTypes';
import { useToast } from "@/components/ui/use-toast";
import BaseVisualization from './BaseVisualization';
import FileButtons from './FileButtons';
import { NetworkLegend } from './NetworkComponents';
import useNetworkColors from '@/hooks/useNetworkColors';
import { TooltipDetail, TooltipTrigger } from './TooltipSettings';
import { setupClickAwayListener } from './TooltipUtils';
import NetworkTooltip from './NetworkTooltip';
import { Eye, EyeOff } from 'lucide-react';
import { NodeData } from '@/types/types';

interface ChordVisualizationProps {
  onCreditsClick: () => void;
  nodeData: Node[];
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
  tooltipDetail?: TooltipDetail;
  tooltipTrigger?: TooltipTrigger;
  onTooltipDetailChange?: (detail: TooltipDetail) => void;
  onTooltipTriggerChange?: (trigger: TooltipTrigger) => void;
}

interface DetailedNode {
  id: string;
  category: string;
  categoryIndex: number;
  nodeIndex: number;
  connections: number;
}

const ChordVisualization: React.FC<ChordVisualizationProps> = ({
  onCreditsClick,
  nodeData,
  linkData,
  visualizationType = 'chord',
  onVisualizationTypeChange,
  colorTheme = 'default',
  nodeSize = 1.0,
  linkColor = '#999999',
  backgroundColor = '#f5f5f5',
  backgroundOpacity = 1.0,
  customNodeColors = {},
  dynamicColorThemes = {},
  tooltipDetail = 'simple',
  tooltipTrigger = 'hover',
  onTooltipDetailChange,
  onTooltipTriggerChange
}) => {
  const { toast } = useToast();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [visualizationError, setVisualizationError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedNodeConnections, setSelectedNodeConnections] = useState<{ to: string[]; from: string[] }>({ to: [], from: [] });
  const [expandedSections, setExpandedSections] = useState({
    networkControls: true,
    nodeControls: true,
    colorControls: false,
    networkInfo: false,
    visualizationType: true,
    tooltipSettings: true
  });
  const [forceUpdate, setForceUpdate] = useState(false);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [categoryNodeCounts, setCategoryNodeCounts] = useState<Record<string, number>>({});
  const [categoryMatrix, setCategoryMatrix] = useState<number[][]>([]);
  const [nodeCounts, setNodeCounts] = useState<{ total: number }>({ total: 0 });
  const [evenDistribution, setEvenDistribution] = useState(false); // Distribution toggle
  const [showDetailedView, setShowDetailedView] = useState(false); // Toggle for detailed view
  const [detailedNodeData, setDetailedNodeData] = useState<DetailedNode[]>([]);
  const [detailedMatrix, setDetailedMatrix] = useState<number[][]>([]);
  const [nodesByCategory, setNodesByCategory] = useState<Record<string, Node[]>>({});

  // Use the color hooks
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

  // Set up click away listener for tooltips
  useEffect(() => {
    const cleanup = setupClickAwayListener(tooltipRef, tooltipTrigger);
    return cleanup;
  }, [tooltipTrigger]);

  // Extract unique categories and map nodes to categories
  useEffect(() => {
    if (nodeData.length > 0) {
      const categories = Array.from(new Set(nodeData.map(node => node.category)));
      setUniqueCategories(categories);

      // Count nodes in each category
      const counts: Record<string, number> = {};
      const nodesByCat: Record<string, Node[]> = {};
      
      categories.forEach(category => {
        const nodesInCategory = nodeData.filter(node => node.category === category);
        counts[category] = nodesInCategory.length;
        nodesByCat[category] = nodesInCategory;
      });
      
      setCategoryNodeCounts(counts);
      setNodesByCategory(nodesByCat);
      setNodeCounts({ total: nodeData.length });

      // Generate color themes if needed
      if (Object.keys(colors.dynamicColorThemes.default).length === 0) {
        colors.generateDynamicColorThemes(categories);
      }
    }
  }, [nodeData, colors]);

  // Create the connectivity matrix for chord diagram
  useEffect(() => {
    if (uniqueCategories.length === 0 || linkData.length === 0) return;

    try {
      // Create a matrix of connections between categories
      const matrix: number[][] = Array(uniqueCategories.length).fill(0).map(() => 
        Array(uniqueCategories.length).fill(0)
      );

      // Map for fast category lookups
      const categoryMap = new Map<string, { category: string, id: string }>();
      nodeData.forEach(node => {
        categoryMap.set(node.id, { category: node.category, id: node.id });
      });

      // Fill the matrix with connection counts
      linkData.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        const sourceNode = categoryMap.get(sourceId);
        const targetNode = categoryMap.get(targetId);
        
        if (sourceNode && targetNode) {
          const sourceIndex = uniqueCategories.indexOf(sourceNode.category);
          const targetIndex = uniqueCategories.indexOf(targetNode.category);
          
          if (sourceIndex !== -1 && targetIndex !== -1) {
            // Increment connection count from source category to target category
            matrix[sourceIndex][targetIndex] += 1;
          }
        }
      });

      setCategoryMatrix(matrix);
      
      // Process detailed node data for the detailed view
      const detailedNodes: DetailedNode[] = [];
      let nodeCounter = 0;
      
      // Create a sorted array of categories and nodes
      uniqueCategories.forEach((category, categoryIndex) => {
        const nodesInCategory = nodeData.filter(node => node.category === category);
        
        // Sort nodes by connection count
        const nodesWithConnectionCounts = nodesInCategory.map(node => {
          const connections = linkData.filter(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return sourceId === node.id || targetId === node.id;
          }).length;
          
          return {
            node,
            connections
          };
        });
        
        // Sort by connection count descending
        nodesWithConnectionCounts.sort((a, b) => b.connections - a.connections);
        
        // Add nodes to detailed nodes array
        nodesWithConnectionCounts.forEach(({ node, connections }, nodeIndex) => {
          detailedNodes.push({
            id: node.id,
            category: category,
            categoryIndex: categoryIndex,
            nodeIndex: nodeCounter++,
            connections
          });
        });
      });
      
      setDetailedNodeData(detailedNodes);
      
      // Create a detailed connection matrix for node-to-node relationships
      const nodeMatrix: number[][] = Array(detailedNodes.length).fill(0).map(() => 
        Array(detailedNodes.length).fill(0)
      );
      
      // Fast node lookup by id
      const nodeMap = new Map<string, number>();
      detailedNodes.forEach((node, index) => {
        nodeMap.set(node.id, index);
      });
      
      // Fill the detailed matrix with connections
      linkData.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        const sourceIndex = nodeMap.get(sourceId);
        const targetIndex = nodeMap.get(targetId);
        
        if (sourceIndex !== undefined && targetIndex !== undefined) {
          nodeMatrix[sourceIndex][targetIndex] += 1;
        }
      });
      
      setDetailedMatrix(nodeMatrix);
      setIsLoading(false);
    } catch (error) {
      console.error("Error creating chord matrix:", error);
      setVisualizationError("Failed to create chord diagram matrix");
      setIsLoading(false);
    }
  }, [uniqueCategories, nodeData, linkData]);

  // Helper function to get category color
  const getCategoryColor = (category: string) => {
    return colors.getNodeColor({ id: "", category });
  };

  // Helper function to get node color
  const getNodeColor = (node: { id: string, category: string }) => {
    // First check for custom node color
    if (customNodeColors && customNodeColors[node.id]) {
      return customNodeColors[node.id];
    }
    
    // Otherwise use category color
    return colors.getNodeColor(node);
  };

  // Render the chord diagram
  useEffect(() => {
    if (isLoading || !svgRef.current || !containerRef.current || uniqueCategories.length === 0 || categoryMatrix.length === 0) {
      return;
    }

    try {
      // Clear previous visualization
      d3.select(svgRef.current).selectAll("*").remove();

      const svg = d3.select(svgRef.current);
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const outerRadius = Math.min(width, height) * 0.5 - 60;
      const innerRadius = outerRadius - 20;

      // Adjust matrix for even distribution if needed
      let matrixToUse = categoryMatrix;
      
      if (evenDistribution && !showDetailedView) {
        // For category view with even distribution
        matrixToUse = categoryMatrix.map(row => {
          // For proportional connections, normalize within the row to keep relative values
          const rowSum = row.reduce((a, b) => a + b, 0);
          if (rowSum === 0) return row; // No change if no connections
          
          // Calculate a base value for distribution
          return row.map(val => val === 0 ? 0 : Math.max(1, val / rowSum * 10));
        });
      }
      
      // Use either category-level or detailed node-level data
      const activeMatrix = showDetailedView ? detailedMatrix : matrixToUse;
      
      // Create the chord layout
      const chord = d3.chord()
        .padAngle(0.05)
        .sortSubgroups(d3.descending);

      const chords = chord(activeMatrix);

      // Create the arc generator
      const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

      // Create the ribbon generator
      const ribbon = d3.ribbon()
        .radius(innerRadius);

      // Create main visualization group centered in the SVG
      const g = svg.append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

      // Add the groups (arcs)
      const groups = g.append("g")
        .selectAll("g")
        .data(chords.groups)
        .join("g");

      // Add the arc paths
      groups.append("path")
        .attr("fill", (d, i) => {
          if (showDetailedView) {
            // For detailed view, get the node's category
            const node = detailedNodeData[i];
            return getCategoryColor(node.category);
          } else {
            // For category view
            return getCategoryColor(uniqueCategories[i]);
          }
        })
        .attr("stroke", "white")
        .attr("d", arc as any);

      // Add labels for each group
      groups.append("text")
        .each((d: any) => { d.angle = (d.startAngle + d.endAngle) / 2; })
        .attr("dy", ".35em")
        .attr("transform", (d: any) => {
          return `rotate(${(d.angle * 180 / Math.PI - 90)})` +
            `translate(${outerRadius + 10})` +
            `${d.angle > Math.PI ? "rotate(180)" : ""}`;
        })
        .attr("text-anchor", (d: any) => d.angle > Math.PI ? "end" : "start")
        .text((d, i) => {
          if (showDetailedView) {
            // For detailed view, show node name
            const node = detailedNodeData[i];
            return node.id;
          } else {
            // For category view, show category name and count
            const category = uniqueCategories[i];
            const count = categoryNodeCounts[category] || 0;
            return `${category} (${count})`;
          }
        })
        .style("font-size", () => showDetailedView ? "8px" : "10px")
        .style("fill", colors.textColor);

      // Add the chords (ribbons)
      g.append("g")
        .attr("fill-opacity", 0.8)
        .selectAll("path")
        .data(chords)
        .join("path")
        .attr("d", ribbon as any)
        .attr("fill", d => {
          if (showDetailedView) {
            // For detailed view, use source node's category
            const sourceNode = detailedNodeData[d.source.index];
            return getCategoryColor(sourceNode.category);
          } else {
            // For category view, use source category
            return getCategoryColor(uniqueCategories[d.source.index]);
          }
        })
        .attr("stroke", "white")
        .attr("stroke-width", 0.5)
        .style("opacity", 0.8)
        .on("mouseover", function(event, d) {
          // Highlight this chord
          d3.select(this)
            .style("opacity", 1)
            .attr("stroke-width", 1);

          // Get tooltip details based on view mode
          let tooltipContent = "";
          
          if (showDetailedView) {
            // Detailed node-to-node connection info
            const sourceNode = detailedNodeData[d.source.index];
            const targetNode = detailedNodeData[d.target.index];
            const value = detailedMatrix[d.source.index][d.target.index];
            
            tooltipContent = `
              <div class="font-medium">${sourceNode.id} → ${targetNode.id}</div>
              <div class="text-xs">${sourceNode.category} → ${targetNode.category}</div>
              <div>Connections: ${value}</div>
            `;
          } else {
            // Category-to-category connection info
            const sourceCategory = uniqueCategories[d.source.index];
            const targetCategory = uniqueCategories[d.target.index];
            const value = categoryMatrix[d.source.index][d.target.index];
            
            tooltipContent = `
              <div class="font-medium">${sourceCategory} → ${targetCategory}</div>
              <div>Connections: ${value}</div>
            `;
          }
          
          // Show tooltip - using container relative positioning
          const tooltip = d3.select(tooltipRef.current);
          const containerRect = containerRef.current.getBoundingClientRect();
          
          // Calculate position relative to the container
          const xPos = event.clientX - containerRect.left + 15;
          const yPos = event.clientY - containerRect.top - 10;
          
          tooltip
            .style("visibility", "visible")
            .style("opacity", "1")
            .style("left", `${xPos}px`)
            .style("top", `${yPos}px`)
            .html(tooltipContent);
        })
        .on("mousemove", function(event) {
          // Move tooltip with mouse, with intelligent positioning
          if (!tooltipRef.current || !containerRef.current) return;
          
          const tooltip = d3.select(tooltipRef.current);
          const containerRect = containerRef.current.getBoundingClientRect();
          
          // Calculate tooltip dimensions
          const tooltipWidth = tooltipRef.current.offsetWidth || 200;
          const tooltipHeight = tooltipRef.current.offsetHeight || 100;
          
          // Intelligent positioning
          let xPos = event.clientX - containerRect.left + 15;
          let yPos = event.clientY - containerRect.top - 10;
          
          // Check boundaries
          if (xPos + tooltipWidth > containerRect.width) {
            xPos = event.clientX - containerRect.left - tooltipWidth - 10;
          }
          
          if (yPos < 0) {
            yPos = event.clientY - containerRect.top + 15;
          }
          
          tooltip
            .style("left", `${xPos}px`)
            .style("top", `${yPos}px`);
        })
        .on("mouseout", function() {
          // Restore chord style
          d3.select(this)
            .style("opacity", 0.8)
            .attr("stroke-width", 0.5);

          // Hide tooltip
          d3.select(tooltipRef.current)
            .style("opacity", "0")
            .style("visibility", "hidden");
        });

      // Add a title showing relationship info on hover
      groups
        .on("mouseover", function(event, d) {
          // Enhanced tooltip for group hovering
          let tooltipContent = "";
          
          if (showDetailedView) {
            // Individual node info
            const node = detailedNodeData[d.index];
            const category = node.category;
            
            // Count connections
            const outgoing = detailedMatrix[d.index].reduce((sum, val) => sum + val, 0);
            const incoming = detailedMatrix.reduce((sum, row) => sum + row[d.index], 0);
            
            tooltipContent = `
              <div class="font-medium">${node.id}</div>
              <div>Category: ${category}</div>
              <div>Outgoing: ${outgoing}</div>
              <div>Incoming: ${incoming}</div>
              <div>Total: ${outgoing + incoming}</div>
            `;
          } else {
            // Category info
            const index = d.index;
            const category = uniqueCategories[index];
            
            // Count outgoing and incoming connections
            const outgoing = categoryMatrix[index].reduce((sum, val) => sum + val, 0);
            const incoming = categoryMatrix.reduce((sum, row) => sum + row[index], 0);
            
            tooltipContent = `
              <div class="font-medium">${category}</div>
              <div>Nodes: ${categoryNodeCounts[category] || 0}</div>
              <div>Outgoing: ${outgoing}</div>
              <div>Incoming: ${incoming}</div>
              <div>Total: ${outgoing + incoming}</div>
            `;
          }
          
          // Highlight this arc
          d3.select(this).select("path")
            .attr("stroke", "#000")
            .attr("stroke-width", 2);
            
          // Show tooltip - using container relative positioning
          const tooltip = d3.select(tooltipRef.current);
          const containerRect = containerRef.current.getBoundingClientRect();
          
          // Calculate position relative to the container
          const xPos = event.clientX - containerRect.left + 15;
          const yPos = event.clientY - containerRect.top - 10;
          
          tooltip
            .style("visibility", "visible")
            .style("opacity", "1")
            .style("left", `${xPos}px`)
            .style("top", `${yPos}px`)
            .html(tooltipContent);
        })
        .on("mousemove", function(event) {
          // Move tooltip with mouse, with intelligent positioning
          if (!tooltipRef.current || !containerRef.current) return;
          
          const tooltip = d3.select(tooltipRef.current);
          const containerRect = containerRef.current.getBoundingClientRect();
          
          // Calculate tooltip dimensions
          const tooltipWidth = tooltipRef.current.offsetWidth || 200;
          const tooltipHeight = tooltipRef.current.offsetHeight || 100;
          
          // Intelligent positioning
          let xPos = event.clientX - containerRect.left + 15;
          let yPos = event.clientY - containerRect.top - 10;
          
          // Check boundaries
          if (xPos + tooltipWidth > containerRect.width) {
            xPos = event.clientX - containerRect.left - tooltipWidth - 10;
          }
          
          if (yPos < 0) {
            yPos = event.clientY - containerRect.top + 15;
          }
          
          tooltip
            .style("left", `${xPos}px`)
            .style("top", `${yPos}px`);
        })
        .on("mouseout", function() {
          // Restore arc style
          d3.select(this).select("path")
            .attr("stroke", "white")
            .attr("stroke-width", 1);
            
          // Hide tooltip
          d3.select(tooltipRef.current)
            .style("opacity", "0")
            .style("visibility", "hidden");
        });

      // Set background color
      if (containerRef.current) {
        const { r, g, b } = colors.rgbBackgroundColor;
        containerRef.current.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${colors.backgroundOpacity})`;
      }

    } catch (error) {
      console.error("Error rendering chord diagram:", error);
      setVisualizationError("Failed to render chord diagram");
    }
  }, [
    isLoading, 
    svgRef, 
    containerRef, 
    uniqueCategories, 
    categoryMatrix, 
    colors, 
    categoryNodeCounts, 
    forceUpdate,
    evenDistribution,
    tooltipTrigger,
    showDetailedView,
    detailedNodeData,
    detailedMatrix,
    customNodeColors
  ]);

  // Update colors when theme changes
  useEffect(() => {
    if (isLoading || !svgRef.current) return;

    try {
      // Update arc colors
      d3.select(svgRef.current)
        .selectAll("g g path")
        .attr("fill", (_, i) => {
          if (showDetailedView && detailedNodeData[i]) {
            return getCategoryColor(detailedNodeData[i].category);
          } else if (!showDetailedView && uniqueCategories[i]) {
            return getCategoryColor(uniqueCategories[i]);
          }
          return "#999";
        });

      // Update text color
      d3.select(svgRef.current)
        .selectAll("text")
        .style("fill", colors.textColor);

      // Update background
      if (containerRef.current) {
        const { r, g, b } = colors.rgbBackgroundColor;
        containerRef.current.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${colors.backgroundOpacity})`;
      }
    } catch (error) {
      console.error("Error updating colors:", error);
    }
  }, [
    colors.colorTheme,
    colors.textColor,
    colors.backgroundOpacity,
    colors.rgbBackgroundColor,
    uniqueCategories,
    isLoading,
    showDetailedView,
    detailedNodeData
  ]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setForceUpdate(prev => !prev);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Toggle detailed view handler
  const handleToggleDetailedView = () => {
    setShowDetailedView(prev => !prev);
    
    // Notify user of mode change
    toast({
      title: showDetailedView ? "Category View" : "Detailed View",
      description: showDetailedView 
        ? "Showing connections between categories" 
        : "Showing connections between individual nodes",
    });
  };

  // Sidebar state and handlers
  const sidebarState = {
    linkDistance: 75,
    linkStrength: 1.0,
    nodeCharge: -300,
    localNodeSize: colors.nodeSize,
    nodeGroup: 'all',
    localColorTheme: colors.colorTheme,
    activeColorTab: colors.activeColorTab,
    localBackgroundColor: colors.backgroundColor,
    textColor: colors.textColor,
    localLinkColor: colors.linkColor,
    nodeStrokeColor: colors.nodeStrokeColor,
    localBackgroundOpacity: colors.backgroundOpacity,
    isSidebarCollapsed: false,
    networkTitle: "Chord Diagram",
    localFixNodesOnDrag: false,
    localVisualizationType: visualizationType,
    tooltipDetail,
    tooltipTrigger
  };

  const handlers = {
    handleParameterChange: (type: string, value: number) => {
      if (type === "nodeSize") {
        colors.setNodeSize(value);
        setForceUpdate(prev => !prev);
      }
    },
    handleNodeGroupChange: () => {},
    handleColorThemeChange: (theme: string) => {
      colors.setColorTheme(theme);
      setForceUpdate(prev => !prev);
    },
    handleApplyGroupColors: () => {},
    handleApplyIndividualColor: () => {},
    handleResetIndividualColor: () => {},
    handleApplyBackgroundColors: (
      bgColor: string, 
      txtColor: string, 
      lnkColor: string, 
      opacity: number,
      nodeStrokeColor: string
    ) => {
      colors.setBackgroundColor(bgColor);
      colors.setTextColor(txtColor);
      colors.setLinkColor(lnkColor);
      colors.setBackgroundOpacity(opacity);
      colors.setNodeStrokeColor(nodeStrokeColor);
      setForceUpdate(prev => !prev);
    },
    handleResetBackgroundColors: () => {
      colors.resetBackgroundColors();
      setForceUpdate(prev => !prev);
    },
    handleResetSimulation: () => {
      setForceUpdate(prev => !prev);
    },
    handleResetGraph: () => {
      colors.resetAllColors();
      setForceUpdate(prev => !prev);
    },
    toggleSection: (section: string) => {
      setExpandedSections(prev => ({
        ...prev,
        [section]: !prev[section as keyof typeof prev]
      }));
    },
    handleColorTabChange: (tab: string) => {
      colors.setActiveColorTab(tab);
    },
    handleTitleChange: () => {},
    toggleSidebar: () => {},
    handleToggleFixNodes: () => {},
    handleVisualizationTypeChange: (type: VisualizationType) => {
      if (onVisualizationTypeChange && type !== visualizationType) {
        onVisualizationTypeChange(type as VisualizationType);
      }
    },
    handleTooltipDetailChange: (detail: TooltipDetail) => {
      if (onTooltipDetailChange) {
        onTooltipDetailChange(detail);
      }
    },
    handleTooltipTriggerChange: (trigger: TooltipTrigger) => {
      if (onTooltipTriggerChange) {
        onTooltipTriggerChange(trigger);
      }
    },
    downloadData: () => {},
    downloadGraph: () => {}
  };

  return (
    <BaseVisualization
      children={
        <div className="w-full h-full">
          <div
            ref={containerRef}
            className="w-full h-full relative"
            style={{
              backgroundColor: `rgba(${colors.rgbBackgroundColor.r}, ${colors.rgbBackgroundColor.g}, ${colors.rgbBackgroundColor.b}, ${colors.backgroundOpacity})`,
            }}
          >
            <svg
              ref={svgRef}
              className="w-full h-full"
              style={{ overflow: "visible" }}
            />
            
            {/* File buttons */}
            <FileButtons
              onDownloadData={() => {}}
              onDownloadGraph={() => {}}
              onResetSelection={() => setForceUpdate(prev => !prev)}
              nodeData={nodeData.map(node => ({ ...node } as NodeData))}
              linkData={linkData.map(link => ({
                ...link,
                source: typeof link.source === 'object' ? link.source.id : link.source,
                target: typeof link.target === 'object' ? link.target.id : link.target,
              }))}
            />
            
            {/* NetworkTooltip component for styling consistency */}
            <NetworkTooltip
              tooltipRef={tooltipRef}
              nodes={nodeData}
              links={linkData}
              tooltipDetail={tooltipDetail}
              tooltipTrigger={tooltipTrigger}
            />
            
            {/* Tooltip div */}
            <div
              ref={tooltipRef}
              className="absolute bg-black/85 text-white px-3 py-2 rounded-md text-sm z-50"
              style={{
                opacity: 0,
                visibility: "hidden",
                transition: 'opacity 0.15s ease-in-out',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                maxWidth: '320px',
                pointerEvents: 'none'
              }}
            />
            
            {/* Legend */}
            <NetworkLegend
              categories={uniqueCategories}
              colorTheme={colors.colorTheme}
              dynamicColorThemes={colors.dynamicColorThemes}
              colorPalette={Object.values(colors.dynamicColorThemes.default || {})}
            />
            
            {/* Control Panel with both toggles */}
            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded-md text-sm flex flex-col gap-2">
              <div>Hover over arcs and chords for details. The chord width shows connection strength.</div>
              
              {/* Distribution Control */}
              <div className="flex items-center mt-1">
                <label className="flex items-center cursor-pointer">
                  <div className="relative mr-2">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={evenDistribution}
                      onChange={() => setEvenDistribution(!evenDistribution)}
                    />
                    <div className={`w-10 h-5 rounded-full transition-colors ${evenDistribution ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
                    <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform transform ${evenDistribution ? 'translate-x-5' : ''}`}></div>
                  </div>
                  <span>Even Distribution</span>
                </label>
              </div>
              
              {/* Detailed View Control */}
              <div className="flex items-center mt-1">
                <label className="flex items-center cursor-pointer">
                  <div className="relative mr-2">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={showDetailedView}
                      onChange={handleToggleDetailedView}
                    />
                    <div className={`w-10 h-5 rounded-full transition-colors ${showDetailedView ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform transform ${showDetailedView ? 'translate-x-5' : ''}`}></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Detailed View</span>
                    {showDetailedView ? 
                      <Eye className="w-4 h-4 text-green-300" /> : 
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                </label>
              </div>
              
              {/* Show additional info about current view */}
              <div className="mt-1 text-xs text-gray-300">
                {showDetailedView
                  ? `Showing ${detailedNodeData.length} individual nodes and their connections`
                  : `Showing ${uniqueCategories.length} categories and their relationships`
                }
              </div>
            </div>
          </div>
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
      processedData={{ nodes: nodeData, links: linkData }}
      sidebar={sidebarState}
      handlers={handlers}
      customNodeColorsState={colors.customNodeColors}
      dynamicColorThemesState={colors.dynamicColorThemes}
      renderSidebar={true}
    />
  );
};

export default ChordVisualization;