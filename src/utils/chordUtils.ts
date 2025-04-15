/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import * as d3 from 'd3';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { dataURItoBlob } from '@/utils/visualizationUtils';

/**
 * Prepare SVG for export by fixing viewBox and other attributes
 */
export const fixSvgForExport = (
  svgRef: SVGSVGElement | null,
  containerRef: HTMLDivElement | null,
  backgroundColor: string,
  backgroundOpacity: number,
  textColor: string,
  chordStrokeWidth: number,
  chordOpacity: number
): SVGSVGElement | null => {
  if (!svgRef) return null;
  
  // Create a deep clone of the SVG element
  const svgClone = svgRef.cloneNode(true) as SVGSVGElement;
  
  // Get dimensions
  const containerWidth = containerRef?.clientWidth || 800;
  const containerHeight = containerRef?.clientHeight || 600;
  
  // Explicitly set width and height
  svgClone.setAttribute('width', containerWidth.toString());
  svgClone.setAttribute('height', containerHeight.toString());
  
  // This is critical for fixing the viewBox issue
  // Reset any existing viewBox and preserve the entire content
  svgClone.setAttribute('viewBox', `0 0 ${containerWidth} ${containerHeight}`);
  
  // Get current transform from the content group
  const contentGroup = svgRef.querySelector('g');
  let transform = contentGroup?.getAttribute('transform') || '';
  
  // Find the main group in the clone
  const mainGroup = svgClone.querySelector('g');
  if (mainGroup) {
    // If we have a transform from zoom, apply it to ensure export matches current view
    if (transform) {
      mainGroup.setAttribute('transform', transform);
    } else {
      // Otherwise center the diagram for export
      mainGroup.setAttribute('transform', `translate(${containerWidth/2}, ${containerHeight/2})`);
    }
  }
  
  // Add a background rectangle
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('width', containerWidth.toString());
  bgRect.setAttribute('height', containerHeight.toString());
  bgRect.setAttribute('fill', backgroundColor);
  bgRect.setAttribute('opacity', backgroundOpacity.toString());
  bgRect.setAttribute('x', '0');
  bgRect.setAttribute('y', '0');
  
  // Insert background at beginning
  if (svgClone.firstChild) {
    svgClone.insertBefore(bgRect, svgClone.firstChild);
  } else {
    svgClone.appendChild(bgRect);
  }
  
  // Add CSS to ensure elements are visible in export
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `
    path { fill-opacity: ${chordOpacity}; stroke: white; stroke-width: ${chordStrokeWidth}; }
    text { font-family: Arial, sans-serif; fill: ${textColor}; text-anchor: middle; }
  `;
  svgClone.insertBefore(style, svgClone.firstChild);
  
  return svgClone;
};

/**
 * Download the diagram as various formats (SVG, PNG, JPG, PDF)
 */
