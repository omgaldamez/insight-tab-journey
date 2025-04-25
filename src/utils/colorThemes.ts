// colorThemes.ts - Comprehensive color theme and palette management
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

// Additional categorical color palettes with creative names
export const CATEGORICAL_PALETTES = {
  // Vibrant, fun colors inspired by tropical birds
  EXOTIC_PLUMAGE: [
    "#FF6B6B", // Flamingo Pink
    "#4ECDC4", // Turquoise
    "#FFD166", // Saffron
    "#6A0572", // Deep Purple
    "#1A535C", // Deep Teal
    "#FF9F1C", // Amber
    "#7B287D", // Violet
    "#3BCEAC", // Mint
    "#EE4266", // Raspberry
    "#540D6E", // Plum
    "#0EAD69", // Emerald
    "#F77F00", // Tangerine
    "#2EC4B6", // Seafoam
    "#E71D36", // Poppy
    "#3D348B"  // Royal Purple
  ],
  
  // Retro colors inspired by vintage video games
  PIXEL_NOSTALGIA: [
    "#3A86FF", // Retro Blue
    "#FF006E", // Neon Pink
    "#8338EC", // Electric Purple
    "#FB5607", // Arcade Orange
    "#FFBE0B", // Pac-Man Yellow
    "#06D6A0", // Game Boy Green
    "#EF476F", // Atari Red
    "#118AB2", // Sega Blue
    "#73D2DE", // Sky Blue
    "#FFD166", // Golden Coin
    "#06AED5", // Cyan
    "#F15BB5", // Magenta
    "#9B5DE5", // Lavender
    "#00BBF9", // Light Blue
    "#00F5D4"  // Mint Green
  ],
  
  // Gourmet food-inspired colors
  CULINARY_PALETTE: [
    "#D62828", // Paprika
    "#577590", // Blueberry
    "#F77F00", // Turmeric
    "#2B9348", // Avocado
    "#8338EC", // Grape
    "#FFBD00", // Saffron
    "#006400", // Basil
    "#E63946", // Strawberry
    "#457B9D", // Blackberry
    "#A7C957", // Lime
    "#7B3F00", // Cinnamon
    "#6A994E", // Sage
    "#BC6C25", // Caramel
    "#DD1C1A", // Chili
    "#386641"  // Mint
  ],
  
  // Urban landscape colors
  URBAN_CANVAS: [
    "#264653", // Asphalt
    "#E76F51", // Brick
    "#2A9D8F", // Copper Patina
    "#E9C46A", // Brass
    "#F4A261", // Terracotta
    "#AABD8C", // Concrete
    "#5E548E", // Neon Sign
    "#9E2A2B", // Rust
    "#335C67", // Steel Blue
    "#EDC4B3", // Sandstone
    "#B56576", // Faded Paint
    "#6D6875", // Shadow
    "#A98467", // Weather Wood
    "#D8E2DC", // Fog
    "#606C38"  // Moss
  ]
};

