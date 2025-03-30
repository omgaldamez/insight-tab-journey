import { RefObject } from 'react';
import * as d3 from 'd3';
import { Node, Link } from '@/types/networkTypes';

// Find all connections for a node
export const findNodeConnections = (node: Node, links: Link[]) => {
  // Filter for source links (outgoing from this node)
  const sourceLinks = links.filter(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    return sourceId === node.id;
  });
  
  // Filter for target links (incoming to this node)
  const targetLinks = links.filter(link => {
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    return targetId === node.id;
  });
  
  return { sourceLinks, targetLinks };
};

// Show tooltip function
export const showTooltip = (
  event: MouseEvent, 
  node: Node, 
  tooltipRef: RefObject<HTMLDivElement>,
  links: Link[]
) => {
  if (!tooltipRef.current) return;
  
  const tooltip = d3.select(tooltipRef.current);
  
  // Find connections
  const { sourceLinks, targetLinks } = findNodeConnections(node, links);
  
  // Build tooltip content
  const tooltipContent = `
    <div>
      <p class="font-medium">${node.id}</p>
      <p class="text-xs text-gray-300">Type: ${node.category}</p>
      <p class="text-xs text-gray-300">Connections: ${sourceLinks.length + targetLinks.length}</p>
    </div>
  `;
  
  // Set tooltip content and show it
  tooltip
    .html(tooltipContent)
    .style("visibility", "visible")
    .style("opacity", "1")
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 10) + "px");
};

// Move tooltip function
export const moveTooltip = (
  event: MouseEvent, 
  tooltipRef: RefObject<HTMLDivElement>,
  svgRef: RefObject<SVGSVGElement>
) => {
  if (!tooltipRef.current || !svgRef.current) return;
  
  const tooltip = d3.select(tooltipRef.current);
  const svg = d3.select(svgRef.current);
  
  // Get SVG position for more accurate positioning
  const svgRect = svgRef.current.getBoundingClientRect();
  const tooltipRect = tooltipRef.current.getBoundingClientRect();
  
  // Calculate position
  let xPosition = event.clientX - svgRect.left + 15;
  let yPosition = event.clientY - svgRect.top - 10;
  
  // Prevent tooltip from going off the right edge
  if (xPosition + tooltipRect.width > svgRect.width) {
    xPosition = event.clientX - svgRect.left - tooltipRect.width - 10;
  }
  
  // Prevent tooltip from going off the bottom edge
  if (yPosition + tooltipRect.height > svgRect.height) {
    yPosition = event.clientY - svgRect.top - tooltipRect.height - 10;
  }
  
  // Apply position
  tooltip
    .style("left", xPosition + "px")
    .style("top", yPosition + "px");
};

// Hide tooltip function
export const hideTooltip = (tooltipRef: RefObject<HTMLDivElement>) => {
  if (!tooltipRef.current) return;
  
  const tooltip = d3.select(tooltipRef.current);
  
  tooltip
    .style("opacity", "0")
    .style("visibility", "hidden");
};