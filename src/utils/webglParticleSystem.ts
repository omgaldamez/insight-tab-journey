/* eslint-disable no-case-declarations */
/* eslint-disable prefer-const */
import * as THREE from 'three';
import { WebGLRenderer, Scene, OrthographicCamera, Vector3, Color, TextureLoader, 
  BufferGeometry, Float32BufferAttribute, ShaderMaterial, Points, AdditiveBlending } from 'three';

interface WebGLParticleSystemOptions {
  container: HTMLDivElement;
  particleColor: string;
  particleSize: number;
  particleSizeVariation: number;
  particleOpacity: number;
  particleCount: number;
  particleBlur: number;
  particleDistribution: 'uniform' | 'random' | 'gaussian';
  particleMovement: boolean;
  particleMovementAmount: number;
  particleStrokeColor: string;
  particleStrokeWidth: number;
  particleQuality: 'low' | 'medium' | 'high';
}

// Path data for positioning particles
interface PathData {
  path: SVGPathElement;
  points: Vector3[];
  length: number;
}

/**
 * WebGL-based particle system for chord diagram visualization
 * Renders particles on a WebGL canvas overlay that sits on top of the SVG visualization
 */
export class WebGLParticleSystem {
  private renderer: WebGLRenderer;
  private scene: Scene;
  private camera: OrthographicCamera;
  private particleSystem: Points | null = null;
  private particleMaterial: ShaderMaterial | null = null;
  private particleGeometry: BufferGeometry | null = null;
  private animationFrameId: number | null = null;
  private pathData: PathData[] = [];
  private options: WebGLParticleSystemOptions;
  private initialized = false;
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement | null = null;
  private timeStart = 0;
  private resizeObserver: ResizeObserver | null = null;
  private particlePositions: Float32Array | null = null;
  private particleSizes: Float32Array | null = null;
  private particleColors: Float32Array | null = null;
  private particleOpacities: Float32Array | null = null;
  private originalPositions: Float32Array | null = null;
  
  // Quality settings map
  private qualitySettings = {
    low: { densityMultiplier: 0.5, maxParticles: 5000 },
    medium: { densityMultiplier: 1.0, maxParticles: 20000 },
    high: { densityMultiplier: 2.0, maxParticles: 50000 }
  };

