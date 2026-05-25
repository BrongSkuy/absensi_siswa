import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

// ============================================================
// App-specific tables (Better Auth manages its own tables)
// ============================================================

// --- Students (profil siswa, linked to Better Auth user) ---
export const students = sqliteTable("students", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(), // FK to Better Auth 'user' table
  nis: text("nis").notNull().unique(),
  namaLengkap: text("nama_lengkap").notNull(),
  kelas: text("kelas").notNull(),
  angkatan: text("angkatan").notNull(),
  jenisKelamin: text("jenis_kelamin", { enum: ["L", "P"] }).notNull(),
  status: text("status", { enum: ["aktif", "nonaktif"] }).notNull().default("aktif"),
}, (table) => [
  index("students_user_idx").on(table.userId),
  index("students_kelas_idx").on(table.kelas),
]);

// --- Teachers (profil guru, linked to Better Auth user) ---
export const teachers = sqliteTable("teachers", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(), // FK to Better Auth 'user' table
  nip: text("nip").notNull().unique(),
  namaLengkap: text("nama_lengkap").notNull(),
  jenisKelamin: text("jenis_kelamin", { enum: ["L", "P"] }).notNull().default("L"),
  status: text("status", { enum: ["aktif", "nonaktif"] }).notNull().default("aktif"),
}, (table) => [
  index("teachers_user_idx").on(table.userId),
]);

// --- Kelas (daftar kelas) ---
export const classes = sqliteTable("classes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  namaKelas: text("nama_kelas").notNull().unique(),
  tingkat: text("tingkat").notNull(),
  waliKelas: text("wali_kelas"),
});

// --- Mata Pelajaran ---
export const subjects = sqliteTable("subjects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  namaMapel: text("nama_mapel").notNull(),
  teacherId: text("teacher_id"),
  kelasDiampu: text("kelas_diampu"),
});

// --- Attendance (absensi harian) ---
export const attendance = sqliteTable("attendance", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id").notNull(),
  tanggal: text("tanggal").notNull(), // ISO date string YYYY-MM-DD
  mapel: text("mapel").default("Umum"), // "Umum" if not mapped to specific subject
  status: text("status", { enum: ["Hadir", "Izin", "Sakit", "Alfa"] }).notNull(),
  recordedBy: text("recorded_by"), // userId of teacher who recorded
  periode: text("periode").notNull().default("2025/2026-Genap"), // Isolation tag
}, (table) => [
  index("att_student_idx").on(table.studentId),
  index("att_tanggal_idx").on(table.tanggal),
  index("att_periode_idx").on(table.periode),
]);

// --- SPK Criteria (kriteria + bobot) ---
export const spkCriteria = sqliteTable("spk_criteria", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  namaKriteria: text("nama_kriteria").notNull().unique(),
  bobot: real("bobot").notNull(), // percentage weight
  tipe: text("tipe", { enum: ["Otomatis", "Manual"] }).notNull(),
  deskripsi: text("deskripsi"),
});

// --- SPK Scores (nilai per kriteria per siswa) ---
export const spkScores = sqliteTable("spk_scores", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id").notNull(),
  criteriaId: text("criteria_id").notNull(),
  mapel: text("mapel"), // Null if it's a general criteria like Kedisiplinan
  nilai: real("nilai").notNull().default(0), // The calculated average
  details: text("details"), // JSON string e.g. '{"Tugas": 80, "UTS": 90}'
  periode: text("periode").notNull(), // e.g. "2025/2026-Genap"
}, (table) => [
  index("spk_scores_student_idx").on(table.studentId),
  index("spk_scores_periode_idx").on(table.periode),
]);

// --- Leaderboard Archives (arsip historis) ---
export const leaderboardArchives = sqliteTable("leaderboard_archives", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  namaFile: text("nama_file").notNull(),
  pathFile: text("path_file").notNull(),
  periode: text("periode").notNull(),
  uploadedAt: text("uploaded_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// --- Academic Years (tahun ajaran) ---
export const academicYears = sqliteTable("academic_years", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tahunAjaran: text("tahun_ajaran").notNull(), // e.g. "2025/2026"
  semester: text("semester", { enum: ["Ganjil", "Genap"] }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
});

// --- SPK Grading Categories (kategori nilai dinamis per mapel/kriteria) ---
export const spkGradingCategories = sqliteTable("spk_grading_categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  kelas: text("kelas").notNull(),
  mapel: text("mapel").notNull(),
  criteriaId: text("criteria_id").notNull(),
  periode: text("periode").notNull(),
  categories: text("categories").notNull(), // JSON string array, e.g., '["Tugas", "UTS", "Praktek"]'
});

// --- SPK Publish Status ---
export const spkPublishStatus = sqliteTable("spk_publish_status", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  periode: text("periode").notNull().unique(),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
  publishedAt: text("published_at"),
  publishedBy: text("published_by"),
});

// --- SPK Results (Cached Leaderboard) ---
export const spkResults = sqliteTable("spk_results", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id").notNull(),
  periode: text("periode").notNull(),
  kelas: text("kelas").notNull(),
  rank: integer("rank").notNull(),
  rawScore: real("raw_score").notNull(),
  persentase: real("persentase").notNull(),
  details: text("details"),
}, (table) => [
  index("spk_results_student_idx").on(table.studentId),
  index("spk_results_periode_idx").on(table.periode),
]);

// ============================================================
// Type exports
// ============================================================
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Teacher = typeof teachers.$inferSelect;
export type NewTeacher = typeof teachers.$inferInsert;
export type AttendanceRecord = typeof attendance.$inferSelect;
export type NewAttendanceRecord = typeof attendance.$inferInsert;
export type SpkCriteriaRow = typeof spkCriteria.$inferSelect;
export type SpkScoreRow = typeof spkScores.$inferSelect;
export type SpkGradingCategoryRow = typeof spkGradingCategories.$inferSelect;
export type SpkPublishStatusRow = typeof spkPublishStatus.$inferSelect;
export type SpkResultRow = typeof spkResults.$inferSelect;
