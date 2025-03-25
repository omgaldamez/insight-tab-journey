import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Node } from '@/types/networkTypes';
import { cn } from '@/lib/utils';

// Network Legend Component
interface NetworkLegendProps {
  categories: string[];
  colorTheme: string;
  dynamicColorThemes: Record<string, Record<string, string>>;
  colorPalette: string[];
}

export const NetworkLegend: React.FC<NetworkLegendProps> = ({ 
  categories, 
  colorTheme, 
  dynamicColorThemes,
  colorPalette 
}) => {
  return (
    <div className="absolute bottom-5 right-5 bg-white/90 p-2.5 rounded-md shadow-md">
      {categories.map((category, index) => (
        <div className="flex items-center mb-1" key={category}>
          <div 
            className="legend-color w-3.5 h-3.5 rounded-full mr-2" 
            style={{ 
              backgroundColor: (dynamicColorThemes[colorTheme] || {})[category] || colorPalette[index % colorPalette.length]
            }}
          />
          <span className="text-xs">{category}</span>
        </div>
      ))}
    </div>
  );
};

// Network Helper Component
interface NetworkHelperProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

export const NetworkHelper: React.FC<NetworkHelperProps> = ({ 
  position = 'bottom-left',
  className
}) => {
  const positions = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <div className={cn(
      `absolute p-2 rounded-md text-xs backdrop-blur-sm shadow-sm z-10 bg-background/90`,
      positions[position],
      className
    )}>
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-primary" />
        <span>Hover over nodes to see details. Drag to reposition.</span>
      </div>
    </div>
  );
};

// Network Error Component
interface NetworkErrorProps {
  error: string;
  onReset: () => void;
}

export const NetworkError: React.FC<NetworkErrorProps> = ({ error, onReset }) => {
  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded shadow-lg z-50 max-w-md">
      <div className="flex items-center">
        <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
        <div>
          <h3 className="font-medium text-sm">Visualization Error</h3>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          className="px-3 py-1.5 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
          onClick={onReset}
        >
          Reset Visualization
        </button>
      </div>
    </div>
  );
};

// Loading Indicator Component
interface LoadingIndicatorProps {
  message?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message = 'Loading Network Data...' 
}) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-card">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      </div>
    </div>
  );
};

// Empty Data Component
interface EmptyDataProps {
  message?: string;
}

export const EmptyData: React.FC<EmptyDataProps> = ({ 
  message = 'Waiting for node and link data...' 
}) => {
  return (
    <div className="w-full h-full rounded-lg border border-border overflow-hidden bg-card flex items-center justify-center">
      <div className="text-center max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Loading Network Visualization</h2>
        <p className="text-gray-500 mb-6">
          {message}
        </p>
        
        <div className="flex justify-center items-center my-6">
          <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
        </div>
      </div>
    </div>
  );
};