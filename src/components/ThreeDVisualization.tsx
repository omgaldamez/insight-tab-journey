/* eslint-disable react-hooks/exhaustive-deps */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Node, Link } from '@/types/networkTypes';
import { useToast } from "@/components/ui/use-toast";
import ThreeDNetworkControls from "./ThreeDNetworkControls";

interface ThreeDVisualizationProps {
  nodeData: Node[];
  linkData: Link[];
  colorTheme?: string;
  nodeSize?: number;
  linkColor?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  customNodeColors?: Record<string, string>;
  dynamicColorThemes?: Record<string, Record<string, string>>;
  onCreditsClick?: () => void;
  layoutType?: '3d-sphere' | '3d-network';
  sortMode?: 'alphabetical' | 'category' | 'connections' | 'none';
  centerNodeId?: string | null;
  nodePositioningEnabled?: boolean;
  repulsionForce?: number;
  linkStrength?: number;
  gravity?: number;
  onRepulsionForceChange?: (force: number) => void;
  onLinkStrengthChange?: (strength: number) => void;
  onGravityChange?: (gravity: number) => void;
}

const ThreeDVisualization: React.FC<ThreeDVisualizationProps> = ({
  nodeData,
  linkData,
  colorTheme = 'default',
  nodeSize = 1,
  linkColor = '#999999',
  backgroundColor = '#f5f5f5',
  backgroundOpacity = 1,
  customNodeColors = {},
  dynamicColorThemes = {},
  onCreditsClick,
  layoutType: initialLayoutType = '3d-sphere',
  sortMode = 'none',
  centerNodeId = null,
  nodePositioningEnabled = false,
  repulsionForce: initialRepulsionForce = 100,
  linkStrength: initialLinkStrength = 0.5,
  gravity: initialGravity = 0.1,
  onRepulsionForceChange,
  onLinkStrengthChange,
  onGravityChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  // 3D state
  const [layoutType, setLayoutType] = useState<'3d-sphere' | '3d-network'>(initialLayoutType);
  const [currentSortMode, setCurrentSortMode] = useState<'alphabetical' | 'category' | 'connections' | 'none'>(sortMode);
  const [currentCenterNode, setCurrentCenterNode] = useState<string | null>(centerNodeId);
  const [localNodeSize, setLocalNodeSize] = useState(nodeSize);
  const [rotationSpeed, setRotationSpeed] = useState(0.001);
  const [showLabels, setShowLabels] = useState(false);
  const [isNodePositioningEnabled, setIsNodePositioningEnabled] = useState(nodePositioningEnabled);
  const [currentColorTheme, setCurrentColorTheme] = useState(colorTheme);
  
  // Force physics parameters
  const [repulsionForce, setRepulsionForce] = useState(initialRepulsionForce);
  const [linkStrength, setLinkStrength] = useState(initialLinkStrength);
  const [gravity, setGravity] = useState(initialGravity);
  
  // Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  
  // Node and link object references
  const nodeObjectsRef = useRef<THREE.Mesh[]>([]);
  const linkObjectsRef = useRef<THREE.Line[]>([]);
  const nodeLabelsRef = useRef<THREE.Sprite[]>([]);
  
  // Tracking for interaction
  const draggedNodeRef = useRef<THREE.Mesh | null>(null);
  const isDraggingNodeRef = useRef<boolean>(false);
  const dragStartPositionRef = useRef<{x: number, y: number}>({x: 0, y: 0});
  const isDraggingViewRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{x: number, y: number}>({x: 0, y: 0});
  
  // Track whether forces have been initialized
  const forcesInitializedRef = useRef<boolean>(false);
  
  // Update nodePositioningEnabled when prop changes
  useEffect(() => {
    setIsNodePositioningEnabled(nodePositioningEnabled);
  }, [nodePositioningEnabled]);
  
  // Update layout type when prop changes
  useEffect(() => {
    if (initialLayoutType !== layoutType) {
      setLayoutType(initialLayoutType);
      resetVisualization();
    }
  }, [initialLayoutType]);
  
  // Update sort mode when prop changes
  useEffect(() => {
    if (sortMode !== currentSortMode) {
      setCurrentSortMode(sortMode);
      if (layoutType === '3d-sphere') {
        resetVisualization();
      }
    }
  }, [sortMode]);
  
  // Update center node when prop changes
  useEffect(() => {
    if (centerNodeId !== currentCenterNode) {
      setCurrentCenterNode(centerNodeId);
      if (layoutType === '3d-sphere') {
        resetVisualization();
      }
    }
  }, [centerNodeId]);
  
  // Update physics parameters when props change
  useEffect(() => {
    if (initialRepulsionForce !== repulsionForce) {
      setRepulsionForce(initialRepulsionForce);
    }
  }, [initialRepulsionForce]);
  
  useEffect(() => {
    if (initialLinkStrength !== linkStrength) {
      setLinkStrength(initialLinkStrength);
    }
  }, [initialLinkStrength]);
  
  useEffect(() => {
    if (initialGravity !== gravity) {
      setGravity(initialGravity);
    }
  }, [initialGravity]);
  
  // Update color theme when prop changes
  useEffect(() => {
    if (colorTheme !== currentColorTheme) {
      setCurrentColorTheme(colorTheme);
      updateNodeColors();
    }
  }, [colorTheme]);
  
  // Convert hex color to THREE.Color
  const hexToThreeColor = (hex: string): THREE.Color => {
    return new THREE.Color(hex);
  };
  
  // Get node color from theme or custom colors
  const getNodeColor = (node: Node): THREE.Color => {
    // First check for custom node color
    if (customNodeColors[node.id]) {
      return hexToThreeColor(customNodeColors[node.id]);
    }
    
    // Use the category color from current theme
    const currentTheme = dynamicColorThemes[currentColorTheme] || dynamicColorThemes.default || {};
    const color = currentTheme[node.category] || '#95a5a6';
    return hexToThreeColor(color);
  };
  
  // Update node colors based on current theme
  const updateNodeColors = () => {
    if (nodeObjectsRef.current.length === 0 || !nodeData.length) return;
    
    try {
      // Update each node's material color
      nodeObjectsRef.current.forEach((nodeMesh, index) => {
        if (index < nodeData.length) {
          const node = nodeData[index];
          const material = nodeMesh.material as THREE.MeshStandardMaterial;
          if (material) {
            material.color = getNodeColor(node);
            material.needsUpdate = true;
          }
        }
      });
      
      // Also update the link color if needed
      const linkMaterial = new THREE.Color(linkColor);
      linkObjectsRef.current.forEach(link => {
        const material = link.material as THREE.LineBasicMaterial;
        if (material) {
          material.color = linkMaterial;
          material.needsUpdate = true;
        }
      });
      
      toast({
        title: "Colors Updated",
        description: `Applied ${currentColorTheme} color theme`
      });
    } catch (error) {
      console.error("Error updating node colors:", error);
    }
  };
  
  // Handle layout type change
  const handleLayoutTypeChange = (type: '3d-sphere' | '3d-network') => {
    if (type === layoutType) return; // No change needed
    
    setLayoutType(type);
    toast({
      title: `3D Layout Changed`,
      description: type === '3d-sphere' 
        ? "Using spherical layout - nodes arranged in a spherical pattern" 
        : "Using network layout - force-directed graph in 3D space with node positioning"
    });
    
    // Reset the forces initialized flag when changing layout
    forcesInitializedRef.current = false;
    
    resetVisualization();
  };
  
  // Handle sort mode change
  const handleSortModeChange = (mode: 'alphabetical' | 'category' | 'connections' | 'none') => {
    if (mode === currentSortMode) return; // No change needed
    
    setCurrentSortMode(mode);
    
    let description = "Nodes arranged in default order";
    if (mode === 'alphabetical') description = "Nodes arranged alphabetically by ID";
    if (mode === 'category') description = "Nodes arranged by category groups";
    if (mode === 'connections') description = "Nodes arranged by connection count (most connected first)";
    
    toast({
      title: "Sphere Ordering Changed",
      description
    });
    
    // Only reset if we're in sphere layout
    if (layoutType === '3d-sphere') {
      resetVisualization();
    }
  };
  
  // Handle center node change
  const handleCenterNodeChange = (nodeId: string | null) => {
    if (nodeId === currentCenterNode) return; // No change needed
    
    setCurrentCenterNode(nodeId);
    
    toast({
      title: nodeId ? "Center Node Set" : "Center Node Removed",
      description: nodeId 
        ? `Node "${nodeId}" placed at center of sphere for centrality analysis` 
        : "Reverting to balanced sphere layout with no central node"
    });
    
    // Only reset if we're in sphere layout
    if (layoutType === '3d-sphere') {
      resetVisualization();
    }
  };
  
  // Handle repulsion force change
  const handleRepulsionForceChange = (force: number) => {
    setRepulsionForce(force);
    
    if (onRepulsionForceChange) {
      onRepulsionForceChange(force);
    } else {
      toast({
        title: "Repulsion Force Updated",
        description: `Force set to ${force}`
      });
    }
  };
  
  // Handle link strength change
  const handleLinkStrengthChange = (strength: number) => {
    setLinkStrength(strength);
    
    if (onLinkStrengthChange) {
      onLinkStrengthChange(strength);
    } else {
      toast({
        title: "Link Strength Updated",
        description: `Strength set to ${strength.toFixed(2)}`
      });
    }
  };
  
  // Handle gravity change
  const handleGravityChange = (value: number) => {
    setGravity(value);
    
    if (onGravityChange) {
      onGravityChange(value);
    } else {
      toast({
        title: "Gravity Updated",
        description: `Gravity set to ${value.toFixed(2)}`
      });
    }
  };
  
  // Handle node positioning toggle
  const handleNodePositioningToggle = () => {
    setIsNodePositioningEnabled(!isNodePositioningEnabled);
    
    toast({
      title: isNodePositioningEnabled ? "Node Positioning Disabled" : "Node Positioning Enabled",
      description: isNodePositioningEnabled 
        ? "Click and drag will rotate the view" 
        : "Click and drag on nodes to position them. Toggle off to rotate view."
    });
  };
  
  // Handle color theme change
  const handleColorThemeChange = (theme: string) => {
    setCurrentColorTheme(theme);
    updateNodeColors();
    
    toast({
      title: "Color Theme Changed",
      description: `Applied ${theme} color theme`
    });
  };
  
  // Handle panning the view
  const handlePan = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!sceneRef.current) return;
    
    const nodesGroup = sceneRef.current.getObjectByName('nodesGroup');
    const linksGroup = sceneRef.current.getObjectByName('linksGroup');
    
    if (!nodesGroup || !linksGroup) return;
    
    const panAmount = 10;
    
    switch (direction) {
      case 'up':
        nodesGroup.position.y += panAmount;
        linksGroup.position.y += panAmount;
        break;
      case 'down':
        nodesGroup.position.y -= panAmount;
        linksGroup.position.y -= panAmount;
        break;
      case 'left':
        nodesGroup.position.x -= panAmount;
        linksGroup.position.x -= panAmount;
        break;
      case 'right':
        nodesGroup.position.x += panAmount;
        linksGroup.position.x += panAmount;
        break;
    }
    
    toast({
      title: "View Panned",
      description: `Panned ${direction}`
    });
  };
  
  // Reset visualization
  const resetVisualization = () => {
    // Cleanup existing renderer
    if (rendererRef.current && containerRef.current) {
      containerRef.current.removeChild(rendererRef.current.domElement);
      rendererRef.current = null;
    }
    
    // Reset all references
    sceneRef.current = null;
    cameraRef.current = null;
    nodeObjectsRef.current = [];
    linkObjectsRef.current = [];
    nodeLabelsRef.current = [];
    
    // Reset forces initialized flag
    forcesInitializedRef.current = false;
    
    // Trigger recreation
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 100);
  };
  
  // Handle node size change
  const handleNodeSizeChange = (size: number) => {
    setLocalNodeSize(size);
    
    // Update existing nodes if available
    if (nodeObjectsRef.current.length > 0) {
      nodeObjectsRef.current.forEach(mesh => {
        mesh.scale.set(size, size, size);
      });
      
      toast({
        title: "Node Size Changed",
        description: `Node size set to ${size.toFixed(1)}`
      });
    }
  };
  
  // Reset view
  const handleResetView = () => {
    if (cameraRef.current) {
      // Reset camera position
      cameraRef.current.position.set(0, 0, 150);
      cameraRef.current.lookAt(0, 0, 0);
      
      // Reset rotation and position
      if (sceneRef.current) {
        const nodesGroup = sceneRef.current.getObjectByName('nodesGroup');
        const linksGroup = sceneRef.current.getObjectByName('linksGroup');
        
        if (nodesGroup) {
          nodesGroup.rotation.set(0, 0, 0);
          nodesGroup.position.set(0, 0, 0);
        }
        if (linksGroup) {
          linksGroup.rotation.set(0, 0, 0);
          linksGroup.position.set(0, 0, 0);
        }
      }
      
      // Reset physics parameters if in network layout
      if (layoutType === '3d-network') {
        // Reset force parameters to defaults
        setRepulsionForce(100);
        setLinkStrength(0.5);
        setGravity(0.1);
        
        // Reset fixed nodes
        nodeObjectsRef.current.forEach(node => {
          node.userData.isFixed = false;
        });
        
        // Redistribute node positions
        distributeNodesRandomly();
        
        toast({
          title: "View and Physics Reset",
          description: "Camera position, physics parameters and fixed nodes have been reset"
        });
      } else {
        toast({
          title: "View Reset",
          description: "Camera position has been reset to default view"
        });
      }
    }
  };
  
  // Redistribute nodes randomly in the 3D space (for network layout)
  const distributeNodesRandomly = () => {
    if (layoutType !== '3d-network' || nodeObjectsRef.current.length === 0) return;
    
    try {
      // Redistribute nodes in a more spaced out manner
      nodeObjectsRef.current.forEach((nodeMesh, index) => {
        // Position within a sphere of radius 100
        const radius = 50 + Math.random() * 50;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        nodeMesh.position.set(x, y, z);
        
        // Update label position
        if (index < nodeLabelsRef.current.length) {
          nodeLabelsRef.current[index].position.copy(nodeMesh.position);
        }
      });
      
      // Update link positions
      updateLinkPositions();
    } catch (error) {
      console.error("Error redistributing nodes:", error);
    }
  };
  
  // Update link positions based on current node positions
  const updateLinkPositions = () => {
    try {
      linkObjectsRef.current.forEach(link => {
        if (!link.userData || !link.userData.sourceId || !link.userData.targetId) return;
        
        const sourceId = link.userData.sourceId;
        const targetId = link.userData.targetId;
        
        const sourceNode = nodeObjectsRef.current.find(n => n.userData && n.userData.nodeId === sourceId);
        const targetNode = nodeObjectsRef.current.find(n => n.userData && n.userData.nodeId === targetId);
        
        if (sourceNode && targetNode) {
          const positions = [
            new THREE.Vector3().copy(sourceNode.position),
            new THREE.Vector3().copy(targetNode.position)
          ];
          
          const geometry = new THREE.BufferGeometry().setFromPoints(positions);
          if (link.geometry) link.geometry.dispose();
          link.geometry = geometry;
        }
      });
    } catch (error) {
      console.error("Error updating link positions:", error);
    }
  };
  
  // Sort nodes based on the sort mode
  const getSortedNodes = (nodes: Node[]) => {
    if (currentSortMode === 'none') return nodes;
    
    const nodesCopy = [...nodes];
    
    switch (currentSortMode) {
      case 'alphabetical':
        return nodesCopy.sort((a, b) => a.id.localeCompare(b.id));
      
      case 'category':
        return nodesCopy.sort((a, b) => {
          // First sort by category
          const catComp = a.category.localeCompare(b.category);
          // If same category, sort by id
          return catComp !== 0 ? catComp : a.id.localeCompare(b.id);
        });
        
      case 'connections':
        // Count connections for each node
        { const connectionCounts: Record<string, number> = {};
        linkData.forEach(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          
          connectionCounts[sourceId] = (connectionCounts[sourceId] || 0) + 1;
          connectionCounts[targetId] = (connectionCounts[targetId] || 0) + 1;
        });
        
        // Sort by connection count (descending)
        return nodesCopy.sort((a, b) => {
          const aCount = connectionCounts[a.id] || 0;
          const bCount = connectionCounts[b.id] || 0;
          return bCount - aCount;
        }); }
        
      default:
        return nodesCopy;
    }
  };
  
