/* eslint-disable react-hooks/exhaustive-deps */
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Node, Link, VisualizationType } from '@/types/networkTypes';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
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
  onCreditsClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  // 3D Controls state
  const [rotationSpeed, setRotationSpeed] = useState(0.001);
  const [showLabels, setShowLabels] = useState(false);
  
  // Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  
  // Node and link object references
  const nodeObjectsRef = useRef<THREE.Mesh[]>([]);
  const linkObjectsRef = useRef<THREE.Line[]>([]);
  const nodeLabelsRef = useRef<THREE.Sprite[]>([]);
  
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
    const currentTheme = dynamicColorThemes?.[colorTheme] || dynamicColorThemes?.default || {};
    const color = currentTheme[node.category] || '#95a5a6';
    return hexToThreeColor(color);
  };
  
  // Show tooltip for a node
  const showTooltip = (event: MouseEvent, node: Node, connections: {to: string[], from: string[]}) => {
    if (!tooltipRef.current) return;
    
    // Build tooltip content
    let tooltipContent = `<strong>${node.id}</strong><br>Category: ${node.category}<br><br>`;
    
    // Add connections info
    if (connections.to.length > 0) {
      tooltipContent += `<strong>Connected to:</strong><br>`;
      connections.to.forEach(target => {
        tooltipContent += `${target}<br>`;
      });
      tooltipContent += `<br>`;
    }
    
    if (connections.from.length > 0) {
      tooltipContent += `<strong>Connected from:</strong><br>`;
      connections.from.forEach(source => {
        tooltipContent += `${source}<br>`;
      });
    }
    
    // Set content and position
    const tooltip = tooltipRef.current;
    tooltip.innerHTML = tooltipContent;
    tooltip.style.visibility = "visible";
    tooltip.style.opacity = "1";
    
    // Position tooltip near mouse
    tooltip.style.left = `${event.clientX + 15}px`;
    tooltip.style.top = `${event.clientY - 10}px`;
  };
  
  // Hide tooltip
  const hideTooltip = () => {
    if (!tooltipRef.current) return;
    tooltipRef.current.style.opacity = "0";
    tooltipRef.current.style.visibility = "hidden";
  };
  
  // Move tooltip with mouse
  const moveTooltip = (event: MouseEvent) => {
    if (!tooltipRef.current) return;
    tooltipRef.current.style.left = `${event.clientX + 15}px`;
    tooltipRef.current.style.top = `${event.clientY - 10}px`;
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
      scene.background = hexToThreeColor(backgroundColor);
      sceneRef.current = scene;
      
      // Create camera
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.z = 100;
      cameraRef.current = camera;
      
      // Create renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      
      // Create nodes
      const nodesGroup = new THREE.Group();
      nodesGroup.name = 'nodesGroup';
      scene.add(nodesGroup);
      
      const sphereGeometry = new THREE.SphereGeometry(5 * nodeSize, 16, 16);
      const nodeObjects: THREE.Mesh[] = [];
      const labelObjects: THREE.Sprite[] = [];
      
      // Create node positions
      const nodePositions: { [id: string]: THREE.Vector3 } = {};
      
      nodeData.forEach((node, index) => {
        // Create node material with appropriate color
        const nodeMaterial = new THREE.MeshStandardMaterial({ 
          color: getNodeColor(node),
          roughness: 0.7,
          metalness: 0.3
        });
        const mesh = new THREE.Mesh(sphereGeometry, nodeMaterial);
        
        // Position node randomly in 3D space (sphere layout)
        const phi = Math.acos(-1 + (2 * index) / nodeData.length);
        const theta = Math.sqrt(nodeData.length * Math.PI) * phi;
        
        const position = new THREE.Vector3(
          50 * Math.cos(theta) * Math.sin(phi),
          50 * Math.sin(theta) * Math.sin(phi),
          50 * Math.cos(phi)
        );
        
        mesh.position.copy(position);
        nodePositions[node.id] = position;
        
        // Store the node data for interaction
        mesh.userData = { 
          nodeId: node.id,
          category: node.category
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
      const linksGroup = new THREE.Group();
      linksGroup.name = 'linksGroup';
      scene.add(linksGroup);
      
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
      
      // Mouse events for interaction
      const handleMouseMove = (event: MouseEvent) => {
        // Calculate mouse position in normalized device coordinates
        mouse.x = (event.clientX / width) * 2 - 1;
        mouse.y = - (event.clientY / height) * 2 + 1;
        
        // Update the raycaster
        raycaster.setFromCamera(mouse, camera);
        
        // Find intersections with nodes
        const intersects = raycaster.intersectObjects(nodeObjects);
        
        // If we were hovering over an object and now we're not
        if (intersects.length === 0) {
          if (intersectedObject) {
            // Reset the node appearance
            (intersectedObject.material as THREE.MeshStandardMaterial).emissive.set(0x000000);
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
            (intersectedObject.material as THREE.MeshStandardMaterial).emissive.set(0x000000);
          }
          
          // Highlight new intersected object
          intersectedObject = hoveredMesh;
          (intersectedObject.material as THREE.MeshStandardMaterial).emissive.set(0x333333);
          
          // Show tooltip
          const nodeId = hoveredMesh.userData.nodeId;
          const node = nodeData.find(n => n.id === nodeId);
          
          if (node) {
            const connections = findNodeConnections(node.id);
            showTooltip(event, node, connections);
          }
        } else {
          // Move tooltip with mouse
          moveTooltip(event);
        }
      };
      
      const handleClick = (event: MouseEvent) => {
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
      
      // Set up controls
      let isDragging = false;
      let previousMousePosition = { x: 0, y: 0 };
      
      const handleMouseDown = (event: MouseEvent) => {
        isDragging = true;
        previousMousePosition = { x: event.clientX, y: event.clientY };
      };
      
      const handleMouseUp = () => {
        isDragging = false;
      };
      
      const handleMouseDrag = (event: MouseEvent) => {
        if (!isDragging) return;
        
        const deltaX = event.clientX - previousMousePosition.x;
        const deltaY = event.clientY - previousMousePosition.y;
        
        nodesGroup.rotation.y += deltaX * 0.005;
        nodesGroup.rotation.x += deltaY * 0.005;
        linksGroup.rotation.y += deltaX * 0.005;
        linksGroup.rotation.x += deltaY * 0.005;
        
        previousMousePosition = { x: event.clientX, y: event.clientY };
      };
      
      const handleWheel = (event: WheelEvent) => {
        if (!cameraRef.current) return;
        
        const zoomSensitivity = 0.1;
        
        // Adjust camera position based on scroll
        cameraRef.current.position.z += event.deltaY * zoomSensitivity;
        
        // Clamp to prevent zooming too close or too far
        cameraRef.current.position.z = Math.max(10, Math.min(300, cameraRef.current.position.z));
        
        event.preventDefault();
      };
      
      // Add event listeners
      containerRef.current.addEventListener('mousemove', handleMouseMove);
      containerRef.current.addEventListener('click', handleClick);
      containerRef.current.addEventListener('mousedown', handleMouseDown);
      containerRef.current.addEventListener('mouseup', handleMouseUp);
      containerRef.current.addEventListener('mousemove', handleMouseDrag);
      containerRef.current.addEventListener('wheel', handleWheel, { passive: false });
      
      // Animation loop
      let animationFrameId: number;
      
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        
        if (rendererRef.current && cameraRef.current && sceneRef.current) {
          // Auto-rotate when not being dragged
          if (!isDragging) {
            nodesGroup.rotation.y += rotationSpeed;
            linksGroup.rotation.y += rotationSpeed;
            
            // Update label positions to follow nodes
            nodeLabelsRef.current.forEach((sprite, i) => {
              if (i < nodeObjects.length) {
                const nodeMesh = nodeObjects[i];
                sprite.position.copy(nodeMesh.position);
                sprite.visible = showLabels;
              }
            });
          }
          
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      };
      
      animate();
      
      setIsLoading(false);
      toast({
        title: "3D Visualization Ready",
        description: "Click and drag to rotate, scroll to zoom in/out.",
      });
      
      // Clean up
      return () => {
        cancelAnimationFrame(animationFrameId);
        
        if (containerRef.current) {
          containerRef.current.removeEventListener('mousemove', handleMouseMove);
          containerRef.current.removeEventListener('click', handleClick);
          containerRef.current.removeEventListener('mousedown', handleMouseDown);
          containerRef.current.removeEventListener('mouseup', handleMouseUp);
          containerRef.current.removeEventListener('mousemove', handleMouseDrag);
          containerRef.current.removeEventListener('wheel', handleWheel);
        }
        
        if (rendererRef.current && containerRef.current) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
        
        // Dispose of geometries and materials
        sphereGeometry.dispose();
        nodeObjects.forEach(node => {
          if (node.material instanceof THREE.Material) {
            node.material.dispose();
          }
        });
        
        linkObjects.forEach(link => {
          link.geometry.dispose();
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
  }, [nodeData, linkData, nodeSize, linkColor, backgroundColor, backgroundOpacity, customNodeColors, dynamicColorThemes, rotationSpeed, showLabels, toast, colorTheme]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      
      rendererRef.current.setSize(width, height);
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
        <div className="absolute top-4 right-4 z-10">
          <ThreeDNetworkControls
            nodeSize={nodeSize}
            rotationSpeed={rotationSpeed}
            showLabels={showLabels}
            colorTheme={colorTheme}
            onNodeSizeChange={(size) => {
              // Apply node size changes
              nodeObjectsRef.current.forEach(mesh => {
                mesh.scale.set(size, size, size);
              });
              
              toast({
                title: "Node Size Changed",
                description: `Node size set to ${size.toFixed(1)}`
              });
            }}
            onRotationSpeedChange={setRotationSpeed}
            onToggleLabels={() => setShowLabels(!showLabels)}
            onResetView={() => {
              if (cameraRef.current) {
                // Reset camera position
                cameraRef.current.position.set(0, 0, 100);
                cameraRef.current.lookAt(0, 0, 0);
                
                // Reset rotation
                if (sceneRef.current) {
                  const nodesGroup = sceneRef.current.getObjectByName('nodesGroup');
                  const linksGroup = sceneRef.current.getObjectByName('linksGroup');
                  
                  if (nodesGroup) nodesGroup.rotation.set(0, 0, 0);
                  if (linksGroup) linksGroup.rotation.set(0, 0, 0);
                }
              }
            }}
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
          />
        </div>
      )}
    </div>
  );
};

export default ThreeDVisualization;

// Export the visualization type
export type { VisualizationType } from '@/types/networkTypes';