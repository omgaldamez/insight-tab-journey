import React, { RefObject } from 'react';
import FileButtons from './FileButtons';
import ZoomControls from './ZoomControls';
import { NodeData, LinkData } from '@/types/types';

interface VisualizationControlsProps {
  containerRef: RefObject<HTMLDivElement>;
  nodeData: NodeData[];
  linkData: LinkData[];
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onDownloadData?: (format: string) => void;
  onDownloadGraph?: (format: string) => void;
  onResetSelection?: () => void;
  isZoomInitialized?: boolean;
  showFileButtons?: boolean;
  showZoomControls?: boolean;
}

const VisualizationControls: React.FC<VisualizationControlsProps> = ({
  containerRef,
  nodeData, 
  linkData,
  onZoomIn = () => {},
  onZoomOut = () => {},
  onResetZoom = () => {},
  onDownloadData = () => {},
  onDownloadGraph = () => {},
  onResetSelection = () => {},
  isZoomInitialized = true,
  showFileButtons = true,
  showZoomControls = true
}) => {
  return (
    <>
      {/* File Buttons */}
      {showFileButtons && (
        <div className="absolute top-4 right-4 z-50">
          <FileButtons 
            onDownloadData={onDownloadData}
            onDownloadGraph={onDownloadGraph}
            onResetSelection={onResetSelection}
            nodeData={nodeData}
            linkData={linkData}
          />
        </div>
      )}
      
      {/* Zoom Controls */}
      {showZoomControls && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <ZoomControls
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onReset={onResetZoom}
            isZoomInitialized={isZoomInitialized}
          />
        </div>
      )}
    </>
  );
};

export default VisualizationControls;