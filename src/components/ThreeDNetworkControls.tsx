import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Box, RotateCcw, ZoomIn, ZoomOut, Tag, SortAsc, 
  Network, Target, Globe, MousePointer, Magnet, 
  Move, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, PanelLeft 
} from 'lucide-react';

interface ThreeDNetworkControlsProps {
  nodeSize: number;
  rotationSpeed: number;
  repulsionForce: number;
  linkStrength: number;
  gravity: number;
  showLabels: boolean;
  colorTheme?: string; 
  layoutType?: '3d-sphere' | '3d-network';
  sortMode?: 'alphabetical' | 'category' | 'connections' | 'none';
  centerNodeId?: string | null;
  nodePositioningEnabled?: boolean;
  availableNodes?: {id: string, category: string}[];
  
  onNodeSizeChange: (size: number) => void;
  onRotationSpeedChange: (speed: number) => void;
  onRepulsionForceChange: (force: number) => void;
  onLinkStrengthChange: (strength: number) => void;
  onGravityChange: (gravity: number) => void;
  onToggleLabels: () => void;
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onColorThemeChange?: (theme: string) => void;
  onLayoutTypeChange?: (layout: '3d-sphere' | '3d-network') => void;
  onSortModeChange?: (mode: 'alphabetical' | 'category' | 'connections' | 'none') => void;
  onCenterNodeChange?: (nodeId: string | null) => void;
  onNodePositioningToggle?: () => void;
  // Add panning controls
  onPanUp?: () => void;
  onPanDown?: () => void;
  onPanLeft?: () => void;
  onPanRight?: () => void;
}

