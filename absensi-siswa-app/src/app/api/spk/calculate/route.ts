import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { academicYears, spkPublishStatus, spkResults, students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { DEFAULT_PERIODE } from "@/lib/utils";

import { calculateSPK, validateSPKCriteriaFilled } from "@/lib/spk";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const kelas = searchParams.get("kelas");
  if (!kelas) return NextResponse.json({ error: "Parameter kelas wajib" }, { status: 400 });

  const appRole = (session.user as Record<string, unknown>)?.appRole;
  const isAdmin = 
    session.user.role === "admin" || 
    session.user.role === "super_admin" || 
    appRole === "ADMIN" || 
    appRole === "SUPER_ADMIN";

  try {
    // 1. Get active academic period
    const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
    const activePeriode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : DEFAULT_PERIODE;

    // 2. Handle Admin role (gets real-time calculation + validation details)
    if (isAdmin) {
      const results = await calculateSPK(kelas, activePeriode);
      const validation = await validateSPKCriteriaFilled(kelas, activePeriode);
      return NextResponse.json({ results, validation, activePeriode });
    }

    // 3. Handle non-admin role (Students / Teachers) -> strict non-real-time cached view
    const [pubStatus] = await db.select().from(spkPublishStatus).where(eq(spkPublishStatus.periode, activePeriode));
    const isPublished = pubStatus?.isPublished ?? false;

    if (!isPublished) {
      return NextResponse.json({ isPublished: false, error: "Leaderboard belum dipublikasikan oleh pihak sekolah.", activePeriode });
    }

    // Fetch from published cache
    const cachedRows = await db.select({
      studentId: spkResults.studentId,
      nis: students.nis,
      namaLengkap: students.namaLengkap,
      kelas: spkResults.kelas,
      rawScore: spkResults.rawScore,
      persentase: spkResults.persentase,
      rank: spkResults.rank,
      details: spkResults.details
    })
    .from(spkResults)
    .innerJoin(students, eq(spkResults.studentId, students.id))
    .where(eq(spkResults.periode, activePeriode))
    .all();

    // Determine target classes
    let finalResults = cachedRows;
    const targetKelas = kelas.toLowerCase();

    if (targetKelas !== "umum" && targetKelas !== "all") {
      // Filter by class and re-rank dynamically
      finalResults = cachedRows.filter(r => r.kelas.toLowerCase() === targetKelas);
      finalResults.sort((a, b) => b.rawScore - a.rawScore);
      
      const mapped = finalResults.map((r, idx) => {
        let detailRaw = {};
        if (r.details) {
          try {
            detailRaw = JSON.parse(r.details);
          } catch {}
        }
        return {
          studentId: r.studentId,
          nis: r.nis,
          namaLengkap: r.namaLengkap,
          kelas: r.kelas,
          rawScore: r.rawScore,
          persentase: r.persentase,
          rank: idx + 1,
          detailRaw
        };
      });
      return NextResponse.json({ isPublished: true, data: mapped, activePeriode });
    } else {
      // Return global rankings
      finalResults.sort((a, b) => a.rank - b.rank);
      const mapped = finalResults.map((r) => {
        let detailRaw = {};
        if (r.details) {
          try {
            detailRaw = JSON.parse(r.details);
          } catch {}
        }
        return {
          studentId: r.studentId,
          nis: r.nis,
          namaLengkap: r.namaLengkap,
          kelas: r.kelas,
          rawScore: r.rawScore,
          persentase: r.persentase,
          rank: r.rank,
          detailRaw
        };
      });
      return NextResponse.json({ isPublished: true, data: mapped, activePeriode });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memproses SPK";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/spk/calculate — trigger SPK calculation (Admin only)
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appRole = (session.user as Record<string, unknown>)?.appRole;
  const isAdmin =
    session.user.role === "admin" ||
    session.user.role === "super_admin" ||
    appRole === "ADMIN" ||
    appRole === "SUPER_ADMIN";

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delegate to GET logic for actual calculation
  const { searchParams } = new URL(request.url);
  const kelas = searchParams.get("kelas");
  if (!kelas) return NextResponse.json({ error: "Parameter kelas wajib" }, { status: 400 });

  try {
    const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
    const activePeriode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : DEFAULT_PERIODE;
    const results = await calculateSPK(kelas, activePeriode);
    const validation = await validateSPKCriteriaFilled(kelas, activePeriode);
    return NextResponse.json({ results, validation, activePeriode });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memproses SPK";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
