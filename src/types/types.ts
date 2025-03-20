// types.ts - Create this file in your project

// Node data structure
export interface NodeData {
    id: string;
    category: string;
    [key: string]: string | number | boolean; // Allow for additional properties
  }
  
  // Link data structure
  export interface LinkData {
    source: string;
    target: string;
    [key: string]: string | number | boolean; // Allow for additional properties
  }
  
  // File information structure
  export interface FileInfo {
    name: string;
    rowCount: number;
    columnCount: number;
    sampleRows: Record<string, string | number>[];
  }