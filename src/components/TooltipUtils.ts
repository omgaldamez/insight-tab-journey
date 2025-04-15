import { RefObject } from 'react';
import * as d3 from 'd3';
import { Node, Link } from '@/types/networkTypes';
import { TooltipDetail, TooltipTrigger } from './TooltipSettings';

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

// Get connected nodes with categories
export const getConnectionDetails = (node: Node, links: Link[]) => {
  const { sourceLinks, targetLinks } = findNodeConnections(node, links);
  
  // Get outgoing connections with categories
  const outgoingConnections = sourceLinks.map(link => {
    const target = typeof link.target === 'object' 
      ? link.target 
      : links.find(l => {
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          return targetId === link.target;
        })?.target || { id: link.target as string, category: 'Unknown' };
    
    return {
      id: typeof target === 'object' ? target.id : target as string,
      category: typeof target === 'object' ? target.category : 'Unknown'
    };
  });
  
  // Get incoming connections with categories
  const incomingConnections = targetLinks.map(link => {
    const source = typeof link.source === 'object' 
      ? link.source 
      : links.find(l => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          return sourceId === link.source;
        })?.source || { id: link.source as string, category: 'Unknown' };
    
    return {
      id: typeof source === 'object' ? source.id : source as string,
      category: typeof source === 'object' ? source.category : 'Unknown'
    };
  });
  
  return { outgoingConnections, incomingConnections, sourceLinks, targetLinks };
};

// Generate simple tooltip content - Always with "click for more"
const generateSimpleTooltip = (node: Node, sourceLinks: Link[], targetLinks: Link[]) => {
  return `
    <div>
      <p class="font-medium">${node.id}</p>
      <p class="text-xs text-gray-300">Type: ${node.category}</p>
      <p class="text-xs text-gray-300">Connections: ${sourceLinks.length + targetLinks.length}</p>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
        <p class="text-xs text-blue-300" style="margin: 0;">Click for more details</p>
      </div>
    </div>
  `;
};

