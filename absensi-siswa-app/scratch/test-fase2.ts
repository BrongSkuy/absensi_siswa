const BASE_URL = "http://localhost:3001";

async function loginAsAdmin() {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json",
      "Origin": "http://localhost:3000"
    },
    body: JSON.stringify({ email: "admin@sekolah.id", password: "admin123" }),
  });
  if (!res.ok) {
    console.log(await res.text());
    throw new Error("Failed to login as admin");
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
    console.error(error.message);
  }
}

async function main() {
  console.log("🚀 Memulai QC Fase 2: Manajemen Data Master (Admin)\n");

  const authCookie = await loginAsAdmin();
  if (!authCookie) {
    console.error("Gagal mendapatkan session token admin.");
    return;
  }

  const headers = {
    Cookie: authCookie,
    "Content-Type": "application/json",
  };

  console.log("--- Pengujian CRUD Kelas ---");

  let newClassId = "";
  let newClassName = `Kelas Test ${Date.now()}`;

  await runTest("Tambah Kelas Baru", async () => {
    const res = await fetch(`${BASE_URL}/api/classes`, {
      method: "POST",
      headers,
      body: JSON.stringify({ namaKelas: newClassName, tingkat: "X" }),
    });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const data = await res.json();
    if (!data.id) throw new Error("Class ID not returned");
    newClassId = data.id;
  });

  await runTest("Edit Kelas", async () => {
    const res = await fetch(`${BASE_URL}/api/classes/${newClassId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ namaKelas: `${newClassName} Updated`, tingkat: "X" }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP Error: ${res.status} - ${text}`);
    }
  });

  await runTest("Hapus Kelas", async () => {
    const res = await fetch(`${BASE_URL}/api/classes/${newClassId}`, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP Error: ${res.status} - ${text}`);
    }
  });

  console.log("\n--- Pengujian Relasi Data (Hapus Kelas yang ada siswanya) ---");
  await runTest("Menolak penghapusan kelas yang memiliki siswa aktif", async () => {
    // Cari kelas yang memiliki siswa
    const res = await fetch(`${BASE_URL}/api/classes`, { headers });
    const classes = await res.json();
    const classWithStudents = classes.find((c: any) => c.jumlahSiswa > 0);
    
    if (!classWithStudents) {
      throw new Error("Tidak ada kelas dengan siswa untuk dites");
    }

    const delRes = await fetch(`${BASE_URL}/api/classes/${classWithStudents.id}`, {
      method: "DELETE",
      headers,
    });

    if (delRes.ok) {
      throw new Error("Sistem mengizinkan penghapusan kelas yang memiliki siswa! (Vulnerability)");
    }
    
    if (delRes.status !== 400 && delRes.status !== 409) {
       const text = await delRes.text();
       throw new Error(`Sistem menolak tapi dengan status HTTP yang kurang tepat: ${delRes.status}. Expected 400 or 409. Body: ${text}`);
    }
  });

  console.log("\n--- Pengujian Bulk Import Siswa ---");
  await runTest("Upload file CSV dengan format salah ditolak", async () => {
    const formData = new FormData();
    const blob = new Blob(["invalid,csv,format\n1,2,3"], { type: "text/csv" });
    formData.append("file", blob, "test.csv");

    const res = await fetch(`${BASE_URL}/api/students/import`, {
      method: "POST",
      headers: { Cookie: authCookie }, // No Content-Type header for FormData
      body: formData,
    });

    if (res.ok) {
      throw new Error("Sistem menerima file CSV yang formatnya salah");
    }
  });

  console.log("\n🎉 PENGUJIAN FASE 2 SELESAI");
}

main().catch(console.error);

export {};

