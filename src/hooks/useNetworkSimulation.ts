import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Node, Link, SimulatedNode } from '@/types/networkTypes';

interface NetworkSimulationProps {
  svgRef: React.RefObject<SVGSVGElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  nodes: Node[];
  links: Link[];
  linkDistance: number;
  linkStrength: number;
  nodeCharge: number;
  fixNodesOnDrag: boolean;
}

// Declare global augmentation for timeout IDs
declare global {
  interface Window {
    resizeTimeoutId?: number;
    paramUpdateTimeout?: number;
  }
}

const useNetworkSimulation = ({
  svgRef,
  containerRef,
  nodes,
  links,
  linkDistance,
  linkStrength,
  nodeCharge,
  fixNodesOnDrag
}: NetworkSimulationProps) => {
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const isInitializedRef = useRef(false); // Track if simulation is initialized

  // Initialize simulation ONLY if not already initialized or if nodes/links change
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    // If simulation exists and just parameters changed, don't reinitialize
    if (simulationRef.current && isInitializedRef.current) {
      console.log("Simulation already exists, updating parameters instead of reinitializing");
      
      // Update existing simulation parameters
      updateForces();
      return;
    }

    console.log("Creating new simulation with fixNodesOnDrag:", fixNodesOnDrag);

    // Create new simulation
    try {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      // Create simulation
      const simulation = d3.forceSimulation<Node>(nodes)
        .force("link", d3.forceLink<Node, Link>(links)
          .id(d => d.id)
          .distance(linkDistance)
          .strength(linkStrength))
        .force("charge", d3.forceManyBody().strength(nodeCharge))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(d => 10));

      // Store simulation
      simulationRef.current = simulation;
      isInitializedRef.current = true;

      // Set up drag behavior
      setupDragBehavior();
    } catch (error) {
      console.error("Error initializing simulation:", error);
    }

    // Cleanup on unmount
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links]); // CRITICAL: Only depend on nodes and links, NOT on the parameters

  // Update forces when parameters change, without reinitializing simulation
  useEffect(() => {
    if (!simulationRef.current || !isInitializedRef.current) return;
    
    try {
      console.log("Updating simulation forces:", { linkDistance, linkStrength, nodeCharge });
      
      // Update link force
      const linkForce = simulationRef.current.force("link") as d3.ForceLink<Node, Link>;
      if (linkForce) {
        linkForce.distance(linkDistance).strength(linkStrength);
      }
      
      // Update charge force
      const chargeForce = simulationRef.current.force("charge") as d3.ForceManyBody<Node>;
      if (chargeForce) {
        chargeForce.strength(nodeCharge);
      }
      
      // Update collision force based on node size
      const collisionForce = simulationRef.current.force("collision") as d3.ForceCollide<Node>;
      if (collisionForce) {
        // Adjust collision radius if nodeSize is being used in your app
        collisionForce.radius(d => 10);
      }
      
      // Apply a stronger restart to ensure changes are visible
      simulationRef.current.alpha(0.3).restart();
      console.log("Forces updated and simulation restarted with alpha 0.3");
      
      // Update drag behavior when fixNodesOnDrag changes
      if (svgRef.current) {
        setupDragBehavior();
      }
    } catch (error) {
      console.error("Error updating forces:", error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkDistance, linkStrength, nodeCharge, fixNodesOnDrag]);

  // Setup drag behavior as a separate function
  const setupDragBehavior = () => {
    if (!svgRef.current || !simulationRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const nodeElements = svg.selectAll<SVGCircleElement, SimulatedNode>(".node");
    const linkElements = svg.selectAll<SVGLineElement, Link>(".link");
    const labelElements = svg.selectAll<SVGTextElement, Node>(".node-label");
    
    // Create drag behavior
    const drag = d3.drag<SVGCircleElement, SimulatedNode>()
      .on("start", function(event, d) {
        if (!event.active && simulationRef.current) 
          simulationRef.current.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        d3.select(this).raise();
      })
      .on("drag", function(event, d) {
        d.fx = event.x;
        d.fy = event.y;
        
        // Update positions immediately for responsive dragging
        d3.select(this)
          .attr("cx", d.fx)
          .attr("cy", d.fy);
          
        // Update connected links
        linkElements
          .filter(l => {
            const source = typeof l.source === 'object' ? l.source.id : l.source;
            const target = typeof l.target === 'object' ? l.target.id : l.target;
            return source === d.id || target === d.id;
          })
          .each(function(l) {
            const element = d3.select(this);
            const isSource = (typeof l.source === 'object' ? l.source.id : l.source) === d.id;
            
            if (isSource) {
              element.attr("x1", d.fx).attr("y1", d.fy);
            } else {
              element.attr("x2", d.fx).attr("y2", d.fy);
            }
          });
          
        // Update the label position
        labelElements
          .filter(n => n.id === d.id)
          .attr("x", d.fx)
          .attr("y", d.fy);
      })
      .on("end", function(event, d) {
        if (!event.active && simulationRef.current) 
          simulationRef.current.alphaTarget(0);
        
        // Critical part: only release node if fixNodesOnDrag is false
        if (!fixNodesOnDrag) {
          d.fx = null;
          d.fy = null;
          
          // Give a small alpha boost to reposition nodes
          if (simulationRef.current)
            simulationRef.current.alpha(0.1).restart();
        }
      });
    
    // Apply drag behavior
    nodeElements.call(drag as d3.DragBehavior<SVGCircleElement, unknown, SimulatedNode>);
  };

  // Update forces without reinitializing simulation
  const updateForces = () => {
    if (!simulationRef.current) return;
    
    try {
      console.log("Updating forces with values:", { linkDistance, linkStrength, nodeCharge });
      
      // Update link force
      const linkForce = simulationRef.current.force("link") as d3.ForceLink<Node, Link>;
      if (linkForce) {
        linkForce.distance(linkDistance).strength(linkStrength);
      }
      
      // Update charge force
      const chargeForce = simulationRef.current.force("charge") as d3.ForceManyBody<Node>;
      if (chargeForce) {
        chargeForce.strength(nodeCharge);
      }
      
      // Update collision force based on node size
      const collisionForce = simulationRef.current.force("collision") as d3.ForceCollide<Node>;
      if (collisionForce) {
        collisionForce.radius(d => 10);
      }
      
      // Apply a stronger restart with higher alpha value to ensure changes are visible
      simulationRef.current.alpha(0.5).restart();
      console.log("Forces updated and simulation restarted with alpha 0.5");
    } catch (error) {
      console.error("Error updating forces:", error);
    }
  };

  // Function to reset simulation
  const resetSimulation = () => {
    if (!simulationRef.current || !svgRef.current) return;
    
    try {
      console.log("Resetting simulation");
      
      // Reset all fixed positions
      const svg = d3.select(svgRef.current);
      svg.selectAll<SVGCircleElement, SimulatedNode>(".node")
        .each(function(d) {
          d.fx = null;
          d.fy = null;
          // Also clear velocities for a complete reset
          d.vx = undefined;
          d.vy = undefined;
        });
      
      // Start with high alpha to reposition nodes
      simulationRef.current.alpha(1).restart();
    } catch (error) {
      console.error("Error resetting simulation:", error);
    }
  };

  // Function to update simulation parameters
  const updateSimulationParameters = ({ 
    linkDist, 
    linkStr, 
    charge 
  }: { 
    linkDist?: number, 
    linkStr?: number, 
    charge?: number 
  }) => {
    if (!simulationRef.current) return;
    
    try {
      console.log("Updating simulation parameters:", { linkDist, linkStr, charge });
      let needsRestart = false;
      
      // Update forces
      if (linkDist !== undefined || linkStr !== undefined) {
        const linkForce = simulationRef.current.force("link") as d3.ForceLink<Node, Link>;
        if (linkForce) {
          if (linkDist !== undefined) {
            linkForce.distance(linkDist);
            needsRestart = true;
          }
          if (linkStr !== undefined) {
            linkForce.strength(linkStr);
            needsRestart = true;
          }
        }
      }
      
      if (charge !== undefined) {
        const chargeForce = simulationRef.current.force("charge") as d3.ForceManyBody<Node>;
        if (chargeForce) {
          chargeForce.strength(charge);
          needsRestart = true;
        }
      }
      
      // Only restart if changes were made, but use higher alpha for more visible changes
      if (needsRestart) {
        simulationRef.current.alpha(0.5).restart();
        console.log("Simulation restarted with alpha 0.5 after parameter updates");
      }
    } catch (error) {
      console.error("Error updating simulation parameters:", error);
    }
  };

  return {
    simulation: simulationRef.current,
    resetSimulation,
    updateSimulationParameters
  };
};

export default useNetworkSimulation;