import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendance, students, academicYears, spkScores, spkCriteria } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/attendance/rekap?kelas=X-A
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const kelas = searchParams.get("kelas");
  if (!kelas) {
    return NextResponse.json({ error: "Kelas waji diisi" }, { status: 400 });
  }

  try {
    const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
    if (!activeYear) return NextResponse.json([]); // Strict active year requirement
    const periode = `${activeYear.tahunAjaran}-${activeYear.semester}`;

    // 1. Get all students in this class
    const siswaKelas = await db
      .select({
        id: students.id,
        nama: students.namaLengkap,
        nis: students.nis,
      })
      .from(students)
      .where(eq(students.kelas, kelas))
      .all();

    if (siswaKelas.length === 0) {
      return NextResponse.json([]);
    }

    // 2. Get all attendance records for these students in this PERIODE
    const mAtt = await db.select().from(attendance).where(eq(attendance.periode, periode)).all();
    let existingRecords = mAtt.filter((a) => siswaKelas.some(s => s.id === a.studentId));

    const tanggal = searchParams.get("tanggal");
    if (tanggal) {
      existingRecords = existingRecords.filter((a) => a.tanggal === tanggal);
    }

    // 3. Get spkScores
    const mScores = await db.select().from(spkScores).where(eq(spkScores.periode, periode)).all();
    const mCriteria = await db.select().from(spkCriteria).where(eq(spkCriteria.tipe, "Manual")).all();
    const existingScores = mScores.filter((sc) => siswaKelas.some(s => s.id === sc.studentId));

    // 4. Aggregate data per student
    const result = siswaKelas.map((siswa) => {
      let hadir = 0;
      let izin = 0;
      let sakit = 0;
      let alfa = 0;

      const records = existingRecords.filter((r) => r.studentId === siswa.id);
      
      records.forEach((r) => {
        if (r.status === "Hadir") hadir++;
        else if (r.status === "Izin") izin++;
        else if (r.status === "Sakit") sakit++;
        else if (r.status === "Alfa") alfa++;
      });

      const total = hadir + izin + sakit + alfa;
      const persen = total > 0 ? Math.round((hadir / total) * 100) : 0;

      // Extract specific scores logic
      const studentScores: Record<string, number> = {};
      mCriteria.forEach(c => {
         const crScores = existingScores.filter(sc => sc.studentId === siswa.id && sc.criteriaId === c.id);
         if (crScores.length > 0) {
            const sum = crScores.reduce((acc, curr) => acc + curr.nilai, 0);
            studentScores[c.namaKriteria] = Math.round(sum / crScores.length);
         } else {
            studentScores[c.namaKriteria] = 0;
         }
      });

      return {
        id: siswa.id,
        nama: siswa.nama,
        nis: siswa.nis,
        hadir,
        izin,
        sakit,
        alfa,
        persen,
        nilai: studentScores,
      };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memuat rekap kelas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
