import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import * as schema from './schema.js';

// Load environment variables
dotenv.config();

// Function to parse DATABASE_URL
function parseDatabaseUrl(url) {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port),
      database: parsed.pathname.substring(1), // Remove leading slash
      username: parsed.username,
      password: parsed.password,
    };
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error.message);
    return null;
  }
}

// Database configuration with fallback values
let dbConfig;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL if available (Render/production)
  console.log('Using DATABASE_URL for database connection');
  dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
  
  if (!dbConfig) {
    console.error('Failed to parse DATABASE_URL');
    process.exit(1);
  }
} else {
  // Use individual environment variables (local development)
  console.log('Using individual environment variables for database connection');
  dbConfig = {
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
    console.warn('⚠️  Missing environment variables:', missingVars.join(', '));
    console.warn('Using default values. Please create a .env file with proper database credentials.');
    console.warn('Example .env file:');
    console.warn('DB_HOST=localhost');
    console.warn('DB_PORT=5432');
    console.warn('DB_NAME=cam_database');
    console.warn('DB_USER=postgres');
    console.warn('DB_PASSWORD=your_password');
  }
}

const connectionString = `postgres://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;

// Create postgres connection
const client = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(client, { schema });

export { schema }; 