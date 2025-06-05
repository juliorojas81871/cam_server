import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db, schema } from './src/db.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes

// Get all buildings
app.get('/api/buildings', async (req, res) => {
  try {
    const buildings = await db.select().from(schema.buildings);
    
    res.json({
      data: buildings,
      count: buildings.length
    });
    
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all leases
app.get('/api/leases', async (req, res) => {
  try {
    const leases = await db.select().from(schema.leases);
    
    res.json({
      data: leases,
      count: leases.length
    });
    
  } catch (error) {
    console.error('Error fetching leases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`   GET /api/buildings - Get all buildings`);
  console.log(`   GET /api/leases - Get all leases`);
  console.log(`   GET /health - Health check`);
}); 