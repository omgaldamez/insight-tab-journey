import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';

interface UseZoomPanProps {
  svgRef: React.RefObject<SVGSVGElement>;
  contentRef: React.RefObject<SVGGElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  isReady: boolean;
}

export default function useZoomPan({ svgRef, contentRef, containerRef, isReady }: UseZoomPanProps) {
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const transformRef = useRef<d3.ZoomTransform | null>(null);
  const initialZoomDoneRef = useRef<boolean>(false);
  
  // Create zoom behavior only once
  useEffect(() => {
    if (!isReady || !svgRef.current || !contentRef.current) return;
    
    if (!zoomRef.current) {
      console.log("Initializing zoom behavior");
      
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 8])
        .on("zoom", (event) => {
          const svg = d3.select(svgRef.current);
          const g = svg.select("g");
          g.attr("transform", event.transform.toString());
          transformRef.current = event.transform;
        });
      
      d3.select(svgRef.current).call(zoom);
      zoomRef.current = zoom;
    }
  }, [isReady, svgRef, contentRef]);
  
  // Only zoom to fit on initial load - NOT on parameter changes
  const zoomToFit = useCallback((duration = 750) => {
    if (!svgRef.current || !contentRef.current || !containerRef.current || !zoomRef.current) {
      console.warn("Cannot zoom to fit - missing references");
      return;
    }
    
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
      
      // Calculate zoom parameters
      const dx = bounds.width;
      const dy = bounds.height;
      const x = bounds.x + (dx / 2);
      const y = bounds.y + (dy / 2);
      
      // Apply padding
      const padding = 40;
      const scale = 0.95 / Math.max(
        dx / (width - padding * 2), 
        dy / (height - padding * 2)
      );
      
      const translate = [
        width / 2 - scale * x, 
        height / 2 - scale * y
      ];
      
      // Create the transform
      const transform = d3.zoomIdentity
        .translate(translate[0], translate[1])
        .scale(scale);
      
      // Apply the transform with transition
      svg.transition()
        .duration(duration)
        .call(zoomRef.current.transform, transform);
      
      // Store the transform
      transformRef.current = transform;
    } catch (error) {
      console.error("Error in zoomToFit:", error);
    }
  }, [svgRef, contentRef, containerRef]);
  
  // Only do initial zoom to fit once
  useEffect(() => {
    if (isReady && !initialZoomDoneRef.current) {
      console.log("Performing initial zoom to fit");
      // Delay to ensure the visualization is fully rendered
      const timer = setTimeout(() => {
        zoomToFit();
        initialZoomDoneRef.current = true;
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isReady, zoomToFit]);
  
  // Get current transform (for saving/exporting)
  const getTransform = useCallback(() => {
    return transformRef.current;
  }, []);
  
  return { zoomToFit, getTransform };
}