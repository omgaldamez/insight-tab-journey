// fileReader.ts - Using folder configuration
import { FileInfo, NodeData, LinkData } from '@/types/types';
import { dataFolders, demoFolders } from '@/utils/folderConfig';

/**
 * Try to fetch a file from the specific path where your files are located
 */
async function tryFetchFile(folder: string, filename: string, isDemo: boolean): Promise<string | null> {
  
  // Adjust for the link filename if it's links.csv
  const adjustedFilename = filename === 'links.csv' ? 'links.csv' : filename;
  
  // Your specific path pattern
  const path = `/public/src-data/${folder}/${adjustedFilename}`;
  
  try {
    console.log(`Attempting to fetch from: ${path}`);
    const response = await fetch(path);
    
    if (response.ok) {
      console.log(`✅ Successfully fetched file from: ${path}`);
      const text = await response.text();
      
      // Check if we got HTML instead of CSV
      if (text.trim().toLowerCase().startsWith('<!doctype html>') || 
          text.trim().toLowerCase().startsWith('<html')) {
        console.warn(`❌ Got HTML instead of CSV from ${path}`);
        return null;
      }
      
      console.log(`File content starts with: ${text.substring(0, 100)}...`);
      return text;
    } else {
      console.warn(`❌ Failed to fetch ${path}: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.warn(`❌ Error fetching ${path}:`, error);
  }
  
  console.error(`❌ Failed to fetch ${folder}/${adjustedFilename}`);
  return null;
}

/**
 * Improved CSV parser with better error handling
 */
const parseCSV = (csvText: string): Record<string, string | number>[] => {
  try {
    // Check if we received HTML instead of CSV (error page)
    if (csvText.trim().toLowerCase().startsWith('<!doctype html>') || 
        csvText.trim().toLowerCase().startsWith('<html')) {
      console.error('Received HTML instead of CSV data');
      throw new Error('Invalid CSV data (received HTML)');
    }

    const lines = csvText.trim().split('\n');
    if (lines.length === 0) {
      console.warn('CSV has no data (empty file)');
      return [];
    }
    
    console.log(`CSV has ${lines.length} lines. First line: ${lines[0]}`);
    
    const headers = lines[0].split(',').map(h => h.trim());
    console.log(`Detected headers: ${headers.join(', ')}`);
    
    const data: Record<string, string | number>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      
      // Handle quoted fields with commas
      let inQuote = false;
      let currentField = '';
      const fields: string[] = [];
      
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        
        if (char === '"') {
          inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
          fields.push(currentField);
          currentField = '';
        } else {
          currentField += char;
        }
      }
      
      // Add the last field
      fields.push(currentField);
      
      // Check if we have enough fields for all headers
      if (fields.length < headers.length) {
        console.warn(`Line ${i} has fewer fields (${fields.length}) than headers (${headers.length})`);
        // Pad with empty strings to match header count
        while (fields.length < headers.length) {
          fields.push('');
        }
      }
      
      const row: Record<string, string | number> = {};
      headers.forEach((header, index) => {
        // Try to convert to number if possible
        const value = fields[index] ? fields[index].trim() : '';
        const numValue = Number(value);
        row[header] = !isNaN(numValue) && value !== '' ? numValue : value;
      });
      
      data.push(row);
    }
    
    console.log(`Successfully parsed ${data.length} rows of data`);
    if (data.length > 0) {
      console.log(`Sample row data:`, data[0]);
    }
    
    return data;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Get the folder name with proper casing from the lowercased id
 */
function getFolderNameById(id: string, isDemo: boolean): string {
  const folders = isDemo ? demoFolders : dataFolders;
  const folder = folders.find(f => f.id === id);
  return folder ? folder.name : id.charAt(0).toUpperCase() + id.slice(1);
}

/**
 * Gets file information for a node file
 */
export const getNodeFileInfo = async (folderId: string, isDemo = false): Promise<FileInfo> => {
  console.log(`Getting node file info for ${folderId}, isDemo: ${isDemo}`);
  
  try {
    // Get the properly cased folder name
    const folderName = getFolderNameById(folderId, isDemo);
    
    // Try to fetch and parse the CSV file
    const csvText = await tryFetchFile(folderName, 'nodes.csv', isDemo);
    
    if (csvText) {
      try {
        const parsedData = parseCSV(csvText);
        
        console.log(`Successfully parsed node data for ${folderId}, found ${parsedData.length} rows`);
        
        return {
          name: `${folderId} - Nodes`,
          rowCount: parsedData.length,
          columnCount: parsedData.length > 0 ? Object.keys(parsedData[0]).length : 0,
          sampleRows: parsedData.slice(0, 5)
        };
      } catch (parseError) {
        console.error(`Error parsing CSV for ${folderId}:`, parseError);
        throw parseError;
      }
    } else {
      throw new Error(`No CSV data found for nodes in folder ${folderId}`);
    }
  } catch (error) {
    console.error(`Error getting node file info for folder ${folderId}:`, error);
    
    // Only use mock data for demo folders
    if (isDemo) {
      console.log(`Falling back to mock data for demo folder ${folderId}`);
      
      // Demo folder data
      const folderData: Record<string, { rowCount: number, colCount: number }> = {
        'social-network': { rowCount: 45, colCount: 3 },
        'scientific-citations': { rowCount: 124, colCount: 5 },
        'character-network': { rowCount: 32, colCount: 4 }
      };

      const data = folderData[folderId] || { rowCount: 30, colCount: 3 };
      
      // Generate sample rows for demo data
      const sampleRows = Array.from({ length: Math.min(5, data.rowCount) }, (_, i) => {
        const row: Record<string, string | number> = { id: `node_${i + 1}` };
        
        if (data.colCount > 1) row['name'] = `Node ${i + 1}`;
        if (data.colCount > 2) {
          const categories = ['Person', 'Organization', 'Location', 'Event', 'Concept'];
          row['category'] = categories[i % categories.length];
        }
        if (data.colCount > 3) row['value'] = Math.floor(Math.random() * 100);
        if (data.colCount > 4) row['weight'] = Math.random().toFixed(2);
        
        return row;
      });

      return {
        name: `${folderId} - Nodes (Demo)`,
        rowCount: data.rowCount,
        columnCount: data.colCount,
        sampleRows
      };
    }
    
    // For real data, throw the error
    throw new Error(`Failed to load node file for ${folderId}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Gets file information for a link file
 */
export const getLinkFileInfo = async (folderId: string, isDemo = false): Promise<FileInfo> => {
  console.log(`Getting link file info for ${folderId}, isDemo: ${isDemo}`);
  
  try {
    // Get the properly cased folder name
    const folderName = getFolderNameById(folderId, isDemo);
    
    // Try to fetch and parse the CSV file, using links.csv which will be adjusted to links.csv in tryFetchFile
    const csvText = await tryFetchFile(folderName, 'links.csv', isDemo);
    
    if (csvText) {
      try {
        const parsedData = parseCSV(csvText);
        
        console.log(`Successfully parsed link data for ${folderId}, found ${parsedData.length} rows`);
        
        return {
          name: `${folderId} - Links`,
          rowCount: parsedData.length,
          columnCount: parsedData.length > 0 ? Object.keys(parsedData[0]).length : 0,
          sampleRows: parsedData.slice(0, 5)
        };
      } catch (parseError) {
        console.error(`Error parsing CSV for ${folderId}:`, parseError);
        throw parseError;
      }
    } else {
      throw new Error(`No CSV data found for links in folder ${folderId}`);
    }
  } catch (error) {
    console.error(`Error getting link file info for folder ${folderId}:`, error);
    
    // Only use mock data for demo folders
    if (isDemo) {
      console.log(`Falling back to mock data for demo folder ${folderId}`);
      
      // Demo folder data
      const folderData: Record<string, { rowCount: number, colCount: number }> = {
        'social-network': { rowCount: 78, colCount: 2 },
        'scientific-citations': { rowCount: 203, colCount: 3 },
        'character-network': { rowCount: 54, colCount: 2 }
      };

      const data = folderData[folderId] || { rowCount: 50, colCount: 2 };
      
      // Generate sample rows for demo data
      const sampleRows = Array.from({ length: Math.min(5, data.rowCount) }, (_, i) => {
        const row: Record<string, string | number> = {
          source: `node_${i + 1}`,
          target: `node_${(i + 3) % 10 + 1}`
        };
        
        if (data.colCount > 2) row['weight'] = Math.random().toFixed(2);
        
        return row;
      });

      return {
        name: `${folderId} - Links (Demo)`,
        rowCount: data.rowCount,
        columnCount: data.colCount,
        sampleRows
      };
    }
    
    // For real data, throw the error
    throw new Error(`Failed to load link file for ${folderId}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Loads node data from a folder
 */
export const loadNodeData = async (folderId: string, isDemo = false): Promise<NodeData[]> => {
  console.log(`Loading node data for ${folderId}, isDemo: ${isDemo}`);
  
  try {
    // Get the properly cased folder name
    const folderName = getFolderNameById(folderId, isDemo);
    
    // Try to fetch and parse the real CSV file
    const csvText = await tryFetchFile(folderName, 'nodes.csv', isDemo);
    
    if (csvText) {
      try {
        const parsedData = parseCSV(csvText);
        
        console.log(`Successfully parsed node data for ${folderId}, found ${parsedData.length} rows`);
        
        if (parsedData.length > 0) {
          // Simply use the first two columns as id and category
          const headers = Object.keys(parsedData[0]);
          
          if (headers.length < 2) {
            throw new Error(`Node file needs at least 2 columns, found ${headers.length}`);
          }
          
          const idColumn = headers[0];
          const categoryColumn = headers[1];
          
          console.log(`Using '${idColumn}' for node ID and '${categoryColumn}' for category`);
          
          // Transform to required format
          return parsedData.map(row => ({
            id: String(row[idColumn] || ''),
            category: String(row[categoryColumn] || 'default'),
            ...row  // Keep all original properties
          }));
        } else {
          throw new Error(`No data rows found in the nodes file for ${folderId}`);
        }
      } catch (parseError) {
        console.error(`Error parsing nodes CSV for ${folderId}:`, parseError);
        throw parseError;
      }
    } else {
      throw new Error(`No CSV data found for nodes in folder ${folderId}`);
    }
  } catch (error) {
    console.error(`Error loading node data for folder ${folderId}:`, error);
    
    // Only use mock data for demo folders
    if (isDemo) {
      console.log(`Falling back to mock node data for demo folder ${folderId}`);
      
      // Generate demo nodes with generic categories
      const nodeCount = {
        'social-network': 45,
        'scientific-citations': 124,
        'character-network': 32
      }[folderId] || 30;
      
      const categories = ['Person', 'Organization', 'Location', 'Event', 'Concept'];
      
      return Array.from({ length: nodeCount }, (_, i) => ({
        id: `node_${i + 1}`,
        category: categories[i % categories.length]
      }));
    }
    
    // For real data, throw the error
    throw new Error(`Failed to load node data for ${folderId}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Loads link data from a folder
 */
export const loadLinkData = async (folderId: string, isDemo = false): Promise<LinkData[]> => {
  console.log(`Loading link data for ${folderId}, isDemo: ${isDemo}`);
  
  try {
    // Get the properly cased folder name
    const folderName = getFolderNameById(folderId, isDemo);
    
    // Try to fetch and parse the real CSV file, using links.csv which will be adjusted to links.csv in tryFetchFile
    const csvText = await tryFetchFile(folderName, 'links.csv', isDemo);
    
    if (csvText) {
      try {
        const parsedData = parseCSV(csvText);
        
        console.log(`Successfully parsed link data for ${folderId}, found ${parsedData.length} rows`);
        
        if (parsedData.length > 0) {
          // Simply use the first two columns as source and target
          const headers = Object.keys(parsedData[0]);
          
          if (headers.length < 2) {
            throw new Error(`Link file needs at least 2 columns, found ${headers.length}`);
          }
          
          const sourceColumn = headers[0];
          const targetColumn = headers[1];
          
          console.log(`Using '${sourceColumn}' for link source and '${targetColumn}' for target`);
          
          // Transform to required format
          return parsedData.map(row => ({
            source: String(row[sourceColumn] || ''),
            target: String(row[targetColumn] || ''),
            ...row  // Keep all original properties
          }));
        } else {
          throw new Error(`No data rows found in the links file for ${folderId}`);
        }
      } catch (parseError) {
        console.error(`Error parsing links CSV for ${folderId}:`, parseError);
        throw parseError;
      }
    } else {
      throw new Error(`No CSV data found for links in folder ${folderId}`);
    }
  } catch (error) {
    console.error(`Error loading link data for folder ${folderId}:`, error);
    
    // Only use mock data for demo folders
    if (isDemo) {
      console.log(`Falling back to mock link data for demo folder ${folderId}`);
      
      // Node count for the folder (for reference in generating links)
      const nodeCount = {
        'social-network': 45,
        'scientific-citations': 124,
        'character-network': 32
      }[folderId] || 30;
      
      // Link count for the folder
      const linkCount = {
        'social-network': 78,
        'scientific-citations': 203,
        'character-network': 54
      }[folderId] || 50;
      
      // Generate demo links
      return Array.from({ length: linkCount }, (_, i) => {
        const source = `node_${Math.floor(Math.random() * nodeCount) + 1}`;
        let target = `node_${Math.floor(Math.random() * nodeCount) + 1}`;
        
        // Make sure source and target are different
        while (target === source) {
          target = `node_${Math.floor(Math.random() * nodeCount) + 1}`;
        }
        
        const link: LinkData = { source, target };
        
        // Add weight to scientific-citations links
        if (folderId === 'scientific-citations') {
          link.weight = parseFloat((Math.random() * 0.9 + 0.1).toFixed(2));
        }
        
        return link;
      });
    }
    
    // For real data, throw the error
    throw new Error(`Failed to load link data for ${folderId}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Gets a list of data folders from the configuration
 */
export const getDataFolders = async (): Promise<{ id: string; name: string; description: string; authors: string }[]> => {
  console.log("Getting list of data folders from configuration");
  return dataFolders;
};

/**
 * Gets a list of demo folders from the configuration
 */
export const getDemoFolders = async (): Promise<{ id: string; name: string; description: string; authors: string }[]> => {
  return demoFolders;
};