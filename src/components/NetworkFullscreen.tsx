import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, AlertCircle } from "lucide-react";
import NetworkVisualization from "./NetworkVisualization";
import { useToast } from "@/components/ui/use-toast";
import { NodeData, LinkData } from "@/types/types";
import { safeSessionRetrieve } from "@/utils/storageUtils";

const NetworkFullscreen: React.FC = () => {
  const [nodeData, setNodeData] = useState<NodeData[]>([]);
  const [linkData, setLinkData] = useState<LinkData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataWarning, setDataWarning] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load data from sessionStorage with our utility function
    try {
      const retrievedNodeData = safeSessionRetrieve<NodeData[]>("network_node_data");
      const retrievedLinkData = safeSessionRetrieve<LinkData[]>("network_link_data");
      
      // Check for node data
      if (retrievedNodeData && retrievedNodeData.length > 0) {
        setNodeData(retrievedNodeData);
        
        // Check if we have link data
        if (retrievedLinkData && retrievedLinkData.length > 0) {
          setLinkData(retrievedLinkData);
          
          // Add a warning if we only have partial link data
          if (retrievedNodeData.length > 10 && retrievedLinkData.length < retrievedNodeData.length / 2) {
            setDataWarning("Limited connection data is available. Some network relationships may not be displayed.");
          }
        } else {
          // No link data available
          setLinkData([]);
          setDataWarning("No connection data available. Only nodes are displayed.");
        }
        
        setIsLoading(false);
        
        toast({
          title: "Network Visualization Loaded",
          description: "Fullscreen mode is now active",
        });
      } else {
        // No node data available
        setIsLoading(false);
        toast({
          title: "Data Not Found",
          description: "No network data available. Please go back and try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error loading network data:", error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: `Failed to load network data: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleClose = () => {
    window.close();
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin"></div>
          <p className="text-gray-600">Loading network visualization...</p>
        </div>
      </div>
    );
  }

  if (nodeData.length === 0) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">No Data Available</h2>
          <p className="text-gray-500 mb-6">
            No network data was found. Please go back to the main page and try again.
          </p>
          <Button onClick={() => window.close()}>Close Window</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col">
      <div className="flex justify-between items-center p-4 bg-gray-800 text-white">
        <div className="flex items-center flex-wrap">
          <h1 className="text-xl font-semibold">Network Visualization - Fullscreen Mode</h1>
          
          {dataWarning && (
            <div className="ml-4 flex items-center text-amber-300 text-sm">
              <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
              <span>{dataWarning}</span>
            </div>
          )}
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-white hover:bg-gray-700"
          onClick={handleClose}
        >
          <X className="h-5 w-5 mr-1" />
          <span>Close</span>
        </Button>
      </div>
      
      <div className="flex-1 relative">
        <NetworkVisualization 
          onCreditsClick={() => {}} 
          nodeData={nodeData}
          linkData={linkData}
        />
      </div>
    </div>
  );
};

export default NetworkFullscreen;