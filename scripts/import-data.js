import XLSX from 'xlsx';
import { db, schema } from '../src/db.js';
import { processRowData } from '../src/utils/data-cleansing.js';
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
  
  const excelEpoch = new Date(1899, 11, 30);
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

// Convert building data to lease format
function convertBuildingToLease(buildingRow) {
  return {
    locationCode: buildingRow['Location Code'],
    realPropertyAssetName: buildingRow['Real Property Asset Name'],
    installationName: buildingRow['Installation Name'],
    federalLeasedCode: null,
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
    leaseNumber: null, 
    leaseEffectiveDate: null,
    leaseExpirationDate: null,
    realPropertyAssetType: buildingRow['Real Property Asset Type'],
    cleanedBuildingName: buildingRow.cleanedBuildingName,
    addressInName: buildingRow.addressInName,
  };
}

// Import buildings data - ONLY F (owned) buildings
async function importBuildings() {
  console.log('📋 Processing buildings Excel file...');
  const rawData = readExcelFile('2025-5-23-iolp-buildings.xlsx');
  console.log(`📊 Processing ${rawData.length} building records...`);
  
  const processedData = rawData.map(processRowData);
  
  // Separate by ownership status
  const ownedBuildings = processedData.filter(row => 
    row['Owned or Leased'] && row['Owned or Leased'] === 'F'
  );
  const leasedBuildings = processedData.filter(row => 
    row['Owned or Leased'] && row['Owned or Leased'] === 'L'
  );
  
  console.log(`🏢 Found ${ownedBuildings.length} owned buildings and ${leasedBuildings.length} leased buildings`);
  
  // Clear existing tables
  console.log('🗑️  Clearing existing data...');
  await db.delete(schema.owned);
  await db.delete(schema.leases);
  
  const afterDeleteOwned = await db.select({ count: count() }).from(schema.owned);
  const afterDeleteLeases = await db.select({ count: count() }).from(schema.leases);
  
  if (afterDeleteOwned[0].count > 0 || afterDeleteLeases[0].count > 0) {
    throw new Error(`Failed to clear tables! Owned: ${afterDeleteOwned[0].count}, Leases: ${afterDeleteLeases[0].count}`);
  }
  
  // Import ONLY owned buildings (F) to owned table
  if (ownedBuildings.length > 0) {
    console.log(`💾 Importing ${ownedBuildings.length} owned buildings...`);
    const ownedMappedData = ownedBuildings.map(mapBuildingData);
    
    const batchSize = 500; // Increased batch size for better performance
    for (let i = 0; i < ownedMappedData.length; i += batchSize) {
      const batch = ownedMappedData.slice(i, i + batchSize);
      await db.insert(schema.owned).values(batch);
      console.log(`✅ Imported ${Math.min(i + batchSize, ownedMappedData.length)} / ${ownedMappedData.length} owned buildings`);
    }
  }
  
  // Import leased buildings (L) to LEASES table
  if (leasedBuildings.length > 0) {
    console.log(`💾 Importing ${leasedBuildings.length} leased buildings...`);
    const leasedMappedData = leasedBuildings.map(convertBuildingToLease);
    
    const batchSize = 500; // Increased batch size for better performance
    for (let i = 0; i < leasedMappedData.length; i += batchSize) {
      const batch = leasedMappedData.slice(i, i + batchSize);
      await db.insert(schema.leases).values(batch);
      console.log(`✅ Imported ${Math.min(i + batchSize, leasedMappedData.length)} / ${leasedMappedData.length} leased buildings`);
    }
  }
}

