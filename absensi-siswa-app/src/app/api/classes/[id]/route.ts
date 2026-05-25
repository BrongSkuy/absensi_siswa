import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { classes, students } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// PUT /api/classes/[id] — update class
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
      .update(classes)
      .set({
        namaKelas: body.namaKelas,
        tingkat: body.tingkat,
        waliKelas: body.waliKelas || null,
      })
      .where(eq(classes.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengupdate kelas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/classes/[id] — delete class
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
    // Check if class exists and get its name
    const [classToDelete] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, id));

    if (!classToDelete) {
      return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
    }

    // Check for related students (prevent orphan data)
    const [studentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(eq(students.kelas, classToDelete.namaKelas));

    if (studentCount.count > 0) {
      return NextResponse.json(
        { error: "Tidak dapat menghapus kelas karena masih ada siswa yang terdaftar di kelas ini." }, 
        { status: 400 }
      );
    }

    const [deleted] = await db
      .delete(classes)
      .where(eq(classes.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: deleted });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus kelas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
