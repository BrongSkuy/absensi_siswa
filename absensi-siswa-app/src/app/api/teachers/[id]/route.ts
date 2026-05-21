import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teachers, teacherSubjects, academicYears } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// PUT /api/teachers/[id] — update teacher
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
    // Build update payload — include nip only if provided
    const updatePayload: Record<string, unknown> = {
      namaLengkap: body.namaLengkap,
      status: body.status,
    };
    if (body.nip) {
      updatePayload.nip = body.nip;
    }

    const [updated] = await db
      .update(teachers)
      .set(updatePayload)
      .where(eq(teachers.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Guru tidak ditemukan" }, { status: 404 });
    }

    // Sync auth user table: name, username (NIP), and email
    if (updated.userId) {
      const { user } = await import("@/db/auth-schema");
      await db
        .update(user)
        .set({ 
          name: updated.namaLengkap,
          username: updated.nip,
          email: `${updated.nip}@sekolah.id`,
        })
        .where(eq(user.id, updated.userId))
        .run();
    }

    if (body.mataPelajaran) {
       // Removed activeYear check since we sync globally
       await db.delete(teacherSubjects).where(eq(teacherSubjects.teacherId, id));
       
       if (Array.isArray(body.mataPelajaran) && body.mataPelajaran.length > 0) {
          const { subjects } = await import("@/db/schema");
          for (const mapel of body.mataPelajaran) {
             await db.insert(teacherSubjects).values({
                teacherId: id,
                namaMapel: String(mapel),
             });
             
             // Check if subject exists globally, if not create it
             const existingSubject = await db.select().from(subjects).where(eq(subjects.namaMapel, String(mapel)));
             if (existingSubject.length === 0) {
                await db.insert(subjects).values({
                   namaMapel: String(mapel),
                   guruPengampu: body.namaLengkap
                });
             }
          }
       }
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengupdate data guru";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/teachers/[id] — delete teacher
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
      .delete(teachers)
      .where(eq(teachers.id, id))
      .returning();

    if (deleted && deleted.userId) {
      const { user } = await import("@/db/auth-schema");
      await db.delete(user).where(eq(user.id, deleted.userId));
    }

    if (!deleted) {
      return NextResponse.json({ error: "Guru tidak ditemukan" }, { status: 404 });
    }

    await db.delete(teacherSubjects).where(eq(teacherSubjects.teacherId, id));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus data guru";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
