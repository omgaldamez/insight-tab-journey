import { useEffect } from 'react';
import { fullscreenStyles } from '../utils/FullscreenStyles';

export function useFullscreenStyles() {
  useEffect(() => {
    // Create a style element
    const styleElement = document.createElement('style');
    styleElement.innerHTML = fullscreenStyles;
    
    // Add it to the document head
    document.head.appendChild(styleElement);
    
    // Set up fullscreen change event listeners for different browsers
    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;
      
      // Add a class to body when in fullscreen for additional styling if needed
      if (isFullscreen) {
        document.body.classList.add('is-fullscreen');
      } else {
        document.body.classList.remove('is-fullscreen');
      }
    };
    
    // Add listeners for various browsers
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // Clean up
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      
      // Remove the style element
      document.head.removeChild(styleElement);
    };
  }, []);
}

export default useFullscreenStyles;