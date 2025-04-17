// hooks/useConfigPresets.ts
import { useCallback } from 'react';

/**
 * Hook to handle configuration presets across different visualization types
 */
export function useConfigPresets({
  colors,
  tooltipDetail,
  setTooltipDetail,
  tooltipTrigger,
  setTooltipTrigger,
  networkTitle,
  setNetworkTitle,
  expandedSections,
  setExpandedSections,
  // Network-specific props (optional)
  linkDistance,
  setLinkDistance,
  linkStrength,
  setLinkStrength,
  nodeCharge,
  setNodeCharge,
  localFixNodesOnDrag,
  setLocalFixNodesOnDrag,
  // Chord-specific props
  chordConfig,
  updateChordConfig,
  // Other visualization specific props
  // ...
  // Common props
  reinitializeVisualization,
  setForceUpdate,
  // Visualization type
  visualizationType
}) {
  // Get current configuration based on visualization type
  const getCurrentConfig = useCallback(() => {
    // Common configuration for all visualization types
    const commonConfig = {
      colorTheme: colors.colorTheme,
      nodeSize: colors.nodeSize,
      linkColor: colors.linkColor,
      backgroundColor: colors.backgroundColor,
      backgroundOpacity: colors.backgroundOpacity,
      textColor: colors.textColor,
      nodeStrokeColor: colors.nodeStrokeColor,
      tooltipDetail,
      tooltipTrigger,
      networkTitle,
      expandedSections
    };

    // Customization config for all visualization types
    const customizationConfig = {
      customNodeColors: colors.customNodeColors,
      dynamicColorThemes: colors.dynamicColorThemes
    };

    // Visualization-specific configuration
    let specificConfig = {};
    
    switch (visualizationType) {
      case 'network':
        specificConfig = {
          linkDistance,
          linkStrength,
          nodeCharge,
          fixNodesOnDrag: localFixNodesOnDrag
        };
        break;
      case 'chord':
        specificConfig = {
          chordConfig
        };
        break;
      case 'groupable':
        specificConfig = {
          linkDistance,
          linkStrength,
          nodeCharge,
          fixNodesOnDrag: localFixNodesOnDrag
          // Add any groupable-specific settings
        };
        break;
      // Add cases for other visualization types as needed
    }

    return {
      common: commonConfig,
      [visualizationType]: specificConfig,
      customization: customizationConfig,
      meta: {
        visualizationType
      }
    };
  }, [
    colors, 
    tooltipDetail, 
    tooltipTrigger, 
    networkTitle, 
    expandedSections,
    linkDistance, 
    linkStrength, 
    nodeCharge, 
    localFixNodesOnDrag,
    chordConfig,
    visualizationType
  ]);

  // Apply a loaded configuration
  const applyConfig = useCallback((config) => {
    // Apply common settings
    if (config.common) {
      if (config.common.colorTheme) colors.setColorTheme(config.common.colorTheme);
      if (config.common.nodeSize) colors.setNodeSize(config.common.nodeSize);
      if (config.common.linkColor) colors.setLinkColor(config.common.linkColor);
      if (config.common.backgroundColor) colors.setBackgroundColor(config.common.backgroundColor);
      if (config.common.backgroundOpacity) colors.setBackgroundOpacity(config.common.backgroundOpacity);
      if (config.common.textColor) colors.setTextColor(config.common.textColor);
      if (config.common.nodeStrokeColor) colors.setNodeStrokeColor(config.common.nodeStrokeColor);
      if (config.common.tooltipDetail) setTooltipDetail(config.common.tooltipDetail);
      if (config.common.tooltipTrigger) setTooltipTrigger(config.common.tooltipTrigger);
      if (config.common.networkTitle) setNetworkTitle(config.common.networkTitle);
      if (config.common.expandedSections) setExpandedSections(config.common.expandedSections);
    }
    
    // Apply visualization-specific settings
    if (config[visualizationType]) {
      switch (visualizationType) {
        case 'network':
          if (config.network) {
            if (config.network.linkDistance) setLinkDistance(config.network.linkDistance);
            if (config.network.linkStrength) setLinkStrength(config.network.linkStrength);
            if (config.network.nodeCharge) setNodeCharge(config.network.nodeCharge);
            if (config.network.fixNodesOnDrag !== undefined) setLocalFixNodesOnDrag(config.network.fixNodesOnDrag);
          }
          break;
        case 'chord':
          if (config.chord && config.chord.chordConfig) {
            updateChordConfig(config.chord.chordConfig);
          }
          break;
        case 'groupable':
          if (config.groupable) {
            if (config.groupable.linkDistance) setLinkDistance(config.groupable.linkDistance);
            if (config.groupable.linkStrength) setLinkStrength(config.groupable.linkStrength);
            if (config.groupable.nodeCharge) setNodeCharge(config.groupable.nodeCharge);
            if (config.groupable.fixNodesOnDrag !== undefined) setLocalFixNodesOnDrag(config.groupable.fixNodesOnDrag);
          }
          break;
        // Add cases for other visualization types as needed
      }
    }
    
    // Apply custom colors and themes
    if (config.customization) {
      // Handle custom node colors
      if (config.customization.customNodeColors) {
        Object.entries(config.customization.customNodeColors).forEach(([nodeId, color]) => {
          colors.applyIndividualColor(nodeId, color);
        });
      }
      
      // Force a redraw
      if (setForceUpdate) {
        setForceUpdate(prev => !prev);
      }
    }
    
    // Reinitialize the visualization to apply all changes
    setTimeout(() => {
      reinitializeVisualization();
    }, 100);
  }, [
    colors, 
    setTooltipDetail, 
    setTooltipTrigger, 
    setNetworkTitle, 
    setExpandedSections,
    setLinkDistance, 
    setLinkStrength, 
    setNodeCharge, 
    setLocalFixNodesOnDrag,
    updateChordConfig,
    reinitializeVisualization,
    setForceUpdate,
    visualizationType
  ]);

  return {
    getCurrentConfig,
    applyConfig
  };
}