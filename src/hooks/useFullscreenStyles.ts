/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useCallback, useState, RefObject } from 'react';
import { fullscreenStyles } from '../utils/FullscreenStyles';

export function useFullscreenStyles() {
  // State to track fullscreen status
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Handle fullscreen change events
  const handleFullscreenChange = useCallback(() => {
    const fullscreenActive = 
      !!document.fullscreenElement || 
      !!(document as any).webkitFullscreenElement || 
      !!(document as any).mozFullScreenElement || 
      !!(document as any).msFullscreenElement;
    
    // Update state
    setIsFullscreen(fullscreenActive);
    
    // Add a class to body when in fullscreen for additional styling if needed
    if (fullscreenActive) {
      document.body.classList.add('is-fullscreen');
      
      // Force resize event to ensure SVG adapts to new dimensions
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 150); // Slight delay to ensure fullscreen transition is complete
    } else {
      document.body.classList.remove('is-fullscreen');
      
      // Delay the resize event slightly to allow for transition
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 150);
    }
  }, []);
  
  // Toggle fullscreen for a specific element
  const toggleFullscreen = useCallback((element: HTMLElement | null) => {
    if (!element) return false;
    
    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen mode
        if (element.requestFullscreen) {
          element.requestFullscreen();
        } else if ((element as any).webkitRequestFullscreen) {
          (element as any).webkitRequestFullscreen();
        } else if ((element as any).mozRequestFullScreen) {
          (element as any).mozRequestFullScreen();
        } else if ((element as any).msRequestFullscreen) {
          (element as any).msRequestFullscreen();
        }
        return true;
      } else {
        // Exit fullscreen mode
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
        return false;
      }
    } catch (err) {
      console.error("Fullscreen API error:", err);
      return false;
    }
  }, []);
  
  // Additional helper to force a redraw of a specific SVG element
  const triggerSvgResize = useCallback((svgRef: RefObject<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    // Access the SVG's g element
    const gElement = svgRef.current.querySelector('g');
    if (!gElement) return;
    
    // Force a redraw by temporarily modifying the transform
    const currentTransform = gElement.getAttribute('transform') || '';
    
    // Save current values
    setTimeout(() => {
      // Force a reflow by accessing the bounding rect
      svgRef.current?.getBoundingClientRect();
      
      // Restore transform
      if (gElement) {
        gElement.setAttribute('transform', currentTransform);
      }
    }, 0);
  }, []);
  
  useEffect(() => {
    // Create a style element
    const styleElement = document.createElement('style');
    styleElement.innerHTML = fullscreenStyles;
    
    // Add it to the document head
    document.head.appendChild(styleElement);
    
    // Set up fullscreen change event listeners for different browsers
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
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
      
      // Ensure we remove the class if component unmounts while in fullscreen
      document.body.classList.remove('is-fullscreen');
    };
  }, [handleFullscreenChange]);

  return { isFullscreen, toggleFullscreen, triggerSvgResize };
}

export default useFullscreenStyles;