/// <reference types="node" />
import { db } from "../src/db/index";
import { academicYears } from "../src/db/schema";
import { eq, desc } from "drizzle-orm";

async function fixDuplicateActiveYears() {
  console.log("Fetching academic years...");
  const years = await db.select().from(academicYears).orderBy(desc(academicYears.tahunAjaran)).all();
  console.log("Current data:", years);

  const activeYears = years.filter(y => y.isActive);
  
  if (activeYears.length > 1) {
    console.log(`Found ${activeYears.length} active years! Fixing...`);
    // Keep the first one active, set the rest to inactive
    const [keepActive, ...toDeactivate] = activeYears;
    
    for (const y of toDeactivate) {
      console.log(`Deactivating duplicate: ${y.tahunAjaran} - ${y.semester} (ID: ${y.id})`);
      await db.update(academicYears).set({ isActive: false }).where(eq(academicYears.id, y.id)).run();
    }
    
    // Check for exact duplicates (same tahunAjaran and semester)
    const seen = new Set<string>();
    const allYearsAfterDeactivation = await db.select().from(academicYears).all();
    
    for (const y of allYearsAfterDeactivation) {
      const key = `${y.tahunAjaran}-${y.semester}`;
      if (seen.has(key)) {
        console.log(`Found exact duplicate entry: ${key} (ID: ${y.id}). Deleting it...`);
        // If it's a duplicate and not the active one, delete it.
        if (!y.isActive) {
           await db.delete(academicYears).where(eq(academicYears.id, y.id)).run();
        }
      } else {
        seen.add(key);
      }
    }
    
    console.log("Fix complete!");
  } else {
    console.log("No duplicate active years found.");
  }
}

fixDuplicateActiveYears().then(() => process.exit(0)).catch(console.error);
