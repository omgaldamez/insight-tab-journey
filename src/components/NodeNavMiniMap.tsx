// NodeNavMiniMap.tsx
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Node, Link } from '@/types/networkTypes';

interface NodeNavMiniMapProps {
  nodeData: Node[];
  linkData: Link[];
  currentNodeId: string | null;
  visitedNodes: Set<string>;
  onNodeSelect: (nodeId: string) => void;
  colorTheme: string;
  customNodeColors: Record<string, string>;
  dynamicColorThemes: Record<string, Record<string, string>>;
  // Optional props
  highlightSize?: number;
  showZoomControls?: boolean;
}

const NodeNavMiniMap: React.FC<NodeNavMiniMapProps> = ({
  nodeData,
  linkData,
  currentNodeId,
  visitedNodes,
  onNodeSelect,
  colorTheme,
  customNodeColors,
  dynamicColorThemes,
  highlightSize = 40,
  showZoomControls = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const nodeObjectsRef = useRef<THREE.Mesh[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentNodePosition, setCurrentNodePosition] = useState<{x: number, y: number} | null>(null);
  const [highlightZoom, setHighlightZoom] = useState<number>(highlightSize);
  const [showMagnifier, setShowMagnifier] = useState<boolean>(true);
  
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
  
  // Get current node info (category, connections)
  const getCurrentNodeInfo = () => {
    if (!currentNodeId) return "";
    
    const node = nodeData.find(n => n.id === currentNodeId);
    if (!node) return "";
    
    // Count connections
    let outgoingCount = 0;
    let incomingCount = 0;
    
    linkData.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (sourceId === currentNodeId) outgoingCount++;
      if (targetId === currentNodeId) incomingCount++;
    });
    
    return `${node.category} · ${outgoingCount + incomingCount} connections`;
  };
  
  // Track the current node position for highlighting
  useEffect(() => {
    if (!isInitialized || !currentNodeId) return;
    
    // Find the current node object
    const currentNodeObj = nodeObjectsRef.current.find(
      obj => obj.userData.nodeId === currentNodeId
    );
    
    if (currentNodeObj) {
      // Store the position for the highlight
      setCurrentNodePosition({
        x: currentNodeObj.position.x,
        y: currentNodeObj.position.y
      });
    } else {
      setCurrentNodePosition(null);
    }
  }, [currentNodeId, isInitialized]);
  
  // Initialize the mini-map
  useEffect(() => {
    // Force reinitialization if the minimap is initialized but renderer is lost
    if (isInitialized && (!rendererRef.current || !rendererRef.current.domElement || !rendererRef.current.domElement.parentNode)) {
      console.log("MiniMap: Renderer lost, forcing reinitialization");
      
      // Cleanup any existing animation frame
      if (animationFrameRef.current) {
        console.log("MiniMap: Canceling existing animation frame before reinitializing");
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      setIsInitialized(false);
      return;
    }
    
    if (!containerRef.current || nodeData.length === 0 || isInitialized) {
      console.log(`MiniMap: Skipping initialization - Container exists: ${!!containerRef.current}, Nodes: ${nodeData.length}, Already initialized: ${isInitialized}`);
      return;
    }
    
    try {
      console.log("MiniMap: Initializing minimap");
      // Get container dimensions
      const width = 180; // Fixed width for mini-map
      const height = 180; // Fixed height for mini-map
      
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1e1e1e); // Dark background for contrast
      sceneRef.current = scene;
      
      // Create orthographic camera for 2D view
      const frustrumSize = 120;
      const aspect = width / height;
      const camera = new THREE.OrthographicCamera(
        frustrumSize * aspect / -2,
        frustrumSize * aspect / 2,
        frustrumSize / 2,
        frustrumSize / -2,
        0.1,
        1000
      );
      camera.position.z = 100;
      cameraRef.current = camera;
      
      // Create renderer
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true 
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      
      if (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      
      // Create node objects for the mini-map
      const nodeObjects: THREE.Mesh[] = [];
      const nodePositions: Record<string, THREE.Vector3> = {};
      
      // Create a map of connection counts for sizing nodes
      const connectionCounts = new Map<string, number>();
      linkData.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        connectionCounts.set(sourceId, (connectionCounts.get(sourceId) || 0) + 1);
        connectionCounts.set(targetId, (connectionCounts.get(targetId) || 0) + 1);
      });
      
      // Calculate node positions using a force-directed algorithm
      // Simplified for the mini-map
      const positions: Record<string, { x: number, y: number }> = {};
      
      // Initialize with random positions
      nodeData.forEach(node => {
        positions[node.id] = { 
          x: (Math.random() - 0.5) * 80, 
          y: (Math.random() - 0.5) * 80 
        };
      });
      
      // Simple force simulation
      for (let i = 0; i < 50; i++) { // Limited iterations for performance
        // Repulsion
        for (let a = 0; a < nodeData.length; a++) {
          for (let b = a + 1; b < nodeData.length; b++) {
            const nodeA = nodeData[a];
            const nodeB = nodeData[b];
            const dx = positions[nodeB.id].x - positions[nodeA.id].x;
            const dy = positions[nodeB.id].y - positions[nodeA.id].y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 0.1;
            
            if (distance > 0.1) {
              const force = 30 / (distance * distance);
              const fx = dx / distance * force;
              const fy = dy / distance * force;
              
              positions[nodeA.id].x -= fx;
              positions[nodeA.id].y -= fy;
              positions[nodeB.id].x += fx;
              positions[nodeB.id].y += fy;
            }
          }
        }
        
        // Attraction for links
        linkData.forEach(link => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          
          if (positions[sourceId] && positions[targetId]) {
            const dx = positions[targetId].x - positions[sourceId].x;
            const dy = positions[targetId].y - positions[sourceId].y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 0.1;
            
            if (distance > 0.1) {
              const force = distance / 10;
              const fx = dx / distance * force;
              const fy = dy / distance * force;
              
              positions[sourceId].x += fx;
              positions[sourceId].y += fy;
              positions[targetId].x -= fx;
              positions[targetId].y -= fy;
            }
          }
        });
      }
      
      // Create links
      linkData.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if (positions[sourceId] && positions[targetId]) {
          const sourcePos = new THREE.Vector3(positions[sourceId].x, positions[sourceId].y, 0);
          const targetPos = new THREE.Vector3(positions[targetId].x, positions[targetId].y, 0);
          
          const geometry = new THREE.BufferGeometry().setFromPoints([sourcePos, targetPos]);
          const material = new THREE.LineBasicMaterial({ 
            color: 0x555555,
            transparent: true,
            opacity: 0.3
          });
          
          const line = new THREE.Line(geometry, material);
          scene.add(line);
        }
      });
      
      // Create node objects
      nodeData.forEach(node => {
        if (!positions[node.id]) return;
        
        const position = new THREE.Vector3(positions[node.id].x, positions[node.id].y, 0);
        nodePositions[node.id] = position;
        
        // Size based on connections (more connections = bigger node)
        const connectionCount = connectionCounts.get(node.id) || 0;
        const size = 1 + Math.min(connectionCount * 0.2, 2);
        
        const geometry = new THREE.CircleGeometry(size, 16);
        const material = new THREE.MeshBasicMaterial({ 
          color: getNodeColor(node),
          transparent: true,
          opacity: visitedNodes.has(node.id) ? 1.0 : 0.5
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.userData = { nodeId: node.id };
        
        scene.add(mesh);
        nodeObjects.push(mesh);
      });
      
      nodeObjectsRef.current = nodeObjects;
      
      // Initialize current node position if we already have a current node
      if (currentNodeId) {
        const currentNodeObj = nodeObjects.find(
          obj => obj.userData.nodeId === currentNodeId
        );
        
        if (currentNodeObj) {
          setCurrentNodePosition({
            x: currentNodeObj.position.x,
            y: currentNodeObj.position.y
          });
        }
      }
      
      // Set up interaction
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      
      const handleMouseMove = (event: MouseEvent) => {
        if (!rendererRef.current) return;
        
        const rect = rendererRef.current.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        
        const intersects = raycaster.intersectObjects(nodeObjects);
        
        if (intersects.length > 0) {
          const nodeId = intersects[0].object.userData.nodeId;
          
          if (nodeId !== hoveredNodeId) {
            setHoveredNodeId(nodeId);
            containerRef.current!.style.cursor = 'pointer';
          }
        } else if (hoveredNodeId) {
          setHoveredNodeId(null);
          containerRef.current!.style.cursor = 'default';
        }
      };
      
      const handleClick = (event: MouseEvent) => {
        if (!rendererRef.current || isDragging) return;
        
        const rect = rendererRef.current.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        
        const intersects = raycaster.intersectObjects(nodeObjects);
        
        if (intersects.length > 0) {
          const nodeId = intersects[0].object.userData.nodeId;
          onNodeSelect(nodeId);
        }
      };
      
      const handleMouseDown = () => {
        setIsDragging(false);
      };
      
      const handleMouseUp = () => {
        if (isDragging) {
          setIsDragging(false);
        }
      };
      
      renderer.domElement.addEventListener('mousemove', handleMouseMove);
      renderer.domElement.addEventListener('click', handleClick);
      renderer.domElement.addEventListener('mousedown', handleMouseDown);
      renderer.domElement.addEventListener('mouseup', handleMouseUp);
      
      // Animation loop
      const animate = () => {
        try {
          animationFrameRef.current = requestAnimationFrame(animate);
          
          // Safety check - if renderer is lost but we still think we're initialized,
          // force reinitialization
          if (!renderer || !renderer.domElement || !renderer.domElement.parentNode) {
            console.log("MiniMap Animation: Renderer lost, forcing minimap reinitialization");
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
            setIsInitialized(false);
            return;
          }
          
          // Additional checks for valid scene and camera
          if (!scene || !camera) {
            console.log("MiniMap Animation: Scene or camera lost, forcing minimap reinitialization");
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
            setIsInitialized(false);
            return;
          }
          
          try {
            // Highlight current node
            let foundCurrentNode = false;
            
            nodeObjects.forEach(mesh => {
              try {
                const nodeId = mesh.userData.nodeId;
                const material = mesh.material as THREE.MeshBasicMaterial;
                
                if (nodeId === currentNodeId) {
                  // Track that we found the current node
                  foundCurrentNode = true;
                  
                  // Current node is highlighted brightly
                  material.color.set(0xff3333); // Bright red
                  material.opacity = 1.0;
                  
                  // Make this node slightly bigger to stand out
                  mesh.scale.set(1.5, 1.5, 1.5);
                } else if (nodeId === hoveredNodeId) {
                  // Hovered node is slightly highlighted
                  const node = nodeData.find(n => n.id === nodeId);
                  if (node) {
                    material.color.set(getNodeColor(node));
                    material.color.offsetHSL(0, 0, 0.2); // Lighten
                  }
                  material.opacity = 1.0;
                  mesh.scale.set(1.2, 1.2, 1.2);
                } else {
                  // Regular node
                  const node = nodeData.find(n => n.id === nodeId);
                  if (node) {
                    material.color.set(getNodeColor(node));
                  }
                  material.opacity = visitedNodes.has(nodeId) ? 0.8 : 0.4;
                  mesh.scale.set(1.0, 1.0, 1.0);
                }
              } catch (meshError) {
                console.error("MiniMap: Error processing node mesh:", meshError);
              }
            });
            
            if (currentNodeId && !foundCurrentNode) {
              console.log(`MiniMap: Current node ${currentNodeId} not found in minimap objects`);
            }
            
            // Check if renderer context is lost before rendering
            if (renderer.getContext().isContextLost()) {
              console.log("MiniMap: WebGL context lost, forcing reinitialization");
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
              setIsInitialized(false);
              return;
            }
            
            // Render the scene
            renderer.render(scene, camera);
          } catch (renderError) {
            console.error("MiniMap: Error in rendering loop:", renderError);
            // If we encounter an error in the animation loop, force reinitialization
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
            setIsInitialized(false);
          }
        } catch (outerError) {
          console.error("MiniMap: Critical error in animation frame:", outerError);
          try {
            cancelAnimationFrame(animationFrameRef.current);
          } catch (e) {
            console.error("MiniMap: Error even when trying to cancel animation frame:", e);
          }
          animationFrameRef.current = null;
          setIsInitialized(false);
        }
      };
      
      animate();
      setIsInitialized(true);
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        renderer.domElement.removeEventListener('mousemove', handleMouseMove);
        renderer.domElement.removeEventListener('click', handleClick);
        renderer.domElement.removeEventListener('mousedown', handleMouseDown);
        renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      };
      
    } catch (error) {
      console.error("Error initializing mini-map:", error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeData, linkData, colorTheme, customNodeColors, dynamicColorThemes, isInitialized, onNodeSelect, visitedNodes, currentNodeId, hoveredNodeId, isDragging]);
  
  // Update on current node change and ensure minimap is working
  useEffect(() => {
    // Check if we need to reinitialize after navigation
    if (isInitialized && (!rendererRef.current || !sceneRef.current || !cameraRef.current)) {
      console.log("MiniMap: References lost after node change, reinitializing");
      
      // Clean up any existing animation frame
      if (animationFrameRef.current) {
        console.log("MiniMap: Cleaning up animation frame before reinitializing");
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      setIsInitialized(false);
      return;
    }
    
    if (isInitialized && rendererRef.current && sceneRef.current && cameraRef.current) {
      try {
        // Ensure the renderer's domElement is still in the DOM
        if (!rendererRef.current.domElement.parentNode && containerRef.current) {
          console.log("MiniMap: Renderer element detached, reattaching");
          containerRef.current.appendChild(rendererRef.current.domElement);
        }
        
        // Check if WebGL context is lost
        if (rendererRef.current.getContext().isContextLost()) {
          console.log("MiniMap: WebGL context lost during node change, forcing reinitialization");
          setIsInitialized(false);
          return;
        }
        
        // Force a render to refresh the view
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        console.log(`MiniMap: Refreshed render for node ${currentNodeId}`);
      } catch (error) {
        console.error("MiniMap: Error refreshing minimap after node change:", error);
        setIsInitialized(false);
      }
    }
  }, [currentNodeId, isInitialized]);
  
  // Periodic check to ensure minimap is visible and working
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (!isInitialized) {
        // If not initialized, nothing to check
        return;
      }
      
      try {
        if (rendererRef.current) {
          if (!rendererRef.current.domElement.parentNode && containerRef.current) {
            console.log("MiniMap: Periodic check - Renderer element detached, reattaching");
            containerRef.current.appendChild(rendererRef.current.domElement);
            
            // Force a render
            if (sceneRef.current && cameraRef.current) {
              try {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
                console.log("MiniMap: Reattached and forced render successful");
              } catch (renderError) {
                console.error("MiniMap: Error rendering after reattach:", renderError);
                setIsInitialized(false);
              }
            }
          } else {
            // Check WebGL context even if element is attached
            try {
              if (rendererRef.current.getContext().isContextLost()) {
                console.log("MiniMap: Periodic check - WebGL context lost, forcing reinitialization");
                setIsInitialized(false);
              }
            } catch (contextError) {
              console.error("MiniMap: Error checking context in periodic check:", contextError);
              setIsInitialized(false);
            }
          }
        } else {
          console.log("MiniMap: Periodic check - Renderer reference lost");
          setIsInitialized(false);
        }
      } catch (checkError) {
        console.error("MiniMap: Error in periodic check:", checkError);
        setIsInitialized(false);
      }
    }, 1000); // Check every second for more responsive recovery
    
    return () => clearInterval(checkInterval);
  }, [isInitialized]);
  
  return (
    <div 
      className="mini-map-container"
      style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        width: '180px',
        height: '180px',
        borderRadius: '4px',
        overflow: 'hidden',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.5)',
        zIndex: 50
      }}
    >
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          position: 'relative'
        }}
      />
      
      {/* Current position highlight */}
      {currentNodePosition && rendererRef.current && showMagnifier && (
        <div
          className="current-position-highlight"
          style={{
            position: 'absolute',
            width: `${highlightZoom}px`,
            height: `${highlightZoom}px`,
            // Calculate the position in the renderer's coordinate system
            left: `${(currentNodePosition.x / 100 + 0.5) * 180 - highlightZoom / 2}px`,
            top: `${(-currentNodePosition.y / 100 + 0.5) * 180 - highlightZoom / 2}px`,
            border: '2px dashed rgba(255, 0, 0, 0.7)',
            borderRadius: '4px',
            boxShadow: 'inset 0 0 10px rgba(255, 0, 0, 0.3)',
            pointerEvents: 'none',
            zIndex: 51,
            animation: 'pulse 2s infinite'
          }}
        />
      )}
      
      {/* Header overlay */}
      <div 
        className="mini-map-overlay-header"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          padding: '4px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          fontSize: '10px',
          textAlign: 'center'
        }}
      >
        Network Overview
      </div>
      
      {/* Current node info overlay */}
      {currentNodeId && (
        <div
          className="current-node-info"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            padding: '4px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            fontSize: '10px',
            textAlign: 'center',
            zIndex: 52,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ 
            fontWeight: 'bold', 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis'
          }}>
            {currentNodeId}
          </div>
          <div style={{ 
            fontSize: '8px', 
            opacity: 0.8 
          }}>
            {getCurrentNodeInfo()}
          </div>
        </div>
      )}
      
      {/* Hover tooltip */}
      {hoveredNodeId && hoveredNodeId !== currentNodeId && (
        <div
          className="mini-map-tooltip"
          style={{
            position: 'absolute',
            top: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '4px 8px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            fontSize: '10px',
            borderRadius: '2px',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 53
          }}
        >
          Click to navigate to {hoveredNodeId}
        </div>
      )}
      
      {/* Zoom controls for the highlight */}
      {showZoomControls && (
        <div
          className="zoom-controls"
          style={{
            position: 'absolute',
            top: '28px',
            right: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            zIndex: 54
          }}
        >
          <button
            onClick={() => setHighlightZoom(Math.min(highlightZoom + 10, 80))}
            style={{
              width: '18px',
              height: '18px',
              background: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '2px',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Zoom in (increase highlight size)"
          >
            +
          </button>
          
          <button
            onClick={() => setHighlightZoom(Math.max(highlightZoom - 10, 20))}
            style={{
              width: '18px',
              height: '18px',
              background: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '2px',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Zoom out (decrease highlight size)"
          >
            -
          </button>
          
          <button
            onClick={() => setShowMagnifier(!showMagnifier)}
            style={{
              width: '18px',
              height: '18px',
              background: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '2px',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: showMagnifier ? 1 : 0.5
            }}
            title="Toggle magnifier"
          >
            M
          </button>
        </div>
      )}
      
      {/* Add CSS animation for the highlight */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 0.9; }
          100% { transform: scale(1); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default NodeNavMiniMap;