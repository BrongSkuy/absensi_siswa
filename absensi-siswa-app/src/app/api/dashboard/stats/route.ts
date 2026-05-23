import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, teachers, attendance, academicYears } from "@/db/schema";
import { eq, sql, count, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getTodayWIB } from "@/lib/utils";

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

  // Today's attendance percentage (using WIB timezone)
  const today = getTodayWIB();
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
  const allPeriodAttendance = await db
    .select({ 
      tanggal: attendance.tanggal, 
      status: attendance.status, 
      count: count() 
    })
    .from(attendance)
    .where(eq(attendance.periode, periode))
    .groupBy(attendance.tanggal, attendance.status)
    .orderBy(sql`${attendance.tanggal} ASC`);

  const attendanceMap: Record<string, { hadir: number, izin: number, sakit: number, alfa: number }> = {};
  for (const row of allPeriodAttendance) {
    if (!attendanceMap[row.tanggal]) {
       attendanceMap[row.tanggal] = { hadir: 0, izin: 0, sakit: 0, alfa: 0 };
    }
    const st = row.status ? row.status.toLowerCase() : 'alfa';
    if (st === 'hadir' || st === 'izin' || st === 'sakit' || st === 'alfa') {
        attendanceMap[row.tanggal][st] = row.count;
    }
  }

  const weeklyAttendance = Object.keys(attendanceMap).sort().map(tanggal => {
    const dObj = new Date(tanggal);
    const hari = isNaN(dObj.getTime()) ? tanggal : dObj.toLocaleDateString("id-ID", { day: 'numeric', month: 'short' });
    return {
      hari,
      hadir: attendanceMap[tanggal].hadir,
      izin: attendanceMap[tanggal].izin,
      sakit: attendanceMap[tanggal].sakit,
      alfa: attendanceMap[tanggal].alfa
    };
  });

  return NextResponse.json({
    totalSiswa: studentCount.count,
    totalGuru: teacherCount.count,
    kehadiranHariIni: kehadiranPersen,
    tahunAjaran: periode,
    weeklyAttendance,
  });
}