// Import leases data - OPTIMIZED for speed
async function importLeases() {  
  console.log('📋 Processing leases Excel file...');
  const rawData = readExcelFile('2025-5-23-iolp-leases.xlsx');  
  console.log(`📊 Processing ${rawData.length} lease records...`);
  
  const processedData = rawData.map(processRowData);
  
  // Get ALL existing lease addresses in one query (MUCH faster than individual queries)
  console.log('🔍 Fetching existing lease addresses...');
  const existingLeases = await db.select({
    id: schema.leases.id,
    streetAddress: schema.leases.streetAddress
  }).from(schema.leases);
  
  // Create a Map for O(1) lookup performance
  const existingAddressMap = new Map();
  existingLeases.forEach(lease => {
    existingAddressMap.set(lease.streetAddress, lease.id);
  });
  
  console.log(`📍 Found ${existingAddressMap.size} existing lease addresses`);
  
  // Process lease records efficiently
  let newLeaseRecords = [];
  let updatedLeaseRecords = [];
  let duplicateAddressCount = 0;
  
  for (const leaseRow of processedData) {
    const mappedLease = mapLeaseData(leaseRow);
    
    // Fast lookup using Map instead of database query
    const existingLeaseId = existingAddressMap.get(mappedLease.streetAddress);
    
    if (existingLeaseId) {
      duplicateAddressCount++;
      // Update existing lease with lease-specific information
      updatedLeaseRecords.push({
        id: existingLeaseId,
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
  
  console.log(`🔄 Found ${duplicateAddressCount} duplicate addresses to update`);
  console.log(`➕ Found ${newLeaseRecords.length} new lease records to insert`);
  
  // Update existing lease records with lease-specific information - in batches
  if (updatedLeaseRecords.length > 0) {
    console.log(`🔄 Updating ${updatedLeaseRecords.length} existing lease records...`);
    
    // Update in smaller batches to avoid timeouts
    const updateBatchSize = 100;
    for (let i = 0; i < updatedLeaseRecords.length; i += updateBatchSize) {
      const batch = updatedLeaseRecords.slice(i, i + updateBatchSize);
      
      // Process batch updates
      const updatePromises = batch.map(updateData =>
        db.update(schema.leases)
          .set({
            leaseNumber: updateData.leaseNumber,
            leaseEffectiveDate: updateData.leaseEffectiveDate,
            leaseExpirationDate: updateData.leaseExpirationDate,
            federalLeasedCode: updateData.federalLeasedCode
          })
          .where(eq(schema.leases.id, updateData.id))
      );
      
      await Promise.all(updatePromises);
      console.log(`✅ Updated ${Math.min(i + updateBatchSize, updatedLeaseRecords.length)} / ${updatedLeaseRecords.length} lease records`);
    }
  }
  
  // Import new lease records
  if (newLeaseRecords.length > 0) {
    console.log(`💾 Importing ${newLeaseRecords.length} new lease records...`);
    const batchSize = 500; // Increased batch size
    for (let i = 0; i < newLeaseRecords.length; i += batchSize) {
      const batch = newLeaseRecords.slice(i, i + batchSize);
      await db.insert(schema.leases).values(batch);
      console.log(`✅ Imported ${Math.min(i + batchSize, newLeaseRecords.length)} / ${newLeaseRecords.length} new lease records`);
    }
  }
}

// Main import function
async function main() {
  try {
    console.log('🚀 Starting data import process...');
    const startTime = Date.now();
    
    await importBuildings(); // First: Buildings separated by f(owned)/l(leased)
    console.log('✅ Buildings import completed');
    
    await importLeases();    // Second: Leases with duplicate checking    
    console.log('✅ Leases import completed');
    
    // Final count verification
    const ownedCount = await db.select({ count: count() }).from(schema.owned);
    const leasesCount = await db.select({ count: count() }).from(schema.leases);
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log(`🎉 Import completed successfully in ${duration} seconds!`);
    console.log(`📊 Final counts - Owned: ${ownedCount[0].count}, Leases: ${leasesCount[0].count}`);
    console.log(`📈 Total records: ${ownedCount[0].count + leasesCount[0].count}`);
    
  } catch (error) {
    console.error('💥 Import failed:', error);
    process.exit(1);
  }
  
  // Exit cleanly without trying to close connection
  process.exit(0);
}

// Run if called directly or as main module
if (import.meta.url === `file://${process.argv[1]}` || 
    (process.argv[1] && process.argv[1].endsWith('import-data.js'))) {
  main();
} 