export const downloadChordDiagram = (
  format: string, 
  svgRef: SVGSVGElement | null,
  containerRef: HTMLDivElement | null,
  backgroundColor: string,
  backgroundOpacity: number,
  textColor: string,
  chordStrokeWidth: number,
  chordOpacity: number,
  onError: (message: string) => void,
  onSuccess: (message: string) => void
) => {
  if (!svgRef || !containerRef) {
    onError("Cannot download visualization - SVG not ready");
    return;
  }
  
  try {
    // Create a custom SVG for export that captures the entire visualization
    const exportSvg = fixSvgForExport(
      svgRef, 
      containerRef, 
      backgroundColor, 
      backgroundOpacity, 
      textColor, 
      chordStrokeWidth, 
      chordOpacity
    );
    
    if (!exportSvg) return;
    
    // Get dimensions
    const width = containerRef.clientWidth;
    const height = containerRef.clientHeight;
    
    // Serialize SVG for export
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(exportSvg);
    
    // Generate filename
    const fileName = `chord-diagram`;
    
    if (format === 'svg') {
      // Download as SVG
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      saveAs(blob, `${fileName}.svg`);
      
      onSuccess("Visualization downloading as SVG");
    } else {
      // For other formats, convert to image
      const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
      const imgSrc = `data:image/svg+xml;base64,${svgBase64}`;
      
      // Create canvas for rendering
      const canvas = document.createElement('canvas');
      // Use a larger scale for better quality
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }
      
      // Fill background
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Load SVG into image
      const img = new Image();
      img.onload = () => {
        // Draw SVG on canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Handle different export formats
        if (format === 'png') {
          const dataUrl = canvas.toDataURL('image/png');
          saveAs(dataURItoBlob(dataUrl), `${fileName}.png`);
        } else if (format === 'jpg' || format === 'jpeg') {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          saveAs(dataURItoBlob(dataUrl), `${fileName}.jpg`);
        } else if (format === 'pdf') {
          try {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
              orientation: width > height ? 'landscape' : 'portrait',
              unit: 'px',
              format: [width, height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, width, height);
            pdf.save(`${fileName}.pdf`);
          } catch (pdfError) {
            console.error("PDF creation error:", pdfError);
            onError("Could not create PDF file");
            return;
          }
        }
        
        onSuccess(`Visualization downloading as ${format.toUpperCase()}`);
      };
      
      img.onerror = (error) => {
        console.error("Error loading SVG for export:", error);
        onError("Could not render visualization for download");
      };
      
      img.src = imgSrc;
    }
  } catch (error) {
    console.error("Error exporting visualization:", error);
    onError(`Failed to export: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Create the variable width ribbon generator for chord diagrams
 */
export const createCustomRibbon = (
  innerRadius: number,
  chordWidthVariation: number,
  chordWidthPosition: 'start' | 'middle' | 'end' | 'custom',
  chordWidthCustomPosition: number,
  strokeWidthVariation: number,
  strokeWidthPosition: 'start' | 'middle' | 'end' | 'custom',
  strokeWidthCustomPosition: number,
  chordStrokeWidth: number,
  useFadeTransition: boolean,
  currentAnimatedIndex: number,
  totalRibbonCount: number,
  useGeometricShapes: boolean
) => {
  // Get base radius
  const baseRadius = innerRadius - 1; // Slightly smaller to prevent overlap
  
  // Function to calculate variable width based on our settings
  const getVariableRadius = (t: number) => {
    if (chordWidthVariation <= 1.0) return baseRadius; // No variation
    
    let widthPoint: number;
    
    // Determine the position where the width should be maximum
    switch (chordWidthPosition) {
      case 'start':
        widthPoint = 0.1;
        break;
      case 'middle':
        widthPoint = 0.5;
        break;
      case 'end':
        widthPoint = 0.9;
        break;
      case 'custom':
        widthPoint = chordWidthCustomPosition;
        break;
    }
    
    // Calculate a bell curve that peaks at the width point
    // Value between 0 and 1, with peak of 1 at widthPoint
    const bellCurve = Math.exp(-16 * Math.pow(t - widthPoint, 2));
    
    // Calculate radius with variation
    const variationFactor = 1 + ((chordWidthVariation - 1) * bellCurve);
    return baseRadius * variationFactor;
  };

  // Get variable stroke width
  const getVariableStrokeWidth = (t: number) => {
    if (strokeWidthVariation <= 1.0) return chordStrokeWidth; // No variation
    
    let widthPoint: number;
    
    // Determine the position where the stroke width should be maximum
    switch (strokeWidthPosition) {
      case 'start':
        widthPoint = 0.1;
        break;
      case 'middle':
        widthPoint = 0.5;
        break;
      case 'end':
        widthPoint = 0.9;
        break;
      case 'custom':
        widthPoint = strokeWidthCustomPosition;
        break;
    }
    
    // Calculate a bell curve that peaks at the width point
    const bellCurve = Math.exp(-16 * Math.pow(t - widthPoint, 2));
    
    // Calculate stroke width with variation
    const variationFactor = 1 + ((strokeWidthVariation - 1) * bellCurve);
    return chordStrokeWidth * variationFactor;
  };

  // Custom ribbon generator function
  return (d: any, isAnimation = false) => {
    // Standard d3 ribbon generator
    const standardRibbon = d3.ribbon()
    .radius(baseRadius);
    
    // If animation with fade is enabled, we need custom path generation
    if (isAnimation && useFadeTransition) {
      // Create a custom path for source-to-target animation
      const source = d.source;
      const target = d.target;
      
      // Calculate progress based on current animation index
      const progress = Math.min(1, currentAnimatedIndex / totalRibbonCount);
      
      // Generate standard path
      let path = '';
      try {
        const result = standardRibbon(d);
        if (result !== undefined && typeof result === 'string') path = result;
      } catch (e) {
        // Fallback for error
      }
      
      // For animation, just return the standard path
      return path;
    }
    
    // If we're using geometric shapes instead of ribbons
    if (useGeometricShapes) {
      // Get the standard path from d3
      let standardPath = '';
      try {
        const result = standardRibbon(d);
        if (result !== undefined && typeof result === 'string') standardPath = result;
      } catch (e) {
        console.error("Error generating standard path:", e);
      }
      
      // Return standard path for non-animated rendering
      // Shapes will be added after paths are created
      return standardPath;
    }
    
    // If we're not using variable width, return standard ribbon
    if (chordWidthVariation <= 1.0) {
      try {
        const result = standardRibbon(d);
        return (result !== undefined && typeof result === 'string') ? result : '';
      } catch (e) {
        console.error("Error generating standard ribbon:", e);
        return '';
      }
    }
    
    // For variable width ribbon, we need to craft a custom path
    // This simplified implementation just adjusts the radius parameter
    const variableRibbon = d3.ribbon()
      .radius(baseRadius * chordWidthVariation);
    
    try {
      const result = variableRibbon(d);
      return (result !== undefined && typeof result === 'string') ? result : '';
    } catch (e) {
      console.error("Error generating variable ribbon:", e);
      return '';
    }
  };
};

/**
 * Add geometric shapes or particles along a chord path
 */
export const addShapesOrParticlesAlongPath = (
  selection: d3.Selection<SVGPathElement | d3.BaseType, any, any, unknown>,
  ribbonGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  useGeometricShapes: boolean,
  particleMode: boolean,
  shapeType: 'circle' | 'square' | 'diamond',
  shapeSize: number,
  shapeSpacing: number,
  shapeFill: string,
  shapeStroke: string,
  particleDensity: number,
  particleSize: number,
  particleSizeVariation: number,
  particleBlur: number,
  particleDistribution: 'uniform' | 'random' | 'gaussian',
  particleColor: string,
  particleOpacity: number,
  particleStrokeColor: string,
  particleStrokeWidth: number,
  showDetailedView: boolean,
  chordStrokeWidth: number,
  index: number,
  isRealConnection: boolean = true,  // Add this parameter with default value
  applyToThisChord: boolean = true,
  maxParticlesPerChord: number,
  maxParticlesDetailedView: number,
  maxShapesDetailedView: number
) => {
  // Add this diagnostic counter
  let totalParticlesCreated = 0;
  
  selection.each(function(d) {
    const pathElement = d3.select(this).node();
    // Safe type check for SVGPathElement
    if (!pathElement || !(pathElement instanceof SVGPathElement)) return;
    
    const path = pathElement as SVGPathElement;
    
    // Get the total length of the path
    const totalLength = path.getTotalLength();
    
    // Calculate density based on mode with special handling for detailed view
    let numShapes;
    let baseDensity = 0; // Initialize baseDensity
    
    if (particleMode && applyToThisChord) {
      // Calculate base number of particles 
      baseDensity = particleDensity * (totalLength / 300);
      
      // Apply scaling factor when in detailed view to prevent too many particles
      if (showDetailedView) {
        // Log raw calculated density
        console.log(`[PARTICLE-DIAGNOSTICS] Raw calculated density before scaling: ${baseDensity.toFixed(1)}`);
        
        // Reduce particle count based on total connections
        const connectionScale = Math.max(0.1, 1.0);
        // Apply more aggressive scaling for higher densities
        const densityScale = particleDensity > 200 ? 0.3 : (particleDensity > 100 ? 0.5 : 0.7);
        // Use the configurable maximum instead of hardcoded value
        baseDensity = Math.min(baseDensity * connectionScale * densityScale, maxParticlesDetailedView);
        
        // Log after scaling is applied
        console.log(`[PARTICLE-DIAGNOSTICS] After scaling in detailed view: ${baseDensity.toFixed(1)}`);
      } else {
        // For normal view, apply the normal maximum
        baseDensity = Math.min(baseDensity, maxParticlesPerChord);
      }
      
      // Ensure at least some particles
      numShapes = Math.max(5, Math.round(baseDensity));
      
      // Log number of particles for this chord
      console.log(`[PARTICLE-DIAGNOSTICS] Chord #${index} will have ${numShapes} particles, path length: ${totalLength.toFixed(1)}`);
      totalParticlesCreated += numShapes;
    } else {
      // For shape mode, use spacing as before
      numShapes = Math.floor(totalLength / shapeSpacing);
      
      // Apply a cap in detailed view to prevent too many shapes
      if (showDetailedView) {
        numShapes = Math.min(numShapes, maxShapesDetailedView);
      }
    }
    
    // Clean up existing elements based on mode
    if (particleMode) {
      // Only remove shapes when in particle mode
      d3.selectAll(`.chord-shapes[data-chord-index="${index}"]`).remove();
    } else if (useGeometricShapes && applyToThisChord) {
      // Only remove particles when in shape mode
      d3.selectAll(`.chord-particles[data-chord-index="${index}"]`).remove();
    }
    
    // Create shapes group
    const shapesGroup = ribbonGroup.append("g")
      .attr("class", particleMode ? "chord-particles" : "chord-shapes")
      .attr("data-chord-index", index);
    
    // Create shapes/particles along the path
    for (let j = 0; j < numShapes; j++) {
      // Calculate position along path
      let position;
      if (particleMode) {
        switch (particleDistribution) {
          case 'uniform':
            position = (j / (numShapes - 1)) * totalLength;
            break;
          case 'gaussian':
            // Gaussian distribution centered at middle of path
            const u = Math.random();
            const v = Math.random();
            const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
            // Standard deviation of 0.25 of the total length
            position = (0.5 + z * 0.25) * totalLength;
            // Clamp to path length
            position = Math.max(0, Math.min(totalLength, position));
            break;
          case 'random':
          default:
            position = Math.random() * totalLength;
            break;
        }
      } else {
        position = (j / (numShapes - 1)) * totalLength;
      }
      
      const point = path.getPointAtLength(position);
      
      // For particle mode
      if (particleMode) {
        // Calculate size with variation
        const baseSize = particleSize;
        const sizeVar = particleSizeVariation * baseSize;
        const finalSize = baseSize - sizeVar + (Math.random() * sizeVar * 2);
        
        // Calculate opacity with slight randomization for natural appearance
        const randomOpacityFactor = 0.5 + Math.random() * 0.5;
        const finalOpacity = particleOpacity * randomOpacityFactor;
        
        // Create particle with enhanced styling and initial fade-in
        const particle = shapesGroup.append("circle")
          .attr("cx", point.x)
          .attr("cy", point.y)
          .attr("r", finalSize)
          .attr("fill", particleColor)
          .attr("stroke", particleStrokeColor)
          .attr("stroke-width", particleStrokeWidth)
          .attr("data-is-real", isRealConnection ? "true" : "false") // Use the parameter
          .attr("data-particle-color", particleColor) // Store original color
          .attr("data-original-x", point.x) // For animation
          .attr("data-original-y", point.y)
          .style("opacity", 0); // Start invisible for fade-in
        
        // Add blur if enabled
        if (particleBlur > 0) {
          particle.style("filter", `blur(${particleBlur}px)`);
        }
        
        // Add fade-in transition with staggered delay
        particle.transition()
          .delay(j * 2) // Stagger based on index
          .duration(300)
          .style("opacity", finalOpacity);
      } else {
        // For geometric shapes mode
        switch (shapeType) {
          case 'circle': {
            shapesGroup.append("circle")
              .attr("cx", point.x)
              .attr("cy", point.y)
              .attr("r", shapeSize)
              .attr("fill", shapeFill)
              .attr("stroke", shapeStroke)
              .attr("stroke-width", chordStrokeWidth);
            break;
          }
          case 'square': {
            shapesGroup.append("rect")
              .attr("x", point.x - shapeSize)
              .attr("y", point.y - shapeSize)
              .attr("width", shapeSize * 2)
              .attr("height", shapeSize * 2)
              .attr("fill", shapeFill)
              .attr("stroke", shapeStroke)
              .attr("stroke-width", chordStrokeWidth);
            break;
          }
          case 'diamond': {
            // Create a diamond shape using a small polygon
            const diamond = [
              [point.x, point.y - shapeSize],
              [point.x + shapeSize, point.y],
              [point.x, point.y + shapeSize],
              [point.x - shapeSize, point.y]
            ];
            shapesGroup.append("polygon")
              .attr("points", diamond.map(p => p.join(",")).join(" "))
              .attr("fill", shapeFill)
              .attr("stroke", shapeStroke)
              .attr("stroke-width", chordStrokeWidth);
            break;
          }
        }
      }
    }
    
    // After creating all particles for this selection, log the total count
    if (particleMode) {
      console.log(`[PARTICLE-DIAGNOSTICS] Total particles created for this chord: ${totalParticlesCreated}`);
    }
  });
};

