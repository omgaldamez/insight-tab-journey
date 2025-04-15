/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import { useState, useEffect, useCallback, useMemo, RefObject, useRef } from 'react';
import * as d3 from 'd3';
import { Node, Link } from '@/types/networkTypes';
import { prepareChordMatrix, createCustomRibbon, addShapesOrParticlesAlongPath } from '@/utils/chordUtils';
import { useToast } from '@/components/ui/use-toast';
import { setupParticleMovement } from '@/utils/chordUtils';
import { WebGLParticleSystem } from '@/utils/webglParticleSystem';


export interface DetailedNode {
  id: string;
  category: string;
  categoryIndex: number;
  nodeIndex: number;
  connections: number;
}

export interface ConnectionInfo {
  sourceId: string;
  sourceCategory: string;
  targetId: string;
  targetCategory: string;
  value?: number | string;
}

export interface ChordDiagramConfig {
  // Basic styling
  chordStrokeWidth: number;
  chordOpacity: number;
  chordStrokeOpacity: number;
  arcOpacity: number;

  // ParticlesConnections
particlesOnlyRealConnections: boolean;  // When true, only add particles to real connections
minimalConnectionParticleColor: string; // Color for particles on minimal connections
minimalConnectionParticleSize: number;
minimalConnectionParticleSizeVariation: number;
minimalConnectionParticleOpacity: number;
minimalConnectionParticleStrokeColor: string;
minimalConnectionParticleStrokeWidth: number;
  
  // Directional styling
  useDirectionalStyling: boolean;
  sourceChordOpacity: number;
  targetChordOpacity: number;
  sourceChordColor: string;
  targetChordColor: string;
  
  // Variable width
  chordWidthVariation: number;
  chordWidthPosition: 'start' | 'middle' | 'end' | 'custom';
  chordWidthCustomPosition: number;
  
  // Stroke width variation
  strokeWidthVariation: number;
  strokeWidthPosition: 'start' | 'middle' | 'end' | 'custom';
  strokeWidthCustomPosition: number;
  
  // Geometric shapes
  useGeometricShapes: boolean;
  shapeType: 'circle' | 'square' | 'diamond';
  shapeSize: number;
  shapeSpacing: number;
  shapeFill: string;
  shapeStroke: string;
  
  // Particles
  particleMode: boolean;
  particleDensity: number;
  particleSize: number;
  particleSizeVariation: number;
  particleBlur: number;
  particleDistribution: 'uniform' | 'random' | 'gaussian';
  particleColor: string;
  particleOpacity: number;
  
  particleMovement: boolean;
  particleMovementAmount: number;
  
  particleStrokeColor: string;
  particleStrokeWidth: number;
  particleGeometryStrokeColor: string;
  particleGeometryStrokeWidth: number;
  
    // Particles per chord
    maxParticlesPerChord: number;          // Maximum particles per chord
    maxParticlesDetailedView: number;      // Maximum particles in detailed view
    maxShapesDetailedView: number;         // Maximum shapes in detailed view

  // Animation
  isAnimating: boolean;
  animationSpeed: number;
  useFadeTransition: boolean;
  transitionDuration: number;
  
  // Display options
  showDetailedView: boolean;
  showAllNodes: boolean;
  evenDistribution: boolean;
  useColoredRibbons: boolean;
  ribbonFillEnabled: boolean;
  
  // WebGL rendering options (new)
  useWebGLRenderer: boolean;
  webGLParticleQuality: 'low' | 'medium' | 'high';
}

export interface ChordDiagramHookProps {
  nodeData: Node[];
  linkData: Link[];
  svgRef: RefObject<SVGSVGElement>;
  containerRef: RefObject<HTMLDivElement>;
  contentRef: React.MutableRefObject<SVGGElement | null>;
  tooltipRef: RefObject<HTMLDivElement>;
  getNodeColor: (node: { id: string, category: string }) => string;
  textColor: string;
  customNodeColors: Record<string, string>;
  colorTheme: string;
  dynamicColorThemes: Record<string, Record<string, string>>;
}

interface ChordTooltipInfo {
  content: string;
  position: { x: number, y: number };
}

export const useChordDiagram = ({
  nodeData,
  linkData,
  svgRef,
  containerRef,
  contentRef,
  tooltipRef,
  getNodeColor,
  textColor,
  customNodeColors,
  colorTheme,
  dynamicColorThemes
}: ChordDiagramHookProps) => {
  const { toast } = useToast();
  const particleMovementCleanupRef = useRef<(() => void) | null>(null);
  const webglParticleSystemRef = useRef<WebGLParticleSystem | null>(null);

  // Basic state
  const [isLoading, setIsLoading] = useState(true);
  const [visualizationError, setVisualizationError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedNodeConnections, setSelectedNodeConnections] = useState<{ to: string[]; from: string[] }>({ to: [], from: [] });
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [categoryNodeCounts, setCategoryNodeCounts] = useState<Record<string, number>>({});
  const [categoryMatrix, setCategoryMatrix] = useState<number[][]>([]);
  const [nodeCounts, setNodeCounts] = useState<{ total: number }>({ total: 0 });
  const [nodesByCategory, setNodesByCategory] = useState<Record<string, Node[]>>({});
  const [detailedNodeData, setDetailedNodeData] = useState<DetailedNode[]>([]);
  const [detailedMatrix, setDetailedMatrix] = useState<number[][]>([]);
  const [needsRedraw, setNeedsRedraw] = useState(false);
  const [chordPaths, setChordPaths] = useState<SVGPathElement[]>([]);

  
  // Chord diagram configuration
  const [chordConfig, setChordConfig] = useState<ChordDiagramConfig>({
    // Basic styling
    chordStrokeWidth: 0.5,
    chordOpacity: 0.75,
    chordStrokeOpacity: 1.0,
    arcOpacity: 0.8,

    particlesOnlyRealConnections: true, // Default to only real connections
minimalConnectionParticleColor: '#aaaaaa',
minimalConnectionParticleSize: 0.8,
minimalConnectionParticleSizeVariation: 0.3,
minimalConnectionParticleOpacity: 0.3,
minimalConnectionParticleStrokeColor: '#999999',
minimalConnectionParticleStrokeWidth: 0.1,
    
    // Directional styling
    useDirectionalStyling: false,
    sourceChordOpacity: 0.8,
    targetChordOpacity: 0.6,
    sourceChordColor: '#3498db',
    targetChordColor: '#e74c3c',
    
    // Variable width
    chordWidthVariation: 1.0,
    chordWidthPosition: 'middle',
    chordWidthCustomPosition: 0.5,
    
    // Stroke width variation
    strokeWidthVariation: 1.0,
    strokeWidthPosition: 'middle',
    strokeWidthCustomPosition: 0.5,
    
    // Geometric shapes
    useGeometricShapes: false,
    shapeType: 'circle',
    shapeSize: 3,
    shapeSpacing: 10,
    shapeFill: '#ffffff',
    shapeStroke: '#000000',
    
    // Particles
    particleMode: false,
    particleDensity: 100,
    particleSize: 1.2,
    particleSizeVariation: 0.5,
    particleBlur: 0,
    particleDistribution: 'random',
    particleColor: '#ffffff',
    particleOpacity: 0.7,
    
    particleMovement: false,
    particleMovementAmount: 1.0,
    
    particleStrokeColor: '#ffffff',
    particleStrokeWidth: 0.2,
    particleGeometryStrokeColor: '#ffffff',
    particleGeometryStrokeWidth: 0.3,

    maxParticlesPerChord: 100,       // Default for normal view
    maxParticlesDetailedView: 50,    // Default for detailed view
    maxShapesDetailedView: 30,       // Default for shapes
    
    // Animation
    isAnimating: false,
    animationSpeed: 1.0,
    useFadeTransition: false,
    transitionDuration: 500,
    
    // Display options
    showDetailedView: false,
    showAllNodes: true,
    evenDistribution: false,
    useColoredRibbons: true,
    ribbonFillEnabled: true,
    
    // WebGL rendering options (new)
    useWebGLRenderer: false,
    webGLParticleQuality: 'medium'
  });
  
  // Animation state
  const [currentAnimatedIndex, setCurrentAnimatedIndex] = useState(0);
  const [totalRibbonCount, setTotalRibbonCount] = useState(0);
  const [chordData, setChordData] = useState<d3.Chord[]>([]);
  const [currentConnectionInfo, setCurrentConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<ChordTooltipInfo | null>(null);
  const animationRef = useRef<number | null>(null);
  const particleUpdateTimeoutRef = useRef<number | null>(null);
  
  // Extract all config properties
  const {
    chordStrokeWidth, chordOpacity, chordStrokeOpacity, arcOpacity,
    useDirectionalStyling, sourceChordOpacity, targetChordOpacity, sourceChordColor, targetChordColor,
    chordWidthVariation, chordWidthPosition, chordWidthCustomPosition,
    strokeWidthVariation, strokeWidthPosition, strokeWidthCustomPosition,
    useGeometricShapes, shapeType, shapeSize, shapeSpacing, shapeFill, shapeStroke,
    particleMode, particleDensity, particleSize, particleSizeVariation, particleBlur,
    particleDistribution, particleColor, particleOpacity, particleStrokeColor, particleStrokeWidth,
    isAnimating, animationSpeed, useFadeTransition, transitionDuration,
    showDetailedView, showAllNodes, evenDistribution, useColoredRibbons, ribbonFillEnabled,
    useWebGLRenderer, webGLParticleQuality
  } = chordConfig;
  
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
    }
  }, [nodeData]);

  // Create the connectivity matrix for chord diagram
  useEffect(() => {
    if (uniqueCategories.length === 0 || linkData.length === 0) return;

    try {
      console.log(`Creating matrix with ${uniqueCategories.length} categories`);
      
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
      let totalConnections = 0;
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
            totalConnections++;
          }
        }
      });
      
      console.log(`Matrix created with ${totalConnections} total connections`);
      
      // Only add minimal values for empty categories if showAllNodes is true
      // This ensures categories without connections only appear when the toggle is on
      if (showAllNodes) {
        // Add a small value for every category to ensure it appears
        // This is critical for categories with no outgoing links
        for (let i = 0; i < uniqueCategories.length; i++) {
          // Ensure each category has at least a minimal value for incoming connections
          let hasIncoming = false;
          for (let j = 0; j < uniqueCategories.length; j++) {
            if (i !== j && matrix[j][i] > 0) {
              hasIncoming = true;
              break;
            }
          }
          
          if (!hasIncoming) {
            // If no incoming connections, add minimal ones from other categories
            for (let j = 0; j < uniqueCategories.length; j++) {
              if (i !== j) {
                matrix[j][i] = 0.2; // Add slightly larger value for better visibility
              }
            }
          }
          
          // Also ensure each category has at least a minimal value for outgoing connections
          let hasOutgoing = false;
          for (let j = 0; j < uniqueCategories.length; j++) {
            if (i !== j && matrix[i][j] > 0) {
              hasOutgoing = true;
              break;
            }
          }
          
          if (!hasOutgoing) {
            // If no outgoing connections, add minimal ones to other categories
            for (let j = 0; j < uniqueCategories.length; j++) {
              if (i !== j) {
                matrix[i][j] = 0.2; // Add slightly larger value for better visibility
              }
            }
          }
        }
      }

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
        
        // In detailed view, skip nodes with no connections unless showAllNodes is true
        const filteredNodes = showAllNodes 
          ? nodesWithConnectionCounts 
          : nodesWithConnectionCounts.filter(item => item.connections > 0);
        
        // Add nodes to detailed nodes array
        filteredNodes.forEach(({ node, connections }, nodeIndex) => {
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
      
      // Mark that we need to redraw
      setNeedsRedraw(true);
    } catch (error) {
      console.error("Error creating chord matrix:", error);
      setVisualizationError("Failed to create chord diagram matrix");
      setIsLoading(false);
    }
  }, [
    uniqueCategories, 
    nodeData, 
    linkData, 
    showAllNodes // Only recalculate when this changes
  ]);

