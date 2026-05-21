import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, attendance, academicYears } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/students/me/attendance — get raw attendance records for the logged-in student
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

  // Get all attendance records for this student, descending by date, filtered by period
  const allRecords = await db
    .select({
      id: attendance.id,
      tanggal: attendance.tanggal,
      mapel: attendance.mapel,
      status: attendance.status,
      periode: attendance.periode,
    })
    .from(attendance)
    .where(
      and(
        eq(attendance.studentId, student.id),
        eq(attendance.periode, periode)
      )
    )
    .orderBy(desc(attendance.tanggal))
    .all();

  return NextResponse.json(allRecords);
}
