import React, { useState, useRef, useEffect } from "react";
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
  // Add state to track open dropdowns
  const [dataDropdownOpen, setDataDropdownOpen] = useState(false);
  const [imageDropdownOpen, setImageDropdownOpen] = useState(false);
  
  // Add refs for the dropdown elements
  const dataDropdownRef = useRef<HTMLDivElement>(null);
  const imageDropdownRef = useRef<HTMLDivElement>(null);
  
  // Handle clicks outside the dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close data dropdown if click is outside
      if (dataDropdownRef.current && !dataDropdownRef.current.contains(event.target as Node)) {
        setDataDropdownOpen(false);
      }
      
      // Close image dropdown if click is outside
      if (imageDropdownRef.current && !imageDropdownRef.current.contains(event.target as Node)) {
        setImageDropdownOpen(false);
      }
    };
    
    // Add global click listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div className="flex gap-2 z-50">
      <div className="relative" ref={dataDropdownRef}>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-white/90 text-black border-none hover:bg-white flex items-center gap-1.5 shadow-md"
          onClick={() => setDataDropdownOpen(!dataDropdownOpen)}
        >
          <Download className="h-4 w-4" />
          <span>Data</span>
        </Button>
        <div className={`absolute right-0 top-full mt-1 bg-white rounded-md shadow-lg overflow-hidden min-w-32 z-50 ${dataDropdownOpen ? 'block' : 'hidden'}`}>
          <button 
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
            onClick={() => {
              onDownloadData('csv');
              setDataDropdownOpen(false);
            }}
          >
            CSV
          </button>
          <button 
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
            onClick={() => {
              onDownloadData('xlsx');
              setDataDropdownOpen(false);
            }}
          >
            XLSX
          </button>
        </div>
      </div>
      
      <div className="relative" ref={imageDropdownRef}>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-white/90 text-black border-none hover:bg-white flex items-center gap-1.5 shadow-md"
          onClick={() => setImageDropdownOpen(!imageDropdownOpen)}
        >
          <Download className="h-4 w-4" />
          <span>Image</span>
        </Button>
        <div className={`absolute right-0 top-full mt-1 bg-white rounded-md shadow-lg overflow-hidden min-w-32 z-50 ${imageDropdownOpen ? 'block' : 'hidden'}`}>
          <button 
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
            onClick={() => {
              onDownloadGraph('svg');
              setImageDropdownOpen(false);
            }}
          >
            SVG
          </button>
          <button 
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
            onClick={() => {
              onDownloadGraph('png');
              setImageDropdownOpen(false);
            }}
          >
            PNG
          </button>
          <button 
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
            onClick={() => {
              onDownloadGraph('jpg');
              setImageDropdownOpen(false);
            }}
          >
            JPG
          </button>
          <button 
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 text-sm"
            onClick={() => {
              onDownloadGraph('pdf');
              setImageDropdownOpen(false);
            }}
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