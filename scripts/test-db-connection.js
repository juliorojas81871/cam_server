#!/usr/bin/env node

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  console.log('🔍 Testing database connection...');
  
  // Check environment
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }
  
  console.log('📋 Connection info:');
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
  
  let sql;
  try {
    // Create connection
    sql = postgres(process.env.DATABASE_URL);
    console.log('✅ Connection created');
    
    // Test simple query
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    console.log('✅ Database query successful');
    console.log(`   Time: ${result[0].current_time}`);
    console.log(`   PostgreSQL Version: ${result[0].pg_version.split(' ')[0]}`);
    
    // Test table creation (minimal)
    await sql`CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY)`;
    console.log('✅ Table creation test passed');
    
    // Clean up test table
    await sql`DROP TABLE IF EXISTS test_table`;
    console.log('✅ Cleanup completed');
    
    console.log('🎉 Database connection test PASSED');
    
  } catch (error) {
    console.error('❌ Database connection test FAILED');
    console.error('Error:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.error('💡 Database host not found - check DATABASE_URL host');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Connection refused - check DATABASE_URL port and host');
    } else if (error.message.includes('authentication')) {
      console.error('💡 Authentication failed - check DATABASE_URL credentials');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.error('💡 Database does not exist - check DATABASE_URL database name');
    }
    
    process.exit(1);
  } finally {
    if (sql) {
      await sql.end();
    }
  }
}

testConnection(); 