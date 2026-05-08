import { NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/students/me — get the logged-in student's profile
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole;
  if (appRole !== "SISWA") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find student profile linked to the authenticated user
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

  return NextResponse.json({
    id: student.id,
    nis: student.nis,
    namaLengkap: student.namaLengkap,
    kelas: student.kelas,
    angkatan: student.angkatan,
    jenisKelamin: student.jenisKelamin,
    status: student.status,
  });
}
