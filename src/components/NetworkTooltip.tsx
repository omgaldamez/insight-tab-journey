import React, { RefObject, useEffect } from 'react';
import * as d3 from 'd3';
import { Node, Link } from '@/types/networkTypes';
import { TooltipDetail, TooltipTrigger } from './TooltipSettings';

interface NetworkTooltipProps {
  tooltipRef: RefObject<HTMLDivElement>;
  nodes: Node[];
  links: Link[];
  tooltipDetail?: TooltipDetail; // Optional prop for tooltip detail
  tooltipTrigger?: TooltipTrigger; // Optional prop for tooltip trigger
}

// Main tooltip component - ONLY contains the component logic
const NetworkTooltip: React.FC<NetworkTooltipProps> = ({ 
  tooltipRef, 
  nodes,
  links,
  tooltipDetail = 'simple',
  tooltipTrigger = 'hover'
}) => {
  // Only set up the tooltip styling once on mount
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
      .style("pointer-events", "auto") // Changed from "none" to allow interaction
      .style("max-width", "24rem")
      .style("box-shadow", "0 4px 8px rgba(0, 0, 0, 0.2)")
      .style("z-index", "9999")
      .style("transition", "opacity 0.15s ease-in-out");
    
    // Cleanup - this will only run when component unmounts
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (tooltipRef.current) {
        tooltip.style("visibility", "hidden").style("opacity", "0");
      }
    };
  }, [tooltipRef]); // Only depends on tooltipRef

  // Update tooltip max-width when detail level changes
  useEffect(() => {
    if (!tooltipRef.current) return;
    
    const tooltip = d3.select(tooltipRef.current);
    
    // Make detailed tooltip wider
    tooltip.style("max-width", tooltipDetail === 'detailed' ? "24rem" : "16rem");
    
    // Store the detail level as a data attribute directly on the tooltip element
    tooltip.attr("data-detail-level", tooltipDetail);
    
    console.log(`Tooltip detail changed to: ${tooltipDetail}`);
    
    // If tooltip is currently visible, hide it to avoid inconsistency
    if (tooltip.style("visibility") === "visible") {
      tooltip.style("opacity", "0")
             .style("visibility", "hidden");
    }
  }, [tooltipRef, tooltipDetail]);

  // Update tooltip behavior when trigger mode changes
  useEffect(() => {
    if (!tooltipRef.current) return;
    
    const tooltip = d3.select(tooltipRef.current);
    
    // Store the trigger mode as a data attribute directly on the tooltip element
    tooltip.attr("data-trigger-mode", tooltipTrigger);
    
    console.log(`Tooltip trigger changed to: ${tooltipTrigger}`);
    
    // If tooltip is currently visible, hide it to avoid inconsistency with the new trigger mode
    if (tooltip.style("visibility") === "visible") {
      tooltip.style("opacity", "0")
             .style("visibility", "hidden");
    }
  }, [tooltipRef, tooltipTrigger]);

  // This component doesn't render anything directly
  return null;
};

export default NetworkTooltip;