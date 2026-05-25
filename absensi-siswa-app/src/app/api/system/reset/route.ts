import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, teachers, attendance, spkScores, spkGradingCategories, classes, subjects, spkResults, spkPublishStatus } from "@/db/schema";
import { user } from "@/db/auth-schema";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// POST /api/system/reset — Reset (delete) all operational data
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await db.transaction(async (tx) => {
      // Delete in order to avoid FK issues (most dependent first)
      await tx.delete(spkResults);
      await tx.delete(spkPublishStatus);
      await tx.delete(spkGradingCategories);
      await tx.delete(spkScores);
      await tx.delete(attendance);
      await tx.delete(students);
      await tx.delete(teachers);
      await tx.delete(subjects);
      await tx.delete(classes);

      // Hapus akun login (auth users) siswa dan guru
      await tx.delete(user).where(inArray(user.appRole, ["SISWA", "GURU"]));
    });

    return NextResponse.json({
      success: true,
      message: "Seluruh data operasional berhasil dihapus. Konfigurasi SPK dan akun tetap dipertahankan.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mereset data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

