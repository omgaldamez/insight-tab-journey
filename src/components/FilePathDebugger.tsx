// FilePathDebugger.tsx - A utility component to debug file paths
import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface FilePathDebuggerProps {
  onClose: () => void;
}

/**
 * This component helps debug file path issues by testing various paths
 * to find where the data files might be located.
 */
const FilePathDebugger: React.FC<FilePathDebuggerProps> = ({ onClose }) => {
  const [results, setResults] = useState<Record<string, { success: boolean, content?: string }>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const testPaths = async () => {
      setIsLoading(true);
      const testResults: Record<string, { success: boolean, content?: string }> = {};
      
      // Known folders to test
      const folders = ['movies', 'social', 'science', 'companies'];
      // Known file types to test
      const fileTypes = ['nodes.csv', 'links.csv'];
      // Common base paths to try
      const basePaths = [
        '',
        '/',
        '/data/',
        'data/',
        '/public/data/',
        'public/data/',
        '/public/',
        'public/',
        '/assets/data/',
        'assets/data/',
        window.location.origin + '/',
        window.location.origin + '/data/'
      ];
      
      // Test a few combinations
      for (const folder of folders) {
        for (const fileType of fileTypes) {
          for (const basePath of basePaths) {
            const fullPath = `${basePath}${folder}/${fileType}`;
            
            try {
              console.log(`Testing path: ${fullPath}`);
              const response = await fetch(fullPath, { method: 'HEAD' });
              
              testResults[fullPath] = {
                success: response.ok,
              };
              
              // Only get content for successful text files to avoid too many requests
              if (response.ok) {
                try {
                  const contentResponse = await fetch(fullPath);
                  const text = await contentResponse.text();
                  const previewLength = Math.min(text.length, 100);
                  testResults[fullPath].content = text.substring(0, previewLength) + 
                    (text.length > previewLength ? '...' : '');
                } catch (e) {
                  console.error(`Error fetching content for ${fullPath}:`, e);
                }
              }
            } catch (error) {
              console.warn(`Error testing ${fullPath}:`, error);
              testResults[fullPath] = { success: false };
            }
            
            // Update results as we go for better UX
            setResults({...testResults});
          }
        }
      }
      
      setIsLoading(false);
    };
    
    testPaths();
  }, []);
  
  // Group results by success status
  const successfulPaths = Object.entries(results)
    .filter(([_, result]) => result.success)
    .map(([path, result]) => ({ path, ...result }));
    
  const failedPaths = Object.entries(results)
    .filter(([_, result]) => !result.success)
    .map(([path, _]) => path);

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertCircle className="mr-2 h-5 w-5 text-orange-500" />
          File Path Debugger
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          This utility tests different file paths to locate your data files. This helps identify where your files should be placed.
        </p>
        
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500">Testing file paths...</p>
            <p className="text-xs text-gray-400 mt-1">
              Tested {Object.keys(results).length} paths so far
            </p>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center">
              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
              Successful Paths ({successfulPaths.length})
            </h3>
            
            {successfulPaths.length > 0 ? (
              <div className="border rounded-md mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Path</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Content Preview</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {successfulPaths.map(({ path, content }) => (
                      <tr key={path}>
                        <td className="px-4 py-2 text-sm font-mono break-all">{path}</td>
                        <td className="px-4 py-2 text-sm max-w-xs truncate font-mono">
                          {content || 'No content preview'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-orange-500 mb-6 p-4 bg-orange-50 rounded-md">
                No successful paths found. Your files might be in a different location or have different names.
              </p>
            )}
            
            <h3 className="text-lg font-medium mb-2 flex items-center">
              <XCircle className="mr-2 h-4 w-4 text-red-500" />
              Failed Paths ({failedPaths.length})
            </h3>
            
            <div className="bg-gray-50 p-4 rounded-md overflow-y-auto max-h-40">
              <p className="text-xs text-gray-500 mb-2">These paths were tested but not found:</p>
              {failedPaths.map(path => (
                <div key={path} className="text-xs text-gray-400 font-mono mb-1">
                  {path}
                </div>
              ))}
            </div>
            
            <div className="bg-blue-50 p-4 rounded-md mt-6">
              <h4 className="text-sm font-medium text-blue-700 mb-2">Recommendations:</h4>
              <ul className="list-disc ml-5 text-sm text-blue-600">
                <li className="mb-1">
                  Place your CSV files in the <code className="bg-blue-100 px-1 rounded">/public/data/[folder]/</code> directory
                </li>
                <li className="mb-1">
                  Make sure your CSV files are named exactly <code className="bg-blue-100 px-1 rounded">nodes.csv</code> and <code className="bg-blue-100 px-1 rounded">links.csv</code>
                </li>
                <li className="mb-1">
                  Check that your CSV files have proper headers and are correctly formatted
                </li>
                <li>
                  If using a development server, ensure it's configured to serve static files properly
                </li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </CardFooter>
    </Card>
  );
};

export default FilePathDebugger;