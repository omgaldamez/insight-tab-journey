import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Node } from '@/types/networkTypes';
import { RotateCcw, CheckCircle2, Search } from 'lucide-react';

interface NetworkColorControlsProps {
  uniqueCategories: string[];
  nodes: Node[];
  colorTheme: string;
  nodeSize: number;
  linkColor: string;
  backgroundColor: string;
  textColor: string;
  nodeStrokeColor: string;
  backgroundOpacity: number;
  customNodeColors: {[key: string]: string};
  dynamicColorThemes: Record<string, Record<string, string>>;
  onColorThemeChange: (theme: string) => void;
  onNodeSizeChange: (size: number) => void;
  onApplyGroupColors: (categoryColorMap: {[key: string]: string}) => void;
  onApplyIndividualColor: (nodeId: string, color: string) => void;
  onResetIndividualColor: (nodeId: string) => void;
  onApplyBackgroundColors: (
    bgColor: string, 
    textColor: string, 
    linkColor: string, 
    opacity: number,
    nodeStrokeColor: string
  ) => void;
  onResetBackgroundColors: () => void;
  onColorTabChange: (tab: string) => void;
  activeColorTab: string;
}

const NetworkColorControls: React.FC<NetworkColorControlsProps> = ({
  uniqueCategories,
  nodes,
  colorTheme,
  nodeSize,
  linkColor,
  backgroundColor,
  textColor,
  nodeStrokeColor,
  backgroundOpacity,
  customNodeColors,
  dynamicColorThemes,
  onColorThemeChange,
  onNodeSizeChange,
  onApplyGroupColors,
  onApplyIndividualColor,
  onResetIndividualColor,
  onApplyBackgroundColors,
  onResetBackgroundColors,
  onColorTabChange,
  activeColorTab
}) => {
  // Internal state
  const [nodeFilter, setNodeFilter] = useState('');
  const [filteredNodes, setFilteredNodes] = useState<Node[]>([]);
  const [categoryColors, setCategoryColors] = useState<{[key: string]: string}>({});
  const [selectedColorNode, setSelectedColorNode] = useState<Node | null>(null);
  const [selectedColorValue, setSelectedColorValue] = useState('#3498db');
  const [hasCustomChanges, setHasCustomChanges] = useState(false);
  
  // Background colors state
  const [localBgColor, setLocalBgColor] = useState(backgroundColor);
  const [localTxtColor, setLocalTxtColor] = useState(textColor);
  const [localLinkColor, setLocalLinkColor] = useState(linkColor);
  const [localNodeStrokeColor, setLocalNodeStrokeColor] = useState(nodeStrokeColor);
  const [localBgOpacity, setLocalBgOpacity] = useState(backgroundOpacity);
  
  // Initialize category colors from the current theme
  useEffect(() => {
    if (Object.keys(dynamicColorThemes).length === 0) return;
    
    // Use current theme or fall back to default theme
    const currentTheme = dynamicColorThemes[colorTheme] || dynamicColorThemes.default || {};
    
    const newCategoryColors: {[key: string]: string} = {};
    uniqueCategories.forEach(category => {
      newCategoryColors[category] = currentTheme[category] || "#3498db";
    });
    
    // Only update if theme isn't custom - preserve custom colors
    if (colorTheme !== 'custom') {
      setCategoryColors(newCategoryColors);
    }
  }, [uniqueCategories, dynamicColorThemes, colorTheme]);
  
  // Initialize background colors when props change
  useEffect(() => {
    setLocalBgColor(backgroundColor);
    setLocalTxtColor(textColor);
    setLocalLinkColor(linkColor);
    setLocalNodeStrokeColor(nodeStrokeColor);
    setLocalBgOpacity(backgroundOpacity);
  }, [backgroundColor, textColor, linkColor, nodeStrokeColor, backgroundOpacity]);
  
  // Filter nodes for individual color selection
  useEffect(() => {
    if (nodes.length === 0) return;
    
    const filtered = nodeFilter
      ? nodes.filter(node => 
          node.id.toLowerCase().includes(nodeFilter.toLowerCase()) || 
          (node.category && node.category.toLowerCase().includes(nodeFilter.toLowerCase())))
      : nodes.slice(0, 20);
    
    setFilteredNodes(filtered);
  }, [nodes, nodeFilter]);

  // Handle node size change
  const handleNodeSizeChange = (values: number[]) => {
    onNodeSizeChange(values[0]);
  };

  // This function ensures each category color picker only updates its own color
  const handleCategoryColorChange = (category: string, color: string) => {
    // Update just this specific category's color
    const updatedColors = {...categoryColors};
    updatedColors[category] = color;
    
    // Update colors state
    setCategoryColors(updatedColors);
    
    // Mark that we have custom changes
    setHasCustomChanges(true);
  };
  
  // Apply group colors to the visualization
  const handleApplyGroupColors = () => {
    onApplyGroupColors(categoryColors);
    setHasCustomChanges(false);
  };
  
  // For the color theme selection (radio buttons)
  const handleColorThemeChange = (theme: string) => {
    // Don't switch away from custom theme if we have unsaved changes
    if (colorTheme === 'custom' && hasCustomChanges && theme !== 'custom') {
      const wantToSwitch = window.confirm('This will discard your custom color changes. Continue?');
      if (!wantToSwitch) {
        return;
      }
    }
    
    onColorThemeChange(theme);
    
    // Reset custom changes flag if switching away from custom
    if (theme !== 'custom') {
      setHasCustomChanges(false);
    }
  };
  
  // Handle individual node select
  const handleNodeSelect = (node: Node) => {
    setSelectedColorNode(node);
    // Use custom color if available, otherwise use theme color
    const currentTheme = dynamicColorThemes[colorTheme] || dynamicColorThemes.default || {};
    const currentColor = customNodeColors[node.id] || 
                        currentTheme[node.category] || 
                        "#3498db";
    setSelectedColorValue(currentColor);
  };
  
  // Handle individual node color change
  const handleNodeColorChange = (color: string) => {
    setSelectedColorValue(color);
  };
  
  // Apply individual node color
  const handleApplyIndividualColor = () => {
    if (selectedColorNode) {
      onApplyIndividualColor(selectedColorNode.id, selectedColorValue);
    }
  };
  
  // Reset individual node color
  const handleResetNodeColor = () => {
    if (selectedColorNode) {
      onResetIndividualColor(selectedColorNode.id);
    }
  };
  
  // Apply background settings
  const handleApplyBackgroundSettings = () => {
    onApplyBackgroundColors(
      localBgColor,
      localTxtColor,
      localLinkColor,
      localBgOpacity,
      localNodeStrokeColor
    );
  };
  
  // Reset background settings
  const handleResetBackgroundSettings = () => {
    onResetBackgroundColors();
    // Reset local state too
    setLocalBgColor('#f5f5f5');
    setLocalTxtColor('#ffffff');
    setLocalLinkColor('#999999');
    setLocalBgOpacity(1.0);
    setLocalNodeStrokeColor('#000000');
  };

  // Helper to get theme preview colors
  const getThemePreviewColors = (themeName: string) => {
    return uniqueCategories.slice(0, 5).map(category => {
      const themeColors = dynamicColorThemes[themeName] || {};
      return themeColors[category] || "#cccccc";
    });
  };

  return (
    <div className="text-sm">
      <Tabs value={activeColorTab} onValueChange={onColorTabChange}>
        <TabsList className="w-full mb-4 grid grid-cols-4">
          <TabsTrigger value="presets" className="px-2">Presets</TabsTrigger>
          <TabsTrigger value="byGroup" className="px-2">Groups</TabsTrigger>
          <TabsTrigger value="individual" className="px-2">Nodes</TabsTrigger>
          <TabsTrigger value="background" className="px-2">BG</TabsTrigger>
        </TabsList>
        
        {/* Presets Tab */}
        <TabsContent value="presets" className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center mb-2">
              <label className="w-20 inline-block text-xs text-gray-300">Node Size:</label>
              <Slider
                value={[nodeSize]}
                min={0.5}
                max={2.0}
                step={0.1}
                onValueChange={handleNodeSizeChange}
                className="flex-grow"
              />
              <span className="w-8 text-right ml-2 text-xs">{nodeSize.toFixed(1)}</span>
            </div>
            
            <div className="bg-gray-800 p-3 rounded-md mt-4">
              <h3 className="text-xs font-medium mb-2 text-gray-300">Color Themes</h3>
              <div className="grid grid-cols-2 gap-2">
                {["default", "bright", "pastel", "ocean", "autumn", "monochrome", "custom"].map(theme => (
                  <div key={theme} className="flex items-center">
                    <input
                      type="radio"
                      id={`theme-${theme}`}
                      name="colorTheme"
                      className="mr-2"
                      checked={colorTheme === theme}
                      onChange={() => handleColorThemeChange(theme)}
                    />
                    <label 
                      htmlFor={`theme-${theme}`} 
                      className={`text-xs capitalize cursor-pointer ${theme === 'custom' && hasCustomChanges ? 'text-yellow-400' : ''}`}
                    >
                      {theme}
                    </label>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 flex flex-wrap gap-1">
                {uniqueCategories.slice(0, 5).map(category => {
                  const color = dynamicColorThemes[colorTheme]?.[category] || "#cccccc";
                  return (
                    <div 
                      key={`preview-${category}`} 
                      className="w-5 h-5 rounded-full"
                      style={{backgroundColor: color}}
                      title={category}
                    ></div>
                  );
                })}
                {uniqueCategories.length > 5 && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center bg-gray-700 text-xs">
                    +{uniqueCategories.length - 5}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* Groups Tab */}
        <TabsContent value="byGroup" className="space-y-4">
          <div className="mb-2">
            <p className="text-xs text-gray-400 mb-2">Customize colors for each category group:</p>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
              {uniqueCategories.map(category => (
                <div key={category} className="flex items-center mb-2">
                  <label className="w-24 inline-block text-xs text-gray-300 truncate" title={category}>{category}:</label>
                  <input
                    type="color"
                    value={categoryColors[category] || "#3498db"}
                    onChange={(e) => handleCategoryColorChange(category, e.target.value)}
                    className="w-6 h-6 rounded-sm cursor-pointer"
                    style={{padding: 0}}
                  />
                  <div 
                    className="w-6 h-6 ml-2 rounded-sm"
                    style={{backgroundColor: dynamicColorThemes[colorTheme]?.[category] || "#3498db"}}
                    title="Current theme color"
                  ></div>
                </div>
              ))}
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs bg-blue-600 text-white hover:bg-blue-500"
                onClick={handleApplyGroupColors}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Apply Group Colors
              </Button>
            </div>
          </div>
          
          <div className="mt-4 bg-gray-800 p-3 rounded-md">
            <p className="text-xs text-gray-400">
              {colorTheme === 'custom' 
                ? "Using custom colors for categories" 
                : `Using "${colorTheme}" theme colors`}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {hasCustomChanges 
                ? "You have unsaved color changes" 
                : "No pending changes"}
            </p>
          </div>
        </TabsContent>
        
        {/* Nodes Tab */}
        <TabsContent value="individual" className="space-y-4">
          <div className="mb-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search nodes..."
                value={nodeFilter}
                onChange={(e) => setNodeFilter(e.target.value)}
                className="w-full p-2 rounded-md border border-gray-600 bg-gray-700 text-white text-xs pl-8"
              />
              <Search className="w-4 h-4 absolute left-2 top-2 text-gray-400" />
            </div>
            
            <div className="mt-4 space-y-1 max-h-56 overflow-y-auto pr-2">
              {filteredNodes.map(node => {
                // Get appropriate color
                const currentTheme = dynamicColorThemes[colorTheme] || dynamicColorThemes.default || {};
                const nodeColor = customNodeColors[node.id] || 
                                currentTheme[node.category] || 
                                "#cccccc";
                
                return (
                <div 
                  key={node.id} 
                  className={`flex items-center py-1 px-2 rounded ${
                    selectedColorNode?.id === node.id ? 'bg-gray-600' : 'hover:bg-gray-700'
                  } cursor-pointer group`}
                  onClick={() => handleNodeSelect(node)}
                >
                  <span 
                    className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: nodeColor }}
                  ></span>
                  <span className="text-xs flex-grow truncate" title={node.id}>
                    {node.id}
                  </span>
                  <div className="ml-auto flex-shrink-0 text-xs text-gray-400">
                    {node.category}
                  </div>
                  {customNodeColors[node.id] && (
                    <div 
                      className="ml-1 w-2 h-2 rounded-full bg-blue-400"
                      title="Has custom color"
                    ></div>
                  )}
                </div>
              )})}
              {filteredNodes.length === 0 && (
                <div className="text-xs text-gray-400 py-2">
                  No nodes match your search
                </div>
              )}
            </div>
          </div>
          
          {selectedColorNode && (
            <div className="p-3 bg-gray-700 rounded-md">
              <div className="mb-2">
                <h3 className="text-sm font-medium mb-1">{selectedColorNode.id}</h3>
                <p className="text-xs text-gray-400">Category: {selectedColorNode.category}</p>
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="color"
                  value={selectedColorValue}
                  onChange={(e) => handleNodeColorChange(e.target.value)}
                  className="w-8 h-8 rounded-sm cursor-pointer"
                  style={{padding: 0}}
                />
                <div className="flex flex-col">
                  <span className="text-xs">Selected Color</span>
                  <span className="text-xs text-gray-400">{selectedColorValue}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 text-xs bg-blue-600 text-white hover:bg-blue-500"
                  onClick={handleApplyIndividualColor}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Apply Color
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 text-xs bg-gray-600 text-white hover:bg-gray-500"
                  onClick={handleResetNodeColor}
                  disabled={!customNodeColors[selectedColorNode.id]}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          )}
          
          <div className="mt-4 bg-gray-800 p-3 rounded-md">
            <p className="text-xs text-gray-400">
              {Object.keys(customNodeColors).length} nodes with custom colors
            </p>
          </div>
        </TabsContent>
        
        {/* Background Tab */}
        <TabsContent value="background" className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center">
              <label className="w-24 inline-block text-xs text-gray-300">Background:</label>
              <input
                type="color"
                value={localBgColor}
                onChange={(e) => setLocalBgColor(e.target.value)}
                className="w-6 h-6 rounded-sm cursor-pointer"
                style={{padding: 0}}
              />
              <span className="ml-2 text-xs">{localBgColor}</span>
            </div>
            
            <div className="flex items-center">
              <label className="w-24 inline-block text-xs text-gray-300">Opacity:</label>
              <Slider
                value={[localBgOpacity]}
                min={0.1}
                max={1.0}
                step={0.1}
                onValueChange={(vals) => setLocalBgOpacity(vals[0])}
                className="flex-grow"
              />
              <span className="w-8 text-right ml-2 text-xs">{localBgOpacity.toFixed(1)}</span>
            </div>
            
            <div className="flex items-center">
              <label className="w-24 inline-block text-xs text-gray-300">Text Color:</label>
              <input
                type="color"
                value={localTxtColor}
                onChange={(e) => setLocalTxtColor(e.target.value)}
                className="w-6 h-6 rounded-sm cursor-pointer"
                style={{padding: 0}}
              />
              <span className="ml-2 text-xs">{localTxtColor}</span>
            </div>
            
            <div className="flex items-center">
              <label className="w-24 inline-block text-xs text-gray-300">Link Color:</label>
              <input
                type="color"
                value={localLinkColor}
                onChange={(e) => setLocalLinkColor(e.target.value)}
                className="w-6 h-6 rounded-sm cursor-pointer"
                style={{padding: 0}}
              />
              <span className="ml-2 text-xs">{localLinkColor}</span>
            </div>
            
            <div className="flex items-center">
              <label className="w-24 inline-block text-xs text-gray-300">Node Border:</label>
              <input
                type="color"
                value={localNodeStrokeColor}
                onChange={(e) => setLocalNodeStrokeColor(e.target.value)}
                className="w-6 h-6 rounded-sm cursor-pointer"
                style={{padding: 0}}
              />
              <span className="ml-2 text-xs">{localNodeStrokeColor}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs bg-blue-600 text-white hover:bg-blue-500"
              onClick={handleApplyBackgroundSettings}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Apply Colors
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs bg-gray-600 text-white hover:bg-gray-500"
              onClick={handleResetBackgroundSettings}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>
          
          <div className="p-3 bg-gray-700 rounded-md">
            <div className="flex gap-3 items-center">
              <div className="flex-1 h-8 rounded-md" style={{backgroundColor: localBgColor, opacity: localBgOpacity}}></div>
              <div className="w-1 h-8 rounded-md" style={{backgroundColor: localLinkColor}}></div>
              <div className="w-4 h-4 rounded-full" style={{backgroundColor: "#3498db", border: `2px solid ${localNodeStrokeColor}`}}></div>
              <div className="text-xs rounded-md px-1" style={{color: localTxtColor, backgroundColor: "rgba(0,0,0,0.5)"}}>Text</div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Preview of color scheme</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NetworkColorControls;