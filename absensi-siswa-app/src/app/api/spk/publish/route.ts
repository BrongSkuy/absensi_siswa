import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spkPublishStatus, spkResults, academicYears } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { calculateSPK, validateSPKCriteriaFilled } from "@/lib/spk";
import { DEFAULT_PERIODE } from "@/lib/utils";

export async function GET(_request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
    const activePeriode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : DEFAULT_PERIODE;

    const [status] = await db.select().from(spkPublishStatus).where(eq(spkPublishStatus.periode, activePeriode));
    return NextResponse.json({
      periode: activePeriode,
      isPublished: status?.isPublished ?? false,
      publishedAt: status?.publishedAt ?? null,
      publishedBy: status?.publishedBy ?? null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengambil status publikasi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appRole = (session.user as Record<string, unknown>)?.appRole;
  const isAdmin = 
    session.user.role === "admin" || 
    session.user.role === "super_admin" || 
    appRole === "ADMIN" || 
    appRole === "SUPER_ADMIN";

  if (!isAdmin) {
     return NextResponse.json({ error: "Forbidden: Hanya admin yang dapat mempublikasikan leaderboard" }, { status: 403 });
  }

  const { periode, bypassValidation } = await request.json();
  if (!periode) return NextResponse.json({ error: "Parameter periode wajib" }, { status: 400 });

  try {
    // 1. Strict Validation - check if all criteria are filled for all students
    if (!bypassValidation) {
      const validation = await validateSPKCriteriaFilled("umum", periode);
      if (!validation.isValid) {
        return NextResponse.json({
          error: "Validasi Gagal: Ada kriteria penilaian yang belum diisi untuk beberapa siswa.",
          isValid: false,
          missing: validation.missing,
        }, { status: 400 });
      }
    }
    
    // Check if already published
    const existingStatus = await db.select().from(spkPublishStatus).where(eq(spkPublishStatus.periode, periode));
    if (existingStatus.length > 0 && existingStatus[0].isPublished) {
       return NextResponse.json({ error: "Leaderboard untuk semester ini sudah dipublish" }, { status: 400 });
    }

    // Run the calculation for "umum"
    const resultsUmum = await calculateSPK("umum", periode);
    if (!resultsUmum || resultsUmum.length === 0) {
       return NextResponse.json({ error: "Tidak ada data siswa untuk dihitung" }, { status: 400 });
    }

    // Save results to spkResults
    await db.delete(spkResults).where(eq(spkResults.periode, periode));
    
    interface SpkCalculatedItem {
      studentId: string;
      kelas: string;
      rank: number;
      rawScore: number;
      persentase: number;
      detailRaw: Record<string, number>;
    }

    const rowsToInsert = (resultsUmum as unknown as SpkCalculatedItem[]).map((r) => ({
       studentId: r.studentId,
       periode: periode,
       kelas: r.kelas,
       rank: r.rank,
       rawScore: r.rawScore,
       persentase: r.persentase,
       details: JSON.stringify(r.detailRaw),
    }));

    await db.insert(spkResults).values(rowsToInsert);

    // Update publish status
    if (existingStatus.length > 0) {
       await db.update(spkPublishStatus)
         .set({ isPublished: true, publishedAt: new Date().toISOString(), publishedBy: session.user.id })
         .where(eq(spkPublishStatus.periode, periode));
    } else {
       await db.insert(spkPublishStatus).values({
         periode: periode,
         isPublished: true,
         publishedAt: new Date().toISOString(),
         publishedBy: session.user.id
       });
    }

    return NextResponse.json({ success: true, message: "Leaderboard berhasil dipublish!" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mempublish SPK";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appRole = (session.user as Record<string, unknown>)?.appRole;
  const isAdmin = 
    session.user.role === "admin" || 
    session.user.role === "super_admin" || 
    appRole === "ADMIN" || 
    appRole === "SUPER_ADMIN";

  if (!isAdmin) {
     return NextResponse.json({ error: "Forbidden: Hanya admin yang dapat membatalkan publikasi leaderboard" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const periode = searchParams.get("periode");
  if (!periode) return NextResponse.json({ error: "Parameter periode wajib" }, { status: 400 });

  try {
     // Check if published
     const existingStatus = await db.select().from(spkPublishStatus).where(eq(spkPublishStatus.periode, periode));
     if (existingStatus.length === 0 || !existingStatus[0].isPublished) {
        return NextResponse.json({ error: "Leaderboard untuk semester ini memang belum dipublish" }, { status: 400 });
     }

     // Unpublish: set isPublished to false
     await db.update(spkPublishStatus)
       .set({ isPublished: false, publishedAt: null, publishedBy: null })
       .where(eq(spkPublishStatus.periode, periode));

     // Delete cached spkResults
     await db.delete(spkResults).where(eq(spkResults.periode, periode));

     return NextResponse.json({ success: true, message: "Publikasi leaderboard berhasil dibatalkan!" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal membatalkan publikasi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
