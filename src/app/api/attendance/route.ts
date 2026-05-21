import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendance, students, academicYears } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/attendance — get attendance by kelas and tanggal
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
  const periode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : "2024/2025-Genap";

  // Get existing attendance records for this date and mapel and periode
  const existingRecords = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.tanggal, tanggal),
        eq(attendance.mapel, mapel),
        eq(attendance.periode, periode)
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

    const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
    const periode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : "2024/2025-Genap";

    // Delete existing records for this date + these students, then insert new ones
    for (const record of body.records) {
      // Delete old record if exists
      await db
        .delete(attendance)
        .where(
          and(
            eq(attendance.studentId, record.studentId),
            eq(attendance.tanggal, body.tanggal),
            eq(attendance.mapel, mapel),
            eq(attendance.periode, periode)
          )
        );

      // Insert new record
      await db.insert(attendance).values({
        studentId: record.studentId,
        tanggal: body.tanggal,
        mapel: mapel,
        periode: periode,
        status: record.status,
        recordedBy: session.user.id,
      });
    }

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

  try {
    const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
    const periode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : "2024/2025-Genap";

    // We need to delete records of students in that class
    const siswaKelas = await db.select().from(students).where(eq(students.kelas, kelas)).all();
    const siswaIds = siswaKelas.map(s => s.id);

    if (siswaIds.length > 0) {
       for (const sid of siswaIds) {
          await db
             .delete(attendance)
             .where(
                 and(
                    eq(attendance.studentId, sid),
                    eq(attendance.tanggal, tanggal),
                    eq(attendance.mapel, mapel),
                    eq(attendance.periode, periode)
                 )
             );
       }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus absensi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
