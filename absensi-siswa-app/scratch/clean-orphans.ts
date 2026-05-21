import { db } from "../src/db";
import { user } from "../src/db/auth-schema";
import { students, teachers } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function cleanOrphans() {
  const allStudents = await db.select().from(students);
  const allTeachers = await db.select().from(teachers);
  
  const validUserIds = [
    ...allStudents.map(s => s.userId),
    ...allTeachers.map(t => t.userId)
  ];
  
  const allUsers = await db.select().from(user);
  let deletedCount = 0;
  
  for (const u of allUsers) {
     if ((u.appRole === "SISWA" || u.appRole === "GURU") && !validUserIds.includes(u.id)) {
        console.log("Menghapus akun yatim piatu (orphaned user):", u.email);
        await db.delete(user).where(eq(user.id, u.id));
        deletedCount++;
     }
  }
  console.log(`Berhasil membersihkan ${deletedCount} akun yang nyangkut.`);
}

cleanOrphans().then(() => process.exit(0)).catch(console.error);
