import React from "react";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";
import { NodeData, LinkData } from "@/types/types";
import { safeSessionStore } from "@/utils/storageUtils";

interface OpenFullscreenButtonProps {
  nodeData: NodeData[];
  linkData: LinkData[];
  className?: string;
}

const OpenFullscreenButton: React.FC<OpenFullscreenButtonProps> = ({
  nodeData,
  linkData,
  className
}) => {
  // Function to open the network visualization in a new tab
  const handleOpenInNewTab = () => {
    try {
      // Use the safe storage utility to handle large data sets
      const nodeDataStored = safeSessionStore("network_node_data", nodeData);
      const linkDataStored = safeSessionStore("network_link_data", linkData);
      
      if (!nodeDataStored) {
        throw new Error("Failed to store node data - may be too large");
      }
      
      // Open a new tab with the fullscreen view
      window.open("/network-fullscreen", "_blank");
    } catch (error) {
      console.error("Error opening fullscreen view:", error);
      alert(`Failed to open fullscreen view: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={`bg-white/90 text-black border-none hover:bg-white flex items-center gap-1.5 ${className || ""}`}
      onClick={handleOpenInNewTab}
      title="Open in new tab"
    >
      <Maximize2 className="h-4 w-4" />
      <span>Fullscreen</span>
    </Button>
  );
};

export default OpenFullscreenButton;