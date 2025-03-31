/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable prefer-const */
import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Node, Link } from '@/types/networkTypes';
import { useToast } from "@/components/ui/use-toast";
import { 
  ArrowRightCircle,
  ArrowLeftCircle,
  Home,
  ArrowLeft,
  Info,
  Settings,
  RotateCcw,
  Target
} from 'lucide-react';
import { findNodeConnections, getConnectionDetails } from './TooltipUtils';
import FileButtons from './FileButtons';
import ZoomControls from './ZoomControls';
import { NetworkLegend } from './NetworkComponents';
import NodeNavMiniMap from './NodeNavMiniMap';

// Helper function to convert hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 245, g: 245, b: 245 }; // Default to #f5f5f5
};

interface NodeNavVisualizationProps {
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
  visualizationType?: string;
  onVisualizationTypeChange?: (type: string) => void;
  onDownloadData?: (format: string) => void;
  onDownloadGraph?: (format: string) => void;
  onResetSelection?: () => void;
}

const DEBUG_MOUSE = true; // Set to true to enable mouse debug logs
const debugLog = (message: string, ...data: unknown[]) => {
    if (DEBUG_MOUSE) {
      console.log(`[NetNav Debug] ${message}`, ...data);
    }
  };

const NodeNavVisualization: React.FC<NodeNavVisualizationProps> = ({
  nodeData,
  linkData,
  colorTheme = 'default',
  nodeSize = 1.5,
  linkColor = '#999999',
  backgroundColor = '#f5f5f5',
  backgroundOpacity = 1,
  customNodeColors = {},
  dynamicColorThemes = {},
  onCreditsClick,
  visualizationType,
  onVisualizationTypeChange,
  onDownloadData,
  onDownloadGraph,
  onResetSelection
}) => {
  // Debug node data format
  useEffect(() => {
    console.log("NodeNavVisualization: Data received", {
      nodeCount: nodeData.length,
      linkCount: linkData.length,
      sampleNode: nodeData.length > 0 ? nodeData[0] : null,
      sampleLink: linkData.length > 0 ? linkData[0] : null,
      nodeHasId: nodeData.length > 0 ? 'id' in nodeData[0] : false,
      nodeHasCategory: nodeData.length > 0 ? 'category' in nodeData[0] : false
    });
  }, [nodeData, linkData]);

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const nodeObjectRef = useRef<THREE.Mesh | null>(null);
  const edgeObjectsRef = useRef<THREE.Line[]>([]);
  const navButtonsRef = useRef<THREE.Group | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<string[]>([]);
  const isErrorRef = useRef(false);
  
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [visitedNodes, setVisitedNodes] = useState<Set<string>>(new Set());
  const [connectionLayout, setConnectionLayout] = useState<'circular' | 'clustered'>('circular');
  const [activeSettings, setActiveSettings] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionOverlayRef = useRef<HTMLDivElement | null>(null);

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
    const currentTheme = dynamicColorThemes[colorTheme] || dynamicColorThemes.default || {};
    const color = currentTheme[node.category] || '#95a5a6';
    return hexToThreeColor(color);
  };
  
  // Initialize with the first node
  useEffect(() => {
    if (nodeData.length > 0 && !currentNodeId) {
      try {
        // Find a valid node to start with
        let startNode;
        
        // First, try to find a "central" node (often themes or main topics)
        // Look for nodes with many connections
        const connectionCounts = new Map<string, number>();
        
        linkData.forEach(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          connectionCounts.set(sourceId, (connectionCounts.get(sourceId) || 0) + 1);
          
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          connectionCounts.set(targetId, (connectionCounts.get(targetId) || 0) + 1);
        });
        
        // Sort nodes by connection count
        const sortedNodes = [...nodeData].sort((a, b) => {
          const aCount = connectionCounts.get(a.id) || 0;
          const bCount = connectionCounts.get(b.id) || 0;
          return bCount - aCount;
        });
        
        // Get the node with the most connections
        startNode = sortedNodes[0];
        
        console.log(`Starting node navigation with: ${startNode.id} (${connectionCounts.get(startNode.id) || 0} connections)`);
        
        setCurrentNodeId(startNode.id);
        setVisitedNodes(new Set([startNode.id]));
        historyRef.current = [startNode.id];
        
        toast({
          title: "Node Navigator Started",
          description: `Starting with node: ${startNode.id}`
        });
      } catch (error) {
        console.error("Error initializing start node:", error);
        toast({
          title: "Initialization Error",
          description: "Failed to initialize start node",
          variant: "destructive"
        });
      }
    }
  }, [nodeData, currentNodeId, linkData, toast]);
  
  // Get current node connections
  const getCurrentNodeConnections = () => {
    if (!currentNodeId) return { outgoing: [], incoming: [] };
    
    const node = nodeData.find(n => n.id === currentNodeId);
    if (!node) return { outgoing: [], incoming: [] };
    
    // Use existing utility to find connections
    const { sourceLinks, targetLinks } = findNodeConnections(node, linkData);
    
    // Format the connection data
    const outgoing = sourceLinks.map(link => {
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      const targetNode = nodeData.find(n => n.id === targetId);
      return {
        id: targetId,
        category: targetNode?.category || 'unknown',
        isVisited: visitedNodes.has(targetId)
      };
    });
    
    const incoming = targetLinks.map(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const sourceNode = nodeData.find(n => n.id === sourceId);
      return {
        id: sourceId,
        category: sourceNode?.category || 'unknown',
        isVisited: visitedNodes.has(sourceId)
      };
    });
    
    return { outgoing, incoming };
  };
  
  // Clear the Three.js scene
  const clearScene = () => {
    if (!sceneRef.current) {
      console.warn("Cannot clear scene: sceneRef is null");
      return;
    }
    
    console.log(`Clearing scene with ${sceneRef.current.children.length} objects`);
    
    try {
      // Properly dispose of resources to prevent memory leaks
      sceneRef.current.traverse((object) => {
        // Dispose of geometries
        if (object instanceof THREE.Mesh && object.geometry) {
          object.geometry.dispose();
        }
        
        // Dispose of materials
        if (object instanceof THREE.Mesh && object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => {
              if (material.map) material.map.dispose();
              material.dispose();
            });
          } else {
            if (object.material.map) object.material.map.dispose();
            object.material.dispose();
          }
        }
        
        // Dispose of textures in sprites
        if (object instanceof THREE.Sprite && object.material) {
          const material = object.material as THREE.SpriteMaterial;
          if (material.map) material.map.dispose();
          material.dispose();
        }
      });
      
      // Remove all objects from the scene
      while (sceneRef.current.children.length > 0) {
        const object = sceneRef.current.children[0];
        sceneRef.current.remove(object);
      }
      
      // Clear references
      nodeObjectRef.current = null;
      edgeObjectsRef.current = [];
      navButtonsRef.current = null;
      
      console.log("Scene cleared successfully");
    } catch (error) {
      console.error("Error clearing scene:", error);
    }
  };
  
  // Rebuild the scene with the current node
  const rebuildScene = () => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !currentNodeId) {
      console.warn("Cannot rebuild scene: Missing required refs or currentNodeId");
      return;
    }
    
    try {
      console.log(`Rebuilding scene for node: ${currentNodeId}`);
      const scene = sceneRef.current;
      
      // Get current node
      const currentNode = nodeData.find(n => n.id === currentNodeId);
      if (!currentNode) {
        console.error(`Cannot find node with id: ${currentNodeId}`);
        toast({
          title: "Data Error",
          description: `Cannot find node: ${currentNodeId}`,
          variant: "destructive"
        });
        return;
      }
      
      // Get connections
      const connections = getCurrentNodeConnections();
      const allConnections = [...connections.outgoing, ...connections.incoming];
      console.log(`Node has ${allConnections.length} connections (${connections.outgoing.length} outgoing, ${connections.incoming.length} incoming)`);
      
      // Create main node sphere
      const sphereGeometry = new THREE.SphereGeometry(10, 32, 32);
      const sphereMaterial = new THREE.MeshStandardMaterial({
        color: getNodeColor(currentNode),
        roughness: 0.7,
        metalness: 0.3
      });
      
      const nodeMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
      scene.add(nodeMesh);
      nodeObjectRef.current = nodeMesh;
      
      // Add a text label to the main node
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = 256;
        canvas.height = 128;
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = '24px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText(currentNode.id, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.position.set(0, 15, 0);
        sprite.scale.set(15, 7.5, 1);
        scene.add(sprite);
      }
      
      // Create a group for navigation buttons
      const buttonsGroup = new THREE.Group();
      buttonsGroup.name = 'navButtons';
      scene.add(buttonsGroup);
      navButtonsRef.current = buttonsGroup;
      
      // Create navigation buttons for connections
      const connectionButtons: THREE.Mesh[] = [];
      
      // Position navigation buttons in a circle or clusters
      if (connectionLayout === 'circular') {
        // Circular layout positioning
        const radius = 30;
        const buttonGeometry = new THREE.SphereGeometry(3, 16, 16);
        
        allConnections.forEach((connection, index) => {
          const angle = (index / allConnections.length) * Math.PI * 2;
          const x = Math.sin(angle) * radius;
          const y = Math.cos(angle) * radius;
          
          // Create navigation button
          const buttonMaterial = new THREE.MeshStandardMaterial({
            color: connection.isVisited ? 0x3498db : 0x95a5a6,
            emissive: 0x333333,
            roughness: 0.5
          });
          
          const buttonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial);
          buttonMesh.position.set(x, y, 0);
          buttonMesh.userData = { nodeId: connection.id, type: 'navButton' };
          
          // Add a small line connecting to the main node
          const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(x, y, 0)
          ]);
          
          const lineMaterial = new THREE.LineBasicMaterial({ 
            color: hexToThreeColor(linkColor),
            opacity: 0.7,
            transparent: true
          });
          
          const line = new THREE.Line(lineGeometry, lineMaterial);
          edgeObjectsRef.current.push(line);
          
          // Add to scene
          buttonsGroup.add(buttonMesh);
          scene.add(line);
          connectionButtons.push(buttonMesh);
          
          // Add text label to the button
          const buttonCanvas = document.createElement('canvas');
          const buttonContext = buttonCanvas.getContext('2d');
          if (buttonContext) {
            buttonCanvas.width = 128;
            buttonCanvas.height = 64;
            buttonContext.fillStyle = 'rgba(0, 0, 0, 0.7)';
            buttonContext.fillRect(0, 0, buttonCanvas.width, buttonCanvas.height);
            buttonContext.font = '12px Arial';
            buttonContext.fillStyle = connection.isVisited ? '#3498db' : 'white';
            buttonContext.textAlign = 'center';
            
            // Truncate long node names
            const displayText = connection.id.length > 10 
              ? connection.id.substring(0, 8) + '...' 
              : connection.id;
              
            buttonContext.fillText(displayText, buttonCanvas.width / 2, buttonCanvas.height / 2);
            
            const buttonTexture = new THREE.CanvasTexture(buttonCanvas);
            const buttonLabelMaterial = new THREE.SpriteMaterial({ 
              map: buttonTexture, 
              transparent: true 
            });
            
            const buttonLabel = new THREE.Sprite(buttonLabelMaterial);
            buttonLabel.position.set(x, y + 5, 0);
            buttonLabel.scale.set(7, 3.5, 1);
            scene.add(buttonLabel);
          }
        });
      } else {
        // Clustered layout positioning (group by category)
        const categories = new Map<string, Array<typeof allConnections[0]>>();
        
        // Group connections by category
        allConnections.forEach(connection => {
          if (!categories.has(connection.category)) {
            categories.set(connection.category, []);
          }
          const categoryConnections = categories.get(connection.category);
          if (categoryConnections) {
            categoryConnections.push(connection);
          }
        });
        
        // Position each category in a different area
        let categoryIndex = 0;
        const buttonGeometry = new THREE.SphereGeometry(3, 16, 16);
        
        categories.forEach((categoryConnections, category) => {
          // Calculate cluster position
          const clusterAngle = (categoryIndex / categories.size) * Math.PI * 2;
          const clusterX = Math.sin(clusterAngle) * 40;
          const clusterY = Math.cos(clusterAngle) * 40;
          
          // Create a small indicator for the category
          const categoryCanvas = document.createElement('canvas');
          const categoryContext = categoryCanvas.getContext('2d');
          if (categoryContext) {
            categoryCanvas.width = 128;
            categoryCanvas.height = 64;
            categoryContext.fillStyle = 'rgba(0, 0, 0, 0.7)';
            categoryContext.fillRect(0, 0, categoryCanvas.width, categoryCanvas.height);
            categoryContext.font = '14px Arial';
            categoryContext.fillStyle = '#f39c12';
            categoryContext.textAlign = 'center';
            categoryContext.fillText(category, categoryCanvas.width / 2, categoryCanvas.height / 2);
            
            const categoryTexture = new THREE.CanvasTexture(categoryCanvas);
            const categoryMaterial = new THREE.SpriteMaterial({ map: categoryTexture, transparent: true });
            const categoryLabel = new THREE.Sprite(categoryMaterial);
            categoryLabel.position.set(clusterX, clusterY + 15, 0);
            categoryLabel.scale.set(10, 5, 1);
            scene.add(categoryLabel);
          }
          
          // Position nodes in the cluster
          categoryConnections.forEach((connection, connectionIndex) => {
            const angle = (connectionIndex / categoryConnections.length) * Math.PI * 0.5;
            const radius = 15;
            const x = clusterX + Math.sin(angle) * radius;
            const y = clusterY + Math.cos(angle) * radius;
            
            // Create navigation button
            const buttonMaterial = new THREE.MeshStandardMaterial({
              color: connection.isVisited ? 0x3498db : 0x95a5a6,
              emissive: 0x333333,
              roughness: 0.5
            });
            
            const buttonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial);
            buttonMesh.position.set(x, y, 0);
            buttonMesh.userData = { nodeId: connection.id, type: 'navButton' };
            
            // Add a small line connecting to the main node
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(0, 0, 0),
              new THREE.Vector3(x, y, 0)
            ]);
            
            const lineMaterial = new THREE.LineBasicMaterial({ 
              color: hexToThreeColor(linkColor),
              opacity: 0.7,
              transparent: true
            });
            
            const line = new THREE.Line(lineGeometry, lineMaterial);
            edgeObjectsRef.current.push(line);
            
            // Add to scene
            buttonsGroup.add(buttonMesh);
            scene.add(line);
            connectionButtons.push(buttonMesh);
            
            // Add text label to the button
            const buttonCanvas = document.createElement('canvas');
            const buttonContext = buttonCanvas.getContext('2d');
            if (buttonContext) {
              buttonCanvas.width = 128;
              buttonCanvas.height = 64;
              buttonContext.fillStyle = 'rgba(0, 0, 0, 0.7)';
              buttonContext.fillRect(0, 0, buttonCanvas.width, buttonCanvas.height);
              buttonContext.font = '12px Arial';
              buttonContext.fillStyle = connection.isVisited ? '#3498db' : 'white';
              buttonContext.textAlign = 'center';
              
              // Truncate long node names
              const displayText = connection.id.length > 10 
                ? connection.id.substring(0, 8) + '...' 
                : connection.id;
                
              buttonContext.fillText(displayText, buttonCanvas.width / 2, buttonCanvas.height / 2);
              
              const buttonTexture = new THREE.CanvasTexture(buttonCanvas);
              const buttonLabelMaterial = new THREE.SpriteMaterial({ 
                map: buttonTexture, 
                transparent: true 
              });
              
              const buttonLabel = new THREE.Sprite(buttonLabelMaterial);
              buttonLabel.position.set(x, y + 5, 0);
              buttonLabel.scale.set(7, 3.5, 1);
              scene.add(buttonLabel);
            }
          });
          
          categoryIndex++;
        });
      }
      
      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      
      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);
      
      // Adjust camera
      cameraRef.current.position.z = 80;
      
      // Render the scene
      rendererRef.current.render(scene, cameraRef.current);
    } catch (error) {
      console.error("Error rebuilding scene:", error);
      toast({
        title: "Rendering Error",
        description: "Failed to rebuild scene. Check console for details.",
        variant: "destructive"
      });
    }
  };
  
  // Navigate to a connected node
  const navigateToNode = (nodeId: string) => {
    if (!nodeId || nodeId === currentNodeId || isTransitioning) return;
    
    try {
      console.log(`Navigating to node: ${nodeId} from ${currentNodeId}`);
      setIsTransitioning(true);
      
      // Find the clicked node in the navigation buttons
      let clickedNodeObj = null;
      let targetPosition = new THREE.Vector3();
      
      if (navButtonsRef.current) {
        navButtonsRef.current.children.forEach(obj => {
          if (obj.userData && obj.userData.nodeId === nodeId) {
            clickedNodeObj = obj;
            targetPosition.copy(obj.position);
          }
        });
      }
      
      // Set up shared transition steps
      const completeTransition = () => {
        // Store current node for history before changing it
        const previousNodeId = currentNodeId;
        
        // Navigate to the new node
        setCurrentNodeId(nodeId);
        
        // Mark as visited - now we only add the node we're actually navigating TO
        setVisitedNodes(prev => {
          const newVisited = new Set(prev);
          console.log(`Marking node as visited: ${nodeId}`);
          newVisited.add(nodeId);
          return newVisited;
        });
        
        // Reset hovered connection
        setHoveredConnectionId(null);
        
        // Clear scene and prepare new one
        clearScene();
        rebuildScene();
        
        // Show success toast
        toast({
          title: "Navigated to Node",
          description: `Now viewing: ${nodeId}`
        });
        
        // Complete transition state
        setIsTransitioning(false);
        
        console.log(`Navigation complete. From: ${previousNodeId}, To: ${nodeId}, History: ${historyRef.current.length} entries, Visited: ${[...visitedNodes, nodeId].length} nodes`);
      };
      
      // Push current node to history BEFORE we navigate
      if (currentNodeId) {
        console.log(`Adding to history: ${currentNodeId}`);
        // Make sure we don't add duplicates to history
        if (historyRef.current.length === 0 || historyRef.current[historyRef.current.length - 1] !== currentNodeId) {
          historyRef.current.push(currentNodeId);
        }
      }
      
      // If we found the clicked node, do an animated transition
      if (clickedNodeObj && nodeObjectRef.current && sceneRef.current && rendererRef.current && cameraRef.current) {
        console.log("Performing animated node transition");
        
        // Apply a lighter overlay for better visibility during animation
        if (transitionOverlayRef.current) {
          const overlay = transitionOverlayRef.current;
          overlay.style.opacity = '1';
        }
        
        // Store original positions and scales
        const originalMainNodePosition = new THREE.Vector3();
        nodeObjectRef.current.getWorldPosition(originalMainNodePosition);
        
        const originalMainNodeScale = nodeObjectRef.current.scale.clone();
        const originalTargetNodeScale = clickedNodeObj.scale.clone();
        
        // Move the camera to look at the space between the nodes
        const lookAtPosition = new THREE.Vector3().addVectors(
          originalMainNodePosition,
          targetPosition
        ).multiplyScalar(0.5);
        
        // Animation timing
        const duration = 800; // ms
        const startTime = Date.now();
        
        // Create animation frames
        const animateTransition = () => {
          const elapsedTime = Date.now() - startTime;
          const progress = Math.min(elapsedTime / duration, 1);
          
          // Use easing for smoother motion: cubic ease-in-out
          const easeValue = progress < 0.5 
            ? 4 * Math.pow(progress, 3) 
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
          
          if (nodeObjectRef.current && clickedNodeObj) {
            // Animate the main node moving toward the target
            const lerpPosition = new THREE.Vector3().lerpVectors(
              originalMainNodePosition,
              targetPosition,
              easeValue
            );
            nodeObjectRef.current.position.copy(lerpPosition);
            
            // Scale down the main node as it travels
            const mainScale = 1 - (easeValue * 0.5);
            nodeObjectRef.current.scale.set(mainScale, mainScale, mainScale);
            
            // Scale up the target node
            const targetScale = 1 + (easeValue * 0.5);
            clickedNodeObj.scale.set(targetScale, targetScale, targetScale);
            
            // Highlight the target node with glow effect
            const targetMaterial = clickedNodeObj.material as THREE.MeshStandardMaterial;
            if (targetMaterial) {
              targetMaterial.emissive.set(0x003366);
              targetMaterial.emissiveIntensity = easeValue;
            }
            
            // Render the updated scene
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
          
          if (progress < 1) {
            // Continue animation
            requestAnimationFrame(animateTransition);
          } else {
            // Animation complete, finish transition
            setTimeout(completeTransition, 100);
          }
        };
        
        // Start the animation
        requestAnimationFrame(animateTransition);
      } else {
        // Fallback to fade transition if we can't do animation
        console.log("Using fallback fade transition");
        
        // Fade in the overlay
        if (transitionOverlayRef.current) {
          const overlay = transitionOverlayRef.current;
          overlay.style.opacity = '1';
        }
        
        // Wait for fade-out to complete
        setTimeout(() => {
          completeTransition();
          
          // Wait a moment for the scene to be ready, then fade back in
          setTimeout(() => {
            if (transitionOverlayRef.current) {
              const overlay = transitionOverlayRef.current;
              overlay.style.opacity = '0';
            }
          }, 50);
        }, 350);
      }
    } catch (error) {
      console.error("Error navigating to node:", error);
      setIsTransitioning(false);
      
      // Reset overlay if there's an error
      if (transitionOverlayRef.current) {
        transitionOverlayRef.current.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        transitionOverlayRef.current.style.backdropFilter = 'blur(0px)';
        transitionOverlayRef.current.style.opacity = '0';
      }
      
      toast({
        title: "Navigation Error",
        description: `Failed to navigate to node: ${nodeId}`,
        variant: "destructive"
      });
    }
  };
  
  // Go back to previous node
  const goBack = () => {
    if (historyRef.current.length === 0 || isTransitioning) return;
    
    try {
      console.log(`Going back from node: ${currentNodeId}. History stack: [${historyRef.current.join(', ')}]`);
      
      // Pop the last node from history
      const previousNode = historyRef.current.pop();
      console.log(`Popped from history: ${previousNode}`);
      
      if (previousNode) {
        // For "go back" operations, we need to bypass the normal navigation flow
        // that would add the current node to history (which would create a loop)
        setIsTransitioning(true);
        
        // Directly update the current node ID
        setCurrentNodeId(previousNode);
        
        // Mark as visited
        setVisitedNodes(prev => {
          const newVisited = new Set(prev);
          newVisited.add(previousNode);
          return newVisited;
        });
        
        // Reset hovered connection
        setHoveredConnectionId(null);
        
        // Clear scene and prepare new one
        clearScene();
        rebuildScene();
        
        // Show success toast
        toast({
          title: "Navigated Back",
          description: `Now viewing: ${previousNode}`
        });
        
        // Complete transition state
        setIsTransitioning(false);
        
        console.log(`Back navigation complete. Now at: ${previousNode}, History: ${historyRef.current.length} entries`);
      }
    } catch (error) {
      console.error("Error navigating back:", error);
      setIsTransitioning(false);
      
      toast({
        title: "Navigation Error",
        description: "Failed to navigate back",
        variant: "destructive"
      });
    }
  };
  
  // Go to home node (first node)
  const goHome = () => {
    if (nodeData.length === 0 || currentNodeId === nodeData[0].id || isTransitioning) return;
    
    try {
      // Navigate to the first node using the transition
      navigateToNode(nodeData[0].id);
    } catch (error) {
      console.error("Error navigating to home:", error);
      toast({
        title: "Navigation Error",
        description: "Failed to navigate to home node",
        variant: "destructive"
      });
    }
  };
  
  const project3DPositionTo2D = (
    position: THREE.Vector3,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ): { x: number, y: number } => {
    try {
      // Clone position to avoid modifying the original
      const pos = position.clone();
      
      // Log the world position we're trying to project
      debugLog(`Projecting 3D position: x=${pos.x.toFixed(2)}, y=${pos.y.toFixed(2)}, z=${pos.z.toFixed(2)}`);
      
      // Get the camera's view matrix to ensure we're using the correct transformation
      const viewMatrix = camera.matrixWorldInverse;
      
      // Project 3D position to normalized device coordinates (NDC)
      pos.project(camera);
      
      debugLog(`After projection (NDC): x=${pos.x.toFixed(2)}, y=${pos.y.toFixed(2)}, z=${pos.z.toFixed(2)}`);
      
      // Calculate viewport position
      const rendererRect = renderer.domElement.getBoundingClientRect();
      const widthHalf = rendererRect.width / 2;
      const heightHalf = rendererRect.height / 2;
      
      // Convert to screen coordinates
      const x = (pos.x * widthHalf) + widthHalf;
      const y = -(pos.y * heightHalf) + heightHalf;
      
      debugLog(`Projected to screen: x=${x.toFixed(2)}, y=${y.toFixed(2)}, width=${rendererRect.width}, height=${rendererRect.height}`);
      
      return { x, y };
    } catch (error) {
      console.error("Error in 3D projection:", error);
      return { x: 0, y: 0 }; // Return default in case of error
    }
  };

  const showTooltip = (nodeId: string, x: number, y: number, isNavButton: boolean = false) => {
    if (!tooltipRef.current || !containerRef.current) return;
    
    try {
      const node = nodeData.find(n => n.id === nodeId);
      if (!node) {
        debugLog(`Cannot find node with id: ${nodeId}`);
        return;
      }
      
      debugLog(`Showing tooltip for node: ${nodeId}, x=${x}, y=${y}, isNavButton=${isNavButton}`);
      
      // Build tooltip content based on node type
      let content = '';
      
      if (isNavButton) {
        // Navigation button tooltip
        const isVisited = visitedNodes.has(nodeId);
        content = `
          <div class="p-2">
            <div class="font-bold ${isVisited ? 'text-blue-400' : ''}">${nodeId}</div>
            <div class="text-xs text-gray-300">Category: ${node.category}</div>
            ${isVisited ? '<div class="text-xs text-blue-400">✓ Previously visited</div>' : ''}
            <div class="text-xs text-gray-300 mt-1">Click to navigate to this node</div>
          </div>
        `;
      } else {
        // Main node tooltip
        const connections = getCurrentNodeConnections();
        content = `
          <div class="p-2">
            <div class="font-bold text-lg">${nodeId}</div>
            <div class="text-sm text-gray-300">Category: ${node.category}</div>
            <div class="text-sm text-gray-300">Connections: ${connections.outgoing.length + connections.incoming.length}</div>
            <div class="mt-2">
              <div class="text-xs font-medium text-blue-400">Outgoing (${connections.outgoing.length}):</div>
              <div class="ml-2 text-xs text-gray-300">
                ${connections.outgoing.map(c => `<div>${c.id} (${c.category})</div>`).join('')}
              </div>
            </div>
            <div class="mt-2">
              <div class="text-xs font-medium text-green-400">Incoming (${connections.incoming.length}):</div>
              <div class="ml-2 text-xs text-gray-300">
                ${connections.incoming.map(c => `<div>${c.id} (${c.category})</div>`).join('')}
              </div>
            </div>
          </div>
        `;
      }
      
      // Get renderer bounds for positioning reference
      const rendererBounds = rendererRef.current?.domElement.getBoundingClientRect();
      const containerBounds = containerRef.current.getBoundingClientRect();
      
      debugLog(`Renderer bounds: ${rendererBounds ? `left=${rendererBounds.left}, top=${rendererBounds.top}` : 'not available'}`);
      debugLog(`Container bounds: left=${containerBounds.left}, top=${containerBounds.top}`);
      
      // Set content and make temporarily visible but transparent for size calculation
      const tooltip = tooltipRef.current;
      tooltip.innerHTML = content;
      tooltip.style.visibility = "visible";
      tooltip.style.opacity = "0"; // Start transparent for measurement
      
      // Force layout calculation to get accurate dimensions
      const tooltipWidth = tooltip.offsetWidth;
      const tooltipHeight = tooltip.offsetHeight;
      
      debugLog(`Tooltip dimensions: ${tooltipWidth}x${tooltipHeight}`);
      
      // Calculate position relative to container
      let xPosition = x;
      let yPosition = y - tooltipHeight - 10; // Position above by default
      
      // Make sure tooltip stays within container bounds
      if (xPosition + tooltipWidth > containerBounds.width) {
        xPosition = Math.max(5, containerBounds.width - tooltipWidth - 5);
        debugLog(`Adjusted x to prevent overflow: ${xPosition}`);
      }
      
      if (yPosition < 5) {
        // If would go off top, position below instead
        yPosition = y + 20;
        debugLog(`Adjusted y to prevent top overflow: ${yPosition}`);
      }
      
      if (yPosition + tooltipHeight > containerBounds.height - 5) {
        yPosition = Math.max(5, containerBounds.height - tooltipHeight - 5);
        debugLog(`Adjusted y to prevent bottom overflow: ${yPosition}`);
      }
      
      if (xPosition < 5) {
        xPosition = 5;
        debugLog(`Adjusted x to prevent left overflow: ${xPosition}`);
      }
      
      debugLog(`Final tooltip position: x=${xPosition}, y=${yPosition}`);
      
      // Position and show tooltip
      tooltip.style.left = `${xPosition}px`;
      tooltip.style.top = `${yPosition}px`;
      tooltip.style.opacity = "1"; // Make visible
      
    } catch (error) {
      console.error("Error showing tooltip:", error);
    }
  };
  
  // Hide tooltip
  const hideTooltip = () => {
    if (!tooltipRef.current) return;
    tooltipRef.current.style.visibility = 'hidden';
    tooltipRef.current.style.opacity = '0';
  };

  // Main effect for scene initialization and event handling
  useEffect(() => {
    if (!containerRef.current || nodeData.length === 0 || !currentNodeId) {
      console.log(`Scene initialization skipped: Container exists: ${!!containerRef.current}, Node count: ${nodeData.length}, Current node: ${currentNodeId}`);
      return;
    }
    
    console.log(`Initializing 3D scene for node: ${currentNodeId}`);
    
    // Validate node data structure
    if (!nodeData.every(node => node.id && typeof node.id === 'string')) {
      console.error("Invalid node data structure: Not all nodes have 'id' property");
      toast({
        title: "Data Error",
        description: "Node data is in an invalid format. Check console for details.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
    
    try {
      // Clean up previous scene if it exists
      if (rendererRef.current && containerRef.current) {
        console.log("Cleaning up previous renderer");
        try {
          containerRef.current.removeChild(rendererRef.current.domElement);
        } catch (e) {
          console.warn("Error removing previous renderer:", e);
        }
      }
      
      if (animationFrameRef.current) {
        console.log("Canceling previous animation frame");
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Explicitly clear any existing refs to avoid memory leaks
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      nodeObjectRef.current = null;
      edgeObjectsRef.current = [];
      navButtonsRef.current = null;
      
      // Get container dimensions
      const width = containerRef.current.clientWidth || 300;
      const height = containerRef.current.clientHeight || 300;
      console.log(`Container dimensions: ${width}x${height}`);
      
      if (width < 50 || height < 50) {
        console.warn(`Unusually small container dimensions: ${width}x${height}`);
      }
      
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(backgroundColor);
      sceneRef.current = scene;
      
      // Create camera
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.z = 80; // Set initial camera position
      cameraRef.current = camera;
      
      // Create renderer with error checking
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: "default"
      });
      
      if (!renderer) {
        throw new Error("Failed to create WebGL renderer");
      }
      
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio to avoid performance issues
      
      try {
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        console.log("Renderer successfully attached to container");
      } catch (e) {
        console.error("Error attaching renderer to container:", e);
        throw new Error("Failed to attach renderer to container");
      }
      
      // Build the scene
      console.log("Building scene...");
      rebuildScene();
      console.log("Scene built successfully");
      
      // Set up raycaster for interactions
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      
      // Mouse move handler
      const handleMouseMove = (event: MouseEvent) => {
        if (!sceneRef.current || !cameraRef.current || !navButtonsRef.current) return;
        
        try {
          // Get the renderer bounds for more accurate positioning
          const rendererBounds = rendererRef.current?.domElement.getBoundingClientRect();
          if (!rendererBounds) {
            debugLog("No renderer bounds found");
            return;
          }
          
          // Calculate mouse position RELATIVE TO THE RENDERER
          // This is critical - we need coordinates within the canvas, not the page
          const mouseX = event.clientX - rendererBounds.left;
          const mouseY = event.clientY - rendererBounds.top;
          
          // Convert to normalized device coordinates (-1 to +1)
          mouse.x = (mouseX / rendererBounds.width) * 2 - 1;
          mouse.y = -(mouseY / rendererBounds.height) * 2 + 1;
          
          debugLog(`Mouse Event: clientX=${event.clientX}, clientY=${event.clientY}`);
          debugLog(`Renderer bounds: left=${rendererBounds.left}, top=${rendererBounds.top}, width=${rendererBounds.width}, height=${rendererBounds.height}`);
          debugLog(`Normalized coords: x=${mouse.x.toFixed(3)}, y=${mouse.y.toFixed(3)}`);
          
          // Update the raycaster with current mouse position and camera
          raycaster.setFromCamera(mouse, cameraRef.current);
          
          // Debug raycaster direction
          debugLog(`Raycaster direction: x=${raycaster.ray.direction.x.toFixed(3)}, y=${raycaster.ray.direction.y.toFixed(3)}, z=${raycaster.ray.direction.z.toFixed(3)}`);
          
          // Check if navButtonsRef.current and its children exist
          if (!navButtonsRef.current || !navButtonsRef.current.children || navButtonsRef.current.children.length === 0) {
            debugLog("No nav buttons found to intersect with");
            
            // Clear any existing tooltip if we were previously hovering 
            if (hoveredConnectionId) {
              setHoveredConnectionId(null);
              hideTooltip();
            }
            
            return;
          }
          
          // Log the number of objects we're checking for intersection
          debugLog(`Checking ${navButtonsRef.current.children.length} nav buttons for intersection`);
          
          // Find intersections with the nav buttons
          const intersects = raycaster.intersectObjects(navButtonsRef.current.children, false);
          debugLog(`Found ${intersects.length} intersections`);
          
          if (intersects.length > 0) {
            // We're hovering over a nav button
            const navButton = intersects[0].object as THREE.Mesh;
            const nodeId = navButton.userData?.nodeId;
            
            debugLog(`Intersection hit: ${nodeId}, distance: ${intersects[0].distance.toFixed(2)}`);
            debugLog(`Button position:`, navButton.position);
            
            if (nodeId && nodeId !== hoveredConnectionId) {
              debugLog(`Setting new hoveredConnectionId: ${nodeId}`);
              setHoveredConnectionId(nodeId);
              
              // Get the 3D world position of the button
              const buttonPosition = navButton.position.clone();
              
              // Project the 3D position to 2D screen space
              const screenPos = project3DPositionTo2D(buttonPosition, cameraRef.current, rendererRef.current);
              debugLog(`Projected screen position: x=${screenPos.x.toFixed(2)}, y=${screenPos.y.toFixed(2)}`);
              
              // Show tooltip using the calculated position
              showTooltip(nodeId, screenPos.x, screenPos.y, true);
              
              // Highlight the button
              const material = navButton.material as THREE.MeshStandardMaterial;
              if (material) {
                material.emissive.set(0x666666);
                material.needsUpdate = true;
              }
            }
          } else if (hoveredConnectionId) {
            // No longer hovering over a nav button
            debugLog(`No intersections found, clearing hoveredConnectionId: ${hoveredConnectionId}`);
            setHoveredConnectionId(null);
            hideTooltip();
            
            // Reset all button highlights
            if (navButtonsRef.current) {
              navButtonsRef.current.children.forEach(obj => {
                if (obj instanceof THREE.Mesh) {
                  const material = obj.material as THREE.MeshStandardMaterial;
                  if (material) {
                    material.emissive.set(0x333333);
                    material.needsUpdate = true;
                  }
                }
              });
            }
          }
        } catch (e) {
          console.error("Error in mouse move handler:", e);
        }
      };
      
      // Click handler
      const handleClick = (event: MouseEvent) => {
        if (!sceneRef.current || !cameraRef.current || !navButtonsRef.current) return;
        
        try {
          // Get the renderer bounds for accurate positioning
          const rendererBounds = rendererRef.current?.domElement.getBoundingClientRect();
          if (!rendererBounds) {
            debugLog("No renderer bounds found for click");
            return;
          }
          
          // Calculate mouse position RELATIVE TO THE RENDERER
          const mouseX = event.clientX - rendererBounds.left;
          const mouseY = event.clientY - rendererBounds.top;
          
          // Check if the click is actually inside the renderer
          if (mouseX < 0 || mouseX > rendererBounds.width || mouseY < 0 || mouseY > rendererBounds.height) {
            debugLog(`Click outside renderer bounds: x=${mouseX}, y=${mouseY}`);
            return;
          }
          
          // Convert to normalized device coordinates (-1 to +1)
          mouse.x = (mouseX / rendererBounds.width) * 2 - 1;
          mouse.y = -(mouseY / rendererBounds.height) * 2 + 1;
          
          debugLog(`Click: clientX=${event.clientX}, clientY=${event.clientY}`);
          debugLog(`Normalized click coords: x=${mouse.x.toFixed(3)}, y=${mouse.y.toFixed(3)}`);
          
          // Update the raycaster
          raycaster.setFromCamera(mouse, cameraRef.current);
          
          // Find intersections with the nav buttons
          const intersects = raycaster.intersectObjects(navButtonsRef.current.children, false);
          debugLog(`Click - found ${intersects.length} intersections`);
          
          if (intersects.length > 0) {
            // We clicked on a nav button
            const navButton = intersects[0].object as THREE.Mesh;
            const nodeId = navButton.userData?.nodeId;
            
            debugLog(`Click intersection hit: ${nodeId}, distance: ${intersects[0].distance.toFixed(2)}`);
            
            if (nodeId) {
              debugLog(`Navigating to node: ${nodeId}`);
              navigateToNode(nodeId);
            }
          } else {
            debugLog("Click detected but no intersection found");
          }
        } catch (e) {
          console.error("Error in click handler:", e);
        }
      };
      
      
      // Wheel handler for zooming
      const handleWheel = (event: WheelEvent) => {
        if (!cameraRef.current) return;
        
        try {
          // Prevent default scrolling
          event.preventDefault();
          
          // Adjust camera distance based on wheel direction
          const zoomSpeed = 0.1;
          cameraRef.current.position.z += event.deltaY * zoomSpeed;
          
          // Limit how close/far the camera can get
          cameraRef.current.position.z = Math.max(20, Math.min(150, cameraRef.current.position.z));
          
          // Update zoom level display
          setZoomLevel(80 / cameraRef.current.position.z);
        } catch (e) {
          console.warn("Error in wheel handler:", e);
        }
      };
      
      // Add event listeners
      containerRef.current.addEventListener('mousemove', handleMouseMove);
      containerRef.current.addEventListener('click', handleClick);
      containerRef.current.addEventListener('wheel', handleWheel, { passive: false });
      
      // Animation loop
      const animate = () => {
        try {
          animationFrameRef.current = requestAnimationFrame(animate);
          
          if (rendererRef.current && cameraRef.current && sceneRef.current) {
            // Rotate the nav buttons group if rotation is enabled
            if (isRotating && navButtonsRef.current) {
              navButtonsRef.current.rotation.y += 0.005;
            }
            
            // Render the scene
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
        } catch (e) {
          console.error("Error in animation loop:", e);
          // Cancel animation frame to stop the loop if there's an error
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          
          // Show error toast only if we're not already in an error state
          if (!isErrorRef.current) {
            isErrorRef.current = true;
            toast({
              title: "Rendering Error",
              description: "An error occurred during rendering. Check console for details.",
              variant: "destructive"
            });
          }
        }
      };
      
      // Start animation loop
      console.log("Starting animation loop");
      animate();
      
      // Hide loading indicator
      setIsLoading(false);
      
      // IMPORTANT: Save a reference to containerRef.current for cleanup
      const currentContainer = containerRef.current;
      
      // Clean up
      return () => {
        console.log("Cleaning up 3D resources");
        // Use the saved reference instead of containerRef.current
        try {
          if (currentContainer) {
            currentContainer.removeEventListener('mousemove', handleMouseMove);
            currentContainer.removeEventListener('click', handleClick);
            currentContainer.removeEventListener('wheel', handleWheel);
          }
          
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          
          if (rendererRef.current) {
            rendererRef.current.dispose();
            
            if (containerRef.current && rendererRef.current.domElement.parentNode === containerRef.current) {
              containerRef.current.removeChild(rendererRef.current.domElement);
            }
          }
          
          // Clean up materials and geometries
          if (sceneRef.current) {
            sceneRef.current.traverse((object) => {
              if (object instanceof THREE.Mesh) {
                if (object.geometry) object.geometry.dispose();
                
                if (object.material) {
                  if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                  } else {
                    object.material.dispose();
                  }
                }
              }
            });
          }
          
          // Clear references
          sceneRef.current = null;
          cameraRef.current = null;
          rendererRef.current = null;
          nodeObjectRef.current = null;
          edgeObjectsRef.current = [];
          navButtonsRef.current = null;
        } catch (e) {
          console.error("Error during cleanup:", e);
        }
      };
    } catch (error) {
      console.error("Error initializing node navigator:", error);
      setIsLoading(false);
      toast({
        title: "Initialization Error",
        description: error instanceof Error ? error.message : "Failed to initialize node navigator",
        variant: "destructive"
      });
    }
  }, [nodeData, backgroundColor, currentNodeId, linkColor, connectionLayout, visitedNodes, isRotating]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      
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
  
  // Ensure minimap visibility is preserved across navigation
  useEffect(() => {
    // This ensures minimap stays visible after node transitions
    if (!showMiniMap && !isTransitioning) {
      console.log("Restoring minimap visibility");
      setShowMiniMap(true);
    }
  }, [currentNodeId, showMiniMap, isTransitioning]);
  
  // Get current node for rendering info
  const currentNode = nodeData.find(n => n.id === currentNodeId);
  const connections = getCurrentNodeConnections();
  const uniqueCategories = Array.from(new Set(nodeData.map(node => node.category)));
  
  // Toggle auto-rotation
  const toggleRotation = () => {
    setIsRotating(!isRotating);
    
    toast({
      title: isRotating ? "Rotation Disabled" : "Rotation Enabled",
      description: isRotating 
        ? "Auto-rotation has been disabled" 
        : "Auto-rotation has been enabled"
    });
  };
  
  // Toggle connection layout
  const toggleConnectionLayout = () => {
    const newLayout = connectionLayout === 'circular' ? 'clustered' : 'circular';
    setConnectionLayout(newLayout);
    
    toast({
      title: "Layout Changed",
      description: `Connection layout set to ${newLayout}`
    });
    
    // Rebuild scene with new layout
    clearScene();
    rebuildScene();
  };
  
  // Handle zoom controls
  const handleZoomIn = () => {
    if (!cameraRef.current) return;
    
    cameraRef.current.position.z -= 10;
    cameraRef.current.position.z = Math.max(20, cameraRef.current.position.z);
    
    setZoomLevel(80 / cameraRef.current.position.z);
  };
  
  const handleZoomOut = () => {
    if (!cameraRef.current) return;
    
    cameraRef.current.position.z += 10;
    cameraRef.current.position.z = Math.min(150, cameraRef.current.position.z);
    
    setZoomLevel(80 / cameraRef.current.position.z);
  };
  
  const handleResetZoom = () => {
    if (!cameraRef.current) return;
    
    cameraRef.current.position.z = 80;
    setZoomLevel(1);
  };
  
  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative"
      style={{
        backgroundColor: `rgba(${hexToRgb(backgroundColor).r}, ${hexToRgb(backgroundColor).g}, ${hexToRgb(backgroundColor).b}, ${backgroundOpacity})`,
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="text-white text-center">
            <div className="h-8 w-8 border-2 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p>Loading Node Navigator...</p>
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
          maxWidth: '300px',
          pointerEvents: 'none'
        }}
      ></div>
      

{/* Transition overlay */}
<div 
  ref={transitionOverlayRef}
  className="transition-overlay"
  style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    //backdropFilter: 'blur(0px)',
    opacity: 0,
    pointerEvents: 'none',
    transition: 'all 300ms ease-in-out',
    zIndex: 100
  }}
/>

      {/* Navigation controls */}
      <div className="absolute top-4 left-4 z-20 flex flex-col space-y-2">
        <button 
          className="bg-gray-800 text-white p-2 rounded-full hover:bg-gray-700 transition-colors flex items-center justify-center"
          onClick={goHome}
          title="Go to home node"
        >
          <Home className="w-5 h-5" />
        </button>
        
        <button 
          className="bg-gray-800 text-white p-2 rounded-full hover:bg-gray-700 transition-colors flex items-center justify-center"
          onClick={goBack}
          title="Go back to previous node"
          disabled={historyRef.current.length === 0}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <button 
          className="bg-gray-800 text-white p-2 rounded-full hover:bg-gray-700 transition-colors flex items-center justify-center"
          onClick={toggleRotation}
          title={isRotating ? "Disable auto-rotation" : "Enable auto-rotation"}
        >
          <RotateCcw className="w-5 h-5" color={isRotating ? "#3498db" : "white"} />
        </button>
        
        <button 
          className="bg-gray-800 text-white p-2 rounded-full hover:bg-gray-700 transition-colors flex items-center justify-center"
          onClick={() => setActiveSettings(!activeSettings)}
          title="Show/hide settings"
        >
          <Settings className="w-5 h-5" color={activeSettings ? "#3498db" : "white"} />
        </button>

        <button 
  className="bg-gray-800 text-white p-2 rounded-full hover:bg-gray-700 transition-colors flex items-center justify-center"
  onClick={() => setShowMiniMap(!showMiniMap)}
  title="Toggle mini-map"
>
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6l6-3l6 3l6-3v15l-6 3l-6-3l-6 3z"></path>
    <path d="M9 3v15"></path>
    <path d="M15 6v15"></path>
  </svg>
</button>

      </div>
      
      {/* Settings panel */}
      {activeSettings && (
        <div className="absolute top-4 left-16 z-20 bg-gray-800 bg-opacity-90 p-4 rounded-md shadow-lg text-white max-w-xs">
          <h3 className="text-sm font-bold mb-3">Node Navigator Settings</h3>
          
          <div className="mb-3">
            <label className="flex items-center text-sm mb-1">
              <span>Connection Layout:</span>
            </label>
            <div className="flex space-x-2">
              <button
                className={`px-2 py-1 text-xs rounded ${
                  connectionLayout === 'circular' ? 'bg-blue-600' : 'bg-gray-700'
                }`}
                onClick={() => {
                  setConnectionLayout('circular');
                  clearScene();
                  rebuildScene();
                }}
              >
                Circular
              </button>
              <button
                className={`px-2 py-1 text-xs rounded ${
                  connectionLayout === 'clustered' ? 'bg-blue-600' : 'bg-gray-700'
                }`}
                onClick={() => {
                  setConnectionLayout('clustered');
                  clearScene();
                  rebuildScene();
                }}
              >
                By Category
              </button>
            </div>
          </div>
          
          <div className="mb-2">
            <span className="text-xs">Visited Nodes: {visitedNodes.size} of {nodeData.length}</span>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${(visitedNodes.size / nodeData.length) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <button
            className="w-full mt-3 bg-gray-700 hover:bg-gray-600 transition-colors text-xs py-1 rounded"
            onClick={() => {
              setVisitedNodes(new Set([currentNodeId || '']));
              historyRef.current = [];
              clearScene();
              rebuildScene();
              
              toast({
                title: "Navigation History Reset",
                description: "Visited nodes have been reset"
              });
            }}
          >
            Reset Navigation History
          </button>
        </div>
      )}
      
      {/* Current node info panel */}
      {currentNode && (
        <div className="absolute top-4 right-4 z-20 bg-gray-800 bg-opacity-90 p-3 rounded-md shadow-lg text-white max-w-xs">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold">{currentNode.id}</h3>
              <p className="text-xs text-gray-300">Category: {currentNode.category}</p>
              <p className="text-xs text-gray-300">
                Connections: {connections.outgoing.length + connections.incoming.length}
              </p>
            </div>
            <div className="flex flex-col items-end text-xs">
              <div className={`px-1.5 py-0.5 rounded ${
                connections.outgoing.length > 0 ? 'bg-blue-900 text-blue-200' : 'bg-gray-700'
              }`}>
                Out: {connections.outgoing.length}
              </div>
              <div className={`mt-1 px-1.5 py-0.5 rounded ${
                connections.incoming.length > 0 ? 'bg-green-900 text-green-200' : 'bg-gray-700'
              }`}>
                In: {connections.incoming.length}
              </div>
            </div>
          </div>
          
          <div className="flex items-center text-xs mt-2 space-x-2">
            <Info className="w-3 h-3" />
            <span className="text-gray-300">
              Hover nodes for details, click to navigate
            </span>
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-20">
        <NetworkLegend
          categories={uniqueCategories}
          colorTheme={colorTheme}
          dynamicColorThemes={dynamicColorThemes}
          colorPalette={Object.values(dynamicColorThemes.default || {})}
        />
      </div>
      
      {/* Zoom controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
        <ZoomControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleResetZoom}
          isZoomInitialized={true}
        />
      </div>
      
      {/* File Buttons */}
      {onDownloadData && onDownloadGraph && (
        <div className="absolute top-4 right-4 z-20">
          <FileButtons
            onDownloadData={onDownloadData}
            onDownloadGraph={onDownloadGraph}
            onResetSelection={onResetSelection}
            nodeData={nodeData.map(node => ({
              id: node.id || '',
              category: node.category || ''
            }))}
            linkData={linkData.map(link => ({
              source: typeof link.source === 'object' ? link.source.id : link.source,
              target: typeof link.target === 'object' ? link.target.id : link.target,
            }))}
          />
        </div>
      )}
    {showMiniMap && (
        <NodeNavMiniMap
  nodeData={nodeData}
  linkData={linkData}
  currentNodeId={currentNodeId}
  visitedNodes={visitedNodes}
  onNodeSelect={navigateToNode}
  colorTheme={colorTheme}
  customNodeColors={customNodeColors}
  dynamicColorThemes={dynamicColorThemes}
  highlightSize={40}
  showZoomControls={true}
/>
)}
    </div>
    
  );
};

export default NodeNavVisualization;