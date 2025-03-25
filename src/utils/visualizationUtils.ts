import * as d3 from 'd3';
import { ColorTheme, Node, Link, SimulatedNode, SimulatedLink } from '@/types/networkTypes';

/**
 * Convert hex color to RGB object
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 245, g: 245, b: 245 }; // Default to #f5f5f5
};

/**
 * Generate dynamic color themes based on unique categories
 */
export const generateDynamicColorThemes = (
  categories: string[], 
  colorPalette: string[]
): Record<string, ColorTheme> => {
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
};

/**
 * Get node color based on customization settings
 */
export const getNodeColor = (
  node: Node, 
  customNodeColors: Record<string, string>,
  colorTheme: string,
  dynamicColorThemes: Record<string, ColorTheme>
): string => {
  // First check for custom node color
  if (customNodeColors[node.id]) {
    return customNodeColors[node.id];
  }
  
  // Use the category color from current theme
  const currentTheme = dynamicColorThemes[colorTheme] || dynamicColorThemes.default;
  return currentTheme[node.category] || currentTheme["Otro"] || "#95a5a6";
};

/**
 * Convert Data URI to Blob
 */
export const dataURItoBlob = (dataURI: string): Blob => {
  // Convert base64/URLEncoded data component to raw binary data held in a string
  let byteString: string;
  if (dataURI.split(',')[0].indexOf('base64') >= 0)
    byteString = atob(dataURI.split(',')[1]);
  else
    byteString = unescape(decodeURIComponent(dataURI.split(',')[1]));
    
  // Separate out the mime component
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  
  // Write the bytes of the string to a typed array
  const ia = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([ia], {type: mimeString});
};

/**
 * Find connections for a node
 */
export const findNodeConnections = (node: Node, links: Link[]): { sourceLinks: Link[], targetLinks: Link[] } => {
  const sourceLinks = links.filter(link => {
    return typeof link.source === 'object' 
      ? link.source.id === node.id 
      : link.source === node.id;
  });
  
  const targetLinks = links.filter(link => {
    return typeof link.target === 'object' 
      ? link.target.id === node.id 
      : link.target === node.id;
  });

  return { sourceLinks, targetLinks };
};

/**
 * Process CSV string into an array of objects
 */
export const parseCSV = (content: string): Record<string, string>[] => {
  const rows = content.split('\n');
  const headers = rows[0].split(',').map(h => h.trim());
  
  return rows.slice(1).filter(row => row.trim() !== '').map(row => {
    const values = row.split(',');
    const rowData: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      rowData[header] = values[index] ? values[index].trim() : '';
    });
    
    return rowData;
  });
};