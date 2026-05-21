// ============================================================
// Mock Data untuk Development Frontend
// ============================================================

export type UserRole = "ADMIN" | "GURU" | "SISWA";

export interface User {
  id: string;
  username: string;
  nama: string;
  role: UserRole;
  avatar?: string;
}

export interface Student {
  id: string;
  userId: string;
  nis: string;
  namaLengkap: string;
  kelas: string;
  angkatan: string;
  jenisKelamin: "L" | "P";
  status: "aktif" | "nonaktif";
}

export interface Teacher {
  id: string;
  userId: string;
  nip: string;
  namaLengkap: string;
  kelasDiampu: string[];
  mapel: string[];
  status: "aktif" | "nonaktif";
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  namaLengkap: string;
  nis: string;
  tanggal: string;
  status: "Hadir" | "Izin" | "Sakit" | "Alfa";
}

export interface SpkCriteria {
  id: string;
  namaKriteria: string;
  bobot: number;
  tipe: "Otomatis" | "Manual";
  deskripsi: string;
}

export interface SpkScore {
  id: string;
  studentId: string;
  criteriaId: string;
  nilai: number;
  periode: string;
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  namaLengkap: string;
  kelas: string;
  skorSPK: number;
  persentaseKehadiran: number;
}

export interface Kelas {
  id: string;
  namaKelas: string;
  tingkat: string;
  waliKelas: string;
  jumlahSiswa: number;
}

export interface Mapel {
  id: string;
  namaMapel: string;
  guruPengampu: string;
}

// === Users ===
export const mockUsers: User[] = [
  { id: "u1", username: "admin001", nama: "Drs. Haryanto, M.Pd", role: "ADMIN" },
  { id: "u2", username: "197601012005", nama: "Sri Mulyani, S.Pd", role: "GURU" },
  { id: "u3", username: "197805032006", nama: "Ahmad Fauzi, M.Pd", role: "GURU" },
  { id: "u4", username: "2024001", nama: "Andi Pratama", role: "SISWA" },
  { id: "u5", username: "2024002", nama: "Siti Nurhaliza", role: "SISWA" },
];

// === Kelas ===
export const mockKelas: Kelas[] = [
  { id: "k1", namaKelas: "X-A", tingkat: "10", waliKelas: "Sri Mulyani, S.Pd", jumlahSiswa: 32 },
  { id: "k2", namaKelas: "X-B", tingkat: "10", waliKelas: "Ahmad Fauzi, M.Pd", jumlahSiswa: 30 },
  { id: "k3", namaKelas: "XI-A", tingkat: "11", waliKelas: "Ratna Dewi, S.Pd", jumlahSiswa: 31 },
  { id: "k4", namaKelas: "XI-B", tingkat: "11", waliKelas: "Budi Santoso, S.Pd", jumlahSiswa: 29 },
  { id: "k5", namaKelas: "XII-A", tingkat: "12", waliKelas: "Dewi Kartika, M.Pd", jumlahSiswa: 28 },
];

