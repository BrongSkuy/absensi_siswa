import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, attendance, academicYears } from "@/db/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/students/me/attendance-stats — attendance statistics for the logged-in student
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole;
  if (appRole !== "SISWA") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find student profile
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.userId, session.user.id));

  if (!student) {
    return NextResponse.json(
      { error: "Profil siswa tidak ditemukan" },
      { status: 404 }
    );
  }

  // Get active period
  const [activeYear] = await db
    .select()
    .from(academicYears)
    .where(eq(academicYears.isActive, true));
  const periode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : "2025/2026-Genap";

  // Get all attendance records for this student in the active period
  const allRecords = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.studentId, student.id),
        eq(attendance.periode, periode)
      )
    );

  // Count per status
  const totalHadir = allRecords.filter((r) => r.status === "Hadir").length;
  const totalIzin = allRecords.filter((r) => r.status === "Izin").length;
  const totalSakit = allRecords.filter((r) => r.status === "Sakit").length;
  const totalAlfa = allRecords.filter((r) => r.status === "Alfa").length;
  const totalRecords = allRecords.length;

  const persentaseKehadiran =
    totalRecords > 0 ? Math.round((totalHadir / totalRecords) * 100) : 0;

  // Daily breakdown for chart (group by YYYY-MM-DD), starting from first record
  const dailyMap = new Map<
    string,
    { hadir: number; izin: number; sakit: number; alfa: number }
  >();

  for (const r of allRecords) {
    const dateKey = r.tanggal; // "YYYY-MM-DD"
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, { hadir: 0, izin: 0, sakit: 0, alfa: 0 });
    }
    const entry = dailyMap.get(dateKey)!;
    switch (r.status) {
      case "Hadir":
        entry.hadir++;
        break;
      case "Izin":
        entry.izin++;
        break;
      case "Sakit":
        entry.sakit++;
        break;
      case "Alfa":
        entry.alfa++;
        break;
    }
  }

  const bulanNames: Record<string, string> = {
    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
    "05": "Mei", "06": "Jun", "07": "Jul", "08": "Agu",
    "09": "Sep", "10": "Okt", "11": "Nov", "12": "Des",
  };

  // Sort chronologically and format label as "DD Mon"
  const dailyData = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => {
      const parts = key.split("-");
      const day = parseInt(parts[2], 10);
      const monthLabel = bulanNames[parts[1]] || parts[1];
      return {
        tanggal: `${day} ${monthLabel}`,
        ...val,
      };
    });

  return NextResponse.json({
    totalHadir,
    totalIzin,
    totalSakit,
    totalAlfa,
    totalRecords,
    persentaseKehadiran,
    dailyData,
  });
}
