import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teachers, academicYears } from "@/db/schema";
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
    const updated = await db.transaction(async (tx) => {
      // Build update payload — include nip only if provided
      const updatePayload: Record<string, unknown> = {
        namaLengkap: body.namaLengkap,
        status: body.status,
      };
      if (body.nip) {
        updatePayload.nip = body.nip;
      }
      if (body.jenisKelamin) {
        updatePayload.jenisKelamin = body.jenisKelamin;
      }

      const [updatedTeacher] = await tx
        .update(teachers)
        .set(updatePayload)
        .where(eq(teachers.id, id))
        .returning();

      if (!updatedTeacher) {
        throw new Error("NOT_FOUND");
      }

      // Sync auth user table: name, username (NIP), and email
      if (updatedTeacher.userId) {
        const { user } = await import("@/db/auth-schema");
        await tx
          .update(user)
          .set({ 
            name: updatedTeacher.namaLengkap,
            username: updatedTeacher.nip,
            email: `${updatedTeacher.nip}@sekolah.id`,
          })
          .where(eq(user.id, updatedTeacher.userId))
          .run();
      }



      return updatedTeacher;
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Guru tidak ditemukan" }, { status: 404 });
    }
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
    const result = await db.transaction(async (tx) => {
      // Find the teacher first to get their name and userId
      const teacherList = await tx.select().from(teachers).where(eq(teachers.id, id));
      if (teacherList.length === 0) {
        throw new Error("NOT_FOUND");
      }
      const teacher = teacherList[0];

      // Unlink subjects
      const { subjects, classes } = await import("@/db/schema");
      await tx.update(subjects).set({ teacherId: null }).where(eq(subjects.teacherId, id));

      // Cleanup classes.waliKelas where it matches the teacher's name
      await tx
        .update(classes)
        .set({ waliKelas: null })
        .where(eq(classes.waliKelas, teacher.namaLengkap))
        .run();

      // Delete auth user if it exists
      if (teacher.userId) {
        const { user, session: sessionTable } = await import("@/db/auth-schema");
        // Also revoke sessions just in case
        await tx.delete(sessionTable).where(eq(sessionTable.userId, teacher.userId));
        await tx.delete(user).where(eq(user.id, teacher.userId));
      }

      // Finally delete the teacher profile
      const [deleted] = await tx
        .delete(teachers)
        .where(eq(teachers.id, id))
        .returning();

      return deleted;
    });

    return NextResponse.json({ success: true, deleted: result });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Guru tidak ditemukan" }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Gagal menghapus data guru";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
