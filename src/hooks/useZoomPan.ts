import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';

interface UseZoomPanProps {
  svgRef: React.RefObject<SVGSVGElement>;
  contentRef: React.RefObject<SVGGElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  isReady: boolean;
  nodesDraggable?: boolean;
}

export default function useZoomPan({
  svgRef,
  contentRef,
  containerRef,
  isReady,
  nodesDraggable = true
}: UseZoomPanProps) {
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const initialZoomDoneRef = useRef<boolean>(false);
  const [zoomInitialized, setZoomInitialized] = useState(false);
  
  // Force initialization after a short delay to ensure all elements are ready
  useEffect(() => {
    if (!isReady) return;
    
    // Wait a moment to ensure DOM is fully rendered
    const initTimer = setTimeout(() => {
      if (svgRef.current && contentRef.current) {
        initializeZoom();
      }
    }, 300);
    
    return () => clearTimeout(initTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, svgRef]);

  // Initialize zoom behavior
  const initializeZoom = useCallback(() => {
    if (!svgRef.current || !contentRef.current) return;
    
    console.log("Initializing zoom behavior with force initialization");
    
    // Remove any existing zoom behavior first
    if (zoomRef.current) {
      d3.select(svgRef.current).on('.zoom', null);
    }
    
    // Create zoom behavior with specific configuration
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        if (contentRef.current) {
          // Apply transform to the content group
          d3.select(contentRef.current).attr("transform", event.transform.toString());
          transformRef.current = event.transform;
        }
      });
    
    // Explicitly set the entire SVG element to receive pointer events
    d3.select(svgRef.current)
      .style("pointer-events", "all");
    
    // Apply zoom behavior to SVG
    const svg = d3.select(svgRef.current);
    
    // Important: Apply the zoom behavior directly to the SVG element
    svg.call(zoom);
    
    // Store the zoom behavior for later use
    zoomRef.current = zoom;
    setZoomInitialized(true);
    
    // Log that initialization is complete
    console.log("Zoom initialization complete - scroll zoom should now work");
    
    return zoom;
  }, [svgRef, contentRef]);
  
  // Function to zoom in
  const zoomIn = useCallback(() => {
    if (!svgRef.current) return;
    
    // Ensure zoom is initialized
    const zoom = zoomRef.current || initializeZoom();
    if (!zoom) return;
    
    const svg = d3.select(svgRef.current);
    const currentTransform = transformRef.current || d3.zoomIdentity;
    const newScale = currentTransform.k * 1.5;
    
    svg.transition()
      .duration(300)
      .call(zoom.scaleTo, newScale);
  }, [svgRef, initializeZoom]);
  
  // Function to zoom out
  const zoomOut = useCallback(() => {
    if (!svgRef.current) return;
    
    // Ensure zoom is initialized
    const zoom = zoomRef.current || initializeZoom();
    if (!zoom) return;
    
    const svg = d3.select(svgRef.current);
    const currentTransform = transformRef.current || d3.zoomIdentity;
    const newScale = currentTransform.k / 1.5;
    
    svg.transition()
      .duration(300)
      .call(zoom.scaleTo, newScale);
  }, [svgRef, initializeZoom]);
  
  // Zoom to fit
  const zoomToFit = useCallback((duration = 750) => {
    if (!svgRef.current || !contentRef.current || !containerRef.current) {
      console.warn("Cannot zoom to fit - missing references");
      return;
    }
    
    // Ensure zoom is initialized
    const zoom = zoomRef.current || initializeZoom();
    if (!zoom) return;
    
    try {
      console.log("Zooming to fit");
      
      const svg = d3.select(svgRef.current);
      
      // Get container dimensions
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      // Get bounds of the graph content
      const bounds = contentRef.current.getBBox();
      
      if (bounds.width === 0 || bounds.height === 0) {
        console.warn("Cannot zoom to fit - bounds are zero");
        return;
      }
      
      // Calculate zoom parameters with padding
      const dx = bounds.width;
      const dy = bounds.height;
      const x = bounds.x + (dx / 2);
      const y = bounds.y + (dy / 2);
      
      const padding = 40;
      const scale = 0.95 / Math.max(
        dx / (width - padding * 2), 
        dy / (height - padding * 2)
      );
      
      const translate = [
        width / 2 - scale * x, 
        height / 2 - scale * y
      ];
      
      // Create zoom transform
      const transform = d3.zoomIdentity
        .translate(translate[0], translate[1])
        .scale(scale);
      
      // Apply transform with transition
      svg.transition()
        .duration(duration)
        .call(zoom.transform, transform);
      
      // Store the transform
      transformRef.current = transform;
    } catch (error) {
      console.error("Error in zoomToFit:", error);
    }
  }, [svgRef, contentRef, containerRef, initializeZoom]);
  
  // Reset zoom to identity
  const resetZoom = useCallback(() => {
    if (!svgRef.current) return;
    
    // Ensure zoom is initialized
    const zoom = zoomRef.current || initializeZoom();
    if (!zoom) return;
    
    const svg = d3.select(svgRef.current);
    
    svg.transition()
      .duration(300)
      .call(zoom.transform, d3.zoomIdentity);
    
    transformRef.current = d3.zoomIdentity;
  }, [svgRef, initializeZoom]);
  
  // Auto zoom to fit on initial load
  useEffect(() => {
    if (isReady && zoomInitialized && !initialZoomDoneRef.current) {
      console.log("Performing initial zoom to fit");
      // Delay to ensure the visualization is fully rendered
      const timer = setTimeout(() => {
        zoomToFit();
        initialZoomDoneRef.current = true;
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isReady, zoomInitialized, zoomToFit]);
  
  // Manually refresh zoom behavior on window resize
  useEffect(() => {
    if (!isReady) return;
    
    const handleResize = () => {
      // Delay slightly to allow for DOM updates
      setTimeout(() => {
        if (zoomRef.current && svgRef.current) {
          console.log("Refreshing zoom behavior after resize");
          const svg = d3.select(svgRef.current);
          svg.call(zoomRef.current);
        }
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isReady, svgRef]);
  
  // Expose a method to force reinitialize zoom
  const reinitializeZoom = useCallback(() => {
    return initializeZoom();
  }, [initializeZoom]);
  
  // Get current transform for export
  const getTransform = useCallback(() => {
    return transformRef.current;
  }, []);
  
  return { 
    zoomToFit, 
    zoomIn, 
    zoomOut, 
    resetZoom, 
    getTransform,
    isZoomInitialized: zoomInitialized,
    reinitializeZoom
  };
}