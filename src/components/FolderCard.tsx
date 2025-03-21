// FolderCard.tsx - A component for displaying folder information with a content debug option
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, FileText, AlertCircle, Loader2, Search, Users, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import FileContentDebugger from "./FileContentDebugger";

interface FolderDetail {
  nodeCount: number | string;
  linkCount: number | string;
  lastUpdated: string;
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

interface FolderCardProps {
  id: string;
  name: string;
  description: string;
  author: string;
  url?: string;
  details: FolderDetail;
  isDemo: boolean;
  isLoading: boolean;
  onSelect: () => void;
}

const FolderCard: React.FC<FolderCardProps> = ({
  id,
  name,
  description,
  author,
  url,
  details,
  isDemo,
  isLoading,
  onSelect
}) => {
  const [showDebugger, setShowDebugger] = useState(false);
  const [showAuthorPopup, setShowAuthorPopup] = useState(false);
  const authorPopupRef = useRef<HTMLDivElement>(null);
  
  // Split author string by newlines to get individual authors
  const authorList = author ? author.split('\n') : [];
  
  // Display a shortened version for the card - first author + count
  const getShortAuthorDisplay = () => {
    if (authorList.length === 0) return "";
    if (authorList.length === 1) return authorList[0];
    return `${authorList[0]} +${authorList.length - 1}`;
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (authorPopupRef.current && !authorPopupRef.current.contains(event.target as Node)) {
        setShowAuthorPopup(false);
      }
    };

    if (showAuthorPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAuthorPopup]);

  // Toggle author popup on click
  const toggleAuthorPopup = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowAuthorPopup(!showAuthorPopup);
  };

  return (
    <Card 
      className={`shadow-sm hover:shadow-md hover:scale-102 group transition-all duration-200 ${
        details?.hasError 
          ? 'border-orange-300 hover:border-orange-400' 
          : isDemo 
            ? 'border-gray-200 hover:border-purple-300' 
            : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Folder className={`h-4 w-4 ${
            details?.hasError 
              ? 'text-orange-500 group-hover:text-orange-600' 
              : 'text-blue-500 group-hover:text-blue-600'
          } transition-colors`} />
          <CardTitle className={`text-sm font-medium ${
            details?.hasError 
              ? 'group-hover:text-orange-700' 
              : isDemo 
                ? 'group-hover:text-purple-700' 
                : 'group-hover:text-blue-700'
          } transition-colors`}>{name}</CardTitle>
        </div>
        <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          isDemo 
            ? 'bg-purple-100 text-purple-800 group-hover:bg-purple-200' 
            : 'bg-blue-100 text-blue-800 group-hover:bg-blue-200'
        } transition-colors`}>
          {isDemo ? "Demo" : "Dataset"}
        </div>
      </CardHeader>
      
      <CardContent className="p-3">
        <p className="text-xs text-gray-600 line-clamp-2 mb-2 h-8">{description}</p>
        
        {/* Dataset website link */}
        {url && (
          <div className="mb-2">
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center"
              onClick={(e) => e.stopPropagation()} // Prevent triggering card's click
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Canva and Flourish
            </a>
          </div>
        )}
        
        <div className="flex flex-row items-center justify-between">
          {/* File information */}
          <div className="space-y-0.5 flex-1">
            {details.isLoading ? (
              <div className="flex items-center text-xs text-gray-500">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : details.hasError ? (
              <div className="flex items-center text-xs text-orange-500">
                <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{details.errorMessage || 'Error loading data'}</span>
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="flex items-center text-xs text-gray-500 group-hover:text-gray-700 transition-colors">
                  <FileText className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="whitespace-nowrap">
                    <span className="font-medium">{details.nodeCount}</span> Nodes
                  </span>
                  <span className="mx-1.5">•</span>
                  <span className="whitespace-nowrap">
                    <span className="font-medium">{details.linkCount}</span> Links
                  </span>
                </div>
                <div className="text-xs text-gray-400 group-hover:text-gray-500 transition-colors">
                  {details.lastUpdated}
                </div>
              </div>
            )}
          </div>
          
          {/* Action buttons moved inline for more compact layout */}
          <div className="flex gap-1.5 items-center">
            <Button
              onClick={() => setShowDebugger(true)}
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 rounded-full hover:bg-gray-100 group-hover:opacity-90"
              title="Inspect file content"
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
            
            <Button 
              onClick={onSelect} 
              className={`h-7 px-3 transition-transform group-hover:scale-105 ${
                details?.hasError 
                  ? 'hover:bg-orange-500' 
                  : isDemo 
                    ? 'hover:bg-purple-600' 
                    : ''
              }`} 
              variant={details?.hasError ? "outline" : "default"}
              size="sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="mr-1.5 h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span className="text-xs">Loading</span>
                </>
              ) : (
                <span className="text-xs">{details?.hasError ? "Try Anyway" : "View"}</span>
              )}
            </Button>
          </div>
        </div>
        
        {/* Authors section with improved popup behavior */}
        {authorList.length > 0 && (
          <div className="mt-2 relative" ref={authorPopupRef}>
            <div 
              className="flex items-center text-blue-500 hover:text-blue-700 cursor-pointer text-xs transition-colors group-hover:text-blue-600"
              onClick={toggleAuthorPopup}
            >
              <Users className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
              <span className="underline">{authorList.length > 1 ? 'Authors' : 'Author'}: {getShortAuthorDisplay()}</span>
              {showAuthorPopup ? (
                <ChevronUp className="h-3.5 w-3.5 ml-1" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 ml-1" />
              )}
            
              {/* Popup that shows on click and stays until clicked outside */}
              {showAuthorPopup && (
                <div className="absolute top-full left-0 mt-1 bg-white shadow-lg rounded-md p-2 z-10 min-w-48 border border-gray-100 animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="text-xs font-medium text-gray-800 mb-1.5 border-b pb-1">
                    {authorList.length > 1 ? 'Authors' : 'Author'}
                  </div>
                  <ul className="space-y-1">
                    {authorList.map((authorName, index) => (
                      <li key={index} className="text-xs flex items-center">
                        <Users className="h-3 w-3 mr-1.5 text-gray-400" />
                        <a 
                          href="#" 
                          onClick={(e) => e.preventDefault()}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {authorName}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      
      {/* File Content Debugger */}
      <FileContentDebugger 
        isOpen={showDebugger}
        onClose={() => setShowDebugger(false)}
        folderId={id}
      />
    </Card>
  );
};

export default FolderCard;