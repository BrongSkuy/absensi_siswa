/// <reference types="node" />
import { db } from "../src/db";
import { user } from "../src/db/auth-schema";
import { eq } from "drizzle-orm";

async function check() {
  const users = await db.select().from(user).where(eq(user.appRole, "GURU"));
  console.log("GURU accounts:", users.map(u => ({ username: u.username, name: u.name, id: u.id })));
}

check().then(() => process.exit(0)).catch(console.error);
