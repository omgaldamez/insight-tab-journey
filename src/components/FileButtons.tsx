import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Maximize2, Minimize2 } from "lucide-react";
import { NodeData, LinkData } from "@/types/types";
import { Node, Link } from "@/types/networkTypes";
import { useToast } from "@/components/ui/use-toast";
import { downloadNodeAsText, downloadNodeAsJson } from './TooltipUtils';

// Define browser-specific fullscreen methods
// Instead of extending Document, we'll create a type that has all the browser-specific methods
type FullscreenDocument = {
  exitFullscreen: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
  fullscreenElement: Element | null;
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
};

// For the element, we'll add browser-specific methods
type FullscreenElement = HTMLElement & {
  requestFullscreen: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
};

interface FileButtonsProps {
  onDownloadData: (format: string) => void;
  onDownloadGraph: (format: string) => void;
  onResetSelection: () => void;
  nodeData: NodeData[];
  linkData: LinkData[];
  selectedNode?: Node | null;
  links?: Link[];
}

const FileButtons: React.FC<FileButtonsProps> = ({
  onDownloadData,
  onDownloadGraph,
  onResetSelection,
  nodeData,
  linkData,
  selectedNode = null,
  links = []
}) => {
  const { toast } = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle fullscreen for the visualization container
  const toggleFullscreen = () => {
    const container = document.getElementById('network-visualization-container') as FullscreenElement;
    
    if (!container) {
      console.error("Could not find network visualization container");
      toast({
        title: "Error",
        description: "Could not find visualization container for fullscreen mode",
        variant: "destructive"
      });
      return;
    }
    
    if (!isFullscreen) {
      // Enter fullscreen
      if (container.requestFullscreen) {
        container.requestFullscreen().then(() => {
          setIsFullscreen(true);
          toast({
            title: "Fullscreen Mode",
            description: "Press ESC or click Exit to return to normal view",
          });
        }).catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
          toast({
            title: "Fullscreen Error",
            description: `Could not enter fullscreen: ${err.message}`,
            variant: "destructive"
          });
        });
      } else if (container.mozRequestFullScreen) { // Firefox
        try {
          container.mozRequestFullScreen();
          setIsFullscreen(true);
        } catch (err) {
          console.error(`Error in Firefox fullscreen: ${err}`);
        }
      } else if (container.webkitRequestFullscreen) { // Chrome, Safari, Opera
        try {
          container.webkitRequestFullscreen();
          setIsFullscreen(true);
        } catch (err) {
          console.error(`Error in WebKit fullscreen: ${err}`);
        }
      } else if (container.msRequestFullscreen) { // IE/Edge
        try {
          container.msRequestFullscreen();
          setIsFullscreen(true);
        } catch (err) {
          console.error(`Error in MS fullscreen: ${err}`);
        }
      }
    } else {
      // Exit fullscreen
      const doc = document as unknown as FullscreenDocument;
      
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(err => {
          console.error(`Error attempting to exit fullscreen: ${err}`);
        });
      } else if (doc.mozCancelFullScreen) { // Firefox
        try {
          doc.mozCancelFullScreen();
        } catch (err) {
          console.error(`Error in Firefox exit fullscreen: ${err}`);
        }
      } else if (doc.webkitExitFullscreen) { // Chrome, Safari, Opera
        try {
          doc.webkitExitFullscreen();
        } catch (err) {
          console.error(`Error in WebKit exit fullscreen: ${err}`);
        }
      } else if (doc.msExitFullscreen) { // IE/Edge
        try {
          doc.msExitFullscreen();
        } catch (err) {
          console.error(`Error in MS exit fullscreen: ${err}`);
        }
      }
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen change events from escape key or other methods
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as unknown as FullscreenDocument;
      const isCurrentlyFullscreen = 
        !!doc.fullscreenElement || 
        !!doc.webkitFullscreenElement || 
        !!doc.mozFullScreenElement || 
        !!doc.msFullscreenElement;
      
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className="absolute top-4 right-4 flex gap-2 z-10">
      {/* Fullscreen button */}
      <Button 
        variant="outline" 
        size="sm"
        className="bg-white/90 text-black border-none hover:bg-white flex items-center gap-1.5"
        onClick={toggleFullscreen}
        title={isFullscreen ? "Exit fullscreen" : "Toggle fullscreen"}
      >
        {isFullscreen ? (
          <>
            <Minimize2 className="h-4 w-4" />
            <span>Exit</span>
          </>
        ) : (
          <>
            <Maximize2 className="h-4 w-4" />
            <span>Fullscreen</span>
          </>
        )}
      </Button>

      {/* Download Data dropdown - UPDATED with node data options */}
      <div className="relative group">
        <Button 
          variant="outline" 
          size="sm"
          className="bg-white/90 text-black border-none hover:bg-white flex items-center gap-1.5"
        >
          <Download className="h-4 w-4" />
          <span>Data</span>
        </Button>
        <div className="absolute hidden group-hover:block right-0 top-full bg-white rounded-md shadow-lg overflow-hidden min-w-32 z-10">
          <button 
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
            onClick={() => onDownloadData('csv')}
          >
            CSV
          </button>
          <button 
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
            onClick={() => onDownloadData('xlsx')}
          >
            XLSX
          </button>
          
          {/* Add node data download options for all users */}
          {selectedNode && links.length > 0 ? (
            <>
              {/* Show node-specific text when a node is selected */}
              <div className="py-1 px-4 text-xs text-gray-500 border-t border-gray-200">
                Selected Node: {selectedNode.id}
              </div>
              <button 
                className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
                onClick={() => downloadNodeAsText(selectedNode, links)}
              >
                Node Data as Text
              </button>
              <button 
                className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
                onClick={() => downloadNodeAsJson(selectedNode, links)}
              >
                Node Data as JSON
              </button>
            </>
          ) : (
            <>
              {/* Show disabled state when no node is selected */}
              <button 
                className="block w-full text-left px-4 py-2 text-gray-400 cursor-not-allowed text-sm"
                disabled
              >
                Node Data as Text
              </button>
              <button 
                className="block w-full text-left px-4 py-2 text-gray-400 cursor-not-allowed text-sm"
                disabled
              >
                Node Data as JSON
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Download Image dropdown */}
      <div className="relative group">
        <Button 
          variant="outline" 
          size="sm"
          className="bg-white/90 text-black border-none hover:bg-white flex items-center gap-1.5"
        >
          <Download className="h-4 w-4" />
          <span>Image</span>
        </Button>
        <div className="absolute hidden group-hover:block right-0 top-full bg-white rounded-md shadow-lg overflow-hidden min-w-32 z-10">
          <button 
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
            onClick={() => onDownloadGraph('svg')}
          >
            SVG
          </button>
          <button 
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
            onClick={() => onDownloadGraph('png')}
          >
            PNG
          </button>
          <button 
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
            onClick={() => onDownloadGraph('jpg')}
          >
            JPG
          </button>
          <button 
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
            onClick={() => onDownloadGraph('pdf')}
          >
            PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileButtons;