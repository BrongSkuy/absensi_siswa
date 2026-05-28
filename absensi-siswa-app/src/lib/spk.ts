import { db } from "@/db";
import { spkScores, students, spkCriteria, attendance, academicYears, classes as classesTable, subjects, spkGradingCategories } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { DEFAULT_PERIODE } from "@/lib/utils";

export async function calculateSPK(kelas: string, targetPeriode?: string) {
  // 1. Fetch Students
  let siswaKelas = [];
  if (kelas === "all" || kelas === "umum") {
    siswaKelas = await db.select().from(students).where(eq(students.status, "aktif")).all();
  } else {
    siswaKelas = await db.select().from(students).where(and(eq(students.kelas, kelas), eq(students.status, "aktif"))).all();
  }
  
  if (siswaKelas.length === 0) return [];

  // 2. Determine academic period
  let activePeriode = targetPeriode;
  if (!activePeriode) {
    const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
    activePeriode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : DEFAULT_PERIODE;
  }

  // 3. Fetch Criteria
  const criteriaList = await db.select().from(spkCriteria).all();

  const studentIds = siswaKelas.map((s) => s.id);

  // 4. Fetch SPK Scores filtered by active period and optionally studentIds
  const allScores = await db
    .select()
    .from(spkScores)
    .where(
      kelas === "all" || kelas === "umum"
        ? eq(spkScores.periode, activePeriode)
        : and(
            eq(spkScores.periode, activePeriode),
            inArray(spkScores.studentId, studentIds)
          )
    )
    .all();

  // 5. Fetch Attendance filtered by active period and optionally studentIds
  const allAttendance = await db
    .select()
    .from(attendance)
    .where(
      kelas === "all" || kelas === "umum"
        ? eq(attendance.periode, activePeriode)
        : and(
            eq(attendance.periode, activePeriode),
            inArray(attendance.studentId, studentIds)
          )
    )
    .all();

  // 6. Pre-group attendance by studentId and scores by studentId & criteriaId for O(1) lookups
  const attendanceByStudent = new Map<string, typeof allAttendance>();
  allAttendance.forEach((a) => {
    if (a.status !== null) {
      let list = attendanceByStudent.get(a.studentId);
      if (!list) {
        list = [];
        attendanceByStudent.set(a.studentId, list);
      }
      list.push(a);
    }
  });

  const scoresByStudentAndCriteria = new Map<string, typeof allScores>();
  allScores.forEach((sc) => {
    const key = `${sc.studentId}-${sc.criteriaId}`;
    let list = scoresByStudentAndCriteria.get(key);
    if (!list) {
      list = [];
      scoresByStudentAndCriteria.set(key, list);
    }
    list.push(sc);
  });

  // Build raw Matrix
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
           const sAtt = attendanceByStudent.get(s.id) || [];
           const hadir = sAtt.filter(a => a.status === "Hadir").length;
           const total = sAtt.length;
           rawMatrix[s.id][c.id] = total > 0 ? (hadir / total) * 100 : 0;
        });
     } else {
        // Manual or specific criteria (C1 for example)
        siswaKelas.forEach(s => {
           const studentScoresForC = scoresByStudentAndCriteria.get(`${s.id}-${c.id}`) || [];
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
  // 1. Fetch Students (active only)
  let siswaKelas = [];
  if (kelas === "all" || kelas === "umum") {
    siswaKelas = await db.select().from(students).where(eq(students.status, "aktif")).all();
  } else {
    siswaKelas = await db.select().from(students).where(and(eq(students.kelas, kelas), eq(students.status, "aktif"))).all();
  }
  
  if (siswaKelas.length === 0) {
    return { isValid: true, missing: [] };
  }

  // 2. Determine academic period
  let activePeriode = targetPeriode;
  if (!activePeriode) {
    const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
    activePeriode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : DEFAULT_PERIODE;
  }

  // 3. Fetch Criteria
  const criteriaList = await db.select().from(spkCriteria).all();
  const manualCriteriaList = criteriaList.filter(c => c.tipe === "Manual");

  const studentIds = siswaKelas.map((s) => s.id);

  // 4. Fetch SPK Scores filtered by active period and studentIds
  const allScores = await db
    .select()
    .from(spkScores)
    .where(
      kelas === "all" || kelas === "umum"
        ? eq(spkScores.periode, activePeriode)
        : and(
            eq(spkScores.periode, activePeriode),
            inArray(spkScores.studentId, studentIds)
          )
    )
    .all();

  // 5. Fetch Attendance filtered by active period and studentIds
  const allAttendance = await db
    .select()
    .from(attendance)
    .where(
      kelas === "all" || kelas === "umum"
        ? eq(attendance.periode, activePeriode)
        : and(
            eq(attendance.periode, activePeriode),
            inArray(attendance.studentId, studentIds)
          )
    )
    .all();

  // 6. Fetch metadata for strict validation
  const classNames = [...new Set(siswaKelas.map(s => s.kelas))];
  const classMeta = await db.select().from(classesTable).all();

  // Fetch all curriculum subjects from the subjects table
  const subjectsList = await db.select().from(subjects).all();
  const curriculumMapels = subjectsList.map(s => s.namaMapel);

  // Fetch all dynamic grading category configs
  const allGradingCategories = await db
    .select()
    .from(spkGradingCategories)
    .where(eq(spkGradingCategories.periode, activePeriode))
    .all();

  // Construct lookup maps for O(1) checks
  // scoresMap key: studentId:criteriaId:mapelKey
  const scoresMap = new Map<string, typeof allScores[0]>();
  allScores.forEach(sc => {
    const mapelKey = sc.mapel && sc.mapel !== "Umum" ? sc.mapel : "Umum";
    scoresMap.set(`${sc.studentId}:${sc.criteriaId}:${mapelKey}`, sc);
  });

  // attendanceKeys format: studentId:mapelKey
  const attendanceKeys = new Set<string>();
  allAttendance.forEach(a => {
    const mapelKey = a.mapel && a.mapel !== "Umum" ? a.mapel : "Umum";
    attendanceKeys.add(`${a.studentId}:${mapelKey}`);
  });

  // gradingCategoriesMap key: kelas:criteriaId:mapelKey
  const gradingCategoriesMap = new Map<string, string[]>();
  allGradingCategories.forEach(gc => {
    const mapelKey = gc.mapel && gc.mapel !== "Umum" ? gc.mapel : "Umum";
    const key = `${gc.kelas}:${gc.criteriaId}:${mapelKey}`;
    try {
      gradingCategoriesMap.set(key, JSON.parse(gc.categories));
    } catch (e) {
      gradingCategoriesMap.set(key, []);
    }
  });

  const missingEntries: Array<{
    studentId: string;
    studentName: string;
    kelas: string;
    criteriaId: string;
    criteriaName: string;
    reason: string;
  }> = [];

  for (const cName of classNames) {
    const requiredMapels = new Set<string>();
    for (const s of subjectsList) {
      if (s.kelasDiampu) {
        const classes = s.kelasDiampu.split(",").map(k => k.trim());
        if (classes.includes(cName)) {
          requiredMapels.add(s.namaMapel);
        }
      }
    }
    
    // Add "Umum" if class has Wali Kelas
    const classInfo = classMeta.find(c => c.namaKelas === cName);
    if (classInfo?.waliKelas) {
      requiredMapels.add("Umum");
    }

    // Get active students in this class
    const studentsInThisClass = siswaKelas.filter(s => s.kelas === cName);
    if (studentsInThisClass.length === 0) continue;

    const mapelList = Array.from(requiredMapels);

    for (const mapel of mapelList) {
      // 1. Check Attendance (Otomatis)
      const studentsMissingAttendance = studentsInThisClass.filter(
        s => !attendanceKeys.has(`${s.id}:${mapel}`)
      );

      if (studentsMissingAttendance.length === studentsInThisClass.length) {
        missingEntries.push({
          studentId: "ALL",
          studentName: "Semua Siswa",
          kelas: cName,
          criteriaId: "attendance",
          criteriaName: `Kehadiran (${mapel})`,
          reason: `Guru mapel ${mapel} belum mengisi absensi sama sekali`
        });
      } else if (studentsMissingAttendance.length > 0) {
        studentsMissingAttendance.forEach(s => {
          missingEntries.push({
            studentId: s.id,
            studentName: s.namaLengkap,
            kelas: cName,
            criteriaId: "attendance",
            criteriaName: `Kehadiran (${mapel})`,
            reason: `Siswa belum memiliki data absensi untuk mata pelajaran ${mapel}`
          });
        });
      }

      // 2. Check Scores (Manual)
      for (const c of manualCriteriaList) {
        const isAcademic = c.namaKriteria.toLowerCase().includes("akademik");

        // Skip academic criteria check for general homeroom (Umum)
        if (isAcademic && mapel === "Umum") continue;

        let categoriesRequired: string[] = [];
        if (isAcademic) {
          categoriesRequired = gradingCategoriesMap.get(`${cName}:${c.id}:${mapel}`) || [];
        } else {
          categoriesRequired = ["Nilai"];
        }

        if (isAcademic && categoriesRequired.length === 0) {
          // If no categories are configured for academic criteria, report group error
          missingEntries.push({
            studentId: "ALL",
            studentName: "Semua Siswa",
            kelas: cName,
            criteriaId: c.id,
            criteriaName: `${c.namaKriteria} (${mapel})`,
            reason: `Guru mapel ${mapel} belum mengatur kategori penilaian (Tugas, UTS, UAS, dll)`
          });
          continue;
        }

        // Check each student for missing scores or empty categories
        const studentsMissingScore: Array<{ student: typeof siswaKelas[0]; missingCats: string[] }> = [];

        studentsInThisClass.forEach(s => {
          const scoreRecord = scoresMap.get(`${s.id}:${c.id}:${mapel}`);

          if (!scoreRecord) {
            studentsMissingScore.push({ student: s, missingCats: categoriesRequired });
          } else {
            let detailsObj: Record<string, number> = {};
            if (scoreRecord.details) {
              try {
                detailsObj = JSON.parse(scoreRecord.details);
              } catch (e) {
                detailsObj = {};
              }
            }

            const missingCats = categoriesRequired.filter(cat => {
              const val = detailsObj[cat];
              return val === undefined || val === null || isNaN(parseFloat(String(val)));
            });

            if (missingCats.length > 0) {
              studentsMissingScore.push({ student: s, missingCats });
            }
          }
        });

        if (studentsMissingScore.length === studentsInThisClass.length) {
          missingEntries.push({
            studentId: "ALL",
            studentName: "Semua Siswa",
            kelas: cName,
            criteriaId: c.id,
            criteriaName: `${c.namaKriteria} (${mapel})`,
            reason: `Guru mapel ${mapel} belum mengisi nilai kriteria ${c.namaKriteria} sama sekali`
          });
        } else if (studentsMissingScore.length > 0) {
          studentsMissingScore.forEach(({ student, missingCats }) => {
            missingEntries.push({
              studentId: student.id,
              studentName: student.namaLengkap,
              kelas: cName,
              criteriaId: c.id,
              criteriaName: `${c.namaKriteria} (${mapel})`,
              reason: `Nilai kriteria ${c.namaKriteria} mata pelajaran ${mapel} belum lengkap (${missingCats.join(", ")})`
            });
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
