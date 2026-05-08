# Sistem Informasi Absensi & SPK Siswa Terbaik

Sistem manajemen kehadiran siswa dan penentuan siswa terbaik menggunakan metode SPK tingkat sekolah.

## 🚀 Panduan Menjalankan Project (First Time Setup)

Ikuti langkah-langkah di bawah ini untuk menjalankan project di perangkat lokal Anda:

### 1. Prasyarat (Prerequisites)
Pastikan Anda sudah menginstal:
- [Node.js](https://nodejs.org/) (Versi 20 atau yang terbaru direkomendasikan)
- [npm](https://www.npmjs.com/) (Biasanya otomatis terinstal dengan Node.js)

### 2. Instalasi Dependensi
Buka terminal di dalam folder `web-app` dan jalankan:
```bash
npm install --legacy-peer-deps
```
*Catatan: Parameter `--legacy-peer-deps` diperlukan untuk menangani konflik versi antara React 19 (Next.js 15) dan beberapa library pendukung yang belum memperbarui metadata mereka.*

### 3. Konfigurasi Environment Variables
Buat file baru bernama `.env` di folder root `web-app` (atau duplikasi dari `.env.example`) dan isi dengan:

```env
BETTER_AUTH_SECRET=pilih_bebas_kata_sandi_rahasia_anda_disini
BETTER_AUTH_URL=http://localhost:3000
```
*Tips: Anda bisa membuat secret otomatis dengan menjalankan `npx better-auth secret`.*

### 4. Setup Database
Project ini menggunakan SQLite sehingga tidak butuh server database tambahan. Jalankan dua perintah ini untuk menyiapkan tabel dan data awal:

**A. Push Schema (Sinkronisasi Tabel):**
```bash
npx drizzle-kit push
```

**B. Seeding Data (Data Awal Admin/Guru/Siswa):**
```bash
npx tsx src/db/seed.ts
```

### 5. Menjalankan Aplikasi
Jalankan server pengembangan:
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 🔑 Akun Default (Login)

Setelah melakukan `seed`, Anda dapat masuk menggunakan akun berikut:

| Peran | Username (NIP/NIS) | Password | Nama |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin001` | `admin123` | Administrator |
| **Guru** | `197601012005` | `guru1234` | Budi Santoso, S.Pd. |
| **Siswa** | `2024001` | `2024001` | Andi Prasetyo |

*Catatan: Untuk siswa, password default adalah NIS mereka sendiri.*

---

## 🛠️ Fitur Terkini (Penambahan & Bug Fix)
- [x] Perbaikan routing di middleware untuk role-based access.
- [x] Penambahan fitur Import Excel untuk input absensi massal.
- [x] Sinkronisasi otomatis data profil dari session login.
- [x] Validasi password minimal 4 karakter (untuk memudahkan NIS).
- [x] Perbaikan bug pada tampilan grafik dashboard siswa.

---
© 2026 Tim Kerja Praktek - SMK Penerbangan Dirghantara
