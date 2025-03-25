import { RefObject } from 'react';
import * as d3 from 'd3';
import { Node, Link } from '@/types/networkTypes';

// Helper function to find node connections
export const findNodeConnections = (node: Node, links: Link[]) => {
  // Find connections for this node
  const sourceLinks = links.filter(link => {
    return typeof link.source === 'object' 
      ? link.source.id === node.id 
      : link.source === node.id;
  });
  
  const targetLinks = links.filter(link => {
    return typeof link.target === 'object' 
      ? link.target.id === node.id 
      : link.target === node.id;
  });
  
  return { sourceLinks, targetLinks };
};

// Tooltip helper functions - Now separated from the component
export const showTooltip = (
  event: MouseEvent, 
  node: Node, 
  tooltipRef: RefObject<HTMLDivElement>,
  links: Link[]
): void => {
  if (!tooltipRef.current) return;
  
  // Find connections for this node
  const { sourceLinks, targetLinks } = findNodeConnections(node, links);
  
  // Build tooltip content
  let tooltipContent = `<strong>${node.id}</strong><br>Category: ${node.category}<br><br>`;
  
  // Add connections info
  if (sourceLinks.length > 0) {
    tooltipContent += `<strong>Connected to:</strong><br>`;
    sourceLinks.forEach(link => {
      const targetName = typeof link.target === 'object' ? link.target.id : link.target;
      tooltipContent += `${targetName}<br>`;
    });
    tooltipContent += `<br>`;
  }
  
  if (targetLinks.length > 0) {
    tooltipContent += `<strong>Connected from:</strong><br>`;
    targetLinks.forEach(link => {
      const sourceName = typeof link.source === 'object' ? link.source.id : link.source;
      tooltipContent += `${sourceName}<br>`;
    });
  }
  
  // Set content and position
  const tooltip = d3.select(tooltipRef.current);
  tooltip.html(tooltipContent);
  
  // Position adjacent to cursor
  const mouseX = event.clientX;
  const mouseY = event.clientY;
  const xOffset = 15;
  const yOffset = -10;
  
  // Show tooltip with fixed positioning
  tooltip
    .style("position", "fixed")
    .style("left", `${mouseX + xOffset}px`)
    .style("top", `${mouseY + yOffset}px`)
    .style("opacity", "1")
    .style("visibility", "visible")
    .style("z-index", "9999");
};

export const moveTooltip = (
  event: MouseEvent, 
  tooltipRef: RefObject<HTMLDivElement>, 
  svgRef: RefObject<SVGSVGElement>
): void => {
  if (!tooltipRef.current) return;
  
  // Calculate tooltip dimensions
  const tooltipWidth = tooltipRef.current.offsetWidth || 200;
  const tooltipHeight = tooltipRef.current.offsetHeight || 100;
  
  // Get the SVG's position relative to the viewport
  let svgRect: DOMRect | undefined;
  if (svgRef.current) {
    svgRect = svgRef.current.getBoundingClientRect();
  }
  
  // Offset from cursor
  const offsetX = 15;
  const offsetY = 10;
  
  // Get cursor position
  const mouseX = event.clientX;
  const mouseY = event.clientY;
  
  // Adjust position if tooltip would go off screen
  let xPos = mouseX + offsetX;
  let yPos = mouseY + offsetY;
  
  // Check right edge
  if (xPos + tooltipWidth > window.innerWidth) {
    xPos = mouseX - tooltipWidth - offsetX;
  }
  
  // Check bottom edge
  if (yPos + tooltipHeight > window.innerHeight) {
    yPos = mouseY - tooltipHeight - offsetY;
  }
  
  // Set tooltip position with fixed positioning relative to viewport
  d3.select(tooltipRef.current)
    .style("position", "fixed")
    .style("left", `${xPos}px`)
    .style("top", `${yPos}px`);
};

export const hideTooltip = (tooltipRef: RefObject<HTMLDivElement>): void => {
  if (!tooltipRef.current) return;
  
  d3.select(tooltipRef.current)
    .style("opacity", "0");
};