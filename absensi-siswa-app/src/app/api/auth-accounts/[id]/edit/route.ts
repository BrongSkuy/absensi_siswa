import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { students, teachers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// PUT /api/auth-accounts/[id]/edit — edit name and username
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

  if (!body.name) {
    return NextResponse.json({ error: "Nama tidak boleh kosong" }, { status: 400 });
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(user)
        .set({ 
          name: body.name,
          username: body.username || null 
        })
        .where(eq(user.id, id))
        .returning();

      if (!updated) {
        throw new Error("USER_NOT_FOUND");
      }

      // Sync name and username (NIS/NIP) to students/teachers table
      const appRole = (updated as Record<string, unknown>).appRole;
      if (appRole === "SISWA") {
        const syncPayload: Record<string, unknown> = { namaLengkap: body.name };
        if (body.username) {
          syncPayload.nis = body.username;
        }
        await tx
          .update(students)
          .set(syncPayload)
          .where(eq(students.userId, id))
          .run();
      } else if (appRole === "GURU") {
        const syncPayload: Record<string, unknown> = { namaLengkap: body.name };
        if (body.username) {
          syncPayload.nip = body.username;
        }
        await tx
          .update(teachers)
          .set(syncPayload)
          .where(eq(teachers.userId, id))
          .run();
      }

      return updated;
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Gagal mengupdate profil akun";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
