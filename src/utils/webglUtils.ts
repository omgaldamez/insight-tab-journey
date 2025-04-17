// src/utils/webglUtils.ts

// Define the WebGL particle system options interface - matching webglParticleSystem.ts
export interface WebGLParticleSystemOptions {
    container: HTMLDivElement; 
    particleColor: string;
    particleSize: number;
    particleSizeVariation: number;
    particleOpacity: number;
    particleCount: number; // CHANGED: Removed '?' to make this required
    particleBlur: number;
    particleDistribution: 'uniform' | 'random' | 'gaussian';
    particleMovement: boolean;
    particleMovementAmount: number;
    particleStrokeColor: string;
    particleStrokeWidth: number;
    particleQuality: 'low' | 'medium' | 'high';
  }
  
  /**
   * Check if WebGL is supported in the current browser
   */
  export function checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || 
                 canvas.getContext('experimental-webgl');
      
      return !!gl;
    } catch (error) {
      console.error('[WEBGL-ERROR] Error testing WebGL support:', error);
      return false;
    }
  }
  
  /**
   * Position the WebGL canvas properly within the container
   */
  export function positionWebGLCanvas(
    canvas: HTMLCanvasElement | null,
    container: HTMLElement
  ): void {
    if (!canvas) return;
    
    // Style the canvas for proper positioning
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none'; // Allow clicking through to SVG elements
    
    // Match the container's dimensions
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Apply high-DPI scaling if needed
    const devicePixelRatio = window.devicePixelRatio || 1;
    if (devicePixelRatio > 1) {
      canvas.width = container.clientWidth * devicePixelRatio;
      canvas.height = container.clientHeight * devicePixelRatio;
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
    }
  }