// Effect to initialize and manage the WebGL particle system
useEffect(() => {
    if (chordConfig.useWebGLRenderer && chordConfig.particleMode) {
        console.log('[CHORD-WEBGL-DEBUG] WebGL rendering enabled:', {
          particleMovement: chordConfig.particleMovement,
          particleMovementAmount: chordConfig.particleMovementAmount,
          particleCount: chordConfig.particleDensity,
          particleQuality: chordConfig.webGLParticleQuality
        });
        
        // Verify the chord paths 
        console.log(`[CHORD-WEBGL-DEBUG] Using ${chordPaths.length} SVG paths for WebGL`);
      }
  // Only proceed if WebGL rendering is enabled and particle mode is on
  if (!chordConfig.useWebGLRenderer || !chordConfig.particleMode || !containerRef.current) {
    // Clean up any existing WebGL system if settings are disabled
    if (webglParticleSystemRef.current) {
      console.log('[CHORD-WEBGL] Disposing WebGL system due to rendering mode change');
      webglParticleSystemRef.current.dispose();
      webglParticleSystemRef.current = null;
    }
    return;
  }

  console.log('[CHORD-WEBGL] Initializing or updating WebGL particle system');
  
  // Initialize WebGL system if not already created
  if (!webglParticleSystemRef.current) {
    webglParticleSystemRef.current = new WebGLParticleSystem({
      container: containerRef.current,
      particleColor: chordConfig.particleColor,
      particleSize: chordConfig.particleSize,
      particleSizeVariation: chordConfig.particleSizeVariation,
      particleOpacity: chordConfig.particleOpacity,
      particleCount: chordConfig.particleDensity,
      particleBlur: chordConfig.particleBlur,
      particleDistribution: chordConfig.particleDistribution,
      particleMovement: chordConfig.particleMovement,
      particleMovementAmount: chordConfig.particleMovementAmount,
      particleStrokeColor: chordConfig.particleStrokeColor,
      particleStrokeWidth: chordConfig.particleStrokeWidth,
      particleQuality: chordConfig.webGLParticleQuality
    });
    webglParticleSystemRef.current.init();
  } else {
    // Update existing WebGL system with new options
    webglParticleSystemRef.current.updateOptions({
      particleColor: chordConfig.particleColor,
      particleSize: chordConfig.particleSize,
      particleSizeVariation: chordConfig.particleSizeVariation,
      particleOpacity: chordConfig.particleOpacity,
      particleCount: chordConfig.particleDensity,
      particleBlur: chordConfig.particleBlur,
      particleDistribution: chordConfig.particleDistribution,
      particleMovement: chordConfig.particleMovement,
      particleMovementAmount: chordConfig.particleMovementAmount,
      particleStrokeColor: chordConfig.particleStrokeColor,
      particleStrokeWidth: chordConfig.particleStrokeWidth,
      particleQuality: chordConfig.webGLParticleQuality
    });
  }

  // Apply chord paths if available
  if (chordPaths.length > 0 && webglParticleSystemRef.current) {
    console.log(`[CHORD-WEBGL] Setting ${chordPaths.length} paths to WebGL system`);
    webglParticleSystemRef.current.setPathsFromSVG(chordPaths);
    
    // Start or stop animation based on movement setting
    if (chordConfig.particleMovement) {
      webglParticleSystemRef.current.startAnimation();
    } else {
      webglParticleSystemRef.current.stopAnimation();
    }
  }

  // Clean up function
  return () => {
    if (webglParticleSystemRef.current) {
      webglParticleSystemRef.current.stopAnimation();
    }
  };
}, [
  chordConfig.useWebGLRenderer,
  chordConfig.particleMode,
  chordConfig.particleColor,
  chordConfig.particleSize,
  chordConfig.particleSizeVariation,
  chordConfig.particleOpacity,
  chordConfig.particleDensity,
  chordConfig.particleBlur,
  chordConfig.particleDistribution,
  chordConfig.particleMovement,
  chordConfig.particleMovementAmount,
  chordConfig.particleStrokeColor,
  chordConfig.particleStrokeWidth,
  chordConfig.webGLParticleQuality,
  chordPaths.length
]);

// Function to sync WebGL transforms with SVG zoom/pan
const syncWebGLTransform = useCallback(() => {
  if (!svgRef.current || !webglParticleSystemRef.current || !contentRef.current) return;
  
  // Get the current transform from the SVG content group
  const transform = contentRef.current.getAttribute('transform') || '';
  
  // Apply this transform to the WebGL system
  webglParticleSystemRef.current.applyTransform(transform);
}, []);

// Effect to clean up WebGL system on unmount
useEffect(() => {
  return () => {
    if (webglParticleSystemRef.current) {
      console.log('[CHORD-WEBGL] Disposing WebGL system on unmount');
      webglParticleSystemRef.current.dispose();
      webglParticleSystemRef.current = null;
    }
  };
}, []);

