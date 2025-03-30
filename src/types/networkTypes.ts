// Updated networkTypes.ts to fix incompatibilities

import { NodeData, LinkData } from '@/types/types';
import * as d3 from 'd3';

// Define VisualizationType to include '3d'
export type VisualizationType = 'network' | 'radial' | 'arc' | '3d' | 'rad360' | 'arcLineal';

// Define node data structure for D3
export interface Node extends d3.SimulationNodeDatum {
  id: string;
  category: string;
  customColor?: string | null;
}

// Define link data structure for D3
export interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  value?: number;
}

// D3 modified types during simulation
export interface SimulatedNode extends Node {
  x: number;
  y: number;
  fx: number | null;
  fy: number | null;
}

export interface SimulatedLink extends Omit<Link, 'source' | 'target'> {
  source: SimulatedNode;
  target: SimulatedNode;
}

// Category counter interface
export interface CategoryCounts {
  [key: string]: number;
  total: number;
}

// Color theme interface
export interface ColorTheme {
  [key: string]: string;
}

// Network visualization props
export interface NetworkVisualizationProps {
  onCreditsClick: () => void;
  nodeData: NodeData[] | Node[]; 
  linkData: LinkData[] | Link[];
  visualizationType?: VisualizationType;
  onVisualizationTypeChange?: (type: VisualizationType) => void;
  fixNodesOnDrag?: boolean;
  colorTheme?: string;
  nodeSize?: number;
  linkColor?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  customNodeColors?: Record<string, string>;
  dynamicColorThemes?: Record<string, ColorTheme>;
  onSvgRef?: (svg: SVGSVGElement) => void;
}

// Network state interface
export interface NetworkState {
  linkDistance: number;
  linkStrength: number;
  nodeCharge: number;
  localNodeSize: number;
  nodeGroup: string;
  localColorTheme: string;
  activeColorTab: string;
  localBackgroundColor: string;
  textColor: string;
  localLinkColor: string;
  nodeStrokeColor: string;
  localBackgroundOpacity: number;
  isSidebarCollapsed: boolean;
  networkTitle: string;
  localFixNodesOnDrag: boolean;
  localVisualizationType: VisualizationType;
}

// Network selection state
export interface SelectionState {
  selectedNode: Node | null;
  selectedNodeConnections: {
    to: string[];
    from: string[];
  };
}

// UI sections state
export interface SectionsState {
  networkControls: boolean;
  nodeControls: boolean;
  colorControls: boolean;
  networkInfo: boolean;
  visualizationType: boolean;
  threeDControls?: boolean;
}