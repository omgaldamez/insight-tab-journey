// DiagnosticButton.tsx - A utility to help diagnose data loading issues
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileSearch, AlertCircle, Info, Server } from "lucide-react";
import FilePathDebugger from "./FilePathDebugger";

interface DiagnosticButtonProps {
  className?: string;
}

const DiagnosticButton: React.FC<DiagnosticButtonProps> = ({ className }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("paths");

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={`flex items-center gap-1.5 ${className}`}
        onClick={handleOpenDialog}
      >
        <FileSearch className="h-4 w-4" />
        <span>Network Diagnostics</span>
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileSearch className="mr-2 h-5 w-5 text-primary" />
              Network Data Diagnostics
            </DialogTitle>
            <DialogDescription>
              Tools to help diagnose and fix network data loading issues.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            defaultValue="paths"
            value={activeTab}
            onValueChange={setActiveTab}
            className="mt-2"
          >
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="paths" className="flex items-center justify-center">
                <FileSearch className="mr-2 h-4 w-4" />
                <span>File Paths</span>
              </TabsTrigger>
              <TabsTrigger value="structure" className="flex items-center justify-center">
                <AlertCircle className="mr-2 h-4 w-4" />
                <span>Common Issues</span>
              </TabsTrigger>
              <TabsTrigger value="help" className="flex items-center justify-center">
                <Info className="mr-2 h-4 w-4" />
                <span>Help</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paths" className="py-2">
              <FilePathDebugger onClose={handleCloseDialog} />
            </TabsContent>

            <TabsContent value="structure" className="py-2">
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Common File Issues</h3>
                
                <div className="space-y-4">
                  <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                    <h4 className="text-amber-800 font-medium mb-2 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      CSV Format Issues
                    </h4>
                    <p className="text-sm text-amber-700 mb-2">
                      Make sure your CSV files are properly formatted:
                    </p>
                    <ul className="list-disc ml-5 text-sm text-amber-700">
                      <li>Files must have headers in the first row</li>
                      <li>Node files should have 'id' and 'category' columns (or equivalent)</li>
                      <li>Link files should have 'source' and 'target' columns (or equivalent)</li>
                      <li>Use commas as delimiters (not semicolons or tabs)</li>
                      <li>Enclose text with commas in double quotes: "text, with commas"</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                    <h4 className="text-blue-800 font-medium mb-2 flex items-center">
                      <Server className="h-4 w-4 mr-2" />
                      File Structure
                    </h4>
                    <p className="text-sm text-blue-700 mb-2">
                      Your files should be organized as follows:
                    </p>
                    <pre className="bg-blue-100 p-3 rounded text-xs font-mono text-blue-800 overflow-x-auto">
{`/public/
  └── data/
      ├── movies/
      │   ├── nodes.csv
      │   └── links.csv
      ├── social/
      │   ├── nodes.csv
      │   └── links.csv
      └── science/
          ├── nodes.csv
          └── links.csv`}
                    </pre>
                  </div>

                  <div className="bg-green-50 p-4 rounded-md border border-green-200">
                    <h4 className="text-green-800 font-medium mb-2">Example CSV Files</h4>
                    <p className="text-sm text-green-700 mb-2">Node file (nodes.csv):</p>
                    <pre className="bg-green-100 p-2 rounded text-xs font-mono text-green-800 overflow-x-auto">
                      id,category,label<br/>
                      node1,Person,John Doe<br/>
                      node2,Organization,Acme Corp<br/>
                      node3,Person,Jane Smith
                    </pre>
                    
                    <p className="text-sm text-green-700 mt-3 mb-2">Link file (links.csv):</p>
                    <pre className="bg-green-100 p-2 rounded text-xs font-mono text-green-800 overflow-x-auto">
                      source,target,relationship<br/>
                      node1,node2,works_at<br/>
                      node2,node3,employs<br/>
                      node1,node3,knows
                    </pre>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="help" className="py-2">
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Help & Troubleshooting</h3>
                
                <div className="bg-gray-50 p-5 rounded-md">
                  <h4 className="font-medium mb-3">Troubleshooting Steps</h4>
                  
                  <ol className="list-decimal ml-5 space-y-3 text-gray-700">
                    <li>
                      <strong>Check file locations:</strong> Make sure your CSV files are in the correct folders and have the right names.
                    </li>
                    <li>
                      <strong>Verify file formats:</strong> Check that your CSV files have the correct headers and format.
                    </li>
                    <li>
                      <strong>Browser console:</strong> Open your browser's developer tools (F12) and check the console for error messages.
                    </li>
                    <li>
                      <strong>Try a demo dataset:</strong> If real data isn't working, try one of the demo datasets to confirm the visualization works.
                    </li>
                    <li>
                      <strong>Network requests:</strong> In the browser dev tools, check the Network tab to see if file requests are succeeding.
                    </li>
                  </ol>
                </div>

                <div className="bg-gray-50 p-5 rounded-md">
                  <h4 className="font-medium mb-3">Additional Resources</h4>
                  
                  <ul className="list-disc ml-5 space-y-2 text-gray-700">
                    <li>
                      <a href="https://d3js.org/getting-started" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">D3.js Documentation</a> - The library used for network visualization
                    </li>
                    <li>
                      <a href="https://en.wikipedia.org/wiki/Comma-separated_values" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">CSV Format Reference</a> - Information about CSV file structure
                    </li>
                    <li>
                      <a href="https://gephi.org/" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Gephi</a> - Useful tool for creating and editing network graphs
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button onClick={handleCloseDialog}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DiagnosticButton;