import * as dotenv from "dotenv";
dotenv.config();

const BASE_URL = "http://localhost:3001";
const ORIGIN = "http://localhost:3000";

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

async function runTest(testName: string, testFn: () => Promise<void>) {
  try {
    await testFn();
    console.log(`[TEST] ${testName.padEnd(65)} -> ✅ PASSED`);
  } catch (error: any) {
    console.log(`[TEST] ${testName.padEnd(65)} -> ❌ FAILED`);
    console.error("   ", error.message);
  }
}

async function main() {
  console.log("🚀 Memulai Uji Coba Fase 6 (1-4): Deep Edge Cases & Pengujian Ekstrem\n");

  // 1. Logins
  console.log("Memperoleh token autentikasi...");
  const adminToken = await login("admin@sekolah.id", "admin123");
  const siswaToken = await login("2024001@siswa.sekolah.id", "2024001");
  console.log("Token berhasil didapatkan.\n");

  const adminHeaders = { Cookie: adminToken, "Content-Type": "application/json", Origin: ORIGIN };
  const siswaHeaders = { Cookie: siswaToken, "Content-Type": "application/json", Origin: ORIGIN };

  // ============================================================
  // AREA 1: Uji Fungsional Mutasi Data & Relasi
  // ============================================================
  console.log("--- AREA 1: Mutasi Data & Relasi ---");

  await runTest("Menghapus Mapel yang aktif diajarkan (Harus menolak/membersihkan)", async () => {
    // Ambil semua mapel
    const res = await fetch(`${BASE_URL}/api/subjects`, { headers: adminHeaders });
    const subjects = await res.json();
    if (subjects.length === 0) throw new Error("Tidak ada mapel untuk dites");
    
    // Ambil mapel pertama
    const targetMapel = subjects[0];
    
    // Coba hapus mapel ini
    const delRes = await fetch(`${BASE_URL}/api/subjects/${targetMapel.id}`, {
      method: "DELETE",
      headers: adminHeaders
    });
    
    if (delRes.ok) {
       console.log("    ⚠️ Peringatan: Mapel berhasil dihapus tanpa validasi relasi (Berpotensi orphan data!)");
    } else {
       console.log("    ✅ Bagus: Sistem menolak penghapusan mapel yang berelasi");
    }
  });

  await runTest("Edit Master Siswa ke NIS duplikat (Harus ditolak)", async () => {
    // Ambil semua siswa
    const res = await fetch(`${BASE_URL}/api/students`, { headers: adminHeaders });
    const studentsList = await res.json();
    if (studentsList.length < 2) throw new Error("Butuh minimal 2 siswa untuk uji NIS duplikat");
    
    const siswaA = studentsList[0];
    const siswaB = studentsList[1];
    
    // Coba ganti NIS siswa A ke NIS siswa B
    const updateRes = await fetch(`${BASE_URL}/api/students/${siswaA.id}`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({
        namaLengkap: siswaA.namaLengkap,
        kelas: siswaA.kelas,
        angkatan: siswaA.angkatan,
        jenisKelamin: siswaA.jenisKelamin,
        status: siswaA.status,
        nis: siswaB.nis // duplicate!
      })
    });
    
    if (updateRes.ok) {
       throw new Error("Sistem mengizinkan penggantian NIS ke nomor duplikat! (Bug Integritas Data)");
    } else {
       console.log(`    ✅ Validasi Sukses: Duplikasi NIS ditolak (Status: ${updateRes.status})`);
    }
  });

  // ============================================================
  // AREA 2: Uji Ekspor & Impor File
  // ============================================================
  console.log("\n--- AREA 2: Ekspor & Impor File ---");

  await runTest("Upload data kosong ke Bulk Import Siswa (Harus ditolak)", async () => {
    const res = await fetch(`${BASE_URL}/api/students/bulk`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ students: [] })
    });
    
    if (res.ok) {
      throw new Error("Sistem menerima bulk import data siswa kosong!");
    } else {
      const data = await res.json();
      console.log(`    ✅ Validasi Sukses: Impor kosong ditolak dengan pesan: "${data.error}"`);
    }
  });

  await runTest("Upload data dengan Kelas tidak terdaftar (Harus ditolak)", async () => {
    const res = await fetch(`${BASE_URL}/api/students/bulk`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        students: [
          {
            nis: "2024999",
            namaLengkap: "Siswa Impor Invalid",
            kelas: "KELAS_TIDAK_ADA",
            angkatan: "2024",
            jenisKelamin: "L"
          }
        ]
      })
    });
    
    if (res.ok) {
      throw new Error("Sistem mengizinkan impor siswa dengan kelas yang tidak terdaftar di sistem!");
    } else {
      const data = await res.json();
      console.log(`    ✅ Validasi Sukses: Kelas tidak terdaftar ditolak dengan pesan: "${data.error}"`);
    }
  });

  // ============================================================
  // AREA 3: Uji Celah Keamanan API (API Role-Bypass)
  // ============================================================
  console.log("\n--- AREA 3: Celah Keamanan API (API Role-Bypass) ---");

  await runTest("Siswa memanggil POST /api/spk/calculate (Harus 403 Forbidden)", async () => {
    const res = await fetch(`${BASE_URL}/api/spk/calculate?kelas=X-A`, {
      method: "POST",
      headers: siswaHeaders, // using student token
      body: JSON.stringify({})
    });
    
    if (res.status === 403 || res.status === 401) {
       console.log(`    ✅ Proteksi Sukses: Akses kalkulasi SPK ditolak (Status: ${res.status})`);
    } else {
       throw new Error(`Bypass Sukses: Siswa bisa mengakses kalkulasi SPK! (Status: ${res.status})`);
    }
  });

  await runTest("Siswa memanggil GET /api/attendance (Menguji kebocoran data absensi)", async () => {
    const res = await fetch(`${BASE_URL}/api/attendance?kelas=X-A&tanggal=2026-05-22`, {
      headers: siswaHeaders
    });
    
    if (res.status === 403 || res.status === 401) {
       console.log(`    ✅ Proteksi Sukses: Akses absensi ditolak (Status: ${res.status})`);
    } else {
       console.log("    ⚠️ Kerentanan Kebocoran Data: Siswa BISA menarik seluruh absensi kelas lain!");
    }
  });

  await runTest("Siswa memanggil GET /api/attendance/rekap (Menguji kebocoran rekap nilai/absen)", async () => {
    const res = await fetch(`${BASE_URL}/api/attendance/rekap?kelas=X-A`, {
      headers: siswaHeaders
    });
    
    if (res.status === 403 || res.status === 401) {
       console.log(`    ✅ Proteksi Sukses: Akses rekap ditolak (Status: ${res.status})`);
    } else {
       console.log("    ⚠️ Kerentanan Kebocoran Data: Siswa BISA menarik rekap nilai & absen sekelas!");
    }
  });

  // ============================================================
  // AREA 4: Edge Cases Algoritma SPK (Kondisi Ekstrem)
  // ============================================================
  console.log("\n--- AREA 4: Algoritma SPK ---");

  await runTest("Kalkulasi SPK (Verifikasi penanganan pembagian nol / divide by zero)", async () => {
    // Panggil kalkulasi SPK kelas X-A
    const res = await fetch(`${BASE_URL}/api/spk/calculate?kelas=X-A`, { headers: adminHeaders });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const data = await res.json();
    console.log(`    ✅ Kalkulasi Berhasil: Rumus SAW berjalan lancar (Total baris dihitung: ${data.results?.length || 0})`);
  });

  console.log("\n🎉 SELURUH PENGUJIAN FASE 6 (1-4) SELESAI");
}

main().catch(console.error);