  constructor(options: WebGLParticleSystemOptions) {
    this.options = options;
    this.container = options.container;
    
    // Create renderer
    this.renderer = new WebGLRenderer({ 
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    
    // Create scene and camera
    this.scene = new Scene();
    this.camera = new OrthographicCamera(
      -1, 1, 1, -1, 0.1, 1000
    );
    
    this.timeStart = performance.now();
    
    // We'll initialize the system later when needed
    this.initialized = false;
  }

  /**
   * Initialize the WebGL renderer and add it to the DOM
   */
  public init(): void {
    if (this.initialized) return;
    
    console.log('[WEBGL-PARTICLES] Initializing WebGL particle system');
    
    // Set up canvas
    this.canvas = this.renderer.domElement;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '5'; // Above SVG but below controls
    
    // Initialize renderer
    this.container.appendChild(this.canvas);
    this.resize();
    
    // Set up resize observer
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    
    // Set up camera - IMPORTANT: Set initial camera position to match SVG center
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.position.z = 10;
    this.camera.updateProjectionMatrix();
    
    // Create empty particle system
    this.createParticleSystem();
    
    this.initialized = true;
    console.log('[WEBGL-PARTICLES] WebGL system initialized');
  }

  /**
   * Resize the renderer when container size changes
   */
  public resize(): void {
    if (!this.canvas) return;
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    // Update renderer size
    this.renderer.setSize(width, height);
    
    // Update camera frustum
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
    
    console.log(`[WEBGL-PARTICLES] Resize: ${width}x${height}`);
    
    // Render an update
    if (this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Create the particle system with custom shader
   */
  private createParticleSystem(): void {
    // Clean up existing system if any
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      if (this.particleGeometry) this.particleGeometry.dispose();
      if (this.particleMaterial) this.particleMaterial.dispose();
    }
    
    // Vertex shader with custom attributes for size, color, and opacity
    const vertexShader = `
      attribute float size;
      attribute vec3 customColor;
      attribute float opacity;
      varying vec3 vColor;
      varying float vOpacity;
      
      void main() {
        vColor = customColor;
        vOpacity = opacity;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
    
    // Fragment shader with soft circular particles
    const fragmentShader = `
      uniform vec3 color;
      uniform float strokeWidth;
      uniform vec3 strokeColor;
      varying vec3 vColor;
      varying float vOpacity;
      
      void main() {
        // Calculate distance from center
        float distance = length(gl_PointCoord - vec2(0.5, 0.5));
        
        // Discard fragments outside the circle
        if (distance > 0.5) {
          discard;
        }
        
        // Determine if we're in the stroke region
        float strokeThreshold = 0.5 - strokeWidth;
        bool isStroke = distance > strokeThreshold;
        
        // Set color based on whether we're in the stroke region
        vec3 finalColor = isStroke ? strokeColor : vColor;
        
        // Apply soft edge
        float softness = 0.05;
        float alpha = smoothstep(0.5, 0.5 - softness, distance);
        
        gl_FragColor = vec4(finalColor, vOpacity * alpha);
      }
    `;
    
    // Create shader material
    this.particleMaterial = new ShaderMaterial({
      uniforms: {
        color: { value: new Color(this.options.particleColor) },
        strokeColor: { value: new Color(this.options.particleStrokeColor) },
        strokeWidth: { value: this.options.particleStrokeWidth / 10 } // Scale down for shader
      },
      vertexShader,
      fragmentShader,
      blending: AdditiveBlending,
      depthTest: false,
      transparent: true
    });
    
    // Create empty geometry (we'll populate it later)
    this.particleGeometry = new BufferGeometry();
    
    // Create the particle system and add to scene
    this.particleSystem = new Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particleSystem);
    
    console.log('[WEBGL-PARTICLES] Particle system created');
  }

  /**
   * Extract points from SVG paths for particle positioning
   */
  public setPathsFromSVG(svgPaths: SVGPathElement[]): void {
    if (!this.initialized) this.init();
    
    console.log(`[WEBGL-PARTICLES] Processing ${svgPaths.length} SVG paths`);
    
    // Reset existing path data
    this.pathData = [];
    
    // IMPORTANT DEBUGGING - Log source paths
    if (svgPaths.length > 0) {
      console.log('[WEBGL-PARTICLES-DEBUG] First path length:', svgPaths[0].getTotalLength());
      const bbox = svgPaths[0].getBBox();
      console.log('[WEBGL-PARTICLES-DEBUG] First path bounding box:', bbox);
    }
    
    // Get SVG transform - we need this to correctly position particles
    const svgContentElement = svgPaths.length > 0 ? svgPaths[0].closest('g') : null;
    const svgTransform = svgContentElement ? svgContentElement.getAttribute('transform') || '' : '';
    console.log(`[WEBGL-PARTICLES-DEBUG] SVG transform: ${svgTransform}`);
    
    // Parse transform values
    let translateX = 0;
    let translateY = 0;
    let scale = 1;
    
    // Extract translate values
    const translateMatch = svgTransform.match(/translate\(([^,]+),([^)]+)\)/);
    if (translateMatch && translateMatch.length > 2) {
      translateX = parseFloat(translateMatch[1]);
      translateY = parseFloat(translateMatch[2]);
    }
    
    // Extract scale value
    const scaleMatch = svgTransform.match(/scale\(([^)]+)\)/);
    if (scaleMatch && scaleMatch.length > 1) {
      scale = parseFloat(scaleMatch[1]);
    }
    
    // Get container dimensions for proper centering
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;
    
    console.log(`[WEBGL-PARTICLES-DEBUG] Container dimensions: ${containerWidth}x${containerHeight}`);
    console.log(`[WEBGL-PARTICLES-DEBUG] Translation: (${translateX}, ${translateY}), Scale: ${scale}`);
    
    // Process each SVG path
    svgPaths.forEach((path, idx) => {
      const points: Vector3[] = [];
      const pathLength = path.getTotalLength();
      
      // Sample points along the path
      // More points for longer paths, fewer for shorter paths
      const numSamples = Math.max(10, Math.ceil(pathLength / 5));
      
      for (let i = 0; i < numSamples; i++) {
        const t = i / (numSamples - 1);
        const pointOnPath = path.getPointAtLength(t * pathLength);
        
        // IMPORTANT: Get point coordinates BEFORE any transformation
        const svgX = pointOnPath.x;
        const svgY = pointOnPath.y;
        
        // Apply the SVG transform to the point coordinates
        // The chord diagram is likely already centered, so we need to adjust
        // to work in the WebGL coordinate system properly
        
        // WebGL coordinates have (0,0) at center, Y+ is up
        // SVG coordinates have (0,0) at top-left, Y+ is down
        const x = (svgX - containerWidth/2) * scale;
        const y = (containerHeight/2 - svgY) * scale;
        
        if (idx === 0 && i === 0) {
          console.log(`[WEBGL-PARTICLES-DEBUG] First point: SVG(${svgX}, ${svgY}) -> WebGL(${x}, ${y})`);
        }
        
        points.push(new Vector3(x, y, 0));
      }
      
      this.pathData.push({
        path,
        points,
        length: pathLength
      });
    });
    
    // Create particles along paths
    this.createParticlesAlongPaths();
    
    console.log(`[WEBGL-PARTICLES-DEBUG] Generated path data for ${this.pathData.length} paths`);
  }

  /**
   * Create particles positioned along the extracted path points
   */
  private createParticlesAlongPaths(): void {
    if (!this.initialized || !this.particleGeometry) return;
    
    // Get quality settings
    const { densityMultiplier, maxParticles } = this.qualitySettings[this.options.particleQuality];
    
    // Calculate total particles based on density and path lengths
    const totalPathLength = this.pathData.reduce((sum, path) => sum + path.length, 0);
    let desiredParticleCount = Math.round(this.options.particleCount * densityMultiplier);
    
    // Cap particle count to avoid performance issues
    const actualParticleCount = Math.min(desiredParticleCount, maxParticles);
    
    // Diagnostic
    console.log(`[WEBGL-PARTICLES] Creating ${actualParticleCount} particles (desired: ${desiredParticleCount}, max: ${maxParticles})`);
    
    // Create arrays for particle attributes
    this.particlePositions = new Float32Array(actualParticleCount * 3);
    this.originalPositions = new Float32Array(actualParticleCount * 3);
    this.particleSizes = new Float32Array(actualParticleCount);
    this.particleColors = new Float32Array(actualParticleCount * 3);
    this.particleOpacities = new Float32Array(actualParticleCount);
    
    // Parse the particle color
    const color = new Color(this.options.particleColor);
    
    // Distribute particles across all paths based on path length
    let particleIndex = 0;
    
    for (let pathIndex = 0; pathIndex < this.pathData.length; pathIndex++) {
      const path = this.pathData[pathIndex];
      
      // Determine particle count for this path based on its length relative to total
      const pathParticleCount = Math.floor(
        (path.length / totalPathLength) * actualParticleCount
      );
      
      // Add particles along this path
      for (let i = 0; i < pathParticleCount && particleIndex < actualParticleCount; i++) {
        // Get position based on distribution type
        let pointIndex: number;
        
        switch (this.options.particleDistribution) {
          case 'uniform':
            // Evenly spaced particles
            pointIndex = Math.floor((i / pathParticleCount) * (path.points.length - 1));
            break;
            
          case 'gaussian':
            // Gaussian distribution - more particles in the middle
            const u = Math.random();
            const v = Math.random();
            const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
            // Scale to (-1, 1) range, then to (0, 1) range
            const normalizedZ = (z * 0.25) + 0.5;
            // Clamp to (0, 1) range
            const clampedZ = Math.max(0, Math.min(1, normalizedZ));
            pointIndex = Math.floor(clampedZ * (path.points.length - 1));
            break;
            
          case 'random':
          default:
            // Random distribution
            pointIndex = Math.floor(Math.random() * path.points.length);
            break;
        }
        
        // Get point at the calculated index
        const point = path.points[pointIndex];
        
        // Add some random offset to prevent perfect alignment
        const offsetX = (Math.random() - 0.5) * 2;
        const offsetY = (Math.random() - 0.5) * 2;
        
        // Position: x, y, z
        const posIndex = particleIndex * 3;
        this.particlePositions[posIndex] = point.x + offsetX;
        this.particlePositions[posIndex + 1] = point.y + offsetY;
        this.particlePositions[posIndex + 2] = 0;
        
        // Store original position for animation
        this.originalPositions[posIndex] = this.particlePositions[posIndex];
        this.originalPositions[posIndex + 1] = this.particlePositions[posIndex + 1];
        this.originalPositions[posIndex + 2] = this.particlePositions[posIndex + 2];
        
        // Size with variation
        const sizeVariation = 1.0 - (this.options.particleSizeVariation * Math.random());
        this.particleSizes[particleIndex] = this.options.particleSize * sizeVariation;
        
        // Color - use the configured color
        const colorIndex = particleIndex * 3;
        this.particleColors[colorIndex] = color.r;
        this.particleColors[colorIndex + 1] = color.g;
        this.particleColors[colorIndex + 2] = color.b;
        
        // Opacity with some randomization for natural appearance
        this.particleOpacities[particleIndex] = this.options.particleOpacity * 
          (0.5 + Math.random() * 0.5);
        
        particleIndex++;
      }
    }
    
    // If we haven't used all particles, fill the remaining ones randomly
    while (particleIndex < actualParticleCount) {
      // Get a random path and point
      const randomPathIndex = Math.floor(Math.random() * this.pathData.length);
      const randomPath = this.pathData[randomPathIndex];
      const randomPointIndex = Math.floor(Math.random() * randomPath.points.length);
      const point = randomPath.points[randomPointIndex];
      
      // Add some random offset
      const offsetX = (Math.random() - 0.5) * 5;
      const offsetY = (Math.random() - 0.5) * 5;
      
      // Position
      const posIndex = particleIndex * 3;
      this.particlePositions[posIndex] = point.x + offsetX;
      this.particlePositions[posIndex + 1] = point.y + offsetY;
      this.particlePositions[posIndex + 2] = 0;
      
      // Store original position
      this.originalPositions[posIndex] = this.particlePositions[posIndex];
      this.originalPositions[posIndex + 1] = this.particlePositions[posIndex + 1];
      this.originalPositions[posIndex + 2] = this.particlePositions[posIndex + 2];
      
      // Size with variation
      const sizeVariation = 1.0 - (this.options.particleSizeVariation * Math.random());
      this.particleSizes[particleIndex] = this.options.particleSize * sizeVariation;
      
      // Color
      const colorIndex = particleIndex * 3;
      this.particleColors[colorIndex] = color.r;
      this.particleColors[colorIndex + 1] = color.g;
      this.particleColors[colorIndex + 2] = color.b;
      
      // Opacity
      this.particleOpacities[particleIndex] = this.options.particleOpacity * 
        (0.5 + Math.random() * 0.5);
      
      particleIndex++;
    }
    
    // Apply attributes to the geometry
    this.particleGeometry.setAttribute('position', new Float32BufferAttribute(this.particlePositions, 3));
    this.particleGeometry.setAttribute('customColor', new Float32BufferAttribute(this.particleColors, 3));
    this.particleGeometry.setAttribute('size', new Float32BufferAttribute(this.particleSizes, 1));
    this.particleGeometry.setAttribute('opacity', new Float32BufferAttribute(this.particleOpacities, 1));
    
    console.log(`[WEBGL-PARTICLES] Created ${particleIndex} particles`);
    
    // Initial render
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Update material properties based on new options
   */
  public updateOptions(options: Partial<WebGLParticleSystemOptions>): void {
    // Save previous values for comparison
    const previousParticleCount = this.options.particleCount;
    const previousQuality = this.options.particleQuality;
    const previousColor = this.options.particleColor;
    
    // Update options
    this.options = { ...this.options, ...options };
    
    // Update material uniforms
    if (this.particleMaterial) {
      // Update color if changed
      if (previousColor !== this.options.particleColor) {
        this.particleMaterial.uniforms.color.value = new Color(this.options.particleColor);
      }
      
      // Update stroke properties
      this.particleMaterial.uniforms.strokeColor.value = new Color(this.options.particleStrokeColor);
      this.particleMaterial.uniforms.strokeWidth.value = this.options.particleStrokeWidth / 10;
    }
    
    // If count or quality changed, recreate particles
    if (previousParticleCount !== this.options.particleCount || 
        previousQuality !== this.options.particleQuality) {
      console.log('[WEBGL-PARTICLES] Recreating particles due to count/quality change');
      if (this.pathData.length > 0) {
        this.createParticlesAlongPaths();
      }
    }
    
    // If we have color/opacity/size changes, update those attributes
    if (this.particleGeometry && this.particleColors && 
        this.particleOpacities && this.particleSizes) {
      
      const color = new Color(this.options.particleColor);
      
      // Update colors if color changed
      if (previousColor !== this.options.particleColor) {
        for (let i = 0; i < this.particleColors.length / 3; i++) {
          const colorIndex = i * 3;
          this.particleColors[colorIndex] = color.r;
          this.particleColors[colorIndex + 1] = color.g;
          this.particleColors[colorIndex + 2] = color.b;
        }
        this.particleGeometry.getAttribute('customColor').needsUpdate = true;
      }
      
      // Update opacities and sizes if they've changed
      let opacitiesChanged = false;
      let sizesChanged = false;
      
      if (options.particleOpacity !== undefined || options.particleSize !== undefined || 
          options.particleSizeVariation !== undefined) {
        
        for (let i = 0; i < this.particleSizes.length; i++) {
          // Update opacity if changed
          if (options.particleOpacity !== undefined) {
            // Preserve the randomization factor but use new base opacity
            const randomFactor = this.particleOpacities[i] / 
              (this.options.particleOpacity !== 0 ? this.options.particleOpacity : 1);
            this.particleOpacities[i] = this.options.particleOpacity * randomFactor;
            opacitiesChanged = true;
          }
          
          // Update size if size or variation changed
          if (options.particleSize !== undefined || options.particleSizeVariation !== undefined) {
            // Recalculate size with new base size and variation
            const randomFactor = 1.0 - (this.options.particleSizeVariation * Math.random());
            this.particleSizes[i] = this.options.particleSize * randomFactor;
            sizesChanged = true;
          }
        }
        
        // Update attributes if needed
        if (opacitiesChanged) {
          this.particleGeometry.getAttribute('opacity').needsUpdate = true;
        }
        
        if (sizesChanged) {
          this.particleGeometry.getAttribute('size').needsUpdate = true;
        }
      }
    }
    
    // Trigger a render update
    this.renderer.render(this.scene, this.camera);
    
    console.log('[WEBGL-PARTICLES] Options updated');
  }

/**
 * Start the animation loop
 */
public startAnimation(): void {
    if (this.animationFrameId) this.stopAnimation(); // Clear existing animation
    
    console.log('[WEBGL-PARTICLES-DEBUG] Starting animation loop - movement amount:', this.options.particleMovementAmount);
    
    // Reset time for smooth animation start
    this.timeStart = performance.now();
    let frameCount = 0;
    let lastLogTime = this.timeStart;
    
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      
      // Log frame rate periodically
      frameCount++;
      const now = performance.now();
      if (now - lastLogTime > 2000) {  // Log every 2 seconds
        const fps = Math.round((frameCount * 1000) / (now - lastLogTime));
        console.log(`[WEBGL-PARTICLES-DEBUG] Animation running at ${fps} FPS`);
        frameCount = 0;
        lastLogTime = now;
      }
      
      this.updateParticles();
      this.renderer.render(this.scene, this.camera);
    };
    
    animate();
  }


/**
 * Update particle positions for animation
 */
private updateParticles(): void {
    if (!this.particleSystem || !this.particleGeometry || 
        !this.particlePositions || !this.originalPositions) {
      console.log('[WEBGL-PARTICLES-ERROR] Missing required objects for animation');
      return;
    }
    
    // IMPORTANT: Use a larger movement amount for visibility
    // Only animate if movement is enabled
    if (this.options.particleMovement) {
      const time = (performance.now() - this.timeStart) * 0.001;
      const positions = this.particlePositions;
      
      // Debug animation progress occasionally
      if (Math.floor(time) % 5 === 0 && Math.floor(time * 10) % 10 === 0) {
        console.log(`[WEBGL-PARTICLES-DEBUG] Animation time: ${time.toFixed(1)}s, Movement amount: ${this.options.particleMovementAmount}`);
      }
      
      // Use a larger movement amount for better visibility
      const movementAmount = this.options.particleMovementAmount * 2;
      
      // Update each particle position based on its original position
      for (let i = 0; i < positions.length; i += 3) {
        const particleIndex = i / 3;
        
        // Use particle index for varied movement patterns
        const phaseShift = (particleIndex % 100) / 20;
        
        // Use lower frequency values for smoother motion
        const frequency = 0.3 + (particleIndex % 8) / 20;
        
        // Apply smooth oscillating motion with AMPLIFIED movement
        positions[i] = this.originalPositions[i] + 
          Math.sin(time * frequency + phaseShift) * movementAmount;
        
        positions[i+1] = this.originalPositions[i+1] + 
          Math.cos(time * frequency * 0.7 + phaseShift) * movementAmount * 0.8;
      }
      
      // Update the attribute
      this.particleGeometry.getAttribute('position').needsUpdate = true;
    }
  }

/**
 * Apply transform to match SVG zoom/pan
 */
public applyTransform(transform: string): void {
    if (!this.particleSystem) return;
    
    console.log(`[WEBGL-PARTICLES-DEBUG] Applying transform: ${transform}`);
    
    // Parse the SVG transform string
    // Example: "translate(100,100) scale(2)"
    let translateX = 0;
    let translateY = 0;
    let scale = 1;
    
    // Extract translate values
    const translateMatch = transform.match(/translate\(([^,]+),([^)]+)\)/);
    if (translateMatch && translateMatch.length > 2) {
      translateX = parseFloat(translateMatch[1]);
      translateY = parseFloat(translateMatch[2]);
    }
    
    // Extract scale value
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
    if (scaleMatch && scaleMatch.length > 1) {
      scale = parseFloat(scaleMatch[1]);
    }
    
    // Get the container dimensions
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;
    
    // IMPORTANT FIX: Don't apply container center offset here since we already 
    // did that in setPathsFromSVG. Just apply the relative transform.
    const webglX = 0;
    const webglY = 0;
    
    console.log(`[WEBGL-PARTICLES-DEBUG] Applied transform: Scale ${scale}`);
    
    // Just apply scale since position is already correct in the points
    this.particleSystem.position.set(webglX, webglY, 0);
    this.particleSystem.scale.set(scale, scale, 1);
    
    // Request a render update
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Stop the animation loop
   */
  public stopAnimation(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      console.log('[WEBGL-PARTICLES] Animation stopped');
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    console.log('[WEBGL-PARTICLES] Disposing WebGL particle system');
    
    this.stopAnimation();
    
    if (this.particleGeometry) {
      this.particleGeometry.dispose();
      this.particleGeometry = null;
    }
    
    if (this.particleMaterial) {
      this.particleMaterial.dispose();
      this.particleMaterial = null;
    }
    
    if (this.canvas && this.container.contains(this.canvas)) {
      this.container.removeChild(this.canvas);
      this.canvas = null;
    }
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    this.pathData = [];
    this.particlePositions = null;
    this.originalPositions = null;
    this.particleSizes = null;
    this.particleColors = null;
    this.particleOpacities = null;
    
    this.initialized = false;
  }
}