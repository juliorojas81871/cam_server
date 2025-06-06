import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD ,
};

const connectionString = `postgres://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
const sql = postgres(connectionString);

async function createTables() {
  try {
    
    // Drop existing tables
    await sql`DROP TABLE IF EXISTS buildings CASCADE`;
    await sql`DROP TABLE IF EXISTS leases CASCADE`;
    
    // Create buildings table
    await sql`
      CREATE TABLE buildings (
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
    
    console.log('Tables created successfully!');
    
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

createTables(); 