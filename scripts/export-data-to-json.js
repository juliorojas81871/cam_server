#!/usr/bin/env node

import XLSX from 'xlsx';
import fs from 'fs';
import { cleanBuildingName } from '../src/utils/data-cleansing.js';

function convertExcelDate(serial) {
  if (!serial || typeof serial !== 'number') return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  
  const year = date_info.getFullYear();
  const month = String(date_info.getMonth() + 1).padStart(2, '0');
  const day = String(date_info.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

async function exportDataToJson() {
  try {
    console.log('Reading Excel files...');
    
    // Read Buildings Excel
    const buildingsWorkbook = XLSX.readFile('2025-5-23-iolp-buildings.xlsx');
    const buildingsSheet = buildingsWorkbook.Sheets[buildingsWorkbook.SheetNames[0]];
    const buildingsData = XLSX.utils.sheet_to_json(buildingsSheet);
    
    // Read Leases Excel
    const leasesWorkbook = XLSX.readFile('2025-5-23-iolp-leases.xlsx');
    const leasesSheet = leasesWorkbook.Sheets[leasesWorkbook.SheetNames[0]];
    const leasesData = XLSX.utils.sheet_to_json(leasesSheet);
    
    console.log(`Processing ${buildingsData.length} building records...`);
    
    // Process buildings data
    const ownedProperties = [];
    const leasedProperties = [];
    
    // Separate owned vs leased from buildings file
    for (const row of buildingsData) {
      const ownership = row['Owned or Leased'];
      const cleanedName = cleanBuildingName(row['Real Property Asset Name'] || '');
      
      const property = {
        realPropertyName: cleanedName,
        streetAddress: row['Street Address'] || '',
        city: row['City'] || '',
        state: row['State'] || '',
        zipCode: row['Zip Code'] || '',
        congressionalDistrict: row['Congressional District'] || '',
        ownership: ownership
      };
      
      if (ownership === 'F') {
        ownedProperties.push(property);
      } else if (ownership === 'L') {
        leasedProperties.push(property);
      }
    }
    
    console.log(`Processing ${leasesData.length} lease records...`);
    
    // Process leases data
    const leaseRecords = [];
    for (const row of leasesData) {
      const cleanedName = cleanBuildingName(row['Real Property Asset Name'] || '');
      
      const lease = {
        realPropertyName: cleanedName,
        streetAddress: row['Street Address'] || '',
        city: row['City'] || '',
        state: row['State'] || '',
        zipCode: row['Zip Code'] || '',
        congressionalDistrict: row['Congressional District'] || '',
        leaseNumber: row['Lease Number'] || '',
        leaseEffectiveDate: convertExcelDate(row['Lease Effective Date']),
        leaseExpirationDate: convertExcelDate(row['Lease Expiration Date']),
        constructionDate: convertExcelDate(row['Construction Date'])
      };
      
      leaseRecords.push(lease);
    }
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync('data')) {
      fs.mkdirSync('data');
    }
    
    // Write JSON files
    fs.writeFileSync('data/owned-properties.json', JSON.stringify(ownedProperties, null, 2));
    fs.writeFileSync('data/leased-properties.json', JSON.stringify(leasedProperties, null, 2));
    fs.writeFileSync('data/lease-records.json', JSON.stringify(leaseRecords, null, 2));
    
    console.log('✅ Data exported successfully!');
    console.log(`   - Owned properties: ${ownedProperties.length}`);
    console.log(`   - Leased properties: ${leasedProperties.length}`);
    console.log(`   - Lease records: ${leaseRecords.length}`);
    console.log('   - Files saved in data/ directory');
    
  } catch (error) {
    console.error('❌ Export failed:', error.message);
    process.exit(1);
  }
}

exportDataToJson(); 