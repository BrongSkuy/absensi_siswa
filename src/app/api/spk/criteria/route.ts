import { NextResponse } from "next/server";
import { db } from "@/db";
import { spkCriteria } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const criteriaList = await db.select().from(spkCriteria).all();
  return NextResponse.json(criteriaList);
}
