import React from "react";
import { Button } from "@/components/ui/button";
import { Download, RotateCcw } from "lucide-react";
import { NodeData, LinkData } from "@/types/types";

interface FileButtonsProps {
  onDownloadData: (format: string) => void;
  onDownloadGraph: (format: string) => void;
  onResetSelection: () => void;
  nodeData: NodeData[];
  linkData: LinkData[];
}

const FileButtons: React.FC<FileButtonsProps> = ({
  onDownloadData,
  onDownloadGraph,
  onResetSelection,
  nodeData, 
  linkData
}) => {
  return (
    <div className="absolute top-4 right-4 flex gap-2 z-50">
      <div className="relative group">
        <Button 
          variant="outline" 
          size="sm"
          className="bg-white/90 text-black border-none hover:bg-white flex items-center gap-1.5 shadow-md"
        >
          <Download className="h-4 w-4" />
          <span>Data</span>
        </Button>
        <div className="absolute hidden group-hover:block right-0 top-full mt-1 bg-white rounded-md shadow-lg overflow-hidden min-w-32 z-50">
          <button 
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
            onClick={() => onDownloadData('csv')}
          >
            CSV
          </button>
          <button 
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
            onClick={() => onDownloadData('xlsx')}
          >
            XLSX
          </button>
        </div>
      </div>
      
      <div className="relative group">
        <Button 
          variant="outline" 
          size="sm"
          className="bg-white/90 text-black border-none hover:bg-white flex items-center gap-1.5 shadow-md"
        >
          <Download className="h-4 w-4" />
          <span>Image</span>
        </Button>
        <div className="absolute hidden group-hover:block right-0 top-full mt-1 bg-white rounded-md shadow-lg overflow-hidden min-w-32 z-50">
          <button 
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
            onClick={() => onDownloadGraph('svg')}
          >
            SVG
          </button>
          <button 
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
            onClick={() => onDownloadGraph('png')}
          >
            PNG
          </button>
          <button 
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
            onClick={() => onDownloadGraph('jpg')}
          >
            JPG
          </button>
          <button 
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
            onClick={() => onDownloadGraph('pdf')}
          >
            PDF
          </button>
        </div>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        className="bg-white/90 text-black border-none hover:bg-white flex items-center gap-1.5 shadow-md"
        onClick={onResetSelection}
        title="Reset selection and view"
      >
        <RotateCcw className="h-4 w-4" />
        <span>Reset</span>
      </Button>
    </div>
  );
};

export default FileButtons;