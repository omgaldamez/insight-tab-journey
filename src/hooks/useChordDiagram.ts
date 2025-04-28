/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import { useState, useEffect, useCallback, useMemo, RefObject, useRef } from 'react';
import * as d3 from 'd3';
import { Node, Link } from '@/types/networkTypes';
import { prepareChordMatrix, createCustomRibbon, addShapesOrParticlesAlongPath, precalculateParticlePositions, renderPrecalculatedParticles } from '@/utils/chordUtils';
import { useToast } from '@/components/ui/use-toast';
import { setupParticleMovement } from '@/utils/chordUtils';
import { WebGLParticleSystem } from '@/utils/webglParticleSystem';
import { WebGLParticleSystemOptions, checkWebGLSupport } from '@/utils/webglUtils';


// Add global flag to track animation-only updates
declare global {
  interface SVGSVGElement {
    particleGroupsToRestore?: Element[];
  }
  interface Window {
    forceParticleRegeneration?: boolean;
    lastUpdateWasAnimationOnly?: boolean;
    preserveParticlesDuringAnimation?: boolean;
  }
}
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

  // Arc specific properties
  arcStrokeWidth: number;
  arcStrokeColor: string;
  arcCornerRadius: number;

  // ParticlesConnections
particlesOnlyRealConnections: boolean;  // When true, only add particles to real connections
minimalConnectionParticleColor: string; // Color for particles on minimal connections
minimalConnectionParticleSize: number;
minimalConnectionParticleSizeVariation: number;
minimalConnectionParticleOpacity: number;
minimalConnectionParticleStrokeColor: string;
minimalConnectionParticleStrokeWidth: number;
  
// Properties for connection filtering
filterRealConnectionsOnly: boolean;  // Master toggle for real connections only

// Real connection ribbon styling
realConnectionRibbonOpacity: number;
realConnectionRibbonColor: string;
realConnectionRibbonStrokeColor: string;
realConnectionRibbonStrokeWidth: number;
realConnectionRibbonStrokeOpacity: number;

// Minimal connection ribbon styling
minimalConnectionRibbonOpacity: number;
minimalConnectionRibbonColor: string;
minimalConnectionRibbonStrokeColor: string;
minimalConnectionRibbonStrokeWidth: number;
minimalConnectionRibbonStrokeOpacity: number;
  
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
  particleStrokeOpacity: number;
  particleGeometryStrokeColor: string;
  particleGeometryStrokeWidth: number;

  
  
    // Particles per chord
    maxParticlesPerChord: number;          // Maximum particles per chord
    maxParticlesDetailedView: number;      // Maximum particles in detailed view
    maxShapesDetailedView: number;         // Maximum shapes in detailed view

    particlesInitialized: boolean;
    progressiveGenerationEnabled: boolean;
    particleGenerationDelay: number;

    // High performance mode
  highPerformanceMode: boolean;
  batchSize: number;
  useFixedRandomSeeds: boolean;

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

  // Visualization layers
showChordRibbons: boolean;         // Show/hide base chord ribbons
ribbonOpacity: number;             // Control ribbon opacity independently 
showParticlesLayer: boolean;       // Show/hide particles
showGeometricShapesLayer: boolean; // Show/hide geometric shapes

// Ribbon styling
ribbonStrokeColor: string;         // Control ribbon stroke color
ribbonFillColor: string;           // Control ribbon fill color when not using category colors

// Connection filters 
showOnlyRealConnectionsRibbons: boolean;   // For chord ribbons
showOnlyRealConnectionsShapes: boolean;    // For geometric shapes

// Animation effects
ribbonAnimationEnabled: boolean,
arcAnimationEnabled: boolean, 
animationEffect: 'wave' | 'pulse' | 'rotate',
blurEffectEnabled: boolean,
blurEffectAmount: number,
animationSpeedMultiplier: number,

// Glow effect properties
glowEffectEnabled: boolean;
glowEffectColor: string;
glowEffectIntensity: number;
glowEffectSize: number;
glowEffectDarkMode: boolean;

