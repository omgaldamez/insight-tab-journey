import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, AlertCircle, Users, Share2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import NetworkVisualization from './NetworkVisualization';
import RadialVisualization from './RadialVisualization';
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
      case 'radial':
        return (
          <RadialVisualization 
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

  // Render upload view
  if (step === 'upload') {
    return (
      <div className="max-w-6xl mx-auto py-8 space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Network Visualization</h2>
          <p className="text-gray-500">
            Upload your network data files or use our demo data to create an interactive visualization.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Node File Uploader */}
          <div className="border-2 border-dashed rounded-lg p-8 text-center transition-colors border-gray-300">
            <div className="flex flex-col items-center">
              <Users className="h-12 w-12 text-blue-500 mb-3" />
              <h3 className="text-lg font-medium mb-2">Upload Node File</h3>
              <p className="text-gray-500 mb-4">
                CSV with node ID and category columns
              </p>
              
              <Button 
                onClick={() => nodeInputRef.current?.click()} 
                variant="outline" 
                size="lg" 
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                <span>Select Node File</span>
              </Button>
              
              <input
                ref={nodeInputRef}
                type="file"
                className="hidden"
                accept=".csv"
                onChange={(e) => handleFileSelect(e, 'node')}
              />
              
              {nodeFile && (
                <div className="mt-4 p-3 bg-gray-100 rounded-md">
                  <p className="text-sm">
                    Selected: <span className="font-medium">{nodeFile.name}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Link File Uploader */}
          <div className="border-2 border-dashed rounded-lg p-8 text-center transition-colors border-gray-300">
            <div className="flex flex-col items-center">
              <Share2 className="h-12 w-12 text-green-500 mb-3" />
              <h3 className="text-lg font-medium mb-2">Upload Link File</h3>
              <p className="text-gray-500 mb-4">
                CSV with source and target columns
              </p>
              
              <Button 
                onClick={() => linkInputRef.current?.click()} 
                variant="outline" 
                size="lg" 
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                <span>Select Link File</span>
              </Button>
              
              <input
                ref={linkInputRef}
                type="file"
                className="hidden"
                accept=".csv"
                onChange={(e) => handleFileSelect(e, 'link')}
              />
              
              {linkFile && (
                <div className="mt-4 p-3 bg-gray-100 rounded-md">
                  <p className="text-sm">
                    Selected: <span className="font-medium">{linkFile.name}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-4">
            <Button 
              onClick={handleSubmit} 
              disabled={!nodeFile || !linkFile || isLoading}
              className="px-8"
            >
              {isLoading ? (
                <>
                  <span className="mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Processing...
                </>
              ) : "Create Visualization"}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={loadDemoData}
              disabled={isLoading}
            >
              Use Demo Data
            </Button>
          </div>
          
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>Node file must have ID and category columns. Link file must have source and target columns.</span>
          </div>
        </div>
      </div>
    );
  }
  
  // Render preview
  if (step === 'preview') {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <h2 className="text-2xl font-bold mb-4">Data Preview</h2>
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-3">
                <Users className="h-5 w-5 text-blue-500 mr-2" />
                <h3 className="font-medium">Nodes ({nodeData.length})</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {nodeData.slice(0, 5).map((node, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm">{node.id}</td>
                        <td className="px-4 py-2 text-sm">{node.category}</td>
                      </tr>
                    ))}
                    {nodeData.length > 5 && (
                      <tr>
                        <td colSpan={2} className="px-4 py-2 text-sm text-center text-gray-500">
                          + {nodeData.length - 5} more nodes
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-3">
                <Share2 className="h-5 w-5 text-green-500 mr-2" />
                <h3 className="font-medium">Links ({linkData.length})</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {linkData.slice(0, 5).map((link, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm">{link.source}</td>
                        <td className="px-4 py-2 text-sm">{link.target}</td>
                      </tr>
                    ))}
                    {linkData.length > 5 && (
                      <tr>
                        <td colSpan={2} className="px-4 py-2 text-sm text-center text-gray-500">
                          + {linkData.length - 5} more links
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-center gap-4">
          <Button onClick={handleReset} variant="outline">
            Back
          </Button>
          <Button onClick={handleVisualize}>
            Proceed to Visualization
          </Button>
        </div>
      </div>
    );
  }
  
  // Render visualization
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Network Visualization</h2>
        <Button variant="outline" onClick={handleReset}>
          Upload Different Files
        </Button>
      </div>
      
      {nodeData.length > 0 && linkData.length > 0 ? (
        renderVisualization()
      ) : (
        <div className="w-full h-[calc(100vh-14rem)] rounded-lg border border-border overflow-hidden flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">No Data Available</h3>
            <p className="text-gray-500 mb-4">There is no data to visualize. Please upload node and link files.</p>
            <Button onClick={handleReset}>Upload Files</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkVisualizer;