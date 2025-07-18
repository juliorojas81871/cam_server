#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { db, schema } from '../src/db.js';
import { count } from 'drizzle-orm';

const execAsync = promisify(exec);

async function hasExistingData() {
  try {
    const ownedCount = await db.select({ count: count() }).from(schema.owned);
    return ownedCount[0].count > 0;
  } catch (error) {
    console.log('Unable to check existing data (tables may not exist yet):', error.message);
    return false;
  }
}

async function startProduction() {
  console.log('🚀 Starting production deployment...');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Database URL set:', !!process.env.DATABASE_URL);
  
  try {
    // Step 1: Check if data already exists
    // const dataExists = await hasExistingData();
    // if (!dataExists) {

        // Step 2: Setup database tables
        console.log('📦 Setting up database tables...');
        try {
          const { stdout, stderr } = await execAsync('node setup-db.js');
          console.log('Setup output:', stdout);
          if (stderr) console.error('Setup warnings:', stderr);
          console.log('✅ Database setup completed successfully!');
        } catch (setupError) {
          console.error('❌ Database setup failed:', setupError.message);
          if (setupError.stdout) console.log('Setup stdout:', setupError.stdout);
          if (setupError.stderr) console.error('Setup stderr:', setupError.stderr);
          throw setupError;
        }
        
        // Step 3: Check for Excel files and import if available
        const buildingsFile = '2025-5-23-iolp-buildings.xlsx';
        const leasesFile = '2025-5-23-iolp-leases.xlsx';
        
        if (fs.existsSync(buildingsFile) && fs.existsSync(leasesFile)) {
            console.log('📋 Excel files found, importing data...');
            try {
                const { stdout, stderr } = await execAsync('node scripts/import-data.js');
                console.log('Import output:', stdout);
                if (stderr) console.error('Import warnings:', stderr);
                console.log('✅ Data import completed successfully!');
            } catch (importError) {
                console.error('❌ Data import failed:', importError.message);
                if (importError.stdout) console.log('Import stdout:', importError.stdout);
                if (importError.stderr) console.error('Import stderr:', importError.stderr);
            }
        } else {
            console.log('📋 Excel files not found, skipping data import');
        }
    // }

    // Step 4: Start the server
    console.log('🌐 Starting server...');
    const serverProcess = exec('node server.js');
    
    // Forward server output
    serverProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    serverProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    serverProcess.on('exit', (code) => {
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
    console.error('Full error:', error);
    
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
        process.exit(code);
      });
      
    } catch (serverError) {
      console.error('💥 Server startup failed:', serverError.message);
      process.exit(1);
    }
  }
}

// Run the startup process
startProduction(); 