// Group/ribbon individual glow settings
useIndividualGlowColors: boolean;
categoryGlowColors: Record<string, string>; // Map category names to glow colors

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
  const particleGenerationRef = useRef<number | null>(null);
  const particlePositionCacheRef = useRef<Map<string, Array<{x: number, y: number, size: number, opacity: number}>>>(new Map());

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

  const [particlesInitialized, setParticlesInitialized] = useState(false);
  const [isGeneratingParticles, setIsGeneratingParticles] = useState(false);
  const [particleMetrics, setParticleMetrics] = useState({
    totalParticles: 0,
    totalChordsWithParticles: 0,
    chordsGenerated: 0,
    totalChords: 0,
    renderTime: 0,
    fps: 0,
    lastFrameTime: 0
  });

  // Chord diagram configuration
  const [chordConfig, setChordConfig] = useState<ChordDiagramConfig>({
    // Basic styling
    chordStrokeWidth: 0.5,
    chordOpacity: 0.75,
    chordStrokeOpacity: 1.0,
    arcOpacity: 0.8,

    // Arc specific properties
  arcStrokeWidth: 1.0,
  arcStrokeColor: '#ffffff',
  arcCornerRadius: 0,

    particlesOnlyRealConnections: true, // Default to only real connections
minimalConnectionParticleColor: '#aaaaaa',
minimalConnectionParticleSize: 0.8,
minimalConnectionParticleSizeVariation: 0.3,
minimalConnectionParticleOpacity: 0.3,
minimalConnectionParticleStrokeColor: '#999999',
minimalConnectionParticleStrokeWidth: 0.1,
  
// New properties with defaults
filterRealConnectionsOnly: false, // Start with showing all connections

// Real connection ribbon styling - default to normal values
realConnectionRibbonOpacity: 0.75,
realConnectionRibbonColor: '#3498db',
realConnectionRibbonStrokeColor: '#ffffff',
realConnectionRibbonStrokeWidth: 0.5,
realConnectionRibbonStrokeOpacity: 1.0,

// Minimal connection ribbon styling - more subtle
minimalConnectionRibbonOpacity: 0.3,
minimalConnectionRibbonColor: '#aaaaaa',
minimalConnectionRibbonStrokeColor: '#dddddd',
minimalConnectionRibbonStrokeWidth: 0.3,
minimalConnectionRibbonStrokeOpacity: 0.5,
    
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
    particleDistribution: 'uniform',
    particleColor: '#ffffff',
    particleOpacity: 0.7,
    
    particleMovement: false,
    particleMovementAmount: 1.0,
    
    particleStrokeColor: '#ffffff',
    particleStrokeWidth: 0.2,
    particleStrokeOpacity: 1.0,
    particleGeometryStrokeColor: '#ffffff',
    particleGeometryStrokeWidth: 0.3,

    maxParticlesPerChord: 500,       // Default for normal view
    maxParticlesDetailedView: 50,    // Default for detailed view
    maxShapesDetailedView: 100,       // Default for shapes
    
// Initialize chord config with new properties
particlesInitialized: false,
progressiveGenerationEnabled: true,
particleGenerationDelay: 15, // ms between chord particle generation

highPerformanceMode: false,
  batchSize: 2,
  useFixedRandomSeeds: true,

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
    webGLParticleQuality: 'medium',
  
  // New visualization layer properties
  showChordRibbons: true,
  ribbonOpacity: 0.75, // Same as chordOpacity default
  showParticlesLayer: false, // Will be turned on when particleMode is enabled
  showGeometricShapesLayer: false, // Will be turned on when useGeometricShapes is enabled
  
// Ribbon styling properties
ribbonStrokeColor: '#ffffff',
ribbonFillColor: '#999999',

  // New connection filter properties
  showOnlyRealConnectionsRibbons: false,
  showOnlyRealConnectionsShapes: true,

  // Animation effects (new)
ribbonAnimationEnabled: false,
arcAnimationEnabled: false,
animationEffect: 'wave',
blurEffectEnabled: false,
blurEffectAmount: 2.5,
animationSpeedMultiplier: 1.0,

// Glow effect properties
glowEffectEnabled: false,
glowEffectColor: '#00aaff', // Default to a bright blue
glowEffectIntensity: 1.5,
glowEffectSize: 10,
glowEffectDarkMode: false,

// Group/ribbon individual glow settings
useIndividualGlowColors: false,
categoryGlowColors: {}, // Will be populated from categories
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

// Initialize category glow colors
useEffect(() => {
  if (uniqueCategories.length > 0 && Object.keys(chordConfig.categoryGlowColors).length === 0) {
    // Create random colors for categories
    const colorMap: Record<string, string> = {};
    uniqueCategories.forEach(category => {
      // Generate vibrant colors for glow
      const hue = Math.floor(Math.random() * 360);
      colorMap[category] = `hsl(${hue}, 100%, 50%)`;
    });
    
    // Update config with initial colors
    setChordConfig(prev => ({
      ...prev,
      categoryGlowColors: colorMap
    }));
  }
}, [uniqueCategories, chordConfig.categoryGlowColors]);

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

  useEffect(() => {
    // Sync layer visibility with mode toggles for backward compatibility
    if (chordConfig.particleMode !== chordConfig.showParticlesLayer ||
        chordConfig.useGeometricShapes !== chordConfig.showGeometricShapesLayer) {
      
      setChordConfig(prev => ({
        ...prev,
        showParticlesLayer: prev.particleMode,
        showGeometricShapesLayer: prev.useGeometricShapes
      }));
    }
  }, [chordConfig.particleMode, chordConfig.useGeometricShapes]);

  const cancelParticleGeneration = useCallback(() => {
    if (particleGenerationRef.current) {
      clearTimeout(particleGenerationRef.current);
      particleGenerationRef.current = null;
    }
    
    setIsGeneratingParticles(false);
    
    toast({
      title: "Generation Cancelled",
      description: "Particle generation was cancelled",
    });
  }, [toast]);

// Add this function for generating cache keys
const generateCacheKey = useCallback((chordIndex: number, config: {
  particleDensity: number,
  particleDistribution: string,
  particleSizeVariation: number
}) => {
  return `chord_${chordIndex}_density_${config.particleDensity}_dist_${config.particleDistribution}_var_${config.particleSizeVariation}`;
}, []);

const startProgressiveParticleGeneration = useCallback(() => {
  try {
    if (!svgRef.current || chordData.length === 0) {
      console.error("[PARTICLE-GENERATION] Missing references or data for generation");
      setIsGeneratingParticles(false);
      return;
    }
    
    // Safety check for detailed view matrices
    if (showDetailedView && (!detailedMatrix || detailedMatrix.length === 0)) {
      console.error("[PARTICLE-GENERATION] Detailed matrix data not available");
      setIsGeneratingParticles(false);
      toast({
        title: "Particle Generation Error",
        description: "Detailed view data not ready. Try switching views or refreshing.",
      });
      return;
    }
    
    // Set starting state
    setParticlesInitialized(true);
    setIsGeneratingParticles(true);
    
    // Track start time for performance measurement
    const startTime = performance.now();
    setParticleMetrics(prev => ({
      ...prev,
      lastFrameTime: startTime,
      totalChords: chordData.length
    }));
    
    // Counters for tracking progress
    let currentIndex = 0;
    let totalParticles = 0;
    let totalChordsWithParticles = 0;
    
    // Clear any existing generation timeout
    if (particleGenerationRef.current) {
      clearTimeout(particleGenerationRef.current);
    }
    
    // Pre-calculate phase: store all particle positions for each chord path
    const chordParticleData: Array<{
      index: number,
      pathElement: SVGPathElement | null,
      isRealConnection: boolean,
      positions: Array<{x: number, y: number, size: number, opacity: number}>
    }> = [];
    
    // Get all chord paths
    const ribbonGroup = d3.select(svgRef.current).select('.chord-ribbons');
    const allChordPaths = Array.from(ribbonGroup.selectAll("path").nodes() as SVGPathElement[]);
    
    // Initial chord processing - calculate all positions in advance
    console.log(`[PARTICLE-OPTIMIZATION] Pre-calculating positions for ${allChordPaths.length} chords`);
    const calculateStart = performance.now();
    
    // Batch size for calculation (we can process more at once since we're not updating the DOM)
    const CALC_BATCH_SIZE = 10;
    
// Function to process a batch of chord calculations
const processCalculationBatch = (startIdx: number) => {
  try {
    const endIdx = Math.min(startIdx + CALC_BATCH_SIZE, chordData.length);
    let calculatedCount = 0;
    
    // Add diagnostic counters
    let skippedDueToRealConnectionFilter = 0;
    let skippedDueToMissingPath = 0;
    let skippedForOtherReasons = 0;
    let totalConnectionValue = 0;
    let matrixAccessFailures = 0;
    
    console.log(`[PARTICLE-DIAGNOSTIC] Starting batch ${startIdx}-${endIdx} of ${chordData.length} chords`);
    
    for (let i = startIdx; i < endIdx; i++) {
      // Get chord data for this index
      const chord = chordData[i];
      if (!chord || i >= allChordPaths.length) {
        skippedForOtherReasons++;
        continue;
      }
      
      // Determine if this is a real connection
      const sourceIndex = chord.source.index;
      const targetIndex = chord.target.index;
      let connectionValue = 0;
      
      // Log what matrices we're using
      if (i === startIdx) {
        console.log(`[PARTICLE-DIAGNOSTIC] Using ${chordConfig.showDetailedView ? 'detailed' : 'category'} matrix`);
        console.log(`[PARTICLE-DIAGNOSTIC] Matrix dimensions: ${
          chordConfig.showDetailedView 
          ? `${detailedMatrix?.length || 0}x${detailedMatrix?.[0]?.length || 0}` 
          : `${categoryMatrix?.length || 0}x${categoryMatrix?.[0]?.length || 0}`
        }`);
      }
      
      try {
        if (chordConfig.showDetailedView) {
          if (detailedMatrix && sourceIndex < detailedMatrix.length && targetIndex < detailedMatrix[0].length) {
            connectionValue = detailedMatrix[sourceIndex][targetIndex];
          } else {
            matrixAccessFailures++;
          }
        } else {
          if (categoryMatrix && sourceIndex < categoryMatrix.length && targetIndex < categoryMatrix[0].length) {
            connectionValue = categoryMatrix[sourceIndex][targetIndex];
          } else {
            matrixAccessFailures++;
          }
        }
      } catch (err) {
        console.error(`[PARTICLE-DIAGNOSTIC] Matrix access error for indices [${sourceIndex},${targetIndex}]:`, err);
        matrixAccessFailures++;
      }
      
      totalConnectionValue += connectionValue;
      const isRealConnection = connectionValue > 0.2;
      
      // Only calculate if we should add particles
      const shouldAddParticles = chordConfig.particleMode && 
        (!chordConfig.particlesOnlyRealConnections || 
         (chordConfig.particlesOnlyRealConnections && isRealConnection));
      
      if (!shouldAddParticles) {
        // Log why we're skipping
        if (chordConfig.particlesOnlyRealConnections && !isRealConnection) {
          skippedDueToRealConnectionFilter++;
        } else {
          skippedForOtherReasons++;
        }
        continue;
      }
      
      // Get path element
      const pathElement = allChordPaths[i];
      
      if (!pathElement) {
        skippedDueToMissingPath++;
        continue;
      }
      
      // Choose particle density based on connection type
      const baseDensity = isRealConnection ? 
        chordConfig.particleDensity : 
        chordConfig.particleDensity * 0.6; // Fewer particles for minimal connections
      
      // Calculate number of particles
      const totalLength = pathElement.getTotalLength();
      let numParticles = Math.round(baseDensity * (totalLength / 300));
      
      // Apply limits
      if (chordConfig.showDetailedView) {
        numParticles = Math.min(numParticles, chordConfig.maxParticlesDetailedView);
      } else {
        numParticles = Math.min(numParticles, chordConfig.maxParticlesPerChord);
      }
      
      // Ensure a minimum number of particles
      numParticles = Math.max(5, numParticles);
      
      // Generate a fixed seed for this chord to ensure consistent randomization
      const randomSeed = i * 1000 + numParticles;
      
      // Check if we can use cached positions
      let positions;
      const cacheKey = generateCacheKey(i, {
        particleDensity: chordConfig.particleDensity,
        particleDistribution: chordConfig.particleDistribution,
        particleSizeVariation: chordConfig.particleSizeVariation
      });
      
      // Check if this chord's positions are already cached
      if (particlePositionCacheRef.current.has(cacheKey)) {
        console.log(`[PARTICLE-OPTIMIZATION] Using cached positions for chord #${i}`);
        positions = particlePositionCacheRef.current.get(cacheKey);
      } else {
        // Calculate new positions if not cached
        positions = precalculateParticlePositions(
          pathElement,
          numParticles,
          chordConfig.particleDistribution,
          randomSeed
        );
        
        // Cache the calculated positions
        particlePositionCacheRef.current.set(cacheKey, positions);
        console.log(`[PARTICLE-OPTIMIZATION] Cached new positions for chord #${i}`);
      }
      
      // Store the data
      chordParticleData.push({
        index: i,
        pathElement,
        isRealConnection,
        positions
      });
      
      totalParticles += numParticles;
      calculatedCount++;
    }
    
    // Output detailed diagnostic information
    console.log(`[PARTICLE-DIAGNOSTIC] Batch ${startIdx}-${endIdx} summary: 
  Processed: ${calculatedCount}
  Skipped (real connection filter): ${skippedDueToRealConnectionFilter}
  Skipped (missing path): ${skippedDueToMissingPath}
  Skipped (matrix access failures): ${matrixAccessFailures}
  Skipped (other reasons): ${skippedForOtherReasons}
  Average connection value: ${totalConnectionValue/(endIdx-startIdx) || 0}
  Connection value threshold: 0.2
  particlesOnlyRealConnections: ${chordConfig.particlesOnlyRealConnections}
  chordPaths available: ${allChordPaths?.length || 0}
`);
    
    // Update metrics for calculation phase
    setParticleMetrics(prev => ({
      ...prev,
      totalParticles,
      chordsGenerated: endIdx,
      renderTime: performance.now() - calculateStart
    }));
    
// Add before the "if (endIdx >= chordData.length)" check
// Output diagnostic information
console.log(`[PARTICLE-DIAGNOSTIC] Batch ${startIdx}-${endIdx}: 
  Processed: ${calculatedCount}
  Skipped (real connection filter): ${skippedDueToRealConnectionFilter}
  Skipped (missing path): ${skippedDueToMissingPath}
  Skipped (other reasons): ${skippedForOtherReasons}
  Connection value threshold: 0.2
  particlesOnlyRealConnections: ${chordConfig.particlesOnlyRealConnections}
`);

    // If we've finished calculations, start rendering phase
    if (endIdx >= chordData.length) {
      console.log(`[PARTICLE-OPTIMIZATION] Finished calculating ${totalParticles} particles in ${(performance.now() - calculateStart).toFixed(1)}ms`);
      console.log(`[PARTICLE-DIAGNOSTIC] Final summary:
  Total chords: ${chordData.length}
  Processed chords: ${chordParticleData.length}
  Total particles: ${totalParticles}
  Filter active: ${chordConfig.particlesOnlyRealConnections}
`);
      totalChordsWithParticles = chordParticleData.length;
      startRenderingPhase(chordParticleData);
    } else {
      // Process next batch with small delay to prevent UI freezing
      particleGenerationRef.current = window.setTimeout(() => processCalculationBatch(endIdx), 0);
    }
  } catch (error) {
    console.error('[PARTICLE-GENERATION] Error during calculation batch:', error);
    setIsGeneratingParticles(false);
    toast({
      title: "Particle Generation Error",
      description: "Error during particle calculation. Try again with different settings.",
    });
  }
};
    
    // Rendering phase: progressively render particles from pre-calculated positions
    const startRenderingPhase = (chordParticleData: Array<any>) => {
      try {
        console.log(`[PARTICLE-OPTIMIZATION] Starting rendering phase for ${chordParticleData.length} chords`);
        const renderStart = performance.now();
        
        // Reset counter for rendering phase
        currentIndex = 0;
        const renderBatchSize = 1; // Number of chords to render in each batch
        
        // Function to render a batch of chords
        const renderNextBatch = () => {
          try {
            const endIdx = Math.min(currentIndex + renderBatchSize, chordParticleData.length);
            
            for (let i = currentIndex; i < endIdx; i++) {
              const chordData = chordParticleData[i];
              if (!chordData) continue;
              
              // Clear existing particles for this chord
              d3.selectAll(`.chord-particles[data-chord-index="${chordData.index}"]`).remove();
              
              // Choose particle style based on connection type
              const styleConfig = chordData.isRealConnection ? 
                {
                  color: chordConfig.particleColor,
                  size: chordConfig.particleSize,
                  opacity: chordConfig.particleOpacity,
                  strokeColor: chordConfig.particleStrokeColor,
                  strokeWidth: chordConfig.particleStrokeWidth,
                  strokeOpacity: chordConfig.particleStrokeOpacity || 1.0
                } : 
                {
                  color: chordConfig.minimalConnectionParticleColor,
                  size: chordConfig.minimalConnectionParticleSize,
                  opacity: chordConfig.minimalConnectionParticleOpacity,
                  strokeColor: chordConfig.minimalConnectionParticleStrokeColor,
                  strokeWidth: chordConfig.minimalConnectionParticleStrokeWidth,
                  strokeOpacity: 1.0
                };
              
              // Create shapes group
              const shapesGroup = ribbonGroup.append("g")
                .attr("class", "chord-particles")
                .attr("data-chord-index", chordData.index);
              
              // Efficiently render the pre-calculated particles
              renderPrecalculatedParticles(
                shapesGroup,
                chordData.positions,
                styleConfig.size,
                styleConfig.color,
                styleConfig.opacity,
                styleConfig.strokeColor,
                styleConfig.strokeWidth,
                styleConfig.strokeOpacity,
                true, // Always enable progressive fade-in for better visuals
                2  // Use a very small delay for faster but still visible transitions
              );
            }
            
            // Update progress
            currentIndex = endIdx;
            
            // Update metrics for rendering phase
            setParticleMetrics(prev => ({
              ...prev,
              totalParticles,
              totalChordsWithParticles,
              chordsGenerated: currentIndex,
              renderTime: performance.now() - renderStart,
              fps: currentIndex > 0 ? 1000 / ((performance.now() - renderStart) / currentIndex) : 0
            }));
            
            // If we're done, finish up
            if (currentIndex >= chordParticleData.length) {
              console.log(`[PARTICLE-OPTIMIZATION] Finished rendering ${totalParticles} particles in ${(performance.now() - renderStart).toFixed(1)}ms`);
              setIsGeneratingParticles(false);
              
              // Setup particle movement if enabled
              if (chordConfig.particleMovement && svgRef.current && !chordConfig.useWebGLRenderer) {
                if (particleMovementCleanupRef.current) {
                  particleMovementCleanupRef.current();
                }
                
                particleMovementCleanupRef.current = setupParticleMovement(
                  svgRef.current,
                  chordConfig.particleMovementAmount,
                  true
                );
              }
              
              // Final metrics update
              setParticleMetrics(prev => ({
                ...prev,
                totalParticles,
                totalChordsWithParticles,
                chordsGenerated: chordParticleData.length,
                renderTime: performance.now() - startTime,
                fps: 1000 / ((performance.now() - startTime) / chordParticleData.length)
              }));
              
              // Notify about completion
              toast({
                title: "Particles Generated",
                description: `Generated ${totalParticles} particles for ${totalChordsWithParticles} chords`,
              });
            } else {
              // Schedule next batch with delay
              particleGenerationRef.current = window.setTimeout(
                renderNextBatch, 
                chordConfig.particleGenerationDelay
              );
            }
          } catch (error) {
            console.error('[PARTICLE-GENERATION] Error during rendering batch:', error);
            setIsGeneratingParticles(false);
            toast({
              title: "Particle Rendering Error",
              description: "Error when rendering particles. Try with different settings.",
            });
          }
        };
        
        // Start the rendering phase
        renderNextBatch();
      } catch (error) {
        console.error('[PARTICLE-GENERATION] Error starting rendering phase:', error);
        setIsGeneratingParticles(false);
        toast({
          title: "Particle Generation Error",
          description: "Failed to start particle rendering.",
        });
      }
    };
    
    // Start the calculation phase
    processCalculationBatch(0);
  } catch (err) {
    console.error("[PARTICLE-GENERATION] Overall error in particle generation:", err);
    setIsGeneratingParticles(false);
    toast({
      title: "Particle Generation Failed",
      description: "An unexpected error occurred during setup. Try changing visualization settings.",
    });
  }
}, [
  svgRef, 
  chordData, 
  chordConfig,
  detailedMatrix,
  categoryMatrix,
  showDetailedView,
  toast,
  generateCacheKey,
  precalculateParticlePositions,
  renderPrecalculatedParticles,
  setupParticleMovement
]);
  
// Add this function to directly check color from dynamicColorThemes
const getThemeColor = useCallback((category: string): string => {
  // First check customNodeColors for this category
  if (customNodeColors && Object.keys(customNodeColors).some(id => id === category)) {
    return customNodeColors[category];
  }
  
  // Then check the current theme
  if (dynamicColorThemes && dynamicColorThemes[colorTheme] && dynamicColorThemes[colorTheme][category]) {
    const color = dynamicColorThemes[colorTheme][category];
    console.log(`[CHORD-COLOR-DIRECT] Found ${colorTheme} color for ${category}: ${color}`);
    return color;
  }
  
  // Fall back to default theme if available
  if (dynamicColorThemes && dynamicColorThemes.default && dynamicColorThemes.default[category]) {
    return dynamicColorThemes.default[category];
  }
  
  // Final fallback
  return "#3498db";
}, [colorTheme, customNodeColors, dynamicColorThemes]);

const initializeParticles = useCallback(() => {
  try {
    if (isGeneratingParticles) {
      // Cancel any ongoing generation
      cancelParticleGeneration();
      return;
    }

    // Check if we have data to work with - prevent crashes in detailed mode
    if (!chordData || chordData.length === 0) {
      console.error("[PARTICLE-ERROR] No chord data available for particle generation");
      toast({
        title: "Particle Generation Error",
        description: "No chord data available. Try switching to category view first.",
      });
      return;
    }

    console.log(`[PARTICLE-INIT] Starting particle generation: 
      Detailed view: ${showDetailedView}, 
      Chord count: ${chordData.length}`
    );

    // Reset metrics
    setParticleMetrics(prev => ({
      ...prev,
      totalParticles: 0,
      totalChordsWithParticles: 0,
      chordsGenerated: 0,
      totalChords: chordData.length,
      renderTime: 0
    }));

    // Flag that we're starting generation
    setIsGeneratingParticles(true);

    // Always use progressive generation for better visual effect
    // This ensures particles fade in gracefully
    setTimeout(() => {
      try {
        startProgressiveParticleGeneration();
      } catch (err) {
        console.error("[PARTICLE-ERROR] Error in progressive generation:", err);
        setIsGeneratingParticles(false);
        toast({
          title: "Particle Generation Failed",
          description: "There was an error generating particles. Try switching views or refreshing.",
        });
      }
    }, 100);
  } catch (err) {
    console.error("[PARTICLE-ERROR] Overall error in particle initialization:", err);
    setIsGeneratingParticles(false);
    toast({
      title: "Particle Generation Error",
      description: "Could not initialize particle generation.",
    });
  }
}, [
  isGeneratingParticles, 
  chordData,
  showDetailedView,
  cancelParticleGeneration,
  startProgressiveParticleGeneration,
  toast
]);

// Function to sync WebGL transforms with SVG zoom/pan
const syncWebGLTransform = useCallback(() => {
  if (!svgRef.current || !webglParticleSystemRef.current || !contentRef.current) return;
  
  // Get the current transform from the SVG content group
  const transform = contentRef.current.getAttribute('transform') || '';
  
  console.log(`[CHORD-WEBGL-DEBUG] Syncing WebGL transform: ${transform}`);
  
  // Apply this transform to the WebGL system
  webglParticleSystemRef.current.applyTransform(transform);
  
  // Log debug information about the current transform
  const transformParts = transform.match(/translate\(([^,]+),([^)]+)\)|scale\(([^)]+)\)/g);
  if (transformParts) {
    console.log(`[CHORD-WEBGL-DEBUG] Transform components:`, transformParts);
  }
}, []);

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
  
  // Get container dimensions for proper WebGL initialization
  const containerWidth = containerRef.current.clientWidth;
  const containerHeight = containerRef.current.clientHeight;
  
  // Initialize WebGL system if not already created
  if (!webglParticleSystemRef.current) {
    try {
      // Ensure container is treated as HTMLDivElement
      const container = containerRef.current as HTMLDivElement;
    const options: WebGLParticleSystemOptions = {
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
    };
    
    webglParticleSystemRef.current = new WebGLParticleSystem(options);
    webglParticleSystemRef.current.init();
    
    // Log initialization
    console.log('[CHORD-WEBGL] WebGL system initialized');
  } catch (error) {
    console.error('Failed to initialize WebGL particle system:', error);
    // Disable WebGL rendering on failure
    setChordConfig(prev => ({
      ...prev, 
      useWebGLRenderer: false
    }));
    return;
  }
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
    
    // Immediately sync the transform to ensure correct positioning
    syncWebGLTransform();
    
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
  chordPaths.length,
  syncWebGLTransform
]);





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
  // IMPORTANT FIX: Capture all particle elements before entering animation mode
  let particleGroupsToPreserve = [];
  if (particleMode && svgRef.current) {
    // Save all particle groups to restore them
    const particleGroups = svgRef.current.querySelectorAll('.chord-particles');
    if (particleGroups.length > 0) {
      console.log(`[ANIMATION-FIX] Preserving ${particleGroups.length} particle groups during animation start`);
      // Store particle groups in a dedicated variable
      particleGroupsToPreserve = Array.from(particleGroups);
      // Store them in the SVG element for later use
      svgRef.current.particleGroupsToRestore = particleGroupsToPreserve;
    }
  }
  
  setChordConfig(prev => ({ ...prev, isAnimating: true }));
  
  // If we're at the end, reset to the beginning
  if (currentAnimatedIndex >= totalRibbonCount) {
    setCurrentAnimatedIndex(0);
  }
  
  // Clear any existing animation
  if (animationRef.current) {
    clearTimeout(animationRef.current);
    animationRef.current = null;
  }
  
