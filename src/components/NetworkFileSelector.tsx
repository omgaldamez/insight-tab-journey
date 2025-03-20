import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, AlertCircle, Users, Share2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import FileStatsModal from "./FileStatsModal";
import NetworkVisualization from "./NetworkVisualization";
import { NodeData, LinkData, FileInfo } from "@/types/types"; // Import from proper path

// Sample data for movie networks
const movieNodes: NodeData[] = [
  { id: "películas", category: "Tema" },
  { id: "Son como niños", category: "Película" },
  { id: "Forrest Gump", category: "Película" },
  { id: "Sr. y Sra. Smith", category: "Película" }
  // ... other nodes
];

const movieLinks: LinkData[] = [
  { source: "películas", target: "Son como niños" },
  { source: "películas", target: "Forrest Gump" },
  { source: "películas", target: "Sr. y Sra. Smith" }
  // ... other links
];

// Define type for the sample files
interface SampleFile {
  id: string;
  title: string;
  description: string;
  author: string;
  fileType: "nodes" | "links";
  fileName: string;
  rowCount: number;
  columnCount: number;
  data: NodeData[] | LinkData[];
}

// Sample files
const sampleFiles: SampleFile[] = [
  {
    id: "1",
    title: "Movie Characters Network",
    description: "A network of movie characters and their relationships",
    author: "John Doe",
    fileType: "nodes",
    fileName: "movie_nodes.csv",
    rowCount: 29,
    columnCount: 2,
    data: movieNodes
  },
  {
    id: "2",
    title: "Movie Characters Connections",
    description: "Links between movie characters and their relationships",
    author: "John Doe",
    fileType: "links",
    fileName: "movie_links.csv",
    rowCount: 32,
    columnCount: 2,
    data: movieLinks
  },
  {
    id: "3",
    title: "TV Show Characters",
    description: "A network of TV show characters",
    author: "Jane Smith",
    fileType: "nodes",
    fileName: "tv_nodes.csv",
    rowCount: 45,
    columnCount: 2,
    data: []
  },
  {
    id: "4",
    title: "TV Show Connections",
    description: "Links between TV show characters",
    author: "Jane Smith",
    fileType: "links",
    fileName: "tv_links.csv",
    rowCount: 60,
    columnCount: 2,
    data: []
  }
];

// Simple FileCard component
const FileCard = ({ title, description, author, fileType, rowCount, columnCount, onSelect }) => {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            {fileType === "nodes" ? (
              <Users className="h-5 w-5 text-blue-500 mr-2" />
            ) : (
              <Share2 className="h-5 w-5 text-green-500 mr-2" />
            )}
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            fileType === "nodes" 
              ? "bg-blue-100 text-blue-800" 
              : "bg-green-100 text-green-800"
          }`}>
            {fileType === "nodes" ? "Nodes" : "Links"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <p className="text-sm text-gray-500 line-clamp-2 h-10">{description}</p>
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Author: {author}</span>
            <span>{rowCount} rows × {columnCount} cols</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-2">
        <Button onClick={onSelect} className="w-full" variant="default" size="sm">
          Select File
        </Button>
      </CardFooter>
    </Card>
  );
};

// Simple file uploader component
const FileUploader = ({ onFileProcessed }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
      }`}
    >
      <div className="flex flex-col items-center">
        <Upload className="h-12 w-12 text-gray-400 mb-3" />
        <h3 className="text-lg font-medium mb-2">Upload Network Data Files</h3>
        <p className="text-gray-500 mb-4">
          Drag & drop a CSV file, or click to browse
        </p>
        
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6 max-w-md">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Upload nodes file (with id and category columns) and links file (with source and target columns)</span>
        </div>
        
        <Button onClick={handleButtonClick} variant="outline" size="lg" className="gap-2">
          <FileText className="h-4 w-4" />
          <span>Browse Files</span>
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".csv,.xlsx,.xls"
          onChange={() => {
            toast({
              title: "File Selected",
              description: "For demo purposes, please use the pre-loaded sample files below.",
            });
          }}
        />
      </div>
    </div>
  );
};

