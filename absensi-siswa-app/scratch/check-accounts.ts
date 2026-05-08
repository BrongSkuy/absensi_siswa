import { db } from "@/db";
import { students } from "@/db/schema";
import { user } from "@/db/auth-schema";

async function checkDoubleAccounts() {
  const allStudents = await db.select().from(students).all();
  console.log("Students in students table:");
  console.log(allStudents.map(s => ({ id: s.id, nis: s.nis, nama: s.namaLengkap })));

  const allUsers = await db.select().from(user).all();
  console.log("\nUsers in user table:");
  console.log(allUsers.map(u => ({ id: u.id, email: u.email, name: u.name, username: (u as any).username, role: (u as any).appRole })));
}

checkDoubleAccounts().catch(console.error);
