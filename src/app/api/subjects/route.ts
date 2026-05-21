import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subjects } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/subjects — list all subjects
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db.select().from(subjects).all();
  return NextResponse.json(result);
}

// POST /api/subjects — create a new subject
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { namaMapel, guruPengampu } = body;

    if (!namaMapel) {
      return NextResponse.json({ error: "Nama pelajaran wajib diisi" }, { status: 400 });
    }

    const [newSubject] = await db
      .insert(subjects)
      .values({
        namaMapel,
        guruPengampu: guruPengampu || null,
      })
      .returning();

    return NextResponse.json(newSubject, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menambahkan mata pelajaran";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
