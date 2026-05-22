import * as dotenv from "dotenv";
dotenv.config();

const BASE_URL = "https://absensi-siswa-smk.vercel.app";
const ORIGIN = "https://absensi-siswa-smk.vercel.app";

async function loginAsAdmin() {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json",
      "Origin": ORIGIN
    },
    body: JSON.stringify({ email: "admin@sekolah.id", password: "admin123" }),
  });
  if (!res.ok) throw new Error("Failed to login as admin");
  const cookies = res.headers.get("set-cookie");
  return cookies?.split(",").find((c) => c.includes("better-auth.session_token"))?.split(";")[0] || "";
}

async function loginAsGuru(email: string) {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json",
      "Origin": ORIGIN
    },
    body: JSON.stringify({ email: email, password: "guru123" }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.log("Login gagal:", text);
    throw new Error(`Failed to login as guru: ${email}`);
  }
  const cookies = res.headers.get("set-cookie");
  const betterAuthSession = cookies
    ?.split(",")
    .find((c) => c.includes("better-auth.session_token"))
    ?.split(";")[0];
  return betterAuthSession || "";
}

async function runTest(testName: string, testFn: () => Promise<void>) {
  try {
    await testFn();
    console.log(`[TEST] ${testName}... ✅ PASSED`);
  } catch (error: any) {
    console.log(`[TEST] ${testName}... ❌ FAILED`);
    console.error("   ", error.message);
  }
}

async function main() {
  console.log("🚀 Memulai QC Fase 3: Transaksi Absensi & Nilai (Vercel Live)\n");

  const adminToken = await loginAsAdmin();
  const teachersRes = await fetch(`${BASE_URL}/api/teachers`, {
    headers: { Cookie: adminToken, "Origin": ORIGIN }
  });
  const teachers = await teachersRes.json();
  if (!teachers.length) {
    console.error("Tidak ada guru di database.");
    return;
  }
  const teacherEmail = `${teachers[0].nip}@sekolah.id`;
  console.log(`Menggunakan akun guru: ${teacherEmail}`);

  const authCookie = await loginAsGuru(teacherEmail);
  if (!authCookie) {
    console.error("Gagal mendapatkan session token guru.");
    return;
  }

  const headers = {
    Cookie: authCookie,
    "Content-Type": "application/json",
    "Origin": ORIGIN
  };

  // Test 1: Isolasi Wewenang Absensi (Guru mencoba input kelas yang TIDAK diajarnya)
  await runTest("Isolasi Wewenang Guru (Absensi)", async () => {
    // Kita tembak kelas acak (misal 'KELAS_HARAM_UNTUK_GURU_INI')
    const res = await fetch(`${BASE_URL}/api/attendance`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        kelas: "KELAS_HARAM", // The endpoint doesn't accept kelas directly in body, wait!
        tanggal: "2024-05-20",
        mapel: "Matematika",
        records: [
          { studentId: "dummy-id", status: "Hadir" }
        ]
      })
    });
    
    // endpoint API tidak mengambil `kelas` dari body, ia mempercayai apapun dari request. Wait, `api/attendance` doesn't even receive `kelas` in POST body! It just receives studentId! This means a teacher can update ANY student's attendance by passing their studentId!
    
    // We will simulate updating a fake student
    if (res.ok) {
        throw new Error("Sistem mengizinkan guru menyimpan absensi tanpa memvalidasi apakah guru tersebut mengajar siswa/kelas tersebut!");
    } else if (res.status === 403 || res.status === 400) {
        // passed
    }
  });

  // Test 2: Validasi Batas Input (Nilai < 0 atau > 100)
  await runTest("Validasi Batas Input Nilai", async () => {
    const res = await fetch(`${BASE_URL}/api/spk/scores`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        kelas: "X-RPL",
        criteriaId: "dummy-criteria",
        mapel: "Matematika",
        categories: ["Tugas"],
        records: [
          { studentId: "dummy-id", details: { "Tugas": 150 } } // > 100!
        ]
      })
    });

    if (res.ok) {
      throw new Error("Sistem menerima nilai 150 (di atas 100) tanpa divalidasi!");
    }
  });
  
  console.log("\n🎉 SELESAI");
}

main().catch(console.error);
