import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  PanelRightClose, 
  PanelRightOpen, 
  Edit2, 
  Check, 
  LayoutGrid, 
  Circle, 
  GitBranch, 
  ZoomIn,
  Box, 
  RotateCcw,
  Info,
  Network,
  Globe, 
  ZoomOut,
  Target, 
  Users,
  Settings,
  Save
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import NetworkColorControls from './NetworkColorControls';
import { getNodeColor } from '@/utils/colorThemes';
import TooltipSettings, { TooltipDetail, TooltipTrigger } from './TooltipSettings';
import ConfigPresets from './ConfigPresets';

// Update visualization type to include 3D
export type VisualizationType = 'network' | 'arc' | '3d' | 'rad360' |
'arcLineal' | 'nodeNav' | 'routeFinder' | 'groupable' | 'chord';

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
    visualizationType: boolean;
    threeDControls?: boolean;
    tooltipSettings: boolean;
    configPresets?: boolean;
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
  fixNodesOnDrag: boolean;
  visualizationType: VisualizationType;
  
  // Tooltip settings
  tooltipDetail: TooltipDetail;
  tooltipTrigger: TooltipTrigger;
  
  // 3D specific props
  rotationSpeed?: number;
  showLabels?: boolean;
  threeDLayout?: '3d-sphere' | '3d-network';
  threeDSortMode?: 'alphabetical' | 'category' | 'connections' | 'none';
  threeDCenterNode?: string | null;
  nodePositioningEnabled?: boolean;
  onToggleNodePositioning?: () => void;
  
  // Configuration preset handlers
  onGetCurrentConfig?: () => Record<string, unknown>;
  onApplyConfig?: (config: Record<string, unknown>) => void;
  
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
  onToggleFixNodes: () => void;
  onVisualizationTypeChange: (type: VisualizationType) => void;
  onTooltipDetailChange: (detail: TooltipDetail) => void;
  onTooltipTriggerChange: (trigger: TooltipTrigger) => void;
  onExportNodeData?: (format: 'text' | 'json') => void;
  onZoomToFit?: () => void;
  
  // 3D specific handlers
  onRotationSpeedChange?: (speed: number) => void;
  onToggleLabels?: () => void;
  onResetView?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onThreeDLayoutChange?: (layout: '3d-sphere' | '3d-network') => void;
  onThreeDSortModeChange?: (mode: 'alphabetical' | 'category' | 'connections' | 'none') => void;
  onThreeDCenterNodeChange?: (nodeId: string | null) => void;
}

