import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Upload, FileText, Eye, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import FileCard from "./FileCard";
import FileStatsModal from "./FileStatsModal";
import { FileInfo, NodeData, LinkData } from "@/types/types";
import { parseCSV, detectFileType, processNodeData, processLinkData } from "@/utils/fileUtils";
import * as XLSX from 'xlsx';

interface FileUploaderProps {
  onBack: () => void;
  onVisualize?: (nodeData: NodeData[], linkData: LinkData[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onBack, onVisualize }) => {
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [nodeFile, setNodeFile] = useState<File | null>(null);
  const [linkFile, setLinkFile] = useState<File | null>(null);
  const [nodeFileInfo, setNodeFileInfo] = useState<FileInfo | null>(null);
  const [linkFileInfo, setLinkFileInfo] = useState<FileInfo | null>(null);
  const [nodeData, setNodeData] = useState<NodeData[]>([]);
  const [linkData, setLinkData] = useState<LinkData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [viewMode, setViewMode] = useState<'upload' | 'cards' | 'processing'>('upload');
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

  const processFile = async (file: File, fileType: 'node' | 'link') => {
    const fileTypeDetected = detectFileType(file);
    
    if (fileTypeDetected === 'unknown') {
      toast({
        title: "Unsupported File Type",
        description: "Please upload CSV or Excel files only.",
        variant: "destructive"
      });
      return;
    }

    try {
      let data: Record<string, string | number>[] = [];
      
      if (fileTypeDetected === 'csv') {
        const text = await file.text();
        data = parseCSV(text);
      } else if (fileTypeDetected === 'excel') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
      }

      if (data.length === 0) {
        toast({
          title: "Empty File",
          description: "The uploaded file appears to be empty.",
          variant: "destructive"
        });
        return;
      }

      const fileInfo: FileInfo = {
        name: file.name,
        rowCount: data.length,
        columnCount: data.length > 0 ? Object.keys(data[0]).length : 0,
        sampleRows: data.slice(0, 5)
      };

      if (fileType === 'node') {
        setNodeFile(file);
        setNodeFileInfo(fileInfo);
        const processedData = processNodeData(data);
        setNodeData(processedData);
        toast({
          title: "Node File Processed",
          description: `${file.name} - ${data.length} nodes loaded`,
        });
      } else {
        setLinkFile(file);
        setLinkFileInfo(fileInfo);
        const processedData = processLinkData(data);
        setLinkData(processedData);
        toast({
          title: "Link File Processed",
          description: `${file.name} - ${data.length} links loaded`,
        });
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error Processing File",
        description: `Failed to process ${file.name}: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    }
  };

  const handleDrop = async (e: React.DragEvent, fileType: 'node' | 'link') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setIsProcessing(true);
      await processFile(file, fileType);
      setIsProcessing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'node' | 'link') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsProcessing(true);
      await processFile(file, fileType);
      setIsProcessing(false);
      // Reset the input
      e.target.value = '';
    }
  };

  const handleViewFiles = () => {
    if (nodeFileInfo && linkFileInfo) {
      setViewMode('cards');
    }
  };

  const handleShowStats = () => {
    if (nodeFileInfo && linkFileInfo) {
      setShowStatsModal(true);
    }
  };

  const handleVisualize = () => {
    if (onVisualize && nodeData.length > 0 && linkData.length > 0) {
      onVisualize(nodeData, linkData);
    } else {
      toast({
        title: "Missing Data",
        description: "Please upload both node and link files before creating visualization.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveFile = (fileType: 'node' | 'link') => {
    if (fileType === 'node') {
      setNodeFile(null);
      setNodeFileInfo(null);
      setNodeData([]);
    } else {
      setLinkFile(null);
      setLinkFileInfo(null);
      setLinkData([]);
    }
    
    toast({
      title: "File Removed",
      description: `${fileType === 'node' ? 'Node' : 'Link'} file has been removed.`,
    });
  };

  const handleBackToUpload = () => {
    setViewMode('upload');
  };

  // Show file cards view
  if (viewMode === 'cards' && nodeFileInfo && linkFileInfo) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToUpload}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Upload
            </Button>
            <h2 className="text-2xl font-bold">Uploaded Files</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>

        {/* File Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <FileCard
            title={nodeFileInfo.name}
            description={`Node data with ${nodeFileInfo.rowCount} entries`}
            author="Uploaded"
            fileType="nodes"
            rowCount={nodeFileInfo.rowCount}
            columnCount={nodeFileInfo.columnCount}
            onSelect={() => handleRemoveFile('node')}
            buttonText="Remove File"
          />
          <FileCard
            title={linkFileInfo.name}
            description={`Link data with ${linkFileInfo.rowCount} connections`}
            author="Uploaded"
            fileType="links"
            rowCount={linkFileInfo.rowCount}
            columnCount={linkFileInfo.columnCount}
            onSelect={() => handleRemoveFile('link')}
            buttonText="Remove File"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button onClick={handleShowStats} variant="outline" className="gap-2">
            <Eye className="h-4 w-4" />
            Preview Data
          </Button>
          <Button onClick={handleVisualize} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Create Visualization
          </Button>
        </div>

        {/* Stats Modal */}
        <FileStatsModal
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
          nodeFile={nodeFileInfo}
          linkFile={linkFileInfo}
          onProceed={handleVisualize}
        />
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
            dragActive ? "border-blue-500 bg-blue-50" : nodeFile ? "border-green-500 bg-green-50" : "border-gray-300"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'node')}
        >
          <div className="flex flex-col items-center">
            {nodeFile ? (
              <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
            ) : (
              <Upload className="h-12 w-12 text-gray-400 mb-3" />
            )}
            <h3 className="text-lg font-medium mb-2">
              {nodeFile ? "Node File Uploaded" : "Upload Node File"}
            </h3>
            <p className="text-gray-500 mb-4">
              {nodeFile ? "File processed successfully" : "Drag & drop a CSV/XLSX file, or click to browse"}
            </p>
            
            <Button 
              onClick={() => nodeInputRef.current?.click()} 
              variant={nodeFile ? "outline" : "outline"}
              size="lg" 
              className="gap-2"
              disabled={isProcessing}
            >
              <FileText className="h-4 w-4" />
              <span>{nodeFile ? "Replace File" : "Select Node File"}</span>
            </Button>
            
            <input
              ref={nodeInputRef}
              type="file"
              className="hidden"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => handleFileSelect(e, 'node')}
            />
            
            {nodeFile && nodeFileInfo && (
              <div className="mt-4 p-3 bg-green-100 rounded-md w-full">
                <p className="text-sm">
                  <span className="font-medium">{nodeFile.name}</span>
                </p>
                <p className="text-xs text-gray-600">
                  {nodeFileInfo.rowCount} rows × {nodeFileInfo.columnCount} columns
                </p>
                <p className="text-xs text-gray-500">
                  {(nodeFile.size / 1024).toFixed(1)} KB
                </p>
                <Button 
                  onClick={() => handleRemoveFile('node')}
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs h-6"
                >
                  Remove
                </Button>
              </div>
            )}
            
            {isProcessing && (
              <div className="mt-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Processing...</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Link File Uploader */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? "border-blue-500 bg-blue-50" : linkFile ? "border-green-500 bg-green-50" : "border-gray-300"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'link')}
        >
          <div className="flex flex-col items-center">
            {linkFile ? (
              <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
            ) : (
              <Upload className="h-12 w-12 text-gray-400 mb-3" />
            )}
            <h3 className="text-lg font-medium mb-2">
              {linkFile ? "Link File Uploaded" : "Upload Link File"}
            </h3>
            <p className="text-gray-500 mb-4">
              {linkFile ? "File processed successfully" : "Drag & drop a CSV/XLSX file, or click to browse"}
            </p>
            
            <Button 
              onClick={() => linkInputRef.current?.click()} 
              variant={linkFile ? "outline" : "outline"}
              size="lg" 
              className="gap-2"
              disabled={isProcessing}
            >
              <FileText className="h-4 w-4" />
              <span>{linkFile ? "Replace File" : "Select Link File"}</span>
            </Button>
            
            <input
              ref={linkInputRef}
              type="file"
              className="hidden"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => handleFileSelect(e, 'link')}
            />
            
            {linkFile && linkFileInfo && (
              <div className="mt-4 p-3 bg-green-100 rounded-md w-full">
                <p className="text-sm">
                  <span className="font-medium">{linkFile.name}</span>
                </p>
                <p className="text-xs text-gray-600">
                  {linkFileInfo.rowCount} rows × {linkFileInfo.columnCount} columns
                </p>
                <p className="text-xs text-gray-500">
                  {(linkFile.size / 1024).toFixed(1)} KB
                </p>
                <Button 
                  onClick={() => handleRemoveFile('link')}
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs h-6"
                >
                  Remove
                </Button>
              </div>
            )}
            
            {isProcessing && (
              <div className="mt-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Processing...</span>
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
          
          <div className="mt-4 flex gap-3">
            <Button 
              onClick={handleViewFiles} 
              disabled={!nodeFile || !linkFile}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Eye className="h-4 w-4" />
              View Files
            </Button>
            <Button 
              onClick={handleVisualize} 
              disabled={!nodeFile || !linkFile || isProcessing}
              className="flex-1 gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Create Visualization
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Success message when both files are uploaded */}
      {nodeFile && linkFile && !isProcessing && (
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-800 text-sm">
            <CheckCircle className="h-4 w-4 mr-2" />
            Both files uploaded successfully! Ready to create visualization.
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;