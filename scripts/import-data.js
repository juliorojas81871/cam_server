import XLSX from 'xlsx';
import { db, schema } from '../src/db.js';
import { processRowData, logCleansingStats } from '../src/utils/data-cleansing.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { count } from 'drizzle-orm';

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

//  Map Excel columns to database fields for leases
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
    congressionalDistrict: row['Congressional District'],
    congressionalDistrictRepresentative: row['Congressional District Representative'],
    leaseNumber: row['Lease Number'],
    leaseEffectiveDate: row['Lease Effective Date'],
    leaseExpirationDate: row['Lease Expiration Date'],
    realPropertyAssetType: row['Real Property Asset type'],
    cleanedBuildingName: row.cleanedBuildingName,
    addressInName: row.addressInName,
  };
}

// Import buildings data
async function importBuildings() {
  
  const rawData = readExcelFile('2025-5-23-iolp-buildings.xlsx');
  
  const processedData = rawData.map(processRowData);
  logCleansingStats(rawData, processedData);
  
  const mappedData = processedData.map(mapBuildingData);
  
  // Verify table is empty
  const afterDeleteCount = await db.select({ count: count() }).from(schema.buildings);  
  if (afterDeleteCount[0].count > 0) {
    throw new Error(`Failed to clear buildings table! Still has ${afterDeleteCount[0].count} records`);
  }
  
  // Insert in batches
  const batchSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < mappedData.length; i += batchSize) {
    const batch = mappedData.slice(i, i + batchSize);
    await db.insert(schema.buildings).values(batch);
    inserted += batch.length;
  }
  
  // Verify final count
  const finalCount = await db.select({ count: count() }).from(schema.buildings);
  
  if (finalCount[0].count !== mappedData.length) {
    throw new Error(`Count mismatch! Expected ${mappedData.length}, got ${finalCount[0].count}`);
  }
}

//  Import leases data
async function importLeases() {
  
  const rawData = readExcelFile('2025-5-23-iolp-leases.xlsx');
  
  const processedData = rawData.map(processRowData);
  logCleansingStats(rawData, processedData);
  
  const mappedData = processedData.map(mapLeaseData);
  
  // Verify table is empty
  const afterDeleteCount = await db.select({ count: count() }).from(schema.leases);  
  if (afterDeleteCount[0].count > 0) {
    throw new Error(`Failed to clear leases table! Still has ${afterDeleteCount[0].count} records`);
  }
  
  // Insert in batches
  const batchSize = 100;
  let inserted = 0;
  
  
  for (let i = 0; i < mappedData.length; i += batchSize) {
    const batch = mappedData.slice(i, i + batchSize);
    await db.insert(schema.leases).values(batch);
    inserted += batch.length;
  }
  
  // Verify final count
  const finalCount = await db.select({ count: count() }).from(schema.leases);
  
  if (finalCount[0].count !== mappedData.length) {
    throw new Error(`Count mismatch! Expected ${mappedData.length}, got ${finalCount[0].count}`);
  }
}

// Main import function
async function main() {
  try {
    await importBuildings();
    await importLeases();    
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