// Create a mapping to store dynamicColorThemes
// This will be a placeholder until we properly integrate with the backend
const themesMapping: Record<string, Record<string, Record<string, string>>> = {};

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
  fixNodesOnDrag,
  visualizationType,
  tooltipDetail,
  tooltipTrigger,
  rotationSpeed = 0.001,
  showLabels = false,
  threeDLayout = '3d-sphere',
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
  onToggleSidebar,
  onToggleFixNodes,
  onVisualizationTypeChange,
  onTooltipDetailChange,
  onTooltipTriggerChange,
  onExportNodeData,
  onZoomToFit,
  onRotationSpeedChange,
  onToggleLabels,
  onResetView,
  onZoomIn,
  onZoomOut,
  onThreeDLayoutChange,
  onGetCurrentConfig,
  onApplyConfig
}) => {
  const { toast } = useToast();
  const [nodeSearch, setNodeSearch] = useState('');
  const [selectedColorNode, setSelectedColorNode] = useState<Node | null>(null);
  const [selectedColorValue, setSelectedColorValue] = useState('#3498db');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(title || "Untitled Network");
  
  // Create a dynamicColorThemes object that mimics the structure expected by NetworkColorControls
  const [dynamicColorThemes, setDynamicColorThemes] = useState<Record<string, Record<string, string>>>(() => {
    // If we already have a stored theme for this colorTheme, use it
    if (themesMapping[colorTheme]) {
      return themesMapping[colorTheme];
    }
    
    // Otherwise, create a basic structure with current theme
    const themes: Record<string, Record<string, string>> = {
      default: {},
      bright: {},
      pastel: {},
      ocean: {},
      autumn: {},
      monochrome: {},
      custom: {},
      // Add the extended theme types
      azureCascade: {},
      emeraldDepths: {},
      violetTwilight: {},
      roseReverie: {},
      amberGlow: {},
      exoticPlumage: {},
      pixelNostalgia: {},
      culinaryPalette: {},
      urbanCanvas: {},
      elementalContrast: {},
      forestToDesert: {},
      mysticMeadow: {},
      cosmicDrift: {}
    };
    
    // Populate current theme with colorThemes data
    themes[colorTheme] = {...colorThemes};
    
    // Store this for future reference
    themesMapping[colorTheme] = themes;
    
    return themes;
  });
  
  // Update dynamicColorThemes when colorTheme or colorThemes changes
  useEffect(() => {
    setDynamicColorThemes(prev => {
      const updated = {...prev};
      updated[colorTheme] = {...colorThemes};
      themesMapping[colorTheme] = updated;
      return updated;
    });
  }, [colorTheme, colorThemes]);
  
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

  // Handler for exporting node data
  const handleExportNodeData = (format: 'text' | 'json') => {
    if (onExportNodeData) {
      onExportNodeData(format);
    }
  };

  // If sidebar is collapsed, show minimal version
  if (isCollapsed) {
    return (
      <div className="w-12 bg-gray-800 text-white h-full shadow-lg flex flex-col items-center py-4">
        <button
          className="p-2 rounded-md bg-blue-600 hover:bg-blue-700 mb-4"
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
      {/* Sticky header section */}
      <div className="sticky top-0 z-10 bg-gray-800 shadow-md">
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
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto flex-1">
        {/* Visualization Type Section - Updated to include 3D option */}
        <div className="px-5 mb-3">
          <button 
            className="bg-gray-700 w-full p-2.5 rounded-md flex justify-between items-center cursor-pointer mb-1"
            onClick={() => onToggleSection('visualizationType')}
          >
            <h2 className="text-base font-medium text-blue-400 m-0">Visualization Type</h2>
            {expandedSections.visualizationType ? 
              <ChevronDown className="w-4 h-4 text-white" /> : 
              <ChevronRight className="w-4 h-4 text-white" />
            }
          </button>
          
          {expandedSections.visualizationType && (
            <div className="mb-4 bg-gray-700 p-3 rounded-md">
              <div className="grid grid-cols-1 gap-2">
                {/* Network button */}
                <button
                  className={`flex items-center px-3 py-2 rounded-md ${
                    visualizationType === 'network' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                  }`}
                  onClick={() => onVisualizationTypeChange('network')}
                >
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  <span>Network Graph</span>
                </button>
                
                {/* Arc button */}
                <button
                  className={`flex items-center px-3 py-2 rounded-md ${
                    visualizationType === 'arc' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                  }`}
                  onClick={() => onVisualizationTypeChange('arc')}
                >
                  <GitBranch className="w-4 h-4 mr-2" />
                  <span>Arc Graph</span>
                </button>
                
                {/* 3D button */}
                <button
                  className={`flex items-center px-3 py-2 rounded-md ${
                    visualizationType === '3d' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                  }`}
                  onClick={() => onVisualizationTypeChange('3d')}
                >
                  <Box className="w-4 h-4 mr-2" />
                  <span>3D Graph</span>
                </button>
                
                {/* Rad360 button */}
                <button
                  className={`flex items-center px-3 py-2 rounded-md ${
                    visualizationType === 'rad360' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                  }`}
                  onClick={() => onVisualizationTypeChange('rad360')}
                >
                  <Circle className="w-4 h-4 mr-2" />
                  <span>Rad360 Graph</span>
                </button>
                
                {/* ArcLineal button */}
                <button
                  className={`flex items-center px-3 py-2 rounded-md ${
                    visualizationType === 'arcLineal' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                  }`}
                  onClick={() => onVisualizationTypeChange('arcLineal')}
                >
                  <GitBranch className="w-4 h-4 mr-2" />
                  <span>Arc Lineal</span>
                </button>
                
                {/* Node Navigator button */}
                <button
                  className={`flex items-center px-3 py-2 rounded-md ${
                    visualizationType === 'nodeNav' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                  }`}
                  onClick={() => onVisualizationTypeChange('nodeNav' as VisualizationType)}
                >
                  <Target className="w-4 h-4 mr-2" />
                  <span>Node Navigator</span>
                </button>

                {/* Route Finder button */}
                <button
                  className={`flex items-center px-3 py-2 rounded-md ${
                    visualizationType === 'routeFinder' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                  }`}
                  onClick={() => onVisualizationTypeChange('routeFinder')}
                >
                  <Target className="w-4 h-4 mr-2" />
                  <span>Route Finder</span>
                </button>

                {/* Groupable Network button */}
                <button
                  className={`flex items-center px-3 py-2 rounded-md ${
                    visualizationType === 'groupable' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                  }`}
                  onClick={() => onVisualizationTypeChange('groupable')}
                >
                  <Users className="w-4 h-4 mr-2" />
                  <span>Groupable Network</span>
                </button>

                {/* Chord Diagram button */}
                <button
                  className={`flex items-center px-3 py-2 rounded-md ${
                    visualizationType === 'chord' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                  }`}
                  onClick={() => onVisualizationTypeChange('chord')}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                    <path d="M8 16l8-8M12 12l4-4M8 8l4 4"/>
                  </svg>
                  <span>Chord Diagram</span>
                </button>


              </div>
              
              <div className="mt-3 text-xs text-gray-400">
                <p>Select different visualization types to explore your network data from various perspectives.</p>
              </div>
            </div>
          )}
        </div>
      {/* Configuration Presets Section */}
      {typeof expandedSections.configPresets !== 'undefined' && (
        <div className="px-5 mb-3">
          <button 
            className="bg-gray-700 w-full p-2.5 rounded-md flex justify-between items-center cursor-pointer mb-1"
            onClick={() => onToggleSection('configPresets')}
          >
            <h2 className="text-base font-medium text-blue-400 m-0 flex items-center">
              <Settings className="w-4 h-4 mr-1.5" />
              Configuration Presets
            </h2>
            {expandedSections.configPresets ? 
              <ChevronDown className="w-4 h-4 text-white" /> : 
              <ChevronRight className="w-4 h-4 text-white" />
            }
          </button>
          
          {expandedSections.configPresets && (
            <div className="mb-4 bg-gray-700 p-3 rounded-md">
              {onGetCurrentConfig && onApplyConfig ? (
                <ConfigPresets
                  getCurrentConfig={onGetCurrentConfig}
                  applyConfig={onApplyConfig}
                  visualizationType={visualizationType}
                />
              ) : (
                <div className="text-xs text-gray-400 py-2">
                  Configuration presets not available for this visualization type.
                </div>
              )}
            </div>
          )}
        </div>
      )}
        {/* Network Controls Section - Only shown for network visualization type */}
        {visualizationType === 'network' && (
          <div className="px-5 mb-3">
            <button 
              className="bg-gray-700 w-full p-2.5 rounded-md flex justify-between items-center cursor-pointer mb-1"
              onClick={() => onToggleSection('networkControls')}
            >
              <h2 className="text-base font-medium text-blue-400 m-0">Network Physics</h2>
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
                  
                  {/* Toggle button for fix nodes on drag */}
                  <div className="flex items-center justify-between mt-3 mb-2">
                    <label className="text-sm">Fix Nodes on Drag:</label>
                    <button
                      onClick={onToggleFixNodes}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        fixNodesOnDrag ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          fixNodesOnDrag ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    {fixNodesOnDrag 
                      ? "Nodes will stay where you drop them" 
                      : "Nodes will return to simulation flow after dragging"}
                  </p>
                  
                  {/* Control buttons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-xs bg-gray-600 text-white hover:bg-gray-500"
                      onClick={onResetSimulation}
                    >
                      Reset Physics
                    </Button>
                    
                    {/* New zoom to fit button */}
                    {onZoomToFit && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-xs bg-gray-600 text-white hover:bg-gray-500"
                        onClick={onZoomToFit}
                      >
                        <ZoomIn className="w-3 h-3 mr-1" />
                        Fit to View
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Tooltip Settings Section - New section for tooltip configuration */}
        <div className="px-5 mb-3">
          <button 
            className="bg-gray-700 w-full p-2.5 rounded-md flex justify-between items-center cursor-pointer mb-1"
            onClick={() => onToggleSection('tooltipSettings')}
          >
            <h2 className="text-base font-medium text-blue-400 m-0">Tooltip Settings</h2>
            {expandedSections.tooltipSettings ? 
              <ChevronDown className="w-4 h-4 text-white" /> : 
              <ChevronRight className="w-4 h-4 text-white" />
            }
          </button>
          
          {expandedSections.tooltipSettings && (
            <div className="mb-4 bg-gray-700 p-3 rounded-md">
              <TooltipSettings
                tooltipDetail={tooltipDetail}
                tooltipTrigger={tooltipTrigger}
                onTooltipDetailChange={onTooltipDetailChange}
                onTooltipTriggerChange={onTooltipTriggerChange}
                onExportNodeData={selectedNode ? handleExportNodeData : undefined}
              />
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
              {/* Use updated NetworkColorControls component with full dynamicColorThemes */}
              <NetworkColorControls
                uniqueCategories={uniqueCategories}
                nodes={nodes}
                colorTheme={colorTheme}
                nodeSize={nodeSize}
                linkColor={linkColor}
                backgroundColor={backgroundColor}
                textColor={textColor}
                nodeStrokeColor={nodeStrokeColor}
                backgroundOpacity={backgroundOpacity}
                customNodeColors={customNodeColors}
                dynamicColorThemes={dynamicColorThemes}
                onColorThemeChange={onColorThemeChange}
                onNodeSizeChange={(value) => onParameterChange("nodeSize", value)}
                onApplyGroupColors={onApplyGroupColors}
                onApplyIndividualColor={onApplyIndividualColor}
                onResetIndividualColor={onResetIndividualColor}
                onApplyBackgroundColors={onApplyBackgroundColors}
                onResetBackgroundColors={onResetBackgroundColors}
                onColorTabChange={onColorTabChange}
                activeColorTab={activeColorTab}
              />
              
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
                  <h3 className="text-lg font-medium mb-2">Selected Node</h3>
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
      </div>
    </div>
  );
};

export default NetworkSidebar;