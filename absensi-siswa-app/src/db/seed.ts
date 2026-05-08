/**
 * Seed script — populates the database with default admin, teachers, students,
 * classes, subjects, and SPK criteria.
 *
 * Run: npx tsx src/db/seed.ts
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username, admin } from "better-auth/plugins";
import * as schema from "./schema";
import * as authSchema from "./auth-schema";

// --- Setup local DB + Auth instance for seeding ---
const sqlite = new Database("sqlite.db");
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema: { ...schema, ...authSchema } });

const auth = betterAuth({
  baseURL: "http://localhost:3000",
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: { enabled: true, minPasswordLength: 4 },
  plugins: [username(), admin({ defaultRole: "user" })],
  user: {
    additionalFields: {
      appRole: {
        type: "string",
        required: false,
        defaultValue: "SISWA",
        input: true,
      },
    },
  },
});

async function seed() {
  console.log("🌱 Seeding database...\n");

  // ==========================================
  // 1. Create Admin user (skip if already exists)
  // ==========================================
  console.log("👤 Creating Admin user...");
  try {
    const adminUser = await auth.api.signUpEmail({
      body: {
        email: "admin@sekolah.id",
        password: "admin123",
        name: "Administrator",
        username: "admin001",
        appRole: "ADMIN",
      },
    });
    sqlite.prepare("UPDATE user SET role = ? WHERE id = ?").run("admin", adminUser.user.id);
    console.log(`   ✅ Admin: admin001 / admin123`);
  } catch {
    console.log(`   ⏭️ Admin already exists, skipping...`);
  }

  // ==========================================
  // 2. Create Teacher users + profiles
  // ==========================================
  console.log("\n👨‍🏫 Creating Teacher users...");
  const teacherData = [
    { nip: "197601012005", nama: "Budi Santoso, S.Pd." },
    { nip: "198203152008", nama: "Siti Rahayu, M.Pd." },
    { nip: "199005202012", nama: "Ahmad Fauzi, S.Pd." },
  ];

  for (const t of teacherData) {
    try {
      const user = await auth.api.signUpEmail({
        body: {
          email: `${t.nip}@sekolah.id`,
          password: "guru1234",
          name: t.nama,
          username: t.nip,
          appRole: "GURU",
        },
      });

      db.insert(schema.teachers).values({
        userId: user.user.id,
        nip: t.nip,
        namaLengkap: t.nama,
        status: "aktif",
      }).run();

      console.log(`   ✅ Guru: ${t.nip} / guru1234 — ${t.nama}`);
    } catch {
      console.log(`   ⏭️ Guru ${t.nip} already exists, skipping...`);
    }
  }

  // ==========================================
  // 3. Create Classes
  // ==========================================
  console.log("\n🏫 Creating Classes...");
  const kelasData = [
    { namaKelas: "X-A", tingkat: "X", waliKelas: "Budi Santoso, S.Pd." },
    { namaKelas: "X-B", tingkat: "X", waliKelas: "Siti Rahayu, M.Pd." },
    { namaKelas: "XI-A", tingkat: "XI", waliKelas: "Ahmad Fauzi, S.Pd." },
  ];

  for (const k of kelasData) {
    try {
      db.insert(schema.classes).values(k).run();
      console.log(`   ✅ Kelas: ${k.namaKelas} — Wali: ${k.waliKelas}`);
    } catch {
      console.log(`   ⏭️ Kelas ${k.namaKelas} already exists, skipping...`);
    }
  }

  // ==========================================
  // 4. Teacher-Class assignments
  // ==========================================
  console.log("\n📋 Assigning teachers to classes...");
  const allTeachers = db.select().from(schema.teachers).all();
  const classAssignments = [
    { nip: "197601012005", kelas: "X-A" },
    { nip: "197601012005", kelas: "XI-A" },
    { nip: "198203152008", kelas: "X-B" },
    { nip: "198203152008", kelas: "XI-A" },
    { nip: "199005202012", kelas: "X-A" },
    { nip: "199005202012", kelas: "X-B" },
  ];

  for (const ca of classAssignments) {
    const teacher = allTeachers.find((t) => t.nip === ca.nip);
    if (teacher) {
      try {
        db.insert(schema.teacherClasses).values({
          teacherId: teacher.id,
          kelas: ca.kelas,
        }).run();
        console.log(`   ✅ ${ca.nip} → ${ca.kelas}`);
      } catch {
        console.log(`   ⏭️ ${ca.nip} → ${ca.kelas} already exists, skipping...`);
      }
    }
  }

  // ==========================================
  // 4b. Teacher-Subject assignments
  // ==========================================
  console.log("\n📋 Assigning teachers to subjects...");
  const subjectAssignments = [
    { nip: "197601012005", mapel: "Matematika" },
    { nip: "197601012005", mapel: "Fisika" },
    { nip: "198203152008", mapel: "Bahasa Indonesia" },
    { nip: "198203152008", mapel: "Bahasa Inggris" },
    { nip: "199005202012", mapel: "IPA" },
  ];

  for (const sa of subjectAssignments) {
    const teacher = allTeachers.find((t) => t.nip === sa.nip);
    if (teacher) {
      try {
        db.insert(schema.teacherSubjects).values({
          teacherId: teacher.id,
          namaMapel: sa.mapel,
        }).run();
        console.log(`   ✅ ${sa.nip} → ${sa.mapel}`);
      } catch {
        console.log(`   ⏭️ ${sa.nip} → ${sa.mapel} already exists, skipping...`);
      }
    }
  }

  // ==========================================
  // 5. Create Student users + profiles
  // ==========================================
  console.log("\n🎓 Creating Student users...");
  const studentData = [
    // Kelas X-A
    { nis: "2024001", nama: "Andi Prasetyo", kelas: "X-A", jk: "L" as const },
    { nis: "2024002", nama: "Dewi Lestari", kelas: "X-A", jk: "P" as const },
    { nis: "2024003", nama: "Rizki Ramadhan", kelas: "X-A", jk: "L" as const },
    { nis: "2024004", nama: "Siti Nurhaliza", kelas: "X-A", jk: "P" as const },
    { nis: "2024005", nama: "Fajar Nugroho", kelas: "X-A", jk: "L" as const },
    // Kelas X-B
    { nis: "2024006", nama: "Putri Ayu Wulandari", kelas: "X-B", jk: "P" as const },
    { nis: "2024007", nama: "Muhammad Ilham", kelas: "X-B", jk: "L" as const },
    { nis: "2024008", nama: "Nadia Safitri", kelas: "X-B", jk: "P" as const },
    { nis: "2024009", nama: "Bima Sakti", kelas: "X-B", jk: "L" as const },
    { nis: "2024010", nama: "Anisa Rahma", kelas: "X-B", jk: "P" as const },
    // Kelas XI-A
    { nis: "2024011", nama: "Dimas Arya Pratama", kelas: "XI-A", jk: "L" as const },
    { nis: "2024012", nama: "Ratna Sari Dewi", kelas: "XI-A", jk: "P" as const },
    { nis: "2024013", nama: "Hendra Wijaya", kelas: "XI-A", jk: "L" as const },
    { nis: "2024014", nama: "Mega Puspita", kelas: "XI-A", jk: "P" as const },
    { nis: "2024015", nama: "Yoga Permana", kelas: "XI-A", jk: "L" as const },
  ];

  const createdStudentIds: { nis: string; studentId: string }[] = [];

  for (const s of studentData) {
    try {
      const user = await auth.api.signUpEmail({
        body: {
          email: `${s.nis}@siswa.sekolah.id`,
          password: s.nis, // default password = NIS
          name: s.nama,
          username: s.nis,
          appRole: "SISWA",
        },
      });

      const result = db.insert(schema.students).values({
        userId: user.user.id,
        nis: s.nis,
        namaLengkap: s.nama,
        kelas: s.kelas,
        angkatan: "2024",
        jenisKelamin: s.jk,
        status: "aktif",
      }).returning().get();

      createdStudentIds.push({ nis: s.nis, studentId: result.id });
      console.log(`   ✅ Siswa: ${s.nis} / ${s.nis} — ${s.nama} (${s.kelas})`);
    } catch {
      console.log(`   ⏭️ Siswa ${s.nis} already exists, skipping...`);
    }
  }

  // ==========================================
  // 6. Subjects
  // ==========================================
  console.log("\n📚 Creating Subjects...");
  const mapelData = [
    { namaMapel: "Matematika", guruPengampu: "Budi Santoso, S.Pd." },
    { namaMapel: "Bahasa Indonesia", guruPengampu: "Siti Rahayu, M.Pd." },
    { namaMapel: "Bahasa Inggris", guruPengampu: "Siti Rahayu, M.Pd." },
    { namaMapel: "IPA", guruPengampu: "Ahmad Fauzi, S.Pd." },
    { namaMapel: "Fisika", guruPengampu: "Budi Santoso, S.Pd." },
  ];

  for (const m of mapelData) {
    try {
      db.insert(schema.subjects).values(m).run();
      console.log(`   ✅ Mapel: ${m.namaMapel} — ${m.guruPengampu}`);
    } catch {
      console.log(`   ⏭️ Mapel ${m.namaMapel} already exists, skipping...`);
    }
  }

  // ==========================================
  // 7. SPK Criteria
  // ==========================================
  console.log("\n⚖️ Creating SPK Criteria...");
  const kriteria = [
    { namaKriteria: "Kehadiran", bobot: 30, tipe: "Otomatis" as const, deskripsi: "Persentase kehadiran siswa (otomatis dari data absensi)" },
    { namaKriteria: "Nilai Akademik", bobot: 25, tipe: "Manual" as const, deskripsi: "Rata-rata nilai akademik siswa" },
    { namaKriteria: "Kedisiplinan", bobot: 20, tipe: "Manual" as const, deskripsi: "Penilaian kedisiplinan oleh guru" },
    { namaKriteria: "Sikap & Perilaku", bobot: 15, tipe: "Manual" as const, deskripsi: "Penilaian sikap dan perilaku di sekolah" },
    { namaKriteria: "Keaktifan", bobot: 10, tipe: "Manual" as const, deskripsi: "Keaktifan dalam kegiatan sekolah" },
  ];

  for (const k of kriteria) {
    try {
      db.insert(schema.spkCriteria).values(k).run();
      console.log(`   ✅ Kriteria: ${k.namaKriteria} (${k.bobot}%)`);
    } catch {
      console.log(`   ⏭️ Kriteria ${k.namaKriteria} already exists, skipping...`);
    }
  }

  // ==========================================
  // 8. Academic Year
  // ==========================================
  console.log("\n📅 Creating Academic Year...");
  try {
    db.insert(schema.academicYears).values({
      tahunAjaran: "2025/2026",
      semester: "Genap",
      isActive: true,
    }).run();
    console.log("   ✅ 2025/2026 Genap (Active)");
  } catch {
    console.log("   ⏭️ Academic Year already exists, skipping...");
  }

  // ==========================================
  // 9. Demo Attendance Data (last 2 weeks)
  // ==========================================
  console.log("\n📊 Creating demo attendance data...");
  if (createdStudentIds.length > 0) {
    // 80% hadir, 7% izin, 7% sakit, 6% alfa
    // Generate attendance for last 10 school days
    const today = new Date();
    const schoolDays: string[] = [];
    let d = new Date(today.getTime());
    while (schoolDays.length < 10) {
      d.setDate(d.getDate() - 1);
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
        schoolDays.push(d.toISOString().split("T")[0]);
      }
    }

    for (const sid of createdStudentIds) {
      for (const tanggal of schoolDays) {
        // 80% hadir, 7% izin, 7% sakit, 6% alfa
        const rand = Math.random();
        const status = rand < 0.80 ? "Hadir" : rand < 0.87 ? "Izin" : rand < 0.94 ? "Sakit" : "Alfa";
        try {
          db.insert(schema.attendance).values({
            studentId: sid.studentId,
            tanggal,
            mapel: "Umum",
            status,
            periode: "2025/2026-Genap",
          }).run();
        } catch {
          // skip duplicates
        }
      }
    }
    console.log(`   ✅ Generated attendance for ${createdStudentIds.length} students × ${schoolDays.length} days`);
  }

  // ==========================================
  // 10. Demo SPK Scores
  // ==========================================
  console.log("\n🏆 Creating demo SPK scores...");
  if (createdStudentIds.length > 0) {
    const allCriteria = db.select().from(schema.spkCriteria).all();
    for (const sid of createdStudentIds) {
      for (const crit of allCriteria) {
        if (crit.tipe === "Otomatis") continue; // Kehadiran is auto-calculated
        const nilai = Math.floor(Math.random() * 30) + 70; // 70-99
        try {
          db.insert(schema.spkScores).values({
            studentId: sid.studentId,
            criteriaId: crit.id,
            nilai,
            periode: "2025/2026-Genap",
          }).run();
        } catch {
          // skip duplicates
        }
      }
    }
    console.log(`   ✅ Generated SPK scores for ${createdStudentIds.length} students`);
  }

  // ==========================================
  // Done
  // ==========================================
  console.log("\n✨ Seeding complete!\n");
  console.log("=== LOGIN CREDENTIALS ===");
  console.log("Admin  : admin001 / admin123");
  console.log("Guru   : 197601012005 / guru1234 (Budi Santoso)");
  console.log("Guru   : 198203152008 / guru1234 (Siti Rahayu)");
  console.log("Guru   : 199005202012 / guru1234 (Ahmad Fauzi)");
  console.log("Siswa  : 2024001 / 2024001 (Andi Prasetyo, X-A)");
  console.log("Siswa  : 2024002 / 2024002 (Dewi Lestari, X-A)");
  console.log("...dan 13 siswa lainnya (NIS = password)");
  console.log("=========================\n");

  sqlite.close();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
