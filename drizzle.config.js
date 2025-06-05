import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.js',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
}); 