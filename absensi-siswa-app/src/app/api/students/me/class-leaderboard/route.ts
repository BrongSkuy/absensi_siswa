import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, attendance } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { calculateSPK } from "@/lib/spk";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole;
  if (appRole !== "SISWA") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find student profile to get class
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.userId, session.user.id));

  if (!student) {
    return NextResponse.json({ error: "Profil siswa tidak ditemukan" }, { status: 404 });
  }

  // Fetch from REAL SPK Calculator
  const spkResults = await calculateSPK(student.kelas);

  const leaderboard = spkResults.map(r => ({
      rank: r.rank,
      studentId: r.studentId,
      namaLengkap: r.namaLengkap,
      kelas: r.kelas,
      skorSPK: r.persentase,
  }));

  return NextResponse.json(leaderboard);
}
