import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendance, students, academicYears } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/attendance/history?kelas=..&mapel=..
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
  const mapel = searchParams.get("mapel") || "Umum";

  if (!kelas) {
    return NextResponse.json({ error: "Parameter kelas wajib diisi" }, { status: 400 });
  }

  try {
    const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
    const periode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : "2025/2026-Genap";

    // 1. Get all students in the class
    const siswaKelas = await db
      .select({
        id: students.id,
        nis: students.nis,
        nama: students.namaLengkap,
      })
      .from(students)
      .where(eq(students.kelas, kelas))
      .all();

    if (siswaKelas.length === 0) {
      return NextResponse.json({ dates: [], records: [] });
    }

    const studentIds = siswaKelas.map((s) => s.id);

    // 2. Get all attendance records for this period and mapel strictly for students in this class
    const classRecords = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.periode, periode),
          eq(attendance.mapel, mapel),
          inArray(attendance.studentId, studentIds)
        )
      )
      .all();

    // 4. Extract unique dates
    const uniqueDates = Array.from(new Set(classRecords.map((r) => r.tanggal))).sort();

    // 5. Index classRecords by studentId-tanggal for O(1) lookups
    const recordMap = new Map<string, string>();
    classRecords.forEach((r) => {
      recordMap.set(`${r.studentId}-${r.tanggal}`, r.status);
    });

    // 6. Aggregate data per student
    const result = siswaKelas.map((siswa) => {
      const history: Record<string, string> = {};
      uniqueDates.forEach((date) => {
        const status = recordMap.get(`${siswa.id}-${date}`);
        history[date] = status || "-"; // "-" if no record for that student on that date
      });

      return {
        id: siswa.id,
        nis: siswa.nis,
        nama: siswa.nama,
        history,
      };
    });

    return NextResponse.json({ dates: uniqueDates, records: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memuat riwayat absensi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
