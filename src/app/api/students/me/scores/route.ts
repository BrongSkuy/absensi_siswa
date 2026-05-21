import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, spkScores, spkCriteria, academicYears, attendance } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/students/me/scores — get the logged-in student's detailed scores
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

  try {
    // Get active academic year
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.isActive, true));

    if (!activeYear) {
      return NextResponse.json({
        student: {
          id: student.id,
          nis: student.nis,
          namaLengkap: student.namaLengkap,
          kelas: student.kelas,
        },
        periode: null,
        criteria: [],
        kehadiran: null,
      });
    }

    const periode = `${activeYear.tahunAjaran}-${activeYear.semester}`;

    // 1. Get all criteria
    const allCriteria = await db.select().from(spkCriteria).all();

    // 2. Get all student's scores in this period
    const studentScores = await db
      .select()
      .from(spkScores)
      .where(eq(spkScores.studentId, student.id))
      .all();

    const periodScores = studentScores.filter((s) => s.periode === periode);

    // 3. Get attendance stats for the "Kehadiran" criteria
    const allAttendance = await db
      .select()
      .from(attendance)
      .where(eq(attendance.studentId, student.id))
      .all();

    const periodAttendance = allAttendance.filter((a) => a.periode === periode);

    let totalHadir = 0;
    let totalIzin = 0;
    let totalSakit = 0;
    let totalAlfa = 0;

    periodAttendance.forEach((a) => {
      if (a.status === "Hadir") totalHadir++;
      else if (a.status === "Izin") totalIzin++;
      else if (a.status === "Sakit") totalSakit++;
      else if (a.status === "Alfa") totalAlfa++;
    });

    const totalRecords = totalHadir + totalIzin + totalSakit + totalAlfa;
    const persentaseKehadiran =
      totalRecords > 0 ? Math.round((totalHadir / totalRecords) * 100) : 0;

    // 4. Build criteria result with scores
    const criteriaResult = allCriteria.map((c) => {
      const crScores = periodScores.filter((s) => s.criteriaId === c.id);

      // Group by mapel
      const mapelScores: Record<string, number> = {};
      crScores.forEach((s) => {
        const key = s.mapel || "Umum";
        mapelScores[key] = s.nilai;
      });

      // Calculate average if multiple scores
      let nilaiRataRata = 0;
      if (crScores.length > 0) {
        nilaiRataRata = Math.round(
          crScores.reduce((acc, curr) => acc + curr.nilai, 0) / crScores.length
        );
      }

      // For "Kehadiran" (Otomatis), use attendance percentage
      if (c.tipe === "Otomatis" && c.namaKriteria === "Kehadiran") {
        nilaiRataRata = persentaseKehadiran;
      }

      return {
        id: c.id,
        namaKriteria: c.namaKriteria,
        bobot: c.bobot,
        tipe: c.tipe,
        deskripsi: c.deskripsi,
        nilaiRataRata,
        detailMapel: mapelScores,
        nilaiTerbobot: Math.round((nilaiRataRata * c.bobot) / 100),
      };
    });

    // 5. Calculate total weighted score
    const totalSkorSPK = criteriaResult.reduce(
      (acc, c) => acc + c.nilaiTerbobot,
      0
    );

    return NextResponse.json({
      student: {
        id: student.id,
        nis: student.nis,
        namaLengkap: student.namaLengkap,
        kelas: student.kelas,
      },
      periode: `${activeYear.tahunAjaran} - ${activeYear.semester}`,
      criteria: criteriaResult,
      kehadiran: {
        hadir: totalHadir,
        izin: totalIzin,
        sakit: totalSakit,
        alfa: totalAlfa,
        total: totalRecords,
        persentase: persentaseKehadiran,
      },
      totalSkorSPK,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal memuat nilai siswa";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