// === Students ===
export const mockStudents: Student[] = [
  { id: "s1", userId: "u4", nis: "2024001", namaLengkap: "Andi Pratama", kelas: "X-A", angkatan: "2024", jenisKelamin: "L", status: "aktif" },
  { id: "s2", userId: "u5", nis: "2024002", namaLengkap: "Siti Nurhaliza", kelas: "X-A", angkatan: "2024", jenisKelamin: "P", status: "aktif" },
  { id: "s3", userId: "u6", nis: "2024003", namaLengkap: "Rizky Maulana", kelas: "X-A", angkatan: "2024", jenisKelamin: "L", status: "aktif" },
  { id: "s4", userId: "u7", nis: "2024004", namaLengkap: "Dewi Anggraini", kelas: "X-A", angkatan: "2024", jenisKelamin: "P", status: "aktif" },
  { id: "s5", userId: "u8", nis: "2024005", namaLengkap: "Farhan Hidayat", kelas: "X-A", angkatan: "2024", jenisKelamin: "L", status: "aktif" },
  { id: "s6", userId: "u9", nis: "2024006", namaLengkap: "Putri Rahayu", kelas: "X-B", angkatan: "2024", jenisKelamin: "P", status: "aktif" },
  { id: "s7", userId: "u10", nis: "2024007", namaLengkap: "Muhammad Ilham", kelas: "X-B", angkatan: "2024", jenisKelamin: "L", status: "aktif" },
  { id: "s8", userId: "u11", nis: "2024008", namaLengkap: "Nabila Zahra", kelas: "X-B", angkatan: "2024", jenisKelamin: "P", status: "aktif" },
  { id: "s9", userId: "u12", nis: "2023001", namaLengkap: "Bayu Aditya", kelas: "XI-A", angkatan: "2023", jenisKelamin: "L", status: "aktif" },
  { id: "s10", userId: "u13", nis: "2023002", namaLengkap: "Anisa Fitri", kelas: "XI-A", angkatan: "2023", jenisKelamin: "P", status: "aktif" },
  { id: "s11", userId: "u14", nis: "2023003", namaLengkap: "Dimas Prayoga", kelas: "XI-B", angkatan: "2023", jenisKelamin: "L", status: "aktif" },
  { id: "s12", userId: "u15", nis: "2023004", namaLengkap: "Layla Safitri", kelas: "XI-B", angkatan: "2023", jenisKelamin: "P", status: "aktif" },
  { id: "s13", userId: "u16", nis: "2022001", namaLengkap: "Raka Mahardika", kelas: "XII-A", angkatan: "2022", jenisKelamin: "L", status: "aktif" },
  { id: "s14", userId: "u17", nis: "2022002", namaLengkap: "Intan Permata", kelas: "XII-A", angkatan: "2022", jenisKelamin: "P", status: "aktif" },
  { id: "s15", userId: "u18", nis: "2022003", namaLengkap: "Yoga Pratama", kelas: "XII-A", angkatan: "2022", jenisKelamin: "L", status: "aktif" },
];

// === Teachers ===
export const mockTeachers: Teacher[] = [
  { id: "t1", userId: "u2", nip: "197601012005", namaLengkap: "Sri Mulyani, S.Pd", kelasDiampu: ["X-A", "X-B"], mapel: ["Matematika"], status: "aktif" },
  { id: "t2", userId: "u3", nip: "197805032006", namaLengkap: "Ahmad Fauzi, M.Pd", kelasDiampu: ["X-A", "XI-A"], mapel: ["Bahasa Indonesia"], status: "aktif" },
  { id: "t3", userId: "u19", nip: "198203152008", namaLengkap: "Ratna Dewi, S.Pd", kelasDiampu: ["XI-A", "XI-B"], mapel: ["Bahasa Inggris"], status: "aktif" },
  { id: "t4", userId: "u20", nip: "198507212010", namaLengkap: "Budi Santoso, S.Pd", kelasDiampu: ["XI-B", "XII-A"], mapel: ["Fisika"], status: "aktif" },
  { id: "t5", userId: "u21", nip: "199012012012", namaLengkap: "Dewi Kartika, M.Pd", kelasDiampu: ["XII-A"], mapel: ["Kimia"], status: "aktif" },
];

// === Mapel ===
export const mockMapel: Mapel[] = [
  { id: "m1", namaMapel: "Matematika", guruPengampu: "Sri Mulyani, S.Pd" },
  { id: "m2", namaMapel: "Bahasa Indonesia", guruPengampu: "Ahmad Fauzi, M.Pd" },
  { id: "m3", namaMapel: "Bahasa Inggris", guruPengampu: "Ratna Dewi, S.Pd" },
  { id: "m4", namaMapel: "Fisika", guruPengampu: "Budi Santoso, S.Pd" },
  { id: "m5", namaMapel: "Kimia", guruPengampu: "Dewi Kartika, M.Pd" },
];

