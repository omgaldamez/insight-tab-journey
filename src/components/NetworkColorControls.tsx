import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Node } from '@/types/networkTypes';
import { RotateCcw, CheckCircle2 } from 'lucide-react';

interface NetworkColorControlsProps {
  uniqueCategories: string[];
  nodes: Node[];
  initialColorTheme: string;
  initialNodeSize: number;
  initialLinkColor: string;
  initialBackgroundColor: string;
  initialTextColor: string;
  initialNodeStrokeColor: string;
  initialBackgroundOpacity: number;
  initialCustomNodeColors: {[key: string]: string};
  initialDynamicColorThemes: {[key: string]: {[key: string]: string}};
  onColorsChanged?: (colorState: {
    colorTheme?: string;
    activeColorTab?: string;
    nodeSize?: number;
    backgroundColor?: string;
    textColor?: string;
    linkColor?: string;
    backgroundOpacity?: number;
    nodeStrokeColor?: string;
    customNodeColors?: { [key: string]: string };
  }) => void;
}

const NetworkColorControls: React.FC<NetworkColorControlsProps> = ({
  uniqueCategories,
  nodes,
  initialColorTheme = 'default',
  initialNodeSize = 1.0,
  initialLinkColor = '#999999',
  initialBackgroundColor = '#f5f5f5',
  initialTextColor = '#ffffff',
  initialNodeStrokeColor = '#000000',
  initialBackgroundOpacity = 1.0,
  initialCustomNodeColors = {},
  initialDynamicColorThemes = {},
  onColorsChanged
}) => {
  // Set up internal state
  const [colorTheme, setColorTheme] = useState(initialColorTheme);
  const [activeTab, setActiveTab] = useState('presets');
  const [nodeSize, setNodeSize] = useState(initialNodeSize);
  const [linkColor, setLinkColor] = useState(initialLinkColor);
  const [backgroundColor, setBackgroundColor] = useState(initialBackgroundColor);
  const [textColor, setTextColor] = useState(initialTextColor);
  const [nodeStrokeColor, setNodeStrokeColor] = useState(initialNodeStrokeColor);
  const [backgroundOpacity, setBackgroundOpacity] = useState(initialBackgroundOpacity);
  const [nodeFilter, setNodeFilter] = useState('');
  const [filteredNodes, setFilteredNodes] = useState<Node[]>([]);
  const [customNodeColors, setCustomNodeColors] = useState(initialCustomNodeColors);
  const [categoryColors, setCategoryColors] = useState<{[key: string]: string}>({});
  const [dynamicColorThemes, setDynamicColorThemes] = useState(initialDynamicColorThemes);
  const [hasCustomChanges, setHasCustomChanges] = useState(false);
  
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
  
  // Filter nodes for individual color selection
  useEffect(() => {
    if (nodes.length === 0) return;
    
    const filtered = nodeFilter
      ? nodes.filter(node => 
          node.id.toLowerCase().includes(nodeFilter.toLowerCase()) || 
          node.category.toLowerCase().includes(nodeFilter.toLowerCase()))
      : nodes.slice(0, 20);
    
    setFilteredNodes(filtered);
  }, [nodes, nodeFilter]);

  // This function ensures each category color picker only updates its own color
  const handleCategoryColorChange = (category: string, color: string) => {
    // Update just this specific category's color
    const updatedColors = {...categoryColors};
    updatedColors[category] = color;
    
    // Update colors state
    setCategoryColors(updatedColors);
    
    // For custom theme, we need to update the theme data
    const updatedThemes = {...dynamicColorThemes};
    if (!updatedThemes.custom) {
      updatedThemes.custom = {...(updatedThemes.default || {})};
    } else {
      updatedThemes.custom = {...updatedThemes.custom};
    }
    
    // Only update this specific category's color
    updatedThemes.custom[category] = color;
    setDynamicColorThemes(updatedThemes);
    
    // Make sure we're on custom theme
    if (colorTheme !== 'custom') {
      setColorTheme('custom');
    }
    
    // Mark that we have custom changes
    setHasCustomChanges(true);
    
    // Update theme tab to "custom"
    setActiveTab('custom');
    
    // Notify parent component
    if (onColorsChanged) {
      onColorsChanged({
        colorTheme: 'custom',
        activeColorTab: 'custom',
        nodeSize
      });
    }
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
    
    setColorTheme(theme);
    setActiveTab('presets');
    
    // Reset custom changes flag if switching away from custom
    if (theme !== 'custom') {
      setHasCustomChanges(false);
    }
    
    // Notify parent
    if (onColorsChanged) {
      onColorsChanged({
        colorTheme: theme,
        activeColorTab: 'presets',
        nodeSize
      });
    }
  };
  
  // Handle individual node color change
  const handleNodeColorChange = (nodeId: string, color: string) => {
    setCustomNodeColors(prev => ({
      ...prev,
      [nodeId]: color
    }));
    
    // Notify parent component with the updated data
    if (onColorsChanged) {
      onColorsChanged({
        customNodeColors: {
          ...customNodeColors,
          [nodeId]: color
        }
      });
    }
  };
  
  // Reset individual node color
  const handleResetNodeColor = (nodeId: string) => {
    setCustomNodeColors(prev => {
      const newColors = {...prev};
      delete newColors[nodeId];
      return newColors;
    });
    
    // Notify parent component
    if (onColorsChanged) {
      onColorsChanged({
        customNodeColors: {...customNodeColors} // Send a copy without the removed entry
      });
    }
  };
  
  // Update node size
  const handleNodeSizeChange = (values: number[]) => {
    setNodeSize(values[0]);
    
    // Notify parent component
    if (onColorsChanged) {
      onColorsChanged({
        nodeSize: values[0]
      });
    }
  };
  
  // Apply background settings
  const handleApplyBackgroundSettings = () => {
    // Notify parent component
    if (onColorsChanged) {
      onColorsChanged({
        backgroundColor,
        textColor,
        linkColor,
        backgroundOpacity,
        nodeStrokeColor
      });
    }
  };
  
  // Reset background settings
  const handleResetBackgroundSettings = () => {
    setBackgroundColor('#f5f5f5');
    setTextColor('#ffffff');
    setLinkColor('#999999');
    setBackgroundOpacity(1.0);
    setNodeStrokeColor('#000000');
    
    // Notify parent component
    if (onColorsChanged) {
      onColorsChanged({
        backgroundColor: '#f5f5f5',
        textColor: '#ffffff',
        linkColor: '#999999',
        backgroundOpacity: 1.0,
        nodeStrokeColor: '#000000'
      });
    }
  };

  return (
    <div className="text-sm">
      <Tabs defaultValue="presets" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="presets" className="flex-1">Presets</TabsTrigger>
          <TabsTrigger value="groups" className="flex-1">Groups</TabsTrigger>
          <TabsTrigger value="nodes" className="flex-1">Nodes</TabsTrigger>
          <TabsTrigger value="background" className="flex-1">Background</TabsTrigger>
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
        <TabsContent value="groups" className="space-y-4">
          <div className="mb-2">
            <p className="text-xs text-gray-400 mb-2">Customize colors for each category group:</p>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
              {uniqueCategories.map(category => (
                <div key={category} className="flex items-center mb-2">
                  <label className="w-24 inline-block text-xs text-gray-300">{category}:</label>
                  <input
                    type="color"
                    value={categoryColors[category] || "#3498db"}
                    onChange={(e) => handleCategoryColorChange(category, e.target.value)}
                    className="w-6 h-6 rounded-sm cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-4 bg-gray-800 p-3 rounded-md">
            <p className="text-xs text-gray-400">
              {colorTheme === 'custom' 
                ? "Using custom colors for categories" 
                : `Using "${colorTheme}" theme colors`}
            </p>
          </div>
        </TabsContent>
        
        {/* Nodes Tab */}
        <TabsContent value="nodes" className="space-y-4">
          <div className="mb-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search nodes..."
                value={nodeFilter}
                onChange={(e) => setNodeFilter(e.target.value)}
                className="w-full p-2 rounded-md border border-gray-600 bg-gray-700 text-white text-xs"
              />
              <Search className="w-4 h-4 absolute right-2 top-2 text-gray-400" />
            </div>
            
            <div className="mt-4 space-y-2 max-h-56 overflow-y-auto pr-2">
              {filteredNodes.map(node => (
                <div key={node.id} className="flex items-center mb-1 group">
                  <span 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{
                      backgroundColor: customNodeColors[node.id] || 
                        dynamicColorThemes[colorTheme]?.[node.category] || 
                        "#cccccc"
                    }}
                  ></span>
                  <span className="text-xs flex-grow truncate" title={node.id}>
                    {node.id}
                  </span>
                  <div className="ml-auto flex items-center">
                    <input
                      type="color"
                      value={customNodeColors[node.id] || 
                        dynamicColorThemes[colorTheme]?.[node.category] || 
                        "#cccccc"}
                      onChange={(e) => handleNodeColorChange(node.id, e.target.value)}
                      className="w-5 h-5 rounded-sm cursor-pointer opacity-40 group-hover:opacity-100"
                    />
                    {customNodeColors[node.id] && (
                      <button
                        onClick={() => handleResetNodeColor(node.id)}
                        className="ml-1 p-1 text-gray-400 hover:text-gray-200 opacity-40 group-hover:opacity-100"
                        title="Reset to category color"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filteredNodes.length === 0 && (
                <div className="text-xs text-gray-400 py-2">
                  No nodes match your search
                </div>
              )}
            </div>
          </div>
          
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
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-6 h-6 rounded-sm cursor-pointer"
              />
            </div>
            
            <div className="flex items-center">
              <label className="w-24 inline-block text-xs text-gray-300">Opacity:</label>
              <Slider
                value={[backgroundOpacity]}
                min={0.1}
                max={1.0}
                step={0.1}
                onValueChange={(vals) => setBackgroundOpacity(vals[0])}
                className="flex-grow"
              />
              <span className="w-8 text-right ml-2 text-xs">{backgroundOpacity.toFixed(1)}</span>
            </div>
            
            <div className="flex items-center">
              <label className="w-24 inline-block text-xs text-gray-300">Text Color:</label>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-6 h-6 rounded-sm cursor-pointer"
              />
            </div>
            
            <div className="flex items-center">
              <label className="w-24 inline-block text-xs text-gray-300">Link Color:</label>
              <input
                type="color"
                value={linkColor}
                onChange={(e) => setLinkColor(e.target.value)}
                className="w-6 h-6 rounded-sm cursor-pointer"
              />
            </div>
            
            <div className="flex items-center">
              <label className="w-24 inline-block text-xs text-gray-300">Node Border:</label>
              <input
                type="color"
                value={nodeStrokeColor}
                onChange={(e) => setNodeStrokeColor(e.target.value)}
                className="w-6 h-6 rounded-sm cursor-pointer"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-xs bg-gray-600 text-white hover:bg-gray-500"
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Missing Search component (adding a simple implementation)
const Search = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export default NetworkColorControls;