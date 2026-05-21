import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, teachers, attendance, academicYears } from "@/db/schema";
import { eq, sql, count, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/dashboard/stats — dashboard statistics
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Count active students
  const [studentCount] = await db
    .select({ count: count() })
    .from(students)
    .where(eq(students.status, "aktif"));

  // Count active teachers
  const [teacherCount] = await db
    .select({ count: count() })
    .from(teachers)
    .where(eq(teachers.status, "aktif"));

  // Get active period
  const [activeYear] = await db
    .select()
    .from(academicYears)
    .where(eq(academicYears.isActive, true));
  const periode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : "2025/2026-Genap";

  // Today's attendance percentage
  const today = new Date().toLocaleDateString('en-CA'); // Get YYYY-MM-DD
  const [todayAttendance] = await db
    .select({ count: count() })
    .from(attendance)
    .where(
      sql`${attendance.tanggal} = ${today} AND ${attendance.periode} = ${periode}`
    );

  const [todayHadir] = await db
    .select({ count: count() })
    .from(attendance)
    .where(
      sql`${attendance.tanggal} = ${today} AND ${attendance.status} = 'Hadir' AND ${attendance.periode} = ${periode}`
    );

  const kehadiranPersen = todayAttendance.count > 0
    ? Math.round((todayHadir.count / todayAttendance.count) * 100)
    : 0;

  // All-time attendance trend (grouped by date) for the active period
  const allDates = await db
    .select({ tanggal: attendance.tanggal })
    .from(attendance)
    .where(eq(attendance.periode, periode))
    .groupBy(attendance.tanggal)
    .orderBy(sql`${attendance.tanggal} ASC`);

  const weeklyAttendance = [];
  for (const row of allDates) {
    const records = await db.select().from(attendance).where(sql`${attendance.tanggal} = ${row.tanggal} AND ${attendance.periode} = ${periode}`);
    const hadir = records.filter((r) => r.status === "Hadir").length;
    const izin = records.filter((r) => r.status === "Izin").length;
    const sakit = records.filter((r) => r.status === "Sakit").length;
    const alfa = records.filter((r) => r.status === "Alfa").length;
    
    // Parse "YYYY-MM-DD" safely
    const dObj = new Date(row.tanggal);
    const hari = isNaN(dObj.getTime()) ? row.tanggal : dObj.toLocaleDateString("id-ID", { day: 'numeric', month: 'short' });
    
    weeklyAttendance.push({ hari, hadir, izin, sakit, alfa });
  }

  return NextResponse.json({
    totalSiswa: studentCount.count,
    totalGuru: teacherCount.count,
    kehadiranHariIni: kehadiranPersen,
    tahunAjaran: periode,
    weeklyAttendance,
  });
}

