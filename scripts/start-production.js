#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

async function startProduction() {
  try {
    // Step 1: Setup database tables
    await execAsync('node setup-db.js');

    // Step 2: Import data if Excel files exist
    const buildingsFile = '2025-5-23-iolp-buildings.xlsx';
    const leasesFile = '2025-5-23-iolp-leases.xlsx';
    
    if (fs.existsSync(buildingsFile) && fs.existsSync(leasesFile)) {
      await execAsync('node scripts/import-data.js');
    }

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
    console.error('Startup failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the startup process
startProduction(); 