// Start the animation loop with a simpler, more predictable speed calculation
const animateWithCurrentSpeed = () => {
  // Get the current speed from config to ensure we're using the latest value
  const currentSpeed = chordConfig.animationSpeed;
  
  setCurrentAnimatedIndex(prevIndex => {
    // If we've reached the end, stop the animation
    if (prevIndex >= totalRibbonCount) {
      setChordConfig(prev => ({ ...prev, isAnimating: false }));
      return prevIndex;
    }
    // Otherwise, advance to the next ribbon
    return prevIndex + 1;
  });
  
  // Simpler, more consistent frame delay calculation
  // Use a base delay of 1000ms (1 second) for 1x speed
  let baseDelay = 1000;
  let frameDelay = baseDelay / currentSpeed;
  
  // Set minimum delay to prevent browser stuttering (50ms = 20fps)
  frameDelay = Math.max(frameDelay, 50);
  
  // For fade transition, add a delay that scales with the inverse square root of speed
  // This means higher speeds still get some transition time, but it doesn't dominate
  if (chordConfig.useFadeTransition) {
    // Start with 30% of transition duration as base
    const transitionAdjustment = chordConfig.transitionDuration * 0.3;
    // Scale down as speed increases (with diminishing effect)
    const speedAdjustedTransition = transitionAdjustment / Math.sqrt(currentSpeed);
    // Apply minimum without completely overriding the speed effect
    frameDelay = Math.max(frameDelay, speedAdjustedTransition);
  }
  
  // Schedule the next frame
  animationRef.current = window.setTimeout(animateWithCurrentSpeed, frameDelay);
};
    
    // Calculate initial delay
    const initialDelay = chordConfig.useFadeTransition ? 
      Math.max(300, chordConfig.transitionDuration * 0.5) / chordConfig.animationSpeed : 
      1000 / chordConfig.animationSpeed;
    
    // Start the animation with initial delay
    animationRef.current = window.setTimeout(animateWithCurrentSpeed, initialDelay);
  }, [currentAnimatedIndex, totalRibbonCount, chordConfig]);