const NetworkFileSelector = () => {
  const { toast } = useToast();
  const [selectedNodeFile, setSelectedNodeFile] = useState<FileInfo | null>(null);
  const [selectedLinkFile, setSelectedLinkFile] = useState<FileInfo | null>(null);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const [nodeData, setNodeData] = useState<NodeData[]>([]);
  const [linkData, setLinkData] = useState<LinkData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Auto-load sample data immediately when component mounts
  useEffect(() => {
    console.log("Auto-loading sample data...");
    
    // Add more sample data to make the visualization more interesting
    const extendedMovieNodes = [
      { id: "películas", category: "Tema" },
      { id: "Son como niños", category: "Película" },
      { id: "Forrest Gump", category: "Película" },
      { id: "Sr. y Sra. Smith", category: "Película" },
      { id: "Actores", category: "Tema" },
      { id: "Adam Sandler", category: "Actor" },
      { id: "Tom Hanks", category: "Actor" },
      { id: "Brad Pitt", category: "Actor" },
      { id: "Angelina Jolie", category: "Actor" }
    ];
    
    const extendedMovieLinks = [
      { source: "películas", target: "Son como niños" },
      { source: "películas", target: "Forrest Gump" },
      { source: "películas", target: "Sr. y Sra. Smith" },
      { source: "Actores", target: "Adam Sandler" },
      { source: "Actores", target: "Tom Hanks" },
      { source: "Actores", target: "Brad Pitt" },
      { source: "Actores", target: "Angelina Jolie" },
      { source: "Adam Sandler", target: "Son como niños" },
      { source: "Tom Hanks", target: "Forrest Gump" },
      { source: "Brad Pitt", target: "Sr. y Sra. Smith" },
      { source: "Angelina Jolie", target: "Sr. y Sra. Smith" }
    ];
    
    // Directly set the node and link data
    setNodeData(extendedMovieNodes);
    setLinkData(extendedMovieLinks);
    
    // Create the corresponding file info objects
    setSelectedNodeFile({
      name: "nodes.csv",
      rowCount: extendedMovieNodes.length,
      columnCount: 2,
      sampleRows: extendedMovieNodes.slice(0, 5) as Record<string, string | number>[]
    });
    
    setSelectedLinkFile({
      name: "links.csv",
      rowCount: extendedMovieLinks.length,
      columnCount: 2,
      sampleRows: extendedMovieLinks.slice(0, 5) as Record<string, string | number>[]
    });
    
    // Add a short delay then proceed to visualization
    setTimeout(() => {
      console.log("Proceeding to visualization with:", 
        { nodeCount: extendedMovieNodes.length, linkCount: extendedMovieLinks.length });
      setIsLoading(false);
      handleProceedToVisualization();
    }, 1000);
  }, []); // Only run once on mount

  // Handle file selection
  const handleFileSelect = (fileId: string) => {
    const selectedFile = sampleFiles.find(file => file.id === fileId);
    
    if (selectedFile) {
      if (selectedFile.fileType === "nodes") {
        setSelectedNodeFile({
          name: selectedFile.fileName,
          rowCount: selectedFile.rowCount,
          columnCount: selectedFile.columnCount,
          sampleRows: selectedFile.data.slice(0, 5) as Record<string, string | number>[]
        });
        setNodeData(selectedFile.data as NodeData[]);
      } else {
        setSelectedLinkFile({
          name: selectedFile.fileName,
          rowCount: selectedFile.rowCount,
          columnCount: selectedFile.columnCount,
          sampleRows: selectedFile.data.slice(0, 5) as Record<string, string | number>[]
        });
        setLinkData(selectedFile.data as LinkData[]);
      }
    }
  };

  // Check if we can show the stats modal
  useEffect(() => {
    if (selectedNodeFile && selectedLinkFile) {
      setIsStatsModalOpen(true);
    }
  }, [selectedNodeFile, selectedLinkFile]);

  // Skip the modal for demo purposes (optional)
  useEffect(() => {
    if (selectedNodeFile && selectedLinkFile && !showVisualization) {
      // Automatically proceed to visualization after a short delay
      setTimeout(() => {
        handleProceedToVisualization();
      }, 500);
    }
  }, [selectedNodeFile, selectedLinkFile, showVisualization]);

  // Handle "Proceed to Visualization" button click
  const handleProceedToVisualization = () => {
    setIsStatsModalOpen(false);
    setShowVisualization(true);
  };

  // Reset everything for choosing different files
  const handleReset = () => {
    setSelectedNodeFile(null);
    setSelectedLinkFile(null);
    setShowVisualization(false);
  };

  if (showVisualization) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Network Visualization</h2>
          <Button variant="outline" onClick={handleReset}>
            Choose Different Files
          </Button>
        </div>
        
        <NetworkVisualization 
          onCreditsClick={() => {}} 
          nodeData={nodeData}
          linkData={linkData}
        />
      </div>
    );
  }

  // Show loading screen or welcome page
  if (isLoading || nodeData.length === 0 || linkData.length === 0) {
    return (
      <div className="w-full h-[calc(100vh-14rem)] rounded-lg border border-border overflow-hidden bg-card flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <h2 className="text-xl font-bold mb-4">Loading Network Visualization</h2>
          <p className="text-gray-500 mb-4">
            Sample data is being loaded automatically. Please wait...
          </p>
          
          {/* Added a loading spinner */}
          <div className="flex justify-center items-center my-6">
            <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
          </div>
          
          {/* Button to manually trigger loading if automatic loading fails */}
          <Button
            variant="default"
            size="lg"
            className="mt-2"
            onClick={() => {
              // Manually trigger sample file selection
              const nodeFile = sampleFiles.find(file => file.fileType === "nodes" && file.id === "1");
              const linkFile = sampleFiles.find(file => file.fileType === "links" && file.id === "2");
              
              if (nodeFile && linkFile) {
                handleFileSelect(nodeFile.id);
                handleFileSelect(linkFile.id);
                
                toast({
                  title: "Loading sample data",
                  description: "Sample network data is being prepared for visualization",
                });
              }
            }}
          >
            Load Sample Data Now
          </Button>
        </div>
      </div>
    );
  }

  // Regular file selection view (should never be shown due to auto-loading)
  return (
    <div className="space-y-6 bg-background p-4">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Network Visualization</h1>
        <p className="text-gray-500">
          Upload or select node and link files to create an interactive network visualization.
        </p>
      </div>
  
      {/* File uploader */}
      <div className="border-2 border-dashed rounded-lg p-8 text-center border-gray-300">
        <div className="flex flex-col items-center">
          <Upload className="h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-medium mb-2">Upload Network Data Files</h3>
          <p className="text-gray-500 mb-4">
            Drag & drop a CSV file, or click to browse
          </p>
          
          <Button variant="outline" size="lg" className="gap-2">
            <FileText className="h-4 w-4" />
            <span>Browse Files</span>
          </Button>
        </div>
      </div>
  
      {/* Sample files section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold">Available Files</h2>
        
        {/* Node files section */}
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-3">Node Files</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sampleFiles
              .filter(file => file.fileType === "nodes")
              .map(file => (
                <FileCard
                  key={file.id}
                  title={file.title}
                  description={file.description}
                  author={file.author}
                  fileType={file.fileType}
                  rowCount={file.rowCount}
                  columnCount={file.columnCount}
                  onSelect={() => handleFileSelect(file.id)}
                />
              ))}
          </div>
        </div>
  
        {/* Link files section */}
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-3">Link Files</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sampleFiles
              .filter(file => file.fileType === "links")
              .map(file => (
                <FileCard
                  key={file.id}
                  title={file.title}
                  description={file.description}
                  author={file.author}
                  fileType={file.fileType}
                  rowCount={file.rowCount}
                  columnCount={file.columnCount}
                  onSelect={() => handleFileSelect(file.id)}
                />
              ))}
          </div>
        </div>
      </div>
  
      {/* File stats modal */}
      {selectedNodeFile && selectedLinkFile && (
        <FileStatsModal
          isOpen={isStatsModalOpen}
          onClose={() => setIsStatsModalOpen(false)}
          nodeFile={selectedNodeFile}
          linkFile={selectedLinkFile}
          onProceed={handleProceedToVisualization}
        />
      )}
    </div>
  );
};

export default NetworkFileSelector;