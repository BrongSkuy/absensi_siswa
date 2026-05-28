import "dotenv/config";
import { db } from "../src/db/index";
import {
  students,
  subjects,
  classes,
  spkCriteria,
  spkScores,
  attendance,
  spkGradingCategories,
  spkPublishStatus,
  spkResults
} from "../src/db/schema";
import { eq } from "drizzle-orm";

// Helper for safe chunked batch insertion
async function batchInsert(table: any, items: any[]) {
  const chunkSize = 200;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await db.insert(table).values(chunk).run();
  }
}

async function fill() {
  console.log("🚀 Starting database populate script for 2025/2026-Ganjil and 2025/2026-Genap...");

  // 1. Fetch metadata
  const studentList = await db.select().from(students).where(eq(students.status, "aktif")).all();
  const classList = await db.select().from(classes).all();
  const subjectList = await db.select().from(subjects).all();
  const criteriaList = await db.select().from(spkCriteria).all();

  console.log(`- Loaded ${studentList.length} active students.`);
  console.log(`- Loaded ${classList.length} classes.`);
  console.log(`- Loaded ${subjectList.length} subjects.`);
  console.log(`- Loaded ${criteriaList.length} SPK criteria.`);

  if (studentList.length === 0 || criteriaList.length === 0) {
    console.error("❌ Error: No students or criteria found in the database. Please run seed script first.");
    process.exit(1);
  }

  // 2. Identify criteria
  const academicCrit = criteriaList.find(c => c.namaKriteria.toLowerCase().includes("akademik"));
  const nonAcademicCrits = criteriaList.filter(c => c.tipe === "Manual" && !c.namaKriteria.toLowerCase().includes("akademik"));

  if (!academicCrit) {
    console.error("❌ Error: Academic criteria ('Nilai Akademik') not found in database.");
    process.exit(1);
  }

  const periods = ["2025/2026-Ganjil", "2025/2026-Genap"];

  // Clear existing operational data
  console.log("🧹 Clearing old operational records...");
  await db.delete(spkResults).run();
  await db.delete(spkPublishStatus).run();
  await db.delete(spkGradingCategories).run();
  await db.delete(spkScores).run();
  await db.delete(attendance).run();
  console.log("✅ Cleared old data.");

  // Generate last 10 school days for mock attendance
  const today = new Date();
  const schoolDays: string[] = [];
  const d = new Date(today.getTime());
  while (schoolDays.length < 10) {
    d.setDate(d.getDate() - 1);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
      schoolDays.push(d.toISOString().split("T")[0]);
    }
  }

  const attendanceToInsert: any[] = [];
  const gradingCategoriesToInsert: any[] = [];
  const scoresToInsert: any[] = [];
  const publishStatusToInsert: any[] = [];

  for (const periode of periods) {
    publishStatusToInsert.push({
      periode,
      isPublished: false,
    });

    for (const cName of classList.map(c => c.namaKelas)) {
      // Get subjects assigned to this class
      const classSubjects = subjectList.filter(s => {
        if (!s.kelasDiampu) return false;
        return s.kelasDiampu.split(",").map(k => k.trim()).includes(cName);
      }).map(s => s.namaMapel);

      const classStudents = studentList.filter(s => s.kelas === cName);
      if (classStudents.length === 0) continue;

      // Ensure "Umum" is part of subjects checked for attendance & non-academic
      const allMapels = ["Umum", ...classSubjects];

      // Insert grading categories for Nilai Akademik
      for (const mapel of classSubjects) {
        gradingCategoriesToInsert.push({
          kelas: cName,
          mapel,
          criteriaId: academicCrit.id,
          periode,
          categories: JSON.stringify(["Tugas", "UTS", "UAS"]),
        });
      }

      for (const student of classStudents) {
        // 1. Generate Attendance
        for (const mapel of allMapels) {
          for (const tanggal of schoolDays) {
            const rand = Math.random();
            const status = rand < 0.90 ? "Hadir" : rand < 0.95 ? "Izin" : rand < 0.98 ? "Sakit" : "Alfa";
            attendanceToInsert.push({
              studentId: student.id,
              tanggal,
              mapel,
              status,
              periode,
            });
          }
        }

        // 2. Generate Academic Scores
        for (const mapel of classSubjects) {
          const tugas = Math.floor(Math.random() * 21) + 75; // 75-95
          const uts = Math.floor(Math.random() * 21) + 75;
          const uas = Math.floor(Math.random() * 21) + 75;
          const average = Math.round((tugas + uts + uas) / 3);

          scoresToInsert.push({
            studentId: student.id,
            criteriaId: academicCrit.id,
            mapel,
            nilai: average,
            details: JSON.stringify({ Tugas: tugas, UTS: uts, UAS: uas }),
            periode,
          });
        }

        // 3. Generate Non-Academic Scores for each non-academic criteria
        for (const crit of nonAcademicCrits) {
          // Fill for "Umum"
          const generalVal = Math.floor(Math.random() * 21) + 75;
          scoresToInsert.push({
            studentId: student.id,
            criteriaId: crit.id,
            mapel: "Umum",
            nilai: generalVal,
            details: JSON.stringify({ Nilai: generalVal }),
            periode,
          });

          // Fill for each specific academic mapel
          for (const mapel of classSubjects) {
            const mapelVal = Math.floor(Math.random() * 21) + 75;
            scoresToInsert.push({
              studentId: student.id,
              criteriaId: crit.id,
              mapel,
              nilai: mapelVal,
              details: JSON.stringify({ Nilai: mapelVal }),
              periode,
            });
          }
        }
      }
    }
  }

  console.log(`Inserting ${publishStatusToInsert.length} publish status records...`);
  await batchInsert(spkPublishStatus, publishStatusToInsert);

  console.log(`Inserting ${gradingCategoriesToInsert.length} grading categories...`);
  await batchInsert(spkGradingCategories, gradingCategoriesToInsert);

  console.log(`Inserting ${attendanceToInsert.length} attendance records...`);
  await batchInsert(attendance, attendanceToInsert);

  console.log(`Inserting ${scoresToInsert.length} score records...`);
  await batchInsert(spkScores, scoresToInsert);

  console.log("✨ Database successfully populated with 100% compliant data!");
}

fill().catch(e => {
  console.error("❌ Populator script failed:", e);
  process.exit(1);
});
