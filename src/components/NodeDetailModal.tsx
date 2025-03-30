import React, { useState } from 'react';
import { X, Copy, Download, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Node, Link } from '@/types/networkTypes';
import { 
  findNodeConnections,
  getNodeTextRepresentation,
  getNodeJsonRepresentation,
  downloadFile,
  downloadNodeAsText,
  downloadNodeAsJson
} from './TooltipUtils';

interface NodeDetailModalProps {
  node: Node | null;
  links: Link[];
  isOpen: boolean;
  onClose: () => void;
}

const NodeDetailModal: React.FC<NodeDetailModalProps> = ({
  node,
  links,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  if (!isOpen || !node) return null;

  // Get node connections
  const { sourceLinks, targetLinks } = findNodeConnections(node, links);

  // Process connections to get full node info
  const outgoingConnections = sourceLinks.map(link => {
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    const targetNode = links.find(l => {
      const id = typeof l.source === 'object' ? l.source.id : l.source;
      return id === targetId;
    });
    const category = typeof link.target === 'object' ? link.target.category : 'Unknown';
    
    return { id: targetId, category, link };
  });

  const incomingConnections = targetLinks.map(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const sourceNode = links.find(l => {
      const id = typeof l.source === 'object' ? l.source.id : l.source;
      return id === sourceId;
    });
    const category = typeof link.source === 'object' ? link.source.category : 'Unknown';
    
    return { id: sourceId, category, link };
  });

  // Generate plain text representation
  const getTextRepresentation = () => {
    return getNodeTextRepresentation(node, links);
  };

  // Generate JSON representation
  const getJsonRepresentation = () => {
    return getNodeJsonRepresentation(node, links);
  };

  // Handle copy to clipboard
  const handleCopy = (format: 'text' | 'json') => {
    const content = format === 'text' ? getTextRepresentation() : getJsonRepresentation();
    navigator.clipboard.writeText(content)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => console.error('Failed to copy: ', err));
  };

  // Handle download - UPDATED to use proper download functions
  const handleDownload = (format: 'text' | 'json') => {
    if (format === 'text') {
      downloadNodeAsText(node, links);
    } else {
      downloadNodeAsJson(node, links);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-gray-100 flex items-center">
            Node Details: <span className="text-blue-400 ml-2">{node.id}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="text">Text Data</TabsTrigger>
              <TabsTrigger value="json">JSON Data</TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 p-3 rounded-md">
                  <h3 className="text-sm font-medium text-blue-300 mb-2">Node Information</h3>
                  <p className="text-sm mb-1"><span className="text-gray-400">ID:</span> {node.id}</p>
                  <p className="text-sm mb-1"><span className="text-gray-400">Category:</span> {node.category}</p>
                  <p className="text-sm"><span className="text-gray-400">Total Connections:</span> {sourceLinks.length + targetLinks.length}</p>
                </div>
                
                <div className="bg-gray-700 p-3 rounded-md">
                  <h3 className="text-sm font-medium text-blue-300 mb-2">Connection Summary</h3>
                  <p className="text-sm mb-1">
                    <span className="text-gray-400">Outgoing:</span> {sourceLinks.length}
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-400">Incoming:</span> {targetLinks.length}
                  </p>
                </div>
              </div>
              
              {/* Outgoing Connections */}
              {outgoingConnections.length > 0 && (
                <div className="bg-gray-700 p-3 rounded-md">
                  <h3 className="text-sm font-medium text-green-300 mb-2">
                    Outgoing Connections ({outgoingConnections.length})
                  </h3>
                  <div className="max-h-40 overflow-y-auto pr-2">
                    {outgoingConnections.map((conn, index) => (
                      <div key={`out-${index}`} className="text-sm flex justify-between py-1 border-b border-gray-600 last:border-0">
                        <span>{conn.id}</span>
                        <span className="text-gray-400">{conn.category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Incoming Connections */}
              {incomingConnections.length > 0 && (
                <div className="bg-gray-700 p-3 rounded-md">
                  <h3 className="text-sm font-medium text-blue-300 mb-2">
                    Incoming Connections ({incomingConnections.length})
                  </h3>
                  <div className="max-h-40 overflow-y-auto pr-2">
                    {incomingConnections.map((conn, index) => (
                      <div key={`in-${index}`} className="text-sm flex justify-between py-1 border-b border-gray-600 last:border-0">
                        <span>{conn.id}</span>
                        <span className="text-gray-400">{conn.category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            
            {/* Text Tab */}
            <TabsContent value="text" className="relative">
              <div className="bg-gray-900 p-4 rounded-md font-mono text-sm overflow-auto h-[350px] whitespace-pre">
                {getTextRepresentation()}
              </div>
            </TabsContent>
            
            {/* JSON Tab */}
            <TabsContent value="json" className="relative">
              <div className="bg-gray-900 p-4 rounded-md font-mono text-sm overflow-auto h-[350px] whitespace-pre">
                {getJsonRepresentation()}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Footer with actions */}
        <div className="border-t border-gray-700 p-4 flex justify-between items-center">
          <div className="text-xs text-gray-400">
            {copySuccess ? (
              <span className="flex items-center text-green-400">
                <Check className="w-3 h-3 mr-1" />
                Copied to clipboard
              </span>
            ) : (
              "Export node data or copy to clipboard"
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs bg-gray-700 text-white hover:bg-gray-600 border-gray-600"
              onClick={() => handleCopy(activeTab === 'json' ? 'json' : 'text')}
            >
              <Copy className="w-3 h-3 mr-1.5" />
              Copy
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="text-xs bg-blue-600 text-white hover:bg-blue-700 border-blue-800"
              onClick={() => handleDownload(activeTab === 'json' ? 'json' : 'text')}
            >
              <Download className="w-3 h-3 mr-1.5" />
              Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeDetailModal;