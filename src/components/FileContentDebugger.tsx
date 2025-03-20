// FileContentDebugger.tsx - Using folder configuration
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, FileText, AlertCircle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { dataFolders, demoFolders } from '../utils/folderConfig';

interface ParsedRow {
  [key: string]: string;
}

interface ParseResult {
  headers: string[];
  rowCount: number;
  sampleRows: ParsedRow[];
}

interface FileData {
  path: string;
  content: string | null;
  size: number;
  success: boolean;
  error?: string;
  parseResult?: ParseResult;
  parseError?: string;
  headers?: string[];
}

interface FileContentDebuggerProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: string;
}

const FileContentDebugger: React.FC<FileContentDebuggerProps> = ({
  isOpen,
  onClose,
  folderId,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<Record<string, FileData>>({});
  const [activeTab, setActiveTab] = useState<string>("nodes");

  /**
   * Get the folder name with proper casing from the lowercased id
   */
  function getFolderNameById(id: string): string {
    const folder = dataFolders.find(f => f.id === id);
    return folder ? folder.name : id.charAt(0).toUpperCase() + id.slice(1);
  }

  useEffect(() => {
    if (!isOpen) return;
    
    const fetchFileContents = async () => {
      setIsLoading(true);
      const results: Record<string, FileData> = {};
      
      // File types to check
      const fileTypes = [
        { key: "nodes", filename: "nodes.csv" }, 
        { key: "links", filename: "links.csv" }
      ];
      
      // Get the properly cased folder name
      const folderName = getFolderNameById(folderId);
      
      // Your specific path
      const basePath = `/public/src-data/${folderName}/`;
      
      for (const fileType of fileTypes) {
        let fileData: FileData | null = null;
        const path = `${basePath}${fileType.filename}`;
        
        try {
          console.log(`Attempting to fetch: ${path}`);
          const response = await fetch(path);
          
          if (response.ok) {
            const content = await response.text();
            
            // IMPORTANT: Check if we got HTML instead of CSV
            if (content.trim().toLowerCase().startsWith('<!doctype html>') || 
                content.trim().toLowerCase().startsWith('<html')) {
              console.warn(`Received HTML instead of CSV from ${path}`);
              
              fileData = {
                path,
                content: null,
                size: 0,
                success: false,
                error: `File at ${path} returned HTML instead of CSV data`
              };
            } else {
              const size = new Blob([content]).size;
              
              fileData = {
                path,
                content,
                size,
                success: true,
                headers: content.split('\n')[0]?.split(',').map(h => h.trim()) || []
              };
              
              // Try to parse the CSV
              try {
                const lines = content.trim().split('\n');
                const headers = lines[0].split(',').map(h => h.trim());
                
                const parsedRows: ParsedRow[] = [];
                for (let i = 1; i < Math.min(6, lines.length); i++) {
                  if (lines[i].trim() === '') continue;
                  
                  const values = lines[i].split(',').map(v => v.trim());
                  const row: Record<string, string> = {};
                  
                  headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                  });
                  
                  parsedRows.push(row);
                }
                
                fileData.parseResult = {
                  headers,
                  rowCount: lines.length - 1,
                  sampleRows: parsedRows
                };
                
                // For display purposes only - don't validate column names
                // Just note which columns are being used
                const isNodeFile = fileType.key === "nodes";
                
                if (headers.length >= 2) {
                  const firstColumn = headers[0];
                  const secondColumn = headers[1];
                  
                  // Log which columns are being used
                  if (isNodeFile) {
                    console.log(`Using '${firstColumn}' as ID column and '${secondColumn}' as category column`);
                  } else {
                    console.log(`Using '${firstColumn}' as source column and '${secondColumn}' as target column`);
                  }
                }
                
              } catch (parseErr) {
                console.error(`Error parsing ${fileType.filename}:`, parseErr);
                fileData.parseError = `Parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`;
              }
              
              console.log(`✅ Successfully fetched ${fileType.filename} from: ${path}`);
            }
          } else {
            fileData = {
              path,
              content: null,
              size: 0,
              success: false,
              error: `HTTP error ${response.status}: ${response.statusText}`
            };
          }
        } catch (error) {
          console.warn(`Error fetching ${path}:`, error);
          fileData = {
            path,
            content: null,
            size: 0,
            success: false,
            error: `Fetch error: ${error instanceof Error ? error.message : String(error)}`
          };
        }
        
        // Store the result
        results[fileType.key] = fileData || {
          path,
          content: null,
          size: 0,
          success: false,
          error: `Could not fetch ${fileType.filename} for folder "${folderId}"`
        };
      }
      
      setFiles(results);
      setIsLoading(false);
    };
    
    fetchFileContents();
  }, [isOpen, folderId]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-primary" />
            File Content Inspector
          </DialogTitle>
          <DialogDescription>
            Examining raw file content for folder: <span className="font-medium">{folderId}</span>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
            <p>Loading file contents...</p>
          </div>
        ) : (
          <div className="my-4">
            <Tabs defaultValue="nodes" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="nodes" className="flex items-center justify-center">
                  <span className="flex items-center">
                    {files.nodes?.success ? (
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
                    )}
                    nodes.csv
                  </span>
                </TabsTrigger>
                <TabsTrigger value="links" className="flex items-center justify-center">
                  <span className="flex items-center">
                    {files.links?.success ? (
                      <Check className="mr-2 h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
                    )}
                    links.csv
                  </span>
                </TabsTrigger>
              </TabsList>

              {Object.keys(files).map((fileKey) => (
                <TabsContent key={fileKey} value={fileKey} className="py-2">
                  {files[fileKey].success ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-medium">
                            {fileKey === 'nodes' ? 'nodes.csv' : 'links.csv'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {formatBytes(files[fileKey].size)} • 
                            {files[fileKey].parseResult ? 
                              ` ${files[fileKey].parseResult.rowCount} rows` : 
                              ' Unknown row count'}
                          </p>
                        </div>
                        
                        <div>
                          {files[fileKey].parseError ? (
                            <Badge variant="destructive" className="ml-2">
                              {files[fileKey].parseError}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 ml-2">
                              Valid CSV
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-1">Found at:</h4>
                        <div className="bg-gray-100 p-2 rounded text-xs font-mono overflow-x-auto">
                          {files[fileKey].path}
                        </div>
                      </div>

                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-1">Headers:</h4>
                        <div className="flex flex-wrap gap-1">
                          {files[fileKey].headers?.map((header, index) => (
                            <Badge 
                              key={header} 
                              variant="outline"
                              className={`
                                ${fileKey === 'nodes' && index === 0 ? 'bg-blue-50 text-blue-700' : ''}
                                ${fileKey === 'nodes' && index === 1 ? 'bg-green-50 text-green-700' : ''}
                                ${fileKey === 'links' && index === 0 ? 'bg-blue-50 text-blue-700' : ''}
                                ${fileKey === 'links' && index === 1 ? 'bg-green-50 text-green-700' : ''}
                              `}
                            >
                              {header}
                              {fileKey === 'nodes' && index === 0 && " (used as ID)"}
                              {fileKey === 'nodes' && index === 1 && " (used as Category)"}
                              {fileKey === 'links' && index === 0 && " (used as Source)"}
                              {fileKey === 'links' && index === 1 && " (used as Target)"}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {files[fileKey].parseResult && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium mb-1">Sample Data:</h4>
                          <div className="border rounded-md overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  {files[fileKey].parseResult.headers.map((header: string, index: number) => (
                                    <th 
                                      key={header} 
                                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                      {header}
                                      {fileKey === 'nodes' && index === 0 && " (ID)"}
                                      {fileKey === 'nodes' && index === 1 && " (Category)"}
                                      {fileKey === 'links' && index === 0 && " (Source)"}
                                      {fileKey === 'links' && index === 1 && " (Target)"}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {files[fileKey].parseResult.sampleRows.map((row, index) => (
                                  <tr key={index}>
                                    {files[fileKey].parseResult?.headers.map((header: string) => (
                                      <td 
                                        key={`${index}-${header}`} 
                                        className="px-3 py-2 text-sm text-gray-500"
                                      >
                                        {row[header]}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Showing {files[fileKey].parseResult.sampleRows.length} of {files[fileKey].parseResult.rowCount} rows
                          </p>
                        </div>
                      )}

                      <div>
                        <h4 className="text-sm font-medium mb-1">Raw Content (first 500 chars):</h4>
                        <div className="bg-gray-100 p-3 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                          {files[fileKey].content?.substring(0, 500)}
                          {files[fileKey].content && files[fileKey].content.length > 500 ? '...' : ''}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-red-50 rounded-md">
                      <AlertCircle className="h-10 w-10 mx-auto mb-3 text-red-500" />
                      <h3 className="text-lg font-medium text-red-700 mb-2">
                        File Not Found
                      </h3>
                      <p className="text-red-600 mb-4">
                        {files[fileKey].error}
                      </p>
                      <div className="bg-white p-3 rounded-md text-left text-sm">
                        <h4 className="font-medium mb-2">File Path Being Checked:</h4>
                        <code className="block bg-gray-100 p-2 rounded mb-4">
                          {files[fileKey].path}
                        </code>
                        
                        <h4 className="font-medium mb-2">Expected File Structure:</h4>
                        <ul className="list-disc pl-5 space-y-1 text-gray-700">
                          <li>Your folder name should be: <code className="bg-gray-100 px-1">{getFolderNameById(folderId)}</code></li>
                          <li>File name should be: <code className="bg-gray-100 px-1">{fileKey === 'links' ? 'links.csv' : 'nodes.csv'}</code></li>
                          <li>Full path should be: <code className="bg-gray-100 px-1">/public/src-data/{getFolderNameById(folderId)}/{fileKey === 'links' ? 'links.csv' : 'nodes.csv'}</code></li>
                        </ul>
                      </div>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        <DialogFooter className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            <strong>Note:</strong> First two columns are automatically used as ID/Category or Source/Target
          </div>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FileContentDebugger;