// Generate detailed tooltip content - Always with download buttons
const generateDetailedTooltip = (
  node: Node, 
  outgoingConnections: Array<{id: string, category: string}>,
  incomingConnections: Array<{id: string, category: string}>,
  sourceLinks: Link[],
  targetLinks: Link[]
) => {
  // Limit display if there are many connections
  const MAX_CONNECTIONS_TO_SHOW = 5;
  const showOutgoing = outgoingConnections.slice(0, MAX_CONNECTIONS_TO_SHOW);
  const showIncoming = incomingConnections.slice(0, MAX_CONNECTIONS_TO_SHOW);
  
  // Create lists of outgoing connections
  let outgoingList = '';
  if (outgoingConnections.length > 0) {
    outgoingList = showOutgoing.map(conn => 
      `<li class="text-xs"><span class="font-medium">${conn.id}</span> <span class="text-gray-400">(${conn.category})</span></li>`
    ).join('');
    
    // Add a "more" indicator if needed
    if (outgoingConnections.length > MAX_CONNECTIONS_TO_SHOW) {
      outgoingList += `<li class="text-xs text-gray-400">...and ${outgoingConnections.length - MAX_CONNECTIONS_TO_SHOW} more</li>`;
    }
  } else {
    outgoingList = '<li class="text-xs text-gray-400">None</li>';
  }
  
  // Create lists of incoming connections
  let incomingList = '';
  if (incomingConnections.length > 0) {
    incomingList = showIncoming.map(conn => 
      `<li class="text-xs"><span class="font-medium">${conn.id}</span> <span class="text-gray-400">(${conn.category})</span></li>`
    ).join('');
    
    // Add a "more" indicator if needed
    if (incomingConnections.length > MAX_CONNECTIONS_TO_SHOW) {
      incomingList += `<li class="text-xs text-gray-400">...and ${incomingConnections.length - MAX_CONNECTIONS_TO_SHOW} more</li>`;
    }
  } else {
    incomingList = '<li class="text-xs text-gray-400">None</li>';
  }
  
  // Always add download buttons and close button in detailed mode
  const actionHtml = `
    <div class="tooltip-actions" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
      <div class="tooltip-download" style="display: flex; gap: 4px;">
        <button class="tooltip-download-text" data-node-id="${node.id}" style="background: rgba(59, 130, 246, 0.3); border: none; color: white; border-radius: 4px; padding: 3px 8px; font-size: 10px; cursor: pointer;">
          Download Text
        </button>
        <button class="tooltip-download-json" data-node-id="${node.id}" style="background: rgba(59, 130, 246, 0.3); border: none; color: white; border-radius: 4px; padding: 3px 8px; font-size: 10px; cursor: pointer;">
          Download JSON
        </button>
      </div>
      <button class="tooltip-close-btn" style="background: rgba(255,255,255,0.1); border: none; color: white; border-radius: 4px; padding: 3px 8px; font-size: 10px; cursor: pointer;">
        Close
      </button>
    </div>
  `;
  
  return `
    <div class="tooltip-content detailed-tooltip" style="max-width: 300px; max-height: 400px; overflow-y: auto;">
      <div class="tooltip-header" style="margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
        <p class="font-medium text-sm" style="font-size: 14px; margin: 0 0 4px 0;">${node.id}</p>
        <p class="text-xs text-gray-300" style="margin: 0 0 2px 0;">Type: <span class="font-medium">${node.category}</span></p>
        <p class="text-xs text-gray-300" style="margin: 0;">Connections: <span class="font-medium">${sourceLinks.length + targetLinks.length}</span></p>
      </div>
      
      ${outgoingConnections.length > 0 ? `
        <div class="tooltip-section" style="margin-top: 8px;">
          <p class="text-xs font-medium text-blue-300" style="margin: 0 0 4px 0;">Outgoing Connections (${outgoingConnections.length}):</p>
          <ul class="tooltip-list" style="margin: 0; padding-left: 12px; list-style-type: disc;">
            ${outgoingList}
          </ul>
        </div>
      ` : ''}
      
      ${incomingConnections.length > 0 ? `
        <div class="tooltip-section" style="margin-top: 8px;">
          <p class="text-xs font-medium text-green-300" style="margin: 0 0 4px 0;">Incoming Connections (${incomingConnections.length}):</p>
          <ul class="tooltip-list" style="margin: 0; padding-left: 12px; list-style-type: disc;">
            ${incomingList}
          </ul>
        </div>
      ` : ''}
      
      ${actionHtml}
    </div>
  `;
};

// Calculate proper tooltip position relative to SVG - FIXED
export const calculateTooltipPosition = (
  event: MouseEvent,
  tooltipRef: RefObject<HTMLDivElement>,
  svgRef: RefObject<SVGSVGElement>
) => {
  if (!tooltipRef.current || !svgRef.current) {
    return { x: 0, y: 0 };
  }

  // Get the SVG element's bounding rectangle
  const svgRect = svgRef.current.getBoundingClientRect();
  
  // Get the tooltip element's current dimensions
  const tooltipRect = tooltipRef.current.getBoundingClientRect();
  
  // Calculate absolute position first (relative to viewport)
  const absX = event.clientX;
  const absY = event.clientY;
  
  // Translate to position within the SVG
  let xPosition = absX - svgRect.left + 15; // Add small offset for better positioning
  let yPosition = absY - svgRect.top - 10;
  
  // Add buffer margin
  const buffer = 10;
  
  // Prevent tooltip from going off the right edge
  if (xPosition + tooltipRect.width + buffer > svgRect.width) {
    xPosition = absX - svgRect.left - tooltipRect.width - buffer;
  }
  
  // Prevent tooltip from going off the bottom edge
  if (yPosition + tooltipRect.height + buffer > svgRect.height) {
    yPosition = absY - svgRect.top - tooltipRect.height - buffer;
  }
  
  // Ensure tooltip doesn't go off the left or top edge
  if (xPosition < buffer) xPosition = buffer;
  if (yPosition < buffer) yPosition = buffer;
  
  return { x: xPosition, y: yPosition };
};

