import React from "react";
import { FileText, Users, Share2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FileCardProps {
  title: string;
  description: string;
  author: string;
  fileType: "nodes" | "links";
  rowCount: number;
  columnCount: number;
  onSelect: () => void;
  buttonText?: string;
}

const FileCard: React.FC<FileCardProps> = ({
  title,
  description,
  author,
  fileType,
  rowCount,
  columnCount,
  onSelect,
  buttonText = "Select File"
}) => {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            {fileType === "nodes" ? (
              <Users className="h-5 w-5 text-blue-500 mr-2" />
            ) : (
              <Share2 className="h-5 w-5 text-green-500 mr-2" />
            )}
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            fileType === "nodes" 
              ? "bg-blue-100 text-blue-800" 
              : "bg-green-100 text-green-800"
          }`}>
            {fileType === "nodes" ? "Nodes" : "Links"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <p className="text-sm text-gray-500 line-clamp-2 h-10">{description}</p>
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Author: {author}</span>
            <span>{rowCount} rows × {columnCount} cols</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-2">
        <Button onClick={onSelect} className="w-full" variant="default" size="sm">
          {buttonText}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FileCard;