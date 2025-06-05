import { db, schema } from './src/db.js';
import { sql, count, eq } from 'drizzle-orm';

async function checkDuplicates() {
  try {
    // Check total count first
    const totalResult = await db.select({ count: count() }).from(schema.buildings);
    const totalBuildings = totalResult[0].count;
    
    // Check for specific address mentioned by user
    const specificResults = await db.select()
      .from(schema.buildings)
      .where(sql`${schema.buildings.streetAddress} ILIKE '%400 NATURAL BRIDGES DRIVE%' OR ${schema.buildings.realPropertyAssetName} ILIKE '%400 NATURAL BRIDGES DRIVE%'`);
    
    // Get all buildings and group by key fields to find duplicates
    const allBuildings = await db.select().from(schema.buildings);
    
    // Group by street address and asset name to find duplicates
    const groupedByAddress = {};
    allBuildings.forEach(building => {
      const key = `${building.streetAddress}|${building.realPropertyAssetName}`;
      if (!groupedByAddress[key]) {
        groupedByAddress[key] = [];
      }
      groupedByAddress[key].push(building);
    });
    
    // Find duplicates
    const duplicates = Object.entries(groupedByAddress)
      .filter(([key, buildings]) => buildings.length > 1)
      .slice(0, 10); // Top 10 duplicates
    
  } catch (error) {
    console.error('Error checking duplicates:', error);
  }
  
  process.exit(0);
}

checkDuplicates(); 