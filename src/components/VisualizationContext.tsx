// VisualizationContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { VisualizationType } from './NetworkSidebar';

interface VisualizationContextType {
  visualizationType: VisualizationType;
  setVisualizationType: (type: VisualizationType) => void;
}

const VisualizationContext = createContext<VisualizationContextType | undefined>(undefined);

interface VisualizationProviderProps {
  children: ReactNode;
}

export const VisualizationProvider: React.FC<VisualizationProviderProps> = ({ children }) => {
  const [visualizationType, setVisualizationType] = useState<VisualizationType>('network');

  return (
    <VisualizationContext.Provider value={{ visualizationType, setVisualizationType }}>
      {children}
    </VisualizationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useVisualization = (): VisualizationContextType => {
  const context = useContext(VisualizationContext);
  if (context === undefined) {
    throw new Error('useVisualization must be used within a VisualizationProvider');
  }
  return context;
};