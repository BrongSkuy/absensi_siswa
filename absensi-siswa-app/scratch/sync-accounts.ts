import { db } from "../src/db";
import { user } from "../src/db/auth-schema";
import { students, teachers } from "../src/db/schema";
import { eq } from "drizzle-orm";

interface DBUser {
  id: string;
  name: string;
  email: string;
  username?: string | null;
}

async function syncAccounts() {
  const allStudents = await db.select().from(students).all();
  
  for (const s of allStudents) {
    const expectedEmail = `${s.nis}@siswa.sekolah.id`;
    
    // Find user by email or username (nis)
    const existingUsers = await db.select().from(user).all();
    const studentUser = existingUsers.find(u => u.email === expectedEmail || (u as DBUser).username === s.nis);
    
    if (studentUser) {
      // Update name and username if they don't match
      if (studentUser.name !== s.namaLengkap || (studentUser as DBUser).username !== s.nis) {
        await db.update(user)
          .set({ name: s.namaLengkap, username: s.nis, email: expectedEmail })
          .where(eq(user.id, studentUser.id))
          .run();
        console.log(`Updated student user: ${s.namaLengkap} (${s.nis})`);
      }
    } else {
      console.log(`Student user not found for: ${s.namaLengkap} (${s.nis})`);
    }
  }

  const allTeachers = await db.select().from(teachers).all();
  for (const t of allTeachers) {
    const expectedEmail = `${t.nip}@sekolah.id`;
    const existingUsers = await db.select().from(user).all();
    const teacherUser = existingUsers.find(u => u.email === expectedEmail || (u as DBUser).username === t.nip);
    
    if (teacherUser) {
      if (teacherUser.name !== t.namaLengkap || (teacherUser as DBUser).username !== t.nip) {
        await db.update(user)
          .set({ name: t.namaLengkap, username: t.nip, email: expectedEmail })
          .where(eq(user.id, teacherUser.id))
          .run();
        console.log(`Updated teacher user: ${t.namaLengkap} (${t.nip})`);
      }
    }
  }

  console.log("Sync complete!");
}

syncAccounts().catch(console.error);
