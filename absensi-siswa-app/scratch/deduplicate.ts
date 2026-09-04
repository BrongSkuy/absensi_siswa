/// <reference types="node" />
import "dotenv/config";
import { db } from "../src/db";
import { subjects } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  console.log("Reading subjects from database...");
  const allSubjects = await db.select().from(subjects).all();
  console.log(`Found ${allSubjects.length} total subject assignments.`);

  const seen = new Set<string>();
  const toDelete: string[] = [];

  for (const s of allSubjects) {
    const key = `${s.namaMapel || ""}|${s.teacherId || ""}|${s.kelasDiampu || ""}`;
    if (seen.has(key)) {
      toDelete.push(s.id);
    } else {
      seen.add(key);
    }
  }

  if (toDelete.length === 0) {
    console.log("No duplicates found in subjects table.");
    return;
  }

  console.log(`Found ${toDelete.length} duplicate subject rows. Deleting...`);

  let deletedCount = 0;
  for (const id of toDelete) {
    await db.delete(subjects).where(eq(subjects.id, id));
    deletedCount++;
  }

  console.log(`Successfully deleted ${deletedCount} duplicate subjects!`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error running deduplication:", err);
    process.exit(1);
  });
