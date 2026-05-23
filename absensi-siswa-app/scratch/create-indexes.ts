import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config();

async function createIndexes() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const indexes = [
    "CREATE INDEX IF NOT EXISTS att_student_idx ON attendance(student_id)",
    "CREATE INDEX IF NOT EXISTS att_tanggal_idx ON attendance(tanggal)",
    "CREATE INDEX IF NOT EXISTS att_periode_idx ON attendance(periode)",
    "CREATE INDEX IF NOT EXISTS spk_scores_student_idx ON spk_scores(student_id)",
    "CREATE INDEX IF NOT EXISTS spk_scores_periode_idx ON spk_scores(periode)",
    "CREATE INDEX IF NOT EXISTS spk_results_student_idx ON spk_results(student_id)",
    "CREATE INDEX IF NOT EXISTS spk_results_periode_idx ON spk_results(periode)",
  ];

  for (const sql of indexes) {
    try {
      await client.execute(sql);
      console.log(`✅ ${sql.split(" ON ")[1]}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌ ${sql.split(" ON ")[1]}: ${msg}`);
    }
  }

  console.log("\n🎉 Selesai membuat indeks database!");
}

createIndexes();
