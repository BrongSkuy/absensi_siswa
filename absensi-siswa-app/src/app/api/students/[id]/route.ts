import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// PUT /api/students/[id] — update student
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
    // Build update payload — include nis only if provided
    const updatePayload: Record<string, unknown> = {
      namaLengkap: body.namaLengkap,
      kelas: body.kelas,
      angkatan: body.angkatan,
      jenisKelamin: body.jenisKelamin,
      status: body.status,
    };
    if (body.nis) {
      updatePayload.nis = body.nis;
    }

    const [updated] = await db
      .update(students)
      .set(updatePayload)
      .where(eq(students.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    }

    // Sync auth user table: name, username (NIS), and email
    if (updated.userId) {
      const { user } = await import("@/db/auth-schema");
      await db
        .update(user)
        .set({ 
          name: updated.namaLengkap,
          username: updated.nis,
          email: `${updated.nis}@siswa.sekolah.id`,
        })
        .where(eq(user.id, updated.userId))
        .run();
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengupdate data siswa";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/students/[id] — delete student
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
      .delete(students)
      .where(eq(students.id, id))
      .returning();

    if (deleted && deleted.userId) {
      const { user } = await import("@/db/auth-schema");
      await db.delete(user).where(eq(user.id, deleted.userId));
    }

    if (!deleted) {
      return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus data siswa";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
