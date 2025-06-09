#!/usr/bin/env node

import fs from 'fs';
import { db } from '../src/db.js';
import { owned, leases } from '../src/schema.js';

async function importJsonData() {
  try {
    // Check if JSON files exist
    const ownedFile = 'data/owned-properties.json';
    const leasedFile = 'data/leased-properties.json';
    const leasesFile = 'data/lease-records.json';
    
    if (!fs.existsSync(ownedFile) || !fs.existsSync(leasedFile) || !fs.existsSync(leasesFile)) {
      console.log('❌ JSON data files not found in data/ directory');
      console.log('Run "node scripts/export-data-to-json.js" first to generate JSON files');
      return;
    }
    
    console.log('📖 Reading JSON data files...');
    
    // Read JSON data
    const ownedData = JSON.parse(fs.readFileSync(ownedFile, 'utf8'));
    const leasedData = JSON.parse(fs.readFileSync(leasedFile, 'utf8'));
    const leasesData = JSON.parse(fs.readFileSync(leasesFile, 'utf8'));
    
    console.log(`📊 Data loaded - Owned: ${ownedData.length}, Leased: ${leasedData.length}, Lease Records: ${leasesData.length}`);
    
    // Clear existing data
    console.log('🗑️ Clearing existing data...');
    await db.delete(owned);
    await db.delete(leases);
    
    // Import owned properties
    if (ownedData.length > 0) {
      console.log(`📥 Importing ${ownedData.length} owned properties...`);
      
      // Insert in batches to avoid memory issues
      const batchSize = 100;
      for (let i = 0; i < ownedData.length; i += batchSize) {
        const batch = ownedData.slice(i, i + batchSize);
        await db.insert(owned).values(batch);
      }
    }
    
    // Import lease records
    if (leasesData.length > 0) {
      console.log(`📥 Importing ${leasesData.length} lease records...`);
      
      // Insert in batches
      const batchSize = 100;
      for (let i = 0; i < leasesData.length; i += batchSize) {
        const batch = leasesData.slice(i, i + batchSize);
        await db.insert(leases).values(batch);
      }
    }
    
    console.log('✅ Data import completed successfully!');
    console.log(`   - Owned properties: ${ownedData.length}`);
    console.log(`   - Lease records: ${leasesData.length}`);
    console.log(`   - Total records: ${ownedData.length + leasesData.length}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

importJsonData(); 