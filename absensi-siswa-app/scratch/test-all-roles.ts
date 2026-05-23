import * as dotenv from "dotenv";
dotenv.config();

const BASE_URL = "https://absensi-siswa-smk.vercel.app";
const ORIGIN = "https://absensi-siswa-smk.vercel.app";

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0", "Accept": "application/json", "Origin": ORIGIN },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to login as ${email}: HTTP ${res.status} - ${err}`);
  }
  const cookies = res.headers.get("set-cookie");
  return cookies?.split(",").find((c) => c.includes("better-auth.session_token"))?.split(";")[0] || "";
}

async function fetchAccounts(adminToken: string) {
  const res = await fetch(`${BASE_URL}/api/auth-accounts`, {
    headers: { Cookie: adminToken, "Origin": ORIGIN }
  });
  if (!res.ok) throw new Error("Failed to fetch accounts");
  return res.json();
}

async function resetPassword(userId: string, adminToken: string) {
  const res = await fetch(`${BASE_URL}/api/auth-accounts/${userId}/reset`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: adminToken, "Origin": ORIGIN },
    body: JSON.stringify({ newPassword: "Password123!" })
  });
  if (!res.ok) throw new Error("Failed to reset password for user " + userId);
}

async function runTest(role: string, menuName: string, path: string, token: string) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Cookie: token, "Origin": ORIGIN },
      redirect: "manual" // Don't follow redirects automatically, so we can catch 30x
    });
    
    if (res.status >= 300 && res.status < 400) {
       throw new Error(`Redirected to ${res.headers.get("location")} (Auth failed or Protected)`);
    }
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const html = await res.text();
    if (html.includes("Application error: a client-side exception has occurred")) {
       throw new Error("Client-side exception string found in HTML");
    }
    
    console.log(`[TEST] ${role} Menu: ${menuName.padEnd(25)} -> ✅ PASSED (${path})`);
  } catch (error: any) {
    console.log(`[TEST] ${role} Menu: ${menuName.padEnd(25)} -> ❌ FAILED (${path})`);
    console.error("   ", error.message);
  }
}

async function main() {
  console.log("🚀 Memulai Uji Coba UI (Smoke Test) untuk Semua Role (Vercel Live)\n");
  
  // 1. Admin Login
  const adminToken = await login("admin@sekolah.id", "admin123");
  if (!adminToken) {
    console.error("Gagal mendapatkan session token admin.");
    return;
  }
  
  console.log("--- PENGUJIAN ADMIN ---");
  const adminMenus = [
    ["Dashboard", "/admin"],
    ["Absensi", "/admin/absensi"],
    ["Akun", "/admin/akun"],
    ["Guru", "/admin/guru"],
    ["Kelas", "/admin/kelas"],
    ["Leaderboard", "/admin/leaderboard"],
    ["Manajemen Data", "/admin/manajemen-data"],
    ["Mapel", "/admin/mapel"],
    ["Nilai", "/admin/nilai"],
    ["Nilai Saya - Admin View", "/admin/nilai-saya"],
    ["Profil", "/admin/profil"],
    ["Rekap", "/admin/rekap"],
    ["Siswa", "/admin/siswa"],
    ["SPK", "/admin/spk"]
  ];
  for (const [name, path] of adminMenus) {
    await runTest("Admin", name, path, adminToken);
  }

  // 2. Fetch Accounts
  const data = await fetchAccounts(adminToken);
  const users = Array.isArray(data) ? data : [];
  // ==========================================
  // GURU TESTING
  // ==========================================
  console.log("\n--- PENGUJIAN GURU ---");
  
  // Login as Guru using default seed password
  const guruEmail = "197601012005@sekolah.id";
  const guruToken = await login(guruEmail, "guru1234");
  
  const guruMenus = [
    ["Dashboard", "/guru"],
    ["Absensi", "/guru/absensi"],
    ["Nilai", "/guru/nilai"],
    ["Siswa", "/guru/siswa"],
    ["Profil", "/guru/profil"],
  ];
  for (const [name, path] of guruMenus) {
    await runTest("Guru", name, path, guruToken);
  }

  // ==========================================
  // SISWA TESTING
  // ==========================================
  console.log("\n--- PENGUJIAN SISWA ---");
  
  // Login as Siswa using NIS as password (default seed)
  const siswaEmail = "2024001@siswa.sekolah.id";
  const siswaToken = await login(siswaEmail, "2024001");
  
  const siswaMenus = [
    ["Dashboard", "/siswa"],
    ["Absensi", "/siswa/absensi"],
    ["Nilai", "/siswa/nilai"],
    ["Profil", "/siswa/profil"],
  ];
  for (const [name, path] of siswaMenus) {
    await runTest("Siswa", name, path, siswaToken);
  }
  
  console.log("\n🎉 SELURUH PENGUJIAN UI ADMIN, GURU, DAN SISWA SELESAI");
}

main().catch(console.error);
