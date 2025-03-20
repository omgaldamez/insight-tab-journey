import React, { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import * as d3 from 'd3';
import NetworkSidebar from "./NetworkSidebar";
import DownloadButtons from "./DownloadButtons";
import FileButtons from "./FileButtons";
import { NodeData, LinkData } from "@/types/types"; // Import types from the types file

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
        });
      
      d3.select(svgRef.current).call(zoom);
      
      // Filter nodes based on selection
      const filteredNodes = nodeGroup === 'all' 
        ? processedData.nodes
        : processedData.nodes.filter(node => node.category === nodeGroup);
      
      // Create filtered links
      const nodeIds = new Set(filteredNodes.map(node => node.id));
      const filteredLinks = processedData.links.filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
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
        // Type assertion needed here because D3 modifies nodes and links during simulation
        link
          .attr("x1", d => d.source.x || 0)
          .attr("y1", d => d.source.y || 0)
          .attr("x2", d => d.target.x || 0)
          .attr("y2", d => d.target.y || 0);
        
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
      
      // Tooltip functions
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
        tooltip
          .html(tooltipContent)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 28) + "px")
          .style("opacity", "0.9");
      }
      
      function moveTooltip(event: MouseEvent) {
        if (!tooltipRef.current) return;
        
        d3.select(tooltipRef.current)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 28) + "px");
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
        
        d3.select(svgRef.current)
          .transition()
          .duration(750)
          .call(
            zoom.transform, 
            d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
          );
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
  }, [isLoading, nodeGroup, processedData, toast, linkDistance, linkStrength, nodeCharge, nodeSize, customNodeColors, colorTheme, textColor, linkColor]);
  
  // Update visualization when parameters change
  useEffect(() => {
    if (isLoading || !svgRef.current || !simulationRef.current) return;
    
    try {
      console.log("Updating visualization parameters");
      const simulation = simulationRef.current;
      
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
      d3.select(svgRef.current).selectAll<SVGCircleElement, Node>(".node")
        .attr("r", d => 7 * nodeSize);
      
      // Update collision radius
      const collisionForce = simulation.force("collision") as d3.ForceCollide<Node> | null;
      if (collisionForce) {
        collisionForce.radius(d => {
          return (7 * nodeSize) + 2;
        });
      }
      
      // Update text size
      d3.select(svgRef.current).selectAll(".node-label")
        .style("font-size", d => `${8 * Math.min(1.2, nodeSize)}px`);
      
      // Update node colors
      d3.select(svgRef.current).selectAll<SVGCircleElement, Node>(".node")
        .attr("fill", d => {
          // First check for custom node color
          if (customNodeColors[d.id]) {
            return customNodeColors[d.id];
          }
          
          // Use the category color from current theme
          const currentTheme = dynamicColorThemes[colorTheme] || dynamicColorThemes.default;
          return currentTheme[d.category] || currentTheme["Otro"] || "#95a5a6";
        });
        
      // Update labels color
      d3.select(svgRef.current).selectAll(".node-label")
        .style("fill", textColor);
      
      // Update link color
      d3.select(svgRef.current).selectAll(".link")
        .attr("stroke", linkColor);
      
      // Update background color
      if (containerRef.current) {
        containerRef.current.style.backgroundColor = `rgba(${hexToRgb(backgroundColor).r}, ${hexToRgb(backgroundColor).g}, ${hexToRgb(backgroundColor).b}, ${backgroundOpacity})`;
      }
      
      // Restart simulation
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
  const handleApplyGroupColors = () => {
    console.log("Applying group colors");
    setColorTheme('custom');
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
  const handleApplyBackgroundColors = (bgColor: string, txtColor: string, lnkColor: string, opacity: number) => {
    console.log(`Applying background colors: bg=${bgColor}, text=${txtColor}, link=${lnkColor}, opacity=${opacity}`);
    setBackgroundColor(bgColor);
    setTextColor(txtColor);
    setLinkColor(lnkColor);
    setBackgroundOpacity(opacity);
  };

  // Handle reset background colors
  const handleResetBackgroundColors = () => {
    console.log("Resetting background colors");
    setBackgroundColor("#f5f5f5");
    setTextColor("#ffffff");
    setLinkColor("#999999");
    setBackgroundOpacity(1.0);
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
    
    toast({
      title: "Graph Reset",
      description: "All graph settings have been reset to default values",
    });
  };

  // Handle download data
  const handleDownloadData = (format: string) => {
    console.log(`Downloading data as ${format}`);
    
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
        
        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        // Create a download link
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
        toast({
          title: "Feature Not Available",
          description: "XLSX download is not yet implemented in this version",
        });
      }
    } catch (error) {
      console.error("Error downloading data:", error);
      toast({
        title: "Download Error",
        description: "An error occurred while preparing the data download.",
      });
    }
  };

  // Handle download graph
  const handleDownloadGraph = (format: string) => {
    console.log(`Downloading graph as ${format}`);
    
    if (!svgRef.current) return;
    
    try {
      // Clone the SVG element
      const svgCopy = svgRef.current.cloneNode(true) as SVGSVGElement;
      
      // Set width and height attributes explicitly
      svgCopy.setAttribute('width', svgRef.current.clientWidth.toString());
      svgCopy.setAttribute('height', svgRef.current.clientHeight.toString());
      
      // Add background rectangle
      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('width', '100%');
      bgRect.setAttribute('height', '100%');
      bgRect.setAttribute('fill', backgroundColor);
      bgRect.setAttribute('opacity', backgroundOpacity.toString());
      svgCopy.insertBefore(bgRect, svgCopy.firstChild);
      
      // Convert SVG to a string
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgCopy);
      
      // Generate filename based on title
      const safeTitle = networkTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = safeTitle || 'network_visualization';
      
      if (format === 'svg') {
        // Download as SVG
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);
        
        // Create a download link
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Download Started",
          description: "Your network visualization is being downloaded as SVG",
        });
      } else {
        toast({
          title: "Feature Not Implemented",
          description: `Download as ${format.toUpperCase()} is not yet implemented.`,
        });
      }
    } catch (error) {
      console.error("Error downloading graph:", error);
      toast({
        title: "Download Error",
        description: "An error occurred while preparing the download.",
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
            
            {/* Tooltip */}
            <div ref={tooltipRef} className="absolute bg-black/85 text-white px-3.5 py-2.5 rounded-md text-sm pointer-events-none z-50 max-w-60" style={{ opacity: 0 }}></div>
            
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
          </div>
          
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-background/90 p-2 rounded-md text-xs backdrop-blur-sm">
            <AlertCircle className="h-4 w-4 text-primary" />
            <span>Hover over nodes to see details. Drag to reposition.</span>
          </div>
        </>
      )}
    </div>
  );
};

export default NetworkVisualization;