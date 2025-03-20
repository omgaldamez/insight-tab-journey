import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface DownloadButtonsProps {
  onDownloadData: (format: string) => void;
  onDownloadGraph: (format: string) => void;
  title?: string;
}

const DownloadButtons: React.FC<DownloadButtonsProps> = ({
  onDownloadData,
  onDownloadGraph,
  title = "Network"
}) => {
  return (
    <div className="absolute top-4 right-4 flex gap-2 z-10">
      <div className="relative group">
        <Button 
          variant="outline" 
          size="sm"
          className="bg-white/90 text-black border-none hover:bg-white flex items-center gap-1.5"
        >
          <Download className="h-4 w-4" />
          <span>Data</span>
        </Button>
        <div className="absolute hidden group-hover:block right-0 top-full bg-white rounded-md shadow-lg overflow-hidden min-w-32 z-10">
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
          className="bg-white/90 text-black border-none hover:bg-white flex items-center gap-1.5"
        >
          <Download className="h-4 w-4" />
          <span>Image</span>
        </Button>
        <div className="absolute hidden group-hover:block right-0 top-full bg-white rounded-md shadow-lg overflow-hidden min-w-32 z-10">
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
        </div>
      </div>
    </div>
  );
};

export default DownloadButtons;