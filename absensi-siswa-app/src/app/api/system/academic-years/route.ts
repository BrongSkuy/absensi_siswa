import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { academicYears } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/system/academic-years — Get all academic years
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const list = await db.select().from(academicYears).all();
    // Sort logically by tahunAjaran descending, then semester descending (Genap before Ganjil if same year)
    const sortedList = list.sort((a, b) => {
      if (a.tahunAjaran !== b.tahunAjaran) {
        return b.tahunAjaran.localeCompare(a.tahunAjaran);
      }
      return b.semester.localeCompare(a.semester); 
    });
    return NextResponse.json(sortedList);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengambil data tahun ajaran";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/system/academic-years — Create new academic year
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { tahunAjaran, semester, isActive } = body;

    if (!tahunAjaran || !semester) {
      return NextResponse.json({ error: "Tahun ajaran dan semester wajib diisi" }, { status: 400 });
    }

    // Check if duplicate exists
    const existing = await db
      .select()
      .from(academicYears)
      .where(
        and(
          eq(academicYears.tahunAjaran, tahunAjaran),
          eq(academicYears.semester, semester)
        )
      )
      .all();

    if (existing.length > 0) {
      return NextResponse.json({ error: "Periode tahun ajaran dan semester tersebut sudah terdaftar" }, { status: 400 });
    }

    // If setting active, first set all others to false
    if (isActive) {
      await db.update(academicYears).set({ isActive: false }).run();
    }

    const [inserted] = await db
      .insert(academicYears)
      .values({
        tahunAjaran,
        semester,
        isActive: !!isActive,
      })
      .returning();

    return NextResponse.json(inserted);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan tahun ajaran";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/system/academic-years — Update/Toggle active academic year or update fields
export async function PUT(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, tahunAjaran, semester, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    // If making this one active, set all others to inactive
    if (isActive) {
      await db.update(academicYears).set({ isActive: false }).run();
    }

    const updatePayload: Record<string, unknown> = {};
    if (tahunAjaran !== undefined) updatePayload.tahunAjaran = tahunAjaran;
    if (semester !== undefined) updatePayload.semester = semester;
    if (isActive !== undefined) updatePayload.isActive = !!isActive;

    const [updated] = await db
      .update(academicYears)
      .set(updatePayload)
      .where(eq(academicYears.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Tahun ajaran tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengupdate tahun ajaran";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/system/academic-years — Delete an academic year
export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
    }

    // Check if the one to delete is active
    const [target] = await db.select().from(academicYears).where(eq(academicYears.id, id)).all();
    if (!target) {
      return NextResponse.json({ error: "Tahun ajaran tidak ditemukan" }, { status: 404 });
    }

    if (target.isActive) {
      return NextResponse.json({ error: "Tahun ajaran yang sedang aktif tidak dapat dihapus" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(academicYears)
      .where(eq(academicYears.id, id))
      .returning();

    return NextResponse.json({ success: true, deleted });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus tahun ajaran";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
