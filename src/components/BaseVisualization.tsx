/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import NetworkSidebar, { VisualizationType } from './NetworkSidebar';
import { LoadingIndicator, NetworkError } from './NetworkComponents';
import { Node, Link, NetworkState } from '@/types/networkTypes';
import { TooltipDetail, TooltipTrigger } from './TooltipSettings';

// Define handlers interface for better type safety
interface NetworkHandlers {
  handleParameterChange: (type: string, value: number) => void;
  handleNodeGroupChange: (group: string) => void;
  handleColorThemeChange: (theme: string) => void;
  handleApplyGroupColors: (categoryColorMap: Record<string, string>) => void;
  handleApplyIndividualColor: (nodeId: string, color: string) => void;
  handleResetIndividualColor: (nodeId: string) => void;
  handleApplyBackgroundColors: (bgColor: string, txtColor: string, lnkColor: string, opacity: number, nodeStrokeColor: string) => void;
  handleResetBackgroundColors: () => void;
  handleResetSimulation: () => void;
  handleResetGraph: () => void;
  toggleSection: (section: string) => void;
  handleColorTabChange: (tab: string) => void;
  handleTitleChange: (title: string) => void;
  toggleSidebar: () => void;
  handleToggleFixNodes: () => void;
  handleVisualizationTypeChange: (type: string) => void;
  reinitializeVisualization?: () => void;
  downloadData?: (format: string) => void;
  downloadGraph?: (format: string) => void;
  handleZoomToFit?: () => void;
  handleZoomIn?: () => void;
  handleZoomOut?: () => void;
  handleResetZoom?: () => void;
  handleTooltipDetailChange?: (detail: TooltipDetail) => void;
  handleTooltipTriggerChange?: (trigger: TooltipTrigger) => void;
  handleExportNodeData?: (format: 'text' | 'json') => void;
  // Configuration preset handlers
  onGetCurrentConfig?: () => any;
  onApplyConfig?: (config: any) => void;
}

interface BaseVisualizationProps {
  children: React.ReactNode;
  nodeData: Node[] | any[];
  linkData: Link[] | any[];
  onCreditsClick: () => void;
  isLoading: boolean;
  visualizationError: string | null;
  selectedNode: Node | null;
  selectedNodeConnections: { to: string[]; from: string[] };
  expandedSections: {
    configPresets: boolean;
    networkControls: boolean;
    nodeControls: boolean;
    colorControls: boolean;
    networkInfo: boolean;
    visualizationType: boolean;
    threeDControls?: boolean;
    tooltipSettings: boolean;
  };
  uniqueCategories: string[];
  nodeCounts: Record<string, number> & { total: number };
  processedData: { nodes: Node[], links: Link[] };
  sidebar: NetworkState & {
    tooltipDetail?: TooltipDetail;
    tooltipTrigger?: TooltipTrigger;
  };
  handlers: NetworkHandlers;
  customNodeColorsState: Record<string, string>;
  dynamicColorThemesState: Record<string, Record<string, string>>;
  onZoomToFit?: () => void;
  renderSidebar?: boolean; // Add option to control sidebar rendering
}

