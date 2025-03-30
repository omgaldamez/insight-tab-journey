import { useState, useCallback, useEffect } from 'react';
import * as d3 from 'd3';
import { Node, ColorTheme } from '@/types/networkTypes';

// Default color palette for consistency across the application
const DEFAULT_COLOR_PALETTE = [
  "#e74c3c", // Red
  "#3498db", // Blue
  "#2ecc71", // Green
  "#f39c12", // Orange
  "#9b59b6", // Purple
  "#1abc9c", // Teal
  "#34495e", // Dark Blue
  "#e67e22", // Dark Orange
  "#27ae60", // Dark Green
  "#8e44ad", // Dark Purple
  "#16a085", // Dark Teal
  "#d35400", // Rust
  "#2980b9", // Royal Blue
  "#c0392b", // Dark Red
  "#f1c40f"  // Yellow
];

// Interface for color state
interface ColorState {
  colorTheme: string;
  nodeSize: number;
  linkColor: string;
  backgroundColor: string;
  textColor: string;
  nodeStrokeColor: string;
  backgroundOpacity: number;
  customNodeColors: Record<string, string>;
  dynamicColorThemes: Record<string, Record<string, string>>;
  categoryColors: Record<string, string>;
}

// Interface for the hook parameters
interface UseNetworkColorsProps {
  initialColorTheme?: string;
  initialNodeSize?: number;
  initialLinkColor?: string;
  initialBackgroundColor?: string;
  initialTextColor?: string;
  initialNodeStrokeColor?: string;
  initialBackgroundOpacity?: number;
  initialCustomNodeColors?: Record<string, string>;
  initialDynamicColorThemes?: Record<string, Record<string, string>>;
  onChange?: (state: ColorState) => void;
}

/**
 * Custom hook for managing all network visualization color-related state and operations
 */
