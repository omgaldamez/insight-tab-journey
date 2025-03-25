import React, { useEffect } from "react";

// Add this component to your BaseVisualization.tsx file
// This directly renders an SVG reference that will be properly connected to the container

const NetworkSvg = React.forwardRef<SVGSVGElement, {
  backgroundColor: string;
  backgroundOpacity: number;
  rgbBackground: { r: number; g: number; b: number };
}>((props, ref) => {
  const { backgroundColor, backgroundOpacity, rgbBackground } = props;
  
  // Ensure the ref is connected as soon as the component mounts
  useEffect(() => {
    console.log("SVG ref connected:", !!ref);
  }, [ref]);
  
  return (
    <svg 
      ref={ref} 
      className="w-full h-full"
      style={{
        backgroundColor: `rgba(${rgbBackground.r}, ${rgbBackground.g}, ${rgbBackground.b}, ${backgroundOpacity})`
      }}
    />
  );
});

export default NetworkSvg;