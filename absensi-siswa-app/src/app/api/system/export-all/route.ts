import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, teachers, attendance, spkScores, spkCriteria, classes, subjects, spkGradingCategories } from "@/db/schema";
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
    const allGradingCats = await db.select().from(spkGradingCategories);

    const wb = XLSX.utils.book_new();

    // Pre-create Maps to optimize lookups to O(1)
    const studentMap = new Map(allStudents.map(s => [s.id, s]));
    const teacherMap = new Map(allTeachers.map(t => [t.id, t]));
    const criteriaMap = new Map(allCriteria.map(c => [c.id, c]));

    // Group teacher subjects by teacherId
    const teacherSubjsMap = new Map<string, string[]>();
    for (const ts of allSubjects) {
      if (!ts.teacherId) continue;
      let subjs = teacherSubjsMap.get(ts.teacherId);
      if (!subjs) {
        subjs = [];
        teacherSubjsMap.set(ts.teacherId, subjs);
      }
      subjs.push(ts.namaMapel);
    }

    // Map of mapel to classes where attendance has been taken
    const mapelClassesMap = new Map<string, Set<string>>();
    for (const att of allAttendance) {
      if (att.mapel) {
        const student = studentMap.get(att.studentId);
        if (student?.kelas) {
          let set = mapelClassesMap.get(att.mapel);
          if (!set) {
            set = new Set();
            mapelClassesMap.set(att.mapel, set);
          }
          set.add(student.kelas);
        }
      }
    }

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
    const mapelData = allSubjects.map(s => {
      const teacher = s.teacherId ? teacherMap.get(s.teacherId) : null;
      return {
        ID: s.id,
        NamaMapel: s.namaMapel,
        GuruPengampu: teacher ? teacher.namaLengkap : "",
        KelasDiampu: s.kelasDiampu || "",
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mapelData.length > 0 ? mapelData : [{}]), "Data Mapel");

    // Sheet 5: Absensi
    const absensiData = allAttendance.map(a => {
      const student = studentMap.get(a.studentId);
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
      const student = studentMap.get(sc.studentId);
      const crit = criteriaMap.get(sc.criteriaId);
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

    // 2) From subjects table
    for (const teacher of allTeachers) {
      const mySubjects = allSubjects.filter(s => s.teacherId === teacher.id);
      const classesFromSubjects = new Set<string>();
      
      for (const s of mySubjects) {
         if (s.kelasDiampu) {
            s.kelasDiampu.split(",").forEach(k => {
               if (k.trim()) classesFromSubjects.add(k.trim());
            });
         }
      }

      for (const kelasName of classesFromSubjects) {
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
    const tSubjData = allSubjects.filter(s => s.teacherId).map(ts => {
      const teacher = teacherMap.get(ts.teacherId!);
      return { NIP: teacher?.nip || ts.teacherId, NamaGuru: teacher?.namaLengkap || "-", Mapel: ts.namaMapel, KelasDiampu: ts.kelasDiampu || "-" };
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
      const classStudents = spkLeaderboard.filter(d => d.kelas === c.namaKelas);
      // Re-sort and rank them for this specific class
      const sortedClass = classStudents.sort((a, b) => b.rawScore - a.rawScore);
      const spkClass = sortedClass.map((s, idx) => ({ ...s, rank: idx + 1 }));

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
