import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Upload, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface FileUploaderProps {
  onBack: () => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onBack }) => {
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [nodeFile, setNodeFile] = useState<File | null>(null);
  const [linkFile, setLinkFile] = useState<File | null>(null);
  const nodeInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent, fileType: 'node' | 'link') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
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

  const handleVisualize = () => {
    // This is a placeholder - in a real implementation you would process the files
    toast({
      title: "This feature is coming soon",
      description: "File upload functionality is not yet implemented.",
    });
  };

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
        <h2 className="text-2xl font-bold">Upload Network Data Files</h2>
      </div>

      {/* Instructions */}
      <p className="text-gray-500 mb-8">
        Upload your node and link files to create a custom network visualization. 
        Supported formats: CSV or XLSX files.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Node File Uploader */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'node')}
        >
          <div className="flex flex-col items-center">
            <Upload className="h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-medium mb-2">Upload Node File</h3>
            <p className="text-gray-500 mb-4">
              Drag & drop a CSV/XLSX file, or click to browse
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
              accept=".csv,.xlsx,.xls"
              onChange={(e) => handleFileSelect(e, 'node')}
            />
            
            {nodeFile && (
              <div className="mt-4 p-3 bg-gray-100 rounded-md">
                <p className="text-sm">
                  Selected: <span className="font-medium">{nodeFile.name}</span>
                </p>
                <p className="text-xs text-gray-500">
                  {(nodeFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Link File Uploader */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'link')}
        >
          <div className="flex flex-col items-center">
            <Upload className="h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-medium mb-2">Upload Link File</h3>
            <p className="text-gray-500 mb-4">
              Drag & drop a CSV/XLSX file, or click to browse
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
              accept=".csv,.xlsx,.xls"
              onChange={(e) => handleFileSelect(e, 'link')}
            />
            
            {linkFile && (
              <div className="mt-4 p-3 bg-gray-100 rounded-md">
                <p className="text-sm">
                  Selected: <span className="font-medium">{linkFile.name}</span>
                </p>
                <p className="text-xs text-gray-500">
                  {(linkFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Requirements and Submit Button */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium mb-3">File Requirements</h3>
          <ul className="list-disc pl-5 text-gray-600 space-y-2 mb-4">
            <li>Node file must have at least <strong>id</strong> and <strong>category</strong> columns.</li>
            <li>Link file must have <strong>source</strong> and <strong>target</strong> columns.</li>
            <li>Source and target values in the link file should match node IDs in the node file.</li>
            <li>CSV files should use comma as separator.</li>
          </ul>
          
          <div className="mt-4">
            <Button 
              onClick={handleVisualize} 
              disabled={!nodeFile || !linkFile}
              className="w-full"
            >
              Create Visualization
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-center text-sm text-gray-500">
        <p>Note: This feature is currently in development and not yet fully functional.</p>
      </div>
    </div>
  );
};

export default FileUploader;