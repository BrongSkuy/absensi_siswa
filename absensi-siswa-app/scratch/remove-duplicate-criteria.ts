import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../src/db/schema";
import { inArray } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client, { schema });

async function main() {
  console.log("Fetching all criteria...");
  const allCriteria = await db.select().from(schema.spkCriteria);
  
  // Group by namaKriteria
  const grouped: Record<string, typeof allCriteria> = {};
  allCriteria.forEach(c => {
    if (!grouped[c.namaKriteria]) grouped[c.namaKriteria] = [];
    grouped[c.namaKriteria].push(c);
  });
  
  const idsToDelete: string[] = [];
  const idsToKeep: string[] = [];
  
  Object.keys(grouped).forEach(name => {
    const items = grouped[name];
    if (items.length > 1) {
      // Sort by some logic if needed, but we'll just keep the first one
      const keep = items[0];
      idsToKeep.push(keep.id);
      
      for (let i = 1; i < items.length; i++) {
        idsToDelete.push(items[i].id);
      }
    }
  });
  
  if (idsToDelete.length > 0) {
    console.log(`Found ${idsToDelete.length} duplicates. Deleting them...`);
    // Delete scores that reference the duplicate criteria first to avoid dangling records
    await db.delete(schema.spkScores).where(inArray(schema.spkScores.criteriaId, idsToDelete));
    await db.delete(schema.spkGradingCategories).where(inArray(schema.spkGradingCategories.criteriaId, idsToDelete));
    
    // Now delete the criteria
    await db.delete(schema.spkCriteria).where(inArray(schema.spkCriteria.id, idsToDelete));
    console.log("Successfully deleted duplicates!");
  } else {
    console.log("No duplicates found.");
  }
  
  process.exit(0);
}

main().catch(console.error);
