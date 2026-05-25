import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spkScores, students, spkCriteria, academicYears, spkGradingCategories, teachers, subjects, classes, spkPublishStatus } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/spk/scores?kelas=..&criteriaId=..&mapel=..
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const kelas = searchParams.get("kelas");
  const criteriaId = searchParams.get("criteriaId");
  const mapel = searchParams.get("mapel") || null;

  if (!kelas || !criteriaId) {
    return NextResponse.json(
      { error: "Parameter kelas dan criteriaId wajib" },
      { status: 400 }
    );
  }

  // Get active period
  const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
  const periode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : "2025/2026-Genap";

  // Get grading categories setup
  let categoryCond = and(
    eq(spkGradingCategories.kelas, kelas),
    eq(spkGradingCategories.criteriaId, criteriaId),
    eq(spkGradingCategories.periode, periode)
  );

  if (mapel && mapel !== "Umum") {
    categoryCond = and(categoryCond, eq(spkGradingCategories.mapel, mapel));
  } else {
    // For "Umum" mapel
    categoryCond = and(categoryCond, eq(spkGradingCategories.mapel, "Umum"));
  }

  const [gradingCatRecord] = await db.select().from(spkGradingCategories).where(categoryCond);
  const categories = gradingCatRecord && gradingCatRecord.categories 
    ? JSON.parse(gradingCatRecord.categories) 
    : [];

  // Get students
  const siswaKelas = await db.select().from(students).where(eq(students.kelas, kelas)).all();
  if (siswaKelas.length === 0) {
    return NextResponse.json({
      categories,
      students: []
    });
  }

  const studentIds = siswaKelas.map(s => s.id);
  
  // Get scores
  const scoresQuery = db.select().from(spkScores).where(
     and(
        eq(spkScores.criteriaId, criteriaId),
        eq(spkScores.periode, periode),
        inArray(spkScores.studentId, studentIds)
     )
  );

  const existingScores = await scoresQuery.all();
  
  // Filter by mapel manually if needed
  let filteredScores = existingScores;
  if (mapel && mapel !== "Umum") {
     filteredScores = existingScores.filter(s => s.mapel === mapel);
  } else {
     filteredScores = existingScores.filter(s => !s.mapel || s.mapel === "Umum");
  }

  // Index filteredScores by studentId for O(1) lookups
  const scoreByStudent = new Map<string, typeof filteredScores[0]>();
  filteredScores.forEach((r) => {
    scoreByStudent.set(r.studentId, r);
  });

  const result = siswaKelas.map((s) => {
    const record = scoreByStudent.get(s.id);
    let detailsObj: Record<string, number> = {};
    if (record?.details) {
      try {
        detailsObj = JSON.parse(record.details);
      } catch (e) {
        detailsObj = {};
      }
    }
    return {
      studentId: s.id,
      nis: s.nis,
      namaLengkap: s.namaLengkap,
      nilai: record?.nilai || 0,
      details: detailsObj,
      scoreId: record?.id || null,
    };
  });

  return NextResponse.json({
    categories,
    students: result
  });
}

