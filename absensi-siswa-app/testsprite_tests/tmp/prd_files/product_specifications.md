# Product Specifications
## Sistem Informasi Terintegrasi Absensi & SPK Siswa Terbaik

---

## 1. Pendahuluan
Dokumen ini berisi spesifikasi produk (Product Specifications) komprehensif untuk **Sistem Informasi Terintegrasi Absensi & SPK (Sistem Pendukung Keputusan) Siswa Terbaik**. Sistem ini dibangun untuk menggantikan proses pencatatan kehadiran manual (berbasis Excel) serta mengotomatisasi penilaian 'Siswa Terbaik' menggunakan metode SPK yang transparan. Dokumen ini disusun berdasarkan seluruh riwayat iterasi perancangan, pengembangan sistem, pembaruan kerangka kerja (Webpack), dan integrasi alat pengujian (TestSprite).

## 2. Tujuan & Sasaran Sistem
1. **Digitalisasi Administrasi**: Menggantikan input data manual via Excel konvensional dengan antarmuka web modern yang menyerupai spreadsheet guna meminimalisir waktu adaptasi guru.
2. **Otomatisasi Penilaian (SPK)**: Memberikan keputusan objektif terkait siswa terbaik berdasarkan perhitungan kriteria yang jelas (Kehadiran, Kedisiplinan, Akademik, dll).
3. **Akses Data Cepat & Terpilah**: Menyediakan informasi kehadiran dan peringkat (Leaderboard) yang bisa diakses langsung oleh siswa dan wali kelas.
4. **Skalabilitas & Efisiensi Lokal**: Dioptimalkan untuk kapasitas ±150 siswa dengan infrastruktur backend minimalis dan cepat diakses.

## 3. Spesifikasi Fungsional Utama (Core Features)

### 3.1 Role-Based Access Control (RBAC)
Sistem memiliki 3 tingkat akses:
- **Admin / TU**: 
  - Hak akses penuh terhadap Master Data (Siswa, Guru, Mapel, Kelas).
  - Manajemen akun dan pengaturan bobot persentase 5 kriteria SPK.
  - Reset akhir semester, kenaikan kelas massal, dan kemampuan *Upload/Export* riwayat Leaderboard (Excel/PDF).
  - Integrasi inisialisasi data awal menggunakan *Bulk Import*.
- **Guru / Wali Kelas**:
  - Tampilan khusus (restricted view) pada kelas yang diampu saja.
  - Interface input laporan absensi massal (Excel-Like Data Grid).
  - Fungsi input dan modifikasi nilai penilaian kriteria manual (seperti sikap dan keaktifan ekskul).
- **Siswa / Orang Tua**:
  - Tampilan *Read-Only* khusus untuk siswa yang login.
  - Grafik visualisasi ringkasan absensi mingguan/bulanan.
  - Cek Leaderboard umum, per angkatan, maupun per kelas tanpa fungsionalitas edit data.

### 3.2 Integrasi SPK (Sistem Pendukung Keputusan)
- Pengumpulan raw data absensi (otomatis terhitung) dan input manual guru.
- Mesin kalkulasi SPK yang mengalikan nilai capaian dengan matriks bobot yang dinamis (dapat diubah admin).
- Penyimpanan terkunci (Locked state) dari hasil leaderboard akhir agar tidak bisa dimodifikasi oleh entitas selain super admin saat pengarsipan.

## 4. Spesifikasi Teknis & Stack Teknologi

Berdasarkan iterasi pengembangan, sistem menggunakan susunan teknologi berikut:

### 4.1 Frontend & Backend (Arsitektur Monolitik)
- **Framework Utama**: Next.js (App Router)
- **Bundler**: **Webpack** (Telah diterapkan perpindahan dari Turbopack default Next.js untuk menghindari masalah limitasi panjang path spesifik pada sistem operasi Windows yang muncul selama fase pengembangan lokal).
- **Styling**: Tailwind CSS dengan skema warna utama Biru (`#1F4E78`) dan aksen Kuning (`#f2a600`).
- **UI Components**: shadcn/ui untuk komponen estetis siap pakai yang meminimalisir kode boilerplate.
- **Tabel Data**: TanStack Table (untuk membangun Grid Absensi interaktif dan responsif layaknya Excel bagi kalangan guru).

### 4.2 Manajemen Data (Database & Auth)
- **Database Utama**: SQLite lokal (Pilihan yang sangat optimum dan efisien tanpa server database rumit untuk skala <500 user).
- **ORM**: Drizzle ORM (Digunakan karena kecepatannya, fully typed TypeScript support, serta sinkronisasinya yang baik dengan integrasi SQLite).
- **Autentikasi**: Better Auth untuk keamanan *session management* menggunakan identitas NIP/NIS.

### 4.3 Pengujian (Testing Strategy)
- **Test Server Integrations**: Menggunakan integrasi **TestSprite MCP Server**. TestSprite digunakan sepenuhnya untuk menghasilkan *test specs*, *frontend test plan*, serta validasi logika pada layer SPK backend dan antarmuka UI komponen agar memastikan tidak ada malfungsi ketika operasional harian.

## 5. Arsitektur Basis Data (Database Schema Summary)

1. **`users`**: Tabel autentikasi (username: NIP/NIS, role, password hashing).
2. **`students`**: Metadata profil unik setiap siswa (terhubung ke users.id).
3. **`attendance`**: Pencatatan harian siswa per sesi kalender.
4. **`spk_criteria`**: Modul dinamis parameter bobot yang dikelola oleh Admin.
5. **`spk_scores`**: Nilai capaian akhir gabungan sebelum dihitung SPK.
6. **`leaderboard_archives`**: Penyimpanan direktori file PDF/Excel hasil keputusan semester untuk rekam jejak.

## 6. Skenario Operasional (User Flows)

1. **Inisialisasi**: Admin melakukan setup Master Data -> Setup Bobot SPK -> Generate akun.
2. **Pencatatan Harian (Guru)**: Login -> Pilih Grid Kelas -> Input Massal pada antarmuka spreadsheet interaktif -> Simpan.
3. **Penutupan Periode**:
   - Sistem mengakumulasi kehadiran + Input sikap bulanan guru.
   - Peringkat (Leaderboard) tergenerasi otomatis.
   - Admin mengekspor menjadi PDF untuk diserahkan ke Kepala Sekolah lalu menekan 'Reset Periode' untuk siklus semester baru.

## 7. Catatan Khusus Pengembangan (Historical Timeline)
* Spesifikasi ini telah diselaraskan dengan kebutuhan penyampaian proposal (via WhatsApp) ke Kepala Sekolah.
* Frontend telah dievaluasi untuk stabilisasi fitur perutean *(routing)* dan pengelolaan memori status (*state management*).
* Database SQLite dengan Drizzle ORM telah dikaitkan sukses dengan lingkungan pengembangan lokal dan diuji validasinya.
* TestSprite memuluskan perjalanan TDD *(Test Driven Development)* terutama mitigasi eror dalam manajemen kalkulasi matriks SPK dan grid absensi TanStack Table.
