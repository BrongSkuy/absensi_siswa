import { NextResponse } from "next/server";
import { db } from "@/db";
import { academicYears } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/system/academic-years — Mendapatkan semua periode semester
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const list = await db
      .select()
      .from(academicYears)
      .orderBy(desc(academicYears.tahunAjaran), desc(academicYears.semester));

    return NextResponse.json(list);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengambil data periode";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/system/academic-years — Membuat periode semester baru
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { tahunAjaran, semester, isActive } = await req.json();

    if (!tahunAjaran || !semester) {
      return NextResponse.json({ error: "Tahun Ajaran dan Semester wajib diisi" }, { status: 400 });
    }

    // Cek duplikasi
    const existing = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.tahunAjaran, tahunAjaran));

    const isDuplicate = existing.some((item) => item.semester === semester);
    if (isDuplicate) {
      return NextResponse.json({ error: `Periode ${tahunAjaran} - ${semester} sudah terdaftar` }, { status: 400 });
    }

    const newId = crypto.randomUUID();

    if (isActive) {
      // Jika diset sebagai aktif, nonaktifkan periode lain dulu secara transaksional
      await db.transaction(async (tx) => {
        await tx.update(academicYears).set({ isActive: false });
        await tx.insert(academicYears).values({
          id: newId,
          tahunAjaran,
          semester,
          isActive: true,
        });
      });
    } else {
      await db.insert(academicYears).values({
        id: newId,
        tahunAjaran,
        semester,
        isActive: false,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Periode semester ${tahunAjaran} - ${semester} berhasil ditambahkan!`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menambahkan periode semester";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/system/academic-years — Mengaktifkan periode semester tertentu
export async function PUT(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id, isActive } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID periode wajib diisi" }, { status: 400 });
    }

    if (isActive) {
      // Mengaktifkan satu periode dan menonaktifkan periode lainnya secara transaksional
      await db.transaction(async (tx) => {
        await tx.update(academicYears).set({ isActive: false });
        await tx.update(academicYears).set({ isActive: true }).where(eq(academicYears.id, id));
      });
    } else {
      // Menolak penonaktifan jika tidak ada periode aktif lainnya yang diset
      return NextResponse.json({
        error: "Sistem harus memiliki minimal satu periode aktif. Silakan pilih dan aktifkan periode lain sebagai gantinya.",
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Periode aktif berhasil diperbarui!",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui periode aktif";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/system/academic-years — Menghapus periode semester non-aktif
export async function DELETE(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    // Periksa status keaktifan periode tersebut sebelum menghapus
    const [period] = await db.select().from(academicYears).where(eq(academicYears.id, id));
    if (!period) {
      return NextResponse.json({ error: "Periode semester tidak ditemukan" }, { status: 404 });
    }

    if (period.isActive) {
      return NextResponse.json({ error: "Tidak dapat menghapus periode semester yang sedang aktif" }, { status: 400 });
    }

    await db.delete(academicYears).where(eq(academicYears.id, id));

    return NextResponse.json({
      success: true,
      message: "Periode semester berhasil dihapus!",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus periode semester";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
