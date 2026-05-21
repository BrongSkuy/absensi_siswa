import { db } from "../src/db/index";
import { students } from "../src/db/schema";
import { user } from "../src/db/auth-schema";

interface DBUser {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  appRole?: string | null;
}

async function checkDoubleAccounts() {
  const allStudents = await db.select().from(students).all();
  console.log("Students in students table:");
  console.log(allStudents.map(s => ({ id: s.id, nis: s.nis, nama: s.namaLengkap })));

  const allUsers = await db.select().from(user).all();
  console.log("\nUsers in user table:");
  console.log(allUsers.map(u => {
    const extUser = u as unknown as DBUser;
    return { 
      id: extUser.id, 
      email: extUser.email, 
      name: extUser.name, 
      username: extUser.username, 
      role: extUser.appRole 
    };
  }));
}

checkDoubleAccounts().catch(console.error);
