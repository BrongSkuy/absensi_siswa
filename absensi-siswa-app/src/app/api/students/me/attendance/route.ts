import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, attendance } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
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

  // Get all attendance records for this student, descending by date
  const allRecords = await db
    .select({
      id: attendance.id,
      tanggal: attendance.tanggal,
      mapel: attendance.mapel,
      status: attendance.status,
    })
    .from(attendance)
    .where(eq(attendance.studentId, student.id))
    .orderBy(desc(attendance.tanggal))
    .all();

  return NextResponse.json(allRecords);
}
