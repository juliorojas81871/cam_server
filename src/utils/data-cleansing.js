// Data cleansing utilities for building names and addresses

// Checks if a building name contains address-like patterns
export function hasAddressInName(name) {
  if (!name) return false;
  
  const addressPatterns = [
    /\d+\s+[A-Za-z]+\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|way|pl|place)/i,
    /\d+\s+[A-Za-z]+\s+[A-Za-z]+\s+(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|way|pl|place)/i,
    /\d{3,5}\s+[A-Za-z]/,  // Street numbers followed by letters
    /,\s*\d{5}(-\d{4})?/,  // ZIP codes
    /(suite|ste|floor|fl|room|rm)\s*\d+/i,  // Suite/floor/room numbers
  ];
  
  return addressPatterns.some(pattern => pattern.test(name));
}

// Attempts to clean building names by removing or separating address components
export function cleanBuildingName(name) {
  if (!name) return name;
  
  let cleaned = name.trim();
  
  // Step 1: Remove common address suffixes at the end
  cleaned = cleaned.replace(/,?\s*\d{5}(-\d{4})?\s*$/, ''); // Remove ZIP codes
  cleaned = cleaned.replace(/,?\s*(suite|ste|floor|fl|room|rm)\s*\d+\s*$/i, ''); // Remove suite/floor numbers
  
  // Step 2: Split on common separators and take the first part if it looks like a building name
  const separators = [' - ', ' – ', ' | ', ' @ ', ' at '];
  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      const parts = cleaned.split(sep);
      if (parts.length > 1) {
        // Take the first part if it doesn't start with a number (likely building name)
        if (!/^\d/.test(parts[0].trim())) {
          cleaned = parts[0].trim();
          break;
        }
      }
    }
  }
  
  // Step 3: If name starts with an address, try to extract building name after comma
  if (/^\d+\s+[A-Za-z]/.test(cleaned)) {
    const commaParts = cleaned.split(',');
    if (commaParts.length > 1) {
      // Look for a part that doesn't start with a number
      for (let i = 1; i < commaParts.length; i++) {
        const part = commaParts[i].trim();
        if (part && !/^\d/.test(part) && part.length > 3) {
          cleaned = part;
          break;
        }
      }
    }
  }
  
  // Step 4: Clean up extra whitespace and punctuation
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/^[,\-\s]+|[,\-\s]+$/g, '');
  
  return cleaned || name; // Return original if cleaning resulted in empty string
}

// Process a row of data and add cleaned building name fields
export function processRowData(row) {
  const assetName = row['Real Property Asset Name'] || '';
  
  return {
    ...row,
    cleanedBuildingName: cleanBuildingName(assetName),
    addressInName: hasAddressInName(assetName)
  };
}

// Log data cleansing statistics
export function logCleansingStats(originalData, processedData) {
  const totalRecords = processedData.length;
  const withAddresses = processedData.filter(row => row.addressInName).length;
  const cleaned = processedData.filter(row => 
    row.cleanedBuildingName !== (row['Real Property Asset Name'] || '')
  ).length;
  
  // Show some examples
  if (withAddresses > 0) {
    let examples = 0;
    for (const row of processedData) {
      if (row.addressInName && examples < 3) {
        examples++;
      }
    }
  }
} 