import { NextResponse } from "next/server";
import { db } from "@/db";
import { teachers, classes, attendance, students, subjects, academicYears } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getTodayWIB } from "@/lib/utils";

// GET /api/teachers/me/dashboard — get dashboard stats & classes for logged in teacher
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole;
  if (appRole !== "GURU" && appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 1. Get teacher profile
    const [teacher] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.userId, session.user.id));

    // Get active period
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.isActive, true));
    const periode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : "2025/2026-Genap";

    let assignedClasses: { id: string; namaKelas: string; tingkat: string; waliKelas: string | null; subjects: string[] }[] = [];
    let teacherSubjectNames: string[] = [];

    if (teacher) {
      // 1. Get subjects & classes explicitly assigned to teacher
      const mySubjects = await db
        .select({ mapel: subjects.namaMapel, kelas: subjects.kelasDiampu })
        .from(subjects)
        .where(eq(subjects.teacherId, teacher.id))
        .all();
      
      teacherSubjectNames = mySubjects.map(s => s.mapel);

      const assignedKelasNamesSet = new Set<string>();
      for (const s of mySubjects) {
         if (s.kelas) {
            s.kelas.split(",").forEach(k => {
               if (k.trim()) assignedKelasNamesSet.add(k.trim());
            });
         }
      }
      const assignedKelasNames = Array.from(assignedKelasNamesSet);

      // 3. Get classes where teacher is Wali Kelas
      const myWaliClasses = await db
        .select()
        .from(classes)
        .where(eq(classes.waliKelas, teacher.namaLengkap))
        .all();
      
      const waliKelasNames = myWaliClasses.map(c => c.namaKelas);

      // 4. Find classes where attendance has been taken (legacy fallback)
      let attendedKelasNames: string[] = [];
      if (teacherSubjectNames.length > 0) {
         const attRows = await db
            .select({ kelas: students.kelas })
            .from(attendance)
            .innerJoin(students, eq(attendance.studentId, students.id))
            .where(
               and(
                 inArray(attendance.mapel, teacherSubjectNames),
                 eq(attendance.periode, periode)
               )
            )
            .all();
         attendedKelasNames = [...new Set(attRows.map(r => r.kelas))];
      }

      // Combine all unique class names
      const allClassNames = [...new Set([...assignedKelasNames, ...waliKelasNames, ...attendedKelasNames])];

      if (allClassNames.length > 0) {
        const fullClasses = await db
          .select()
          .from(classes)
          .where(inArray(classes.namaKelas, allClassNames))
          .all();
        
        assignedClasses = fullClasses
          .map(c => {
            const classSubjects: string[] = [];
            
            // Filter mySubjects that apply to this class c.namaKelas
            for (const s of mySubjects) {
              if (s.kelas) {
                const classesList = s.kelas.split(",").map(k => k.trim());
                if (classesList.includes(c.namaKelas)) {
                  classSubjects.push(s.mapel);
                }
              }
            }

            if (c.waliKelas === teacher.namaLengkap) {
              if (!classSubjects.includes("Umum")) {
                 classSubjects.push("Umum");
              }
            }

            return {
              id: c.id,
              namaKelas: c.namaKelas,
              tingkat: c.tingkat,
              waliKelas: c.waliKelas,
              subjects: [...new Set(classSubjects)],
            };
          })
          .filter(c => c.subjects.length > 0);
      }
    } else if (appRole === "ADMIN") {
       const allFullClasses = await db.select().from(classes).all();
       assignedClasses = allFullClasses.map(c => ({
          id: c.id,
          namaKelas: c.namaKelas,
          tingkat: c.tingkat,
          waliKelas: c.waliKelas,
          subjects: ["Semua Mapel (Admin)"],
       }));
    }

    // 2. Check today's attendance for those classes
    const today = getTodayWIB();
    const classesStatus = [];
    let classesDiabsen = 0;

    const classNames = assignedClasses.map(c => c.namaKelas);
    let allAttendanceToday: Array<{ id: string, kelas: string, mapel: string | null }> = [];
    
    if (classNames.length > 0) {
      allAttendanceToday = await db
        .select({ id: attendance.id, kelas: students.kelas, mapel: attendance.mapel })
        .from(attendance)
        .innerJoin(students, eq(attendance.studentId, students.id))
        .where(
           and(
              inArray(students.kelas, classNames),
              eq(attendance.tanggal, today)
           )
        )
        .all();
    }

    for (const c of assignedClasses) {
      const relevantMapels = [...c.subjects];
      
      let hasAttendance = false;
      if (relevantMapels.length > 0) {
         hasAttendance = allAttendanceToday.some(a => a.kelas === c.namaKelas && relevantMapels.includes(a.mapel || ""));
      } else if (appRole === "ADMIN") {
         hasAttendance = allAttendanceToday.some(a => a.kelas === c.namaKelas);
      }

      if (hasAttendance) {
         classesDiabsen++;
         classesStatus.push({ ...c, statusAbsensiHariIni: "Sudah Diabsen" });
      } else {
         classesStatus.push({ ...c, statusAbsensiHariIni: "Belum Diabsen" });
      }
    }

    // Calculate generic rata-rata kehadiran
    let rataRataKehadiran = "-";
    if (assignedClasses.length > 0) {
       const classNames = assignedClasses.map(c => c.namaKelas);
       const properAtt = await db
          .select({ status: attendance.status })
          .from(attendance)
          .innerJoin(students, eq(attendance.studentId, students.id))
          .where(
             and(
               inArray(students.kelas, classNames.length > 0 ? classNames : ["__empty__"]),
               eq(attendance.periode, periode)
             )
          )
          .all();
          
       if (properAtt.length > 0) {
          const hadir = properAtt.filter(a => a.status === "Hadir").length;
          rataRataKehadiran = Math.round((hadir / properAtt.length) * 100) + "%";
       } else {
          rataRataKehadiran = "0%";
       }
    }

    return NextResponse.json({
      totalKelasDiampu: assignedClasses.length,
      sudahDiabsenHariIni: classesDiabsen,
      rataRataKehadiran,
      classes: classesStatus,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengambil data dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