/**
 * Prepare matrix data for visualization
 */
export const prepareChordMatrix = (
  categoryMatrix: number[][],
  detailedMatrix: number[][],
  showDetailedView: boolean,
  evenDistribution: boolean,
  uniqueCategories: string[],
  showAllNodes: boolean
): number[][] => {
  if (!categoryMatrix.length) return [];
  
  let matrixToUse: number[][] = [];
  
  if (showDetailedView) {
    // For detailed view, directly use the detailed matrix with some enhancements
    matrixToUse = detailedMatrix.map(row => 
      row.map(value => value === 0 ? 0.1 : value) // Add minimal values to ensure all connections
    );
  } else {
    // Start with the category matrix including our minimal connection values
    matrixToUse = [...categoryMatrix.map(row => [...row])]; // Deep copy
  }
  
  // Apply even distribution if selected
  if (evenDistribution && !showDetailedView) {
    // For category view with even distribution
    matrixToUse = matrixToUse.map(row => {
      const rowSum = row.reduce((a, b) => a + b, 0);
      if (rowSum <= 0.2 * (uniqueCategories.length - 1)) {
        // If just minimal connections, enhance them slightly for visibility
        return row.map(val => val === 0 ? 0 : (val <= 0.2 ? 0.3 : val));
      }
      
      // Calculate a base value for distribution
      return row.map((val, idx) => {
        // Keep diagonal at 0
        if (row === matrixToUse[idx]) return 0;
        // Scale other values - ensure minimal values stay visible
        return val <= 0.2 ? 0.3 : Math.max(1, val / rowSum * 10);
      });
    });
  }
  
  // Handle connections for all nodes display
  if (!showDetailedView) {
    for (let i = 0; i < uniqueCategories.length; i++) {
      for (let j = 0; j < uniqueCategories.length; j++) {
        if (i !== j) {
          if (showAllNodes) {
            // Ensure both directions have some value when either has a value
            const maxVal = Math.max(matrixToUse[i][j], matrixToUse[j][i]);
            if (maxVal > 0) {
              if (matrixToUse[i][j] === 0) matrixToUse[i][j] = 0.1;
              if (matrixToUse[j][i] === 0) matrixToUse[j][i] = 0.1;
            }
          } else {
            // For connected-only view, zero out minimal connections
            if (matrixToUse[i][j] <= 0.2) matrixToUse[i][j] = 0;
            if (matrixToUse[j][i] <= 0.2) matrixToUse[j][i] = 0;
          }
        }
      }
    }
  }
  
  return matrixToUse;
};

