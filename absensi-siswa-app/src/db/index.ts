import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import * as authSchema from "./auth-schema";

const sqlite = new Database("sqlite.db");

// Enable WAL mode for better concurrent read performance
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, {
  schema: { ...schema, ...authSchema },
});