// Add an effect to handle particle movement changes
useEffect(() => {
    // Clean up any existing particle movement
    if (particleMovementCleanupRef.current) {
      particleMovementCleanupRef.current();
      particleMovementCleanupRef.current = null;
    }
    
    // Start new particle movement if enabled and particles are active
    if (chordConfig.particleMode && chordConfig.particleMovement && svgRef.current && !chordConfig.useWebGLRenderer) {
      particleMovementCleanupRef.current = setupParticleMovement(
        svgRef.current,
        chordConfig.particleMovementAmount,
        true
      );
    }
    
    // Cleanup on unmount
    return () => {
      if (particleMovementCleanupRef.current) {
        particleMovementCleanupRef.current();
      }
    };
  }, [
    chordConfig.particleMode,
    chordConfig.particleMovement,
    chordConfig.particleMovementAmount,
    chordConfig.useWebGLRenderer,
    needsRedraw, // Re-initialize when diagram redraws
    svgRef
  ]);
  
  // Modify the main rendering effect to support particle movement
  // Find the section after particles are added to the chord paths, add this code:
  
  if (particleMode) {
    // After adding particles, check if movement should be enabled
    if (chordConfig.particleMovement && svgRef.current && !chordConfig.useWebGLRenderer) {
      // Clean up any existing animation before starting a new one
      if (particleMovementCleanupRef.current) {
        particleMovementCleanupRef.current();
      }
      
      // Set up the new animation
      particleMovementCleanupRef.current = setupParticleMovement(
        svgRef.current,
        chordConfig.particleMovementAmount,
        true
      );
    }
  }

  // Animation functions for chord diagram
  const startAnimation = useCallback(() => {
    setChordConfig(prev => ({ ...prev, isAnimating: true }));
    
    // If we're at the end, reset to the beginning
    if (currentAnimatedIndex >= totalRibbonCount) {
      setCurrentAnimatedIndex(0);
    }
    
    // Start the animation loop
    const animate = () => {
      setCurrentAnimatedIndex(prevIndex => {
        // If we've reached the end, stop the animation
        if (prevIndex >= totalRibbonCount) {
          setChordConfig(prev => ({ ...prev, isAnimating: false }));
          return prevIndex;
        }
        // Otherwise, advance to the next ribbon
        return prevIndex + 1;
      });
      
      // Calculate delay based on animation speed
      // Enhanced to support speeds up to 10x
      let frameDelay = 1000 / animationSpeed;
      
      // For very high speeds (>5x), adjust the delay calculation
      // to make transitions smoother but still reach 10x speed
      if (animationSpeed > 5) {
        frameDelay = 1000 / (5 + (animationSpeed - 5) * 0.5);
      }
      
      // Apply additional time for fade transition if enabled
      if (useFadeTransition) {
        // When fade is enabled, we need more time between frames
        // but still respect the overall speed setting
        frameDelay = Math.max(frameDelay, transitionDuration * 0.4 / animationSpeed);
      }
      
      // Schedule the next frame
      animationRef.current = window.setTimeout(animate, frameDelay);
    };
    
    // Calculate initial delay
    const initialDelay = useFadeTransition ? 
      Math.max(300, transitionDuration * 0.5) / animationSpeed : 
      1000 / animationSpeed;
    
    // Start the animation with initial delay
    animationRef.current = window.setTimeout(animate, initialDelay);
  }, [
    currentAnimatedIndex, 
    totalRibbonCount, 
    animationSpeed, 
    useFadeTransition, 
    transitionDuration
  ]);

  // Stop animation
  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    setChordConfig(prev => ({ ...prev, isAnimating: false }));
  }, []);

  // Toggle animation
  const toggleAnimation = useCallback(() => {
    if (isAnimating) {
      stopAnimation();
    } else {
      startAnimation();
    }
  }, [isAnimating, startAnimation, stopAnimation]);

  // Go to previous ribbon
  const goToPreviousRibbon = useCallback(() => {
    // Stop any running animation
    stopAnimation();
    
    // Decrement index, but don't go below 0
    setCurrentAnimatedIndex(prevIndex => Math.max(0, prevIndex - 1));
    
    // Force redraw
    setNeedsRedraw(true);
  }, [stopAnimation]);

  // Go to next ribbon
  const goToNextRibbon = useCallback(() => {
    // Stop any running animation
    stopAnimation();
    
    // Increment index, but don't exceed total count
    setCurrentAnimatedIndex(prevIndex => Math.min(totalRibbonCount, prevIndex + 1));
    
    // Force redraw
    setNeedsRedraw(true);
  }, [stopAnimation, totalRibbonCount]);

  // Reset animation
  const resetAnimation = useCallback(() => {
    stopAnimation();
    setCurrentAnimatedIndex(0);
    setNeedsRedraw(true);
  }, [stopAnimation]);

  // Change animation speed
  const changeAnimationSpeed = useCallback((speed: number) => {
    setChordConfig(prev => ({ ...prev, animationSpeed: speed }));
    
    // If animation is running, restart it with new speed
    if (isAnimating && animationRef.current) {
      clearTimeout(animationRef.current);
      startAnimation();
    }
  }, [isAnimating, startAnimation]);

  // Update config settings
  const updateConfig = useCallback((updates: Partial<ChordDiagramConfig>) => {
    // Log diagnostics for particle-related changes
    if ('particleMode' in updates) {
      console.log(`[DIAGRAM-DIAGNOSTICS] Particle mode toggled: ${updates.particleMode}`);
      if (updates.particleMode && showDetailedView) {
        console.log(`[DIAGRAM-DIAGNOSTICS] WARNING: Enabling particles in detailed view may impact performance`);
      }
    }
    
    if ('particleDensity' in updates) {
      console.log(`[DIAGRAM-DIAGNOSTICS] Particle density changed: ${updates.particleDensity}`);
    }
    
    if ('particleMovement' in updates) {
      console.log(`[DIAGRAM-DIAGNOSTICS] Particle movement toggled: ${updates.particleMovement}`);
    }
    
    if ('useWebGLRenderer' in updates) {
      console.log(`[DIAGRAM-DIAGNOSTICS] WebGL rendering toggled: ${updates.useWebGLRenderer}`);
      if (updates.useWebGLRenderer && showDetailedView) {
        console.log(`[DIAGRAM-DIAGNOSTICS] WebGL can significantly improve performance with many particles`);
      }
    }
    
    setChordConfig(prev => ({
      ...prev,
      ...updates
    }));
    setNeedsRedraw(true);
  }, [showDetailedView]);

  // Effect to update connection info when animation index changes
  useEffect(() => {
    if (!isLoading && chordData.length > 0) {
      if (currentAnimatedIndex > 0 && currentAnimatedIndex <= chordData.length) {
        try {
          // The Chord object has the correct structure with source and target
          const currentChord = chordData[currentAnimatedIndex - 1];
          if (!currentChord) return;
          
          // Update connection info based on view type
          if (showDetailedView) {
            // For detailed view - get node-to-node info
            if (currentChord.source.index < detailedNodeData.length && 
                currentChord.target.index < detailedNodeData.length) {
              const sourceNode = detailedNodeData[currentChord.source.index];
              const targetNode = detailedNodeData[currentChord.target.index];
              const value = detailedMatrix[currentChord.source.index][currentChord.target.index];
              
              setCurrentConnectionInfo({
                sourceId: sourceNode.id,
                sourceCategory: sourceNode.category,
                targetId: targetNode.id,
                targetCategory: targetNode.category,
                value: value
              });
            }
          } else {
            // For category view - get category-to-category info
            const sourceCategory = uniqueCategories[currentChord.source.index];
            const targetCategory = uniqueCategories[currentChord.target.index];
            
            // Get connection count or value
            let value: string | number = "Minimal";
            if (currentChord.source.index < categoryMatrix.length && 
                currentChord.target.index < categoryMatrix[0].length) {
              const actualValue = categoryMatrix[currentChord.source.index][currentChord.target.index];
              if (actualValue > 0.2) value = Math.round(actualValue);
            }
            
            setCurrentConnectionInfo({
              sourceId: sourceCategory,
              sourceCategory: `${categoryNodeCounts[sourceCategory] || 0} nodes`,
              targetId: targetCategory,
              targetCategory: `${categoryNodeCounts[targetCategory] || 0} nodes`,
              value: value
            });
          }
        } catch (error) {
          console.error("Error updating connection info:", error);
        }
      } else if (currentAnimatedIndex === 0) {
        // Reset connection info when at the beginning
        setCurrentConnectionInfo(null);
      }
    }
  }, [
    currentAnimatedIndex, 
    showDetailedView, 
    isLoading,
    detailedNodeData,
    detailedMatrix,
    uniqueCategories,
    categoryMatrix,
    categoryNodeCounts,
    chordData
  ]);

  // Use useMemo to calculate the matrix for rendering to avoid recalculation on every render
  const preparedMatrix = useMemo(() => {
    return prepareChordMatrix(
      categoryMatrix,
      detailedMatrix,
      showDetailedView,
      evenDistribution,
      uniqueCategories,
      showAllNodes
    );
  }, [
    categoryMatrix, 
    detailedMatrix, 
    showDetailedView, 
    evenDistribution, 
    uniqueCategories,
    showAllNodes
  ]);

  // Create custom zoom functionality specifically for chord visualization
  const setupChordZoom = useCallback(() => {
    if (!svgRef.current || !contentRef.current) return;
    
    // Create a zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4]) // Limit zoom scale
      .on("zoom", (event) => {
        if (contentRef.current) {
          // Apply transform to the content group
          d3.select(contentRef.current).attr("transform", event.transform.toString());
          
          // Sync WebGL transform with SVG zoom/pan
          syncWebGLTransform();
        }
      });
    
    // Apply zoom to SVG
    const svg = d3.select(svgRef.current);
    svg.call(zoom);
    
    // Initial position and scale to fit the visualization
    const fitChordDiagram = () => {
      if (!containerRef.current || !svgRef.current || !contentRef.current) return;
      
      try {
        // Get container dimensions
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        // Get content dimensions (using the bounding box)
        const bounds = contentRef.current.getBBox();
        
        // Calculate scale to fit with padding
        const padding = 40;
        const scale = 0.9 * Math.min(
          width / (bounds.width + padding * 2),
          height / (bounds.height + padding * 2)
        );
        
        // Calculate translation to center the content
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Create transform
        const transform = d3.zoomIdentity
          .translate(centerX, centerY)
          .scale(scale);
        
        // Apply transform with transition
        svg.transition()
          .duration(500)
          .call(zoom.transform, transform);
          
        // Also update WebGL view
        syncWebGLTransform();
      } catch (error) {
        console.error("Error fitting chord diagram:", error);
      }
    };
    
    // Call fit function after a short delay
    setTimeout(fitChordDiagram, 300);
    
    return { zoom, fitChordDiagram };
  }, [svgRef, containerRef, contentRef, syncWebGLTransform]);

  // Functions for handling zoom controls
  const handleZoomIn = useCallback(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const g = svg.select('g');
    
    if (!g.empty()) {
      // Get current transform
      const transformAttr = g.attr('transform') || '';
      const scaleMatch = transformAttr.match(/scale\(([^)]+)\)/);
      const translateMatch = transformAttr.match(/translate\(([^,]+),([^)]+)\)/);
      
      // Extract current scale and translation
      let scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
      let translateX = translateMatch ? parseFloat(translateMatch[1]) : 0;
      let translateY = translateMatch ? parseFloat(translateMatch[2]) : 0;
      
      // Calculate new scale
      const newScale = scale * 1.2;
      
      // Apply new transform
      g.transition()
        .duration(300)
        .attr('transform', `translate(${translateX},${translateY}) scale(${newScale})`)
        .on('end', syncWebGLTransform);
    }
  }, [svgRef, syncWebGLTransform]);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const g = svg.select('g');
    
    if (!g.empty()) {
      // Get current transform
      const transformAttr = g.attr('transform') || '';
      const scaleMatch = transformAttr.match(/scale\(([^)]+)\)/);
      const translateMatch = transformAttr.match(/translate\(([^,]+),([^)]+)\)/);
      
      // Extract current scale and translation
      let scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
      let translateX = translateMatch ? parseFloat(translateMatch[1]) : 0;
      let translateY = translateMatch ? parseFloat(translateMatch[2]) : 0;
      
      // Calculate new scale
      const newScale = scale * 0.8;
      
      // Apply new transform
      g.transition()
        .duration(300)
        .attr('transform', `translate(${translateX},${translateY}) scale(${newScale})`)
        .on('end', syncWebGLTransform);
    }
  }, [svgRef, syncWebGLTransform]);

  const handleZoomReset = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const g = svg.select('g');
    
    if (!g.empty()) {
      // Get container dimensions for centering
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      // Reset to centered position with scale 1
      g.transition()
        .duration(300)
        .attr('transform', `translate(${width/2},${height/2}) scale(1)`)
        .on('end', syncWebGLTransform);
    }
  }, [svgRef, containerRef, syncWebGLTransform]);

  // Toggle options
  const toggleDetailedView = useCallback(() => {
    const newValue = !showDetailedView;
    console.log(`[DIAGRAM-DIAGNOSTICS] Toggling detailed view: ${newValue}, Particle mode: ${chordConfig.particleMode}`);
    
    if (newValue && chordConfig.particleMode) {
      console.log(`[DIAGRAM-DIAGNOSTICS] WARNING: Detailed view with particles may impact performance`);
      // Log key particle settings that might impact performance
      console.log(`[DIAGRAM-DIAGNOSTICS] Current particle settings: density=${chordConfig.particleDensity}, movement=${chordConfig.particleMovement}`);
      
      // Suggest WebGL if not already enabled
      if (!chordConfig.useWebGLRenderer) {
        console.log(`[DIAGRAM-DIAGNOSTICS] Consider enabling WebGL rendering for better performance with detailed view`);
      }
    }
    
    setChordConfig(prev => ({ ...prev, showDetailedView: newValue }));
    
    // Notify user of mode change
    toast({
      title: showDetailedView ? "Category View" : "Detailed View",
      description: showDetailedView 
        ? "Showing connections between categories" 
        : "Showing connections between individual nodes",
    });
}, [showDetailedView, toast, chordConfig.particleMode, chordConfig.particleDensity, chordConfig.particleMovement, chordConfig.useWebGLRenderer]);

  const toggleShowAllNodes = useCallback(() => {
    setChordConfig(prev => ({ ...prev, showAllNodes: !prev.showAllNodes }));
    
    // Notify user of mode change
    toast({
      title: showAllNodes ? "Showing Connected Nodes Only" : "Showing All Nodes",
      description: showAllNodes 
        ? "Only displaying nodes with actual connections" 
        : "Displaying all nodes even without connections",
    });
  }, [showAllNodes, toast]);

  const toggleColoredRibbons = useCallback(() => {
    setChordConfig(prev => ({ ...prev, useColoredRibbons: !prev.useColoredRibbons }));
    
    // Notify user of mode change
    toast({
      title: useColoredRibbons ? "Monochrome Ribbons" : "Colored Ribbons",
      description: useColoredRibbons 
        ? "Using neutral gray for all connection ribbons" 
        : "Using category colors for connection ribbons",
    });
  }, [useColoredRibbons, toast]);

  const toggleRibbonFill = useCallback(() => {
    setChordConfig(prev => ({ ...prev, ribbonFillEnabled: !prev.ribbonFillEnabled }));
    
    // Notify user of mode change
    toast({
      title: ribbonFillEnabled ? "Stroke-Only Ribbons" : "Filled Ribbons",
      description: ribbonFillEnabled 
        ? "Showing only strokes for a more minimal look" 
        : "Using filled ribbons with color and opacity",
    });
  }, [ribbonFillEnabled, toast]);

  // Effect to clean up animation and other references
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
      if (particleUpdateTimeoutRef.current) {
        clearTimeout(particleUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Set up zoom after the visualization is loaded
  useEffect(() => {
    if (!isLoading) {
      // Set up zoom after the visualization is loaded
      const zoomControl = setupChordZoom();
      
      // Clean up
      return () => {
        if (svgRef.current && zoomControl) {
          d3.select(svgRef.current).on('.zoom', null);
        }
      };
    }
  }, [isLoading, setupChordZoom]);

  // Effect to redraw when animation state changes
  useEffect(() => {
    if (!isLoading) {
      setNeedsRedraw(true);
    }
  }, [isLoading, isAnimating, currentAnimatedIndex]);

  // Handle tooltip display on element interaction
  const showTooltip = useCallback((content: string, event: MouseEvent) => {
    if (!containerRef.current || !tooltipRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calculate position relative to the container
    const xPos = event.clientX - containerRect.left + 15;
    const yPos = event.clientY - containerRect.top - 10;
    
    setTooltipInfo({
      content,
      position: { x: xPos, y: yPos }
    });
    
    // Make tooltip visible
    d3.select(tooltipRef.current)
      .style("visibility", "visible")
      .style("opacity", "1")
      .style("left", `${xPos}px`)
      .style("top", `${yPos}px`)
      .style("pointer-events", "auto")
      .html(content);
  }, [containerRef, tooltipRef]);

  const hideTooltip = useCallback(() => {
    if (!tooltipRef.current) return;
    
    setTooltipInfo(null);
    
    d3.select(tooltipRef.current)
      .style("opacity", "0")
      .style("visibility", "hidden");
  }, [tooltipRef]);

  // Render the chord diagram - main rendering effect
useEffect(() => {
  if (isLoading || !svgRef.current || !containerRef.current || uniqueCategories.length === 0 || !needsRedraw) {
    return;
  }

  // Add performance timing for rendering
  const renderStartTime = performance.now();
  console.log(`[RENDER-DIAGNOSTICS] Starting chord diagram render: detailed=${showDetailedView}, particles=${particleMode}, webgl=${useWebGLRenderer}`);

  try {
      // Clear previous visualization
      d3.select(svgRef.current).selectAll("*").remove();

      const svg = d3.select(svgRef.current);
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const outerRadius = Math.min(width, height) * 0.5 - 60;
      const innerRadius = outerRadius - 20;

      // Create the custom ribbon generator
      const customRibbon = createCustomRibbon(
        innerRadius,
        chordWidthVariation,
        chordWidthPosition,
        chordWidthCustomPosition,
        strokeWidthVariation,
        strokeWidthPosition,
        strokeWidthCustomPosition,
        chordStrokeWidth,
        useFadeTransition,
        currentAnimatedIndex,
        totalRibbonCount,
        useGeometricShapes
      );
      
      // Use standard ribbon for initial setup or reference
      const ribbon = d3.ribbon()
        .radius(innerRadius - 1); // Slightly smaller to prevent overlap
      
      // Create the chord layout with special configuration to preserve all groups
      const chord = d3.chord()
        .padAngle(0.03) // Smaller pad angle
        .sortSubgroups(d3.descending);

      const chordResult = chord(preparedMatrix);
      
      // Store chord data in state for use in other effects - using the actual chord objects
      setChordData(chordResult);
      
      // Debug info
      console.log(`Generated ${chordResult.groups.length} chord groups out of ${uniqueCategories.length} categories`);
      
      // Create explicit group data to ensure all categories are represented
      let groupData = [...chordResult.groups]; // Start with the existing chord groups
      
      // Check for missing categories
      const existingIndices = new Set(groupData.map(g => g.index));
      for (let i = 0; i < uniqueCategories.length; i++) {
        if (!existingIndices.has(i)) {
          console.log(`Adding missing group for category ${uniqueCategories[i]} at index ${i}`);
          // Calculate an appropriate angle for this missing group
          const segmentAngle = 2 * Math.PI / uniqueCategories.length;
          const startAngle = i * segmentAngle;
          const endAngle = startAngle + segmentAngle * 0.9; // 90% of full segment
          
          // Add the missing group with minimal value
          groupData.push({
            index: i,
            startAngle,
            endAngle,
            value: 0.5 // Minimal value for visibility
          });
        }
      }
      
      // Sort groups by index to maintain consistent ordering
      groupData.sort((a, b) => a.index - b.index);

      // Create the arc generator
      const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);
      
      // Create main visualization group centered in the SVG
      const g = svg.append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);
      
      // Store reference to the content group
      if (contentRef.current) {
        if (contentRef) {
          contentRef.current = g.node() as SVGGElement;
        }
      }

      // Store total ribbon count for animation
      setTotalRibbonCount(chordResult.length);
      
      // Update connection info if we're at a valid index
      if (currentAnimatedIndex > 0 && currentAnimatedIndex <= chordResult.length) {
        const currentChord = chordResult[currentAnimatedIndex - 1];
        
        if (showDetailedView) {
          // For detailed view - get node-to-node info
          if (currentChord.source.index < detailedNodeData.length && 
              currentChord.target.index < detailedNodeData.length) {
            const sourceNode = detailedNodeData[currentChord.source.index];
            const targetNode = detailedNodeData[currentChord.target.index];
            const value = detailedMatrix[currentChord.source.index][currentChord.target.index];
            
            setCurrentConnectionInfo({
              sourceId: sourceNode.id,
              sourceCategory: sourceNode.category,
              targetId: targetNode.id,
              targetCategory: targetNode.category,
              value: value
            });
          }
        } else {
          // For category view - get category-to-category info
          const sourceCategory = uniqueCategories[currentChord.source.index];
          const targetCategory = uniqueCategories[currentChord.target.index];
          
          // Get connection count or value
          let value: string | number = "Minimal";
          if (currentChord.source.index < categoryMatrix.length && 
              currentChord.target.index < categoryMatrix[0].length) {
            const actualValue = categoryMatrix[currentChord.source.index][currentChord.target.index];
            if (actualValue > 0.2) value = Math.round(actualValue);
          }
          
          setCurrentConnectionInfo({
            sourceId: sourceCategory,
            sourceCategory: `${categoryNodeCounts[sourceCategory] || 0} nodes`,
            targetId: targetCategory,
            targetCategory: `${categoryNodeCounts[targetCategory] || 0} nodes`,
            value: value
          });
        }
      } else if (currentAnimatedIndex === 0) {
        // Reset connection info when at the beginning
        setCurrentConnectionInfo(null);
      }
      
      // Add the groups (arcs) - using our potentially modified groupData
      const groups = g.append("g")
        .attr("class", "chord-arcs")
        .selectAll("g")
        .data(groupData)
        .join("g");

      // Add the arc paths with enhanced visual styling and dynamic opacity
      groups.append("path")
        .attr("fill", (d) => {
          if (showDetailedView) {
            // For detailed view, get the node's category
            if (d.index < detailedNodeData.length) {
              const node = detailedNodeData[d.index];
              return getNodeColor({ id: "", category: node.category });
            }
            return "#999"; // Fallback
          } else {
            // For category view - use the index from the data point itself
            return getNodeColor({ id: "", category: uniqueCategories[d.index] });
          }
        })
        .attr("stroke", "#ffffff")
        .attr("stroke-width", chordStrokeWidth) // Use dynamic stroke width
        .attr("opacity", arcOpacity) // Apply opacity from state
        .attr("d", arc as any);

      // Add labels for each group
      groups.append("text")
        .each((d: any) => { d.angle = (d.startAngle + d.endAngle) / 2; })
        .attr("dy", ".35em")
        .attr("transform", (d: any) => {
          // Position text based on angle
          return `rotate(${(d.angle * 180 / Math.PI - 90)})` +
            `translate(${outerRadius + 10})` +
            `${d.angle > Math.PI ? "rotate(180)" : ""}`;
        })
        .attr("text-anchor", (d: any) => d.angle > Math.PI ? "end" : "start")
        .text((d) => {
          if (showDetailedView) {
            // For detailed view, show node name
            if (d.index < detailedNodeData.length) {
              const node = detailedNodeData[d.index];
              return node.id;
            }
            return ""; // Fallback
          } else {
            // For category view, show category name and count
            const category = uniqueCategories[d.index];
            const count = categoryNodeCounts[category] || 0;
            return `${category} (${count})`;
          }
        })
        .style("font-size", () => showDetailedView ? "8px" : "11px") // Larger text
        .style("font-weight", "500") // Slightly bold
        .style("fill", textColor)
        .style("text-shadow", "0 1px 2px rgba(0,0,0,0.4)"); // Add text shadow for better contrast

      // Add the chords (ribbons) with enhanced visual styling and dynamic opacity/stroke
      const ribbonGroup = g.append("g")
        .attr("class", "chord-ribbons")
        .attr("fill-opacity", ribbonFillEnabled ? chordOpacity : 0); // Use 0 opacity for stroke-only mode
      
      if (!isAnimating) {
        // If not animating, add all chords at once
        const chordPaths = ribbonGroup.selectAll("path")
          .data(chordResult)
          .join("path")
          .attr("d", d => customRibbon(d, false))
          .attr("fill", d => {
            // If directional styling is enabled, use source/target colors
            if (useDirectionalStyling) {
              return sourceChordColor;
            }
            
            // If using monochrome ribbons, return a neutral color
            if (!useColoredRibbons) {
              return "#999999"; // Neutral gray for monochrome mode
            }
            
            // Otherwise use category colors
            if (showDetailedView) {
              // For detailed view, use source node's category
              if (d.source.index < detailedNodeData.length) {
                const sourceNode = detailedNodeData[d.source.index];
                return getNodeColor({ id: "", category: sourceNode.category });
              }
              return "#999"; // Fallback
            } else {
              // For category view, use source category color
              const sourceCategory = uniqueCategories[d.source.index];
              return getNodeColor({ id: "", category: sourceCategory });
            }
          })
          .attr("stroke", d => {
            // If directional styling is enabled, use darker source color for stroke
            if (useDirectionalStyling) {
              return d3.rgb(sourceChordColor).darker(0.8).toString();
            }
            
            // For monochrome mode, use a darker gray for stroke
            if (!useColoredRibbons) {
              return d3.rgb("#777777").toString();
            }
            
            // Otherwise, apply a slightly darker stroke color based on the fill
            if (showDetailedView && d.source.index < detailedNodeData.length) {
              const sourceNode = detailedNodeData[d.source.index];
              const baseColor = getNodeColor({ id: "", category: sourceNode.category });
              // Darken the color for stroke - simple approach
              return d3.rgb(baseColor).darker(0.8).toString();
            } else {
              const baseColor = getNodeColor({ id: "", category: uniqueCategories[d.source.index] });
              return d3.rgb(baseColor).darker(0.8).toString();
            }
          })
          .attr("stroke-width", chordStrokeWidth) // Use dynamic stroke width
          .attr("stroke-opacity", chordStrokeOpacity) // Use dynamic stroke opacity
          .style("opacity", d => {
            // If directional styling is enabled, use source opacity
            if (useDirectionalStyling) {
              return sourceChordOpacity;
            }
            
            // In stroke-only mode, ensure better visibility by using a higher opacity
            if (!ribbonFillEnabled) {
              return 1.0;
            }
            
            // Vary opacity based on connection strength for visual interest
            if (showDetailedView) {
              if (d.source.index < detailedNodeData.length && d.target.index < detailedNodeData.length) {
                const value = detailedMatrix[d.source.index][d.target.index];
                // Scale opacity between 0.5 and 0.9 based on value
                return Math.max(0.5, Math.min(0.9, 0.5 + value / 10));
              }
            } else {
              // For category matrix, scale opacity based on connection strength
              if (d.source.index < categoryMatrix.length && d.target.index < categoryMatrix[0].length) {
                const value = categoryMatrix[d.source.index][d.target.index];
                if (value <= 0.2) return 0.5; // Minimal connections get base opacity
                // Scale between 0.6 and 0.9 for actual connections
                return Math.max(0.6, Math.min(0.9, 0.6 + value / 20));
              }
            }
            return 0.6; // Default opacity
          })
          .on("click", function(event, d) {
            event.stopPropagation(); // Stop event propagation
            
            // Highlight this chord
            d3.select(this)
              .style("opacity", 1)
              .attr("stroke-width", chordStrokeWidth * 1.5)
              .attr("stroke", "#ffffff");
          
            // Get tooltip details based on view mode
            let tooltipContent = "";
            
            if (showDetailedView) {
              // Detailed node-to-node connection info
              if (d.source.index < detailedNodeData.length && d.target.index < detailedNodeData.length) {
                const sourceNode = detailedNodeData[d.source.index];
                const targetNode = detailedNodeData[d.target.index];
                const value = detailedMatrix[d.source.index][d.target.index];
                
                tooltipContent = `
                  <div class="font-medium text-base">${sourceNode.id} → ${targetNode.id}</div>
                  <div class="text-sm mt-1">${sourceNode.category} → ${targetNode.category}</div>
                  <div class="mt-1 border-t pt-1 border-white/20">Connections: <span class="font-bold">${value}</span></div>
                  <div class="text-xs mt-2 text-blue-300">Click elsewhere to dismiss</div>
                `;
              } else {
                tooltipContent = "<div class='text-center py-1'>No detailed data available</div>";
              }
            } else {
              // Category-to-category connection info
              const sourceCategory = uniqueCategories[d.source.index];
              const targetCategory = uniqueCategories[d.target.index];
              
              // Get the actual value from our matrix
              let value = "Minimal";
              if (d.source.index < categoryMatrix.length && d.target.index < categoryMatrix[0].length) {
                const actualValue = categoryMatrix[d.source.index][d.target.index];
                if (actualValue > 0.2) value = actualValue.toString();
              }
              
              tooltipContent = `
                <div class="font-medium text-base">${sourceCategory} → ${targetCategory}</div>
                <div class="mt-1 border-t pt-1 border-white/20">Connections: <span class="font-bold">${value}</span></div>
                <div class="text-xs mt-2 text-blue-300">Click elsewhere to dismiss</div>
              `;
            }
            
            // Show tooltip with the created content
            showTooltip(tooltipContent, event);
          })
          .attr("cursor", "pointer"); // Add a pointer cursor
          
// Collect all chord paths for WebGL rendering (if enabled)
if (useWebGLRenderer && particleMode) {
  // Collect all chord paths for WebGL rendering
  const pathElements = Array.from(ribbonGroup.selectAll("path").nodes() as SVGPathElement[]);
  setChordPaths(pathElements);
  
  // Sync WebGL transform with SVG
  syncWebGLTransform();
  
  // When using WebGL, we should hide or simplify the SVG particles
  // This makes the base ribbons almost completely transparent
  chordPaths
    .attr("fill-opacity", 0.02)  // Nearly invisible fill
    .attr("stroke-opacity", 0.05); // Very subtle stroke
    
  // Skip adding SVG particles for better performance
  console.log('[CHORD-WEBGL] Using WebGL renderer for particles');
} 
// If geometric shapes or particles are enabled (and not using WebGL), add them along the chord paths
else if (useGeometricShapes || (particleMode && !useWebGLRenderer)) {
  // Determine total number of chords that will have particles
  let totalChordsWithParticles = 0;
  
  // First pass to count chords with real connections
  if (particleMode) {
    chordPaths.each(function(d) {
      const sourceIndex = d.source.index;
      const targetIndex = d.target.index;
      let connectionValue = 0;
      
      if (showDetailedView) {
        if (sourceIndex < detailedMatrix.length && targetIndex < detailedMatrix[0].length) {
          connectionValue = detailedMatrix[sourceIndex][targetIndex];
        }
      } else {
        if (sourceIndex < categoryMatrix.length && targetIndex < categoryMatrix[0].length) {
          connectionValue = categoryMatrix[sourceIndex][targetIndex];
        }
      }
      
      if (connectionValue > 0.2) {
        totalChordsWithParticles++;
      }
    });
  }
  
  // For each chord, determine if it should have particles based on connection strength
  chordPaths.each(function(d, i) {
    // Get the actual connection value
    const sourceIndex = d.source.index;
    const targetIndex = d.target.index;
    let connectionValue = 0;
    
    if (showDetailedView) {
      if (sourceIndex < detailedMatrix.length && targetIndex < detailedMatrix[0].length) {
        connectionValue = detailedMatrix[sourceIndex][targetIndex];
      }
    } else {
      if (sourceIndex < categoryMatrix.length && targetIndex < categoryMatrix[0].length) {
        connectionValue = categoryMatrix[sourceIndex][targetIndex];
      }
    }
    
    // Determine if this is a real connection (value > 0.2)
    const isRealConnection = connectionValue > 0.2;
    
    // Only add particles if this setting allows it
    const shouldAddParticles = particleMode && 
      (!chordConfig.particlesOnlyRealConnections || 
       (chordConfig.particlesOnlyRealConnections && isRealConnection));
    
    // Choose appropriate particle style based on connection type
    const styleConfig = isRealConnection ? 
      {
        color: particleColor,
        size: particleSize,
        sizeVariation: particleSizeVariation,
        opacity: particleOpacity,
        strokeColor: particleStrokeColor,
        strokeWidth: particleStrokeWidth
      } : 
      {
        color: chordConfig.minimalConnectionParticleColor,
        size: chordConfig.minimalConnectionParticleSize,
        sizeVariation: chordConfig.minimalConnectionParticleSizeVariation,
        opacity: chordConfig.minimalConnectionParticleOpacity,
        strokeColor: chordConfig.minimalConnectionParticleStrokeColor,
        strokeWidth: chordConfig.minimalConnectionParticleStrokeWidth
      };
    
    if (shouldAddParticles) {
      console.log(`[PARTICLE-DIAGNOSTICS] Adding particles to chord #${i} with connection value ${connectionValue.toFixed(2)}, isReal: ${isRealConnection}`);
    }
    
    return addShapesOrParticlesAlongPath(
      d3.select(this),
      ribbonGroup,
      useGeometricShapes,
      particleMode,
      shapeType,
      shapeSize,
      shapeSpacing,
      shapeFill,
      shapeStroke,
      particleDensity,
      styleConfig.size,
      styleConfig.sizeVariation,
      particleBlur,
      particleDistribution as 'uniform' | 'random' | 'gaussian',
      styleConfig.color,
      styleConfig.opacity,
      styleConfig.strokeColor,
      styleConfig.strokeWidth,
      showDetailedView,
      chordStrokeWidth,
      i,
      isRealConnection,
      shouldAddParticles,
      chordConfig.maxParticlesPerChord,
      chordConfig.maxParticlesDetailedView,
      chordConfig.maxShapesDetailedView
    );
  });
  
  // Make base ribbons more or less transparent based on mode
  chordPaths
    .attr("fill-opacity", particleMode ? 0.03 : 0.15)
    .attr("stroke-opacity", particleMode ? 0.07 : 0.3);
  
  // Apply correct styling to all particles
  if (particleMode) {
    ribbonGroup.selectAll(".chord-particles circle")
      .each(function() {
        const element = d3.select(this);
        // Ensure color is applied correctly from data attributes
        const isRealConnection = element.attr("data-is-real") === "true";
        
        if (isRealConnection) {
          element.attr("fill", particleColor)
                .attr("stroke", particleStrokeColor)
                .attr("stroke-width", particleStrokeWidth);
        } else {
          element.attr("fill", chordConfig.minimalConnectionParticleColor)
                .attr("stroke", chordConfig.minimalConnectionParticleStrokeColor)
                .attr("stroke-width", chordConfig.minimalConnectionParticleStrokeWidth);
        }
      });
  }
}
        
        // If directional styling is enabled, add a second set of ribbons for target styling
        if (useDirectionalStyling) {
          // Create reversed ribbons with target styling
          ribbonGroup.selectAll(".target-ribbon")
            .data(chordResult)
            .join("path")
            .attr("class", "target-ribbon")
            .attr("d", d => {
              // Create a simplified path with just a line from target to source
              // Add bounds checking to prevent errors in detailed view
              try {
                return customRibbon(d, false);
              } catch (error) {
                console.warn("Error creating target ribbon:", error);
                return ""; // Return empty path on error
              }
            })
            .attr("fill", targetChordColor)
            .attr("stroke", d3.rgb(targetChordColor).darker(0.8).toString())
            .attr("stroke-width", chordStrokeWidth * 0.8) // Slightly thinner
            .attr("stroke-opacity", chordStrokeOpacity)
            .style("opacity", targetChordOpacity)
            .style("mix-blend-mode", "multiply") // Blend with source ribbons
            .attr("cursor", "pointer")
            .attr("transform", "scale(0.95)") // Scale slightly to nest inside source ribbons
            .lower(); // Move to back
        }
      } else {
        // For animation mode, we'll add chords dynamically 
        // First, create empty selection to be populated
        ribbonGroup.selectAll("path").remove();
        ribbonGroup.selectAll(".chord-shapes").remove(); // Remove any shape groups
        
        // Get the current chord data based on animation index
        const animatedChords = chordResult.slice(0, Math.max(0, currentAnimatedIndex));
        
        // Add ribbons up to the current index only
        const animatedPaths = ribbonGroup.selectAll("path")
          .data(animatedChords)
          .join("path")
          .attr("d", d => customRibbon(d, true))
          .attr("fill", d => {
            // If directional styling is enabled, use source color
            if (useDirectionalStyling) {
              return sourceChordColor;
            }
            
            // If using monochrome ribbons, return a neutral color
            if (!useColoredRibbons) {
              return "#999999"; // Neutral gray for monochrome mode
            }
            
            // Otherwise use category colors
            if (showDetailedView) {
              // For detailed view, use source node's category
              if (d.source.index < detailedNodeData.length) {
                const sourceNode = detailedNodeData[d.source.index];
                return getNodeColor({ id: "", category: sourceNode.category });
              }
              return "#999"; // Fallback
            } else {
              // For category view, use source category color
              const sourceCategory = uniqueCategories[d.source.index];
              return getNodeColor({ id: "", category: sourceCategory });
            }
          })
          .attr("stroke", d => {
            // If directional styling is enabled, use darker source color
            if (useDirectionalStyling) {
              return d3.rgb(sourceChordColor).darker(0.8).toString();
            }
            
            // For monochrome mode, use a darker gray for stroke
            if (!useColoredRibbons) {
              return d3.rgb("#777777").toString();
            }
            
            // Otherwise, apply a slightly darker stroke color based on the fill
            if (showDetailedView && d.source.index < detailedNodeData.length) {
              const sourceNode = detailedNodeData[d.source.index];
              const baseColor = getNodeColor({ id: "", category: sourceNode.category });
              // Darken the color for stroke - simple approach
              return d3.rgb(baseColor).darker(0.8).toString();
            } else {
              const baseColor = getNodeColor({ id: "", category: uniqueCategories[d.source.index] });
              return d3.rgb(baseColor).darker(0.8).toString();
            }
          })
          .attr("stroke-width", chordStrokeWidth)
          .attr("stroke-opacity", chordStrokeOpacity);
        
        // If source-to-target fade is enabled, animate with transitions
        if (useFadeTransition) {
          // Add special transition effects for the most recent chord
          if (currentAnimatedIndex > 0 && currentAnimatedIndex <= chordResult.length) {
            const latestChord = animatedPaths.filter((d, i) => i === currentAnimatedIndex - 1);
            
            latestChord
              .style("opacity", 0) // Start invisible
              .transition()
              .duration(transitionDuration) // Use configurable duration
              .style("opacity", useDirectionalStyling ? sourceChordOpacity : 1); // Fade in
            
            // If directional styling is enabled, add a target ribbon with special animation
            if (useDirectionalStyling && currentAnimatedIndex > 0) {
              const latestChordData = chordResult[currentAnimatedIndex - 1];
              
              // Create target ribbon with delayed appearance
              ribbonGroup.append("path")
                .datum(latestChordData)
                .attr("class", "target-ribbon animated")
                .attr("d", customRibbon(latestChordData, true))
                .attr("fill", targetChordColor)
                .attr("stroke", d3.rgb(targetChordColor).darker(0.8).toString())
                .attr("stroke-width", chordStrokeWidth * 0.8)
                .attr("stroke-opacity", chordStrokeOpacity)
                .style("opacity", 0) // Start invisible
                .style("mix-blend-mode", "multiply")
                .attr("transform", "scale(0.95)") // Scale slightly
                .transition()
                .delay(transitionDuration * 0.6) // Delay appearance
                .duration(transitionDuration * 0.7) // Shorter duration
                .style("opacity", targetChordOpacity); // Fade in
            }
          }
        } else {
          // Without fade transition, just set opacity directly
          animatedPaths.style("opacity", useDirectionalStyling ? sourceChordOpacity : 1);
          
          // If directional styling is enabled, add target ribbons
          if (useDirectionalStyling) {
            ribbonGroup.selectAll(".target-ribbon")
              .data(animatedChords)
              .join("path")
              .attr("class", "target-ribbon")
              .attr("d", d => customRibbon(d, false))
              .attr("fill", targetChordColor)
              .attr("stroke", d3.rgb(targetChordColor).darker(0.8).toString())
              .attr("stroke-width", chordStrokeWidth * 0.8)
              .attr("stroke-opacity", chordStrokeOpacity)
              .style("opacity", targetChordOpacity)
              .style("mix-blend-mode", "multiply")
              .attr("transform", "scale(0.95)")
              .lower();
          }
        }
        
        // Collect chord paths for WebGL if WebGL is enabled
        if (useWebGLRenderer && particleMode) {
          // Collect all chord paths for WebGL rendering
          const pathElements = Array.from(ribbonGroup.selectAll("path").nodes() as SVGPathElement[]);
          setChordPaths(pathElements);
          
          // Sync WebGL transform with SVG
          syncWebGLTransform();
        }
        // Add geometric shapes if enabled and not using WebGL
        else if (useGeometricShapes && animatedChords.length > 0) {
          // For each chord, add shapes along the path
          animatedPaths.each(function(d, i) {
            return addShapesOrParticlesAlongPath(
                  d3.select(this),
                  ribbonGroup,
                  true, // useGeometricShapes
                  false, // particleMode
                  shapeType,
                  shapeSize,
                  shapeSpacing,
                  shapeFill,
                  shapeStroke,
                  0, // particleDensity (not used)
                  0, // particleSize (not used)
                  0, // particleSizeVariation (not used)
                  0, // particleBlur (not used)
                  'uniform', // particleDistribution (not used)
                  '', // particleColor (not used)
                  0, // particleOpacity (not used)
                  particleStrokeColor,  // Add this parameter
                  particleStrokeWidth,  // Add this parameter
                  showDetailedView,
                  chordStrokeWidth,
                  i,
                  true,
                  true,
                  chordConfig.maxParticlesPerChord,
                  chordConfig.maxParticlesDetailedView,
                  chordConfig.maxShapesDetailedView
              );
          });
          
          // For geometric shapes, make the base ribbons mostly transparent
          animatedPaths
            .attr("fill-opacity", 0.15) // Very transparent fill
            .attr("stroke-opacity", 0.3); // Subtle stroke
        }
        // Add particles if enabled and not using WebGL
        else if (particleMode && !useWebGLRenderer && animatedChords.length > 0) {
          // For each chord, add particles along the path
          animatedPaths.each(function(d, i) {
            return addShapesOrParticlesAlongPath(
                  d3.select(this),
                  ribbonGroup,
                  false, // useGeometricShapes
                  true, // particleMode
                  shapeType, // not used
                  shapeSize, // not used
                  shapeSpacing, // not used
                  shapeFill, // not used
                  shapeStroke, // not used
                  particleDensity,
                  particleSize,
                  particleSizeVariation,
                  particleBlur,
                  particleDistribution,
                  particleColor,
                  particleOpacity,
                  particleStrokeColor,
                  particleStrokeWidth,
                  showDetailedView,
                  chordStrokeWidth,
                  i,
                  true,
                  true,
                  chordConfig.maxParticlesPerChord,
                  chordConfig.maxParticlesDetailedView,
                  chordConfig.maxShapesDetailedView
              );
          });
          
          // For particles, make the base ribbons very transparent
          animatedPaths
            .attr("fill-opacity", 0.03) // Nearly invisible fill
            .attr("stroke-opacity", 0.07); // Very subtle stroke
          
          // Set up particle movement if enabled
          if (chordConfig.particleMovement && svgRef.current && !useWebGLRenderer) {
            if (particleMovementCleanupRef.current) {
              particleMovementCleanupRef.current();
            }
            
            particleMovementCleanupRef.current = setupParticleMovement(
              svgRef.current,
              chordConfig.particleMovementAmount,
              true
            );
          }
        }
      }

      // Add arc click handlers
      groups
      .on("click", function(event, d) {
        event.stopPropagation(); // Stop event propagation
        
        // Highlight this arc
        d3.select(this).select("path")
          .attr("stroke", "#ffffff")
          .attr("stroke-width", chordStrokeWidth * 1.5);
          
        // Enhanced tooltip for group hovering
        let tooltipContent = "";
          
        if (showDetailedView) {
          // Individual node info
          if (d.index < detailedNodeData.length) {
            const node = detailedNodeData[d.index];
            const category = node.category;
            
            // Count connections
            const outgoing = detailedMatrix[d.index].reduce((sum, val) => sum + val, 0);
            const incoming = detailedMatrix.reduce((sum, row) => sum + row[d.index], 0);
            
            tooltipContent = `
              <div class="font-medium text-base pb-1">${node.id}</div>
              <div class="text-sm">Category: <span class="font-medium">${category}</span></div>
              <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span class="text-xs text-white/70">Outgoing</span><br>
                  <span class="font-bold">${outgoing}</span>
                </div>
                <div>
                  <span class="text-xs text-white/70">Incoming</span><br>
                  <span class="font-bold">${incoming}</span>
                </div>
                <div class="col-span-2 border-t border-white/20 pt-1 text-center">
                  <span class="text-xs text-white/70">Total</span>
                  <span class="font-bold ml-2">${outgoing + incoming}</span>
                </div>
              </div>
              <div class="text-xs mt-2 text-blue-300">Click elsewhere to dismiss</div>
            `;
          } else {
            tooltipContent = "<div class='text-center py-1'>No detailed data available</div>";
          }
        } else {
          // Category info
          const index = d.index;
          if (index < uniqueCategories.length) {
            const category = uniqueCategories[index];
            
            // Count outgoing and incoming connections
            let outgoing = 0;
            let incoming = 0;
            
            if (index < categoryMatrix.length) {
              outgoing = categoryMatrix[index].reduce((sum, val) => sum + val, 0);
              incoming = categoryMatrix.reduce((sum, row) => 
                index < row.length ? sum + row[index] : sum, 0);
            }
            
            // Format display values
            const outgoingDisplay = outgoing > 0.2 ? outgoing.toFixed(0) : 'None/Minimal';
            const incomingDisplay = incoming > 0.2 ? incoming.toFixed(0) : 'None/Minimal';
            const totalDisplay = outgoing + incoming > 0.4 ? (outgoing + incoming).toFixed(0) : 'None/Minimal';
            
            tooltipContent = `
              <div class="font-medium text-base pb-1">${category}</div>
              <div class="text-sm">Nodes: <span class="font-medium">${categoryNodeCounts[category] || 0}</span></div>
              <div class="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span class="text-xs text-white/70">Outgoing</span><br>
                  <span class="font-bold">${outgoingDisplay}</span>
                </div>
                <div>
                  <span class="text-xs text-white/70">Incoming</span><br>
                  <span class="font-bold">${incomingDisplay}</span>
                </div>
                <div class="col-span-2 border-t border-white/20 pt-1 text-center">
                  <span class="text-xs text-white/70">Total</span>
                  <span class="font-bold ml-2">${totalDisplay}</span>
                </div>
              </div>
              <div class="text-xs mt-2 text-blue-300">Click elsewhere to dismiss</div>
            `;
          } else {
            tooltipContent = "<div class='text-center py-1'>Category data not available</div>";
          }
        }
        
        // Show tooltip with the created content
        showTooltip(tooltipContent, event);
      })
      .attr("cursor", "pointer"); // Just add a pointer cursor instead

      // Reset the redraw flag
      setNeedsRedraw(false);
      console.log(`[RENDER-DIAGNOSTICS] Render completed in ${(performance.now() - renderStartTime).toFixed(1)}ms`);  

    } catch (error) {
      console.error("Error rendering chord diagram:", error);
      setVisualizationError("Failed to render chord diagram");
    }
  }, [
    isLoading, 
    needsRedraw,
    preparedMatrix,
    chordStrokeWidth,
    chordOpacity,
    chordStrokeOpacity,
    arcOpacity,
    useDirectionalStyling,
    sourceChordOpacity,
    targetChordOpacity,
    sourceChordColor,
    targetChordColor,
    chordWidthVariation,
    chordWidthPosition,
    chordWidthCustomPosition,
    useGeometricShapes,
    shapeType,
    shapeSize,
    shapeSpacing,
    shapeFill,
    shapeStroke,
    useFadeTransition,
    transitionDuration,
    showDetailedView,
    uniqueCategories,
    categoryNodeCounts,
    categoryMatrix,
    detailedMatrix,
    particleMode,
    particleDensity,
    particleSize,
    particleSizeVariation,
    particleBlur,
    particleDistribution,
    particleColor,
    particleOpacity,
    strokeWidthVariation,
    strokeWidthPosition,
    strokeWidthCustomPosition,
    useColoredRibbons,
    ribbonFillEnabled,
    getNodeColor,
    svgRef,
    containerRef,
    contentRef,
    detailedNodeData,
    isAnimating,
    currentAnimatedIndex,
    totalRibbonCount,
    showTooltip,
    textColor,
    useWebGLRenderer,
    syncWebGLTransform
  ]);

  // Effect to handle clicks outside tooltip to dismiss it
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      // Skip if we're not clicked on a tooltip or a chord/arc
      if (!tooltipRef.current) return;
      
      // Check if clicked element is inside tooltip
      const isTooltip = tooltipRef.current.contains(event.target as unknown as globalThis.Node);
      
      // Check if clicked element is a chord or arc
      const isChordOrArc = (
        (event.target instanceof SVGPathElement && event.target.closest('svg') === svgRef.current) ||
        (event.target instanceof SVGGElement && event.target.closest('svg') === svgRef.current)
      );
      
      if (!isTooltip && !isChordOrArc) {
        // Hide tooltip when clicked elsewhere
        hideTooltip();
        
        // Reset any highlighted elements
        if (svgRef.current) {
          d3.select(svgRef.current).selectAll("path")
            .style("opacity", null)
            .attr("stroke-width", null);
        }
      }
    };
    
    // Add the event listener
    document.addEventListener('click', handleDocumentClick);
    
    // Clean up
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [svgRef, tooltipRef, hideTooltip]);

  return {
    // State
    isLoading,
    visualizationError,
    selectedNode,
    selectedNodeConnections,
    uniqueCategories,
    categoryNodeCounts,
    nodeCounts,
    chordConfig,
    currentAnimatedIndex,
    totalRibbonCount,
    currentConnectionInfo,
    tooltipInfo,
    
    // Animation controls
    startAnimation,
    stopAnimation,
    toggleAnimation,
    goToPreviousRibbon,
    goToNextRibbon,
    resetAnimation,
    changeAnimationSpeed,
    
    // Configuration updates
    updateConfig,
    
    // Zoom controls
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    
    // Toggle functions
    toggleDetailedView,
    toggleShowAllNodes,
    toggleColoredRibbons,
    toggleRibbonFill,
    
    // Tooltip control
    showTooltip,
    hideTooltip,
    
    // Flag setters
    setNeedsRedraw
  };
};

export default useChordDiagram;