#!/usr/bin/env node

import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

console.log('🔍 DEBUGGING DATABASE CONNECTION');
console.log('Environment variables:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('  DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('  DB_PORT:', process.env.DB_PORT || 'NOT SET');
console.log('  DB_NAME:', process.env.DB_NAME || 'NOT SET');
console.log('  DB_USER:', process.env.DB_USER || 'NOT SET');
console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '[SET]' : 'NOT SET');

// Function to parse DATABASE_URL
function parseDatabaseUrl(url) {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port),
      database: parsed.pathname.substring(1),
      username: parsed.username,
      password: parsed.password,
    };
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error.message);
    return null;
  }
}

async function testDatabaseConnection() {
  try {
    let dbConfig;
    
    if (process.env.DATABASE_URL) {
      console.log('📦 Using DATABASE_URL');
      dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
      if (dbConfig) {
        console.log('  Parsed config:', {
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          username: dbConfig.username,
          password: '[HIDDEN]'
        });
      }
    } else {
      console.log('📦 Using individual environment variables');
      dbConfig = {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        database: process.env.DB_NAME,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      };
    }

    if (!dbConfig) {
      console.error('❌ Failed to get database configuration');
      return;
    }

    const connectionString = `postgres://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
    console.log('🔗 Connection string pattern:', connectionString.replace(/:([^:@]+)@/, ':***@'));
    
    const sql = postgres(connectionString);
    
    // Test basic connection
    console.log('🧪 Testing basic connection...');
    const result = await sql`SELECT 1 as test, current_database() as db_name, current_user as user_name`;
    console.log('✅ Connection successful!');
    console.log('  Database:', result[0].db_name);
    console.log('  User:', result[0].user_name);
    
    // Check if tables exist
    console.log('🧪 Checking for existing tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('owned', 'leases')
    `;
    
    console.log('📋 Existing tables:', tables.map(t => t.table_name));
    
    if (tables.length === 0) {
      console.log('⚠️  No tables found, attempting to create them...');
      
      // Try to create tables
      await sql`DROP TABLE IF EXISTS owned CASCADE`;
      await sql`DROP TABLE IF EXISTS leases CASCADE`;
      
      await sql`
        CREATE TABLE owned (
          id SERIAL PRIMARY KEY,
          location_code TEXT,
          real_property_asset_name TEXT,
          installation_name TEXT,
          owned_or_leased TEXT,
          gsa_region TEXT,
          street_address TEXT,
          city TEXT,
          state TEXT,
          zip_code TEXT,
          latitude NUMERIC,
          longitude NUMERIC,
          building_rentable_square_feet NUMERIC,
          available_square_feet NUMERIC(10,0) DEFAULT 0,
          construction_date TEXT,
          congressional_district TEXT,
          congressional_district_representative_name TEXT,
          building_status TEXT,
          real_property_asset_type TEXT,
          cleaned_building_name TEXT,
          address_in_name BOOLEAN DEFAULT FALSE
        )
      `;
      
      await sql`
        CREATE TABLE leases (
          id SERIAL PRIMARY KEY,
          location_code TEXT,
          real_property_asset_name TEXT,
          installation_name TEXT,
          federal_leased_code TEXT,
          gsa_region TEXT,
          street_address TEXT,
          city TEXT,
          state TEXT,
          zip_code TEXT,
          latitude NUMERIC,
          longitude NUMERIC,
          building_rentable_square_feet NUMERIC,
          available_square_feet NUMERIC(10,0) DEFAULT 0,
          construction_date TEXT,
          congressional_district TEXT,
          congressional_district_representative TEXT,
          lease_number TEXT,
          lease_effective_date TEXT,
          lease_expiration_date TEXT,
          real_property_asset_type TEXT,
          cleaned_building_name TEXT,
          address_in_name BOOLEAN DEFAULT FALSE
        )
      `;
      
      console.log('✅ Tables created successfully!');
    } else {
      console.log('✅ Tables already exist');
    }
    
    await sql.end();
    console.log('🏁 Database debug completed successfully');
    
  } catch (error) {
    console.error('❌ Database debug failed:', error.message);
    console.error('Full error:', error);
  }
}

testDatabaseConnection(); 