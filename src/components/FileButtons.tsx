import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileButtonsProps {
  onDownloadData: (format: string) => void;
  onDownloadGraph: (format: string) => void;
  onResetSelection: () => void;
}

const FileButtons: React.FC<FileButtonsProps> = ({
  onDownloadData,
  onDownloadGraph,
  onResetSelection
}) => {
  return (
    <div className="absolute top-4 right-4 flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm"
        className="bg-white/90 text-black border-none hover:bg-white flex items-center gap-1.5"
        onClick={onResetSelection}
      >
        <Upload className="h-4 w-4" />
        <span>Choose Files</span>
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="bg-white/90 text-black border-none hover:bg-white flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" />
            <span>Data</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onDownloadData('csv')}>
            CSV Format
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDownloadData('xlsx')}>
            Excel Format
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="bg-white/90 text-black border-none hover:bg-white flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" />
            <span>Image</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onDownloadGraph('svg')}>
            SVG Format
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDownloadGraph('png')}>
            PNG Format
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDownloadGraph('jpg')}>
            JPG Format
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FileButtons;