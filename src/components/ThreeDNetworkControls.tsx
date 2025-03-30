import React from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Box, RotateCcw, ZoomIn, ZoomOut, Tag } from 'lucide-react';

interface ThreeDNetworkControlsProps {
  nodeSize: number;
  rotationSpeed: number;
  showLabels: boolean;
  colorTheme?: string; 
  onNodeSizeChange: (size: number) => void;
  onRotationSpeedChange: (speed: number) => void;
  onToggleLabels: () => void;
  onResetView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onColorThemeChange?: (theme: string) => void;
}

const ThreeDNetworkControls: React.FC<ThreeDNetworkControlsProps> = ({
  nodeSize,
  rotationSpeed,
  showLabels,
  colorTheme = 'default',
  onNodeSizeChange,
  onRotationSpeedChange,
  onToggleLabels,
  onResetView,
  onZoomIn,
  onZoomOut,
  onColorThemeChange
}) => {
  return (
    <div className="p-3 bg-gray-700 rounded-md shadow-lg space-y-4 min-w-48">
      <h3 className="text-sm font-medium text-white mb-3 flex items-center">
        <Box className="w-4 h-4 mr-2 text-blue-400" />
        3D Graph Controls
      </h3>
      
      {/* Node Size Control */}
      <div className="space-y-2">
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
        />
      </div>
      
      {/* Color Theme Selection */}
      {onColorThemeChange && (
        <div className="space-y-2">
          <label className="text-xs text-gray-300">Color Theme</label>
          <select 
            className="w-full p-1.5 rounded-md border border-gray-600 bg-gray-600 text-xs text-white"
            value={colorTheme}
            onChange={(e) => onColorThemeChange(e.target.value)}
          >
            <option value="default">Default</option>
            <option value="bright">Bright</option>
            <option value="pastel">Pastel</option>
            <option value="ocean">Ocean</option>
            <option value="autumn">Autumn</option>
            <option value="monochrome">Monochrome</option>
            {colorTheme === 'custom' && <option value="custom">Custom</option>}
          </select>
        </div>
      )}
      
      {/* Rotation Speed Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-300">Rotation Speed</label>
          <span className="text-xs text-gray-300">{(rotationSpeed * 1000).toFixed(1)}</span>
        </div>
        <Slider
          value={[rotationSpeed]}
          min={0}
          max={0.05}
          step={0.001}
          onValueChange={(vals) => onRotationSpeedChange(vals[0])}
        />
      </div>
      
      {/* Labels Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-300 flex items-center">
          <Tag className="w-3 h-3 mr-1.5" />
          Show Labels
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
      
      {/* Camera Controls */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <Button 
          variant="outline" 
          size="sm" 
          className="col-span-3 bg-gray-600 hover:bg-gray-500 text-white"
          onClick={onResetView}
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reset View
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-gray-600 hover:bg-gray-500 text-white flex items-center justify-center"
          onClick={onZoomIn}
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-gray-600 hover:bg-gray-500 text-white flex items-center justify-center"
          onClick={onZoomOut}
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
        
        <div className="flex items-center justify-center">
          <Box className="w-4 h-4 text-blue-400" />
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-600">
        <p className="text-xs text-gray-400 mb-1 font-medium">Mouse Controls:</p>
        <ul className="text-xs text-gray-400 space-y-1 pl-2">
          <li>• Click + Drag: Rotate</li>
          <li>• Scroll: Zoom In/Out</li>
          <li>• Hover: Show Node Info</li>
        </ul>
      </div>
    </div>
  );
};

export default ThreeDNetworkControls;