const ThreeDNetworkControls: React.FC<ThreeDNetworkControlsProps> = ({
  nodeSize,
  rotationSpeed,
  repulsionForce = 100,
  linkStrength = 0.5,
  gravity = 0.1,
  showLabels,
  colorTheme = 'default',
  layoutType = '3d-sphere',
  sortMode = 'none',
  centerNodeId = null,
  nodePositioningEnabled = false,
  availableNodes = [],
  onNodeSizeChange,
  onRotationSpeedChange,
  onRepulsionForceChange,
  onLinkStrengthChange,
  onGravityChange,
  onToggleLabels,
  onResetView,
  onZoomIn,
  onZoomOut,
  onColorThemeChange,
  onLayoutTypeChange,
  onSortModeChange,
  onCenterNodeChange,
  onNodePositioningToggle,
  onPanUp,
  onPanDown,
  onPanLeft,
  onPanRight
}) => {
  // Start with appropriate tab based on layout type
  const [activeTab, setActiveTab] = useState<string>(layoutType === '3d-network' ? 'physics' : 'layout');
  
  // Update active tab when layout changes
  useEffect(() => {
    if (layoutType === '3d-network') {
      setActiveTab('physics');
    }
  }, [layoutType]);
  
  return (
    <div className="p-3 bg-gray-800 bg-opacity-90 rounded-md shadow-lg text-white absolute top-4 right-4 z-10 w-80 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full mb-3">
          <TabsTrigger value="layout" className="text-xs">Layout</TabsTrigger>
          <TabsTrigger value="physics" className="text-xs">Physics</TabsTrigger>
          <TabsTrigger value="display" className="text-xs">Display</TabsTrigger>
        </TabsList>
        
        {/* Layout Tab */}
        <TabsContent value="layout" className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center">
                {layoutType === '3d-sphere' ? (
                  <Globe className="w-4 h-4 mr-2 text-blue-400" />
                ) : (
                  <Network className="w-4 h-4 mr-2 text-blue-400" />
                )}
                Layout Type
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={layoutType === '3d-sphere' ? "default" : "outline"}
                size="sm"
                className={`text-xs ${layoutType === '3d-sphere' ? 'bg-blue-600' : 'bg-gray-700'}`}
                onClick={() => onLayoutTypeChange && onLayoutTypeChange('3d-sphere')}
              >
                <Globe className="w-3.5 h-3.5 mr-1.5" />
                Sphere Layout
              </Button>
              <Button
                variant={layoutType === '3d-network' ? "default" : "outline"}
                size="sm"
                className={`text-xs ${layoutType === '3d-network' ? 'bg-blue-600' : 'bg-gray-700'}`}
                onClick={() => onLayoutTypeChange && onLayoutTypeChange('3d-network')}
              >
                <Network className="w-3.5 h-3.5 mr-1.5" />
                Network Layout
              </Button>
            </div>

            {/* Network layout node positioning toggle */}
            {layoutType === '3d-network' && (
              <div className="p-2 bg-gray-700 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm flex items-center">
                    <MousePointer className="w-3.5 h-3.5 mr-1.5 text-yellow-400" />
                    Node Positioning Mode
                  </label>
                  <button
                    onClick={onNodePositioningToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      nodePositioningEnabled ? 'bg-yellow-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        nodePositioningEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-gray-300">
                  {nodePositioningEnabled
                    ? "Click and drag nodes to position them. Toggle off to rotate view."
                    : "Toggle on to position nodes. Currently in rotation mode."}
                </p>
              </div>
            )}

            {/* Sphere Layout Options */}
            {layoutType === '3d-sphere' && (
              <>
                {/* Sorting Options */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-300 flex items-center">
                    <SortAsc className="w-3.5 h-3.5 mr-1.5" />
                    Sphere Ordering
                  </label>
                  <select 
                    className="w-full p-1.5 rounded-md border border-gray-600 bg-gray-700 text-xs text-white"
                    value={sortMode}
                    onChange={(e) => onSortModeChange && onSortModeChange(e.target.value as 'alphabetical' | 'category' | 'connections' | 'none')}
                  >
                    <option value="none">Default Order</option>
                    <option value="alphabetical">Alphabetical</option>
                    <option value="category">By Category</option>
                    <option value="connections">By Connections</option>
                  </select>
                </div>
                
                {/* Center Node Selection */}
                {availableNodes.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-300 flex items-center">
                      <Target className="w-3.5 h-3.5 mr-1.5" />
                      Center Node (Centrality)
                    </label>
                    <select 
                      className="w-full p-1.5 rounded-md border border-gray-600 bg-gray-700 text-xs text-white"
                      value={centerNodeId || ''}
                      onChange={(e) => onCenterNodeChange && onCenterNodeChange(e.target.value || null)}
                    >
                      <option value="">None (Balanced Sphere)</option>
                      {availableNodes.map(node => (
                        <option key={node.id} value={node.id}>
                          {node.id} ({node.category})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
            
            {/* Pan Controls - Added for all layout types */}
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <Move className="w-4 h-4 mr-2 text-blue-400" />
                Pan Controls
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-start-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-gray-700 hover:bg-gray-600"
                    onClick={() => onPanUp && onPanUp()}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                </div>
                <div className="col-start-1 col-span-3 grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-gray-700 hover:bg-gray-600"
                    onClick={() => onPanLeft && onPanLeft()}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-gray-700 hover:bg-gray-600"
                    onClick={() => onPanDown && onPanDown()}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-gray-700 hover:bg-gray-600"
                    onClick={() => onPanRight && onPanRight()}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* Physics Tab */}
        <TabsContent value="physics" className="space-y-4">
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center">
              <Magnet className="w-4 h-4 mr-2 text-blue-400" />
              Force Physics
            </h3>
            
            {/* Node Repulsion Force */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-300">Repulsion Force</label>
                <span className="text-xs text-gray-300">{repulsionForce}</span>
              </div>
              <Slider
                value={[repulsionForce]}
                min={50}
                max={300}
                step={5}
                onValueChange={(vals) => onRepulsionForceChange(vals[0])}
                className="w-full"
              />
              <p className="text-xs text-gray-400">How strongly nodes push each other away</p>
            </div>
            
            {/* Link Strength */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-300">Link Strength</label>
                <span className="text-xs text-gray-300">{linkStrength.toFixed(2)}</span>
              </div>
              <Slider
                value={[linkStrength]}
                min={0.1}
                max={1.0}
                step={0.05}
                onValueChange={(vals) => onLinkStrengthChange(vals[0])}
                className="w-full"
              />
              <p className="text-xs text-gray-400">Strength of connections between linked nodes</p>
            </div>
            
            {/* Gravity */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-300">Gravity</label>
                <span className="text-xs text-gray-300">{gravity.toFixed(2)}</span>
              </div>
              <Slider
                value={[gravity]}
                min={0.01}
                max={0.5}
                step={0.01}
                onValueChange={(vals) => onGravityChange(vals[0])}
                className="w-full"
              />
              <p className="text-xs text-gray-400">Pulls nodes toward the center</p>
            </div>
            
            {/* Rotation Speed */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-300">Auto-Rotation</label>
                <span className="text-xs text-gray-300">{(rotationSpeed * 1000).toFixed(1)}</span>
              </div>
              <Slider
                value={[rotationSpeed]}
                min={0}
                max={0.05}
                step={0.001}
                onValueChange={(vals) => onRotationSpeedChange(vals[0])}
                className="w-full"
              />
              <p className="text-xs text-gray-400">Speed of automatic rotation (0 to disable)</p>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={onResetView}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset Physics & View
            </Button>
          </div>
        </TabsContent>
        
        {/* Display Tab */}
        <TabsContent value="display" className="space-y-4">
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Display Options</h3>
            
            {/* Node Size */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-300">Node Size</label>
                <span className="text-xs text-gray-300">{nodeSize.toFixed(1)}</span>
              </div>
              <Slider
                value={[nodeSize]}
                min={0.5}
                max={2.0}
                step={0.1}
                onValueChange={(vals) => onNodeSizeChange(vals[0])}
                className="w-full"
              />
            </div>
            
            {/* Show Labels Toggle */}
            <div className="flex items-center justify-between mt-2">
              <label className="text-sm flex items-center text-gray-300">
                <Tag className="w-3.5 h-3.5 mr-1.5" />
                Show Node Labels
              </label>
              <button
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  showLabels ? 'bg-blue-600' : 'bg-gray-600'
                }`}
                onClick={onToggleLabels}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showLabels ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {/* Color Theme Selection */}
            {onColorThemeChange && (
              <div className="space-y-2 mt-2">
                <label className="text-xs text-gray-300">Color Theme</label>
                <select 
                  className="w-full p-1.5 rounded-md border border-gray-600 bg-gray-700 text-xs text-white"
                  value={colorTheme}
                  onChange={(e) => onColorThemeChange(e.target.value)}
                >
                  <option value="default">Default</option>
                  <option value="bright">Bright</option>
                  <option value="pastel">Pastel</option>
                  <option value="ocean">Ocean</option>
                  <option value="autumn">Autumn</option>
                  <option value="monochrome">Monochrome</option>
                </select>
              </div>
            )}
            
            {/* Zoom Controls */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-gray-700 hover:bg-gray-600 text-white"
                onClick={onZoomIn}
              >
                <ZoomIn className="w-3.5 h-3.5 mr-1" />
                Zoom In
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-gray-700 hover:bg-gray-600 text-white"
                onClick={onZoomOut}
              >
                <ZoomOut className="w-3.5 h-3.5 mr-1" />
                Zoom Out
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="mt-3 pt-2 border-t border-gray-600">
        <div className="flex items-center text-xs text-gray-400">
          <Move className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
          <span>
            {nodePositioningEnabled && layoutType === '3d-network' 
              ? "Click+drag nodes to position. Toggle off to rotate." 
              : "Click+drag to rotate view. Scroll to zoom."}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ThreeDNetworkControls;