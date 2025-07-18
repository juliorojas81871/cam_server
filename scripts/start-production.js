#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { db, schema } from '../src/db.js';
import { count } from 'drizzle-orm';

const execAsync = promisify(exec);

async function hasExistingData() {
  try {
    console.log('🔍 Checking if data already exists...');
    const ownedCount = await db.select({ count: count() }).from(schema.owned);
    console.log(`Found ${ownedCount[0].count} existing owned records`);
    return ownedCount[0].count > 0;
  } catch (error) {
    console.log('❌ Could not check existing data (tables might not exist yet):', error.message);
    return false;
  }
}

async function startProduction() {
  console.log('🚀 Starting production deployment...');
  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : 'NOT SET',
    DB_HOST: process.env.DB_HOST || 'NOT SET',
    PORT: process.env.PORT || 'NOT SET'
  });
  
  try {
    // Step 1: Setup database tables
    console.log('📦 Setting up database tables...');
    try {
      await execAsync('node setup-db.js');
      console.log('✅ Database setup completed successfully');
    } catch (setupError) {
      console.error('❌ Database setup failed:', setupError.message);
      throw setupError;
    }
    
    // Step 2: Check if data already exists
    const dataExists = await hasExistingData();
    
    if (!dataExists) {
      // Step 3: Check for Excel files and import if available
      const buildingsFile = '2025-5-23-iolp-buildings.xlsx';
      const leasesFile = '2025-5-23-iolp-leases.xlsx';
      
      console.log('📊 Checking for data files...');
      console.log(`Buildings file exists: ${fs.existsSync(buildingsFile)}`);
      console.log(`Leases file exists: ${fs.existsSync(leasesFile)}`);
      
      if (fs.existsSync(buildingsFile) && fs.existsSync(leasesFile)) {
          try {
              console.log('📈 Importing data from Excel files...');
              await execAsync('node scripts/import-data.js');
              console.log('✅ Data import completed successfully');
          } catch (importError) {
              console.error('❌ Data import failed:', importError.message);
              console.log('⚠️  Continuing without data import...');
          }
      } else {
          console.log('ℹ️  No Excel files found, skipping data import');
      }
    } else {
      console.log('✅ Data already exists, skipping import');
    }

    // Step 4: Start the server
    console.log('🌐 Starting web server...');
    const serverProcess = exec('node server.js');
    
    // Forward server output
    serverProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    serverProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    serverProcess.on('exit', (code) => {
      console.log(`Server process exited with code ${code}`);
      process.exit(code);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      serverProcess.kill('SIGTERM');
    });

    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down gracefully...');
      serverProcess.kill('SIGINT');
    });

  } catch (error) {
    console.error('💥 Startup failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    // If setup fails, still try to start the server
    console.log('⚠️  Attempting to start server despite setup failure...');
    try {
      const serverProcess = exec('node server.js');
      
      serverProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
      });
      
      serverProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
      });
      
      serverProcess.on('exit', (code) => {
        console.log(`Server process exited with code ${code}`);
        process.exit(code);
      });
      
    } catch (serverError) {
      console.error('💥 Server startup failed:', serverError.message);
      process.exit(1);
    }
  }
}

// Run the startup process
console.log('🎬 Production startup script initiated');
startProduction(); 