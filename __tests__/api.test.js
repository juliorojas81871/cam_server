import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { db, schema } from '../src/db.js';

// Create test app instance
const createTestApp = () => {
  const app = express();
  
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Get all owned properties
  app.get('/api/owned', async (req, res) => {
    try {
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

  return app;
};

describe('API Endpoints', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Health Check', () => {
    test('GET /health should return ok status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    test('GET /health should return valid timestamp', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });
  });

  describe('Owned Properties API', () => {
    test('GET /api/owned should return owned properties', async () => {
      const response = await request(app)
        .get('/api/owned')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(typeof response.body.count).toBe('number');
    });

    test('GET /api/owned should return valid data structure', async () => {
      const response = await request(app)
        .get('/api/owned')
        .expect(200);

      if (response.body.data.length > 0) {
        const firstRecord = response.body.data[0];
        expect(firstRecord).toHaveProperty('id');
        expect(firstRecord).toHaveProperty('realPropertyAssetName');
        expect(firstRecord).toHaveProperty('streetAddress');
      }
    });

    test('GET /api/owned count should match data length', async () => {
      const response = await request(app)
        .get('/api/owned')
        .expect(200);

      expect(response.body.count).toBe(response.body.data.length);
    });
  });

  describe('Leases API', () => {
    test('GET /api/leases should return lease data', async () => {
      const response = await request(app)
        .get('/api/leases')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(typeof response.body.count).toBe('number');
    });

    test('GET /api/leases should return valid lease structure', async () => {
      const response = await request(app)
        .get('/api/leases')
        .expect(200);

      if (response.body.data.length > 0) {
        const firstRecord = response.body.data[0];
        expect(firstRecord).toHaveProperty('id');
        expect(firstRecord).toHaveProperty('realPropertyAssetName');
        expect(firstRecord).toHaveProperty('streetAddress');
      }
    });

    test('GET /api/leases count should match data length', async () => {
      const response = await request(app)
        .get('/api/leases')
        .expect(200);

      expect(response.body.count).toBe(response.body.data.length);
    });
  });

  describe('Error Handling', () => {
    test('GET /non-existent-endpoint should return 404', async () => {
      await request(app)
        .get('/non-existent-endpoint')
        .expect(404);
    });

    test('Invalid API endpoints should return 404', async () => {
      await request(app)
        .get('/api/invalid')
        .expect(404);
    });
  });

  describe('Response Headers', () => {
    test('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    test('should return JSON content type', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
}); 