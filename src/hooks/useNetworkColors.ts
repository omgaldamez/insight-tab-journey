/* eslint-disable prefer-const */
import { useState, useCallback, useEffect } from 'react';
import { Node } from '@/types/networkTypes';
import { 
  DEFAULT_COLOR_PALETTE, 
  CATEGORICAL_PALETTES,
  MONOCHROMATIC_PALETTES,
  DIVERGENT_PALETTES,
  generateExtendedColorThemes,
  ColorThemes,
  getNodeColor as getThemeNodeColor
} from '@/utils/colorThemes';

// Extended base themes structure with all available themes
const EXTENDED_BASE_THEMES = {
  // Basic themes
  default: {},
  bright: {},
  pastel: {},
  ocean: {},
  autumn: {},
  monochrome: {},
  custom: {},

  // Monochromatic themes
  azureCascade: {},
  emeraldDepths: {},
  violetTwilight: {},
  roseReverie: {},
  amberGlow: {},

  // Categorical themes
  exoticPlumage: {},
  pixelNostalgia: {},
  culinaryPalette: {},
  urbanCanvas: {},

  // Divergent themes
  elementalContrast: {},
  forestToDesert: {},
  mysticMeadow: {},
  cosmicDrift: {}
};

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
  onChange?: (state: { 
    colorTheme: string; 
    nodeSize?: number; 
    linkColor?: string; 
    backgroundColor?: string; 
    textColor?: string; 
    nodeStrokeColor?: string; 
    backgroundOpacity?: number; 
    customNodeColors?: Record<string, string>; 
    dynamicColorThemes?: Record<string, Record<string, string>>; 
    activeColorTab?: string 
  }) => void;
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
  const [activeColorTab, setActiveColorTab] = useState<string>('presets');
  
  // Initialize dynamicColorThemes with proper structure
  const [dynamicColorThemes, setDynamicColorThemes] = useState<Record<string, Record<string, string>>>(() => {
    // Check if initialDynamicColorThemes has the expected structure
    const hasProperStructure = 
      typeof initialDynamicColorThemes === 'object' &&
      initialDynamicColorThemes !== null &&
      Object.keys(initialDynamicColorThemes).length > 0 &&
      Object.keys(initialDynamicColorThemes).includes('default');
    
    if (hasProperStructure) {
      return initialDynamicColorThemes;
    } else {
      return { ...EXTENDED_BASE_THEMES };
    }
  });

  /**
   * Convert hex color to RGB object
   */
  const hexToRgb = useCallback((hex: string): {r: number, g: number, b: number} => {
    // Default fallback color
    const fallback = {r: 245, g: 245, b: 245};
    
    // Regular expression to extract RGB components
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return fallback;
    
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
  }, []);

  // Derived RGB background color for use with opacity
  const rgbBackgroundColor = hexToRgb(backgroundColor);

  /**
   * Generate dynamic color themes based on unique categories
   */
  const generateDynamicColorThemes = useCallback((categories: string[]) => {
    console.log("Generating dynamic color themes for categories:", categories);
    
    // Use our advanced theme generator from colorThemes.ts
    const extendedThemes = generateExtendedColorThemes(categories, DEFAULT_COLOR_PALETTE);
    
    // Update state with all available themes
    setDynamicColorThemes(extendedThemes);
    
    return extendedThemes;
  }, []);

  /**
   * Get node color based on customization settings
   */
  const getNodeColor = useCallback((node: Node): string => {
    // Priority 1: Node has a custom color
    if (customNodeColors[node.id]) {
      return customNodeColors[node.id];
    }
    
    // Priority 2: Use the getNodeColor function from colorThemes.ts
    return getThemeNodeColor(
      node, 
      customNodeColors, 
      colorTheme, 
      dynamicColorThemes
    );
  }, [customNodeColors, colorTheme, dynamicColorThemes]);

  /**
   * Update a category color in the custom theme
   */
  const updateCategoryColor = useCallback((category: string, color: string) => {
    setDynamicColorThemes(prev => {
      const newThemes = { ...prev };
      
      // Make sure we have a custom theme
      if (!newThemes.custom) {
        newThemes.custom = { ...(newThemes.default || {}) };
      } else {
        // Make a copy to avoid accidental reference mutation
        newThemes.custom = { ...newThemes.custom };
      }
      
      // Update the specific category color
      newThemes.custom[category] = color;
      
      return newThemes;
    });
    
    // Switch to custom theme if not already
    if (colorTheme !== 'custom') {
      setColorTheme('custom');
      if (onChange) {
        onChange({ colorTheme: 'custom' });
      }
    }
  }, [colorTheme, onChange]);

  /**
   * Apply a custom color to an individual node
   */
  const applyIndividualColor = useCallback((nodeId: string, color: string) => {
    setCustomNodeColors(prev => ({
      ...prev,
      [nodeId]: color
    }));
  }, []);

  /**
   * Reset an individual node's custom color
   */
  const resetIndividualColor = useCallback((nodeId: string) => {
    setCustomNodeColors(prev => {
      const newColors = { ...prev };
      delete newColors[nodeId];
      return newColors;
    });
  }, []);

  /**
   * Reset background colors to defaults
   */
  const resetBackgroundColors = useCallback(() => {
    setBackgroundColor('#f5f5f5');
    setTextColor('#ffffff');
    setLinkColor('#999999');
    setBackgroundOpacity(1.0);
    setNodeStrokeColor('#000000');
  }, []);

  /**
   * Reset all colors to defaults
   */
  const resetAllColors = useCallback(() => {
    setColorTheme('default');
    setNodeSize(1.0);
    setCustomNodeColors({});
    resetBackgroundColors();
  }, [resetBackgroundColors]);

  // Utility function to convert hex to HSL
  const hexToHSL = (hex: string) => {
    let r = 0, g = 0, b = 0;
    
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => {
      return r + r + g + g + b + b;
    });
  
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      return { h: 0, s: 0, l: 0 };
    }
    
    r = parseInt(result[1], 16) / 255;
    g = parseInt(result[2], 16) / 255;
    b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
  
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      
      h /= 6;
    }
  
    return { h: h * 360, s: s * 100, l: l * 100 };
  };
  
  // Utility function to convert HSL to hex
  const hslToHex = (h: number, s: number, l: number) => {
    h /= 360;
    s /= 100;
    l /= 100;
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    // Convert to hex
    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

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
    rgbBackgroundColor,
    
    // Methods
    hexToRgb,
    getNodeColor,
    generateDynamicColorThemes,
    
    // State setters
    setColorTheme,
    setNodeSize,
    setLinkColor,
    setBackgroundColor,
    setTextColor,
    setNodeStrokeColor,
    setBackgroundOpacity,
    setActiveColorTab,
    
    // Action functions
    updateCategoryColor,
    applyIndividualColor,
    resetIndividualColor,
    resetBackgroundColors,
    resetAllColors
  };
};

export default useNetworkColors;