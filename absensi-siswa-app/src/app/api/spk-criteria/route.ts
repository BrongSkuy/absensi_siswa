import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spkCriteria } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/spk-criteria — list all criteria
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db.select().from(spkCriteria).all();
  return NextResponse.json(result);
}

// PUT /api/spk-criteria — batch update bobot
export async function PUT(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body: Array<{ id: string; bobot: number }> = await request.json();

    // Validate total = 100
    const total = body.reduce((sum, c) => sum + c.bobot, 0);
    if (total !== 100) {
      return NextResponse.json(
        { error: `Total bobot harus 100%. Saat ini: ${total}%` },
        { status: 400 }
      );
    }

    // Update each criteria
    for (const item of body) {
      await db
        .update(spkCriteria)
        .set({ bobot: item.bobot })
        .where(eq(spkCriteria.id, item.id));
    }

    const updated = await db.select().from(spkCriteria).all();
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan bobot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
