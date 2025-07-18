import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

// Validate configuration
const missingVars = [];
if (!process.env.DB_HOST) missingVars.push('DB_HOST');
if (!process.env.DB_PORT) missingVars.push('DB_PORT');
if (!process.env.DB_NAME) missingVars.push('DB_NAME');
if (!process.env.DB_USER) missingVars.push('DB_USER');
if (!process.env.DB_PASSWORD) missingVars.push('DB_PASSWORD');

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your environment configuration.');
  process.exit(1);
}


const connectionString = `postgres://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
const sql = postgres(connectionString);

async function createTables() {
  try {
    // Test connection first
    await sql`SELECT 1 as test`;
    
    // Drop existing tables
    await sql`DROP TABLE IF EXISTS owned CASCADE`;
    await sql`DROP TABLE IF EXISTS leases CASCADE`;
    
    // Create owned table
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
    
    // Create leases table
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
    
    
  } catch (error) {
    console.error('Error setting up database:', error.message);
    
    // Provide helpful error messages
    if (error.code === 'ENOTFOUND') {
      console.error('Database host not found. Check DB_HOST environment variable.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused. Check if database is running and DB_PORT is correct.');
    } else if (error.message.includes('authentication')) {
      console.error('Authentication failed. Check DB_USER and DB_PASSWORD.');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.error('Database does not exist. Check DB_NAME environment variable.');
    }
    
    console.error('Environment variables:');
    console.error(`   DB_HOST: ${process.env.DB_HOST || 'NOT SET'}`);
    console.error(`   DB_PORT: ${process.env.DB_PORT || 'NOT SET'}`);
    console.error(`   DB_NAME: ${process.env.DB_NAME || 'NOT SET'}`);
    console.error(`   DB_USER: ${process.env.DB_USER || 'NOT SET'}`);
    console.error(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '[SET]' : 'NOT SET'}`);
    
    process.exit(1);
  } finally {
    await sql.end();
  }
}

createTables(); 