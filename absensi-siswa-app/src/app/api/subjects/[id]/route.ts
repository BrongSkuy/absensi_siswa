import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subjects } from "@/db/schema";
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
        guruPengampu: body.guruPengampu || null,
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
