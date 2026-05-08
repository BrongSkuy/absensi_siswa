import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spkScores, students, spkCriteria, attendance, academicYears } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

import { calculateSPK } from "@/lib/spk";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const kelas = searchParams.get("kelas");
  if (!kelas) return NextResponse.json({ error: "Parameter kelas wajib" }, { status: 400 });

  try {
    const results = await calculateSPK(kelas);
    return NextResponse.json(results);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghitung SPK";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
