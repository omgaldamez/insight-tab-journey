import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Users, Share2 } from "lucide-react";
import { FileInfo } from "@/types/types"; // Import the type from the types file

interface FileStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeFile: FileInfo;
  linkFile: FileInfo;
  onProceed: () => void;
}

const FileStatsModal: React.FC<FileStatsModalProps> = ({
  isOpen,
  onClose,
  nodeFile,
  linkFile,
  onProceed
}) => {
  if (!nodeFile || !linkFile) return null;

  const getHeaders = (sampleRows: Record<string, string | number>[]) => {
    if (sampleRows.length === 0) return [];
    return Object.keys(sampleRows[0]);
  };

  const nodeHeaders = getHeaders(nodeFile.sampleRows);
  const linkHeaders = getHeaders(linkFile.sampleRows);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>File Statistics</DialogTitle>
          <DialogDescription>
            Review the data files before generating the network visualization.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-6 py-4">
          {/* Node File Section */}
          <div>
            <div className="flex items-center mb-3">
              <Users className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-medium">Nodes File: {nodeFile.name}</h3>
            </div>
            <p className="text-sm text-gray-500 mb-2">
              {nodeFile.rowCount} rows × {nodeFile.columnCount} columns
            </p>
            
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {nodeHeaders.map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nodeFile.sampleRows.slice(0, 5).map((row, index) => (
                    <TableRow key={index}>
                      {nodeHeaders.map((header) => (
                        <TableCell key={header}>{String(row[header] || '')}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {nodeFile.rowCount > 5 && (
              <p className="text-xs text-gray-500 mt-2">
                Showing 5 of {nodeFile.rowCount} rows
              </p>
            )}
          </div>

          {/* Link File Section */}
          <div>
            <div className="flex items-center mb-3">
              <Share2 className="h-5 w-5 text-green-500 mr-2" />
              <h3 className="text-lg font-medium">Links File: {linkFile.name}</h3>
            </div>
            <p className="text-sm text-gray-500 mb-2">
              {linkFile.rowCount} rows × {linkFile.columnCount} columns
            </p>
            
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {linkHeaders.map((header) => (
                      <TableHead key={header}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkFile.sampleRows.slice(0, 5).map((row, index) => (
                    <TableRow key={index}>
                      {linkHeaders.map((header) => (
                        <TableCell key={header}>{String(row[header] || '')}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {linkFile.rowCount > 5 && (
              <p className="text-xs text-gray-500 mt-2">
                Showing 5 of {linkFile.rowCount} rows
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">Cancel</Button>
          <Button onClick={onProceed}>Proceed to Visualization</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FileStatsModal;