// Stop animation
const stopAnimation = useCallback(() => {
  if (animationRef.current) {
    clearTimeout(animationRef.current);
    animationRef.current = null;
  }
  
  // Clear the particle restoration list when animation stops
  if (svgRef.current) {
    svgRef.current.particleGroupsToRestore = [];
  }
  
  setChordConfig(prev => ({ ...prev, isAnimating: false }));
}, []);

  // Toggle animation
 // Toggle animation
const toggleAnimation = useCallback(() => {
  // Important: Set a flag to preserve existing particles when animation starts
  window.preserveParticlesDuringAnimation = true;
  
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

  const jumpToFrame = useCallback((frameIndex: number) => {
    // Stop any running animation
    stopAnimation();
    
    // Set the index directly to the requested frame
    // Clamp between 0 and total count
    const clampedIndex = Math.max(0, Math.min(totalRibbonCount, frameIndex));
    setCurrentAnimatedIndex(clampedIndex);
    
    // Force redraw
    setNeedsRedraw(true);
  }, [stopAnimation, totalRibbonCount]);
  
  // Change animation speed
  const changeAnimationSpeed = useCallback((speed: number) => {
    setChordConfig(prev => ({ ...prev, animationSpeed: speed }));
    
    // If animation is running, restart it with new speed
    if (isAnimating && animationRef.current) {
      clearTimeout(animationRef.current);
      startAnimation();
    }
  }, [isAnimating, startAnimation]);


// Helper function to consistently determine if a connection is "real"
const isRealConnection = useCallback((d: any): boolean => {
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
  
  return connectionValue > 0.2;
}, [showDetailedView, detailedMatrix, categoryMatrix]);

// Enhanced update function that handles all property types more effectively
const updateConfig = useCallback((updates: Partial<ChordDiagramConfig>) => {
  console.log('[CONFIG-UPDATE] Processing updates:', Object.keys(updates).join(', '));
  
  // Category property types for smarter updates
  const positionAffectingProps = [
    'particleDensity', 
    'particleDistribution',
    'maxParticlesPerChord',
    'maxParticlesDetailedView'
  ];
  
  const ribbonStyleProps = [
    'chordOpacity', 'chordStrokeWidth', 'chordStrokeOpacity',
    'realConnectionRibbonOpacity', 'realConnectionRibbonColor',
    'realConnectionRibbonStrokeColor', 'realConnectionRibbonStrokeWidth',
    'minimalConnectionRibbonOpacity', 'minimalConnectionRibbonColor',
    'minimalConnectionRibbonStrokeColor', 'minimalConnectionRibbonStrokeWidth',
    'showOnlyRealConnectionsRibbons', 'filterRealConnectionsOnly', 
    'ribbonFillColor', 'ribbonStrokeColor', 'ribbonOpacity'
  ];
  
  const arcStyleProps = [
    'arcOpacity', 'arcStrokeWidth', 'arcStrokeColor', 'arcCornerRadius'
  ];
  
  const particleStyleProps = [
    'particleColor', 'particleSize', 'particleOpacity', 
    'particleStrokeColor', 'particleStrokeWidth', 'particleStrokeOpacity',
    'minimalConnectionParticleColor', 'minimalConnectionParticleSize',
    'minimalConnectionParticleOpacity', 'minimalConnectionParticleStrokeColor',
    'minimalConnectionParticleStrokeWidth', 'particlesOnlyRealConnections'
  ];
  
  const animationProps = [
    'animationSpeed', 'useFadeTransition', 'transitionDuration',
    'ribbonAnimationEnabled', 'arcAnimationEnabled', 'animationEffect'
  ];
  
  // Categorize the incoming updates
  const updates_by_category = {
    position: Object.keys(updates).filter(key => positionAffectingProps.includes(key)),
    ribbon: Object.keys(updates).filter(key => ribbonStyleProps.includes(key)),
    arc: Object.keys(updates).filter(key => arcStyleProps.includes(key)),
    particle: Object.keys(updates).filter(key => particleStyleProps.includes(key)),
    animation: Object.keys(updates).filter(key => animationProps.includes(key)),
    other: Object.keys(updates).filter(key => 
      !positionAffectingProps.includes(key) && 
      !ribbonStyleProps.includes(key) && 
      !arcStyleProps.includes(key) && 
      !particleStyleProps.includes(key) &&
      !animationProps.includes(key)
    )
  };
  
  // Log if this is a significant update
  if (updates_by_category.position.length > 0) {
    console.log('[CONFIG-UPDATE] Position-affecting properties changed:', updates_by_category.position.join(', '));
  }
  
  // Special handling for particle mode toggle
  if ('particleMode' in updates) {
    console.log(`[CONFIG-UPDATE] Particle mode toggled: ${updates.particleMode}`);
    
    // If turning on particles, also synchronize showParticlesLayer
    if (updates.particleMode) {
      updates.showParticlesLayer = true;
    }
    
    // Apply updates first
    setChordConfig(prev => ({
      ...prev,
      ...updates
    }));
    
    // Need to redraw
    setNeedsRedraw(true);
    
    // If enabling particles, initialize them after a brief delay
    if (updates.particleMode) {
      setTimeout(() => {
        initializeParticles();
      }, 50);
    }
    
    return;
  }
  
  // Special handling for geometric shapes mode
  if ('useGeometricShapes' in updates) {
    console.log(`[CONFIG-UPDATE] Geometric shapes toggled: ${updates.useGeometricShapes}`);
    
    // If turning on shapes, also synchronize showGeometricShapesLayer
    if (updates.useGeometricShapes) {
      updates.showGeometricShapesLayer = true;
    }
  }
  
  // Handle WebGL specific updates
  if ('useWebGLRenderer' in updates && webglParticleSystemRef.current) {
    if (!updates.useWebGLRenderer) {
      // Disposing WebGL when turning it off
      console.log('[CONFIG-UPDATE] Disposing WebGL system');
      webglParticleSystemRef.current.dispose();
      webglParticleSystemRef.current = null;
    }
  }
  
// For arc-only updates with particles, attempt to update existing arcs rather than redraw
if (updates_by_category.arc.length > 0 && 
  updates_by_category.position.length === 0) {
  console.log('[CONFIG-UPDATE] Updating arc styles without particle regeneration');

  // Directly update arc attributes
  const arcGroup = d3.select(svgRef.current).select('.chord-arcs');

  // Update opacity
  if ('arcOpacity' in updates) {
    arcGroup.selectAll('path').attr('opacity', updates.arcOpacity);
  }

  // Update stroke width
  if ('arcStrokeWidth' in updates) {
    arcGroup.selectAll('path').attr('stroke-width', updates.arcStrokeWidth);
  }

  // Update stroke color
  if ('arcStrokeColor' in updates) {
    arcGroup.selectAll('path').attr('stroke', updates.arcStrokeColor);
  }
    
  // For corner radius, we need a more complex approach as it requires path recalculation
  if ('arcCornerRadius' in updates && updates.arcCornerRadius !== chordConfig.arcCornerRadius) {
    try {
        // We'll need to update the arc generator and reapply it to existing paths
        const outerRadius = Math.min(
          svgRef.current.clientWidth, 
          svgRef.current.clientHeight
        ) * 0.5 - 60;
        const innerRadius = outerRadius - 20;
        
        // Create new arc generator with the corner radius
        const arc = d3.arc()
          .innerRadius(innerRadius)
          .outerRadius(outerRadius)
          .cornerRadius(updates.arcCornerRadius); // Apply the new corner radius
        
        // Update each arc path with the new generator
        arcGroup.selectAll('path').each(function(d: any) {
          const pathElement = this as SVGPathElement;
          try {
            // Apply new path data with the updated arc generator
            const newPath = arc(d);
            if (newPath) {
              d3.select(pathElement).attr('d', newPath);
            }
          } catch (e) {
            console.error('[ARC-UPDATE] Error updating arc path:', e);
          }
        });
      } catch (e) {
        console.error('[ARC-UPDATE] Error creating arc generator:', e);
      }
    }
    
    // Update config without triggering a full redraw
    setChordConfig(prev => ({
      ...prev,
      ...updates
    }));
    
    // Only exit early if we're not updating other properties
    if (Object.keys(updates).every(key => key.startsWith('arc'))) {
      return; // Exit early to avoid full redraw only if these are arc-only updates
    }
  }
  
// Handle ribbon-specific updates
if (updates_by_category.ribbon.length > 0 && updates_by_category.position.length === 0) {
  console.log('[CONFIG-UPDATE] Updating ribbon styles directly');
  
  try {
    // Get the ribbon group
    const ribbonGroup = d3.select(svgRef.current).select('.chord-ribbons');
    
    // Update ribbon opacity
    if ('ribbonOpacity' in updates || 'chordOpacity' in updates) {
      const opacity = updates.ribbonOpacity || updates.chordOpacity || chordConfig.ribbonOpacity;
      ribbonGroup.selectAll('path').style('fill-opacity', chordConfig.ribbonFillEnabled ? opacity : 0);
    }
    
    // Update stroke width
    if ('chordStrokeWidth' in updates) {
      ribbonGroup.selectAll('path').attr('stroke-width', updates.chordStrokeWidth);
    }
    
    // Update stroke opacity
    if ('chordStrokeOpacity' in updates) {
      ribbonGroup.selectAll('path').attr('stroke-opacity', updates.chordStrokeOpacity);
    }
    
    // Update config without triggering full redraw
    setChordConfig(prev => ({
      ...prev,
      ...updates
    }));
    
    return; // Avoid unnecessary redraw
  } catch (error) {
    console.error('[RIBBON-UPDATE] Error updating ribbons:', error);
    // Fall through to full redraw if direct update fails
  }
}

  // Update the configuration state
  setChordConfig(prev => ({
    ...prev,
    ...updates
  }));
  
  // Directly update particles in SVG if relevant
  if (updates_by_category.particle.length > 0 && !chordConfig.useWebGLRenderer && svgRef.current && particlesInitialized) {
    console.log('[CONFIG-UPDATE] Directly updating particle appearances');
    
    // Direct DOM updates for particles to avoid full redraw
    d3.select(svgRef.current).selectAll('.chord-particles circle')
      .each(function() {
        const element = d3.select(this);
        const isRealConnection = element.attr("data-is-real") === "true";
        
        // Apply property updates based on connection type
        if (isRealConnection) {
          if ('particleColor' in updates) {
            element.attr("fill", updates.particleColor);
          }
          if ('particleStrokeColor' in updates) {
            element.attr("stroke", updates.particleStrokeColor);
          }
          if ('particleStrokeWidth' in updates) {
            element.attr("stroke-width", updates.particleStrokeWidth);
          }
          if ('particleOpacity' in updates) {
            const baseOpacity = updates.particleOpacity || chordConfig.particleOpacity;
            // Add slight randomization for natural look
            const randomFactor = 0.8 + Math.random() * 0.4;
            element.style("opacity", baseOpacity * randomFactor);
          }
        } else {
          // Apply minimal connection properties
          if ('minimalConnectionParticleColor' in updates) {
            element.attr("fill", updates.minimalConnectionParticleColor);
          }
          if ('minimalConnectionParticleStrokeColor' in updates) {
            element.attr("stroke", updates.minimalConnectionParticleStrokeColor);
          }
          if ('minimalConnectionParticleStrokeWidth' in updates) {
            element.attr("stroke-width", updates.minimalConnectionParticleStrokeWidth);
          }
          if ('minimalConnectionParticleOpacity' in updates) {
            const baseOpacity = updates.minimalConnectionParticleOpacity || chordConfig.minimalConnectionParticleOpacity;
            const randomFactor = 0.8 + Math.random() * 0.4;
            element.style("opacity", baseOpacity * randomFactor);
          }
        }
      });
  }
  
  // Update WebGL particles if applicable
  if (updates_by_category.particle.length > 0 && chordConfig.useWebGLRenderer && webglParticleSystemRef.current) {
    console.log('[CONFIG-UPDATE] Updating WebGL particle system');
    
    webglParticleSystemRef.current.updateOptions({
      particleColor: 'particleColor' in updates ? updates.particleColor : chordConfig.particleColor,
      particleSize: 'particleSize' in updates ? updates.particleSize : chordConfig.particleSize,
      particleSizeVariation: 'particleSizeVariation' in updates ? updates.particleSizeVariation : chordConfig.particleSizeVariation,
      particleOpacity: 'particleOpacity' in updates ? updates.particleOpacity : chordConfig.particleOpacity,
      particleDistribution: 'particleDistribution' in updates ? updates.particleDistribution : chordConfig.particleDistribution,
      particleBlur: 'particleBlur' in updates ? updates.particleBlur : chordConfig.particleBlur,
      particleMovement: 'particleMovement' in updates ? updates.particleMovement : chordConfig.particleMovement,
      particleMovementAmount: 'particleMovementAmount' in updates ? updates.particleMovementAmount : chordConfig.particleMovementAmount
    });
  }
  // Clear particle cache when density changes
if ('particleDensity' in updates || 'particleDistribution' in updates || 'maxParticlesPerChord' in updates) {
  console.log('[PARTICLE-DENSITY] Clearing cache due to parameter change');
  particlePositionCacheRef.current.clear();
  window.forceParticleRegeneration = true; // Force regeneration if available
}
  // Update ribbon rendering for connection filtering
  if ('showOnlyRealConnectionsRibbons' in updates && svgRef.current) {
    console.log('[CONFIG-UPDATE] Updating ribbon visibility for real connections filter');
    try {
      // Get ribbon group and apply filtering directly
      const ribbonGroup = d3.select(svgRef.current).select('.chord-ribbons');
      ribbonGroup.selectAll('path').each(function(d: any) {
        // Determine if this is a real connection
        const isRealConn = isRealConnection(d);
        
        // If filter is enabled and this is not a real connection, hide it
        if (updates.showOnlyRealConnectionsRibbons && !isRealConn) {
          d3.select(this).style('opacity', 0);
        } else {
          // Otherwise reset opacity to let the style function handle it
          d3.select(this).style('opacity', null);
        }
      });
    } catch (error) {
      console.error('[RIBBON-FILTER] Error updating ribbons:', error);
      // Fallback to full redraw if direct update fails
      setNeedsRedraw(true);
    }
  }
  
  // Apply animation effect changes
  if (updates_by_category.animation.length > 0 && svgRef.current) {
    console.log('[CONFIG-UPDATE] Updating animation styles');
    
    // Get main group
    const g = d3.select(svgRef.current).select('g');
    
    // Update animation classes based on config
    const ribbonGroup = g.select('.chord-ribbons');
    const arcGroup = g.select('.chord-arcs');
    
    // Update animated classes
    if ('ribbonAnimationEnabled' in updates) {
      ribbonGroup.classed('animated', updates.ribbonAnimationEnabled);
    }
    
    if ('arcAnimationEnabled' in updates) {
      arcGroup.classed('animated', updates.arcAnimationEnabled);
    }
    
    // Apply specific animation effect
    if ('animationEffect' in updates) {
      g.classed('rotate-animation', updates.animationEffect === 'rotate');
      
      // Apply specific CSS animations based on effect
      if (updates.animationEffect === 'wave') {
        ribbonGroup.selectAll('path').style('animation', `ribbonWave calc(3s * var(--chord-animation-speed)) ease-in-out infinite`);
        arcGroup.selectAll('path').style('animation', `arcPulse calc(4s * var(--chord-animation-speed)) ease-in-out infinite`);
      } else if (updates.animationEffect === 'pulse') {
        ribbonGroup.selectAll('path').style('animation', `ribbonPulse calc(2s * var(--chord-animation-speed)) ease-in-out infinite`);
        arcGroup.selectAll('path').style('animation', `arcPulse calc(3s * var(--chord-animation-speed)) ease-in-out infinite`);
      }
    }
    
    // Update animation speed CSS variable
    if ('animationSpeedMultiplier' in updates) {
      d3.select(svgRef.current).style('--chord-animation-speed', updates.animationSpeedMultiplier);
    }
  }
  
  // Determine if we need a full redraw
  const needsFullRedraw = 
    updates_by_category.position.length > 0 || 
    updates_by_category.ribbon.length > 0 || 
    updates_by_category.other.length > 0 ||
    ('particleMode' in updates) ||
    ('useGeometricShapes' in updates) ||
    ('useWebGLRenderer' in updates) ||
    ('showChordRibbons' in updates) ||
    ('showParticlesLayer' in updates) ||
    ('showGeometricShapesLayer' in updates);
  
  if (needsFullRedraw) {
    console.log('[CONFIG-UPDATE] Changes require full redraw');
    setNeedsRedraw(true);
  }
}, [
  chordConfig, 
  svgRef, 
  webglParticleSystemRef, 
  particlesInitialized, 
  initializeParticles,
  isRealConnection
]);

// Add this function after updateConfig to update particles without recreating them
const updateParticleAppearance = useCallback((updates: Partial<ChordDiagramConfig>) => {
  if (!svgRef.current) return;
  
  console.log('[PARTICLE-OPTIMIZATION] Updating particle appearance without recalculation');
  
  // Get all particles
  const particles = d3.select(svgRef.current).selectAll('.chord-particles circle');
  
  // Skip if no particles exist
  if (particles.size() === 0) {
    console.log('[PARTICLE-OPTIMIZATION] No particles to update');
    setNeedsRedraw(true); // Fall back to full redraw
    return;
  }
  
  // Update color if needed
  if ('particleColor' in updates && particles.size()) {
    particles.attr("fill", (d: any, i: number, nodes: any) => {
      const element = d3.select(nodes[i]);
      // Only update real connection particles (not minimal connection particles)
      if (element.attr("data-is-real") === "true") {
        return updates.particleColor;
      }
      return element.attr("fill");
    });
  }
  
  // Update size if needed
  if ('particleSize' in updates && particles.size()) {
    particles.attr("r", (d: any, i: number, nodes: any) => {
      const element = d3.select(nodes[i]);
      if (element.attr("data-is-real") === "true") {
        // Apply size with random variation
        const variation = chordConfig.particleSizeVariation * updates.particleSize!;
        const baseSize = updates.particleSize as number;
        return baseSize - variation + (Math.random() * variation * 2);
      }
      return element.attr("r");
    });
  }
  
  // Update opacity if needed
  if ('particleOpacity' in updates && particles.size()) {
    particles.style("opacity", (d: any, i: number, nodes: any) => {
      const element = d3.select(nodes[i]);
      if (element.attr("data-is-real") === "true") {
        // Apply opacity with slight randomization
        const randomOpacityFactor = 0.5 + Math.random() * 0.5;
        return (updates.particleOpacity as number) * randomOpacityFactor;
      }
      return element.style("opacity");
    });
  }
  
  // Update stroke properties if needed
  if (('particleStrokeColor' in updates || 'particleStrokeWidth' in updates) && particles.size()) {
    if ('particleStrokeColor' in updates) {
      particles.attr("stroke", (d: any, i: number, nodes: any) => {
        const element = d3.select(nodes[i]);
        if (element.attr("data-is-real") === "true") {
          return updates.particleStrokeColor;
        }
        return element.attr("stroke");
      });
    }
    
    if ('particleStrokeWidth' in updates) {
      particles.attr("stroke-width", (d: any, i: number, nodes: any) => {
        const element = d3.select(nodes[i]);
        if (element.attr("data-is-real") === "true") {
          return updates.particleStrokeWidth;
        }
        return element.attr("stroke-width");
      });
    }
  }
  
  console.log('[PARTICLE-OPTIMIZATION] Updated appearance of existing particles');
}, [svgRef, chordConfig.particleSizeVariation]);



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

// Effect to clear particle cache when critical view settings change
useEffect(() => {
  // If there are cached positions, clear them
  if (particlePositionCacheRef.current.size > 0) {
    console.log('[PARTICLE-OPTIMIZATION] Clearing particle cache due to view mode change');
    particlePositionCacheRef.current.clear();
    
    // Set a flag to force particle regeneration on next redraw
    window.forceParticleRegeneration = true;
  }
}, [showDetailedView, showAllNodes, evenDistribution]);

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
          
          // Sync WebGL transform with SVG zoom/pan after each zoom event
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
          .call(zoom.transform, transform)
          .on("end", () => {
            // Ensure WebGL is synced after transition completes
            syncWebGLTransform();
            console.log("[CHORD-WEBGL-DEBUG] Transform applied after fit:", contentRef.current?.getAttribute('transform'));
          });
      } catch (error) {
        console.error("Error fitting chord diagram:", error);
      }
    };
    
    // Call fit function after a short delay to ensure DOM is ready
    setTimeout(fitChordDiagram, 300);
    
    return { zoom, fitChordDiagram };
  }, [svgRef, containerRef, contentRef, syncWebGLTransform]);

  const handleLayerToggle = useCallback((layerName: string, value: boolean) => {
    console.log(`[LAYER-TOGGLE] Toggling ${layerName} to ${value}`);
    
    if (layerName === 'showParticlesLayer') {
      setChordConfig(prev => ({
        ...prev,
        showParticlesLayer: value,
        particleMode: value // Keep particle mode in sync with layer visibility
      }));
      
      // If enabling particles and they haven't been initialized, do so
      if (value && !particlesInitialized && !isGeneratingParticles) {
        // Use a short delay to ensure the config update is applied first
        setTimeout(() => {
          initializeParticles();
        }, 100);
      }
    } else if (layerName === 'showGeometricShapesLayer') {
      setChordConfig(prev => ({
        ...prev,
        showGeometricShapesLayer: value,
        useGeometricShapes: value // Keep geometric shapes in sync with layer visibility
      }));
    } else {
      setChordConfig(prev => ({
        ...prev,
        [layerName]: value
      }));
    }
    
    // Force redraw
    setNeedsRedraw(true);
  }, [particlesInitialized, isGeneratingParticles, initializeParticles]);

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
  // Log current color theme for debugging
  console.log(`[CHORD-COLOR-DEBUG] Current color theme: ${colorTheme}`);
  if (dynamicColorThemes) {
    const availableThemes = Object.keys(dynamicColorThemes);
    console.log(`[CHORD-COLOR-DEBUG] Available themes: ${availableThemes.join(', ')}`);
    console.log(`[CHORD-COLOR-DEBUG] Current theme exists: ${availableThemes.includes(colorTheme)}`);
    
    // Force a redraw when color theme changes to ensure colors update
    setNeedsRedraw(true);
  }
  
  return () => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    if (particleUpdateTimeoutRef.current) {
      clearTimeout(particleUpdateTimeoutRef.current);
    }
  };
}, [colorTheme, dynamicColorThemes]);

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
  // Effect to redraw when animation state changes
