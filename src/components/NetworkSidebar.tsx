import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ChevronDown, ChevronRight, Search, PanelRightClose, PanelRightOpen, Edit2, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ColorTheme {
  [key: string]: string;
}

interface NodeCount {
  [key: string]: number;
  total: number;
}

interface Node {
  id: string;
  category: string;
  customColor?: string | null;
}

interface NetworkSidebarProps {
  linkDistance: number;
  linkStrength: number;
  nodeCharge: number;
  nodeSize: number;
  nodeGroup: string;
  colorTheme: string;
  activeColorTab: string;
  expandedSections: {
    networkControls: boolean;
    nodeControls: boolean;
    colorControls: boolean;
    networkInfo: boolean;
  };
  selectedNode: Node | null;
  selectedNodeConnections: {
    to: string[];
    from: string[];
  };
  nodeCounts: NodeCount;
  colorThemes: ColorTheme;
  nodes: Node[];
  customNodeColors: {[key: string]: string};
  backgroundColor: string;
  textColor: string;
  linkColor: string;
  nodeStrokeColor: string;
  backgroundOpacity: number;
  title: string;
  isCollapsed: boolean;
  uniqueCategories: string[];
  onParameterChange: (type: string, value: number) => void;
  onNodeGroupChange: (group: string) => void;
  onColorThemeChange: (theme: string) => void;
  onApplyGroupColors: (categoryColorMap: {[key: string]: string}) => void;
  onApplyIndividualColor: (nodeId: string, color: string) => void;
  onResetIndividualColor: (nodeId: string) => void;
  onApplyBackgroundColors: (bgColor: string, textColor: string, linkColor: string, opacity: number, nodeStrokeColor: string) => void;
  onResetBackgroundColors: () => void;
  onResetSimulation: () => void;
  onDownloadData: (format: string) => void;
  onDownloadGraph: (format: string) => void;
  onResetGraph: () => void;
  onToggleSection: (section: string) => void;
  onColorTabChange: (tab: string) => void;
  onTitleChange: (title: string) => void;
  onToggleSidebar: () => void;
}

