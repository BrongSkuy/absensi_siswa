import { db } from "../src/db";
import { subjects, teacherSubjects, teachers } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const allTeacherSubjects = await db.select().from(teacherSubjects);
  const existingMapelArray = await db.select().from(subjects);
  let createdCount = 0;

  for (const ts of allTeacherSubjects) {
     const exists = existingMapelArray.find(s => s.namaMapel === ts.namaMapel);
     if (!exists) {
        // find teacher name
        const teacherRec = await db.select().from(teachers).where(eq(teachers.id, ts.teacherId));
        const tName = teacherRec.length > 0 ? teacherRec[0].namaLengkap : "Unknown";
        
        await db.insert(subjects).values({
           namaMapel: ts.namaMapel,
           guruPengampu: tName
        });
        existingMapelArray.push({ id: "temp", namaMapel: ts.namaMapel, guruPengampu: tName });
        createdCount++;
     }
  }

  console.log(`Synced ${createdCount} missing subjects back to master table.`);
}

run().then(() => process.exit(0)).catch(console.error);
