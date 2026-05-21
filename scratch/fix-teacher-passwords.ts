import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username, admin } from "better-auth/plugins";
import * as schema from "../src/db/schema";
import * as authSchema from "../src/db/auth-schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client, { schema: { ...schema, ...authSchema } });

const auth = betterAuth({
  baseURL: "http://localhost:3000",
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: { enabled: true, minPasswordLength: 4 },
  plugins: [username(), admin()],
});

async function main() {
  const allTeachers = await db.select().from(schema.teachers);
  
  for (const t of allTeachers) {
    if (!t.userId) continue;
    
    console.log(`Fixing password for ${t.nip}...`);
    
    // Create dummy user to get hash
    const dummyEmail = `dummy_${t.nip}@temp.com`;
    const dummyUser = await auth.api.signUpEmail({
      body: {
        email: dummyEmail,
        password: t.nip,
        name: "Dummy",
      },
      asResponse: false
    });
    
    // Get the account hash
    const [dummyAccount] = await db.select().from(authSchema.account).where(eq(authSchema.account.userId, dummyUser.user.id));
    
    if (dummyAccount && dummyAccount.password) {
      // Update the teacher's account
      await db.update(authSchema.account)
        .set({ password: dummyAccount.password })
        .where(eq(authSchema.account.userId, t.userId));
        
      console.log(`  -> Successfully updated password for ${t.nip} to their NIP.`);
    }
    
    // Clean up dummy
    await db.delete(authSchema.user).where(eq(authSchema.user.id, dummyUser.user.id));
  }
  
  console.log("Done fixing teacher passwords.");
  process.exit(0);
}
main();