// Helper functions for HEX to HSL conversion
export const hexToHSL = (hex: string) => {
  // Convert hex to RGB first
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  
  // Convert RGB to HSL
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
   
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

export const hslToHex = (h: number, s: number, l: number) => {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Setup and manage particle movement animation
 * This function starts an animation loop that adds subtle movement to particles
 * Optimized for smoother performance
 */
export const setupParticleMovement = (
  svgRef: SVGSVGElement | null, 
  amplitude: number = 1.0,
  enabled: boolean = true
): (() => void) => {
  if (!svgRef || !enabled) return () => {};
  
  // Add performance timing diagnostic
  const setupStartTime = performance.now();
  
  // Store original positions for each particle
  const particleElements = Array.from(svgRef.querySelectorAll('.chord-particles circle'));
  const particleOriginalPositions = new Map<Element, { x: number, y: number }>();
  
  // Diagnostic log for total particle count
  console.log(`[MOVEMENT-DIAGNOSTICS] Total particle elements found: ${particleElements.length}`);
  
  // Record initial positions from data attributes or current coordinates
  particleElements.forEach(particle => {
    const originalX = particle.getAttribute('data-original-x');
    const originalY = particle.getAttribute('data-original-y');
    
    let x, y;
    
    if (originalX && originalY) {
      x = parseFloat(originalX);
      y = parseFloat(originalY);
    } else {
      x = parseFloat(particle.getAttribute('cx') || '0');
      y = parseFloat(particle.getAttribute('cy') || '0');
      
      // Store original positions as data attributes if not already present
      particle.setAttribute('data-original-x', x.toString());
      particle.setAttribute('data-original-y', y.toString());
    }
    
    particleOriginalPositions.set(particle, { x, y });
  });
  
  // Animation variables
  let animationFrameId: number | null = null;
  let startTime = performance.now();
  let lastFrameTime = startTime;
  let frameCount = 0;
  let lastPerformanceLog = startTime;
  
  // Animation function - optimized for smoother animation
  const animateParticles = (timestamp: number) => {
    // Calculate elapsed time in seconds
    const elapsed = (timestamp - startTime) / 1000;
    
    // Calculate time since last frame
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    frameCount++;
    
    // Log performance metrics every second
    if (timestamp - lastPerformanceLog > 1000) {
      const fps = Math.round(frameCount * 1000 / (timestamp - lastPerformanceLog));
      const msPerFrame = ((timestamp - lastPerformanceLog) / frameCount).toFixed(2);
      console.log(`[MOVEMENT-DIAGNOSTICS] Performance: ${fps} FPS (${msPerFrame}ms/frame), Particles: ${particleElements.length}`);
      
      frameCount = 0;
      lastPerformanceLog = timestamp;
    }
    
    // Skip frame if too much time passed (e.g. tab was inactive)
    if (deltaTime > 100) {
      console.log(`[MOVEMENT-DIAGNOSTICS] Frame skip: ${deltaTime.toFixed(1)}ms since last frame`);
      animationFrameId = requestAnimationFrame(animateParticles);
      return;
    }
    
    // Batch DOM operations to reduce reflow/repaint
    // Process particles in chunks for better performance with large numbers
    const CHUNK_SIZE = 100;
    const totalParticles = particleElements.length;
    
    // Start frame timing
    const frameStartTime = performance.now();
    
    for (let i = 0; i < totalParticles; i += CHUNK_SIZE) {
      const end = Math.min(i + CHUNK_SIZE, totalParticles);
      
      for (let j = i; j < end; j++) {
        const particle = particleElements[j];
        const originalPos = particleOriginalPositions.get(particle);
        if (!originalPos) continue;
        
        // Use particle index for deterministic but varied motion
        // This creates more stable patterns and better performance
        const particleIndex = j;
        
        // Create phase shift based on index for varied movement
        const phaseShift = (particleIndex % 100) / 20;
        
        // Use lower frequency values for smoother motion (0.3-0.7 Hz)
        const frequency = 0.3 + (particleIndex % 8) / 20;
        
        // Apply smooth oscillating motion with reduced complexity
        const dx = Math.sin(elapsed * frequency + phaseShift) * amplitude;
        const dy = Math.cos(elapsed * frequency * 0.7 + phaseShift) * amplitude * 0.8;
        
        // Apply movement with a bias toward horizontal motion
        particle.setAttribute('cx', (originalPos.x + dx).toString());
        particle.setAttribute('cy', (originalPos.y + dy).toString());
      }
    }
    
    // Log long frames (potential jank)
    const frameTime = performance.now() - frameStartTime;
    if (frameTime > 16) { // 16ms = target for 60fps
      console.log(`[MOVEMENT-DIAGNOSTICS] Long frame: ${frameTime.toFixed(1)}ms to process ${totalParticles} particles`);
    }
    
    // Continue animation loop with proper timing
    animationFrameId = requestAnimationFrame(animateParticles);
  };
  
  // Start animation if enabled and particles exist
  if (enabled && particleElements.length > 0) {
    console.log(`[MOVEMENT-DIAGNOSTICS] Setup time: ${(performance.now() - setupStartTime).toFixed(1)}ms`);
    console.log(`[MOVEMENT-DIAGNOSTICS] Starting animation for ${particleElements.length} particles with amplitude ${amplitude}`);
    // Use requestAnimationFrame for proper timing
    animationFrameId = requestAnimationFrame(animateParticles);
  }
  
  // Return cleanup function
  return () => {
    if (animationFrameId !== null) {
      console.log(`[MOVEMENT-DIAGNOSTICS] Cleaning up particle animation`);
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    
    // Reset particles to original positions
    particleElements.forEach(particle => {
      const originalPos = particleOriginalPositions.get(particle);
      if (originalPos) {
        particle.setAttribute('cx', originalPos.x.toString());
        particle.setAttribute('cy', originalPos.y.toString());
      }
    });
  };
};