// Updated DataFolderSelector.tsx with original grid layout
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, InfoIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import FileStatsModal from "./FileStatsModal";
import { FileInfo } from "@/types/types";
import { 
  getDataFolders, 
  getDemoFolders,
  getNodeFileInfo, 
  getLinkFileInfo
} from "@/utils/fileReader";
import FolderCard from "./FolderCard";

interface DataFolder {
  id: string;
  name: string;
  description: string;
  authors: string;
}

interface FolderDetail {
  nodeCount: number | string;
  linkCount: number | string;
  lastUpdated: string;
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

interface DataFolderSelectorProps {
  onSelectFolder: (folderId: string, isDemo?: boolean) => void;
  onBack: () => void;
  isDemo?: boolean;
}

const DataFolderSelector: React.FC<DataFolderSelectorProps> = ({ 
  onSelectFolder, 
  onBack,
  isDemo = false 
}) => {
  const { toast } = useToast();
  const [dataFolders, setDataFolders] = useState<DataFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [nodeFileInfo, setNodeFileInfo] = useState<FileInfo | null>(null);
  const [linkFileInfo, setLinkFileInfo] = useState<FileInfo | null>(null);
  const [folderDetails, setFolderDetails] = useState<Record<string, FolderDetail>>({});
  const [loadingFolder, setLoadingFolder] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Load available data folders from data directory or demo folders
  useEffect(() => {
    const loadDataFolders = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        
        // Get folders using appropriate utility function based on isDemo flag
        const folders = isDemo 
          ? await getDemoFolders() 
          : await getDataFolders();
        
        setDataFolders(folders);
        console.log(`Loaded ${isDemo ? 'demo' : ''} folders:`, folders);
        
        // For each folder, try to get some basic stats for the card display
        const details: Record<string, FolderDetail> = {};
        
        // First set initial values to avoid UI jumping
        folders.forEach(folder => {
          details[folder.id] = {
            nodeCount: '...',
            linkCount: '...',
            lastUpdated: 'Loading...',
            isLoading: true
          };
        });
        setFolderDetails(details);
        
        // Then load actual data
        for (const folder of folders) {
          try {
            console.log(`Loading details for folder: ${folder.id}`);
            // Try to get node and link file info in parallel
            const [nodeInfo, linkInfo] = await Promise.all([
              getNodeFileInfo(folder.id, isDemo).catch(error => {
                console.error(`Error getting node info for ${folder.id}:`, error);
                return null;
              }),
              getLinkFileInfo(folder.id, isDemo).catch(error => {
                console.error(`Error getting link info for ${folder.id}:`, error);
                return null;
              })
            ]);
            
            console.log(`Folder ${folder.id} info:`, { nodeInfo, linkInfo });
            
            if (nodeInfo && linkInfo) {
              details[folder.id] = {
                nodeCount: nodeInfo.rowCount,
                linkCount: linkInfo.rowCount,
                lastUpdated: new Date().toLocaleDateString(),
                isLoading: false
              };
            } else {
              details[folder.id] = {
                nodeCount: nodeInfo ? nodeInfo.rowCount : '?',
                linkCount: linkInfo ? linkInfo.rowCount : '?',
                lastUpdated: 'Files incomplete',
                isLoading: false,
                hasError: true,
                errorMessage: 'Some files are missing or invalid'
              };
            }
            
            // Update state immediately for each folder to show progress
            setFolderDetails({...details});
          } catch (error) {
            console.error(`Error getting details for folder ${folder.id}:`, error);
            details[folder.id] = {
              nodeCount: '?',
              linkCount: '?',
              lastUpdated: 'Error',
              isLoading: false,
              hasError: true,
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            };
            setFolderDetails({...details});
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error(`Error loading ${isDemo ? 'demo' : ''} folders:`, error);
        setIsLoading(false);
        setErrorMessage(error instanceof Error ? error.message : String(error));
        toast({
          title: "Error",
          description: `Failed to load ${isDemo ? 'demo' : ''} folders: ${error instanceof Error ? error.message : String(error)}`,
          variant: "destructive"
        });
      }
    };

    loadDataFolders();
  }, [toast, isDemo]);

  // Handle folder selection
  const handleFolderSelect = async (folderId: string) => {
    try {
      setSelectedFolder(folderId);
      setLoadingFolder(folderId);
      
      const folder = dataFolders.find(f => f.id === folderId);
      
      if (!folder) {
        throw new Error("Folder not found");
      }
      
      console.log(`Selected folder: ${folderId}`);
      toast({
        title: "Loading folder data",
        description: `Loading data from "${folder.name}"...`
      });
      
      // Get file information for the selected folder
      console.log("Getting node file info...");
      const nodeInfo = await getNodeFileInfo(folderId, isDemo);
      console.log("Node file info:", nodeInfo);
      
      console.log("Getting link file info...");
      const linkInfo = await getLinkFileInfo(folderId, isDemo);
      console.log("Link file info:", linkInfo);
      
      setNodeFileInfo(nodeInfo);
      setLinkFileInfo(linkInfo);
      setLoadingFolder(null);
      
      // Open the stats modal
      setIsStatsModalOpen(true);
      
    } catch (error) {
      console.error("Error loading folder data:", error);
      setLoadingFolder(null);
      toast({
        title: "Error",
        description: `Failed to load data from folder "${folderId}": ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    }
  };

  // Handle closing the stats modal
  const handleCloseStatsModal = () => {
    setIsStatsModalOpen(false);
    setSelectedFolder(null);
  };

  // Handle proceeding to visualization
  const handleProceedToVisualization = () => {
    if (!selectedFolder) {
      toast({
        title: "Error",
        description: "No folder selected",
        variant: "destructive"
      });
      return;
    }
    
    setIsStatsModalOpen(false);
    onSelectFolder(selectedFolder, isDemo);
    
    toast({
      title: "Loading visualization",
      description: "Preparing network visualization...",
    });
  };

  // Loading state
  if (isLoading && dataFolders.length === 0) {
    return (
      <div className="w-full min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading {isDemo ? 'demo' : 'data'} folders...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (errorMessage && dataFolders.length === 0) {
    return (
      <div className="w-full min-h-[500px] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-4 bg-red-100 rounded-full p-3 w-16 h-16 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Error Loading Folders</h2>
          <p className="text-gray-600 mb-4">{errorMessage}</p>
          <Button 
            variant="outline" 
            onClick={onBack}
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Header with back button */}
      <div className="flex items-center mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h2 className="text-2xl font-bold">
          {isDemo ? "Demo Datasets" : "Available Datasets"}
        </h2>
      </div>

      {/* Introduction text */}
      <p className="text-gray-500 mb-2">
        {isDemo 
          ? "Explore these pre-generated sample datasets to see different network visualization capabilities."
          : "Select a dataset to visualize from your data directory. Each dataset contains node and link files."
        }
      </p>
      
      {/* CSV Information Note */}
      <div className="flex items-start gap-2 p-2 mb-6 text-sm text-blue-700 bg-blue-50 rounded-md">
        <InfoIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">File Format Note:</p>
          <p>Your CSV files should have at least 2 columns. For nodes.csv, the first two columns will be used as ID and Category. For links.csv, the first two columns will be used as Source and Target.</p>
          <p className="mt-1">Click the magnifying glass icon on any folder card to inspect its file contents.</p>
        </div>
      </div>

      {/* Data folder cards - using the original 3-column grid */}
      {dataFolders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dataFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              id={folder.id}
              name={folder.name}
              description={folder.description}
              author={folder.authors}
              details={folderDetails[folder.id]}
              isDemo={isDemo}
              isLoading={loadingFolder === folder.id}
              onSelect={() => handleFolderSelect(folder.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium mb-2">No Datasets Found</h3>
          <p className="text-gray-500">
            {isDemo 
              ? "Demo datasets are not available."
              : "No datasets were found in your data directory."
            }
          </p>
        </div>
      )}

      {/* Stats Modal */}
      {nodeFileInfo && linkFileInfo && (
        <FileStatsModal
          isOpen={isStatsModalOpen}
          onClose={handleCloseStatsModal}
          nodeFile={nodeFileInfo}
          linkFile={linkFileInfo}
          onProceed={handleProceedToVisualization}
        />
      )}
    </div>
  );
};

export default DataFolderSelector;
