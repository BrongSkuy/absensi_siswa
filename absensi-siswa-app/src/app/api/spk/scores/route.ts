import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spkScores, students, spkCriteria, academicYears, spkGradingCategories, teachers, teacherClasses, teacherSubjects, spkPublishStatus } from "@/db/schema";
import { and, eq } from "drizzle-orm";
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
  
  // Get scores
  const scoresQuery = db.select().from(spkScores).where(
     and(
        eq(spkScores.criteriaId, criteriaId),
        eq(spkScores.periode, periode)
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

  const result = siswaKelas.map((s) => {
    const record = filteredScores.find((r) => r.studentId === s.id);
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

      // Check Class Assignment
      const [classAssignment] = await db.select().from(teacherClasses).where(
        and(eq(teacherClasses.teacherId, teacherRecord.id), eq(teacherClasses.kelas, body.kelas))
      );
      if (!classAssignment) {
        return NextResponse.json({ error: "Akses Ditolak: Anda tidak ditugaskan untuk mengajar di kelas ini." }, { status: 403 });
      }

      // Check Subject Assignment
      if (mapel !== "Umum") {
        const [subjectAssignment] = await db.select().from(teacherSubjects).where(
          and(eq(teacherSubjects.teacherId, teacherRecord.id), eq(teacherSubjects.namaMapel, mapel))
        );
        if (!subjectAssignment) {
          return NextResponse.json({ error: "Akses Ditolak: Anda tidak ditugaskan untuk mata pelajaran ini." }, { status: 403 });
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

    // Sub-transaction 1: Update Categories Configuration
    const categoryCond = and(
      eq(spkGradingCategories.kelas, body.kelas),
      eq(spkGradingCategories.criteriaId, body.criteriaId),
      eq(spkGradingCategories.mapel, mapel),
      eq(spkGradingCategories.periode, periode)
    );
    await db.delete(spkGradingCategories).where(categoryCond);
    await db.insert(spkGradingCategories).values({
      kelas: body.kelas,
      mapel,
      criteriaId: body.criteriaId,
      periode,
      categories: JSON.stringify(body.categories || [])
    });

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

      // Delete old record
      let deleteCond = and(
         eq(spkScores.studentId, record.studentId),
         eq(spkScores.criteriaId, body.criteriaId),
         eq(spkScores.periode, periode)
      );

      if (mapel !== "Umum") {
         deleteCond = and(deleteCond, eq(spkScores.mapel, mapel));
      } else {
         const existingNull = await db.select().from(spkScores).where(deleteCond).all();
         const toDelete = existingNull.filter(x => !x.mapel || x.mapel === "Umum" || x.mapel === "").map(x => x.id);
         if (toDelete.length > 0) {
            for (const idToDelete of toDelete) {
               await db.delete(spkScores).where(eq(spkScores.id, idToDelete));
            }
         }
      }

      if (mapel !== "Umum") {
         await db.delete(spkScores).where(deleteCond);
      }

      await db.insert(spkScores).values({
        studentId: record.studentId,
        criteriaId: body.criteriaId,
        mapel: mapel === "Umum" ? null : mapel,
        nilai: rataRata, // calculated average
        details: record.details ? JSON.stringify(record.details) : null,
        periode: periode,
      });
    }

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

    // Check Class Assignment
    const [classAssignment] = await db.select().from(teacherClasses).where(
      and(eq(teacherClasses.teacherId, teacherRecord.id), eq(teacherClasses.kelas, kelas))
    );
    if (!classAssignment) {
      return NextResponse.json({ error: "Akses Ditolak: Anda tidak ditugaskan untuk mengajar di kelas ini." }, { status: 403 });
    }

    // Check Subject Assignment
    if (mapel) {
      const [subjectAssignment] = await db.select().from(teacherSubjects).where(
        and(eq(teacherSubjects.teacherId, teacherRecord.id), eq(teacherSubjects.namaMapel, mapel))
      );
      if (!subjectAssignment) {
        return NextResponse.json({ error: "Akses Ditolak: Anda tidak ditugaskan untuk mata pelajaran ini." }, { status: 403 });
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

    const siswaKelas = await db.select().from(students).where(eq(students.kelas, kelas)).all();
    
    for (const s of siswaKelas) {
      let cond = and(
         eq(spkScores.studentId, s.id),
         eq(spkScores.criteriaId, criteriaId),
         eq(spkScores.periode, periode)
      );

      if (mapel) {
         cond = and(cond, eq(spkScores.mapel, mapel));
      }

      if (!mapel) {
         const allRecords = await db.select().from(spkScores).where(cond).all();
         for (const rec of allRecords) {
            if (!rec.mapel || rec.mapel === "Umum") {
               await db.delete(spkScores).where(eq(spkScores.id, rec.id));
            }
         }
      } else {
         await db.delete(spkScores).where(cond);
      }
    }
    
    // Also cleanup categories
    const catCond = and(
       eq(spkGradingCategories.kelas, kelas),
       eq(spkGradingCategories.criteriaId, criteriaId),
       eq(spkGradingCategories.mapel, mapel || "Umum"),
       eq(spkGradingCategories.periode, periode)
    );
    await db.delete(spkGradingCategories).where(catCond);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus nilai";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
