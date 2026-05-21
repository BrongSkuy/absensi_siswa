import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, teachers, attendance, spkScores, teacherClasses, teacherSubjects, spkGradingCategories, classes, subjects, spkResults, spkPublishStatus } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// POST /api/system/reset — Reset (delete) all operational data
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Delete in order to avoid FK issues (most dependent first)
    await db.delete(spkResults);
    await db.delete(spkPublishStatus);
    await db.delete(spkGradingCategories);
    await db.delete(spkScores);
    await db.delete(attendance);
    await db.delete(teacherSubjects);
    await db.delete(teacherClasses);
    await db.delete(students);
    await db.delete(teachers);
    await db.delete(subjects);
    await db.delete(classes);

    // Hapus akun login (auth users) siswa dan guru
    const { user } = await import("@/db/auth-schema");
    const { inArray } = await import("drizzle-orm");
    await db.delete(user).where(inArray(user.appRole, ["SISWA", "GURU"]));

    return NextResponse.json({
      success: true,
      message: "Seluruh data operasional berhasil dihapus. Konfigurasi SPK dan akun tetap dipertahankan.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mereset data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
