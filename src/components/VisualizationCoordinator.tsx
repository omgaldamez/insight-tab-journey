import React, { useState, useEffect, useRef } from 'react';
import { NodeData, LinkData } from '@/types/types';
import NetworkVisualization from './NetworkVisualization';
import { useToast } from "@/components/ui/use-toast";
import { VisualizationType } from './NetworkSidebar';

interface VisualizationCoordinatorProps {
  nodeData: NodeData[];
  linkData: LinkData[];
  onCreditsClick: () => void;
}

const VisualizationCoordinator: React.FC<VisualizationCoordinatorProps> = ({
  nodeData,
  linkData,
  onCreditsClick
}) => {
  const { toast } = useToast();
  
  // Add state for fix nodes on drag behavior
  const [fixNodesOnDrag, setFixNodesOnDrag] = useState(true);
  // Add state for visualization type
  const [visualizationType, setVisualizationType] = useState<VisualizationType>('network');

  // Handler for toggling node fixing behavior
  const handleToggleFixNodes = () => {
    setFixNodesOnDrag(prev => !prev);
    toast({
      title: fixNodesOnDrag ? "Nodes now follow simulation" : "Nodes now stay fixed",
      description: fixNodesOnDrag 
        ? "Nodes will return to simulation flow after dragging" 
        : "Nodes will remain where you drop them"
    });
  };

  // Handler for visualization type change
  const handleVisualizationTypeChange = (type: VisualizationType) => {
    setVisualizationType(type);
    toast({
      title: `Switched to ${type} visualization`,
      description: `Now viewing the network as a ${type} graph.`
    });
  };

  return (
    <div className="w-full h-[calc(100vh-14rem)] rounded-lg border border-border overflow-hidden bg-card flex">
      <NetworkVisualization
        onCreditsClick={onCreditsClick}
        nodeData={nodeData}
        linkData={linkData}
        fixNodesOnDrag={fixNodesOnDrag}
        visualizationType={visualizationType}
        onVisualizationTypeChange={handleVisualizationTypeChange}
      />
    </div>
  );
};

export default VisualizationCoordinator;