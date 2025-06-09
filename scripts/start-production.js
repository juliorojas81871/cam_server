#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

async function startProduction() {
  try {
    // Step 1: Setup database tables
    await execAsync('node setup-db.js');

    // Step 2: Check for Excel files and import if available
    const buildingsFile = '2025-5-23-iolp-buildings.xlsx';
    const leasesFile = '2025-5-23-iolp-leases.xlsx';
    
    if (fs.existsSync(buildingsFile) && fs.existsSync(leasesFile)) {
      try {
        await execAsync('node scripts/import-data.js');
      } catch (importError) {
        console.error('Data import failed:', importError.message);
      }
    } 

    // Step 3: Start the server
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
    
    // If setup fails, still try to start the server
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
      console.error('Server startup failed:', serverError.message);
      process.exit(1);
    }
  }
}

// Run the startup process
startProduction(); 