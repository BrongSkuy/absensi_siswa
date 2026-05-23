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
      // Check duplicate NIS
      const existingWithNis = await db
        .select()
        .from(students)
        .where(eq(students.nis, body.nis))
        .all();
      const duplicate = existingWithNis.find((s) => s.id !== id);
      if (duplicate) {
        return NextResponse.json({ error: "NIS sudah terdaftar untuk siswa lain" }, { status: 400 });
      }
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
    const result = await db.transaction(async (tx) => {
      // Find the student first
      const studentList = await tx.select().from(students).where(eq(students.id, id));
      if (studentList.length === 0) {
        throw new Error("NOT_FOUND");
      }
      const student = studentList[0];

      // Cleanup related data
      const { attendance, spkScores, spkResults } = await import("@/db/schema");
      await tx.delete(spkResults).where(eq(spkResults.studentId, id));
      await tx.delete(spkScores).where(eq(spkScores.studentId, id));
      await tx.delete(attendance).where(eq(attendance.studentId, id));

      // Delete auth user if it exists
      if (student.userId) {
        const { user, session: sessionTable } = await import("@/db/auth-schema");
        // Also revoke sessions just in case
        await tx.delete(sessionTable).where(eq(sessionTable.userId, student.userId));
        await tx.delete(user).where(eq(user.id, student.userId));
      }

      // Finally delete the student profile
      const [deleted] = await tx
        .delete(students)
        .where(eq(students.id, id))
        .returning();

      return deleted;
    });

    return NextResponse.json({ success: true, deleted: result });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Gagal menghapus data siswa";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
