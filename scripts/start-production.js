#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

// Add timeout wrapper
function withTimeout(promise, timeoutMs, operation) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

async function startProduction() {
  try {
    console.log('🚀 Starting CAM server production deployment...');
    
    // Check environment variables
    console.log('📋 Environment check:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`   PORT: ${process.env.PORT || 'not set'}`);
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set. Please configure it in Render dashboard.');
    }

    // Step 1: Setup database tables (with shorter timeout first)
    console.log('🗄️  Setting up database tables...');
    await withTimeout(execAsync('node setup-db.js'), 30000, 'Database setup'); // Reduced to 30 seconds
    console.log('✅ Database setup completed');

    // Step 2: Check for Excel files
    const buildingsFile = '2025-5-23-iolp-buildings.xlsx';
    const leasesFile = '2025-5-23-iolp-leases.xlsx';
    
    console.log('📊 Checking for Excel files...');
    console.log(`   Buildings file: ${fs.existsSync(buildingsFile) ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`   Leases file: ${fs.existsSync(leasesFile) ? 'FOUND' : 'NOT FOUND'}`);
    
    if (fs.existsSync(buildingsFile) && fs.existsSync(leasesFile)) {
      console.log('📥 Starting data import...');
      await withTimeout(execAsync('node scripts/import-data.js'), 180000, 'Data import'); // 3 minutes for import
      console.log('✅ Data import completed');
    } else {
      console.log('⚠️  Excel files not found - starting with empty database');
    }

    // Step 3: Start the server
    console.log('🌐 Starting web server...');
    const serverProcess = exec('node server.js');
    
    let serverStarted = false;
    
    // Forward server output
    serverProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
      if (data.includes('Server running')) {
        serverStarted = true;
        console.log('✅ Server started successfully');
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    serverProcess.on('exit', (code) => {
      if (!serverStarted) {
        console.error(`❌ Server failed to start (exit code: ${code})`);
      }
      process.exit(code);
    });

    // Server startup timeout
    setTimeout(() => {
      if (!serverStarted) {
        console.error('❌ Server startup timeout - killing process');
        serverProcess.kill('SIGTERM');
      }
    }, 30000); // 30 second server startup timeout

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      serverProcess.kill('SIGTERM');
    });

    process.on('SIGINT', () => {
      serverProcess.kill('SIGINT');
    });

  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    
    if (error.message.includes('DATABASE_URL')) {
      console.error('💡 Solution: Set DATABASE_URL in your Render dashboard');
      console.error('   Example: postgresql://user:pass@host:port/database');
    } else if (error.message.includes('Database setup timed out')) {
      console.error('💡 Database connection issue. Check:');
      console.error('   1. DATABASE_URL format is correct');
      console.error('   2. Database server is accessible');
      console.error('   3. Database credentials are valid');
    } else if (error.message.includes('Data import timed out')) {
      console.error('💡 Data import is taking too long');
      console.error('   Starting server without data import...');
      
      // Try starting server anyway
      try {
        console.log('🔄 Attempting to start server without data...');
        const serverProcess = exec('node server.js');
        
        serverProcess.stdout.on('data', (data) => {
          process.stdout.write(data);
        });
        
        serverProcess.stderr.on('data', (data) => {
          process.stderr.write(data);
        });
        
        return; // Don't exit, let server run
      } catch (serverError) {
        console.error('❌ Failed to start server:', serverError.message);
      }
    }
    
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the startup process
startProduction(); 