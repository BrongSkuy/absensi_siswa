# Sistem Informasi Absensi & SPK Siswa Terbaik

Sistem manajemen kehadiran siswa dan penentuan siswa terbaik menggunakan metode SPK tingkat sekolah.

## 🚀 Panduan Deployment & Konfigurasi Cloud (Turso, GitHub, & Vercel)

Ikuti langkah-langkah di bawah ini untuk menghubungkan aplikasi Anda ke cloud (GitHub, Turso Database, dan hosting Vercel) agar dapat diakses secara online dari laptop mana saja (tidak lagi hanya di localhost).

---

### 1. Prasyarat (Prerequisites)
Sebelum memulai, pastikan Anda telah menyiapkan/memiliki:
- **Node.js** (Versi 20 atau terbaru) & **npm** terinstal di laptop Anda.
- Akun di platform berikut:
  1. [GitHub](https://github.com/) (Untuk penyimpanan repositori kode)
  2. [Turso](https://turso.tech/) (Untuk database SQLite berbasis cloud)
  3. [Vercel](https://vercel.com/) (Untuk hosting aplikasi Next.js secara gratis)

---

### 2. Langkah-Langkah Integrasi & Deployment

#### A. Membuat Cloud Database di Turso (Manual)
1. Masuk ke **[Turso Web Dashboard](https://turso.tech/)**.
2. Klik tombol **"Create Database"**.
3. Beri nama database Anda (misalnya: `absensi-siswa`) dan klik buat.
4. Setelah database berhasil dibuat, salin **Database URL** yang tertera (berformat `libsql://nama-db-username.turso.io`).
5. Klik tombol **"Generate Token"** pada halaman database tersebut, lalu salin **Auth Token** yang dihasilkan. Simpan kedua kredensial ini untuk langkah selanjutnya.

#### B. Mengunggah Kode ke GitHub (Repository Setup)
1. Buka browser dan masuk ke akun GitHub Anda.
2. Buat repositori baru dengan mengklik **"New Repository"**.
3. Beri nama repositori (misalnya: `absensi-siswa-app`), biarkan pengaturannya *Public* atau *Private*, dan **jangan** centang opsi tambahkan README, .gitignore, atau lisensi (biarkan repositori kosong).
4. Salin link repositori GitHub Anda (berformat `https://github.com/username/absensi-siswa-app.git`).
5. Buka terminal di folder project `absensi-siswa-app` lokal Anda, lalu jalankan perintah berikut secara berurutan:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git branch -M main
   git remote add origin https://github.com/username/absensi-siswa-app.git
   git push -u origin main
   ```
   *(Ganti URL remote origin di atas dengan link repositori GitHub Anda sendiri).*

#### C. Deploy & Setup Environment Variables di Vercel
1. Masuk ke **[Vercel](https://vercel.com/)** menggunakan akun GitHub Anda.
2. Klik tombol **"Add New..."** lalu pilih **"Project"**.
3. Cari repositori `absensi-siswa-app` yang baru saja Anda push ke GitHub, lalu klik **"Import"**.
4. Di bagian **Environment Variables**, masukkan variabel-variabel berikut:
   - `TURSO_DATABASE_URL` : Tempel URL database dari Turso yang telah Anda salin sebelumnya.
   - `TURSO_AUTH_TOKEN` : Tempel Auth Token dari Turso yang telah Anda salin sebelumnya.
   - `BETTER_AUTH_SECRET` : Masukkan kode rahasia bebas atau buat otomatis di terminal lokal dengan menjalankan perintah `npx better-auth secret`.
   - `BETTER_AUTH_URL` : Gunakan URL domain Vercel Anda (misalnya: `https://absensi-siswa-app.vercel.app`).
5. Klik **"Deploy"** dan tunggu hingga proses build selesai. Setelah selesai, aplikasi Anda sudah online!

---

### 3. Migrasi & Seeding Database ke Cloud
Setelah aplikasi terhubung ke Turso, kita perlu membuat tabel dan memasukkan data admin/guru/siswa awal ke cloud database.

1. Buka folder project Anda di laptop sekolah, pastikan file `.env` diisi dengan kredensial Turso yang baru:
   ```env
   TURSO_DATABASE_URL=libsql://nama-db-username.turso.io
   TURSO_AUTH_TOKEN=auth_token_turso_anda
   BETTER_AUTH_SECRET=rahasia_anda
   BETTER_AUTH_URL=http://localhost:3000
   ```
2. Jalankan perintah instalasi dependensi jika belum pernah dijalankan di laptop sekolah:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Sinkronisasikan struktur tabel database ke Turso:
   ```bash
   npx drizzle-kit push
   ```
4. Masukkan data default admin, guru, dan siswa ke database cloud Turso:
   ```bash
   npx tsx src/db/seed.ts
   ```

---

### 4. Cara Menjalankan Aplikasi

#### A. Akses Langsung Secara Online (Vercel)
Aplikasi kini sudah tidak bergantung pada localhost Anda. Anda dapat langsung mengakses aplikasi melalui tautan yang diberikan oleh Vercel (misalnya: `https://absensi-siswa-app.vercel.app`) dari perangkat apa pun yang terhubung ke internet.

#### B. Menjalankan Secara Lokal (Opsional / Development)
Jika Anda ingin mengembangkan atau menguji kode secara lokal di laptop sekolah namun tetap menggunakan database cloud Turso yang sama:
1. Pastikan file `.env` lokal Anda telah dikonfigurasi dengan kredensial Turso yang benar.
2. Jalankan server pengembangan lokal:
   ```bash
   npm run dev
   ```
3. Buka browser dan akses **[http://localhost:3000](http://localhost:3000)**. Semua perubahan data yang Anda lakukan di localhost akan langsung masuk ke database Turso di cloud.

---

## 🔑 Akun Default (Login)

Setelah melakukan database seeding, Anda dapat login menggunakan akun default (Admin, Guru, Siswa). Informasi lengkap mengenai daftar username dan password default dapat dilihat di file **[AKUN_DEFAULT.md](./AKUN_DEFAULT.md)**.

---

© 2026 Tim Kerja Praktek - SMK Penerbangan Dirghantara

