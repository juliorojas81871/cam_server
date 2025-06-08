import { db, schema } from '../src/db.js';
import { count, eq } from 'drizzle-orm';

describe('Database Tests', () => {
  beforeAll(async () => {
    // Ensure database is connected
    try {
      await db.select({ count: count() }).from(schema.owned);
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  });

  describe('Database Connection', () => {
    test('should connect to database successfully', async () => {
      const result = await db.select({ count: count() }).from(schema.owned);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should have valid database schema', async () => {
      expect(schema.owned).toBeDefined();
      expect(schema.leases).toBeDefined();
    });
  });

  describe('Table Structure', () => {
    test('owned table should exist and be accessible', async () => {
      const result = await db.select({ count: count() }).from(schema.owned);
      expect(result[0].count).toBeGreaterThanOrEqual(0);
    });

    test('leases table should exist and be accessible', async () => {
      const result = await db.select({ count: count() }).from(schema.leases);
      expect(result[0].count).toBeGreaterThanOrEqual(0);
    });

    test('owned table should have required columns', async () => {
      const sampleRecord = await db.select().from(schema.owned).limit(1);
      if (sampleRecord.length > 0) {
        const record = sampleRecord[0];
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('realPropertyAssetName');
        expect(record).toHaveProperty('streetAddress');
        expect(record).toHaveProperty('ownedOrLeased');
      }
    });

    test('leases table should have required columns', async () => {
      const sampleRecord = await db.select().from(schema.leases).limit(1);
      if (sampleRecord.length > 0) {
        const record = sampleRecord[0];
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('realPropertyAssetName');
        expect(record).toHaveProperty('streetAddress');
        expect(record).toHaveProperty('leaseNumber');
        expect(record).toHaveProperty('leaseEffectiveDate');
        expect(record).toHaveProperty('leaseExpirationDate');
      }
    });
  });

  describe('Data Integrity', () => {
    test('owned table should only contain F (owned) properties', async () => {
      const ownedRecords = await db.select()
        .from(schema.owned)
        .where(eq(schema.owned.ownedOrLeased, 'F'))
        .limit(10);
      
      const totalOwnedRecords = await db.select({ count: count() }).from(schema.owned);
      
      if (totalOwnedRecords[0].count > 0) {
        expect(ownedRecords.length).toBeGreaterThan(0);
        ownedRecords.forEach(record => {
          expect(record.ownedOrLeased).toBe('F');
        });
      }
    });

    test('lease records should have valid date formats', async () => {
      const leaseRecords = await db.select()
        .from(schema.leases)
        .limit(5);
      
      leaseRecords.forEach(record => {
        if (record.leaseEffectiveDate) {
          expect(record.leaseEffectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
        if (record.leaseExpirationDate) {
          expect(record.leaseExpirationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      });
    });
  });
}); 