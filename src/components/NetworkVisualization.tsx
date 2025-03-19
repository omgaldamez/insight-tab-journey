
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip } from "@/components/ui/tooltip";
import { TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  Info, 
  Download, 
  AlertCircle 
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface NetworkVisualizationProps {
  onCreditsClick: () => void;
}

const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({ onCreditsClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [simulationRunning, setSimulationRunning] = useState(true);
  const [linkDistance, setLinkDistance] = useState(100);
  const [linkStrength, setLinkStrength] = useState(1);
  const [nodeCharge, setNodeCharge] = useState(-100);
  const { toast } = useToast();

  // Simulation would be created here with D3
  useEffect(() => {
    // This is a placeholder for the D3 visualization implementation
    // In a real application, you would:
    // 1. Load CSV data using d3.csv
    // 2. Process the data for nodes and links
    // 3. Create a force simulation
    // 4. Add zoom and pan functionality
    // 5. Implement interactions like hover and click

    const timer = setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Network Loaded",
        description: "Interactive visualization is now ready",
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [toast]);

  const handleResetSimulation = () => {
    // Reset simulation parameters
    setLinkDistance(100);
    setLinkStrength(1);
    setNodeCharge(-100);
    
    toast({
      title: "Simulation Reset",
      description: "Parameters have been reset to default values",
    });
    
    // Would trigger D3 simulation restart in a real implementation
  };

  const handleDownloadSVG = () => {
    if (svgRef.current) {
      // This is a placeholder for SVG download functionality
      // In a real implementation, you would:
      // 1. Clone the SVG
      // 2. Set necessary styles and attributes
      // 3. Convert to a data URL
      // 4. Trigger download

      toast({
        title: "Download Started",
        description: "Your network visualization is being downloaded",
      });
    }
  };

  const handleParameterChange = (type: string, value: number) => {
    switch (type) {
      case "linkDistance":
        setLinkDistance(value);
        break;
      case "linkStrength":
        setLinkStrength(value);
        break;
      case "nodeCharge":
        setNodeCharge(value);
        break;
      default:
        break;
    }
    
    // Would update D3 force simulation in a real implementation
  };

  return (
    <div className="w-full h-[calc(100vh-14rem)] rounded-lg border border-border overflow-hidden bg-card relative">
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <div className="flex flex-col items-center gap-3">
            <div className="loading-spinner" />
            <p className="text-sm text-muted-foreground animate-pulse">Loading Network Data...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="graph-controls">
            <div className="flex gap-2 mb-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      onClick={() => console.log("Zoom in")}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom In</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      onClick={() => console.log("Zoom out")}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom Out</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      onClick={handleResetSimulation}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset Simulation</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="space-y-4 w-52 p-2 bg-background/60 rounded-md backdrop-blur-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Link Distance</label>
                  <span className="text-xs text-muted-foreground">{linkDistance}</span>
                </div>
                <Slider
                  value={[linkDistance]}
                  min={30}
                  max={300}
                  step={1}
                  onValueChange={(vals) => handleParameterChange("linkDistance", vals[0])}
                />
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Link Strength</label>
                  <span className="text-xs text-muted-foreground">{linkStrength.toFixed(2)}</span>
                </div>
                <Slider
                  value={[linkStrength]}
                  min={0}
                  max={2}
                  step={0.01}
                  onValueChange={(vals) => handleParameterChange("linkStrength", vals[0])}
                />
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Node Charge</label>
                  <span className="text-xs text-muted-foreground">{nodeCharge}</span>
                </div>
                <Slider
                  value={[Math.abs(nodeCharge)]}
                  min={0}
                  max={500}
                  step={1}
                  onValueChange={(vals) => handleParameterChange("nodeCharge", -vals[0])}
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="secondary" 
                      size="icon"
                      onClick={handleDownloadSVG}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download SVG</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="secondary" 
                      size="icon"
                      onClick={onCreditsClick}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View Credits</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          <div 
            ref={containerRef} 
            className="graph-container"
          >
            <svg 
              ref={svgRef} 
              className="w-full h-full"
            >
              {/* D3 will insert SVG elements here */}
              {/* This is placeholder for the visualization */}
              <g className="links"></g>
              <g className="nodes"></g>
            </svg>
          </div>
          
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-background/90 p-2 rounded-md text-xs backdrop-blur-sm">
            <AlertCircle className="h-4 w-4 text-primary" />
            <span>Hover over nodes to see details. Drag to reposition.</span>
          </div>
        </>
      )}
    </div>
  );
};

export default NetworkVisualization;
