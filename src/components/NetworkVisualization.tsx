import React, { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import * as d3 from 'd3';
import NetworkSidebar from "./NetworkSidebar";
import FileButtons from "./FileButtons";
import { NodeData, LinkData } from "@/types/types"; // Import types from the types file
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

interface NetworkVisualizationProps {
  onCreditsClick: () => void;
  nodeData: NodeData[]; // Dynamically loaded node data with proper type
  linkData: LinkData[]; // Dynamically loaded link data with proper type
}

// Define node data structure for D3
interface Node extends d3.SimulationNodeDatum {
  id: string;
  category: string;
  customColor?: string | null;
}

// Define link data structure for D3
interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  value?: number;
}

// D3 modified types during simulation
interface SimulatedNode extends Node {
  x: number;
  y: number;
  fx: number | null;
  fy: number | null;
}

interface SimulatedLink extends Omit<Link, 'source' | 'target'> {
  source: SimulatedNode;
  target: SimulatedNode;
}

// Category counter interface
interface CategoryCounts {
  [key: string]: number;
  total: number;
}

const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({ 
  onCreditsClick, 
  nodeData = [],
  linkData = []
}) => {
  // Add debug log at the beginning of the component
  console.log("NetworkVisualization received data:", 
    { nodeDataLength: nodeData.length, linkDataLength: linkData.length });

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const transformRef = useRef<d3.ZoomTransform | null>(null); // To store the current zoom state
  const [isLoading, setIsLoading] = useState(true);
  const [linkDistance, setLinkDistance] = useState(70);
  const [linkStrength, setLinkStrength] = useState(1.0);
  const [nodeCharge, setNodeCharge] = useState(-300);
  const [nodeSize, setNodeSize] = useState(1.0);
  const [customNodeColors, setCustomNodeColors] = useState<{[key: string]: string}>({});
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedNodeConnections, setSelectedNodeConnections] = useState<{ to: string[]; from: string[] }>({ to: [], from: [] });
  const [expandedSections, setExpandedSections] = useState({
    networkControls: true,
    nodeControls: true,
    colorControls: false,
    networkInfo: false
  });
  const [nodeGroup, setNodeGroup] = useState('all');
  const [colorTheme, setColorTheme] = useState('default');
  const [activeColorTab, setActiveColorTab] = useState('presets');
  const [backgroundColor, setBackgroundColor] = useState("#f5f5f5");
  const [textColor, setTextColor] = useState("#ffffff");
  const [linkColor, setLinkColor] = useState("#999999");
  const [nodeStrokeColor, setNodeStrokeColor] = useState("#000000");
  const [backgroundOpacity, setBackgroundOpacity] = useState(1.0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [networkTitle, setNetworkTitle] = useState("Untitled Network");
  const [processedData, setProcessedData] = useState<{ nodes: Node[], links: Link[] }>({ nodes: [], links: [] });
  const [nodeCounts, setNodeCounts] = useState<CategoryCounts>({ total: 0 });
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [dynamicColorThemes, setDynamicColorThemes] = useState<{[key: string]: {[key: string]: string}}>({});
  const { toast } = useToast();

  // Define default color palette
  const colorPalette = [
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

  // Process the imported data
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
        ) || '';

        const categoryKey = Object.keys(node).find(key => 
          key.toLowerCase() === 'category' || 
          key.toLowerCase() === 'type' || 
          key.toLowerCase() === 'node type' ||
          key.toLowerCase() === 'node category'
        ) || '';

        return {
          id: String(node[idKey]),
          category: String(node[categoryKey])
        };
      });

      // Process links
      const processedLinks: Link[] = linkData.map(link => {
        const sourceKey = Object.keys(link).find(key => 
          key.toLowerCase() === 'source' || 
          key.toLowerCase() === 'from'
        ) || '';

        const targetKey = Object.keys(link).find(key => 
          key.toLowerCase() === 'target' || 
          key.toLowerCase() === 'to'
        ) || '';

        return {
          source: String(link[sourceKey]),
          target: String(link[targetKey])
        };
      });

      // Find unique categories
      const categories = processedNodes.map(node => node.category);
      const uniqueCats = Array.from(new Set(categories));
      setUniqueCategories(uniqueCats);

      // Generate dynamic color themes
      const themes = generateDynamicColorThemes(uniqueCats);
      setDynamicColorThemes(themes);

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

  // Generate dynamic color themes based on unique categories
  const generateDynamicColorThemes = (categories: string[]) => {
    const baseThemes = {
      default: {} as Record<string, string>,
      bright: {} as Record<string, string>,
      pastel: {} as Record<string, string>,
      ocean: {} as Record<string, string>,
      autumn: {} as Record<string, string>,
      monochrome: {} as Record<string, string>,
      custom: {} as Record<string, string>
    };

    // Default theme with standard colors
    categories.forEach((category, index) => {
      const colorIndex = index % colorPalette.length;
      baseThemes.default[category] = colorPalette[colorIndex];
    });

    // Bright theme with vibrant colors
    categories.forEach((category, index) => {
      const colorIndex = index % colorPalette.length;
      const baseColor = d3.rgb(colorPalette[colorIndex]);
      baseThemes.bright[category] = d3.rgb(
        Math.min(255, baseColor.r + 40),
        Math.min(255, baseColor.g + 40),
        Math.min(255, baseColor.b + 40)
      ).toString();
    });

    // Pastel theme with lighter colors
    categories.forEach((category, index) => {
      const colorIndex = index % colorPalette.length;
      const baseColor = d3.rgb(colorPalette[colorIndex]);
      const h = d3.hsl(baseColor).h;
      baseThemes.pastel[category] = d3.hsl(h, 0.6, 0.8).toString();
    });

    // Ocean theme with blue variants
    categories.forEach((category, index) => {
      baseThemes.ocean[category] = d3.rgb(
        40 + (index * 15) % 100,
        100 + (index * 20) % 155,
        150 + (index * 15) % 105
      ).toString();
    });

    // Autumn theme with warm colors
    categories.forEach((category, index) => {
      baseThemes.autumn[category] = d3.rgb(
        180 + (index * 15) % 75,
        70 + (index * 25) % 120,
        40 + (index * 10) % 50
      ).toString();
    });

    // Monochrome theme with grayscale
    categories.forEach((category, index) => {
      const value = 60 + (index * 25) % 180;
      baseThemes.monochrome[category] = d3.rgb(value, value, value).toString();
    });

    // Custom theme (starts as copy of default)
    baseThemes.custom = {...baseThemes.default};

    // Add "Otro" (Other) category for all themes
    Object.keys(baseThemes).forEach(theme => {
      baseThemes[theme as keyof typeof baseThemes]["Otro"] = "#95a5a6";
    });

    return baseThemes;
  };

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
    if (isSidebarCollapsed && simulationRef.current) {
      setTimeout(() => {
        // Trigger a resize to refit the visualization
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  };
  
  // Handle title change
  const handleTitleChange = (newTitle: string) => {
    setNetworkTitle(newTitle);
  };

  // Helper function to convert hex color to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 245, g: 245, b: 245 }; // Default to #f5f5f5
  };

  // Create D3 visualization
  useEffect(() => {
    if (isLoading || !svgRef.current || !containerRef.current || processedData.nodes.length === 0) {
      console.log("Not ready to create visualization yet");
      return;
    }
  
    console.log("Creating D3 visualization");
  
    try {
      // Clear any existing elements
      d3.select(svgRef.current).selectAll("*").remove();
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      console.log(`Container dimensions: ${width}x${height}`);
      
      // Create a group for the graph
      const g = d3.select(svgRef.current).append("g");
      
      // Create zoom behavior
      const zoom = d3.zoom()
        .scaleExtent([0.1, 8])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
          // Store the current zoom transform for later use
          transformRef.current = event.transform;
        });
      
      d3.select(svgRef.current).call(zoom);
      
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
      
      // Create simulation
      const simulation = d3.forceSimulation<Node>(filteredNodes)
        .force("link", d3.forceLink<Node, Link>(filteredLinks)
          .id(d => d.id)
          .distance(linkDistance)
          .strength(linkStrength))
        .force("charge", d3.forceManyBody().strength(nodeCharge))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(d => {
          // Base size by category importance
          const baseNodeSize = 7 * nodeSize; // Default size
          return baseNodeSize + 2;
        }));
      
      // Store simulation reference for later updates
      simulationRef.current = simulation;
      
      // Function to get node color based on customization
      function getNodeColor(d: Node) {
        // First check for custom node color
        if (customNodeColors[d.id]) {
          return customNodeColors[d.id];
        }
        
        // Use the category color from current theme
        const currentTheme = dynamicColorThemes[colorTheme] || dynamicColorThemes.default;
        return currentTheme[d.category] || currentTheme["Otro"] || "#95a5a6";
      }
      
      // Create links
      const link = g.append("g")
        .attr("class", "links")
        .selectAll<SVGLineElement, SimulatedLink>("line")
        .data(filteredLinks)
        .enter()
        .append("line")
        .attr("class", "link")
        .attr("stroke", linkColor)
        .attr("stroke-width", 1.5);
      
      // Create nodes
      const node = g.append("g")
        .attr("class", "nodes")
        .selectAll<SVGCircleElement, SimulatedNode>("circle")
        .data(filteredNodes)
        .enter()
        .append("circle")
        .attr("class", "node")
        .attr("r", d => 7 * nodeSize)
        .attr("fill", d => getNodeColor(d))
        .attr("stroke", nodeStrokeColor)
        .attr("stroke-width", 1)
        .call(drag(simulation));
      
      // Create node labels
      const nodeLabel = g.append("g")
        .attr("class", "node-labels")
        .selectAll<SVGTextElement, SimulatedNode>("text")
        .data(filteredNodes)
        .enter()
        .append("text")
        .attr("class", "node-label")
        .attr("dy", "0.3em")
        .text(d => d.id.length > 15 ? d.id.substring(0, 12) + '...' : d.id)
        .style("fill", textColor)
        .style("font-size", d => `${8 * Math.min(1.2, nodeSize)}px`)
        .style("text-shadow", `0 1px 2px rgba(0, 0, 0, 0.7)`);
      
      // Event handlers
      node
        .on("mouseover", (event, d) => showTooltip(event, d))
        .on("mousemove", (event) => moveTooltip(event))
        .on("mouseout", hideTooltip)
        .on("click", (event, d) => {
          event.stopPropagation();
          showNodeDetails(d);
        });
      
      // Click anywhere else to reset highlighting
      d3.select(svgRef.current).on("click", () => {
        setSelectedNode(null);
        resetHighlighting();
      });
      
      // Update function for simulation
      simulation.on("tick", () => {
        // Proper type handling for x and y coordinates
        link
          .attr("x1", d => (d.source as SimulatedNode).x || 0)
          .attr("y1", d => (d.source as SimulatedNode).y || 0)
          .attr("x2", d => (d.target as SimulatedNode).x || 0)
          .attr("y2", d => (d.target as SimulatedNode).y || 0);
        
        node
          .attr("cx", d => d.x || 0)
          .attr("cy", d => d.y || 0);
        
        nodeLabel
          .attr("x", d => d.x || 0)
          .attr("y", d => d.y || 0);
      });
      
      // Helper function to create drag behavior
      function drag(simulation: d3.Simulation<Node, Link>) {
        function dragstarted(event: d3.D3DragEvent<SVGCircleElement, SimulatedNode, SimulatedNode>, d: SimulatedNode) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        }
        
        function dragged(event: d3.D3DragEvent<SVGCircleElement, SimulatedNode, SimulatedNode>, d: SimulatedNode) {
          d.fx = event.x;
          d.fy = event.y;
        }
        
        function dragended(event: d3.D3DragEvent<SVGCircleElement, SimulatedNode, SimulatedNode>, d: SimulatedNode) {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }
        
        return d3.drag<SVGCircleElement, SimulatedNode>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended);
      }
      
      // Tooltip functions - Improved positioning based on zoom
      function showTooltip(event: MouseEvent, d: Node) {
        if (!tooltipRef.current) return;
        
        // Find connections for this node
        const sourceLinks = processedData.links.filter(link => {
          return typeof link.source === 'object' 
            ? link.source.id === d.id 
            : link.source === d.id;
        });
        
        const targetLinks = processedData.links.filter(link => {
          return typeof link.target === 'object' 
            ? link.target.id === d.id 
            : link.target === d.id;
        });
        
        let tooltipContent = `<strong>${d.id}</strong><br>Category: ${d.category}<br><br>`;
        
        // Add connections info
        if (sourceLinks.length > 0) {
          tooltipContent += `<strong>Connected to:</strong><br>`;
          sourceLinks.forEach(link => {
            const targetName = typeof link.target === 'object' ? link.target.id : link.target;
            tooltipContent += `${targetName}<br>`;
          });
          tooltipContent += `<br>`;
        }
        
        if (targetLinks.length > 0) {
          tooltipContent += `<strong>Connected from:</strong><br>`;
          targetLinks.forEach(link => {
            const sourceName = typeof link.source === 'object' ? link.source.id : link.source;
            tooltipContent += `${sourceName}<br>`;
          });
        }
        
        const tooltip = d3.select(tooltipRef.current);
        
        // Improved positioning: position tooltip closer to node rather than mouse
        // Fix: TypeScript is warning about 'x' and 'y' properties on Node type
        const nodeX = 'x' in d ? (d as SimulatedNode).x : 0;
        const nodeY = 'y' in d ? (d as SimulatedNode).y : 0;
        
        // Use const instead of let to avoid linting warnings
        const xPos = event.pageX;
        const yPos = event.pageY;
        
        // Set tooltip content and position
        tooltip
          .html(tooltipContent)
          .style("left", `${xPos + 5}px`)
          .style("top", `${yPos - 10}px`)
          .style("opacity", "0.9");
      }
      
      function moveTooltip(event: MouseEvent) {
        if (!tooltipRef.current) return;
        
        // Follow the mouse but with better positioning
        d3.select(tooltipRef.current)
          .style("left", `${event.pageX + 5}px`)
          .style("top", `${event.pageY - 10}px`);
      }
      
      function hideTooltip() {
        if (!tooltipRef.current) return;
        
        d3.select(tooltipRef.current)
          .style("opacity", "0");
      }
      
      // Show node details and highlight connections
      function showNodeDetails(d: Node) {
        console.log("Node selected:", d);
        setSelectedNode(d);
        
        // Find connections for this node
        const sourceLinks = processedData.links.filter(link => {
          return typeof link.source === 'object' 
            ? link.source.id === d.id 
            : link.source === d.id;
        });
        
        const targetLinks = processedData.links.filter(link => {
          return typeof link.target === 'object' 
            ? link.target.id === d.id 
            : link.target === d.id;
        });
        
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
        highlightConnections(d, sourceLinks, targetLinks);
      }
      
      // Highlight connections for a selected node
      function highlightConnections(d: Node, sourceLinks: Link[], targetLinks: Link[]) {
        node.attr('opacity', (n: Node) => {
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
        
        link.attr('opacity', (l: Link) => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          const isConnected = (sourceId === d.id || targetId === d.id);
          return isConnected ? 1 : 0.1;
        });
        
        nodeLabel.attr('opacity', (n: Node) => {
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
      
      // Reset highlighting
      function resetHighlighting() {
        node.attr('opacity', 1);
        link.attr('opacity', 1);
        nodeLabel.attr('opacity', 1);
      }
      
      // Apply background color
      if (containerRef.current) {
        containerRef.current.style.backgroundColor = `rgba(${hexToRgb(backgroundColor).r}, ${hexToRgb(backgroundColor).g}, ${hexToRgb(backgroundColor).b}, ${backgroundOpacity})`;
      }
      
      // Initial zoom to fit
      const zoomToFit = () => {
        const bounds = g.node()?.getBBox();
        if (!bounds) return;
        
        const dx = bounds.width;
        const dy = bounds.height;
        const x = bounds.x + (bounds.width / 2);
        const y = bounds.y + (bounds.height / 2);
        
        const scale = 0.8 / Math.max(dx / width, dy / height);
        const translate = [width / 2 - scale * x, height / 2 - scale * y];
        
        const transform = d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale);
        
        d3.select(svgRef.current)
          .transition()
          .duration(750)
          .call(zoom.transform, transform);
        
        // Store the initial zoom transform
        transformRef.current = transform;
      };
      
      setTimeout(zoomToFit, 500);
      
      console.log("D3 visualization created successfully");
      
   // Return cleanup function
   return () => {
    if (simulation) simulation.stop();
  };
} catch (error) {
  console.error("Error creating D3 visualization:", error);
  toast({
    title: "Error",
    description: `Failed to create the visualization: ${error instanceof Error ? error.message : String(error)}`,
  });
}
// CHANGE THIS LINE - Remove the visualization parameters from dependencies
}, [isLoading, nodeGroup, processedData, toast]);

  // Update visualization when parameters change - IMPROVED to preserve zoom and position
  useEffect(() => {
    if (isLoading || !svgRef.current || !simulationRef.current) return;
    
    try {
      console.log("Updating visualization parameters");
      const simulation = simulationRef.current;
      
      // Select all the elements we need to update
      const nodes = d3.select(svgRef.current).selectAll<SVGCircleElement, Node>(".node");
      const labels = d3.select(svgRef.current).selectAll(".node-label");
      const links = d3.select(svgRef.current).selectAll(".link");
      
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
      
      // Update node sizes - directly modify the nodes without recreating
      nodes.attr("r", d => 7 * nodeSize);
      
      // Update collision radius
      const collisionForce = simulation.force("collision") as d3.ForceCollide<Node> | null;
      if (collisionForce) {
        collisionForce.radius(d => (7 * nodeSize) + 2);
      }
      
      // Update text size
      labels.style("font-size", `${8 * Math.min(1.2, nodeSize)}px`);
      
      // Update node colors
      nodes.attr("fill", d => {
        // First check for custom node color
        if (customNodeColors[d.id]) {
          return customNodeColors[d.id];
        }
        
        // Use the category color from current theme
        const currentTheme = dynamicColorThemes[colorTheme] || dynamicColorThemes.default;
        return currentTheme[d.category] || currentTheme["Otro"] || "#95a5a6";
      });
        
      // Update node stroke
      nodes.attr("stroke", nodeStrokeColor)
           .attr("stroke-width", 1);
      
      // Update labels color
      labels.style("fill", textColor);
      
      // Update link color
      links.attr("stroke", linkColor);
      
      // Update background color
      if (containerRef.current) {
        containerRef.current.style.backgroundColor = `rgba(${hexToRgb(backgroundColor).r}, ${hexToRgb(backgroundColor).g}, ${hexToRgb(backgroundColor).b}, ${backgroundOpacity})`;
      }
      
      // Restart simulation with a lower alpha to make transitions smoother
      simulation.alpha(0.3).restart();
      
    } catch (error) {
      console.error("Error updating visualization:", error);
    }
  }, [
    nodeSize, 
    linkDistance, 
    linkStrength, 
    nodeCharge, 
    colorTheme, 
    customNodeColors,
    backgroundColor,
    textColor,
    linkColor,
    nodeStrokeColor,
    backgroundOpacity,
    dynamicColorThemes,
    isLoading
  ]);

  // Handle parameter change
  const handleParameterChange = (type: string, value: number) => {
    console.log(`Parameter changed: ${type} = ${value}`);
    switch (type) {
      case "nodeSize":
        setNodeSize(value);
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
  };

  // Handle color theme change
  const handleColorThemeChange = (theme: string) => {
    console.log(`Color theme changed to: ${theme}`);
    setColorTheme(theme);
  };

  // Handle color tab change
  const handleColorTabChange = (tab: string) => {
    console.log(`Color tab changed to: ${tab}`);
    setActiveColorTab(tab);
  };

  // Handle apply group colors
  const handleApplyGroupColors = (categoryColorMap: {[key: string]: string}) => {
    console.log("Applying group colors", categoryColorMap);
    
    // Create a copy of the dynamic color themes
    const updatedThemes = { ...dynamicColorThemes };
    
    // Update the custom theme with the new category colors
    updatedThemes.custom = { ...updatedThemes.custom };
    
    // Apply each category color from the map
    Object.keys(categoryColorMap).forEach(category => {
      updatedThemes.custom[category] = categoryColorMap[category];
    });
    
    // Update the dynamic color themes
    setDynamicColorThemes(updatedThemes);
    
    // Set the color theme to custom
    setColorTheme('custom');
    
    toast({
      title: "Group Colors Applied",
      description: "Custom colors have been applied to categories",
    });
  };

  // Handle apply individual color
  const handleApplyIndividualColor = (nodeId: string, color: string) => {
    console.log(`Applying individual color for node ${nodeId}: ${color}`);
    setCustomNodeColors(prev => ({
      ...prev,
      [nodeId]: color
    }));
  };

  // Handle reset individual color
  const handleResetIndividualColor = (nodeId: string) => {
    console.log(`Resetting individual color for node ${nodeId}`);
    setCustomNodeColors(prev => {
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
    setBackgroundColor(bgColor);
    setTextColor(txtColor);
    setLinkColor(lnkColor);
    setBackgroundOpacity(opacity);
    setNodeStrokeColor(nodeStrokeClr);
  };

  // Handle reset background colors
  const handleResetBackgroundColors = () => {
    console.log("Resetting background colors");
    setBackgroundColor("#f5f5f5");
    setTextColor("#ffffff");
    setLinkColor("#999999");
    setBackgroundOpacity(1.0);
    setNodeStrokeColor("#000000");
  };

  // Handle reset simulation
  const handleResetSimulation = () => {
    console.log("Resetting simulation");
    setLinkDistance(70);
    setLinkStrength(1.0);
    setNodeCharge(-300);
    setNodeSize(1.0);
    
    toast({
      title: "Simulation Reset",
      description: "Parameters have been reset to default values",
    });
  };

  // Handle reset graph
  const handleResetGraph = () => {
    console.log("Resetting graph");
    setNodeGroup('all');
    setColorTheme('default');
    setCustomNodeColors({});
    setBackgroundColor("#f5f5f5");
    setTextColor("#ffffff");
    setLinkColor("#999999");
    setBackgroundOpacity(1.0);
    setNodeStrokeColor("#000000");
    
    toast({
      title: "Graph Reset",
      description: "All graph settings have been reset to default values",
    });
  };

  // Debug function for download operations
  const debugDownload = (type: string, data: any) => {
    console.log(`Debug download ${type}:`, data);
    toast({
      title: `Debug ${type}`,
      description: `Attempting to download ${type}. Check console for details.`,
    });
  };

  // Handle download data with improved error handling and fallbacks
  const handleDownloadData = (format: string) => {
    console.log(`Downloading data as ${format}`);
    debugDownload('data', { format, nodeCount: processedData.nodes.length, linkCount: processedData.links.length });
    
    try {
      // Prepare data in array format for export
      const nodeData = processedData.nodes.map(node => ({
        id: node.id,
        category: node.category
      }));
      
      const linkData = processedData.links.map(link => ({
        source: typeof link.source === 'object' ? link.source.id : link.source,
        target: typeof link.target === 'object' ? link.target.id : link.target
      }));
      
      // Generate filename based on title
      const safeTitle = networkTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = safeTitle || 'network_data';
      
      if (format === 'csv') {
        // Create CSV content
        let csvContent = "";
        
        // Add nodes CSV
        csvContent += "# Nodes\nid,category\n";
        nodeData.forEach(node => {
          // Escape commas in names if necessary
          const id = node.id.includes(',') ? `"${node.id}"` : node.id;
          csvContent += `${id},${node.category}\n`;
        });
        
        // Add links CSV
        csvContent += "\n# Links\nsource,target\n";
        linkData.forEach(link => {
          // Escape commas in names if necessary
          const source = typeof link.source === 'string' && link.source.includes(',') ? `"${link.source}"` : link.source;
          const target = typeof link.target === 'string' && link.target.includes(',') ? `"${link.target}"` : link.target;
          csvContent += `${source},${target}\n`;
        });
        
        console.log("CSV Content:", csvContent.substring(0, 200) + "...");
        
        // Create and trigger download with a direct approach
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Download Started",
          description: "Your network data is being downloaded as CSV",
        });
      } else if (format === 'xlsx') {
        try {
          // Use XLSX in a more direct way
          const wb = XLSX.utils.book_new();
          
          // Create worksheets for nodes and links
          const wsNodes = XLSX.utils.json_to_sheet(nodeData);
          const wsLinks = XLSX.utils.json_to_sheet(linkData);
          
          // Add worksheets to workbook
          XLSX.utils.book_append_sheet(wb, wsNodes, "Nodes");
          XLSX.utils.book_append_sheet(wb, wsLinks, "Links");
          
          // Generate XLSX file and trigger download
          XLSX.writeFile(wb, `${filename}.xlsx`);
          
          toast({
            title: "Download Started",
            description: "Your network data is being downloaded as Excel file",
          });
        } catch (xlsxError) {
          console.error("XLSX specific error:", xlsxError);
          toast({
            title: "XLSX Error",
            description: "Error creating Excel file: " + String(xlsxError),
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error("Error downloading data:", error);
      toast({
        title: "Download Error",
        description: "An error occurred while preparing the data download: " + String(error),
        variant: "destructive"
      });
    }
  };

  // Helper function to convert Data URI to Blob
  function dataURItoBlob(dataURI: string) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    let byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
      byteString = atob(dataURI.split(',')[1]);
    else
      byteString = unescape(dataURI.split(',')[1]);
      
    // separate out the mime component
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    
    // write the bytes of the string to a typed array
    const ia = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ia], {type: mimeString});
  }

  // Improved handleDownloadGraph function
const handleDownloadGraph = (format: string) => {
  console.log(`Downloading graph as ${format}`);
  
  if (!svgRef.current) {
    toast({
      title: "Error",
      description: "SVG reference is not available for download",
      variant: "destructive"
    });
    return;
  }
  
  try {
    // Clone the SVG element
    const svgCopy = svgRef.current.cloneNode(true) as SVGSVGElement;
    
    // Get the original SVG dimensions
    const svgWidth = svgRef.current.clientWidth;
    const svgHeight = svgRef.current.clientHeight;
    
    // Set explicit width and height attributes
    svgCopy.setAttribute('width', svgWidth.toString());
    svgCopy.setAttribute('height', svgHeight.toString());
    
    // Critical: Find the transform from zoom and apply it to viewBox instead
    // This ensures the downloaded SVG displays the same view as the screen
    let transformGroup = svgCopy.querySelector('g');
    let transform = transformGroup?.getAttribute('transform');
    let transformMatrix = {translate: {x: 0, y: 0}, scale: 1};
    
    // Parse the transform attribute if it exists
    if (transform && transform.includes('translate')) {
      const translateMatch = transform.match(/translate\(([^,]+),([^)]+)\)/);
      const scaleMatch = transform.match(/scale\(([^)]+)\)/);
      
      if (translateMatch && translateMatch.length === 3) {
        transformMatrix.translate.x = parseFloat(translateMatch[1]);
        transformMatrix.translate.y = parseFloat(translateMatch[2]);
      }
      
      if (scaleMatch && scaleMatch.length === 2) {
        transformMatrix.scale = parseFloat(scaleMatch[1]);
      }
      
      // Remove the transform from the group as we'll apply it to the viewBox
      transformGroup?.removeAttribute('transform');
    }
    
    // Get the bounds of the graph
    let bbox;
    if (transformGroup) {
      bbox = transformGroup.getBBox();
    } else {
      bbox = {x: 0, y: 0, width: svgWidth, height: svgHeight};
    }
    
    // Calculate and apply the viewBox incorporating the zoom transform
    // This is crucial for showing the graph at the correct position
    const viewBoxX = bbox.x - (transformMatrix.translate.x / transformMatrix.scale);
    const viewBoxY = bbox.y - (transformMatrix.translate.y / transformMatrix.scale);
    const viewBoxWidth = svgWidth / transformMatrix.scale;
    const viewBoxHeight = svgHeight / transformMatrix.scale;
    const viewBox = `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`;
    
    svgCopy.setAttribute('viewBox', viewBox);
    
    // Add background rectangle AFTER we've captured viewBox so it doesn't affect it
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', backgroundColor);
    bgRect.setAttribute('opacity', backgroundOpacity.toString());
    
    // Critical: Insert at beginning but AFTER the transform group
    if (transformGroup) {
      transformGroup.insertBefore(bgRect, transformGroup.firstChild);
    } else {
      svgCopy.insertBefore(bgRect, svgCopy.firstChild);
    }
    
    // Ensure all nodes and links have explicit visibility and opacity
    svgCopy.querySelectorAll('.node, .link, .node-label').forEach(el => {
      el.setAttribute('opacity', '1');
      el.setAttribute('visibility', 'visible');
    });
    
    // Add explicit styling to ensure elements are visible
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
      .node { stroke-width: 1; }
      .link { stroke-width: 1.5; }
      .node-label { font-family: sans-serif; text-anchor: middle; }
    `;
    svgCopy.insertBefore(style, svgCopy.firstChild);
    
    // Convert SVG to a string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgCopy);
    
    // Log size and check for key elements
    console.log("SVG String length:", svgString.length);
    console.log("Contains node elements:", svgString.includes('class="node"'));
    console.log("Contains link elements:", svgString.includes('class="link"'));
    
    // Generate filename based on title
    const safeTitle = networkTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = safeTitle || 'network_visualization';
    
    if (format === 'svg') {
      // Download as SVG
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: "Your network visualization is being downloaded as SVG",
      });
    } else {
      // For other formats, use the improved SVG for conversion
      const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
      const imgSrc = `data:image/svg+xml;base64,${svgBase64}`;
      
      // For PNG/JPG/PDF, convert to canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error("Cannot get canvas context");
      }
      
      // For better quality on high-DPI screens
      const scale = 2;
      canvas.width = svgWidth * scale;
      canvas.height = svgHeight * scale;
      
      // Fill with background color
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Create an image from the SVG string
      const img = new Image();
      
      img.onload = function() {
        // Draw the image onto the canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to the requested format
        let mimeType, outputFilename;
        switch(format) {
          case 'png':
            mimeType = 'image/png';
            outputFilename = `${safeTitle}.png`;
            break;
          case 'jpg':
          case 'jpeg':
            mimeType = 'image/jpeg';
            outputFilename = `${safeTitle}.jpg`;
            break;
          case 'pdf':
            try {
              // For PDF, we need special handling
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF({
                orientation: svgWidth > svgHeight ? 'landscape' : 'portrait',
                unit: 'px',
                format: [svgWidth, svgHeight]
              });
              
              pdf.addImage(imgData, 'PNG', 0, 0, svgWidth, svgHeight);
              pdf.save(`${safeTitle}.pdf`);
              
              toast({
                title: "Download Started",
                description: "Your network visualization is being downloaded as PDF",
              });
            } catch (pdfError) {
              console.error("PDF creation error:", pdfError);
              toast({
                title: "PDF Creation Failed",
                description: "Error creating PDF: " + String(pdfError),
                variant: "destructive"
              });
            }
            return;
        }
        
        // Download the image
        const dataUrl = canvas.toDataURL(mimeType);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = outputFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Download Started",
          description: `Your network visualization is being downloaded as ${format.toUpperCase()}`,
        });
      };
      
      // Add error handler
      img.onerror = function(err) {
        console.error("Error loading SVG as image:", err);
        toast({
          title: "Image Creation Failed",
          description: "Could not convert SVG to image format. Try SVG format instead.",
          variant: "destructive"
        });
      };
      
      // Load the SVG as an image
      img.src = imgSrc;
    }
  } catch (error) {
    console.error("Error downloading graph:", error);
    toast({
      title: "Download Error",
      description: "An error occurred while preparing the download: " + String(error),
      variant: "destructive"
    });
  }
};

  // Handle reset selection
  const handleResetSelection = () => {
    window.location.reload();
  };

  // Modify the empty data check with better messaging
  if (nodeData.length === 0 || linkData.length === 0) {
    console.log("Empty data detected in NetworkVisualization:", 
      { nodeDataEmpty: nodeData.length === 0, linkDataEmpty: linkData.length === 0 });
    return (
      <div className="w-full h-[calc(100vh-14rem)] rounded-lg border border-border overflow-hidden bg-card flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <h2 className="text-xl font-bold mb-4">Loading Network Visualization</h2>
          <p className="text-gray-500 mb-6">
            Waiting for node and link data...
          </p>
          
          {/* Added a loading spinner */}
          <div className="flex justify-center items-center my-6">
            <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-14rem)] rounded-lg border border-border overflow-hidden bg-card flex">
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
            <p className="text-sm text-muted-foreground animate-pulse">Loading Network Data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Sidebar Component */}
          <NetworkSidebar
            linkDistance={linkDistance}
            linkStrength={linkStrength}
            nodeCharge={nodeCharge}
            nodeSize={nodeSize}
            nodeGroup={nodeGroup}
            colorTheme={colorTheme}
            activeColorTab={activeColorTab}
            expandedSections={expandedSections}
            selectedNode={selectedNode}
            selectedNodeConnections={selectedNodeConnections}
            nodeCounts={nodeCounts}
            colorThemes={dynamicColorThemes[colorTheme] || {}}
            nodes={processedData.nodes}
            customNodeColors={customNodeColors}
            backgroundColor={backgroundColor}
            textColor={textColor}
            linkColor={linkColor}
            nodeStrokeColor={nodeStrokeColor}
            backgroundOpacity={backgroundOpacity}
            title={networkTitle}
            isCollapsed={isSidebarCollapsed}
            onParameterChange={handleParameterChange}
            onNodeGroupChange={handleNodeGroupChange}
            onColorThemeChange={handleColorThemeChange}
            onApplyGroupColors={handleApplyGroupColors}
            onApplyIndividualColor={handleApplyIndividualColor}
            onResetIndividualColor={handleResetIndividualColor}
            onApplyBackgroundColors={handleApplyBackgroundColors}
            onResetBackgroundColors={handleResetBackgroundColors}
            onResetSimulation={handleResetSimulation}
            onDownloadData={handleDownloadData}
            onDownloadGraph={handleDownloadGraph}
            onResetGraph={handleResetGraph}
            onToggleSection={toggleSection}
            onColorTabChange={handleColorTabChange}
            onTitleChange={handleTitleChange}
            onToggleSidebar={toggleSidebar}
            uniqueCategories={uniqueCategories}
          />
          
          {/* Graph Visualization */}
          <div 
            ref={containerRef} 
            className="flex-1 relative h-full"
            style={{ 
              backgroundColor: `rgba(${hexToRgb(backgroundColor).r}, ${hexToRgb(backgroundColor).g}, ${hexToRgb(backgroundColor).b}, ${backgroundOpacity})`
            }}
          >
            <svg 
              ref={svgRef} 
              className="w-full h-full"
            />
            
            {/* File Buttons in top-right corner */}
            <FileButtons 
              onDownloadData={handleDownloadData}
              onDownloadGraph={handleDownloadGraph}
              onResetSelection={handleResetSelection}
            />
            
            {/* Tooltip - Better styling and positioning */}
            <div 
              ref={tooltipRef} 
              className="absolute bg-black/85 text-white px-3 py-2 rounded-md text-sm pointer-events-none z-50 max-w-60" 
              style={{ 
                opacity: 0,
                transition: 'opacity 0.2s ease-in-out',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
              }}
            ></div>
            
            {/* Legend */}
            <div className="absolute bottom-5 right-5 bg-white/90 p-2.5 rounded-md shadow-md">
              {uniqueCategories.map((category, index) => (
                <div className="flex items-center mb-1" key={category}>
                  <div 
                    className="legend-color w-3.5 h-3.5 rounded-full mr-2" 
                    style={{ 
                      backgroundColor: (dynamicColorThemes[colorTheme] || {})[category] || colorPalette[index % colorPalette.length]
                    }}
                  ></div>
                  <span className="text-xs">{category}</span>
                </div>
              ))}
            </div>
          
            {/* Helper text - Fixed positioning to be inside container */}
            <div className="absolute bottom-4 left-4 bg-background/90 p-2 rounded-md text-xs backdrop-blur-sm shadow-sm z-10">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                <span>Hover over nodes to see details. Drag to reposition.</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NetworkVisualization;