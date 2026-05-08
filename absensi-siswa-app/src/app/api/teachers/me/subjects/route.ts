import { NextResponse } from "next/server";
import { db } from "@/db";
import { teacherSubjects, teachers } from "@/db/schema";
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

  // Get subjects mapped to this teacher
  const subjects = await db
    .select({ namaMapel: teacherSubjects.namaMapel })
    .from(teacherSubjects)
    .where(eq(teacherSubjects.teacherId, teacherProfile.id));

  return NextResponse.json({
    waliClasses,
    isWaliKelas: waliClasses.length > 0, // Keep for backward compatibility if needed
    subjects,
  });
}
