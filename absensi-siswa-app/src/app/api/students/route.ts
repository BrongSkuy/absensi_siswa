import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq, like, or, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/students — list all students with optional search & filter
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole;
  if (appRole !== "ADMIN" && appRole !== "GURU") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const kelas = searchParams.get("kelas") || "";

  let query = db.select().from(students);

  if (search) {
    query = query.where(
      or(
        like(students.namaLengkap, `%${search}%`),
        like(students.nis, `%${search}%`)
      )
    ) as typeof query;
  }

  if (kelas && kelas !== "all") {
    query = query.where(eq(students.kelas, kelas)) as typeof query;
  }

  const result = await query.all();
  return NextResponse.json(result);
}

// POST /api/students — create a new student
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { nis, namaLengkap, kelas, angkatan, jenisKelamin } = body;

    if (!nis || !namaLengkap || !kelas || !angkatan || !jenisKelamin) {
      return NextResponse.json(
        { error: "Semua field wajib diisi" },
        { status: 400 }
      );
    }

    if (nis.length < 4) {
      return NextResponse.json(
        { error: "NIS minimal 4 karakter (digunakan sebagai kata sandi default)" },
        { status: 400 }
      );
    }

    const existingStudent = await db.select().from(students).where(eq(students.nis, nis));
    if (existingStudent.length > 0) {
      return NextResponse.json(
        { error: "Siswa dengan NIS tersebut sudah terdaftar di sistem" },
        { status: 400 }
      );
    }

    // Create auth user for the student
    const newUser = await auth.api.signUpEmail({
      body: {
        email: `${nis}@siswa.sekolah.id`,
        password: nis, // default password = NIS
        name: namaLengkap,
        username: nis,
        appRole: "SISWA",
      },
    });

    // Create student profile
    const [student] = await db
      .insert(students)
      .values({
        userId: newUser.user.id,
        nis,
        namaLengkap,
        kelas,
        angkatan,
        jenisKelamin,
        status: "aktif",
      })
      .returning();

    return NextResponse.json(student, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menambahkan siswa";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