useEffect(() => {
  if (!isLoading) {
    // Set redraw flag but mark that this was animation-only
    window.lastUpdateWasAnimationOnly = true;
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

// Check if this was only an animation update
  const isAnimationOnly = window.lastUpdateWasAnimationOnly === true;
  window.lastUpdateWasAnimationOnly = false;
  
  if (isAnimationOnly && particleMode && particlesInitialized) {
    console.log('[PARTICLE-OPTIMIZATION] Animation-only update, will try to preserve particles');
  }

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

// Add a style element to ensure CSS variables are properly set
svg.append("style")
  .text(`:root {
    --chord-animation-speed: ${chordConfig.animationSpeedMultiplier};
    --chord-filter: url(#chordBlurFilter) drop-shadow(0 0 6vmin rgba(0,0,0,0.2));
    --wave-distance: 3px;
  }`);

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
      
// Add the groups (arcs) - with animation class
const groups = g.append("g")
  .attr("class", `chord-arcs ${chordConfig.arcAnimationEnabled ? 'animated' : ''}`)
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
        // Use our direct theme color function to ensure correct color application
        const color = getThemeColor(node.category);
        return color;
      }
      return "#999"; // Fallback
    } else {
      // For category view - use the index from the data point itself
      const category = uniqueCategories[d.index];
      // Use our direct theme color function 
      const color = getThemeColor(category);
      return color;
    }
  })
  .attr("stroke", chordConfig.arcStrokeColor || "#ffffff")
  .attr("stroke-width", chordConfig.arcStrokeWidth || 1.0)
  .attr("stroke-opacity", 1.0)  // Add stroke opacity explicitly
  .attr("opacity", arcOpacity) // Use the destructured arcOpacity variable
  .attr("d", d => arc(d as any)) // Call the function with the current data

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