// Completely revised showTooltip function for 3D visualization
const showTooltip = (
    hoveredMesh: THREE.Mesh,
    node: Node,
    connections: {to: string[], from: string[]}
  ) => {
    if (!tooltipRef.current || !containerRef.current || !cameraRef.current || !rendererRef.current) return;
    
    // Build tooltip content
    let tooltipContent = `<strong>${node.id}</strong><br>Category: ${node.category}<br>`;
    tooltipContent += `Connections: ${connections.to.length + connections.from.length}<br><br>`;
    
    // Add interaction hint based on layout and mode
    if (layoutType === '3d-network' && isNodePositioningEnabled) {
      tooltipContent += `<em>Click and drag to reposition node</em>`;
    }
    
    // Get 3D position of the node
    const nodePosition = hoveredMesh.position.clone();
    
    // Project to 2D screen coordinates
    const screenPosition = project3DPositionTo2D(
      nodePosition,
      cameraRef.current,
      rendererRef.current
    );
    
    // Set content and make temporarily visible but transparent for size calculation
    const tooltip = tooltipRef.current;
    tooltip.innerHTML = tooltipContent;
    tooltip.style.visibility = "visible";
    tooltip.style.opacity = "0";
    
    // Force layout calculation to get accurate dimensions
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    
    // Get container dimensions and position
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calculate position relative to container
    let xPosition = screenPosition.x;
    let yPosition = screenPosition.y - tooltipHeight - 10; // Position above the node
    
    // Add buffer margin
    const buffer = 10;
    
    // Boundary checks to keep tooltip inside container
    if (xPosition + tooltipWidth + buffer > containerRect.width) {
      xPosition = Math.max(buffer, screenPosition.x - tooltipWidth);
    }
    
    if (yPosition < buffer) {
      yPosition = screenPosition.y + 20; // Position below the node instead
    }
    
    // Ensure tooltip doesn't go off the edges
    xPosition = Math.max(buffer, Math.min(xPosition, containerRect.width - tooltipWidth - buffer));
    yPosition = Math.max(buffer, Math.min(yPosition, containerRect.height - tooltipHeight - buffer));
    
    // Position tooltip and make visible
    tooltip.style.left = `${xPosition}px`;
    tooltip.style.top = `${yPosition}px`;
    tooltip.style.opacity = "1";
  };
  
  // Hide tooltip
  const hideTooltip = () => {
    if (!tooltipRef.current) return;
    tooltipRef.current.style.opacity = "0";
    tooltipRef.current.style.visibility = "hidden";
  };
  
