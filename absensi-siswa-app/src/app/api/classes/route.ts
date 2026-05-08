import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { classes, students } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, sql } from "drizzle-orm";

// GET /api/classes — list all classes
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db
    .select({
      id: classes.id,
      namaKelas: classes.namaKelas,
      tingkat: classes.tingkat,
      waliKelas: classes.waliKelas,
      jumlahSiswa: sql<number>`count(${students.id})`.mapWith(Number), 
    })
    .from(classes)
    .leftJoin(students, eq(classes.namaKelas, students.kelas))
    .groupBy(classes.id)
    .all();

  return NextResponse.json(result);
}

// POST /api/classes — create a new class
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { namaKelas, tingkat, waliKelas } = body;

    if (!namaKelas || !tingkat) {
      return NextResponse.json({ error: "Nama kelas dan tingkat wajib diisi" }, { status: 400 });
    }

    const [newClass] = await db
      .insert(classes)
      .values({
        namaKelas,
        tingkat,
        waliKelas: waliKelas || null,
      })
      .returning();

    return NextResponse.json(newClass, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menambahkan kelas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
