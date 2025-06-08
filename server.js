import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db, schema } from './src/db.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection status
let dbConnected = false;

// Test database connection
async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    await db.select().from(schema.owned).limit(1);
    dbConnected = true;
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    dbConnected = false;
    return false;
  }
}

// Health check endpoint with database status
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbConnected ? 'connected' : 'disconnected'
  };

  // Test database connection for health check
  try {
    await db.select().from(schema.owned).limit(1);
    health.database = 'connected';
    res.json(health);
  } catch (error) {
    health.status = 'degraded';
    health.database = 'disconnected';
    health.error = error.message;
    res.status(503).json(health);
  }
});

// API Routes

// Get all owned properties
app.get('/api/owned', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.status(503).json({ 
        error: 'Database not available',
        message: 'Service temporarily unavailable'
      });
    }

    const owned = await db.select().from(schema.owned);
    
    res.json({
      data: owned,
      count: owned.length
    });
    
  } catch (error) {
    console.error('Error fetching owned properties:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all leases
app.get('/api/leases', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.status(503).json({ 
        error: 'Database not available',
        message: 'Service temporarily unavailable'
      });
    }

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

// Graceful shutdown handling for Fly.io
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server with better error handling
async function startServer() {
  try {
    console.log('Starting CAM Database Server...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Port:', PORT);
    
    // Test database connection (non-blocking)
    await testDatabaseConnection();
    
    // Start HTTP server - bind to 0.0.0.0 for Fly.io
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      console.log(`API endpoints:`);
      console.log(`   GET /api/owned - Get all owned properties`);
      console.log(`   GET /api/leases - Get all leases`);
      console.log(`   GET /health - Health check`);
      
      if (!dbConnected) {
        console.log('Warning: Database not connected. API endpoints will return 503.');
        console.log('Set environment variables: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
      }
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('Server error:', error);
      process.exit(1);
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
      console.log('Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer(); 