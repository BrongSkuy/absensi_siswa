import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, spkPublishStatus, academicYears } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { calculateSPK } from "@/lib/spk";
import { DEFAULT_PERIODE } from "@/lib/utils";

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

  // Get active period
  const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
  const activePeriode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : DEFAULT_PERIODE;

  // Verify publish status
  const [publishStatus] = await db
    .select()
    .from(spkPublishStatus)
    .where(eq(spkPublishStatus.periode, activePeriode));

  if (!publishStatus || !publishStatus.isPublished) {
    return NextResponse.json({ error: "Leaderboard belum dipublikasikan oleh Admin" }, { status: 403 });
  }

  // Fetch from REAL SPK Calculator
  const spkResults = await calculateSPK(student.kelas, activePeriode);

  const leaderboard = spkResults.map(r => ({
      rank: r.rank,
      studentId: r.studentId,
      namaLengkap: r.namaLengkap,
      kelas: r.kelas,
      skorSPK: r.persentase,
  }));

  return NextResponse.json(leaderboard);
}
