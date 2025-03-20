/**
 * Utility functions for handling large data in sessionStorage
 */

/**
 * Safely store data in sessionStorage with option for chunk storage if data is large
 * @param key The key to store the data under
 * @param data The data to store
 * @returns boolean indicating success
 */
export const safeSessionStore = <T>(key: string, data: T): boolean => {
    try {
      // Convert data to JSON string
      const jsonString = JSON.stringify(data);
      
      // Try to store directly first
      try {
        sessionStorage.setItem(key, jsonString);
        return true;
      } catch (e) {
        // If direct storage fails and it's likely due to size, try LZW compression
        if (jsonString.length > 500000) { // ~0.5MB
          console.log("Data is large, attempting to compress");
          
          try {
            // Simple LZW-like compression for JSON strings
            const compressed = compressJSON(jsonString);
            sessionStorage.setItem(`${key}_compressed`, 'true');
            sessionStorage.setItem(key, compressed);
            return true;
          } catch (compressError) {
            console.error("Compression failed:", compressError);
            return false;
          }
        }
        
        console.error("Storage failed:", e);
        return false;
      }
    } catch (error) {
      console.error("Error preparing data for storage:", error);
      return false;
    }
  };
  
  /**
   * Safely retrieve data from sessionStorage, handling compressed data if necessary
   * @param key The key to retrieve data from
   * @returns The retrieved data or null if not found
   */
  export const safeSessionRetrieve = <T>(key: string): T | null => {
    try {
      const isCompressed = sessionStorage.getItem(`${key}_compressed`) === 'true';
      const storedData = sessionStorage.getItem(key);
      
      if (!storedData) return null;
      
      if (isCompressed) {
        const decompressed = decompressJSON(storedData);
        return JSON.parse(decompressed) as T;
      }
      
      return JSON.parse(storedData) as T;
    } catch (error) {
      console.error("Error retrieving data from storage:", error);
      return null;
    }
  };
  
  /**
   * Simple LZW-like compression for JSON strings
   * This helps with repetitive data patterns often found in JSON
   */
  const compressJSON = (json: string): string => {
    // Dictionary to map repeated strings to codes
    const dictionary: Record<string, number> = {};
    
    // Initialize dictionary with single characters
    for (let i = 0; i < 256; i++) {
      dictionary[String.fromCharCode(i)] = i;
    }
    
    let result = '';
    let phrase = '';
    let code = 256;
    
    for (let i = 0; i < json.length; i++) {
      const char = json.charAt(i);
      const combined = phrase + char;
      
      if (dictionary[combined] !== undefined) {
        phrase = combined;
      } else {
        // Add the code for the current phrase
        result += String.fromCharCode(dictionary[phrase]);
        
        // Add the new phrase to the dictionary (if we haven't exceeded capacity)
        if (code < 65536) { // Limit to avoid exceeding UTF-16
          dictionary[combined] = code++;
        }
        
        phrase = char;
      }
    }
    
    // Add the last phrase
    if (phrase !== '') {
      result += String.fromCharCode(dictionary[phrase]);
    }
    
    return result;
  };
  
  /**
   * Decompress JSON string compressed with the LZW-like algorithm
   */
  const decompressJSON = (compressed: string): string => {
    // Initialize dictionary with single characters
    const dictionary: Record<number, string> = {};
    for (let i = 0; i < 256; i++) {
      dictionary[i] = String.fromCharCode(i);
    }
    
    let result = '';
    let phrase = dictionary[compressed.charCodeAt(0)];
    result += phrase;
    let code = 256;
    
    for (let i = 1; i < compressed.length; i++) {
      const currCode = compressed.charCodeAt(i);
      let entry: string;
      
      // Check if the current code exists in our dictionary
      if (dictionary[currCode] !== undefined) {
        entry = dictionary[currCode];
      } else if (currCode === code) {
        entry = phrase + phrase.charAt(0);
      } else {
        throw new Error('Invalid compressed data');
      }
      
      result += entry;
      
      // Add to dictionary (if we haven't exceeded capacity)
      if (code < 65536) { // Limit to avoid exceeding UTF-16
        dictionary[code++] = phrase + entry.charAt(0);
      }
      
      phrase = entry;
    }
    
    return result;
  };