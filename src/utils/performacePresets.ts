// performancePresets.ts - Configuration presets focused on performance optimization

// Define the quality type to avoid repetition
type ParticleQualityType = 'low' | 'medium' | 'high';

/**
 * Performance presets for different scenarios in chord diagram visualization
 */
export const chordPerformancePresets = {
    // Preset for maximum performance with particle effects
    highPerformance: {
      name: "High Performance",
      description: "Optimized for maximum performance with particles",
      config: {
        // Use WebGL for hardware acceleration
        useWebGLRenderer: true,
        webGLParticleQuality: 'medium' as ParticleQualityType,
        
        // Particle optimization
        particleDensity: 100,
        particleSize: 1.0,
        particleSizeVariation: 0.4,
        particleBlur: 0,
        
        // Only show real connections (not dotted/minimal ones)
        particlesOnlyRealConnections: true,
        
        // Optimized generation settings
        highPerformanceMode: true,
        particleGenerationDelay: 10,
        
        // Disable particle movement for better performance
        particleMovement: false
      }
    },
    
    // Preset for visual quality (slower but prettier)
    highQuality: {
      name: "High Quality",
      description: "Best visual quality for presentations or exports",
      config: {
        // Use WebGL for hardware acceleration but with higher quality
        useWebGLRenderer: true,
        webGLParticleQuality: 'high' as ParticleQualityType,
        
        // More particles for better visual effect
        particleDensity: 200,
        particleSize: 1.2,
        particleSizeVariation: 0.6,
        particleBlur: 0.5,
        
        // Show all connections including dotted/minimal ones
        particlesOnlyRealConnections: false,
        
        // Disable high performance mode for better quality
        highPerformanceMode: false,
        particleGenerationDelay: 20,
        
        // Enable particle movement for dynamic effect
        particleMovement: true,
        particleMovementAmount: 1.0
      }
    },
    
    // Preset for balanced performance and quality
    balanced: {
      name: "Balanced",
      description: "Good balance between performance and quality",
      config: {
        // Use WebGL with medium quality
        useWebGLRenderer: true,
        webGLParticleQuality: 'medium' as ParticleQualityType,
        
        // Moderate particle density
        particleDensity: 150,
        particleSize: 1.1,
        particleSizeVariation: 0.5,
        particleBlur: 0.2,
        
        // Only show real connections
        particlesOnlyRealConnections: true,
        
        // Balanced performance mode
        highPerformanceMode: false,
        particleGenerationDelay: 15,
        
        // Enable minimal movement
        particleMovement: true,
        particleMovementAmount: 0.5
      }
    },
    
    // Preset for SVG-only rendering (fallback for older browsers)
    compatibilityMode: {
      name: "Compatibility Mode",
      description: "Works on all browsers without WebGL",
      config: {
        // Don't use WebGL
        useWebGLRenderer: false,
        
        // Reduce particle count dramatically for SVG rendering
        particleDensity: 50,
        particleSize: 1.0,
        particleSizeVariation: 0.3,
        particleBlur: 0,
        
        // Only show real connections
        particlesOnlyRealConnections: true,
        
        // Maximum optimization
        highPerformanceMode: true,
        particleGenerationDelay: 20,
        
        // Disable movement for better performance
        particleMovement: false
      }
    },
    
    // Preset for detailed view with many nodes
    detailedView: {
      name: "Detailed View",
      description: "Optimized for detailed node view",
      config: {
        // Use WebGL for hardware acceleration
        useWebGLRenderer: true,
        webGLParticleQuality: 'medium' as ParticleQualityType,
        
        // Reduced particle density for better performance
        particleDensity: 80,
        particleSize: 0.8,
        particleSizeVariation: 0.3,
        particleBlur: 0,
        
        // Only show real connections
        particlesOnlyRealConnections: true,
        
        // Maximum optimization
        highPerformanceMode: true,
        particleGenerationDelay: 10,
        
        // Disable movement
        particleMovement: false,
        
        // Enable detailed view mode
        showDetailedView: true
      }
    }
  };
  
  /**
   * Get a performance preset by key
   */
  export function getPerformancePreset(key: string) {
    return chordPerformancePresets[key as keyof typeof chordPerformancePresets] || chordPerformancePresets.balanced;
  }
  
  /**
   * Check browser WebGL capability
   * @returns True if WebGL is supported, false otherwise
   */
  export function checkWebGLSupport(): boolean {
    try {
      // Try to create a WebGL context
      const canvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Automatically determine the best performance preset based on hardware capabilities
   * @returns The key of the recommended preset
   */
  export function getRecommendedPreset(particleCount: number): string {
    // First check if WebGL is supported at all
    const hasWebGL = checkWebGLSupport();
    
    if (!hasWebGL) {
      return 'compatibilityMode';
    }
    
    // Check for high-end vs low-end hardware
    // This is a very simple heuristic - could be improved
    const isHighEndHardware = window.navigator.hardwareConcurrency > 4;
    
    // Logic based on particle count and hardware
    if (particleCount > 5000) {
      return isHighEndHardware ? 'highPerformance' : 'compatibilityMode';
    } else if (particleCount > 2000) {
      return isHighEndHardware ? 'balanced' : 'highPerformance';
    } else {
      return isHighEndHardware ? 'highQuality' : 'balanced';
    }
  }