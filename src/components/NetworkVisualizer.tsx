import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, AlertCircle, Users, Share2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import NetworkVisualization from './NetworkVisualization';
import ArcVisualization from './ArcVisualization';
import { VisualizationType } from './NetworkSidebar';
import { NodeData, LinkData } from '@/types/types';



const NetworkVisualizer: React.FC = () => {
  return (
    <div>
      {/* Add your component's JSX here */}
      <h1>Network Visualizer</h1>
    </div>
  );
  const { toast } = useToast();
  const [step, setStep] = useState<'upload' | 'preview' | 'visualization'>('upload');
  const [nodeFile, setNodeFile] = useState<File | null>(null);
  const [linkFile, setLinkFile] = useState<File | null>(null);
  const [nodeData, setNodeData] = useState<NodeData[]>([]);
  const [linkData, setLinkData] = useState<LinkData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [visualizationType, setVisualizationType] = useState<VisualizationType>('network');
  const nodeInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  // File handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'node' | 'link') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (fileType === 'node') {
        setNodeFile(file);
        toast({
          title: "Node File Selected",
          description: `${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        });
      } else {
        setLinkFile(file);
        toast({
          title: "Link File Selected",
          description: `${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        });
      }
    }
  };

  // Parse CSV files
  const parseCSV = (fileContent: string): Record<string, string>[] => {
    const rows = fileContent.split('\n');
    const headers = rows[0].split(',').map(h => h.trim());
    
    return rows.slice(1).filter(row => row.trim() !== '').map(row => {
      const values = row.split(',');
      const rowData: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        rowData[header] = values[index] ? values[index].trim() : '';
      });
      
      return rowData;
    });
  };

  // Process files when both are selected
  useEffect(() => {
    if (nodeFile && linkFile) {
      processFiles();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeFile, linkFile]);

  const processFiles = async () => {
    setIsLoading(true);
    
    try {
      // Read and parse node file
      const nodeReader = new FileReader();
      nodeReader.onload = (nodeEvent: ProgressEvent<FileReader>) => {
        const nodeContent = nodeEvent.target?.result as string;
        const parsedNodes = parseCSV(nodeContent);
        
        // Read and parse link file
        const linkReader = new FileReader();
        linkReader.onload = (linkEvent: ProgressEvent<FileReader>) => {
          const linkContent = linkEvent.target?.result as string;
          const parsedLinks = parseCSV(linkContent);
          
          // Transform data for visualization
          const processedNodes = parsedNodes.map(node => ({
            id: node.id || node.name || node.Node || '',
            category: node.category || node.type || node.Category || 'default'
          }));
          
          const processedLinks = parsedLinks.map(link => ({
            source: link.source || link.Source || link.from || link.From || '',
            target: link.target || link.Target || link.to || link.To || ''
          }));
          
          setNodeData(processedNodes);
          setLinkData(processedLinks);
          setIsLoading(false);
          setStep('preview');
          
          toast({
            title: "Files Processed",
            description: `Processed ${processedNodes.length} nodes and ${processedLinks.length} links`,
          });
        };
        
        linkReader.readAsText(linkFile);
      };
      
      nodeReader.readAsText(nodeFile);
    } catch (error) {
      console.error("File processing error:", error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to process files. Please check file format.",
        variant: "destructive"
      });
    }
  };

  // Handle file upload submission
  const handleSubmit = () => {
    if (!nodeFile || !linkFile) {
      toast({
        title: "Missing Files",
        description: "Please select both node and link files.",
        variant: "destructive"
      });
      return;
    }
    
    processFiles();
  };

  // Proceed to visualization
  const handleVisualize = () => {
    setStep('visualization');
  };

  // Reset and go back to upload
  const handleReset = () => {
    setNodeFile(null);
    setLinkFile(null);
    setNodeData([]);
    setLinkData([]);
    setStep('upload');
  };

  // Handle visualization type change
  const handleVisualizationTypeChange = (type: VisualizationType) => {
    setVisualizationType(type);
    toast({
      title: "Visualization Changed",
      description: `Switched to ${type.charAt(0).toUpperCase() + type.slice(1)} Visualization`,
    });
  };

  // Demo data loader
  const loadDemoData = () => {
    setIsLoading(true);
    
    // Sample demo data
    const demoNodes: NodeData[] = [
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
    
    const demoLinks: LinkData[] = [
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
    
    setTimeout(() => {
      setNodeData(demoNodes);
      setLinkData(demoLinks);
      setIsLoading(false);
      setStep('visualization');
      
      toast({
        title: "Demo Data Loaded",
        description: "Sample network data has been loaded",
      });
    }, 1000);
  };

  // Render the appropriate visualization based on type
  const renderVisualization = () => {
    switch (visualizationType) {
      case 'network':
        return (
          <NetworkVisualization 
            onCreditsClick={() => {}} 
            nodeData={nodeData}
            linkData={linkData}
            visualizationType={visualizationType}
            onVisualizationTypeChange={handleVisualizationTypeChange}
          />
        );
 
      case 'arc':
        return (
          <ArcVisualization 
            onCreditsClick={() => {}} 
            nodeData={nodeData}
            linkData={linkData}
            visualizationType={visualizationType}
            onVisualizationTypeChange={handleVisualizationTypeChange}
          />
        );
      default:
        return (
          <NetworkVisualization 
            onCreditsClick={() => {}} 
            nodeData={nodeData}
            linkData={linkData}
            visualizationType={visualizationType}
            onVisualizationTypeChange={handleVisualizationTypeChange}
          />
        );
    }
  };

  // Rest of the component remains the same
  // ...
}

export default NetworkVisualizer;