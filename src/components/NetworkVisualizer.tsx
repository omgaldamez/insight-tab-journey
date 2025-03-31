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
    setVisualizationType(type as VisualizationType);
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
    // Cast the visualizationType to string to avoid type conflicts
    const typeAsString = visualizationType as string;
    
    switch (typeAsString) {
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
        
      // Handle all other types including 'nodeNav', 'rad360', 'arcLineal', '3d'
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

  // Render the component based on current step
  return (
    <div className="container mx-auto p-4">
      {step === 'upload' && (
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-4">Upload Network Data</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border border-dashed rounded-lg p-6 text-center">
                <div className="mb-4">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <h3 className="text-lg font-medium">Node Data File</h3>
                  <p className="text-sm text-gray-500 mb-2">Upload a CSV file with node data</p>
                </div>
                
                <input
                  type="file"
                  id="node-file"
                  ref={nodeInputRef}
                  className="hidden"
                  accept=".csv"
                  onChange={(e) => handleFileSelect(e, 'node')}
                />
                
                <Button
                  variant="outline"
                  onClick={() => nodeInputRef.current?.click()}
                  className="w-full"
                >
                  {nodeFile ? nodeFile.name : "Select Node File"}
                </Button>
              </div>
              
              <div className="border border-dashed rounded-lg p-6 text-center">
                <div className="mb-4">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <h3 className="text-lg font-medium">Link Data File</h3>
                  <p className="text-sm text-gray-500 mb-2">Upload a CSV file with link data</p>
                </div>
                
                <input
                  type="file"
                  id="link-file"
                  ref={linkInputRef}
                  className="hidden"
                  accept=".csv"
                  onChange={(e) => handleFileSelect(e, 'link')}
                />
                
                <Button
                  variant="outline"
                  onClick={() => linkInputRef.current?.click()}
                  className="w-full"
                >
                  {linkFile ? linkFile.name : "Select Link File"}
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
              <Button
                onClick={handleSubmit}
                disabled={!nodeFile || !linkFile || isLoading}
                className="sm:w-1/3"
              >
                {isLoading ? "Processing..." : "Process Files"}
              </Button>
              
              <Button
                variant="outline"
                onClick={loadDemoData}
                disabled={isLoading}
                className="sm:w-1/3"
              >
                Load Demo Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {step === 'preview' && (
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-4">Preview Network Data</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-2">Nodes ({nodeData.length})</h3>
                <div className="max-h-60 overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left font-medium p-2">ID</th>
                        <th className="text-left font-medium p-2">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nodeData.slice(0, 10).map((node, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{node.id}</td>
                          <td className="p-2">{node.category}</td>
                        </tr>
                      ))}
                      {nodeData.length > 10 && (
                        <tr className="border-t">
                          <td colSpan={2} className="p-2 text-center">
                            ...and {nodeData.length - 10} more
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-2">Links ({linkData.length})</h3>
                <div className="max-h-60 overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left font-medium p-2">Source</th>
                        <th className="text-left font-medium p-2">Target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkData.slice(0, 10).map((link, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{link.source}</td>
                          <td className="p-2">{link.target}</td>
                        </tr>
                      ))}
                      {linkData.length > 10 && (
                        <tr className="border-t">
                          <td colSpan={2} className="p-2 text-center">
                            ...and {linkData.length - 10} more
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between mt-4">
              <Button
                variant="outline"
                onClick={handleReset}
              >
                Back to Upload
              </Button>
              
              <Button
                onClick={handleVisualize}
              >
                Visualize Network
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {step === 'visualization' && (
        <div className="w-full h-[calc(100vh-8rem)]">
          {renderVisualization()}
        </div>
      )}
    </div>
  );
};

export default NetworkVisualizer;