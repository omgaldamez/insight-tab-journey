import React, { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, FileUp, Beaker } from "lucide-react";
import DataFolderSelector from "./DataFolderSelector";
import FileUploader from "./FileUploader";

interface WelcomeSelectorProps {
  onSelectFolder: (folderId: string, isDemo?: boolean) => void;
}

type ViewMode = "main" | "data" | "demo" | "upload";

const WelcomeSelector: React.FC<WelcomeSelectorProps> = ({ onSelectFolder }) => {
  const [viewMode, setViewMode] = useState<ViewMode>("main");

  const handleBackToMain = () => {
    setViewMode("main");
  };

  if (viewMode === "data") {
    return <DataFolderSelector 
      onSelectFolder={(folderId) => onSelectFolder(folderId, false)} 
      onBack={handleBackToMain}
      isDemo={false}
    />;
  }

  if (viewMode === "demo") {
    return <DataFolderSelector 
      onSelectFolder={(folderId) => onSelectFolder(folderId, true)} 
      onBack={handleBackToMain}
      isDemo={true}
    />;
  }

  if (viewMode === "upload") {
    return <FileUploader onBack={handleBackToMain} />;
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Welcome section */}
      <div className="text-center mb-12">
        <p className="text-sm text-gray-600 mb-3">
          Network Data Explorer
        </p>
        <h1 className="text-4xl font-bold text-gray-800 tracking-tight sm:text-5xl mb-4">
          Welcome to Network Visualization
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Explore network relationships through interactive visualization. Choose an option below to get started.
        </p>
      </div>

      {/* Main selection cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <Card className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 hover:scale-102 transition-all duration-200 group h-full flex flex-col">
          <CardHeader className="p-6 pb-3 text-center">
            <div className="flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200">
                <Database className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-xl font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">Explore Data</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-4 pt-0 flex-grow">
            <p className="text-center text-gray-600">
              Explore network visualizations using pre-loaded datasets from your data directory.
            </p>
          </CardContent>
          <CardFooter className="p-6 pt-0 mt-auto">
            <Button 
              onClick={() => setViewMode("data")} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10" 
            >
              Browse Datasets
            </Button>
          </CardFooter>
        </Card>

        <Card className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md hover:border-purple-300 hover:scale-102 transition-all duration-200 group h-full flex flex-col">
          <CardHeader className="p-6 pb-3 text-center">
            <div className="flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200">
                <Beaker className="h-8 w-8 text-purple-600" />
              </div>
            </div>
            <CardTitle className="text-xl font-semibold text-gray-800 group-hover:text-purple-700 transition-colors">Demo Examples</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-4 pt-0 flex-grow">
            <p className="text-center text-gray-600">
              Try out network visualizations with pre-generated demo datasets designed to showcase features.
            </p>
          </CardContent>
          <CardFooter className="p-6 pt-0 mt-auto">
            <Button 
              onClick={() => setViewMode("demo")} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10" 
            >
              View Demos
            </Button>
          </CardFooter>
        </Card>

        <Card className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md hover:border-green-300 hover:scale-102 transition-all duration-200 group h-full flex flex-col">
          <CardHeader className="p-6 pb-3 text-center">
            <div className="flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200">
                <FileUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-xl font-semibold text-gray-800 group-hover:text-green-700 transition-colors">Upload Files</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-4 pt-0 flex-grow">
            <p className="text-center text-gray-600">
              Create network visualizations by uploading your own CSV or XLSX node and link files.
            </p>
          </CardContent>
          <CardFooter className="p-6 pt-0 mt-auto">
            <Button 
              onClick={() => setViewMode("upload")} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10" 
            >
              Upload Files
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default WelcomeSelector;