// Divergent color palettes for showing contrasting values
export const DIVERGENT_PALETTES = {
  // Fire and Ice theme - warm to cool
  ELEMENTAL_CONTRAST: [
    "#03071E", // Deep Navy
    "#370617", // Dark Burgundy
    "#6A040F", // Maroon
    "#9D0208", // Dark Red
    "#D00000", // Bright Red
    "#DC2F02", // Red-Orange
    "#E85D04", // Orange
    "#F48C06", // Gold
    "#FAA307", // Amber
    "#FFBA08", // Yellow
    "#F8F9FA", // White/Neutral
    "#CFF4FC", // Pale Blue
    "#9EEAF9", // Light Blue
    "#6CD4F4", // Sky Blue
    "#30C5F1", // Bright Blue
    "#099DED", // Deep Blue
    "#0078C2", // Royal Blue
    "#004E98", // Navy
    "#03396c", // Dark Navy
    "#011936"  // Midnight Blue
  ],
  
  // Nature inspired green to brown transitions
  FOREST_TO_DESERT: [
    "#1B4332", // Deep Forest Green
    "#2D6A4F", // Forest Green
    "#40916C", // Pine
    "#52B788", // Sage
    "#74C69D", // Mint
    "#95D5B2", // Light Green
    "#B7E4C7", // Pale Green
    "#D8F3DC", // Lighter Green
    "#F8F9FA", // White/Neutral
    "#FAEDCD", // Sand
    "#F8D5AC", // Light Sand
    "#F4A261", // Tan
    "#E9C46A", // Wheat
    "#E76F51", // Terracotta
    "#D4502C", // Rust
    "#B23A17", // Sienna
    "#9C2D0A", // Burnt Sienna
    "#841F02", // Clay
    "#6B180F", // Deep Clay
    "#581C0C"  // Dark Brown
  ],
  
  // Purple to Green divergent palette
  MYSTIC_MEADOW: [
    "#3A015C", // Deep Purple
    "#4B0082", // Indigo
    "#6A0DAD", // Violet
    "#8B31C7", // Bright Purple
    "#A84FE3", // Lavender
    "#BE73F0", // Light Purple
    "#D6A8FF", // Pale Purple
    "#EAD6FD", // Lilac
    "#F8F9FA", // White/Neutral
    "#E2F4D4", // Pale Green
    "#C3E8BD", // Light Mint
    "#A1D99B", // Mint
    "#74C476", // Bright Green
    "#41AB5D", // Green
    "#238B45", // Forest Green
    "#006D2C", // Deep Green
    "#00541F", // Pine
    "#003C15", // Dark Forest
    "#00280D", // Evergreen
    "#001A06"  // Deep Evergreen
  ],
  
  // Pink to Blue divergent palette
  COSMIC_DRIFT: [
    "#590D22", // Deep Burgundy
    "#800F2F", // Burgundy
    "#A4133C", // Cranberry
    "#C9184A", // Ruby
    "#FF4D6D", // Bright Pink
    "#FF758F", // Salmon
    "#FF8FA3", // Light Pink
    "#FFB3C1", // Pale Pink
    "#F8F9FA", // White/Neutral
    "#BDE0FE", // Pale Blue
    "#A2D2FF", // Light Blue
    "#81B1E3", // Sky Blue
    "#5E96C9", // Medium Blue
    "#3A7CA5", // Ocean Blue
    "#2A6F97", // Deep Blue
    "#1A5B83", // Navy Blue
    "#0F4C75", // Dark Navy
    "#073B5E", // Midnight Blue
    "#042E49", // Deep Navy
    "#001D3D"  // Dark Blue
  ]
};

// Monochromatic palettes for specific color families
export const MONOCHROMATIC_PALETTES = {
  // Blue monochromatic palette
  AZURE_CASCADE: [
    "#03045E", // Midnight Blue
    "#023E8A", // Dark Navy
    "#0077B6", // Navy
    "#0096C7", // Deep Blue
    "#00B4D8", // Ocean Blue
    "#48CAE4", // Bright Blue
    "#90E0EF", // Sky Blue
    "#ADE8F4", // Light Blue
    "#CAF0F8", // Pale Blue
    "#E1F5FE"  // Ice Blue
  ],
  
  // Green monochromatic palette
  EMERALD_DEPTHS: [
    "#002A16", // Deep Forest
    "#004B23", // Forest
    "#006400", // Deep Green
    "#007200", // Green
    "#008000", // Medium Green
    "#38B000", // Bright Green
    "#70E000", // Lime Green
    "#9EF01A", // Light Lime
    "#CCFF33", // Yellow-Green
    "#E9FFD4"  // Pale Green
  ],
  
  // Purple monochromatic palette
  VIOLET_TWILIGHT: [
    "#240046", // Deep Purple
    "#3C096C", // Royal Purple
    "#5A189A", // Purple
    "#7B2CBF", // Bright Purple
    "#9D4EDD", // Lavender
    "#C77DFF", // Light Purple
    "#E0AAFF", // Pale Purple
    "#EFCFFF", // Lilac
    "#F8E4FF", // Light Lilac
    "#FCF2FF"  // Pale Lilac
  ],
  
  // Pink monochromatic palette
  ROSE_REVERIE: [
    "#4F000B", // Deep Burgundy
    "#720026", // Burgundy
    "#A10035", // Maroon
    "#C9184A", // Ruby
    "#FF4D6D", // Bright Pink
    "#FF758F", // Salmon
    "#FF8FA3", // Light Pink
    "#FFB3C1", // Pale Pink
    "#FFCCD5", // Blush
    "#FFF0F3"  // Pale Blush
  ],
  
  // Orange monochromatic palette
  AMBER_GLOW: [
    "#4D1500", // Deep Brown
    "#802200", // Sienna
    "#B32D00", // Rust
    "#E63900", // Burnt Orange
    "#FF4500", // Red-Orange
    "#FF6A00", // Orange
    "#FF9000", // Tangerine
    "#FFB700", // Amber
    "#FFD000", // Gold
    "#FFEAA7"  // Pale Yellow
  ]
};

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

