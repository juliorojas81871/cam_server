import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import * as schema from './schema.js';

// Load environment variables
dotenv.config();

let connectionString;

// Check if DATABASE_URL is provided (common in production/Fly.io)
if (process.env.DATABASE_URL) {
  connectionString = process.env.DATABASE_URL;
  console.log('Using DATABASE_URL for database connection');
} else {
  // Use individual environment variables
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'cam_database',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  };

  // Validate configuration
  const missingVars = [];
  if (!process.env.DB_HOST && !dbConfig.host) missingVars.push('DB_HOST');
  if (!process.env.DB_PORT && !dbConfig.port) missingVars.push('DB_PORT');
  if (!process.env.DB_NAME && !dbConfig.database) missingVars.push('DB_NAME');
  if (!process.env.DB_USER && !dbConfig.username) missingVars.push('DB_USER');
  if (!process.env.DB_PASSWORD && !dbConfig.password) missingVars.push('DB_PASSWORD');

  if (missingVars.length > 0) {
    console.warn('⚠️  Missing environment variables:', missingVars.join(', '));
    console.warn('Using default values. Please create a .env file with proper database credentials.');
    console.warn('Example .env file:');
    console.warn('DB_HOST=localhost');
    console.warn('DB_PORT=5432');
    console.warn('DB_NAME=cam_database');
    console.warn('DB_USER=postgres');
    console.warn('DB_PASSWORD=your_password');
    console.warn('');
    console.warn('Or use DATABASE_URL:');
    console.warn('DATABASE_URL=postgres://username:password@hostname:5432/database');
  }

  connectionString = `postgres://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
}

console.log('Database connection configured for:', connectionString.replace(/:([^:@]{1,}@)/, ':****@'));

// Create postgres connection
const client = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(client, { schema });

export { schema }; 