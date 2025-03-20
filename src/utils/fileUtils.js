// fileUtils.js - Place this in your utils folder

/**
 * Parse CSV content into an array of objects
 * @param {string} csvContent - Raw CSV content as string
 * @param {boolean} hasHeader - Whether the CSV has header row
 * @returns {Object[]} Array of objects with column headers as keys
 */
export const parseCSV = (csvContent, hasHeader = true) => {
    // Split by newlines and filter empty rows
    const rows = csvContent.split('\n').filter(row => row.trim() !== '');
    
    if (rows.length === 0) {
      return [];
    }
    
    // Get headers from first row if hasHeader is true
    const headers = hasHeader 
      ? rows[0].split(',').map(h => h.trim())
      : Array.from({ length: rows[0].split(',').length }, (_, i) => `column${i}`);
    
    // Start from index 1 if has header, otherwise from 0
    const startIndex = hasHeader ? 1 : 0;
    
    // Map each row to an object
    return rows.slice(startIndex).map(row => {
      // Handle quotes in CSV properly
      const values = parseCSVRow(row);
      const rowData = {};
      
      headers.forEach((header, index) => {
        rowData[header] = values[index] !== undefined ? values[index].trim() : '';
      });
      
      return rowData;
    });
  };
  
  /**
   * Parse a single CSV row respecting quoted fields
   * @param {string} row - CSV row
   * @returns {string[]} Array of field values
   */
  const parseCSVRow = (row) => {
    const fields = [];
    let fieldValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        // Toggle quote state
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        // End of field
        fields.push(fieldValue);
        fieldValue = '';
      } else {
        // Add character to current field
        fieldValue += char;
      }
    }
    
    // Add the last field
    fields.push(fieldValue);
    
    return fields;
  };
  
  /**
   * Detect file type from file name
   * @param {File} file - File object
   * @returns {string} File type ('csv', 'json', etc.)
   */
  export const detectFileType = (file) => {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
      return 'csv';
    } else if (fileName.endsWith('.json')) {
      return 'json';
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return 'excel';
    } else {
      return 'unknown';
    }
  };
  
  /**
   * Process node data to ensure consistent format
   * @param {Object[]} nodes - Raw node data
   * @returns {Object[]} Processed node data
   */
  export const processNodeData = (nodes) => {
    return nodes.map(node => {
      // Find ID field (could be named differently)
      const idField = Object.keys(node).find(key => 
        key.toLowerCase() === 'id' || 
        key.toLowerCase() === 'name' ||
        key.toLowerCase() === 'node'
      ) || Object.keys(node)[0];
      
      // Find category field
      const categoryField = Object.keys(node).find(key => 
        key.toLowerCase() === 'category' || 
        key.toLowerCase() === 'type' ||
        key.toLowerCase() === 'group'
      ) || Object.keys(node)[1] || '';
      
      return {
        id: String(node[idField] || ''),
        category: String(node[categoryField] || 'default'),
        // Keep original data
        ...node
      };
    });
  };
  
  /**
   * Process link data to ensure consistent format
   * @param {Object[]} links - Raw link data
   * @returns {Object[]} Processed link data
   */
  export const processLinkData = (links) => {
    return links.map(link => {
      // Find source field
      const sourceField = Object.keys(link).find(key => 
        key.toLowerCase() === 'source' || 
        key.toLowerCase() === 'from'
      ) || Object.keys(link)[0];
      
      // Find target field
      const targetField = Object.keys(link).find(key => 
        key.toLowerCase() === 'target' || 
        key.toLowerCase() === 'to'
      ) || Object.keys(link)[1];
      
      return {
        source: String(link[sourceField] || ''),
        target: String(link[targetField] || ''),
        // Keep original data
        ...link
      };
    });
  };