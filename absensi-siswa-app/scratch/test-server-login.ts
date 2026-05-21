import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import * as schema from "../src/db/schema";
import * as authSchema from "../src/db/auth-schema";
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
  emailAndPassword: { enabled: true },
  plugins: [username()],
});

async function main() {
  try {
    const result = await auth.api.signInUsername({
      body: {
        username: "199005202012",
        password: "guru1234",
      },
      asResponse: false
    });
    console.log("SUCCESS Login:", result.user);
  } catch (error) {
    const err = error as Record<string, unknown>;
    console.error("ERROR Login:", err?.body || err);
  }

  try {
    const result2 = await auth.api.signInUsername({
      body: {
        username: "199005202012",
        password: "199005202012",
      },
      asResponse: false
    });
    console.log("SUCCESS Login (nip as pass):", result2.user);
  } catch (error) {
    const err = error as Record<string, unknown>;
    console.error("ERROR Login (nip as pass):", err?.body || err);
  }
}
main();
