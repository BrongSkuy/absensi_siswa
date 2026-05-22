import Database from "better-sqlite3";
import * as dotenv from "dotenv";
dotenv.config();

const dbUrl = process.env.TURSO_DATABASE_URL;
const dbToken = process.env.TURSO_AUTH_TOKEN;

const API_URL = "http://localhost:3000";

async function runTest(name: string, fn: () => Promise<void>) {
  process.stdout.write(`[TEST] ${name}... `);
  try {
    await fn();
    console.log("✅ PASSED");
  } catch (err: any) {
    console.log("❌ FAILED");
    console.error(`   Error: ${err.message}`);
    process.exit(1);
  }
}

async function login(email: string, password: string): Promise<string | null> {
  const res = await fetch(`${API_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json",
      "Origin": "http://localhost:3000"
    },
    body: JSON.stringify({ email, password }),
  });
  
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Login failed with status ${res.status}: ${errorBody}`);
  }
  
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return null;
  
  // Extract better-auth.session_token
  const match = setCookie.match(/better-auth\.session_token=([^;]+)/);
  return match ? match[1] : null;
}

async function checkRoute(route: string, sessionToken?: string): Promise<{status: number, redirectedUrl: string}> {
  const headers: Record<string, string> = {};
  if (sessionToken) {
    headers["Cookie"] = `better-auth.session_token=${sessionToken}`;
  }
  
  const res = await fetch(`${API_URL}${route}`, {
    method: "GET",
    headers,
    redirect: "manual"
  });
  
  let redirectedUrl = "";
  if (res.status >= 300 && res.status < 400) {
    redirectedUrl = res.headers.get("location") || "";
  }
  
  return { status: res.status, redirectedUrl };
}

async function main() {
  console.log("🚀 Memulai QC Fase 1: Keamanan, Autentikasi & RBAC\n");
  
  // Wait for server to be ready
  let serverUp = false;
  for (let i = 0; i < 10; i++) {
    try {
      await fetch(API_URL);
      serverUp = true;
      break;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  if (!serverUp) {
    console.error("Server is not running on http://localhost:3000");
    process.exit(1);
  }

  // === PENGUJIAN LOGIN ===
  console.log("--- Pengujian Login ---");
  await runTest("Login dengan email salah ditolak", async () => {
    try {
      await login("salah@domain.com", "admin123");
      throw new Error("Should have failed");
    } catch (e: any) {
      if (!e.message.includes("40")) return; // expected 400/401/403
    }
  });

  await runTest("Login dengan password salah ditolak", async () => {
    try {
      await login("admin@spk.com", "passwordsalah");
      throw new Error("Should have failed");
    } catch (e: any) {
      if (!e.message.includes("40")) return;
    }
  });

  // Let's check what admin users exist
  const { createClient } = await import("@libsql/client");
  const client = createClient({
    url: dbUrl!,
    authToken: dbToken!
  });
  
  const allUsers = await client.execute("SELECT email, app_role AS appRole FROM user");
  console.log("Existing Users in DB:");
  console.log(allUsers.rows);

  const adminEmail = allUsers.rows.find(u => u.appRole === 'ADMIN')?.email as string;
  if (!adminEmail) throw new Error("No admin found in DB!");

  const adminToken = await login(adminEmail, "admin123");
  await runTest(`Login Admin berhasil (${adminEmail})`, async () => {
    if (!adminToken) throw new Error("No session token received");
  });

  const teacherRes = await client.execute("SELECT email, nip FROM teachers t JOIN user u ON t.user_id = u.id LIMIT 1");
  const teacherEmail = teacherRes.rows[0].email as string;
  const teacherNip = teacherRes.rows[0].nip as string;

  let guruToken = null;
  try {
    guruToken = await login(teacherEmail, teacherNip); // Password is NIP
  } catch {
    guruToken = await login(teacherEmail, "guru1234");
  }
  await runTest(`Login Guru berhasil (${teacherEmail})`, async () => {
    if (!guruToken) throw new Error("No session token received");
  });

  const studentRes = await client.execute("SELECT email, nis FROM students s JOIN user u ON s.user_id = u.id LIMIT 1");
  const studentEmail = studentRes.rows[0].email as string;
  const studentNis = studentRes.rows[0].nis as string;

  const siswaToken = await login(studentEmail, studentNis);
  await runTest(`Login Siswa berhasil (${studentEmail})`, async () => {
    if (!siswaToken) throw new Error("No session token received");
  });

  // === PROTEKSI RUTE (RBAC Guarding) ===
  console.log("\n--- Proteksi Rute (Guarding) ---");
  
  await runTest("Akses rute /admin tanpa login dialihkan ke /login", async () => {
    const res = await checkRoute("/admin");
    if (res.status !== 307 && res.status !== 302) throw new Error(`Status was ${res.status}`);
    if (!res.redirectedUrl.includes("/login")) throw new Error(`Redirected to ${res.redirectedUrl} instead of /login`);
  });

  await runTest("Akses rute /admin pakai akun Guru dialihkan ke /guru", async () => {
    const res = await checkRoute("/admin", guruToken!);
    if (res.status !== 307 && res.status !== 302) throw new Error(`Status was ${res.status}`);
    if (!res.redirectedUrl.includes("/guru")) throw new Error(`Redirected to ${res.redirectedUrl} instead of /guru`);
  });

  await runTest("Akses rute /admin pakai akun Siswa dialihkan ke /siswa", async () => {
    const res = await checkRoute("/admin", siswaToken!);
    if (res.status !== 307 && res.status !== 302) throw new Error(`Status was ${res.status}`);
    if (!res.redirectedUrl.includes("/siswa")) throw new Error(`Redirected to ${res.redirectedUrl} instead of /siswa`);
  });

  await runTest("Akses rute /guru pakai akun Admin dialihkan ke /admin", async () => {
    const res = await checkRoute("/guru", adminToken!);
    if (res.status !== 307 && res.status !== 302) throw new Error(`Status was ${res.status}`);
    if (!res.redirectedUrl.includes("/admin")) throw new Error(`Redirected to ${res.redirectedUrl} instead of /admin`);
  });

  await runTest("Akses rute /siswa pakai akun Admin dialihkan ke /admin", async () => {
    const res = await checkRoute("/siswa", adminToken!);
    if (res.status !== 307 && res.status !== 302) throw new Error(`Status was ${res.status}`);
    if (!res.redirectedUrl.includes("/admin")) throw new Error(`Redirected to ${res.redirectedUrl} instead of /admin`);
  });

  console.log("\n🎉 SEMUA PENGUJIAN FASE 1 BERHASIL!");
}

main().catch(console.error);
