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

// Extract building name from combined address/name strings
function extractBuildingName(text) {
  if (!text) return text;
  
  let cleaned = text.trim();
  
  // Define delimiters in order of priority
  // Most specific to least specific separators
  const delimiters = [
    ' - ',
    ' – ',
    ', ',
    ' / ',
    ': ',
    ' | ',
    ' @ ',
    ' at '
  ];
  
  // Process each delimiter
  for (const delimiter of delimiters) {
    if (cleaned.includes(delimiter)) {
      const parts = cleaned.split(delimiter).map(part => part.trim());
      
      if (parts.length >= 2) {
        // Strategy: Take the part that looks least like an address
        let bestPart = parts[0];
        let bestScore = scoreAsNonAddress(parts[0]);
        
        for (let i = 1; i < parts.length; i++) {
          const score = scoreAsNonAddress(parts[i]);
          if (score > bestScore) {
            bestPart = parts[i];
            bestScore = score;
          }
        }
        
        cleaned = bestPart;
        break; // Stop after first delimiter match
      }
    }
  }
  
  return cleaned.trim();
}

// Score a text part based on how likely it is to be a building name (vs address)
function scoreAsNonAddress(text) {
  if (!text || text.length < 2) return 0;
  
  let score = 10; // Base score
  
  // Penalize if starts with numbers (likely address)
  if (/^\d/.test(text)) {
    score -= 15;
  }
  
  // Penalize street indicators
  if (/\b(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|way|pl|place)\b/i.test(text)) {
    score -= 10;
  }
  
  // Penalize zip codes
  if (/\d{5}(-\d{4})?/.test(text)) {
    score -= 20;
  }
  
  // Reward proper building name indicators
  if (/\b(center|centre|plaza|tower|building|complex|mall|square|park|place)\b/i.test(text)) {
    score += 15;
  }
  
  // Reward capitalized words (building names often have proper capitalization)
  const capitalizedWords = text.match(/\b[A-Z][a-z]+/g);
  if (capitalizedWords && capitalizedWords.length > 1) {
    score += 5;
  }
  
  // Penalize very short parts
  if (text.length < 5) {
    score -= 5;
  }
  
  return score;
}

// Attempts to clean building names by removing or separating address components
export function cleanBuildingName(name) {
  if (!name) return name;
  
  let cleaned = name.trim();
  
  // Step 1: Use the improved extraction logic
  cleaned = extractBuildingName(cleaned);
  
  // Step 2: Remove common address suffixes at the end
  cleaned = cleaned.replace(/,?\s*\d{5}(-\d{4})?\s*$/, ''); // Remove ZIP codes
  cleaned = cleaned.replace(/,?\s*(suite|ste|floor|fl|room|rm)\s*\d+\s*$/i, ''); // Remove suite/floor numbers
  
  // Step 3: Clean up extra whitespace and punctuation
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/^[,\-\s]+|[,\-\s]+$/g, '');
  
  // Step 4: Handle edge cases where cleaning resulted in something too short or empty
  if (!cleaned || cleaned.length < 3) {
    return name; // Return original if cleaning was too aggressive
  }
  
  return cleaned;
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
} 