// === SPK Criteria ===
export const mockSpkCriteria: SpkCriteria[] = [
  { id: "c1", namaKriteria: "Nilai Akademik", bobot: 30, tipe: "Otomatis", deskripsi: "Rata-rata nilai akademik seluruh mata pelajaran" },
  { id: "c2", namaKriteria: "Kehadiran", bobot: 25, tipe: "Otomatis", deskripsi: "Persentase kehadiran siswa dari total hari efektif" },
  { id: "c3", namaKriteria: "Kedisiplinan", bobot: 20, tipe: "Manual", deskripsi: "Penilaian kedisiplinan dari guru wali kelas" },
  { id: "c4", namaKriteria: "Keaktifan Ekskul", bobot: 15, tipe: "Manual", deskripsi: "Keaktifan dalam kegiatan ekstrakurikuler" },
  { id: "c5", namaKriteria: "Prestasi Lomba", bobot: 10, tipe: "Manual", deskripsi: "Prestasi dalam perlombaan internal/eksternal" },
];

// === Leaderboard ===
export const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, studentId: "s2", namaLengkap: "Siti Nurhaliza", kelas: "X-A", skorSPK: 92.5, persentaseKehadiran: 98 },
  { rank: 2, studentId: "s1", namaLengkap: "Andi Pratama", kelas: "X-A", skorSPK: 89.3, persentaseKehadiran: 96 },
  { rank: 3, studentId: "s10", namaLengkap: "Anisa Fitri", kelas: "XI-A", skorSPK: 88.1, persentaseKehadiran: 97 },
  { rank: 4, studentId: "s14", namaLengkap: "Intan Permata", kelas: "XII-A", skorSPK: 87.6, persentaseKehadiran: 95 },
  { rank: 5, studentId: "s3", namaLengkap: "Rizky Maulana", kelas: "X-A", skorSPK: 85.9, persentaseKehadiran: 94 },
  { rank: 6, studentId: "s9", namaLengkap: "Bayu Aditya", kelas: "XI-A", skorSPK: 84.2, persentaseKehadiran: 92 },
  { rank: 7, studentId: "s4", namaLengkap: "Dewi Anggraini", kelas: "X-A", skorSPK: 83.5, persentaseKehadiran: 93 },
  { rank: 8, studentId: "s13", namaLengkap: "Raka Mahardika", kelas: "XII-A", skorSPK: 82.8, persentaseKehadiran: 91 },
  { rank: 9, studentId: "s6", namaLengkap: "Putri Rahayu", kelas: "X-B", skorSPK: 81.4, persentaseKehadiran: 95 },
  { rank: 10, studentId: "s8", namaLengkap: "Nabila Zahra", kelas: "X-B", skorSPK: 80.1, persentaseKehadiran: 90 },
];

// === Attendance chart data ===
export const mockWeeklyAttendance = [
  { hari: "Senin", hadir: 142, izin: 3, sakit: 4, alfa: 1 },
  { hari: "Selasa", hadir: 139, izin: 5, sakit: 3, alfa: 3 },
  { hari: "Rabu", hadir: 145, izin: 2, sakit: 2, alfa: 1 },
  { hari: "Kamis", hadir: 140, izin: 4, sakit: 5, alfa: 1 },
  { hari: "Jumat", hadir: 143, izin: 3, sakit: 3, alfa: 1 },
];

export const mockMonthlyAttendance = [
  { bulan: "Jan", hadir: 20, izin: 1, sakit: 1, alfa: 0 },
  { bulan: "Feb", hadir: 18, izin: 2, sakit: 1, alfa: 1 },
  { bulan: "Mar", hadir: 21, izin: 0, sakit: 1, alfa: 0 },
  { bulan: "Apr", hadir: 19, izin: 1, sakit: 2, alfa: 0 },
  { bulan: "Mei", hadir: 20, izin: 1, sakit: 0, alfa: 1 },
  { bulan: "Jun", hadir: 15, izin: 0, sakit: 1, alfa: 0 },
];

// === Current user mock (for development) ===
export const mockCurrentUser: User = mockUsers[0]; // Admin by default