// POST /api/spk/scores
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const appRole = (session?.user as Record<string, unknown>)?.appRole;
  if (!session || (appRole !== "GURU" && appRole !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body: {
      kelas: string;
      criteriaId: string;
      mapel?: string;
      categories: string[];
      records: Array<{
        studentId: string;
        details?: Record<string, number>;
      }>;
    } = await request.json();

    const mapel = body.mapel && body.mapel !== "Umum" ? body.mapel : "Umum";

    if (!body.kelas || !body.criteriaId || !body.records?.length) {
      return NextResponse.json({ error: "Data nilai tidak valid" }, { status: 400 });
    }

    // Role Isolation Check
    if (appRole === "GURU") {
      const [teacherRecord] = await db.select().from(teachers).where(eq(teachers.userId, session.user.id as string));
      if (!teacherRecord) {
        return NextResponse.json({ error: "Data guru tidak ditemukan" }, { status: 404 });
      }

      // Check Subject and Class Assignment
      if (mapel !== "Umum") {
        const [subjectAssignment] = await db.select().from(subjects).where(
          and(eq(subjects.teacherId, teacherRecord.id), eq(subjects.namaMapel, mapel))
        );
        if (!subjectAssignment) {
          return NextResponse.json({ error: "Akses Ditolak: Anda tidak ditugaskan untuk mata pelajaran ini." }, { status: 403 });
        }
        const assignedClasses = subjectAssignment.kelasDiampu ? subjectAssignment.kelasDiampu.split(",").map(k => k.trim()) : [];
        if (!assignedClasses.includes(body.kelas)) {
          return NextResponse.json({ error: "Akses Ditolak: Anda tidak ditugaskan untuk mengajar mata pelajaran ini di kelas tersebut." }, { status: 403 });
        }
      } else {
        // "Umum" check: must be Wali Kelas or teach ANY subject in this class
        const [kelasRecord] = await db.select().from(classes).where(eq(classes.namaKelas, body.kelas));
        const isWaliKelas = kelasRecord?.waliKelas === teacherRecord.namaLengkap;
        
        const mySubjects = await db.select().from(subjects).where(eq(subjects.teacherId, teacherRecord.id)).all();
        const teachesAnySubjectInClass = mySubjects.some(ts => ts.kelasDiampu && ts.kelasDiampu.split(",").map(k => k.trim()).includes(body.kelas));
        
        if (!isWaliKelas && !teachesAnySubjectInClass) {
          return NextResponse.json({ error: "Akses Ditolak: Anda tidak memiliki akses ke kelas ini." }, { status: 403 });
        }
      }
    }

    const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
    const periode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : "2025/2026-Genap";

    // Lockdown Check
    const [pubStatus] = await db.select().from(spkPublishStatus).where(eq(spkPublishStatus.periode, periode));
    if (pubStatus?.isPublished) {
      return NextResponse.json({ error: "Periode ini telah dikunci (Finalized). Data nilai tidak dapat diubah lagi." }, { status: 403 });
    }

    await db.transaction(async (tx) => {
      // Sub-transaction 1: Update Categories Configuration
      const categoryCond = and(
        eq(spkGradingCategories.kelas, body.kelas),
        eq(spkGradingCategories.criteriaId, body.criteriaId),
        eq(spkGradingCategories.mapel, mapel),
        eq(spkGradingCategories.periode, periode)
      );
      await tx.delete(spkGradingCategories).where(categoryCond);
      await tx.insert(spkGradingCategories).values({
        kelas: body.kelas,
        mapel,
        criteriaId: body.criteriaId,
        periode,
        categories: JSON.stringify(body.categories || [])
      });

      // Batch delete existing scores for these students
      const studentIds = body.records.map(r => r.studentId);
      let deleteCond = and(
         inArray(spkScores.studentId, studentIds),
         eq(spkScores.criteriaId, body.criteriaId),
         eq(spkScores.periode, periode)
      );

      if (mapel !== "Umum") {
         deleteCond = and(deleteCond, eq(spkScores.mapel, mapel));
      } else {
         deleteCond = and(
           deleteCond,
           sql`(${spkScores.mapel} IS NULL OR ${spkScores.mapel} = 'Umum' OR ${spkScores.mapel} = '')`
         );
      }
      await tx.delete(spkScores).where(deleteCond);

      const valuesToInsert = [];
      for (const record of body.records) {
        // Calculate average (nilai)
        let sum = 0;
        let count = 0;
        if (record.details) {
           Object.values(record.details).forEach(val => {
              const num = parseFloat(String(val));
              if (!isNaN(num)) {
                 if (num < 0 || num > 100) {
                    throw new Error(`Nilai tidak valid (${num}). Nilai harus berada dalam rentang 0 hingga 100.`);
                 }
                 sum += num;
                 count++;
              }
           });
        }
        const rataRata = count > 0 ? (sum / count) : 0;

        valuesToInsert.push({
          studentId: record.studentId,
          criteriaId: body.criteriaId,
          mapel: mapel === "Umum" ? null : mapel,
          nilai: rataRata, // calculated average
          details: record.details ? JSON.stringify(record.details) : null,
          periode: periode,
        });
      }

      if (valuesToInsert.length > 0) {
        await tx.insert(spkScores).values(valuesToInsert);
      }
    });

    return NextResponse.json({ success: true, count: body.records.length });
  } catch (error: unknown) {
     console.error(error);
    const message = error instanceof Error ? error.message : "Gagal menyimpan nilai";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/spk/scores
export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const appRole = (session?.user as Record<string, unknown>)?.appRole;
  if (!session || (appRole !== "GURU" && appRole !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const kelas = searchParams.get("kelas");
  const criteriaId = searchParams.get("criteriaId");
  const rawMapel = searchParams.get("mapel");
  const mapel = rawMapel && rawMapel !== "Umum" ? rawMapel : null;

  if (!kelas || !criteriaId) {
    return NextResponse.json({ error: "Parameter wajib tidak lengkap" }, { status: 400 });
  }

  // Role Isolation Check for DELETE
  if (appRole === "GURU") {
    const [teacherRecord] = await db.select().from(teachers).where(eq(teachers.userId, session.user.id as string));
    if (!teacherRecord) {
      return NextResponse.json({ error: "Data guru tidak ditemukan" }, { status: 404 });
    }

    // Check Subject and Class Assignment
    if (mapel) {
      const [subjectAssignment] = await db.select().from(subjects).where(
        and(eq(subjects.teacherId, teacherRecord.id), eq(subjects.namaMapel, mapel))
      );
      if (!subjectAssignment) {
        return NextResponse.json({ error: "Akses Ditolak: Anda tidak ditugaskan untuk mata pelajaran ini." }, { status: 403 });
      }
      const assignedClasses = subjectAssignment.kelasDiampu ? subjectAssignment.kelasDiampu.split(",").map(k => k.trim()) : [];
      if (!assignedClasses.includes(kelas)) {
        return NextResponse.json({ error: "Akses Ditolak: Anda tidak ditugaskan untuk mengajar mata pelajaran ini di kelas tersebut." }, { status: 403 });
      }
    } else {
      // "Umum" check: must be Wali Kelas or teach ANY subject in this class
      const [kelasRecord] = await db.select().from(classes).where(eq(classes.namaKelas, kelas));
      const isWaliKelas = kelasRecord?.waliKelas === teacherRecord.namaLengkap;
      
      const mySubjects = await db.select().from(subjects).where(eq(subjects.teacherId, teacherRecord.id)).all();
      const teachesAnySubjectInClass = mySubjects.some(ts => ts.kelasDiampu && ts.kelasDiampu.split(",").map(k => k.trim()).includes(kelas));
      
      if (!isWaliKelas && !teachesAnySubjectInClass) {
        return NextResponse.json({ error: "Akses Ditolak: Anda tidak memiliki akses ke kelas ini." }, { status: 403 });
      }
    }
  }

  try {
    const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
    const periode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : "2025/2026-Genap";

    // Lockdown Check
    const [pubStatus] = await db.select().from(spkPublishStatus).where(eq(spkPublishStatus.periode, periode));
    if (pubStatus?.isPublished) {
      return NextResponse.json({ error: "Periode ini telah dikunci (Finalized). Data nilai tidak dapat dihapus lagi." }, { status: 403 });
    }

    await db.transaction(async (tx) => {
      const siswaKelas = await tx.select().from(students).where(eq(students.kelas, kelas)).all();
      const studentIds = siswaKelas.map(s => s.id);
      
      if (studentIds.length > 0) {
        let cond = and(
           inArray(spkScores.studentId, studentIds),
           eq(spkScores.criteriaId, criteriaId),
           eq(spkScores.periode, periode)
        );

        if (mapel) {
           cond = and(cond, eq(spkScores.mapel, mapel));
        } else {
           cond = and(
             cond,
             sql`(${spkScores.mapel} IS NULL OR ${spkScores.mapel} = 'Umum' OR ${spkScores.mapel} = '')`
           );
        }

        await tx.delete(spkScores).where(cond);
      }
      
      // Also cleanup categories
      const catCond = and(
         eq(spkGradingCategories.kelas, kelas),
         eq(spkGradingCategories.criteriaId, criteriaId),
         eq(spkGradingCategories.mapel, mapel || "Umum"),
         eq(spkGradingCategories.periode, periode)
      );
      await tx.delete(spkGradingCategories).where(catCond);
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus nilai";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
