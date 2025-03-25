import React, { RefObject, useEffect } from 'react';
import * as d3 from 'd3';
import { Node, Link } from '@/types/networkTypes';

interface NetworkTooltipProps {
  tooltipRef: RefObject<HTMLDivElement>;
  nodes: Node[];
  links: Link[];
}

// Main tooltip component - ONLY contains the component logic
const NetworkTooltip: React.FC<NetworkTooltipProps> = ({ 
  tooltipRef, 
  nodes,
  links
}) => {
  useEffect(() => {
    if (!tooltipRef.current) return;

    // Style the tooltip
    const tooltip = d3.select(tooltipRef.current)
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("opacity", "0")
      .style("background-color", "rgba(0, 0, 0, 0.85)")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border-radius", "6px")
      .style("font-size", "0.875rem")
      .style("pointer-events", "none")
      .style("max-width", "16rem")
      .style("box-shadow", "0 4px 8px rgba(0, 0, 0, 0.2)")
      .style("z-index", "9999")
      .style("transition", "opacity 0.15s ease-in-out");
    
    // Cleanup
    return () => {
      tooltip.style("visibility", "hidden").style("opacity", "0");
    };
  }, [tooltipRef]);

  // This component doesn't render anything directly
  return null;
};

export default NetworkTooltip;