const NetworkSidebar: React.FC<NetworkSidebarProps> = ({
  linkDistance,
  linkStrength,
  nodeCharge,
  nodeSize,
  nodeGroup,
  colorTheme,
  activeColorTab,
  expandedSections,
  selectedNode,
  selectedNodeConnections,
  nodeCounts,
  colorThemes,
  nodes,
  customNodeColors,
  backgroundColor,
  textColor,
  linkColor,
  nodeStrokeColor,
  backgroundOpacity,
  title,
  isCollapsed,
  uniqueCategories,
  onParameterChange,
  onNodeGroupChange,
  onColorThemeChange,
  onApplyGroupColors,
  onApplyIndividualColor,
  onResetIndividualColor,
  onApplyBackgroundColors,
  onResetBackgroundColors,
  onResetSimulation,
  onDownloadData,
  onDownloadGraph,
  onResetGraph,
  onToggleSection,
  onColorTabChange,
  onTitleChange,
  onToggleSidebar
}) => {
  const { toast } = useToast();
  const [nodeSearch, setNodeSearch] = useState('');
  const [selectedColorNode, setSelectedColorNode] = useState<Node | null>(null);
  const [selectedColorValue, setSelectedColorValue] = useState('#3498db');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(title || "Untitled Network");
  
  // Dynamic color inputs for categories
  const [categoryColors, setCategoryColors] = useState<{[key: string]: string}>({});
  
  // Background color inputs
  const [bgColor, setBgColor] = useState(backgroundColor);
  const [txtColor, setTxtColor] = useState(textColor);
  const [lnkColor, setLnkColor] = useState(linkColor);
  const [nodeStrokeClr, setNodeStrokeClr] = useState(nodeStrokeColor);
  const [bgOpacity, setBgOpacity] = useState(backgroundOpacity);
  
  // Update category colors when theme changes
  useEffect(() => {
    const newCategoryColors: {[key: string]: string} = {};
    
    // Set default colors from the current theme for all categories
    uniqueCategories.forEach(category => {
      newCategoryColors[category] = colorThemes[category] || "#3498db";
    });
    
    setCategoryColors(newCategoryColors);
  }, [colorTheme, colorThemes, uniqueCategories]);
  
  // Update background colors when props change
  useEffect(() => {
    setBgColor(backgroundColor);
    setTxtColor(textColor);
    setLnkColor(linkColor);
    setNodeStrokeClr(nodeStrokeColor);
    setBgOpacity(backgroundOpacity);
  }, [backgroundColor, textColor, linkColor, nodeStrokeColor, backgroundOpacity]);
  
  // Handle individual node color selection
  const handleNodeSelect = (node: Node) => {
    setSelectedColorNode(node);
    // Use custom color if available, otherwise use theme color
    const currentColor = customNodeColors[node.id] || 
                         colorThemes[node.category] || 
                         "#3498db";
    setSelectedColorValue(currentColor);
  };
  
  // Filter nodes based on search
  const filteredNodes = nodes.filter(node => 
    node.id.toLowerCase().includes(nodeSearch.toLowerCase())
  ).sort((a, b) => a.id.localeCompare(b.id));
  
  // Handle group colors apply
  const handleApplyGroupColors = () => {
    // Pass the category colors to the parent component
    onApplyGroupColors(categoryColors);
  };
  
  // Handle background colors apply
  const handleApplyBackgroundColors = () => {
    onApplyBackgroundColors(bgColor, txtColor, lnkColor, bgOpacity, nodeStrokeClr);
  };
  
  // Handle title editing
  const handleStartEditTitle = () => {
    setIsEditingTitle(true);
    setTitleInput(title || "Untitled Network");
  };

  const handleSaveTitle = () => {
    onTitleChange(titleInput.trim() || "Untitled Network");
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setTitleInput(title || "Untitled Network");
    }
  };

  // Handle category color change
  const handleCategoryColorChange = (category: string, color: string) => {
    setCategoryColors(prev => ({
      ...prev,
      [category]: color
    }));
  };

  // If sidebar is collapsed, show minimal version
  if (isCollapsed) {
    return (
      <div className="w-12 bg-gray-800 text-white h-full shadow-lg flex flex-col items-center py-4">
        <button
          className="p-2 rounded-md hover:bg-gray-700 mb-4"
          onClick={onToggleSidebar}
          title="Expand sidebar"
        >
          <PanelRightOpen className="w-5 h-5" />
        </button>
        <div className="text-white text-xs font-medium rotate-90 mt-6 whitespace-nowrap">
          {title || "Untitled Network"}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-800 text-white h-full overflow-y-auto shadow-lg flex flex-col">
      <div className="flex justify-between items-center p-5 pb-2">
        {isEditingTitle ? (
          <div className="flex items-center">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleTitleKeyDown}
              className="bg-gray-700 text-white px-2 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xl font-semibold mr-2"
              autoFocus
            />
            <button 
              onClick={handleSaveTitle}
              className="p-1.5 rounded-md hover:bg-gray-700"
            >
              <Check className="w-4 h-4 text-green-400" />
            </button>
          </div>
        ) : (
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-100">{title || "Untitled Network"}</h1>
            <button 
              className="ml-2 p-1 rounded-md hover:bg-gray-700"
              onClick={handleStartEditTitle}
              title="Edit title"
            >
              <Edit2 className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        )}
        <button
          className="p-1.5 rounded-md hover:bg-gray-700"
          onClick={onToggleSidebar}
          title="Collapse sidebar"
        >
          <PanelRightClose className="w-5 h-5" />
        </button>
      </div>

      {/* Removed fullscreen button */}

      {/* Network Controls Section */}
      <div className="px-5 mb-3">
        <button 
          className="bg-gray-700 w-full p-2.5 rounded-md flex justify-between items-center cursor-pointer mb-1"
          onClick={() => onToggleSection('networkControls')}
        >
          <h2 className="text-base font-medium text-blue-400 m-0">Network Controls</h2>
          {expandedSections.networkControls ? 
            <ChevronDown className="w-4 h-4 text-white" /> : 
            <ChevronRight className="w-4 h-4 text-white" />
          }
        </button>
        
        {expandedSections.networkControls && (
          <div className="mb-4 bg-gray-700 p-3 rounded-md">
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <label className="w-32 inline-block text-sm">Node Size:</label>
                <Slider
                  value={[nodeSize]}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  onValueChange={(vals) => onParameterChange("nodeSize", vals[0])}
                  className="flex-grow"
                />
                <span className="w-8 text-right ml-2 text-xs">{nodeSize.toFixed(1)}</span>
              </div>
              
              <div className="flex items-center mb-2">
                <label className="w-32 inline-block text-sm">Link Strength:</label>
                <Slider
                  value={[linkStrength]}
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  onValueChange={(vals) => onParameterChange("linkStrength", vals[0])}
                  className="flex-grow"
                />
                <span className="w-8 text-right ml-2 text-xs">{linkStrength.toFixed(1)}</span>
              </div>
              
              <div className="flex items-center mb-2">
                <label className="w-32 inline-block text-sm">Repulsion Force:</label>
                <Slider
                  value={[Math.abs(nodeCharge) / 300]}
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  onValueChange={(vals) => onParameterChange("nodeCharge", -vals[0] * 300)}
                  className="flex-grow"
                />
                <span className="w-8 text-right ml-2 text-xs">{(Math.abs(nodeCharge) / 300).toFixed(1)}</span>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-1 text-xs bg-gray-600 text-white hover:bg-gray-500"
                onClick={onResetSimulation}
              >
                Reset Physics
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Node Controls Section */}
      <div className="px-5 mb-3">
        <button 
          className="bg-gray-700 w-full p-2.5 rounded-md flex justify-between items-center cursor-pointer mb-1"
          onClick={() => onToggleSection('nodeControls')}
        >
          <h2 className="text-base font-medium text-blue-400 m-0">Node Controls</h2>
          {expandedSections.nodeControls ? 
            <ChevronDown className="w-4 h-4 text-white" /> : 
            <ChevronRight className="w-4 h-4 text-white" />
          }
        </button>
        
        {expandedSections.nodeControls && (
          <div className="mb-4 bg-gray-700 p-3 rounded-md">
            <select 
              className="w-full p-2 rounded-md border border-gray-600 bg-gray-700 text-white text-sm"
              value={nodeGroup}
              onChange={(e) => onNodeGroupChange(e.target.value)}
            >
              <option value="all">All Groups</option>
              {uniqueCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      {/* Color Controls Section */}
      <div className="px-5 mb-3">
        <button 
          className="bg-gray-700 w-full p-2.5 rounded-md flex justify-between items-center cursor-pointer mb-1"
          onClick={() => onToggleSection('colorControls')}
        >
          <h2 className="text-base font-medium text-blue-400 m-0">Color Controls</h2>
          {expandedSections.colorControls ? 
            <ChevronDown className="w-4 h-4 text-white" /> : 
            <ChevronRight className="w-4 h-4 text-white" />
          }
        </button>
        
        {expandedSections.colorControls && (
          <div className="mb-4 bg-gray-700 p-3 rounded-md">
            <div className="border-b border-gray-600 mb-2 flex flex-wrap gap-1">
              <button 
                className={`px-3 py-2 text-xs ${activeColorTab === 'presets' ? 'bg-teal-600 text-white' : 'bg-gray-700 text-white'} rounded-t-md`}
                onClick={() => onColorTabChange('presets')}
              >
                Presets
              </button>
              <button 
                className={`px-3 py-2 text-xs ${activeColorTab === 'byGroup' ? 'bg-teal-600 text-white' : 'bg-gray-700 text-white'} rounded-t-md`}
                onClick={() => onColorTabChange('byGroup')}
              >
                By Group
              </button>
              <button 
                className={`px-3 py-2 text-xs ${activeColorTab === 'individual' ? 'bg-teal-600 text-white' : 'bg-gray-700 text-white'} rounded-t-md`}
                onClick={() => onColorTabChange('individual')}
              >
                Individual
              </button>
              <button 
                className={`px-3 py-2 text-xs ${activeColorTab === 'background' ? 'bg-teal-600 text-white' : 'bg-gray-700 text-white'} rounded-t-md`}
                onClick={() => onColorTabChange('background')}
              >
                Background
              </button>
            </div>
            
            {/* Preset colors tab */}
            {activeColorTab === 'presets' && (
              <div>
                <select 
                  className="w-full p-2 mb-2 rounded-md border border-gray-600 bg-gray-700 text-white text-sm"
                  value={colorTheme}
                  onChange={(e) => onColorThemeChange(e.target.value)}
                >
                  <option value="default">Default</option>
                  <option value="bright">Bright Colors</option>
                  <option value="pastel">Pastel</option>
                  <option value="ocean">Ocean</option>
                  <option value="autumn">Autumn</option>
                  <option value="monochrome">Monochrome</option>
                  {colorTheme === 'custom' && <option value="custom">Custom</option>}
                </select>
              </div>
            )}
            
            {/* Group color customization tab */}
            {activeColorTab === 'byGroup' && (
              <div>
                {uniqueCategories.map(category => (
                  <div key={category} className="flex items-center mb-2">
                    <label className="w-24 inline-block text-sm truncate">{category}:</label>
                    <input 
                      type="color" 
                      value={categoryColors[category] || colorThemes[category] || "#cccccc"}
                      onChange={(e) => handleCategoryColorChange(category, e.target.value)}
                      className="w-12 h-8 mr-2 bg-transparent border-none" 
                    />
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2 bg-blue-600 text-white hover:bg-blue-500 border-none"
                  onClick={handleApplyGroupColors}
                >
                  Apply Colors
                </Button>
              </div>
            )}
            
            {/* Individual node color customization tab */}
            {activeColorTab === 'individual' && (
              <div>
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search nodes..."
                      value={nodeSearch}
                      onChange={(e) => setNodeSearch(e.target.value)}
                      className="pl-8 w-full p-2 rounded-md border border-gray-600 bg-gray-700 text-white text-sm"
                    />
                  </div>
                  
                  <div className="mt-2 max-h-48 overflow-y-auto bg-gray-700 rounded-md">
                    {filteredNodes.length > 0 ? (
                      filteredNodes.map((node) => (
                        <div
                          key={node.id}
                          className={`px-2 py-1.5 cursor-pointer border-l-4 hover:bg-gray-600 ${
                            selectedColorNode?.id === node.id ? 'bg-gray-600' : ''
                          }`}
                          style={{ 
                            borderLeftColor: customNodeColors[node.id] || 
                                           colorThemes[node.category] || 
                                           '#95a5a6'
                          }}
                          onClick={() => handleNodeSelect(node)}
                        >
                          <span className="text-sm">{node.id}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-gray-400">No nodes match your search</div>
                    )}
                  </div>
                </div>
                
                {selectedColorNode && (
                  <div className="p-2 bg-gray-600 rounded-md">
                    <div className="mb-2 text-sm font-medium">
                      <p>Color for: <span className="text-blue-300">{selectedColorNode.id}</span></p>
                      <p className="text-xs text-gray-400">Category: {selectedColorNode.category}</p>
                    </div>
                    <div className="flex items-center mb-2">
                      <input 
                        type="color" 
                        value={selectedColorValue}
                        onChange={(e) => setSelectedColorValue(e.target.value)}
                        className="w-12 h-8 mr-2 bg-transparent border-none" 
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 bg-blue-600 text-white hover:bg-blue-500 border-none text-xs"
                        onClick={() => onApplyIndividualColor(selectedColorNode.id, selectedColorValue)}
                      >
                        Apply Color
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 bg-gray-600 text-white hover:bg-gray-500 border-none text-xs"
                        onClick={() => onResetIndividualColor(selectedColorNode.id)}
                      >
                        Reset Color
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Background & Text Colors Tab */}
            {activeColorTab === 'background' && (
              <div>
                <div className="flex items-center mb-2">
                  <label className="w-24 inline-block text-sm">Background:</label>
                  <input 
                    type="color" 
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-12 h-8 mr-2 bg-transparent border-none" 
                  />
                </div>
                <div className="flex items-center mb-2">
                  <label className="w-24 inline-block text-sm">Node Labels:</label>
                  <input 
                    type="color" 
                    value={txtColor}
                    onChange={(e) => setTxtColor(e.target.value)}
                    className="w-12 h-8 mr-2 bg-transparent border-none" 
                  />
                </div>
                <div className="flex items-center mb-2">
                  <label className="w-24 inline-block text-sm">Links:</label>
                  <input 
                    type="color" 
                    value={lnkColor}
                    onChange={(e) => setLnkColor(e.target.value)}
                    className="w-12 h-8 mr-2 bg-transparent border-none" 
                  />
                </div>
                <div className="flex items-center mb-2">
                  <label className="w-24 inline-block text-sm">Node Stroke:</label>
                  <input 
                    type="color" 
                    value={nodeStrokeClr}
                    onChange={(e) => setNodeStrokeClr(e.target.value)}
                    className="w-12 h-8 mr-2 bg-transparent border-none" 
                  />
                </div>
                
                <div className="mt-3 mb-2">
                  <label className="block mb-1 text-sm">Background Opacity:</label>
                  <div className="flex items-center">
                    <Slider
                      value={[bgOpacity]}
                      min={0}
                      max={1}
                      step={0.05}
                      onValueChange={(vals) => setBgOpacity(vals[0])}
                      className="flex-grow"
                    />
                    <span className="w-8 text-right ml-2 text-xs">{bgOpacity.toFixed(1)}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 bg-blue-600 text-white hover:bg-blue-500 border-none"
                    onClick={handleApplyBackgroundColors}
                  >
                    Apply Colors
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 bg-gray-600 text-white hover:bg-gray-500 border-none"
                    onClick={onResetBackgroundColors}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-3 bg-red-600 text-white hover:bg-red-500 border-none"
              onClick={onResetGraph}
            >
              Reset Graph & Colors
            </Button>
          </div>
        )}
      </div>
      
      {/* Network Info Section */}
      <div className="px-5 mb-3">
        <button 
          className="bg-gray-700 w-full p-2.5 rounded-md flex justify-between items-center cursor-pointer mb-1"
          onClick={() => onToggleSection('networkInfo')}
        >
          <h2 className="text-base font-medium text-blue-400 m-0">Network Info</h2>
          {expandedSections.networkInfo ? 
            <ChevronDown className="w-4 h-4 text-white" /> : 
            <ChevronRight className="w-4 h-4 text-white" />
          }
        </button>
        
        {expandedSections.networkInfo && (
          <div className="mb-4 bg-gray-700 p-3 rounded-md">
            <div>
              <p className="mb-1 text-sm">Total Nodes: <span>{nodeCounts.total}</span></p>
              {uniqueCategories.map(category => (
                <p key={category} className="mb-1 text-sm">
                  {category}: <span>{nodeCounts[category] || 0}</span>
                </p>
              ))}
            </div>
            
            {selectedNode && (
              <div className="mt-4">
                <h3 className="text-base font-medium mb-2">Selected Node</h3>
                <p className="mb-1 text-sm">Name: <span>{selectedNode.id}</span></p>
                <p className="mb-1 text-sm">Type: <span>{selectedNode.category}</span></p>
                <p className="mb-1 text-sm">Total Connections: <span>{selectedNodeConnections.to.length + selectedNodeConnections.from.length}</span></p>
                
                <div className="mt-2">
                  <h4 className="text-sm font-medium mb-1 text-blue-400">Connected To:</h4>
                  <ul className="ml-4 text-xs text-gray-300">
                    {selectedNodeConnections.to.length > 0 ? (
                      selectedNodeConnections.to.map((name, i) => (
                        <li key={`to-${i}`}>{name}</li>
                      ))
                    ) : (
                      <li>None</li>
                    )}
                  </ul>
                </div>
                
                <div className="mt-2">
                  <h4 className="text-sm font-medium mb-1 text-blue-400">Connected From:</h4>
                  <ul className="ml-4 text-xs text-gray-300">
                    {selectedNodeConnections.from.length > 0 ? (
                      selectedNodeConnections.from.map((name, i) => (
                        <li key={`from-${i}`}>{name}</li>
                      ))
                    ) : (
                      <li>None</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Removed download buttons from the sidebar */}
    </div>
  );
};

export default NetworkSidebar;