// Add a new function for projecting 3D coordinates to 2D screen space
const project3DPositionTo2D = (
    position: THREE.Vector3,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer
  ): { x: number, y: number } => {
    // Clone position to avoid modifying the original
    const pos = position.clone();
    
    // Project 3D position to normalized device coordinates (NDC)
    pos.project(camera);
    
    // Calculate viewport position
    const widthHalf = renderer.domElement.clientWidth / 2;
    const heightHalf = renderer.domElement.clientHeight / 2;
    
    // Convert to screen coordinates
    const x = (pos.x * widthHalf) + widthHalf;
    const y = -(pos.y * heightHalf) + heightHalf;
    
    return { x, y };
  };

// Move tooltip with mouse, with improved positioning
const moveTooltip = (event: MouseEvent) => {
    if (!tooltipRef.current || !containerRef.current) return;
    
    const tooltip = tooltipRef.current;
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Get current tooltip dimensions
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    
    // Calculate position relative to container
    const absX = event.clientX;
    const absY = event.clientY;
    
    // Translate to position within the container
    let xPosition = absX - containerRect.left + 15;
    let yPosition = absY - containerRect.top - 10;
    
    // Add buffer margin
    const buffer = 10;
    
    // Boundary checks
    if (xPosition + tooltipWidth + buffer > containerRect.width) {
      xPosition = absX - containerRect.left - tooltipWidth - buffer;
    }
    
    if (yPosition + tooltipHeight + buffer > containerRect.height) {
      yPosition = absY - containerRect.top - tooltipHeight - buffer;
    }
    
    if (xPosition < buffer) xPosition = buffer;
    if (yPosition < buffer) yPosition = buffer;
    
    // Update tooltip position
    tooltip.style.left = `${xPosition}px`;
    tooltip.style.top = `${yPosition}px`;
  };
  
  // Find node connections
  const findNodeConnections = (nodeId: string) => {
    const toConnections: string[] = [];
    const fromConnections: string[] = [];
    
    linkData.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (sourceId === nodeId) {
        toConnections.push(targetId);
      }
      
      if (targetId === nodeId) {
        fromConnections.push(sourceId);
      }
    });
    
    return { to: toConnections, from: fromConnections };
  };
  
  // Create node labels
  const createNodeLabels = (
    node: Node, 
    position: THREE.Vector3, 
    scene: THREE.Scene,
    visible: boolean = false
  ): THREE.Sprite => {
    // Create a canvas for the label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    
    canvas.width = 256;
    canvas.height = 128;
    
    // Style the text
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = '24px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText(node.id, canvas.width / 2, canvas.height / 2);
    
    // Create a texture from the canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create sprite material using the texture
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true 
    });
    
    // Create and position the sprite
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(10, 5, 1);
    sprite.visible = visible;
    
    // Store node reference for later interaction
    sprite.userData = { nodeId: node.id };
    
    scene.add(sprite);
    return sprite;
  };

  // IMPROVED: Calculate forces for network layout with stability measures
  const calculateForces = () => {
    if (layoutType !== '3d-network' || nodeObjectsRef.current.length === 0) return;
    
    // Set forces initialized flag to true
    if (!forcesInitializedRef.current) {
      console.log("Initializing force simulation for 3D network layout");
      forcesInitializedRef.current = true;
    }
    
    // If we have very few nodes, use a simpler layout
    if (nodeObjectsRef.current.length <= 10) {
      // For small networks, use a simple circular layout once
      if (!forcesInitializedRef.current) {
        distributeNodesRandomly();
        forcesInitializedRef.current = true;
      }
      return;
    }
    
    const nodeObjects = nodeObjectsRef.current;
    const linkObjects = linkObjectsRef.current;
    
    // Define force parameters
    const forceParams = {
      repulsion: repulsionForce,
      linkDistance: 40,
      linkStrength: linkStrength,
      gravity: gravity,
      damping: 0.85,  // Damping factor for movement
      maxSpeed: 2.0   // Maximum movement speed per frame
    };
    
    try {
      // Process each node
      for (let i = 0; i < nodeObjects.length; i++) {
        const nodeMesh = nodeObjects[i];
        
        // Skip fixed nodes
        if (nodeMesh.userData?.isFixed) continue;
        
        const nodeId = nodeMesh.userData?.nodeId;
        if (!nodeId) continue; // Skip nodes without ID
        
        // Initialize force components
        let fx = 0, fy = 0, fz = 0;
        
        // 1. Apply repulsive forces between nodes (avoid extreme forces)
        for (let j = 0; j < nodeObjects.length; j++) {
          if (i === j) continue;
          
          const otherMesh = nodeObjects[j];
          
          // Calculate vector between nodes
          const dx = nodeMesh.position.x - otherMesh.position.x;
          const dy = nodeMesh.position.y - otherMesh.position.y;
          const dz = nodeMesh.position.z - otherMesh.position.z;
          
          // Calculate distance with minimum threshold to avoid extreme forces
          const distanceSq = dx * dx + dy * dy + dz * dz;
          const distance = Math.sqrt(distanceSq) || 0.1; // Minimum distance of 0.1
          
          if (distance <= 0.1) continue; // Skip if too close
          
          // Improved repulsion formula with better stability
          // Force is stronger when close, but limited to avoid explosions
          const force = Math.min(forceParams.repulsion / (distance + 5), 10);
          
          // Add to force components
          fx += (dx / distance) * force;
          fy += (dy / distance) * force;
          fz += (dz / distance) * force;
        }
        
        // 2. Apply attractive forces along links
        for (const linkMesh of linkObjects) {
          if (!linkMesh.userData) continue;
          
          const sourceId = linkMesh.userData.sourceId;
          const targetId = linkMesh.userData.targetId;
          
          if (sourceId === nodeId || targetId === nodeId) {
            // Find the other node
            const otherId = sourceId === nodeId ? targetId : sourceId;
            const otherMesh = nodeObjects.find(n => n.userData?.nodeId === otherId);
            
            if (!otherMesh) continue;
            
            // Calculate vector between nodes
            const dx = otherMesh.position.x - nodeMesh.position.x;
            const dy = otherMesh.position.y - nodeMesh.position.y;
            const dz = otherMesh.position.z - nodeMesh.position.z;
            
            // Calculate distance with minimum threshold
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.1;
            
            if (distance <= 0.1) continue; // Skip if too close
            
            // Calculate spring force (proportional to distance from ideal length)
            const displacement = distance - forceParams.linkDistance;
            
            // Limit spring force to reasonable range
            const springForce = Math.min(Math.max(displacement * forceParams.linkStrength, -5), 5);
            
            // Add to force components
            fx += (dx / distance) * springForce;
            fy += (dy / distance) * springForce;
            fz += (dz / distance) * springForce;
          }
        }
        
        // 3. Apply gravity towards center (proportional to distance)
        const centerDist = Math.sqrt(
          nodeMesh.position.x * nodeMesh.position.x + 
          nodeMesh.position.y * nodeMesh.position.y + 
          nodeMesh.position.z * nodeMesh.position.z
        ) || 0.1;
        
        if (centerDist > 0.1) {
          const gravityForce = forceParams.gravity * centerDist * 0.1;
          fx -= (nodeMesh.position.x / centerDist) * gravityForce;
          fy -= (nodeMesh.position.y / centerDist) * gravityForce;
          fz -= (nodeMesh.position.z / centerDist) * gravityForce;
        }
        
        // 4. Apply damping to forces
        fx *= forceParams.damping;
        fy *= forceParams.damping;
        fz *= forceParams.damping;
        
        // 5. Calculate magnitude of movement
        const moveMagnitude = Math.sqrt(fx * fx + fy * fy + fz * fz);
        
        // 6. Apply speed limit if needed
        if (moveMagnitude > forceParams.maxSpeed) {
          const scale = forceParams.maxSpeed / moveMagnitude;
          fx *= scale;
          fy *= scale;
          fz *= scale;
        }
        
        // 7. Update node position
        nodeMesh.position.x += fx;
        nodeMesh.position.y += fy;
        nodeMesh.position.z += fz;
        
        // 8. Update corresponding label position
        const labelIndex = nodeData.findIndex(n => n.id === nodeId);
        if (labelIndex >= 0 && labelIndex < nodeLabelsRef.current.length) {
          const label = nodeLabelsRef.current[labelIndex];
          if (label) {
            label.position.copy(nodeMesh.position);
          }
        }
      }
      
      // Update all link positions after node movements
      updateLinkPositions();
      
    } catch (error) {
      console.error("Error calculating forces:", error);
      forcesInitializedRef.current = false; // Reset flag if we had an error
    }
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || nodeData.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Get container dimensions
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(backgroundColor);
      sceneRef.current = scene;
      
      // Create camera
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.z = 150;
      cameraRef.current = camera;
      
      // Create renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      
      // Create groups for nodes and links
      const nodesGroup = new THREE.Group();
      nodesGroup.name = 'nodesGroup';
      scene.add(nodesGroup);
      
      const linksGroup = new THREE.Group();
      linksGroup.name = 'linksGroup';
      scene.add(linksGroup);
      
      // Create a scaled sphere geometry for nodes
      const sphereGeometry = new THREE.SphereGeometry(5, 16, 16);
      const nodeObjects: THREE.Mesh[] = [];
      const labelObjects: THREE.Sprite[] = [];
      
      // Create node positions
      const nodePositions: { [id: string]: THREE.Vector3 } = {};
      
      // Sort nodes if needed for sphere layout
      let nodesToProcess = nodeData;
      if (layoutType === '3d-sphere') {
        nodesToProcess = getSortedNodes(nodeData);
      }
      
      // Find center node if specified
      let centerNodeIndex = -1;
      if (currentCenterNode && layoutType === '3d-sphere') {
        centerNodeIndex = nodesToProcess.findIndex(node => node.id === currentCenterNode);
      }
      
      // Process center node first if it exists
      if (centerNodeIndex !== -1 && layoutType === '3d-sphere') {
        // Move center node to beginning of array
        const centerNode = nodesToProcess.splice(centerNodeIndex, 1)[0];
        nodesToProcess = [centerNode, ...nodesToProcess];
      }
      
      // Create nodes
      nodesToProcess.forEach((node, index) => {
        // Create node material with appropriate color
        const nodeMaterial = new THREE.MeshStandardMaterial({ 
          color: getNodeColor(node),
          roughness: 0.7,
          metalness: 0.3
        });
        
        const mesh = new THREE.Mesh(sphereGeometry, nodeMaterial);
        mesh.scale.set(localNodeSize, localNodeSize, localNodeSize);
        
        // Position node based on selected layout
        let position;
        if (layoutType === '3d-network') {
          // Network layout: more distributed positions in a sphere volume
          const radius = 50 + Math.random() * 50;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          
          position = new THREE.Vector3(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.sin(phi) * Math.sin(theta),
            radius * Math.cos(phi)
          );
        } else {
          // Sphere layout: distribute nodes evenly on a sphere surface
          if (index === 0 && currentCenterNode) {
            // Center node at the origin
            position = new THREE.Vector3(0, 0, 0);
          } else {
            // Distribute other nodes on the sphere
            // Use golden spiral algorithm for even distribution
            const offset = currentCenterNode ? 1 : 0;
            const actualIndex = index - offset;
            const totalNodes = nodesToProcess.length - offset;
            
            const phi = Math.acos(-1 + (2 * actualIndex) / totalNodes);
            const theta = Math.sqrt(totalNodes * Math.PI) * phi;
            
            position = new THREE.Vector3(
              50 * Math.cos(theta) * Math.sin(phi),
              50 * Math.sin(theta) * Math.sin(phi),
              50 * Math.cos(phi)
            );
          }
        }
        
        mesh.position.copy(position);
        nodePositions[node.id] = position;
        
        // Store the node data for interaction
        mesh.userData = { 
          nodeId: node.id,
          category: node.category,
          isDraggable: layoutType === '3d-network',
          isFixed: false
        };
        
        nodesGroup.add(mesh);
        nodeObjects.push(mesh);
        
        // Create label for this node
        const label = createNodeLabels(node, position, scene, showLabels);
        labelObjects.push(label);
      });
      
      nodeObjectsRef.current = nodeObjects;
      nodeLabelsRef.current = labelObjects;
      
      // Create links
      const linkObjects: THREE.Line[] = [];
      const linkMaterial = new THREE.LineBasicMaterial({ 
        color: hexToThreeColor(linkColor),
        opacity: 0.7,
        transparent: true
      });
      
      linkData.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if (!nodePositions[sourceId] || !nodePositions[targetId]) return;
        
        try {
          // Create line geometry
          const geometry = new THREE.BufferGeometry().setFromPoints([
            nodePositions[sourceId],
            nodePositions[targetId]
          ]);
          
          const line = new THREE.Line(geometry, linkMaterial);
          // Store connection data
          line.userData = {
            sourceId,
            targetId
          };
          
          linksGroup.add(line);
          linkObjects.push(line);
        } catch (error) {
          console.error(`Error creating link from ${sourceId} to ${targetId}:`, error);
        }
      });
      
      linkObjectsRef.current = linkObjects;
      
      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      
      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);
      
      // Set up raycaster for node interaction
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      let intersectedObject: THREE.Mesh | null = null;
      