// Update BASE_THEMES to include new themes
export const EXTENDED_BASE_THEMES: ColorThemes = {
  ...BASE_THEMES,
  // Add new monochromatic themes
  azureCascade: {},
  emeraldDepths: {},
  violetTwilight: {},
  roseReverie: {},
  amberGlow: {},
  
  // Add divergent themes
  elementalContrast: {},
  forestToDesert: {},
  mysticMeadow: {},
  cosmicDrift: {},
  
  // Add categorical themes based on the new palettes
  exoticPlumage: {},
  pixelNostalgia: {},
  culinaryPalette: {},
  urbanCanvas: {}
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
 * Enhanced function to generate extended color themes
 */
export function generateExtendedColorThemes(
  categories: string[], 
  colorPalette = DEFAULT_COLOR_PALETTE
): ColorThemes {
  // Get the base themes first
  const themes = generateColorThemes(categories, colorPalette);
  
  // Add monochromatic blue theme
  categories.forEach((category, index) => {
    const colorIndex = index % MONOCHROMATIC_PALETTES.AZURE_CASCADE.length;
    themes.azureCascade ??= {};
    themes.azureCascade[category] = MONOCHROMATIC_PALETTES.AZURE_CASCADE[colorIndex];
  });
  
  // Add monochromatic green theme
  categories.forEach((category, index) => {
    const colorIndex = index % MONOCHROMATIC_PALETTES.EMERALD_DEPTHS.length;
    themes.emeraldDepths ??= {};
    themes.emeraldDepths[category] = MONOCHROMATIC_PALETTES.EMERALD_DEPTHS[colorIndex];
  });
  
  // Add monochromatic purple theme
  categories.forEach((category, index) => {
    const colorIndex = index % MONOCHROMATIC_PALETTES.VIOLET_TWILIGHT.length;
    themes.violetTwilight ??= {};
    themes.violetTwilight[category] = MONOCHROMATIC_PALETTES.VIOLET_TWILIGHT[colorIndex];
  });
  
  // Add monochromatic pink theme
  categories.forEach((category, index) => {
    const colorIndex = index % MONOCHROMATIC_PALETTES.ROSE_REVERIE.length;
    themes.roseReverie ??= {};
    themes.roseReverie[category] = MONOCHROMATIC_PALETTES.ROSE_REVERIE[colorIndex];
  });
  
  // Add monochromatic orange/amber theme
  categories.forEach((category, index) => {
    const colorIndex = index % MONOCHROMATIC_PALETTES.AMBER_GLOW.length;
    themes.amberGlow ??= {};
    themes.amberGlow[category] = MONOCHROMATIC_PALETTES.AMBER_GLOW[colorIndex];
  });
  
  // Add divergent themes - these work best with sequential data
  // For categorical data, we'll use a mapping strategy
  
  // Elemental Contrast theme (fire to ice)
  categories.forEach((category, index) => {
    const total = DIVERGENT_PALETTES.ELEMENTAL_CONTRAST.length;
    // Map categories across the divergent spectrum
    const colorIndex = Math.floor((index / categories.length) * total);
    themes.elementalContrast ??= {};
    themes.elementalContrast[category] = DIVERGENT_PALETTES.ELEMENTAL_CONTRAST[
      Math.min(colorIndex, total - 1)
    ];
  });
  
  // Forest to Desert theme
  categories.forEach((category, index) => {
    const total = DIVERGENT_PALETTES.FOREST_TO_DESERT.length;
    const colorIndex = Math.floor((index / categories.length) * total);
    themes.forestToDesert ??= {};
    themes.forestToDesert[category] = DIVERGENT_PALETTES.FOREST_TO_DESERT[
      Math.min(colorIndex, total - 1)
    ];
  });
  
  // Mystic Meadow theme (purple to green)
  categories.forEach((category, index) => {
    const total = DIVERGENT_PALETTES.MYSTIC_MEADOW.length;
    const colorIndex = Math.floor((index / categories.length) * total);
    themes.mysticMeadow ??= {};
    themes.mysticMeadow[category] = DIVERGENT_PALETTES.MYSTIC_MEADOW[
      Math.min(colorIndex, total - 1)
    ];
  });
  
  // Cosmic Drift theme (pink to blue)
  categories.forEach((category, index) => {
    const total = DIVERGENT_PALETTES.COSMIC_DRIFT.length;
    const colorIndex = Math.floor((index / categories.length) * total);
    themes.cosmicDrift ??= {};
    themes.cosmicDrift[category] = DIVERGENT_PALETTES.COSMIC_DRIFT[
      Math.min(colorIndex, total - 1)
    ];
  });
  
  // Add categorical themes based on the new palettes
  
  // Exotic Plumage theme
  categories.forEach((category, index) => {
    const colorIndex = index % CATEGORICAL_PALETTES.EXOTIC_PLUMAGE.length;
    themes.exoticPlumage ??= {};
    themes.exoticPlumage[category] = CATEGORICAL_PALETTES.EXOTIC_PLUMAGE[colorIndex];
  });
  
  // Pixel Nostalgia theme
  categories.forEach((category, index) => {
    const colorIndex = index % CATEGORICAL_PALETTES.PIXEL_NOSTALGIA.length;
    themes.pixelNostalgia ??= {};
    themes.pixelNostalgia[category] = CATEGORICAL_PALETTES.PIXEL_NOSTALGIA[colorIndex];
  });
  
  // Culinary Palette theme
  categories.forEach((category, index) => {
    const colorIndex = index % CATEGORICAL_PALETTES.CULINARY_PALETTE.length;
    themes.culinaryPalette ??= {};
    themes.culinaryPalette[category] = CATEGORICAL_PALETTES.CULINARY_PALETTE[colorIndex];
  });
  
  // Urban Canvas theme
  categories.forEach((category, index) => {
    const colorIndex = index % CATEGORICAL_PALETTES.URBAN_CANVAS.length;
    themes.urbanCanvas ??= {};
    themes.urbanCanvas[category] = CATEGORICAL_PALETTES.URBAN_CANVAS[colorIndex];
  });
  
  // Add "Otro" (Other) category for all new themes
  Object.keys(themes).forEach(theme => {
    if (!themes[theme]) themes[theme] = {};
    themes[theme]["Otro"] = "#95a5a6";
  });
  
  return themes;
}

/**
 * Helper function to create a sequential gradient between two colors
 */
export function createColorGradient(startColor: string, endColor: string, steps: number): string[] {
  const start = d3.rgb(startColor);
  const end = d3.rgb(endColor);
  
  return Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    return d3.rgb(
      Math.round(start.r + t * (end.r - start.r)),
      Math.round(start.g + t * (end.g - start.g)),
      Math.round(start.b + t * (end.b - start.b))
    ).toString();
  });
}

/**
 * Get a color palette by name
 */
export function getColorPaletteByName(paletteName: string): string[] {
  // Check categorical palettes
  if (CATEGORICAL_PALETTES[paletteName]) {
    return CATEGORICAL_PALETTES[paletteName];
  }
  
  // Check divergent palettes
  if (DIVERGENT_PALETTES[paletteName]) {
    return DIVERGENT_PALETTES[paletteName];
  }
  
  // Check monochromatic palettes
  if (MONOCHROMATIC_PALETTES[paletteName]) {
    return MONOCHROMATIC_PALETTES[paletteName];
  }
  
  // Return default if not found
  return DEFAULT_COLOR_PALETTE;
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