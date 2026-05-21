import { NextResponse } from "next/server";
import { db } from "@/db";
import { academicYears } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.isActive, true));

    if (!activeYear) {
      // Fallback if no active period is configured yet
      return NextResponse.json({
        tahunAjaran: "2024/2025",
        semester: "Genap",
        periode: "2024/2025-Genap",
      });
    }

    return NextResponse.json({
      tahunAjaran: activeYear.tahunAjaran,
      semester: activeYear.semester,
      periode: `${activeYear.tahunAjaran}-${activeYear.semester}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengambil data periode aktif";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