const BaseVisualization: React.FC<BaseVisualizationProps> = ({
  children,
  nodeData,
  linkData,
  onCreditsClick,
  isLoading,
  visualizationError,
  selectedNode,
  selectedNodeConnections,
  expandedSections,
  uniqueCategories,
  nodeCounts,
  processedData,
  sidebar,
  handlers,
  customNodeColorsState,
  dynamicColorThemesState,
  onZoomToFit,
  renderSidebar = true // Changed default to true so sidebar is always shown by default
}) => {
  // If loading, show loading indicator
  if (isLoading) {
    return <LoadingIndicator />;
  }

  // If there's an error, show error message
  if (visualizationError) {
    return (
      <NetworkError 
        error={visualizationError} 
        onReset={handlers.reinitializeVisualization || (() => {})} 
      />
    );
  }

  // Empty handler functions to use as fallbacks
  const emptyTooltipDetailChange = (detail: TooltipDetail) => {
    console.log('Tooltip detail change not implemented', detail);
  };

  const emptyTooltipTriggerChange = (trigger: TooltipTrigger) => {
    console.log('Tooltip trigger change not implemented', trigger);
  };

  // Otherwise, show visualization with sidebar
  return (
    <div className="flex w-full h-full">
      {/* Always render sidebar unless explicitly disabled */}
      {renderSidebar && (
        <NetworkSidebar
          linkDistance={sidebar.linkDistance}
          linkStrength={sidebar.linkStrength}
          nodeCharge={sidebar.nodeCharge}
          nodeSize={sidebar.localNodeSize}
          nodeGroup={sidebar.nodeGroup}
          colorTheme={sidebar.localColorTheme}
          activeColorTab={sidebar.activeColorTab}
          expandedSections={{
            ...expandedSections,
            configPresets: expandedSections.configPresets || false
          }}
          selectedNode={selectedNode}
          selectedNodeConnections={selectedNodeConnections}
          nodeCounts={nodeCounts}
          colorThemes={dynamicColorThemesState[sidebar.localColorTheme] || {}}
          nodes={processedData.nodes}
          customNodeColors={customNodeColorsState}
          backgroundColor={sidebar.localBackgroundColor}
          textColor={sidebar.textColor}
          linkColor={sidebar.localLinkColor}
          nodeStrokeColor={sidebar.nodeStrokeColor}
          backgroundOpacity={sidebar.localBackgroundOpacity}
          title={sidebar.networkTitle}
          isCollapsed={sidebar.isSidebarCollapsed}
          uniqueCategories={uniqueCategories}
          fixNodesOnDrag={sidebar.localFixNodesOnDrag}
          visualizationType={sidebar.localVisualizationType as VisualizationType}
          tooltipDetail={sidebar.tooltipDetail || 'simple'}
          tooltipTrigger={sidebar.tooltipTrigger || 'hover'}
          onParameterChange={handlers.handleParameterChange}
          onNodeGroupChange={handlers.handleNodeGroupChange}
          onColorThemeChange={handlers.handleColorThemeChange}
          onApplyGroupColors={handlers.handleApplyGroupColors}
          onApplyIndividualColor={handlers.handleApplyIndividualColor}
          onResetIndividualColor={handlers.handleResetIndividualColor}
          onApplyBackgroundColors={handlers.handleApplyBackgroundColors}
          onResetBackgroundColors={handlers.handleResetBackgroundColors}
          onResetSimulation={handlers.handleResetSimulation}
          onDownloadData={(format) => handlers.downloadData && handlers.downloadData(format)}
          onDownloadGraph={(format) => handlers.downloadGraph && handlers.downloadGraph(format)}
          onResetGraph={handlers.handleResetGraph}
          onToggleSection={handlers.toggleSection}
          onColorTabChange={handlers.handleColorTabChange}
          onTitleChange={handlers.handleTitleChange}
          onToggleSidebar={handlers.toggleSidebar}
          onToggleFixNodes={handlers.handleToggleFixNodes}
          onVisualizationTypeChange={handlers.handleVisualizationTypeChange}
          onZoomToFit={handlers.handleZoomToFit}
          onZoomIn={handlers.handleZoomIn}
          onZoomOut={handlers.handleZoomOut}
          onResetView={handlers.handleResetZoom}
          onTooltipDetailChange={handlers.handleTooltipDetailChange || emptyTooltipDetailChange}
          onTooltipTriggerChange={handlers.handleTooltipTriggerChange || emptyTooltipTriggerChange}
          onExportNodeData={handlers.handleExportNodeData}
          onGetCurrentConfig={handlers.onGetCurrentConfig}
          onApplyConfig={handlers.onApplyConfig} />
      )}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
};

export default BaseVisualization;