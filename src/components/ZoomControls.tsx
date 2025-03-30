import React from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  isZoomInitialized?: boolean;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({ 
  onZoomIn, 
  onZoomOut, 
  onReset,
  isZoomInitialized = true
}) => {
  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800/80 backdrop-blur-sm rounded-lg flex items-center p-1 z-50">
      <button
        className="p-1.5 rounded hover:bg-gray-700 text-white"
        onClick={(e) => {
          e.stopPropagation(); // Prevent event bubbling
          onZoomIn();
        }}
        title="Zoom In"
        type="button"
        disabled={!isZoomInitialized}
      >
        <ZoomIn className="w-5 h-5" />
      </button>
      <button
        className="p-1.5 rounded hover:bg-gray-700 text-white"
        onClick={(e) => {
          e.stopPropagation(); // Prevent event bubbling
          onZoomOut();
        }}
        title="Zoom Out"
        type="button"
        disabled={!isZoomInitialized}
      >
        <ZoomOut className="w-5 h-5" />
      </button>
      <button
        className="p-1.5 rounded hover:bg-gray-700 text-white"
        onClick={(e) => {
          e.stopPropagation(); // Prevent event bubbling
          onReset();
        }}
        title="Reset View"
        type="button"
        disabled={!isZoomInitialized}
      >
        <Maximize className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ZoomControls;