// Show tooltip function - UPDATED
export const showTooltip = (
  event: MouseEvent, 
  node: Node, 
  tooltipRef: RefObject<HTMLDivElement>,
  links: Link[],
  tooltipDetail: TooltipDetail = 'simple',
  tooltipTrigger: TooltipTrigger = 'hover',
  svgRef: RefObject<SVGSVGElement>,
  onNodeClick?: ((node: Node) => void) | null
) => {
  if (!tooltipRef.current || !svgRef.current) return;
  
  const tooltip = d3.select(tooltipRef.current);
  
  // Always show pointer cursor on nodes
  d3.select(event.currentTarget as SVGElement)
    .style('cursor', 'pointer');
  
  // If this is a click event, show detailed tooltip
  if (event.type === 'click') {
    // Call node click handler if provided
    if (onNodeClick) {
      onNodeClick(node);
    }
    
    // Get all connection details
    const { outgoingConnections, incomingConnections, sourceLinks, targetLinks } = 
      getConnectionDetails(node, links);
    
    // Always use detailed tooltip for clicks
    const tooltipContent = generateDetailedTooltip(
      node, outgoingConnections, incomingConnections, sourceLinks, targetLinks
    );
    
    // Calculate position relative to SVG
    const position = calculateTooltipPosition(event, tooltipRef, svgRef);
    
    // Set tooltip content and make it persistent
    tooltip
      .html(tooltipContent)
      .style("visibility", "visible")
      .style("opacity", "1")
      .style("left", `${position.x}px`)
      .style("top", `${position.y}px`)
      .classed("persistent-tooltip", true)
      .attr("data-node-id", node.id);
    
    // Set up download button handlers
    setTimeout(() => {
      const textBtn = tooltipRef.current?.querySelector(".tooltip-download-text");
      const jsonBtn = tooltipRef.current?.querySelector(".tooltip-download-json");
      const closeBtn = tooltipRef.current?.querySelector(".tooltip-close-btn");
      
      if (textBtn) {
        textBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          downloadNodeAsText(node, links);
        });
      }
      
      if (jsonBtn) {
        jsonBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          downloadNodeAsJson(node, links);
        });
      }
      
      if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (tooltipRef.current) {
            d3.select(tooltipRef.current)
              .style("opacity", "0")
              .style("visibility", "hidden")
              .classed("persistent-tooltip", false);
          }
        });
      }
    }, 0);
    
    return;
  }
  
  // For hover (mouseover) events
  if (event.type === 'mouseover') {
    // Don't show hover tooltip if we have a persistent one for this node
    if (tooltip.classed("persistent-tooltip") && tooltip.attr("data-node-id") === node.id) {
      return;
    }
    
    // Get basic connection info
    const { sourceLinks, targetLinks } = findNodeConnections(node, links);
    
    // Use simple tooltip for hover
    const tooltipContent = generateSimpleTooltip(node, sourceLinks, targetLinks);
    
    // Calculate position
    const position = calculateTooltipPosition(event, tooltipRef, svgRef);
    
    // Show non-persistent tooltip
    tooltip
      .html(tooltipContent)
      .style("visibility", "visible")
      .style("opacity", "1")
      .style("left", `${position.x}px`)
      .style("top", `${position.y}px`)
      .classed("persistent-tooltip", false)
      .attr("data-node-id", node.id);
  }
};

// Move tooltip function - UPDATED to only move non-persistent tooltips
export const moveTooltip = (
  event: MouseEvent, 
  tooltipRef: RefObject<HTMLDivElement>,
  svgRef: RefObject<SVGSVGElement>,
  tooltipTrigger: TooltipTrigger = 'hover'
) => {
  if (!tooltipRef.current || !svgRef.current) return;
  
  const tooltip = d3.select(tooltipRef.current);
  
  // Don't move persistent tooltips
  if (tooltip.classed("persistent-tooltip")) {
    return;
  }
  
  // Calculate new position
  const position = calculateTooltipPosition(event, tooltipRef, svgRef);
  
  // Move non-persistent tooltip
  tooltip
    .style("left", `${position.x}px`)
    .style("top", `${position.y}px`);
};

