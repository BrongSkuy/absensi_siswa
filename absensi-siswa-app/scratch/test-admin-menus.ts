import * as dotenv from "dotenv";
dotenv.config();

const BASE_URL = "https://absensi-siswa-smk.vercel.app";
const ORIGIN = "https://absensi-siswa-smk.vercel.app";

async function loginAsAdmin() {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0", "Accept": "application/json", "Origin": ORIGIN },
    body: JSON.stringify({ email: "admin@sekolah.id", password: "admin123" }),
  });
  if (!res.ok) throw new Error("Failed to login as admin");
  const cookies = res.headers.get("set-cookie");
  return cookies?.split(",").find((c) => c.includes("better-auth.session_token"))?.split(";")[0] || "";
}

async function runTest(menuName: string, path: string, adminToken: string) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Cookie: adminToken, "Origin": ORIGIN }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    // Read response text just to ensure it downloads without error
    const html = await res.text();
    if (html.includes("Application error: a client-side exception has occurred")) {
       throw new Error("Client-side exception string found in HTML");
    }
    
    console.log(`[TEST] Admin Menu: ${menuName.padEnd(25)} -> ✅ PASSED (${path})`);
  } catch (error: any) {
    console.log(`[TEST] Admin Menu: ${menuName.padEnd(25)} -> ❌ FAILED (${path})`);
    console.error("   ", error.message);
  }
}

async function main() {
  console.log("🚀 Memulai Uji Coba UI (Smoke Test) untuk 14 Menu Admin (Vercel Live)\n");
  const adminToken = await loginAsAdmin();
  if (!adminToken) {
    console.error("Gagal mendapatkan session token admin.");
    return;
  }

  await runTest("Dashboard", "/admin", adminToken);
  await runTest("Absensi", "/admin/absensi", adminToken);
  await runTest("Akun", "/admin/akun", adminToken);
  await runTest("Guru", "/admin/guru", adminToken);
  await runTest("Kelas", "/admin/kelas", adminToken);
  await runTest("Leaderboard", "/admin/leaderboard", adminToken);
  await runTest("Manajemen Data", "/admin/manajemen-data", adminToken);
  await runTest("Mapel", "/admin/mapel", adminToken);
  await runTest("Nilai", "/admin/nilai", adminToken);
  await runTest("Nilai Saya - Admin View", "/admin/nilai-saya", adminToken);
  await runTest("Profil", "/admin/profil", adminToken);
  await runTest("Rekap", "/admin/rekap", adminToken);
  await runTest("Siswa", "/admin/siswa", adminToken);
  await runTest("SPK", "/admin/spk", adminToken);

  console.log("\n🎉 SELURUH PENGUJIAN UI ADMIN SELESAI");
}

main().catch(console.error);
