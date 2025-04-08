import React from 'react';
import { Maximize } from 'lucide-react';

interface FullscreenButtonProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

const FullscreenButton: React.FC<FullscreenButtonProps> = ({ containerRef }) => {
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      // Enter fullscreen mode
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      // Exit fullscreen mode
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <button
      onClick={toggleFullscreen}
      className="absolute top-4 left-4 z-50 bg-white/90 text-black px-3 py-2 rounded-md shadow-md flex items-center gap-1.5 text-sm hover:bg-white"
      title="Toggle fullscreen mode"
    >
      <Maximize className="h-4 w-4" />
      <span>Fullscreen</span>
    </button>
  );
};

export default FullscreenButton;