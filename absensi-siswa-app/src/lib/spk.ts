import { db } from "@/db";
import { spkScores, students, spkCriteria, attendance, academicYears } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function calculateSPK(kelas: string, targetPeriode?: string) {
  // 1. Fetch Students
  let siswaKelas = [];
  if (kelas === "all" || kelas === "umum") {
    siswaKelas = await db.select().from(students).all();
  } else {
    siswaKelas = await db.select().from(students).where(eq(students.kelas, kelas)).all();
  }
  
  if (siswaKelas.length === 0) return [];

  // 2. Determine academic period
  let activePeriode = targetPeriode;
  if (!activePeriode) {
    const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
    activePeriode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : "2024/2025-Genap";
  }

  // 3. Fetch Criteria
  const criteriaList = await db.select().from(spkCriteria).all();

  // 4. Fetch SPK Scores filtered by active period
  const allScores = await db.select().from(spkScores).where(eq(spkScores.periode, activePeriode)).all();

  // 5. Fetch Attendance filtered by active period
  const allAttendance = await db.select().from(attendance).where(eq(attendance.periode, activePeriode)).all();

  // 6. Build raw Matrix
  const rawMatrix: Record<string, Record<string, number>> = {};
  siswaKelas.forEach((s) => {
     rawMatrix[s.id] = {};
     criteriaList.forEach((c) => {
        rawMatrix[s.id][c.id] = 0; // initialize
     });
  });

  for (const c of criteriaList) {
     if (c.tipe === "Otomatis" && c.namaKriteria.toLowerCase().includes("kehadiran")) {
        // Calculate percentage from attendance
        siswaKelas.forEach(s => {
           const sAtt = allAttendance.filter(a => a.studentId === s.id && a.status !== null);
           const hadir = sAtt.filter(a => a.status === "Hadir").length;
           const total = sAtt.length;
           rawMatrix[s.id][c.id] = total > 0 ? (hadir / total) * 100 : 0;
        });
     } else {
        // Manual or specific criteria (C1 for example)
        siswaKelas.forEach(s => {
           const studentScoresForC = allScores.filter(sc => sc.studentId === s.id && sc.criteriaId === c.id);
           if (studentScoresForC.length === 0) {
              rawMatrix[s.id][c.id] = 0;
           } else {
              // If multiple (e.g. multiple mapels), take average
              const sum = studentScoresForC.reduce((acc, curr) => acc + curr.nilai, 0);
              rawMatrix[s.id][c.id] = sum / studentScoresForC.length;
           }
        });
     }
  }

  // 7. Normalization (Simple Additive Weighting)
  // Assume all criteria are BENEFIT (higher is better)
  const maxVals: Record<string, number> = {};
  criteriaList.forEach(c => {
     maxVals[c.id] = Math.max(...siswaKelas.map(s => rawMatrix[s.id][c.id]), 0);
  });

  const normalizedMatrix: Record<string, Record<string, number>> = {};
  siswaKelas.forEach(s => {
     normalizedMatrix[s.id] = {};
     criteriaList.forEach(c => {
        const max = maxVals[c.id];
        const raw = rawMatrix[s.id][c.id];
        normalizedMatrix[s.id][c.id] = max > 0 ? raw / max : 0;
     });
  });

  // 8. Compute Final Score & Rank
  const results = siswaKelas.map((s) => {
     let finalScore = 0;
     const detailNormalisasi: Record<string, number> = {};
     
     criteriaList.forEach(c => {
        const w = c.bobot / 100; // e.g. 30% -> 0.3
        const norm = normalizedMatrix[s.id][c.id];
        detailNormalisasi[c.namaKriteria] = norm;
        finalScore += norm * w;
     });

     return {
        studentId: s.id,
        nis: s.nis,
        namaLengkap: s.namaLengkap,
        kelas: s.kelas,
        rawScore: finalScore, // 0-1 range
        persentase: Number((finalScore * 100).toFixed(2)),
        detailRaw: rawMatrix[s.id],
        detailNormalisasi,
     };
  });

  // Sort descending by score
  results.sort((a, b) => b.rawScore - a.rawScore);

  // Assign rank
  const rankedResults = results.map((r, i) => ({
     rank: i + 1,
     ...r
  }));

  return rankedResults;
}

export async function validateSPKCriteriaFilled(kelas: string, targetPeriode?: string) {
  // 1. Fetch Students
  let siswaKelas = [];
  if (kelas === "all" || kelas === "umum") {
    siswaKelas = await db.select().from(students).all();
  } else {
    siswaKelas = await db.select().from(students).where(eq(students.kelas, kelas)).all();
  }
  
  if (siswaKelas.length === 0) {
    return { isValid: true, missing: [] };
  }

  // 2. Determine academic period
  let activePeriode = targetPeriode;
  if (!activePeriode) {
    const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
    activePeriode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : "2024/2025-Genap";
  }

  // 3. Fetch Criteria
  const criteriaList = await db.select().from(spkCriteria).all();

  // 4. Fetch SPK Scores filtered by active period
  const allScores = await db.select().from(spkScores).where(eq(spkScores.periode, activePeriode)).all();

  // 5. Fetch Attendance filtered by active period
  const allAttendance = await db.select().from(attendance).where(eq(attendance.periode, activePeriode)).all();

  const missingEntries: Array<{
    studentId: string;
    studentName: string;
    kelas: string;
    criteriaId: string;
    criteriaName: string;
    reason: string;
  }> = [];

  for (const s of siswaKelas) {
    for (const c of criteriaList) {
      if (c.tipe === "Otomatis" && c.namaKriteria.toLowerCase().includes("kehadiran")) {
        // Check if student has any attendance recorded in this period
        const sAtt = allAttendance.filter(a => a.studentId === s.id && a.status !== null);
        if (sAtt.length === 0) {
          missingEntries.push({
            studentId: s.id,
            studentName: s.namaLengkap,
            kelas: s.kelas,
            criteriaId: c.id,
            criteriaName: c.namaKriteria,
            reason: "Belum ada data absensi tercatat"
          });
        }
      } else {
        // Manual criteria: check if student has a score for this criteria in the period
        const hasScore = allScores.some(sc => sc.studentId === s.id && sc.criteriaId === c.id);
        if (!hasScore) {
          missingEntries.push({
            studentId: s.id,
            studentName: s.namaLengkap,
            kelas: s.kelas,
            criteriaId: c.id,
            criteriaName: c.namaKriteria,
            reason: "Nilai belum diinput oleh guru"
          });
        }
      }
    }
  }

  return {
    isValid: missingEntries.length === 0,
    missing: missingEntries
  };
}
