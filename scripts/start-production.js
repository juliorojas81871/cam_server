#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

async function startProduction() {
  try {
    // Step 1: Setup database tables
    await execAsync('node setup-db.js');

    // Step 2: Import data from JSON files
    const dataDir = 'data';
    if (fs.existsSync(dataDir) && fs.existsSync(`${dataDir}/owned-properties.json`)) {
      await execAsync('node scripts/import-json-data.js');
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
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the startup process
startProduction(); 