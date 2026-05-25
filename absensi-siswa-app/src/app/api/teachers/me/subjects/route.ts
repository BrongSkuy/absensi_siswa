import { NextResponse } from "next/server";
import { db } from "@/db";
import { teachers, subjects as mapelSubjects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  const appRole = (session?.user as Record<string, unknown>)?.appRole;
  if (!session || appRole !== "GURU") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get teacher profile
  const [teacherProfile] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.userId, session.user.id));

  if (!teacherProfile) {
    return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
  }

  // Check if teacher is waliKelas for any class
  const { classes } = await import("@/db/schema");
  const waliKelasCheck = await db
    .select()
    .from(classes)
    .where(eq(classes.waliKelas, teacherProfile.namaLengkap));

  const waliClasses = waliKelasCheck.map((c) => c.namaKelas);

  // Get explicitly assigned subjects and classes
  const mySubjects = await db
    .select({ namaMapel: mapelSubjects.namaMapel, kelas: mapelSubjects.kelasDiampu })
    .from(mapelSubjects)
    .where(eq(mapelSubjects.teacherId, teacherProfile.id));

  const assignedClasses = new Set<string>();
  const subjectNames = new Set<string>();

  for (const s of mySubjects) {
    subjectNames.add(s.namaMapel);
    if (s.kelas) {
      s.kelas.split(",").forEach(k => {
        if (k.trim()) assignedClasses.add(k.trim());
      });
    }
  }

  // Combine waliClasses and assignedClasses uniquely
  const teacherClassNames = Array.from(new Set([...waliClasses, ...Array.from(assignedClasses)]));

  // Get unique subjects mapped to this teacher with class lists
  const subjects = mySubjects.map(s => ({
    namaMapel: s.namaMapel,
    kelas: s.kelas ? s.kelas.split(",").map(k => k.trim()) : []
  }));

  return NextResponse.json({
    waliClasses,
    isWaliKelas: waliClasses.length > 0, // Keep for backward compatibility if needed
    classes: teacherClassNames,
    subjects,
  });
}
