// colorThemes.ts - Store all color theme configurations in one place
import * as d3 from 'd3';

export interface ColorTheme {
  [key: string]: string;
}

export interface ColorThemes {
  [key: string]: ColorTheme;
}

// Default color palette for consistency across the application
export const DEFAULT_COLOR_PALETTE = [
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

// Base structure for all themes
export const BASE_THEMES: ColorThemes = {
  default: {},
  bright: {},
  pastel: {},
  ocean: {},
  autumn: {},
  monochrome: {},
  custom: {}
};

/**
 * Generate color themes based on categories
 */
export function generateColorThemes(categories: string[], colorPalette = DEFAULT_COLOR_PALETTE): ColorThemes {
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
    const colorIndex = index % colorPalette.length;
    baseThemes.default[category] = colorPalette[colorIndex];
  });

  // Bright theme with vibrant colors
  categories.forEach((category, index) => {
    const colorIndex = index % colorPalette.length;
    const baseColor = d3.rgb(colorPalette[colorIndex]);
    baseThemes.bright[category] = d3.rgb(
      Math.min(255, baseColor.r + 40),
      Math.min(255, baseColor.g + 40),
      Math.min(255, baseColor.b + 40)
    ).toString();
  });

  // Pastel theme with lighter colors
  categories.forEach((category, index) => {
    const colorIndex = index % colorPalette.length;
    const baseColor = d3.rgb(colorPalette[colorIndex]);
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

  return baseThemes;
}

/**
 * Get node color based on customization settings
 */
export function getNodeColor(
  node: { id: string; category: string }, 
  customNodeColors: Record<string, string>,
  colorTheme: string,
  dynamicColorThemes: Record<string, ColorTheme>
): string {
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
    const categoryIndex = Math.abs(
      node.category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    ) % DEFAULT_COLOR_PALETTE.length;
    
    return DEFAULT_COLOR_PALETTE[categoryIndex];
  } catch (err) {
    console.error("Error in getNodeColor:", err);
    return "#95a5a6"; // Return fallback gray color on error
  }
}

/**
 * Convert hex color to RGB object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 245, g: 245, b: 245 }; // Default to #f5f5f5
}