const useNetworkColors = ({
  initialColorTheme = 'default',
  initialNodeSize = 1.0,
  initialLinkColor = '#999999',
  initialBackgroundColor = '#f5f5f5',
  initialTextColor = '#ffffff',
  initialNodeStrokeColor = '#000000',
  initialBackgroundOpacity = 1.0,
  initialCustomNodeColors = {},
  initialDynamicColorThemes = {},
  onChange
}: UseNetworkColorsProps = {}) => {
  // Core color state
  const [colorTheme, setColorTheme] = useState<string>(initialColorTheme);
  const [nodeSize, setNodeSize] = useState<number>(initialNodeSize);
  const [linkColor, setLinkColor] = useState<string>(initialLinkColor);
  const [backgroundColor, setBackgroundColor] = useState<string>(initialBackgroundColor);
  const [textColor, setTextColor] = useState<string>(initialTextColor);
  const [nodeStrokeColor, setNodeStrokeColor] = useState<string>(initialNodeStrokeColor);
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(initialBackgroundOpacity);
  const [customNodeColors, setCustomNodeColors] = useState<Record<string, string>>(initialCustomNodeColors);
  
  // Initialize dynamicColorThemes with proper structure
  const [dynamicColorThemes, setDynamicColorThemes] = useState<Record<string, Record<string, string>>>(() => {
    // Check if initialDynamicColorThemes has the expected structure
    const hasProperStructure = 
      typeof initialDynamicColorThemes === 'object' &&
      initialDynamicColorThemes !== null &&
      Object.keys(initialDynamicColorThemes).length > 0;
    
    if (hasProperStructure) {
      return initialDynamicColorThemes;
    } else {
      // Create empty theme structure as fallback
      return { 
        default: {}, 
        bright: {}, 
        pastel: {}, 
        ocean: {}, 
        autumn: {}, 
        monochrome: {}, 
        custom: {} 
      };
    }
  });
  
  const [activeColorTab, setActiveColorTab] = useState<string>('presets');
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  
  // History for undo functionality
  const [previousStates, setPreviousStates] = useState<ColorState[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  /**
   * Save current state to history
   */
  const saveCurrentState = useCallback(() => {
    const currentState: ColorState = {
      colorTheme,
      nodeSize,
      linkColor,
      backgroundColor,
      textColor,
      nodeStrokeColor,
      backgroundOpacity,
      customNodeColors,
      dynamicColorThemes,
      categoryColors
    };
    setPreviousStates(prev => [...prev.slice(-9), currentState]); // Keep last 10 states
    setHasUnsavedChanges(false);
  }, [
    colorTheme, nodeSize, linkColor, backgroundColor, textColor,
    nodeStrokeColor, backgroundOpacity, customNodeColors, dynamicColorThemes, categoryColors
  ]);

  /**
   * Undo to previous state
   */
  const undoColorChange = useCallback(() => {
    if (previousStates.length > 0) {
      const prevState = previousStates[previousStates.length - 1];
      setColorTheme(prevState.colorTheme);
      setNodeSize(prevState.nodeSize);
      setLinkColor(prevState.linkColor);
      setBackgroundColor(prevState.backgroundColor);
      setTextColor(prevState.textColor);
      setNodeStrokeColor(prevState.nodeStrokeColor);
      setBackgroundOpacity(prevState.backgroundOpacity);
      setCustomNodeColors(prevState.customNodeColors);
      setDynamicColorThemes(prevState.dynamicColorThemes);
      setCategoryColors(prevState.categoryColors);
      
      // Remove the state we just restored
      setPreviousStates(prev => prev.slice(0, -1));
    }
  }, [previousStates]);

  /**
   * Convert hex color to RGB object
   */
  const hexToRgb = useCallback((hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 245, g: 245, b: 245 }; // Default to #f5f5f5
  }, []);

  // Derived RGB background color for use with opacity
  const rgbBackgroundColor = hexToRgb(backgroundColor);

  /**
   * Generate dynamic color themes based on unique categories
   */
  const generateDynamicColorThemes = useCallback((categories: string[]) => {
    console.log("Generating dynamic color themes for categories:", categories);
    
    // Always regenerate themes to ensure categories have colors
    console.log("Creating new color themes");
    
    // Save current state before making changes
    saveCurrentState();
    
    const baseThemes = {
      default: {} as Record<string, string>,
      bright: {} as Record<string, string>,
      pastel: {} as Record<string, string>,
      ocean: {} as Record<string, string>,
      autumn: {} as Record<string, string>,
      monochrome: {} as Record<string, string>,
      custom: {} as Record<string, string>
    };

    // Default theme with standard colors
    categories.forEach((category, index) => {
      const colorIndex = index % DEFAULT_COLOR_PALETTE.length;
      baseThemes.default[category] = DEFAULT_COLOR_PALETTE[colorIndex];
      console.log(`Assigned ${category} to color ${DEFAULT_COLOR_PALETTE[colorIndex]}`);
    });

    // Bright theme with vibrant colors
    categories.forEach((category, index) => {
      const colorIndex = index % DEFAULT_COLOR_PALETTE.length;
      const baseColor = d3.rgb(DEFAULT_COLOR_PALETTE[colorIndex]);
      baseThemes.bright[category] = d3.rgb(
        Math.min(255, baseColor.r + 40),
        Math.min(255, baseColor.g + 40),
        Math.min(255, baseColor.b + 40)
      ).toString();
    });

    // Pastel theme with lighter colors
    categories.forEach((category, index) => {
      const colorIndex = index % DEFAULT_COLOR_PALETTE.length;
      const baseColor = d3.rgb(DEFAULT_COLOR_PALETTE[colorIndex]);
      const h = d3.hsl(baseColor).h;
      baseThemes.pastel[category] = d3.hsl(h, 0.6, 0.8).toString();
    });

    // Ocean theme with blue variants
    categories.forEach((category, index) => {
      baseThemes.ocean[category] = d3.rgb(
        40 + (index * 15) % 100,
        100 + (index * 20) % 155,
        150 + (index * 15) % 105
      ).toString();
    });

    // Autumn theme with warm colors
    categories.forEach((category, index) => {
      baseThemes.autumn[category] = d3.rgb(
        180 + (index * 15) % 75,
        70 + (index * 25) % 120,
        40 + (index * 10) % 50
      ).toString();
    });

    // Monochrome theme with grayscale
    categories.forEach((category, index) => {
      const value = 60 + (index * 25) % 180;
      baseThemes.monochrome[category] = d3.rgb(value, value, value).toString();
    });

    // Custom theme (starts as copy of default)
    baseThemes.custom = {...baseThemes.default};

    // Add "Otro" (Other) category for all themes
    Object.keys(baseThemes).forEach(theme => {
      baseThemes[theme as keyof typeof baseThemes]["Otro"] = "#95a5a6";
    });

    // Log themes to verify they were created properly
    console.log("Themes generated:", {
      themesAvailable: Object.keys(baseThemes),
      categoriesInDefaultTheme: Object.keys(baseThemes.default),
      defaultTheme: baseThemes.default
    });

    // Update state
    setDynamicColorThemes(baseThemes);
    
    // Initialize category colors for UI
    const newCategoryColors: Record<string, string> = {};
    categories.forEach(category => {
      newCategoryColors[category] = baseThemes.default[category] || "#3498db";
    });
    setCategoryColors(newCategoryColors);
    
    return baseThemes;
  }, [saveCurrentState]);

  /**
   * Get node color based on customization settings
   */
  const getNodeColor = useCallback((node: Node): string => {
    try {
      // First check for custom node color
      if (customNodeColors && customNodeColors[node.id]) {
        return customNodeColors[node.id];
      }
      
      // Use the category color from current theme
      const currentTheme = dynamicColorThemes[colorTheme] || dynamicColorThemes.default || {};
      
      // Direct category lookup
      if (currentTheme[node.category]) {
        return currentTheme[node.category];
      }
      
      // Use DEFAULT_COLOR_PALETTE as a direct fallback if themes are empty
      // This ensures categories always get colors even if theme generation failed
      const categoryIndex = Math.abs(
        node.category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      ) % DEFAULT_COLOR_PALETTE.length;
      
      return DEFAULT_COLOR_PALETTE[categoryIndex];
    } catch (err) {
      console.error("Error in getNodeColor:", err, {
        nodeId: node.id,
        category: node.category,
        colorTheme,
        dynamicColorThemesKeys: Object.keys(dynamicColorThemes)
      });
      return "#95a5a6"; // Return fallback gray color on error
    }
  }, [customNodeColors, colorTheme, dynamicColorThemes]);

  /**
   * Update a category color in the UI state and apply it immediately
   */
  const updateCategoryColor = useCallback((category: string, color: string) => {
    // Save current state if we haven't yet
    if (!hasUnsavedChanges) {
      saveCurrentState();
      setHasUnsavedChanges(true);
    }
    
    setCategoryColors(prev => {
      const newColors = {
        ...prev,
        [category]: color
      };
      
      // Only update the custom theme for this specific category
      const updatedThemes = {...dynamicColorThemes};
      if (!updatedThemes.custom) {
        // Initialize custom theme if it doesn't exist
        updatedThemes.custom = {...(updatedThemes.default || {})};
      } else {
        // Keep existing custom theme
        updatedThemes.custom = {...updatedThemes.custom};
      }
      
      // Only update this specific category's color
      updatedThemes.custom[category] = color;
      setDynamicColorThemes(updatedThemes);
      
      // Switch to custom theme if not already using it
      if (colorTheme !== 'custom') {
        setColorTheme('custom');
      }
      
      return newColors;
    });
  }, [hasUnsavedChanges, saveCurrentState, dynamicColorThemes, colorTheme]);

  /**
   * Apply a custom color to an individual node immediately
   */
  const applyIndividualColor = useCallback((nodeId: string, color: string) => {
    // Save current state if we haven't yet
    if (!hasUnsavedChanges) {
      saveCurrentState();
      setHasUnsavedChanges(true);
    }
    
    setCustomNodeColors(prev => ({
      ...prev,
      [nodeId]: color
    }));
  }, [hasUnsavedChanges, saveCurrentState]);

  /**
   * Reset an individual node's custom color
   */
  const resetIndividualColor = useCallback((nodeId: string) => {
    // Save current state if we haven't yet
    if (!hasUnsavedChanges) {
      saveCurrentState();
      setHasUnsavedChanges(true);
    }
    
    setCustomNodeColors(prev => {
      const newColors = { ...prev };
      delete newColors[nodeId];
      return newColors;
    });
  }, [hasUnsavedChanges, saveCurrentState]);

  /**
   * Set color theme with history tracking
   */
  const setColorThemeWithHistory = useCallback((theme: string) => {
    if (theme !== colorTheme) {
      // Save current state if we haven't yet
      if (!hasUnsavedChanges) {
        saveCurrentState();
        setHasUnsavedChanges(true);
      }
      setColorTheme(theme);
    }
  }, [colorTheme, hasUnsavedChanges, saveCurrentState]);

  /**
   * Set node size with history tracking
   */
  const setNodeSizeWithHistory = useCallback((size: number) => {
    if (size !== nodeSize) {
      // Save current state if we haven't yet
      if (!hasUnsavedChanges) {
        saveCurrentState();
        setHasUnsavedChanges(true);
      }
      setNodeSize(size);
    }
  }, [nodeSize, hasUnsavedChanges, saveCurrentState]);

  /**
   * Update background color with history tracking
   */
  const updateBackgroundColor = useCallback((color: string) => {
    if (color !== backgroundColor) {
      // Save current state if we haven't yet
      if (!hasUnsavedChanges) {
        saveCurrentState();
        setHasUnsavedChanges(true);
      }
      setBackgroundColor(color);
    }
  }, [backgroundColor, hasUnsavedChanges, saveCurrentState]);

  /**
   * Update text color with history tracking
   */
  const updateTextColor = useCallback((color: string) => {
    if (color !== textColor) {
      // Save current state if we haven't yet
      if (!hasUnsavedChanges) {
        saveCurrentState();
        setHasUnsavedChanges(true);
      }
      setTextColor(color);
    }
  }, [textColor, hasUnsavedChanges, saveCurrentState]);

  /**
   * Update link color with history tracking
   */
  const updateLinkColor = useCallback((color: string) => {
    if (color !== linkColor) {
      // Save current state if we haven't yet
      if (!hasUnsavedChanges) {
        saveCurrentState();
        setHasUnsavedChanges(true);
      }
      setLinkColor(color);
    }
  }, [linkColor, hasUnsavedChanges, saveCurrentState]);

  /**
   * Update node stroke color with history tracking
   */
  const updateNodeStrokeColor = useCallback((color: string) => {
    if (color !== nodeStrokeColor) {
      // Save current state if we haven't yet
      if (!hasUnsavedChanges) {
        saveCurrentState();
        setHasUnsavedChanges(true);
      }
      setNodeStrokeColor(color);
    }
  }, [nodeStrokeColor, hasUnsavedChanges, saveCurrentState]);

  /**
   * Update background opacity with history tracking
   */
  const updateBackgroundOpacity = useCallback((opacity: number) => {
    if (opacity !== backgroundOpacity) {
      // Save current state if we haven't yet
      if (!hasUnsavedChanges) {
        saveCurrentState();
        setHasUnsavedChanges(true);
      }
      setBackgroundOpacity(opacity);
    }
  }, [backgroundOpacity, hasUnsavedChanges, saveCurrentState]);

  /**
   * Reset background colors to defaults with history tracking
   */
  const resetBackgroundColors = useCallback(() => {
    // Save current state
    saveCurrentState();
    setHasUnsavedChanges(false);
    
    setBackgroundColor('#f5f5f5');
    setTextColor('#ffffff');
    setLinkColor('#999999');
    setBackgroundOpacity(1.0);
    setNodeStrokeColor('#000000');
  }, [saveCurrentState]);

  /**
   * Reset all color settings to defaults with history tracking
   */
  const resetAllColors = useCallback(() => {
    // Save current state
    saveCurrentState();
    setHasUnsavedChanges(false);
    
    setColorTheme('default');
    setNodeSize(1.0);
    setCustomNodeColors({});
    resetBackgroundColors();
  }, [saveCurrentState, resetBackgroundColors]);

  // Update category colors when the color theme changes
  useEffect(() => {
    if (Object.keys(dynamicColorThemes).length === 0) return;
    
    // Skip updating when switching to custom theme to prevent overriding custom colors
    if (colorTheme === 'custom') return;
    
    const newCategoryColors: Record<string, string> = {};
    const currentTheme = dynamicColorThemes[colorTheme] || dynamicColorThemes.default || {};
    
    // Update category colors based on the selected theme
    Object.keys(currentTheme).forEach(category => {
      if (category !== 'Otro') {
        newCategoryColors[category] = currentTheme[category];
      }
    });
    
    setCategoryColors(newCategoryColors);
  }, [colorTheme, dynamicColorThemes]);

  // Notify parent component of changes
  useEffect(() => {
    if (onChange) {
      const currentState: ColorState = {
        colorTheme,
        nodeSize,
        linkColor,
        backgroundColor,
        textColor,
        nodeStrokeColor,
        backgroundOpacity,
        customNodeColors,
        dynamicColorThemes,
        categoryColors
      };
      onChange(currentState);
    }
  }, [
    onChange, colorTheme, nodeSize, linkColor, backgroundColor, textColor,
    nodeStrokeColor, backgroundOpacity, customNodeColors, dynamicColorThemes, categoryColors
  ]);

  return {
    // Current state values
    colorTheme,
    nodeSize,
    linkColor,
    backgroundColor,
    textColor,
    nodeStrokeColor,
    backgroundOpacity,
    customNodeColors,
    dynamicColorThemes,
    activeColorTab,
    categoryColors,
    hasUndoHistory: previousStates.length > 0,
    
    // Utility functions
    hexToRgb,
    rgbBackgroundColor,
    getNodeColor,
    generateDynamicColorThemes,
    undoColorChange,
    
    // State updater functions with history tracking
    setColorTheme: setColorThemeWithHistory,
    setNodeSize: setNodeSizeWithHistory,
    setLinkColor: updateLinkColor, 
    setBackgroundColor: updateBackgroundColor,
    setTextColor: updateTextColor,
    setNodeStrokeColor: updateNodeStrokeColor,
    setBackgroundOpacity: updateBackgroundOpacity,
    setActiveColorTab,
    updateCategoryColor,
    
    // Action functions
    applyGroupColors: updateCategoryColor, // Renamed for consistency
    applyIndividualColor,
    resetIndividualColor,
    resetBackgroundColors,
    resetAllColors
  };
};

export default useNetworkColors;