// Add the chords (ribbons) with animation class
const ribbonGroup = g.append("g")
  .attr("class", `chord-ribbons ${chordConfig.ribbonAnimationEnabled ? 'animated' : ''}`)
  .attr("fill-opacity", (ribbonFillEnabled && chordConfig.showChordRibbons) ? chordConfig.ribbonOpacity : 0);

// Generate individual effect filters
const blurFilter = chordConfig.blurEffectEnabled ? 
  `url(#chordBlurFilter) drop-shadow(0 0 6vmin rgba(0, 0, 0, 0.2))` : '';

const glowFilter = chordConfig.glowEffectEnabled ? 
  `drop-shadow(0 0 ${chordConfig.glowEffectSize}px ${chordConfig.glowEffectColor})` : '';

// Update the blur filter in SVG defs if enabled
if (chordConfig.blurEffectEnabled) {
  const defs = svg.select("defs");
  if (defs.empty()) {
    svg.append("defs")
      .html(`<filter id="chordBlurFilter">
        <feGaussianBlur stdDeviation="${chordConfig.blurEffectAmount}"></feGaussianBlur>
        <feColorMatrix type="matrix" values="1 0 0 0 0
                     0 1 0 0 0
                     0 0 1 0 0
                     0 0 0 12 -8"></feColorMatrix>
      </filter>`);
  } else {
    defs.select("#chordBlurFilter feGaussianBlur")
      .attr("stdDeviation", chordConfig.blurEffectAmount);
  }
}

// Apply combined filter effects
if (chordConfig.blurEffectEnabled || chordConfig.glowEffectEnabled) {
  // Create combined filter value
  const combinedFilter = `${blurFilter} ${glowFilter}`.trim();
  const combinedFilterPulse = chordConfig.glowEffectEnabled ? 
    `${blurFilter} drop-shadow(0 0 ${chordConfig.glowEffectSize * 1.5}px ${chordConfig.glowEffectColor})` : 
    combinedFilter;
  
  // Remove individual effect classes and apply combined class
  g.classed('blur-effect', false)
   .classed('glow-effect', false)
   .classed('combined-effects', true)
   .classed('dark-mode', chordConfig.glowEffectDarkMode)
   .classed('light-mode', !chordConfig.glowEffectDarkMode)
   .classed('animated', chordConfig.ribbonAnimationEnabled || chordConfig.arcAnimationEnabled);
  
  // Apply combined filter variables
  g.style('--combined-filter', combinedFilter)
   .style('--combined-filter-pulse', combinedFilterPulse)
   .style('--glow-color', chordConfig.glowEffectColor)
   .style('--glow-size', `${chordConfig.glowEffectSize}px`)
   .style('--glow-intensity', chordConfig.glowEffectIntensity);
}

// Apply rotation animation if that effect is selected
if (chordConfig.animationEffect === 'rotate' && 
    (chordConfig.ribbonAnimationEnabled || chordConfig.arcAnimationEnabled)) {
  g.classed('rotate-animation', true);
}

// Apply CSS variable for animation speed
svg.style('--chord-animation-speed', chordConfig.animationSpeedMultiplier);

// Apply animation directly to paths for ribbon animation
if (chordConfig.ribbonAnimationEnabled) {
  ribbonGroup.selectAll("path")
    .style("animation", `ribbonWave calc(3s * ${chordConfig.animationSpeedMultiplier}) ease-in-out infinite`)
    .style("animation-delay", (_, i) => `${(i % 3) * 0.3}s`); // Add varied delays
}

// Apply animation directly to arcs for arc animation
if (chordConfig.arcAnimationEnabled) {
  groups.selectAll("path")
    .style("animation", `arcPulse calc(4s * ${chordConfig.animationSpeedMultiplier}) ease-in-out infinite`)
    .style("animation-delay", (_, i) => `${(i % 2) * 0.5}s`); // Add varied delays
}

