import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Node, Link } from '@/types/networkTypes';

interface UseThreeDGraphProps {
  containerRef: React.RefObject<HTMLDivElement>;
  nodes: Node[];
  links: Link[];
  nodeSize: number;
  linkColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  customNodeColors: Record<string, string>;
  dynamicColorThemes: Record<string, Record<string, string>>;
}

interface ForceNode extends THREE.Vector3 {
  id: string;
  velocity: THREE.Vector3;
  isFixed: boolean;
  mass: number;
}

interface ForceLink {
  source: ForceNode;
  target: ForceNode;
  strength: number;
  distance: number;
}

export default function useThreeDGraph({
  containerRef,
  nodes,
  links,
  nodeSize,
  linkColor,
  backgroundColor,
  backgroundOpacity,
  customNodeColors,
  dynamicColorThemes
}: UseThreeDGraphProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  
  // Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  
  // Force simulation objects
  const forceNodesRef = useRef<ForceNode[]>([]);
  const forceLinksRef = useRef<ForceLink[]>([]);
  const nodeObjectsRef = useRef<THREE.Mesh[]>([]);
  const linkObjectsRef = useRef<THREE.Line[]>([]);
  
  // Simulation parameters
  const simulationRef = useRef({
    repulsionForce: 50,
    linkDistance: 30,
    linkStrength: 0.5,
    gravity: 0.1,
    friction: 0.9,
    isRunning: false
  });
  
  // Initialize Three.js scene and force simulation
  const initialize = () => {
    if (!containerRef.current || nodes.length === 0) return false;
    
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
      
      // Initialize force nodes
      const forceNodes: ForceNode[] = nodes.map(node => {
        // Create a node with random initial position
        const position = new THREE.Vector3(
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100
        );
        
        // Add velocity and other properties
        const forceNode = position as ForceNode;
        forceNode.id = node.id;
        forceNode.velocity = new THREE.Vector3(0, 0, 0);
        forceNode.isFixed = false;
        forceNode.mass = 1;
        
        return forceNode;
      });
      
      forceNodesRef.current = forceNodes;
      
      // Create a map of id to force node for quick lookup
      const nodeMap = new Map<string, ForceNode>();
      forceNodes.forEach(node => {
        nodeMap.set(node.id, node);
      });
      
      // Initialize force links
      const forceLinks: ForceLink[] = [];
      
      links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        const sourceNode = nodeMap.get(sourceId);
        const targetNode = nodeMap.get(targetId);
        
        if (sourceNode && targetNode) {
          forceLinks.push({
            source: sourceNode,
            target: targetNode,
            strength: simulationRef.current.linkStrength,
            distance: simulationRef.current.linkDistance
          });
        }
      });
      
      forceLinksRef.current = forceLinks;
      
      setIsInitialized(true);
      return true;
    } catch (error) {
      console.error("Error initializing 3D graph:", error);
      return false;
    }
  };
  
  // Update the force simulation for one step
  const updateForceSimulation = () => {
    const forceNodes = forceNodesRef.current;
    const forceLinks = forceLinksRef.current;
    const simulation = simulationRef.current;
    
    // Skip if not running
    if (!simulation.isRunning) return;
    
    // Apply forces to each node
    forceNodes.forEach(node => {
      if (node.isFixed) {
        node.velocity.set(0, 0, 0);
        return;
      }
      
      // Initialize force for this node
      const force = new THREE.Vector3(0, 0, 0);
      
      // Apply repulsion between nodes
      forceNodes.forEach(otherNode => {
        if (node === otherNode) return;
        
        const direction = new THREE.Vector3().subVectors(node, otherNode);
        const distance = direction.length();
        
        if (distance === 0) return;
        
        // Normalize and scale by repulsion force
        direction.normalize().multiplyScalar(simulation.repulsionForce / (distance * distance));
        force.add(direction);
      });
      
      // Apply link forces
      forceLinks.forEach(link => {
        if (link.source === node || link.target === node) {
          const otherNode = link.source === node ? link.target : link.source;
          const direction = new THREE.Vector3().subVectors(otherNode, node);
          const distance = direction.length();
          
          if (distance === 0) return;
          
          // Calculate force based on link properties
          const strength = link.source === node ? -link.strength : link.strength;
          const targetDistance = link.distance;
          const diff = (distance - targetDistance) * strength;
          
          direction.normalize().multiplyScalar(diff);
          force.add(direction);
        }
      });
      
      // Apply central gravity force
      const gravity = new THREE.Vector3().copy(node).multiplyScalar(-simulation.gravity);
      force.add(gravity);
      
      // Update velocity and position
      node.velocity.add(force);
      node.velocity.multiplyScalar(simulation.friction);
      node.add(node.velocity);
    });
    
    // Update visual objects if they exist
    if (nodeObjectsRef.current.length > 0) {
      forceNodes.forEach((node, index) => {
        const nodeMesh = nodeObjectsRef.current[index];
        if (nodeMesh) {
          nodeMesh.position.copy(node);
        }
      });
    }
    
    if (linkObjectsRef.current.length > 0) {
      forceLinks.forEach((link, index) => {
        const linkLine = linkObjectsRef.current[index];
        if (linkLine) {
          // Update link geometry
          const geometry = new THREE.BufferGeometry().setFromPoints([
            link.source,
            link.target
          ]);
          linkLine.geometry.dispose();
          linkLine.geometry = geometry;
        }
      });
    }
  };
  
  // Start the force simulation
  const startSimulation = () => {
    simulationRef.current.isRunning = true;
    setIsRunning(true);
  };
  
  // Stop the force simulation
  const stopSimulation = () => {
    simulationRef.current.isRunning = false;
    setIsRunning(false);
  };
  
  // Update simulation parameters
  const updateSimulationParams = ({
    repulsionForce,
    linkDistance,
    linkStrength,
    gravity,
    friction
  }: {
    repulsionForce?: number,
    linkDistance?: number,
    linkStrength?: number,
    gravity?: number,
    friction?: number
  }) => {
    if (repulsionForce !== undefined) {
      simulationRef.current.repulsionForce = repulsionForce;
    }
    
    if (linkDistance !== undefined) {
      simulationRef.current.linkDistance = linkDistance;
      forceLinksRef.current.forEach(link => {
        link.distance = linkDistance;
      });
    }
    
    if (linkStrength !== undefined) {
      simulationRef.current.linkStrength = linkStrength;
      forceLinksRef.current.forEach(link => {
        link.strength = linkStrength;
      });
    }
    
    if (gravity !== undefined) {
      simulationRef.current.gravity = gravity;
    }
    
    if (friction !== undefined) {
      simulationRef.current.friction = friction;
    }
  };
  
  // Fix/unfix a node
  const toggleNodeFixed = (nodeId: string, fixed?: boolean) => {
    const node = forceNodesRef.current.find(n => n.id === nodeId);
    if (node) {
      node.isFixed = fixed !== undefined ? fixed : !node.isFixed;
      if (node.isFixed) {
        node.velocity.set(0, 0, 0);
      }
    }
  };
  
  // Reset all nodes to initial positions
  const resetPositions = () => {
    forceNodesRef.current.forEach((node, index) => {
      // Set random position
      node.set(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100
      );
      node.velocity.set(0, 0, 0);
      node.isFixed = false;
    });
  };
  
  return {
    isInitialized,
    isRunning,
    forceNodes: forceNodesRef.current,
    forceLinks: forceLinksRef.current,
    scene: sceneRef.current,
    camera: cameraRef.current,
    renderer: rendererRef.current,
    
    // Methods
    initialize,
    updateForceSimulation,
    startSimulation,
    stopSimulation,
    updateSimulationParams,
    toggleNodeFixed,
    resetPositions
  };
}