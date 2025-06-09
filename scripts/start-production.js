#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

async function startProduction() {
  try {
    // Step 1: Setup database tables
    console.log('Setting up database...');
    await execAsync('node setup-db.js');

    // Step 2: Check for Excel files and import if available
    const buildingsFile = '2025-5-23-iolp-buildings.xlsx';
    const leasesFile = '2025-5-23-iolp-leases.xlsx';
    
    if (fs.existsSync(buildingsFile) && fs.existsSync(leasesFile)) {
      console.log('Excel files found, importing data...');
      await execAsync('node scripts/import-data.js');
      console.log('Data import completed');
    } else {
      console.log('Excel files not found - starting with empty database');
      console.log('To import data: upload Excel files and run "node scripts/import-data.js"');
    }

    // Step 3: Start the server
    console.log('Starting web server...');
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
      serverProcess.kill('SIGTERM');
    });

    process.on('SIGINT', () => {
      serverProcess.kill('SIGINT');
    });

  } catch (error) {
    console.error('Startup failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the startup process
startProduction(); 