if (!isAnimating) {
      // If not animating, add all chords at once
      
      const chordPaths = ribbonGroup.selectAll("path")
        .data(chordResult)
        .join("path")
        .attr("d", d => customRibbon(d, false))
        .attr("fill", d => {
          // Apply individual glow filters if enabled
if (chordConfig.glowEffectEnabled && chordConfig.useIndividualGlowColors) {
  ribbonGroup.selectAll("path")
    .each(function(d: any) {
      const path = d3.select(this);
      let glowColor;
      
      if (showDetailedView) {
        // For detailed view, use source node's category color
        if (d.source.index < detailedNodeData.length) {
          const sourceNode = detailedNodeData[d.source.index];
          glowColor = chordConfig.categoryGlowColors[sourceNode.category] || chordConfig.glowEffectColor;
        }
      } else {
        // For category view, use source category color
        const sourceCategory = uniqueCategories[d.source.index];
        glowColor = chordConfig.categoryGlowColors[sourceCategory] || chordConfig.glowEffectColor;
      }
      
      // Apply individual glow filter
      const individualGlowFilter = `drop-shadow(0 0 ${chordConfig.glowEffectSize}px ${glowColor})`;
      path.style("filter", individualGlowFilter);
    });
}

// Also apply to arcs
if (chordConfig.glowEffectEnabled && chordConfig.useIndividualGlowColors) {
  groups.selectAll("path")
    .each(function(d: any) {
      const path = d3.select(this);
      let glowColor;
      
      if (showDetailedView) {
        // For detailed view, get the node's category
        if (d.index < detailedNodeData.length) {
          const node = detailedNodeData[d.index];
          glowColor = chordConfig.categoryGlowColors[node.category] || chordConfig.glowEffectColor;
        }
      } else {
        // For category view - use the category
        const category = uniqueCategories[d.index];
        glowColor = chordConfig.categoryGlowColors[category] || chordConfig.glowEffectColor;
      }
      
           // Apply individual glow filter
           const individualGlowFilter = `drop-shadow(0 0 ${chordConfig.glowEffectSize}px ${glowColor})`;
           path.style("filter", individualGlowFilter);
         });
     }
               // First check if this is a real connection
               const isRealConn = isRealConnection(d);
               
               // If directional styling is enabled, use source/target colors
               if (useDirectionalStyling) {
                 return sourceChordColor;
               }
               
               // If using monochrome ribbons, use connection-specific colors
               if (!useColoredRibbons) {
                 return isRealConn ? 
                   chordConfig.realConnectionRibbonColor : 
                   chordConfig.minimalConnectionRibbonColor;
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
          // Use connection-specific stroke color
          const isRealConn = isRealConnection(d);
          
          // If directional styling is enabled, use darker source color for stroke
          if (useDirectionalStyling) {
            return d3.rgb(sourceChordColor).darker(0.8).toString();
          }
          
          // For monochrome mode, use connection-specific stroke color
          if (!useColoredRibbons) {
            return isRealConn ? 
              chordConfig.realConnectionRibbonStrokeColor : 
              chordConfig.minimalConnectionRibbonStrokeColor;
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
          .attr("stroke-width", d => {
            // Use connection-specific stroke width
            const isRealConn = isRealConnection(d);
            return isRealConn ? 
              chordConfig.realConnectionRibbonStrokeWidth : 
              chordConfig.minimalConnectionRibbonStrokeWidth;
          })
          .attr("stroke-opacity", chordConfig.showChordRibbons ? chordStrokeOpacity : 0) // Hide stroke if ribbons disabled
          .style("opacity", d => {
            // First check if ribbons should be visible at all
            if (!chordConfig.showChordRibbons) return 0;
  
  // Check if this is a real connection
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
            
            const isRealConnection = connectionValue > 0.2;
            
            // Apply real connections filter if enabled
            if (chordConfig.showOnlyRealConnectionsRibbons && !isRealConnection) {
              return 0; // Hide if it's not a real connection
            }
            
            // If directional styling is enabled, use source opacity
            if (useDirectionalStyling) {
              return sourceChordOpacity;
            }
            
            // In stroke-only mode, ensure better visibility
            if (!ribbonFillEnabled) {
              return isRealConnection ? 1.0 : 0.7;
            }
            
            // Use connection-specific opacity
            return isRealConnection ? 
              chordConfig.realConnectionRibbonOpacity : 
              chordConfig.minimalConnectionRibbonOpacity;
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
          
// Handle WebGL rendering first if enabled
if (useWebGLRenderer && chordConfig.showParticlesLayer && particleMode) {
  // Collect all chord paths for WebGL rendering
  const pathElements = Array.from(ribbonGroup.selectAll("path").nodes() as SVGPathElement[]);
  
  // Filter paths if "only real connections" is enabled
  let filteredPaths = pathElements;
  if (chordConfig.particlesOnlyRealConnections) {
    filteredPaths = pathElements.filter((path, i) => {
      if (i >= chordResult.length) return false;
      const d = chordResult[i];
      return isRealConnection(d);
    });
  }
  
  setChordPaths(filteredPaths);
  
  // Sync WebGL transform with SVG
  syncWebGLTransform();
  
  // When using WebGL, adjust base ribbon opacity if needed
  if (!chordConfig.showChordRibbons) {
    pathElements.forEach(path => {
      d3.select(path)
        .attr("fill-opacity", 0.02)  // Nearly invisible fill
        .attr("stroke-opacity", 0.05); // Very subtle stroke
    });
  }
  
  console.log('[CHORD-WEBGL] Using WebGL renderer for particles');
}

// Handle SVG-based geometric shapes - can co-exist with WebGL or ribbons
if (chordConfig.showGeometricShapesLayer && useGeometricShapes) {
  // For each chord path, determine if it should have shapes
  chordPaths.each(function(d, i) {
    const isRealConn = isRealConnection(d);
    
    // Apply "only real connections" filter if enabled
    if (!chordConfig.showOnlyRealConnectionsShapes || isRealConn) {
      addShapesOrParticlesAlongPath(
        d3.select(this),
        ribbonGroup,
        true, // useGeometricShapes
        false, // particleMode
        shapeType,
        shapeSize,
        shapeSpacing,
        shapeFill,
        shapeStroke,
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
        isRealConn,
        true, // Apply to this chord
        chordConfig.maxParticlesPerChord,
        chordConfig.maxParticlesDetailedView,
        chordConfig.maxShapesDetailedView,
        false, // No progressive fade-in for shapes
        1.0 // Stroke opacity
      );
    }
  });
}

// Handle SVG-based particles - can co-exist with geometric shapes and ribbons
if (chordConfig.showParticlesLayer && particleMode && !useWebGLRenderer) {
  // For each chord path, determine if it should have particles
  chordPaths.each(function(d, i) {
    const isRealConn = isRealConnection(d);
    
    // Apply "only real connections" filter if enabled
    if (!chordConfig.particlesOnlyRealConnections || isRealConn) {
      // Choose appropriate particle style based on connection type
      const styleConfig = isRealConn ? 
        {
          color: particleColor,
          size: particleSize,
          sizeVariation: particleSizeVariation,
          opacity: particleOpacity,
          strokeColor: particleStrokeColor,
          strokeWidth: particleStrokeWidth,
          strokeOpacity: chordConfig.particleStrokeOpacity || 1.0
        } : 
        {
          color: chordConfig.minimalConnectionParticleColor,
          size: chordConfig.minimalConnectionParticleSize,
          sizeVariation: chordConfig.minimalConnectionParticleSizeVariation,
          opacity: chordConfig.minimalConnectionParticleOpacity,
          strokeColor: chordConfig.minimalConnectionParticleStrokeColor,
          strokeWidth: chordConfig.minimalConnectionParticleStrokeWidth,
          strokeOpacity: 1.0
        };
      
      addShapesOrParticlesAlongPath(
        d3.select(this),
        ribbonGroup,
        false, // useGeometricShapes 
        true, // particleMode
        shapeType,
        shapeSize,
        shapeSpacing,
        shapeFill,
        shapeStroke,
        particleDensity,
        styleConfig.size,
        styleConfig.sizeVariation,
        particleBlur,
        particleDistribution,
        styleConfig.color,
        styleConfig.opacity,
        styleConfig.strokeColor,
        styleConfig.strokeWidth,
        showDetailedView,
        chordStrokeWidth,
        i,
        isRealConn,
        true, // Apply to this chord
        chordConfig.maxParticlesPerChord,
        chordConfig.maxParticlesDetailedView,
        chordConfig.maxShapesDetailedView,
        true, // Use progressive fade-in for particles
        styleConfig.strokeOpacity
      );
    }
  });
}
// Modified approach for geometric shapes and SVG particles
else {
  const showShapes = chordConfig.showGeometricShapesLayer && chordConfig.useGeometricShapes;
  const showParticles = chordConfig.showParticlesLayer && chordConfig.particleMode && !useWebGLRenderer;
  
  if (showShapes || showParticles) {
    // For each chord path, determine if it should have shapes or particles
    chordPaths.each(function(d, i) {
      // Get connection info
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
      
      const isRealConnection = connectionValue > 0.2;
      
      // Add shapes if enabled and passes the real connection filter
      if (showShapes && (!chordConfig.showOnlyRealConnectionsShapes || isRealConnection)) {
        addShapesOrParticlesAlongPath(
          d3.select(this),
          ribbonGroup,
          true, // useGeometricShapes
          false, // particleMode
          shapeType,
          shapeSize,
          shapeSpacing,
          shapeFill,
          shapeStroke,
          particleDensity, // Not used for shapes but required by function
          particleSize, // Not used for shapes but required by function
          particleSizeVariation, // Not used for shapes but required by function
          particleBlur, // Not used for shapes but required by function
          particleDistribution, // Not used for shapes but required by function
          particleColor, // Not used for shapes but required by function
          particleOpacity, // Not used for shapes but required by function
          particleStrokeColor, // Required by function
          particleStrokeWidth, // Required by function
          showDetailedView,
          chordStrokeWidth,
          i,
          isRealConnection,
          true, // Apply to this chord
          chordConfig.maxParticlesPerChord,
          chordConfig.maxParticlesDetailedView,
          chordConfig.maxShapesDetailedView,
          false, // No progressive fade-in for shapes
          1.0 // Stroke opacity
        );
      }
      
      // Add particles if enabled and passes the real connection filter
      if (showParticles && (!chordConfig.particlesOnlyRealConnections || isRealConnection)) {
        addShapesOrParticlesAlongPath(
          d3.select(this),
          ribbonGroup,
          false, // useGeometricShapes 
          true, // particleMode
          shapeType, // Not used for particles
          shapeSize, // Not used for particles
          shapeSpacing, // Not used for particles
          shapeFill, // Not used for particles
          shapeStroke, // Not used for particles
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
          isRealConnection,
          true, // Apply to this chord
          chordConfig.maxParticlesPerChord,
          chordConfig.maxParticlesDetailedView,
          chordConfig.maxShapesDetailedView,
          true, // Use progressive fade-in for particles
          chordConfig.particleStrokeOpacity || 1.0 // Pass the stroke opacity
        );
      }
    });
  }
}

// Collect all chord paths for WebGL rendering (if enabled)
if (useWebGLRenderer && particleMode) {
  // Collect all chord paths for WebGL rendering
  const pathElements = Array.from(ribbonGroup.selectAll("path").nodes() as SVGPathElement[]);
  setChordPaths(pathElements);
  
  // Sync WebGL transform with SVG
  syncWebGLTransform();
  
  // When using WebGL, we should hide or simplify the SVG paths
  // This makes the base ribbons almost completely transparent
  pathElements.forEach(path => {
    d3.select(path)
      .attr("fill-opacity", 0.02)  // Nearly invisible fill
      .attr("stroke-opacity", 0.05); // Very subtle stroke
  });
  
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
        strokeWidth: particleStrokeWidth,
        strokeOpacity: chordConfig.particleStrokeOpacity || 1.0 // Include stroke opacity
      } : 
      {
        color: chordConfig.minimalConnectionParticleColor,
        size: chordConfig.minimalConnectionParticleSize,
        sizeVariation: chordConfig.minimalConnectionParticleSizeVariation,
        opacity: chordConfig.minimalConnectionParticleOpacity,
        strokeColor: chordConfig.minimalConnectionParticleStrokeColor,
        strokeWidth: chordConfig.minimalConnectionParticleStrokeWidth,
        strokeOpacity: 1.0 // Default stroke opacity for minimal connections
      };
    
    if (shouldAddParticles) {
      console.log(`[PARTICLE-DIAGNOSTICS] Adding particles to chord #${i} with connection value ${connectionValue.toFixed(2)}, isReal: ${isRealConnection}`);
    }
    
    // MODIFY THIS CALL to include the progressiveFadeIn parameter
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
      chordConfig.maxShapesDetailedView,
      false, // Don't use progressive fade-in during initial rendering to maintain performance
      styleConfig.strokeOpacity // Pass the stroke opacity
    );
  });
  
  // Make base ribbons more or less transparent based on mode
  chordPaths
  .attr("fill-opacity", ribbonFillEnabled ? chordConfig.ribbonOpacity : 0)
  .attr("stroke-opacity", chordConfig.chordStrokeOpacity);
  
// Only adjust ribbon opacity if other layers are active with shared space
if ((chordConfig.showParticlesLayer && particleMode) || 
(chordConfig.showGeometricShapesLayer && useGeometricShapes)) {
// Add modest transparency to make other layers more visible, but preserve ribbons
chordPaths
.attr("fill-opacity", ribbonFillEnabled ? Math.min(chordConfig.ribbonOpacity, 0.4) : 0)
.attr("stroke-opacity", Math.min(chordConfig.chordStrokeOpacity, 0.6));
}

// CRUCIAL FIX: Restore particle groups that we set aside
if (particleMode && svgRef.current?.particleGroupsToRestore && svgRef.current.particleGroupsToRestore.length > 0) {
  console.log(`[ANIMATION-FIX] Restoring ${svgRef.current.particleGroupsToRestore.length} particle groups after animation update`);
  
  // Append all preserved particle groups back to the ribbon group
  svgRef.current.particleGroupsToRestore.forEach(group => {
    // Make them visible again
    (group as HTMLElement).style.display = "block";
    // Re-append to put them back in the DOM
    ribbonGroup.node()?.appendChild(group);
  });
  
  // Clear the restore list since we've restored them
  svgRef.current.particleGroupsToRestore = [];
}

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
        
// CRITICAL FIX: Check if we have particle groups to restore
const hasParticlesToRestore = svgRef.current?.particleGroupsToRestore && 
svgRef.current.particleGroupsToRestore.length > 0;

// New approach: Preserve ALL particles during animation by not removing them
const preserveParticles = particleMode && particlesInitialized;

if (preserveParticles) {
console.log(`[ANIMATION-FIX] Using improved particle preservation during animation`);

// Don't remove particles, just hide them temporarily
ribbonGroup.selectAll(".chord-particles").style("display", "none");

// Store current transform for later restoration
const currentTransform = ribbonGroup.attr("transform") || "";

// After rendering is done, we'll restore particles with the proper transform
setTimeout(() => {
ribbonGroup.selectAll(".chord-particles").style("display", "block");

// Fix transform if needed
if (currentTransform) {
ribbonGroup.selectAll(".chord-particles").attr("transform", currentTransform);
}

// Update visibility based on current animated index
ribbonGroup.selectAll(".chord-particles").each(function(_, i) {
const chordIndex = parseInt(d3.select(this).attr("data-chord-index") || "0");
const isVisible = chordIndex < currentAnimatedIndex;
d3.select(this).style("display", isVisible ? "block" : "none");
});
}, 50);
}
        
        if (hasParticlesToRestore) {
          console.log(`[ANIMATION-FIX] Will restore ${svgRef.current.particleGroupsToRestore.length} particle groups after rendering`);
        }
        
        // First, create empty selection to be populated
        ribbonGroup.selectAll("path").remove();
        ribbonGroup.selectAll(".chord-shapes").remove(); // Remove any shape groups
        
        // ONLY remove particles if not in particle mode or if we don't have particles to restore
        if (!particleMode || !hasParticlesToRestore) {
          ribbonGroup.selectAll(".chord-particles").remove();
        } else {
          // Just hide them during animation update
          ribbonGroup.selectAll(".chord-particles").style("display", "none");
        }
        
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
          .attr("stroke-opacity", chordConfig.showChordRibbons ? chordStrokeOpacity : 0) // Hide stroke if ribbons disabled
          .style("opacity", d => {
            // First check if chord ribbons should be visible at all
            if (!chordConfig.showChordRibbons) return 0;
            
            // Check if this is a real connection
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
            
            const isRealConnection = connectionValue > 0.2;
            
            // Apply real connections filter if enabled
            if (chordConfig.showOnlyRealConnectionsRibbons && !isRealConnection) {
              return 0; // Hide if it's not a real connection
            }
            
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
          });
        
  // After creating the ribbon paths, ensure particles are visible for these chords
  if (particleMode && particlesInitialized && !useWebGLRenderer) {
    console.log(`[ANIMATION-PARTICLES] Showing particles for ${animatedChords.length} animated chords`);
    
    // Show particles only for the currently animated chords
    ribbonGroup.selectAll(".chord-particles").style("display", "none");
    
    // Show only particles for current chords
    animatedChords.forEach((chord, i) => {
      ribbonGroup.selectAll(`.chord-particles[data-chord-index="${i}"]`)
        .style("display", "block");
    });
    // If no particles exist yet but mode is enabled, generate them
    if (ribbonGroup.selectAll(".chord-particles").empty() && particleMode) {
      console.log('[ANIMATION-PARTICLES] No particles found, generating new ones');
      
      // Generate particles for all currently visible chords (reuse your existing particle generation code)
      animatedPaths.each(function(d, i) {
        // Get connection info to check if it's a real connection
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
        
        const isRealConnection = connectionValue > 0.2;
        
        // Only add particles if they pass the filtering conditions
        const shouldAddParticles = (!chordConfig.particlesOnlyRealConnections || 
           (chordConfig.particlesOnlyRealConnections && isRealConnection));
        
        if (shouldAddParticles) {
          // Choose appropriate particle style based on connection type
          const styleConfig = isRealConnection ? 
            {
              color: particleColor,
              size: particleSize,
              sizeVariation: particleSizeVariation,
              opacity: particleOpacity,
              strokeColor: particleStrokeColor,
              strokeWidth: particleStrokeWidth,
              strokeOpacity: chordConfig.particleStrokeOpacity || 1.0
            } : 
            {
              color: chordConfig.minimalConnectionParticleColor,
              size: chordConfig.minimalConnectionParticleSize,
              sizeVariation: chordConfig.minimalConnectionParticleSizeVariation,
              opacity: chordConfig.minimalConnectionParticleOpacity,
              strokeColor: chordConfig.minimalConnectionParticleStrokeColor,
              strokeWidth: chordConfig.minimalConnectionParticleStrokeWidth,
              strokeOpacity: 1.0
            };
          
          addShapesOrParticlesAlongPath(
            d3.select(this),
            ribbonGroup,
            false, // useGeometricShapes 
            true,  // particleMode
            shapeType,
            shapeSize,
            shapeSpacing,
            shapeFill,
            shapeStroke,
            particleDensity,
            styleConfig.size,
            styleConfig.sizeVariation,
            particleBlur,
            particleDistribution,
            styleConfig.color,
            styleConfig.opacity,
            styleConfig.strokeColor,
            styleConfig.strokeWidth,
            showDetailedView,
            chordStrokeWidth,
            i,
            isRealConnection,
            true, // Apply to this chord
            chordConfig.maxParticlesPerChord,
            chordConfig.maxParticlesDetailedView,
            chordConfig.maxShapesDetailedView,
            true, // Use progressive fade-in for particles
            styleConfig.strokeOpacity
          );
        }
      });
    }
  }

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
 // If using WebGL, update the paths there too
 if (useWebGLRenderer && webglParticleSystemRef.current) {
  const pathElements = Array.from(ribbonGroup.selectAll("path").nodes() as SVGPathElement[]);
  webglParticleSystemRef.current.setPathsFromSVG(pathElements);
  syncWebGLTransform();
}


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
        
        // WebGL rendering mode (when enabled)
        if (useWebGLRenderer && chordConfig.showParticlesLayer && particleMode) {
          // Collect only the paths that should be rendered based on filters
          const allPathElements = Array.from(ribbonGroup.selectAll("path").nodes() as SVGPathElement[]);
          
          // Filter paths if "only real connections" is enabled
          let filteredPaths = allPathElements;
          if (chordConfig.particlesOnlyRealConnections) {
            filteredPaths = [];
            // Filter based on connection value
            animatedChords.forEach((chord, i) => {
              const sourceIndex = chord.source.index;
              const targetIndex = chord.target.index;
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
              
              const isRealConnection = connectionValue > 0.2;
              
              // Only include this path if it's a real connection
              if (isRealConnection && i < allPathElements.length) {
                filteredPaths.push(allPathElements[i]);
              }
            });
          }
          
          // Set only the filtered paths to the WebGL renderer
          setChordPaths(filteredPaths);
          
          // Sync WebGL transform with SVG
          syncWebGLTransform();
          
          // Make ribbons almost transparent when using WebGL
          if (filteredPaths.length > 0) {
            animatedPaths
              .attr("fill-opacity", 0.03)  // Nearly invisible fill
              .attr("stroke-opacity", 0.07); // Very subtle stroke
          }
        }
        // Geometric shapes rendering
        else if (useGeometricShapes && chordConfig.showGeometricShapesLayer && animatedChords.length > 0) {
          // Clear existing shapes to ensure consistency
          ribbonGroup.selectAll(".chord-shapes").remove();
          
          // Generate shapes for all currently visible chords
          animatedPaths.each(function(d, i) {
            // Get connection info to check if it's a real connection
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
            
            const isRealConnection = connectionValue > 0.2;
            
            // Only add shapes if the filter conditions are met
            const shouldAddShapes = (!chordConfig.showOnlyRealConnectionsShapes || 
               (chordConfig.showOnlyRealConnectionsShapes && isRealConnection));
            
            if (shouldAddShapes) {
              addShapesOrParticlesAlongPath(
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
                particleStrokeColor,
                particleStrokeWidth,
                showDetailedView,
                chordStrokeWidth,
                i,
                isRealConnection,
                true,
                chordConfig.maxParticlesPerChord,
                chordConfig.maxParticlesDetailedView,
                chordConfig.maxShapesDetailedView,
                true // Enable progressive fade-in for smoother appearance
              );
            }
          });
          
          // Apply semi-transparent style for base ribbons with shapes
          animatedPaths
            .attr("fill-opacity", 0.15) // Semi-transparent fill
            .attr("stroke-opacity", 0.3); // Subtle stroke
        }
// SVG particle rendering
else if (particleMode && !useWebGLRenderer && chordConfig.showParticlesLayer && animatedChords.length > 0) {
  // Check if particles already exist and should be preserved
  const existingParticles = ribbonGroup.selectAll(".chord-particles").size();
  const preserveParticles = existingParticles > 0 && particlesInitialized && 
    // Only preserve when animation or visual-only changes happened
    !window.forceParticleRegeneration;
  
  if (preserveParticles) {
    console.log('[PARTICLE-OPTIMIZATION] Preserving existing particles');
    
    // Only update visibility of particles based on current chord visibility
    animatedPaths.each(function(d, i) {
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
      
      const isRealConnection = connectionValue > 0.2;
      
      // Only show particles if they pass the filtering conditions
      const shouldShowParticles = (!chordConfig.particlesOnlyRealConnections || 
         (chordConfig.particlesOnlyRealConnections && isRealConnection));
      
      // Find particles for this chord and update visibility
      ribbonGroup.selectAll(`.chord-particles[data-chord-index="${i}"]`)
        .style("display", shouldShowParticles ? "block" : "none");
    });
  } else {
    // Original code to regenerate particles
    ribbonGroup.selectAll(".chord-particles").remove();
    
    // Generate particles for all currently visible chords
    animatedPaths.each(function(d, i) {
      // Code continues as before...
      
      // After generation, update window flag
      window.forceParticleRegeneration = false;
    });
  }
}
        
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
// Reset animation particle preservation flag
window.preserveParticlesDuringAnimation = false;
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
    handleLayerToggle,
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




const toggleProgressiveGeneration = useCallback((enabled: boolean) => {
  setChordConfig(prev => ({
    ...prev,
    progressiveGenerationEnabled: enabled
  }));
  
  toast({
    title: enabled ? "Progressive Generation Enabled" : "Instant Generation Enabled",
    description: enabled 
      ? "Particles will be generated progressively for better visualization" 
      : "All particles will be generated at once",
  });
}, [toast]);

// Cleanup effect
useEffect(() => {
  return () => {
    if (particleGenerationRef.current) {
      clearTimeout(particleGenerationRef.current);
    }
  };
}, []);


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
    jumpToFrame,
    
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
    setNeedsRedraw,
    particlesInitialized,
    isGeneratingParticles,
    particleMetrics,
    initializeParticles,
    cancelParticleGeneration,
    toggleProgressiveGeneration
  };
};

export default useChordDiagram;