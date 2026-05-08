import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { account } from "@/db/auth-schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";

// PUT /api/auth-accounts/[id]/reset — reset password directly
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

  if (!body.newPassword) {
    return NextResponse.json({ error: "Password baru tidak boleh kosong" }, { status: 400 });
  }

  try {
    const hashedPassword = await bcrypt.hash(body.newPassword, 10);

    const [updated] = await db
      .update(account)
      .set({ password: hashedPassword })
      .where(eq(account.userId, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Account credentials tidak ditemukan (pengguna mungkin tidak mendaftar menggunakan password)" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Password berhasil di-reset" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal me-reset password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
