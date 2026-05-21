import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, teachers, attendance, spkScores, spkCriteria, classes, subjects, teacherClasses, teacherSubjects, spkGradingCategories } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import * as XLSX from "xlsx";
import { calculateSPK } from "@/lib/spk";
import { getTodayWIB } from "@/lib/utils";

// GET /api/system/export-all — Export all operational data as a multi-sheet Excel file
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Fetch all data
    const allStudents = await db.select().from(students);
    const allTeachers = await db.select().from(teachers);
    const allClasses = await db.select().from(classes);
    const allSubjects = await db.select().from(subjects);
    const allAttendance = await db.select().from(attendance);
    const allScores = await db.select().from(spkScores);
    const allCriteria = await db.select().from(spkCriteria);
    const allTeacherClasses = await db.select().from(teacherClasses);
    const allTeacherSubjects = await db.select().from(teacherSubjects);
    const allGradingCats = await db.select().from(spkGradingCategories);

    const wb = XLSX.utils.book_new();

    // Sheet 1: Siswa
    const siswaData = allStudents.map(s => ({
      ID: s.id,
      NIS: s.nis,
      NamaLengkap: s.namaLengkap,
      Kelas: s.kelas,
      Angkatan: s.angkatan,
      JenisKelamin: s.jenisKelamin,
      Status: s.status,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(siswaData.length > 0 ? siswaData : [{}]), "Data Siswa");

    // Sheet 2: Guru
    const guruData = allTeachers.map(t => ({
      ID: t.id,
      NIP: t.nip,
      NamaLengkap: t.namaLengkap,
      Status: t.status,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(guruData.length > 0 ? guruData : [{}]), "Data Guru");

    // Sheet 3: Kelas
    const kelasData = allClasses.map(c => ({
      ID: c.id,
      NamaKelas: c.namaKelas,
      Tingkat: c.tingkat,
      WaliKelas: c.waliKelas || "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kelasData.length > 0 ? kelasData : [{}]), "Data Kelas");

    // Sheet 4: Mapel
    const mapelData = allSubjects.map(s => ({
      ID: s.id,
      NamaMapel: s.namaMapel,
      GuruPengampu: s.guruPengampu || "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mapelData.length > 0 ? mapelData : [{}]), "Data Mapel");

    // Sheet 5: Absensi
    const absensiData = allAttendance.map(a => {
      const student = allStudents.find(s => s.id === a.studentId);
      return {
        Tanggal: a.tanggal,
        NIS: student?.nis || a.studentId,
        NamaSiswa: student?.namaLengkap || "-",
        Mapel: a.mapel || "Umum",
        Status: a.status,
        Periode: a.periode,
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(absensiData.length > 0 ? absensiData : [{}]), "Data Absensi");

    // Sheet 6: Nilai SPK
    const nilaiData = allScores.map(sc => {
      const student = allStudents.find(s => s.id === sc.studentId);
      const crit = allCriteria.find(c => c.id === sc.criteriaId);
      return {
        NIS: student?.nis || sc.studentId,
        NamaSiswa: student?.namaLengkap || "-",
        Kriteria: crit?.namaKriteria || sc.criteriaId,
        Mapel: sc.mapel || "Umum",
        Nilai: sc.nilai,
        Details: sc.details || "",
        Periode: sc.periode,
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(nilaiData.length > 0 ? nilaiData : [{}]), "Data Nilai");

    // Sheet 7: Kriteria SPK
    const criteriaData = allCriteria.map(c => ({
      ID: c.id,
      NamaKriteria: c.namaKriteria,
      Bobot: c.bobot,
      Tipe: c.tipe,
      Deskripsi: c.deskripsi || "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(criteriaData.length > 0 ? criteriaData : [{}]), "Kriteria SPK");

    // Sheet 8: Penugasan Guru-Kelas (derived from waliKelas + attendance-based assignments)
    const guruKelasRows: { NIP: string; NamaGuru: string; Kelas: string; Peran: string }[] = [];

    // 1) From waliKelas assignments in classes table
    for (const cls of allClasses) {
      if (cls.waliKelas) {
        const teacher = allTeachers.find(t => t.namaLengkap === cls.waliKelas);
        guruKelasRows.push({
          NIP: teacher?.nip || "-",
          NamaGuru: cls.waliKelas,
          Kelas: cls.namaKelas,
          Peran: "Wali Kelas",
        });
      }
    }

    // 2) From attendance records: find which classes each teacher's subjects have been used in
    for (const teacher of allTeachers) {
      const teacherSubjNames = allTeacherSubjects
        .filter(ts => ts.teacherId === teacher.id)
        .map(ts => ts.namaMapel);

      if (teacherSubjNames.length === 0) continue;

      // Find distinct classes from attendance where mapel matches teacher's subjects
      const classesFromAtt = new Set<string>();
      for (const att of allAttendance) {
        if (att.mapel && teacherSubjNames.includes(att.mapel)) {
          const student = allStudents.find(s => s.id === att.studentId);
          if (student?.kelas) classesFromAtt.add(student.kelas);
        }
      }

      for (const kelasName of classesFromAtt) {
        // Avoid duplicate if already added as waliKelas
        const alreadyAdded = guruKelasRows.some(
          r => r.NamaGuru === teacher.namaLengkap && r.Kelas === kelasName
        );
        if (!alreadyAdded) {
          guruKelasRows.push({
            NIP: teacher.nip,
            NamaGuru: teacher.namaLengkap,
            Kelas: kelasName,
            Peran: "Guru Mapel",
          });
        }
      }
    }

    // Sheet 8b: Guru-Mapel
    const tSubjData = allTeacherSubjects.map(ts => {
      const teacher = allTeachers.find(t => t.id === ts.teacherId);
      return { NIP: teacher?.nip || ts.teacherId, NamaGuru: teacher?.namaLengkap || "-", Mapel: ts.namaMapel, Periode: ts.periode };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(guruKelasRows.length > 0 ? guruKelasRows : [{}]), "Guru-Kelas");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tSubjData.length > 0 ? tSubjData : [{}]), "Guru-Mapel");

    // Sheet 9: Leaderboard SPK (Umum)
    const spkLeaderboard = await calculateSPK("umum");
    const leaderboardData = spkLeaderboard.map(d => ({
      Rank: d.rank,
      NIS: d.nis,
      NamaSiswa: d.namaLengkap,
      Kelas: d.kelas,
      Skor_SPK: d.rawScore,
      Persentase: d.persentase + "%",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(leaderboardData.length > 0 ? leaderboardData : [{}]), "Leaderboard Umum");

    // Leaderboards for each class
    for (const c of allClasses) {
      const spkClass = await calculateSPK(c.namaKelas);
      const classData = spkClass.map(d => ({
        Rank: d.rank,
        NIS: d.nis,
        NamaSiswa: d.namaLengkap,
        Skor_SPK: d.rawScore,
        Persentase: d.persentase + "%",
      }));
      // Excel sheet names have a max length of 31 characters. Avoid long names.
      const sheetName = `Leaderboard ${c.namaKelas}`.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(classData.length > 0 ? classData : [{}]), sheetName);
    }

    // Generate buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Export_Seluruh_Data_${getTodayWIB()}.xlsx"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal export data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
