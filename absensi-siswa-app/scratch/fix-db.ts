import * as dotenv from "dotenv";
dotenv.config();
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { inArray } from "drizzle-orm";
import { user } from "../src/db/auth-schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client);

async function main() {
  console.log("Deleting broken users...");
  await db.delete(user).where(inArray(user.email, ['197601012005@sekolah.id', '2024001@siswa.sekolah.id']));
  console.log("Done.");
}
main().catch(console.error);
