#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

async function runWithTimeout(command, timeoutMs = 300000) { // 5 minute timeout
  return new Promise((resolve, reject) => {
    const process = exec(command);
    const timeout = setTimeout(() => {
      process.kill('SIGKILL');
      reject(new Error(`Command timed out after ${timeoutMs}ms: ${command}`));
    }, timeoutMs);

    process.on('exit', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}: ${command}`));
      }
    });

    process.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    process.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}

async function startProduction() {
  try {    
    // Step 1: Setup database tables
    await runWithTimeout('node setup-db.js', 30000); // Reduced to 30 seconds

    // Step 2: Check for Excel files and import if available
    const buildingsFile = '2025-5-23-iolp-buildings.xlsx';
    const leasesFile = '2025-5-23-iolp-leases.xlsx';
    
    if (fs.existsSync(buildingsFile) && fs.existsSync(leasesFile)) {
      try {
        await runWithTimeout('node scripts/import-data.js', 60000); // Reduced to 1 minute
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