// Update hideTooltip function
export const hideTooltip = (
  tooltipRef: RefObject<HTMLDivElement>,
  tooltipTrigger: TooltipTrigger = 'hover',
  currentNode?: string
) => {
  if (!tooltipRef.current) return;
  
  const tooltip = d3.select(tooltipRef.current);
  
  // Don't hide persistent tooltips unless explicitly needed
  if (tooltip.classed("persistent-tooltip") && tooltipTrigger === 'persistent') {
    return;
  }
  
  // Hide tooltip
  tooltip
    .style("opacity", "0")
    .style("visibility", "hidden");
};

// Click away listener - UPDATED to properly close persistent tooltips
export const setupClickAwayListener = (
  tooltipRef: RefObject<HTMLDivElement>,
  tooltipTrigger: TooltipTrigger
) => {
  const handleDocumentClick = (e: MouseEvent) => {
    if (!tooltipRef.current) return;
    
    const tooltip = d3.select(tooltipRef.current);
    
    // Only check for persistent tooltips that are visible
    if (tooltip.classed("persistent-tooltip") && tooltip.style("visibility") === "visible") {
      // Check if click is outside tooltip and nodes
      const isTooltip = tooltipRef.current.contains(e.target as HTMLElement);
      const isNode = (e.target instanceof Element) && (
        e.target.classList?.contains('node') || 
        e.target.parentElement?.classList?.contains('nodes')
      );
      
      if (!isTooltip && !isNode) {
        // Close the tooltip
        tooltip
          .style("opacity", "0")
          .style("visibility", "hidden")
          .classed("persistent-tooltip", false);
      }
    }
  };
  
  // Set up the listener
  document.addEventListener('click', handleDocumentClick);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('click', handleDocumentClick);
  };
};

// Generate text representation of node data
export const getNodeTextRepresentation = (node: Node, links: Link[]) => {
  const { outgoingConnections, incomingConnections, sourceLinks, targetLinks } = 
    getConnectionDetails(node, links);
  
  let text = `Node: ${node.id}\n`;
  text += `Category: ${node.category}\n`;
  text += `Total Connections: ${sourceLinks.length + targetLinks.length}\n\n`;
  
  if (sourceLinks.length > 0) {
    text += `Outgoing Connections (${sourceLinks.length}):\n`;
    outgoingConnections.forEach(conn => {
      text += `- ${conn.id} (${conn.category})\n`;
    });
    text += '\n';
  }
  
  if (targetLinks.length > 0) {
    text += `Incoming Connections (${targetLinks.length}):\n`;
    incomingConnections.forEach(conn => {
      text += `- ${conn.id} (${conn.category})\n`;
    });
  }
  
  return text;
};

// Generate JSON representation of node data
export const getNodeJsonRepresentation = (node: Node, links: Link[]) => {
  const { outgoingConnections, incomingConnections, sourceLinks, targetLinks } = 
    getConnectionDetails(node, links);
  
  const data = {
    node: {
      id: node.id,
      category: node.category
    },
    connections: {
      total: sourceLinks.length + targetLinks.length,
      outgoing: outgoingConnections.map(conn => ({
        id: conn.id,
        category: conn.category
      })),
      incoming: incomingConnections.map(conn => ({
        id: conn.id,
        category: conn.category
      }))
    }
  };
  
  return JSON.stringify(data, null, 2);
};

// Download file utility function
export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};

// Download node data as text file
export const downloadNodeAsText = (node: Node, links: Link[]) => {
  const content = getNodeTextRepresentation(node, links);
  downloadFile(content, `node_${node.id}.txt`, 'text/plain');
};

// Download node data as JSON file
export const downloadNodeAsJson = (node: Node, links: Link[]) => {
  const content = getNodeJsonRepresentation(node, links);
  downloadFile(content, `node_${node.id}.json`, 'application/json');
};