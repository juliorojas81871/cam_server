import XLSX from 'xlsx';
import { db, schema } from '../src/db.js';
import { processRowData, logCleansingStats } from '../src/utils/data-cleansing.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { count, eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read and parse Excel file
function readExcelFile(filename) {
  const filePath = join(__dirname, '..', filename);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
  return jsonData;
}

// Convert Excel serial date to proper date string
function convertExcelDate(excelDate) {
  if (!excelDate || excelDate === '' || isNaN(excelDate)) {
    return null;
  }
  
  // Excel date serial number starts from 1900-01-01
  // But Excel incorrectly treats 1900 as a leap year, so we need to adjust
  const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
  const date = new Date(excelEpoch.getTime() + (parseInt(excelDate) * 24 * 60 * 60 * 1000));
  
  // Return in YYYY-MM-DD format
  return date.toISOString().split('T')[0];
}

// Handle availableSquareFeet to ensure it's numeric and defaults to 0
function parseAvailableSquareFeet(value) {
  if (!value || value === '' || value === null || value === undefined) {
    return 0;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

// Map Excel columns to database fields for buildings
function mapBuildingData(row) {
  return {
    locationCode: row['Location Code'],
    realPropertyAssetName: row['Real Property Asset Name'],
    installationName: row['Installation Name'],
    ownedOrLeased: row['Owned or Leased'],
    gsaRegion: row['GSA Region'],
    streetAddress: row['Street Address'],
    city: row['City'],
    state: row['State'],
    zipCode: row['Zip Code'],
    latitude: row['Latitude'] ? String(row['Latitude']) : null,
    longitude: row['Longitude'] ? String(row['Longitude']) : null,
    buildingRentableSquareFeet: row['Building Rentable Square Feet'] ? String(row['Building Rentable Square Feet']) : null,
    availableSquareFeet: parseAvailableSquareFeet(row['Available Square Feet']),
    constructionDate: row['Construction Date'],
    congressionalDistrict: row['Congressional District'],
    congressionalDistrictRepresentativeName: row['Congressional District Representative Name'],
    buildingStatus: row['Building Status'],
    realPropertyAssetType: row['Real Property Asset Type'],
    cleanedBuildingName: row.cleanedBuildingName,
    addressInName: row.addressInName,
  };
}

// Map Excel columns to database fields for leases
function mapLeaseData(row) {
  return {
    locationCode: row['Location Code'],
    realPropertyAssetName: row['Real Property Asset Name'],
    installationName: row['Installation Name'],
    federalLeasedCode: row['Federal Leased Code'],
    gsaRegion: row['GSA Region'],
    streetAddress: row['Street Address'],
    city: row['City'],
    state: row['State'],
    zipCode: row['Zip Code'],
    latitude: row['Latitude'] ? String(row['Latitude']) : null,
    longitude: row['Longitude'] ? String(row['Longitude']) : null,
    buildingRentableSquareFeet: row['Building Rentable Square Feet'] ? String(row['Building Rentable Square Feet']) : null,
    availableSquareFeet: parseAvailableSquareFeet(row['Available Square Feet']),
    constructionDate: row['Construction Date'],
    congressionalDistrict: row['Congressional District'],
    congressionalDistrictRepresentative: row['Congressional District Representative'],
    leaseNumber: row['Lease Number'],
    leaseEffectiveDate: convertExcelDate(row['Lease Effective Date']),
    leaseExpirationDate: convertExcelDate(row['Lease Expiration Date']),
    realPropertyAssetType: row['Real Property Asset type'],
    cleanedBuildingName: row.cleanedBuildingName,
    addressInName: row.addressInName,
  };
}

// Check if a lease already exists in the database by street address
async function findExistingLease(leaseData) {
  const existing = await db.select()
    .from(schema.leases)
    .where(eq(schema.leases.streetAddress, leaseData.streetAddress));
  
  return existing.length > 0 ? existing[0] : null;
}

// Convert building data to lease format
function convertBuildingToLease(buildingRow) {
  return {
    locationCode: buildingRow['Location Code'],
    realPropertyAssetName: buildingRow['Real Property Asset Name'],
    installationName: buildingRow['Installation Name'],
    federalLeasedCode: null, // Not available in building data
    gsaRegion: buildingRow['GSA Region'],
    streetAddress: buildingRow['Street Address'],
    city: buildingRow['City'],
    state: buildingRow['State'],
    zipCode: buildingRow['Zip Code'],
    latitude: buildingRow['Latitude'] ? String(buildingRow['Latitude']) : null,
    longitude: buildingRow['Longitude'] ? String(buildingRow['Longitude']) : null,
    buildingRentableSquareFeet: buildingRow['Building Rentable Square Feet'] ? String(buildingRow['Building Rentable Square Feet']) : null,
    availableSquareFeet: parseAvailableSquareFeet(buildingRow['Available Square Feet']),
    constructionDate: buildingRow['Construction Date'],
    congressionalDistrict: buildingRow['Congressional District'],
    congressionalDistrictRepresentative: buildingRow['Congressional District Representative Name'],
    leaseNumber: null, // Not available in building data
    leaseEffectiveDate: null, // Not available in building data  
    leaseExpirationDate: null, // Not available in building data
    realPropertyAssetType: buildingRow['Real Property Asset Type'],
    cleanedBuildingName: buildingRow.cleanedBuildingName,
    addressInName: buildingRow.addressInName,
  };
}

// Import buildings data - ONLY F (owned) buildings
async function importBuildings() {
  
  const rawData = readExcelFile('2025-5-23-iolp-buildings.xlsx');
  
  const processedData = rawData.map(processRowData);
  
  // Separate by ownership status
  const ownedBuildings = processedData.filter(row => 
    row['Owned or Leased'] && row['Owned or Leased'] === 'F'
  );
  const leasedBuildings = processedData.filter(row => 
    row['Owned or Leased'] && row['Owned or Leased'] === 'L'
  );
  
  // Clear existing tables
  await db.delete(schema.owned);
  await db.delete(schema.leases);
  
  const afterDeleteOwned = await db.select({ count: count() }).from(schema.owned);
  const afterDeleteLeases = await db.select({ count: count() }).from(schema.leases);
  
  if (afterDeleteOwned[0].count > 0 || afterDeleteLeases[0].count > 0) {
    throw new Error(`Failed to clear tables! Owned: ${afterDeleteOwned[0].count}, Leases: ${afterDeleteLeases[0].count}`);
  }
  
  // Import ONLY owned buildings (F) to owned table
  if (ownedBuildings.length > 0) {
    const ownedMappedData = ownedBuildings.map(mapBuildingData);
    
    const batchSize = 100;
    for (let i = 0; i < ownedMappedData.length; i += batchSize) {
      const batch = ownedMappedData.slice(i, i + batchSize);
      await db.insert(schema.owned).values(batch);
    }
  }
  
  // Import leased buildings (L) to LEASES table
  if (leasedBuildings.length > 0) {
    const leasedMappedData = leasedBuildings.map(convertBuildingToLease);
    
    const batchSize = 100;
    for (let i = 0; i < leasedMappedData.length; i += batchSize) {
      const batch = leasedMappedData.slice(i, i + batchSize);
      await db.insert(schema.leases).values(batch);
    }
  }
}

// Import leases data, checking for existing street addresses in leases table
async function importLeases() {  
  const rawData = readExcelFile('2025-5-23-iolp-leases.xlsx');  
  const processedData = rawData.map(processRowData);
  
  // Check which lease records have street addresses already in leases table
  let newLeaseRecords = [];
  let updatedLeaseRecords = [];
  let duplicateAddressCount = 0;
  
  for (const leaseRow of processedData) {
    const mappedLease = mapLeaseData(leaseRow);
    
    // Check if this street address already exists in leases table
    const existingLease = await findExistingLease(mappedLease);
    
    if (existingLease) {
      duplicateAddressCount++;
      // Update existing lease with lease-specific information
      updatedLeaseRecords.push({
        id: existingLease.id,
        leaseNumber: mappedLease.leaseNumber,
        leaseEffectiveDate: mappedLease.leaseEffectiveDate,
        leaseExpirationDate: mappedLease.leaseExpirationDate,
        federalLeasedCode: mappedLease.federalLeasedCode
      });
    } else {
      // This is a new street address
      newLeaseRecords.push(mappedLease);
    }
  }
  
  // Update existing lease records with lease-specific information
  if (updatedLeaseRecords.length > 0) {
    for (const updateData of updatedLeaseRecords) {
      await db.update(schema.leases)
        .set({
          leaseNumber: updateData.leaseNumber,
          leaseEffectiveDate: updateData.leaseEffectiveDate,
          leaseExpirationDate: updateData.leaseExpirationDate,
          federalLeasedCode: updateData.federalLeasedCode
        })
        .where(eq(schema.leases.id, updateData.id));
    }
  }
  
  // Import new lease records
  if (newLeaseRecords.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < newLeaseRecords.length; i += batchSize) {
      const batch = newLeaseRecords.slice(i, i + batchSize);
      await db.insert(schema.leases).values(batch);
    }
  }
  
  // Verify final counts
  const finalBuildingCount = await db.select({ count: count() }).from(schema.owned);
  const finalLeaseCount = await db.select({ count: count() }).from(schema.leases);
}

// Main import function
async function main() {
  try {
    await importBuildings(); // First: Buildings separated by f(owned)/l(leased)
    await importLeases();    // Second: Leases with duplicate checking    
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run if called directly or as main module
if (import.meta.url === `file://${process.argv[1]}` || 
    (process.argv[1] && process.argv[1].endsWith('import-data.js'))) {
  main();
} 