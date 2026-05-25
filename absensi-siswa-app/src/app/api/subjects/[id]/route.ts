import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subjects, attendance, spkScores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// PUT /api/subjects/[id] — update subject
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  try {
    const [updated] = await db
      .update(subjects)
      .set({
        namaMapel: body.namaMapel,
        teacherId: body.teacherId || null,
        kelasDiampu: body.kelasDiampu || null,
      })
      .where(eq(subjects.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Mata pelajaran tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengupdate pelajaran";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/subjects/[id] — delete subject
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const [targetSubject] = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, id))
      .all();

    if (!targetSubject) {
      return NextResponse.json({ error: "Mata pelajaran tidak ditemukan" }, { status: 404 });
    }

    // Check references in attendance table
    const attendanceRefs = await db
      .select()
      .from(attendance)
      .where(eq(attendance.mapel, targetSubject.namaMapel))
      .limit(1)
      .all();

    // Check references in spkScores table
    const scoreRefs = await db
      .select()
      .from(spkScores)
      .where(eq(spkScores.mapel, targetSubject.namaMapel))
      .limit(1)
      .all();

    if (attendanceRefs.length > 0 || scoreRefs.length > 0) {
      return NextResponse.json({
        error: "Tidak dapat menghapus mata pelajaran karena memiliki data absensi atau nilai aktif"
      }, { status: 400 });
    }

    const [deleted] = await db
      .delete(subjects)
      .where(eq(subjects.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Mata pelajaran tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus pelajaran";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

