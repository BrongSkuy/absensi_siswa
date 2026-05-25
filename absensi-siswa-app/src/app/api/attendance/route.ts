import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendance, students, academicYears, teachers, subjects, classes, spkPublishStatus } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { DEFAULT_PERIODE } from "@/lib/utils";

// GET /api/attendance — get attendance by kelas and tanggal
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole;
  if (appRole !== "ADMIN" && appRole !== "GURU") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const kelas = searchParams.get("kelas");
  const tanggal = searchParams.get("tanggal");
  const mapel = searchParams.get("mapel") || "Umum";

  if (!kelas || !tanggal) {
    return NextResponse.json(
      { error: "Parameter kelas dan tanggal wajib" },
      { status: 400 }
    );
  }

  // Get students in this class
  const siswaKelas = await db
    .select()
    .from(students)
    .where(eq(students.kelas, kelas))
    .all();

  if (siswaKelas.length === 0) {
    return NextResponse.json([]);
  }

  const studentIds = siswaKelas.map(s => s.id);

  const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
  const periode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : DEFAULT_PERIODE;

  // Get existing attendance records for this date and mapel and periode
  const existingRecords = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.tanggal, tanggal),
        eq(attendance.mapel, mapel),
        eq(attendance.periode, periode),
        inArray(attendance.studentId, studentIds)
      )
    )
    .all();

  // Map students with their attendance status
  const result = siswaKelas.map((s) => {
    const record = existingRecords.find((r) => r.studentId === s.id);
    return {
      studentId: s.id,
      nis: s.nis,
      namaLengkap: s.namaLengkap,
      status: record?.status || null,
      attendanceId: record?.id || null,
    };
  });

  return NextResponse.json(result);
}

// POST /api/attendance — batch save attendance for a class/date
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const appRole = (session?.user as Record<string, unknown>)?.appRole;
  if (!session || (appRole !== "GURU" && appRole !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body: {
      tanggal: string;
      mapel?: string;
      records: Array<{
        studentId: string;
        status: "Hadir" | "Izin" | "Sakit" | "Alfa";
      }>;
    } = await request.json();

    const mapel = body.mapel || "Umum";

    if (!body.tanggal || !body.records?.length) {
      return NextResponse.json(
        { error: "Data absensi tidak valid" },
        { status: 400 }
      );
    }

    // Role Isolation Check
    if (appRole === "GURU") {
      const firstStudentId = body.records[0].studentId;
      const [firstStudent] = await db.select().from(students).where(eq(students.id, firstStudentId));
      if (!firstStudent) {
        return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
      }

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
        if (!assignedClasses.includes(firstStudent.kelas)) {
          return NextResponse.json({ error: "Akses Ditolak: Anda tidak ditugaskan untuk mengajar mata pelajaran ini di kelas tersebut." }, { status: 403 });
        }
      } else {
        // "Umum" check: must be Wali Kelas or teach ANY subject in this class
        const [kelasRecord] = await db.select().from(classes).where(eq(classes.namaKelas, firstStudent.kelas));
        const isWaliKelas = kelasRecord?.waliKelas === teacherRecord.namaLengkap;
        
        const mySubjects = await db.select().from(subjects).where(eq(subjects.teacherId, teacherRecord.id)).all();
        const teachesAnySubjectInClass = mySubjects.some(ts => ts.kelasDiampu && ts.kelasDiampu.split(",").map(k => k.trim()).includes(firstStudent.kelas));
        
        if (!isWaliKelas && !teachesAnySubjectInClass) {
          return NextResponse.json({ error: "Akses Ditolak: Anda tidak memiliki akses ke kelas ini." }, { status: 403 });
        }
      }
    }

    const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
    const periode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : DEFAULT_PERIODE;

    // Lockdown Check
    const [pubStatus] = await db.select().from(spkPublishStatus).where(eq(spkPublishStatus.periode, periode));
    if (pubStatus?.isPublished) {
      return NextResponse.json({ error: "Periode ini telah dikunci (Finalized). Data absensi tidak dapat diubah lagi." }, { status: 403 });
    }

    // Delete existing records for this date + these students, then insert new ones in transaction
    await db.transaction(async (tx) => {
      const studentIds = body.records.map(r => r.studentId);
      await tx
        .delete(attendance)
        .where(
          and(
            inArray(attendance.studentId, studentIds),
            eq(attendance.tanggal, body.tanggal),
            eq(attendance.mapel, mapel),
            eq(attendance.periode, periode)
          )
        );

      const valuesToInsert = body.records.map(record => ({
        studentId: record.studentId,
        tanggal: body.tanggal,
        mapel: mapel,
        periode: periode,
        status: record.status,
        recordedBy: session.user.id,
      }));

      if (valuesToInsert.length > 0) {
        await tx.insert(attendance).values(valuesToInsert);
      }
    });

    return NextResponse.json({
      success: true,
      count: body.records.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan absensi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/attendance?kelas=..&tanggal=..&mapel=.. — clear attendance for a specific class day
export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const appRole = (session?.user as Record<string, unknown>)?.appRole;
  if (!session || (appRole !== "GURU" && appRole !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const kelas = searchParams.get("kelas");
  const tanggal = searchParams.get("tanggal");
  const mapel = searchParams.get("mapel") || "Umum";

  if (!kelas || !tanggal) {
    return NextResponse.json({ error: "Parameter kelas dan tanggal wajib" }, { status: 400 });
  }

  // Role Isolation Check for DELETE
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
    const periode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : DEFAULT_PERIODE;

    // Lockdown Check
    const [pubStatus] = await db.select().from(spkPublishStatus).where(eq(spkPublishStatus.periode, periode));
    if (pubStatus?.isPublished) {
      return NextResponse.json({ error: "Periode ini telah dikunci (Finalized). Data absensi tidak dapat dihapus lagi." }, { status: 403 });
    }

    // We need to delete records of students in that class
    const siswaKelas = await db.select().from(students).where(eq(students.kelas, kelas)).all();
    const siswaIds = siswaKelas.map(s => s.id);

    if (siswaIds.length > 0) {
       await db
          .delete(attendance)
          .where(
              and(
                 inArray(attendance.studentId, siswaIds),
                 eq(attendance.tanggal, tanggal),
                 eq(attendance.mapel, mapel),
                 eq(attendance.periode, periode)
              )
          );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus absensi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