// Updated mouse move handler in the useEffect that initializes Three.js scene
const handleMouseMove = (event: MouseEvent) => {
    // Skip raycasting when dragging a node
    if (isDraggingNodeRef.current && draggedNodeRef.current) {
      return;
    }
    
    // Calculate mouse position in normalized device coordinates
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;
    mouse.x = (event.offsetX / width) * 2 - 1;
    mouse.y = -(event.offsetY / height) * 2 + 1;
    
    // Update the raycaster
    raycaster.setFromCamera(mouse, camera);
    
    // Find intersections with nodes
    const intersects = raycaster.intersectObjects(nodeObjects);
    
    // If we were hovering over an object and now we're not
    if (intersects.length === 0) {
      if (intersectedObject) {
        // Reset the node appearance
        const material = intersectedObject.material as THREE.MeshStandardMaterial;
        if (material) {
          material.emissive.set(0x000000);
          material.needsUpdate = true;
        }
        intersectedObject = null;
        hideTooltip();
      }
      return;
    }
    
    // We're hovering over a node
    const hoveredMesh = intersects[0].object as THREE.Mesh;
    
    // If it's a different node than before
    if (intersectedObject !== hoveredMesh) {
      // Reset old intersected object if it exists
      if (intersectedObject) {
        const material = intersectedObject.material as THREE.MeshStandardMaterial;
        if (material) {
          material.emissive.set(0x000000);
          material.needsUpdate = true;
        }
      }
      
      // Highlight new intersected object
      intersectedObject = hoveredMesh;
      const material = intersectedObject.material as THREE.MeshStandardMaterial;
      if (material) {
        material.emissive.set(0x333333);
        material.needsUpdate = true;
      }
      
      // Show tooltip
      const nodeId = hoveredMesh.userData.nodeId;
      const node = nodeData.find(n => n.id === nodeId);
      
      if (node) {
        const connections = findNodeConnections(node.id);
        showTooltip(hoveredMesh, node, connections);
      }
    }
  };
      
      const handleClick = (event: MouseEvent) => {
        // Only handle left-click
        if (event.button !== 0) return;
        
        // Calculate mouse position in normalized device coordinates
        mouse.x = (event.clientX / width) * 2 - 1;
        mouse.y = - (event.clientY / height) * 2 + 1;
        
        // Update the raycaster
        raycaster.setFromCamera(mouse, camera);
        
        // Find intersections with nodes
        const intersects = raycaster.intersectObjects(nodeObjects);
        
        if (intersects.length > 0) {
          const clickedMesh = intersects[0].object as THREE.Mesh;
          const nodeId = clickedMesh.userData.nodeId;
          
          toast({
            title: "Node Selected",
            description: `Node: ${nodeId}`,
          });
        }
      };
      
      // Mouse down handler with improved error handling
      const handleMouseDown = (event: MouseEvent) => {
        try {
          // Only handle left button
          if (event.button !== 0) return;
          
          // Calculate mouse position in normalized device coordinates
          mouse.x = (event.clientX / width) * 2 - 1;
          mouse.y = - (event.clientY / height) * 2 + 1;
          
          // Update the raycaster
          raycaster.setFromCamera(mouse, camera);
          
          // Find intersections with nodes
          const intersects = raycaster.intersectObjects(nodeObjects);
          
          if (intersects.length > 0 && isNodePositioningEnabled && layoutType === '3d-network') {
            // We hit a node and we're in node positioning mode
            const nodeMesh = intersects[0].object as THREE.Mesh;
            
            isDraggingNodeRef.current = true;
            draggedNodeRef.current = nodeMesh;
            dragStartPositionRef.current = { x: event.clientX, y: event.clientY };
            
            // Set the node as fixed
            if (nodeMesh.userData) {
              nodeMesh.userData.isFixed = true;
            }
            
            // Highlight the dragged node
            const material = nodeMesh.material as THREE.MeshStandardMaterial;
            if (material) {
              material.emissive.set(0x666666);
              material.needsUpdate = true;
            }
          } else {
            // Start rotating the view
            isDraggingViewRef.current = true;
            previousMousePositionRef.current = { x: event.clientX, y: event.clientY };
          }
        } catch (error) {
          console.error("Error in mouse down handler:", error);
        }
      };
      
      // Mouse move handler with improved stability
      const handleMouseDrag = (event: MouseEvent) => {
        try {
          if (isDraggingNodeRef.current && draggedNodeRef.current && cameraRef.current) {
            // We're repositioning a node
            
            // Get camera direction vectors
            const camera = cameraRef.current;
            
            // Create movement vectors in camera space
            const dragX = (event.clientX - dragStartPositionRef.current.x) * 0.1;
            const dragY = (event.clientY - dragStartPositionRef.current.y) * 0.1;
            
            // Get camera right and up vectors
            const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
            const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
            
            // Apply movement in camera space with more controllable speed
            draggedNodeRef.current.position.add(cameraRight.multiplyScalar(dragX));
            draggedNodeRef.current.position.add(cameraUp.multiplyScalar(-dragY)); // Invert Y for natural feel
            
            // Update corresponding label
            const nodeId = draggedNodeRef.current.userData.nodeId;
            const labelIndex = nodeData.findIndex(n => n.id === nodeId);
            if (labelIndex >= 0 && labelIndex < nodeLabelsRef.current.length) {
              const label = nodeLabelsRef.current[labelIndex];
              if (label) {
                label.position.copy(draggedNodeRef.current.position);
              }
            }
            
            // Update links connected to this node
            updateLinkPositions();
            
            // Update start position for next move
            dragStartPositionRef.current = { x: event.clientX, y: event.clientY };
          } else if (isDraggingViewRef.current) {
            // We're rotating the view with improved sensitivity
            const deltaX = (event.clientX - previousMousePositionRef.current.x) * 0.003;
            const deltaY = (event.clientY - previousMousePositionRef.current.y) * 0.003;
            
            // Apply rotation with clamping to avoid flipping
            if (nodesGroup && linksGroup) {
              nodesGroup.rotation.y += deltaX;
              nodesGroup.rotation.x += deltaY;
              linksGroup.rotation.y += deltaX;
              linksGroup.rotation.x += deltaY;
              
              // Limit vertical rotation to avoid flipping
              nodesGroup.rotation.x = Math.max(Math.min(nodesGroup.rotation.x, Math.PI/2), -Math.PI/2);
              linksGroup.rotation.x = Math.max(Math.min(linksGroup.rotation.x, Math.PI/2), -Math.PI/2);
            }
            
            previousMousePositionRef.current = { x: event.clientX, y: event.clientY };
          }
        } catch (error) {
          console.error("Error in mouse drag handler:", error);
          // Reset drag state on error
          isDraggingNodeRef.current = false;
          isDraggingViewRef.current = false;
        }
      };
      
      // Mouse up handler
      const handleMouseUp = () => {
        try {
          if (isDraggingNodeRef.current && draggedNodeRef.current) {
            // Reset highlighting
            const material = draggedNodeRef.current.material as THREE.MeshStandardMaterial;
            if (material) {
              material.emissive.set(0x000000);
              material.needsUpdate = true;
            }
            
            // End the drag operation
            isDraggingNodeRef.current = false;
            draggedNodeRef.current = null;
          }
          
          isDraggingViewRef.current = false;
        } catch (error) {
          console.error("Error in mouse up handler:", error);
        }
      };
      
      // Improved wheel handler with smoother zoom
      const handleWheel = (event: WheelEvent) => {
        try {
          if (!cameraRef.current) return;
          
          const zoomSensitivity = 0.05; // Reduced for smoother zoom
          
          // Adjust camera position based on scroll direction
          cameraRef.current.position.z += event.deltaY * zoomSensitivity;
          
          // Clamp to prevent zooming too close or too far
          cameraRef.current.position.z = Math.max(20, Math.min(300, cameraRef.current.position.z));
          
          event.preventDefault();
        } catch (error) {
          console.error("Error in wheel handler:", error);
        }
      };
      
      // Disable context menu in the container
      const handleContextMenu = (event: MouseEvent) => {
        event.preventDefault();
      };
      
      // Add event listeners
      containerRef.current.addEventListener('mousemove', handleMouseMove);
      containerRef.current.addEventListener('click', handleClick);
      containerRef.current.addEventListener('mousedown', handleMouseDown);
      containerRef.current.addEventListener('mousemove', handleMouseDrag);
      containerRef.current.addEventListener('mouseup', handleMouseUp);
      containerRef.current.addEventListener('wheel', handleWheel, { passive: false });
      containerRef.current.addEventListener('contextmenu', handleContextMenu);
      
      // Animation loop with force calculation
      const animate = () => {
        const animationFrameId = requestAnimationFrame(animate);
        
        if (rendererRef.current && cameraRef.current && sceneRef.current) {
          try {
            // Auto-rotate when not being dragged (only for sphere layout or when not in positioning mode)
            if (!isDraggingViewRef.current && !isDraggingNodeRef.current && 
               (layoutType === '3d-sphere' || !isNodePositioningEnabled)) {
              nodesGroup.rotation.y += rotationSpeed;
              linksGroup.rotation.y += rotationSpeed;
            }
            
            // Apply force-directed layout for network mode
            if (layoutType === '3d-network') {
              // Only calculate forces if we're not dragging a node
              if (!isDraggingNodeRef.current) {
                calculateForces();
              }
            } else {
              // Just update label positions for sphere layout
              nodeLabelsRef.current.forEach((sprite, i) => {
                if (i < nodeObjects.length) {
                  const nodeMesh = nodeObjects[i];
                  if (sprite && nodeMesh) {
                    sprite.position.copy(nodeMesh.position);
                    sprite.visible = showLabels;
                  }
                }
              });
            }
            
            // Render the scene
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          } catch (error) {
            console.error("Error in animation loop:", error);
          }
        }
        
        return animationFrameId;
      };
      
      const animationFrameId = animate();
      
      setIsLoading(false);
      
      // Show toast with appropriate instructions
      const instructions = isNodePositioningEnabled && layoutType === '3d-network'
        ? 'Left-click and drag nodes to reposition them, toggle positioning mode off to rotate view.'
        : 'Left-click and drag to rotate, scroll to zoom.';
        
      toast({
        title: "3D Visualization Ready",
        description: `Using ${layoutType === '3d-sphere' ? 'Sphere' : 'Network'} layout. ${instructions}`,
      });
      
      // Clean up
      return () => {
        cancelAnimationFrame(animationFrameId);
        
        if (containerRef.current) {
          containerRef.current.removeEventListener('mousemove', handleMouseMove);
          containerRef.current.removeEventListener('click', handleClick);
          containerRef.current.removeEventListener('mousedown', handleMouseDown);
          containerRef.current.removeEventListener('mousemove', handleMouseDrag);
          containerRef.current.removeEventListener('mouseup', handleMouseUp);
          containerRef.current.removeEventListener('wheel', handleWheel);
          containerRef.current.removeEventListener('contextmenu', handleContextMenu);
        }
        
        if (rendererRef.current && containerRef.current) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
        
        // Dispose of geometries and materials
        sphereGeometry.dispose();
        nodeObjectsRef.current.forEach(node => {
          if (node.material instanceof THREE.Material) {
            node.material.dispose();
          }
        });
        
        linkObjectsRef.current.forEach(link => {
          if (link.geometry) {
            link.geometry.dispose();
          }
          if (link.material instanceof THREE.Material) {
            link.material.dispose();
          }
        });
        
        // Clear references
        sceneRef.current = null;
        cameraRef.current = null;
        rendererRef.current = null;
      };
    } catch (error) {
      console.error("Error initializing 3D visualization:", error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to initialize 3D visualization. Try a different visualization type.",
        variant: "destructive"
      });
    }
  }, [
    nodeData, 
    linkData, 
    localNodeSize, 
    linkColor, 
    backgroundColor, 
    backgroundOpacity, 
    customNodeColors, 
    dynamicColorThemes, 
    rotationSpeed, 
    showLabels, 
    toast, 
    colorTheme, 
    layoutType, 
    currentCenterNode, 
    currentSortMode,
    isNodePositioningEnabled,
    repulsionForce,
    linkStrength,
    gravity,
    currentColorTheme
  ]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      try {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        
        rendererRef.current.setSize(width, height);
      } catch (error) {
        console.error("Error handling resize:", error);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Update label visibility when showLabels changes
  useEffect(() => {
    nodeLabelsRef.current.forEach(sprite => {
      sprite.visible = showLabels;
    });
  }, [showLabels]);
  
  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative"
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="text-white text-center">
            <div className="h-8 w-8 border-2 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p>Loading 3D visualization...</p>
          </div>
        </div>
      )}

      {/* Tooltip div */}
      <div 
        ref={tooltipRef}
        className="absolute bg-black bg-opacity-85 text-white p-2 rounded shadow-lg z-50"
        style={{
          visibility: 'hidden',
          opacity: 0,
          transition: 'opacity 0.2s',
          maxWidth: '250px',
          pointerEvents: 'none'
        }}
      ></div>

      {/* 3D Controls Panel */}
      {!isLoading && (
        <ThreeDNetworkControls
          nodeSize={localNodeSize}
          rotationSpeed={rotationSpeed}
          repulsionForce={repulsionForce}
          linkStrength={linkStrength}
          gravity={gravity}
          showLabels={showLabels}
          colorTheme={currentColorTheme}
          layoutType={layoutType}
          sortMode={currentSortMode}
          centerNodeId={currentCenterNode}
          nodePositioningEnabled={isNodePositioningEnabled}
          availableNodes={nodeData}
          onNodeSizeChange={handleNodeSizeChange}
          onRotationSpeedChange={setRotationSpeed}
          onRepulsionForceChange={handleRepulsionForceChange}
          onLinkStrengthChange={handleLinkStrengthChange}
          onGravityChange={handleGravityChange}
          onToggleLabels={() => setShowLabels(!showLabels)}
          onLayoutTypeChange={handleLayoutTypeChange}
          onSortModeChange={handleSortModeChange}
          onCenterNodeChange={handleCenterNodeChange}
          onNodePositioningToggle={handleNodePositioningToggle}
          onResetView={handleResetView}
          onZoomIn={() => {
            if (cameraRef.current) {
              cameraRef.current.position.z -= 10;
              cameraRef.current.position.z = Math.max(10, cameraRef.current.position.z);
            }
          }}
          onZoomOut={() => {
            if (cameraRef.current) {
              cameraRef.current.position.z += 10;
              cameraRef.current.position.z = Math.min(300, cameraRef.current.position.z);
            }
          }}
          onColorThemeChange={handleColorThemeChange}
          onPanUp={() => handlePan('up')}
          onPanDown={() => handlePan('down')}
          onPanLeft={() => handlePan('left')}
          onPanRight={() => handlePan('right')}
        />
      )}
    </div>
  );
};

export default ThreeDVisualization;