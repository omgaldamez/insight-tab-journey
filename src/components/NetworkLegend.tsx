import React from 'react';
import { getNodeColor } from '../utils/colorThemes';

interface NetworkLegendProps {
  categories: string[];
  colorTheme: string;
  dynamicColorThemes: Record<string, Record<string, string>>;
  colorPalette?: string[];
}

const NetworkLegend: React.FC<NetworkLegendProps> = ({
  categories,
  colorTheme,
  dynamicColorThemes,
  colorPalette = []
}) => {
  if (!categories || categories.length === 0) {
    return null;
  }

  // Use the current theme or fallback to default
  const currentTheme = dynamicColorThemes[colorTheme] || dynamicColorThemes.default || {};
  
  return (
    <div className="absolute top-4 left-4 bg-black/70 text-white p-2 rounded-md text-xs z-40">
      <div className="font-medium mb-1">Legend</div>
      <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
        {categories.map((category) => {
          // Get color from theme or from function
          const color = currentTheme[category] || getNodeColor(
            { id: '', category },
            {},
            colorTheme,
            dynamicColorThemes
          );
          
          return (
            <div key={category} className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-1 flex-shrink-0" 
                style={{ backgroundColor: color }}
              ></div>
              <span className="truncate">{category}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NetworkLegend;