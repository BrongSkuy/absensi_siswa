import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user, session as sessionTable } from "@/db/auth-schema";
import { students, teachers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// PUT /api/auth-accounts/[id]/status — toggle status
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
    const isBanned = body.banned === true;
    
    const result = await db.transaction(async (tx) => {
      // Update user banned status
      const [updated] = await tx
        .update(user)
        .set({ banned: isBanned })
        .where(eq(user.id, id))
        .returning();

      if (!updated) {
        throw new Error("USER_NOT_FOUND");
      }

      // Sync status to students/teachers table
      const appRole = (updated as Record<string, unknown>).appRole;
      const newStatus = isBanned ? "nonaktif" : "aktif";
      if (appRole === "SISWA") {
        await tx
          .update(students)
          .set({ status: newStatus })
          .where(eq(students.userId, id))
          .run();
      } else if (appRole === "GURU") {
        await tx
          .update(teachers)
          .set({ status: newStatus })
          .where(eq(teachers.userId, id))
          .run();
      }

      // Item 11: Revoke active sessions immediately when banning
      if (isBanned) {
        await tx
          .delete(sessionTable)
          .where(eq(sessionTable.userId, id))
          .run();
      }

      return updated;
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Gagal mengupdate status akun";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

