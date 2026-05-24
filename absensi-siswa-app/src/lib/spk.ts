import { db } from "@/db";
import { spkScores, students, spkCriteria, attendance, academicYears, teacherClasses, teacherSubjects, classes as classesTable } from "@/db/schema";
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

  // 6. Fetch metadata for strict validation
  const classNames = [...new Set(siswaKelas.map(s => s.kelas))];
  const classMeta = await db.select().from(classesTable).all();
  const allTeacherClasses = await db.select().from(teacherClasses).all();
  const allTeacherSubjects = await db.select().from(teacherSubjects).where(eq(teacherSubjects.periode, activePeriode)).all();

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
    
    // Add "Umum" if class has Wali Kelas
    const classInfo = classMeta.find(c => c.namaKelas === cName);
    if (classInfo?.waliKelas) {
      requiredMapels.add("Umum");
    }

    // Add subjects taught by teachers assigned to this class
    const assignedTeachers = allTeacherClasses.filter(tc => tc.kelas === cName);
    for (const at of assignedTeachers) {
      const subjectsForTeacher = allTeacherSubjects.filter(ts => ts.teacherId === at.teacherId);
      subjectsForTeacher.forEach(ts => requiredMapels.add(ts.namaMapel));
    }

    // Get students in this class
    const studentsInThisClass = siswaKelas.filter(s => s.kelas === cName);

    // Validate each required subject
    for (const mapel of Array.from(requiredMapels)) {
      
      // Check Attendance (Otomatis)
      const hasAttendanceForClass = allAttendance.some(
        a => studentsInThisClass.some(s => s.id === a.studentId) && a.mapel === mapel
      );

      if (!hasAttendanceForClass) {
        missingEntries.push({
          studentId: "ALL",
          studentName: "Semua Siswa",
          kelas: cName,
          criteriaId: "attendance",
          criteriaName: "Kehadiran",
          reason: `Guru mapel ${mapel} belum mengisi absensi sama sekali`
        });
      }

      // Check Scores (Manual)
      // A teacher for a mapel should submit at least one score for any manual criteria
      // Because some mapels only submit "Nilai Akademik", we just check if there is ANY score for this mapel in this class.
      const hasScoreForClass = allScores.some(
        sc => studentsInThisClass.some(s => s.id === sc.studentId) && (sc.mapel === mapel || (mapel === "Umum" && !sc.mapel))
      );
      
      if (!hasScoreForClass) {
        missingEntries.push({
          studentId: "ALL",
          studentName: "Semua Siswa",
          kelas: cName,
          criteriaId: "scores",
          criteriaName: "Penilaian Manual",
          reason: `Guru mapel ${mapel} belum mengisi nilai kriteria sama sekali`
        });
      }
    }
  }

  return {
    isValid: missingEntries.length === 0,
    missing: missingEntries
  };
}
