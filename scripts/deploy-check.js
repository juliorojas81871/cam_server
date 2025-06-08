#!/usr/bin/env node

/**
 * Deployment Check Script
 * Verifies that the application is ready for deployment to Render
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Checking deployment readiness...\n');

let hasErrors = false;

// Check required files
const requiredFiles = [
  'package.json',
  'package-lock.json',
  'server.js',
  'src/db.js',
  'src/schema.js',
  'setup-db.js',
  'render.yaml'
];

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) hasErrors = true;
});

// Check package.json scripts
console.log('\n📦 Checking package.json scripts:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['start', 'test'];

requiredScripts.forEach(script => {
  const exists = packageJson.scripts && packageJson.scripts[script];
  console.log(`   ${exists ? '✅' : '❌'} ${script}: ${exists || 'missing'}`);
  if (!exists) hasErrors = true;
});

// Check for environment variable usage
console.log('\n🔧 Checking environment configuration:');
const serverContent = fs.readFileSync('server.js', 'utf8');
const hasPortConfig = serverContent.includes('process.env.PORT');
console.log(`   ${hasPortConfig ? '✅' : '❌'} PORT environment variable used`);
if (!hasPortConfig) hasErrors = true;

const dbContent = fs.readFileSync('src/db.js', 'utf8');
const hasDbConfig = dbContent.includes('process.env.DB_');
console.log(`   ${hasDbConfig ? '✅' : '❌'} Database environment variables used`);
if (!hasDbConfig) hasErrors = true;

// Check for health endpoint
console.log('\n💚 Checking health endpoint:');
const hasHealthEndpoint = serverContent.includes('/health');
console.log(`   ${hasHealthEndpoint ? '✅' : '❌'} Health endpoint configured`);
if (!hasHealthEndpoint) hasErrors = true;

// Check render.yaml configuration
console.log('\n☁️  Checking Render configuration:');
try {
  const renderConfig = fs.readFileSync('render.yaml', 'utf8');
  const hasService = renderConfig.includes('type: pserv');
  const hasDatabase = renderConfig.includes('databases:');
  console.log(`   ${hasService ? '✅' : '❌'} Web service configured`);
  console.log(`   ${hasDatabase ? '✅' : '❌'} Database configured`);
  if (!hasService || !hasDatabase) hasErrors = true;
} catch (error) {
  console.log('   ❌ render.yaml not found or invalid');
  hasErrors = true;
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Deployment check FAILED');
  console.log('Please fix the issues above before deploying to Render.');
  process.exit(1);
} else {
  console.log('✅ Deployment check PASSED');
  console.log('Your application is ready for Render deployment!');
  console.log('\nNext steps:');
  console.log('1. Push your code to GitHub');
  console.log('2. Connect your repository to Render');
  console.log('3. Deploy using the render.yaml blueprint');
  console.log('\nSee DEPLOYMENT.md for detailed instructions.');
} 