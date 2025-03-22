// Enhanced NetworkExplorer.tsx
import React, { useState, useEffect } from "react";
import WelcomeSelector from "./WelcomeSelector";
import VisualizationCoordinator from "./VisualizationCoordinator"; // Importar el coordinador
import { NodeData, LinkData } from "@/types/types";
import { loadNodeData, loadLinkData } from "@/utils/fileReader";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";

interface NetworkExplorerProps {
  onCreditsClick: () => void;
}

const NetworkExplorer: React.FC<NetworkExplorerProps> = ({ onCreditsClick }) => {
  const { toast } = useToast();
  const [view, setView] = useState<"welcome" | "visualization" | "error">("welcome");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [nodeData, setNodeData] = useState<NodeData[]>([]);
  const [linkData, setLinkData] = useState<LinkData[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Load data for selected folder and initialize visualization
  const loadVisualizationData = async (folderId: string, isDemoData = false) => {
    try {
      setIsLoading(true);
      setSelectedFolder(folderId);
      setIsDemo(isDemoData);
      setErrorMessage("");
      
      toast({
        title: "Loading Data",
        description: `Fetching ${isDemoData ? 'demo' : ''} data from "${folderId}"...`,
      });
      
      console.log(`Loading visualization data for folder: ${folderId}, isDemo: ${isDemoData}`);
      
      // Load data in parallel
      const [nodes, links] = await Promise.all([
        loadNodeData(folderId, isDemoData).catch(error => {
          console.error(`Error loading node data for ${folderId}:`, error);
          throw new Error(`Failed to load node data: ${error.message}`);
        }),
        loadLinkData(folderId, isDemoData).catch(error => {
          console.error(`Error loading link data for ${folderId}:`, error);
          throw new Error(`Failed to load link data: ${error.message}`);
        })
      ]);
      
      console.log(`✅ Successfully loaded data for ${folderId}:`, {
        nodeCount: nodes.length,
        linkCount: links.length
      });
      
      // Validate the data
      if (!nodes || nodes.length === 0) {
        throw new Error(`No node data found for folder "${folderId}"`);
      }
      
      if (!links || links.length === 0) {
        throw new Error(`No link data found for folder "${folderId}"`);
      }
      
      // Debug: Log a sample of the data
      console.log("Sample node data:", nodes.slice(0, 3));
      console.log("Sample link data:", links.slice(0, 3));
      
      // Set the data and view
      setNodeData(nodes);
      setLinkData(links);
      setIsLoading(false);
      setView("visualization");
      
      toast({
        title: `${isDemoData ? "Demo" : "Dataset"} Loaded`,
        description: `Loaded ${nodes.length} nodes and ${links.length} links from "${folderId}"`
      });
      
    } catch (error) {
      console.error("Error loading visualization data:", error);
      setIsLoading(false);
      setView("error");
      setErrorMessage(error instanceof Error ? error.message : String(error));
      
      toast({
        title: "Error Loading Data",
        description: error instanceof Error ? error.message : "Failed to load data for visualization",
        variant: "destructive"
      });
    }
  };

  // Handle returning to welcome screen
  const handleBackToWelcome = () => {
    setView("welcome");
    setSelectedFolder(null);
    setIsDemo(false);
    setErrorMessage("");
  };

  // Render based on current view
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="w-full min-h-[500px] flex items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-12 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Loading network data...</p>
            <p className="text-xs text-gray-500">From: {selectedFolder}</p>
          </div>
        </div>
      );
    }
    
    if (view === "error") {
      return (
        <div className="w-full min-h-[500px] flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-4 bg-red-100 rounded-full p-3 w-16 h-16 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Data Loading Error</h2>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            <Button onClick={handleBackToWelcome}>
              Return to Datasets
            </Button>
          </div>
        </div>
      );
    }
    
    if (view === "visualization") {
      return (
        <>
          <div className="flex justify-between items-center mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBackToWelcome}
              className="flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Datasets
            </Button>
            <div className="flex items-center">
              <h2 className="text-2xl font-bold">
                {selectedFolder ? selectedFolder.charAt(0).toUpperCase() + selectedFolder.slice(1).replace(/-/g, ' ') : 'Network Visualization'}
              </h2>
              {isDemo && (
                <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                  Demo
                </span>
              )}
            </div>
          </div>
          
          {/* Usar el coordinador de visualizaciones en lugar de NetworkVisualization directamente */}
          <VisualizationCoordinator 
            onCreditsClick={onCreditsClick}
            nodeData={nodeData}
            linkData={linkData}
          />
        </>
      );
    }
    
    // Default view is welcome
    return <WelcomeSelector onSelectFolder={loadVisualizationData} />;
  };

  return (
    <div className="container mx-auto">
      {renderContent()}
    </div>
  );
};

export default NetworkExplorer;