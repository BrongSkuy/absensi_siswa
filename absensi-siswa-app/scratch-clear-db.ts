import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite);

console.log("Emptying database...");
sqlite.prepare("DELETE FROM attendance").run();
sqlite.prepare("DELETE FROM spk_scores").run();
sqlite.prepare("DELETE FROM teacher_subjects").run();
sqlite.prepare("DELETE FROM teacher_classes").run();
sqlite.prepare("DELETE FROM classes").run();
sqlite.prepare("DELETE FROM subjects").run();
sqlite.prepare("DELETE FROM spk_criteria").run();
sqlite.prepare("DELETE FROM academic_years").run();
sqlite.prepare("DELETE FROM students").run();
sqlite.prepare("DELETE FROM teachers").run();
sqlite.prepare("DELETE FROM session").run();
sqlite.prepare("DELETE FROM account").run();
sqlite.prepare("DELETE FROM user").run();
console.log("Emptied!");
sqlite.close();
