"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  CalendarCheck,
  Trophy,
  Medal,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StudentProfile {
  id: string;
  nis: string;
  namaLengkap: string;
  kelas: string;
  angkatan: string;
  jenisKelamin: string;
  status: string;
}

interface AttendanceStats {
  totalHadir: number;
  totalIzin: number;
  totalSakit: number;
  totalAlfa: number;
  totalRecords: number;
  persentaseKehadiran: number;
  dailyData: Array<{
    tanggal: string;
    hadir: number;
    izin: number;
    sakit: number;
    alfa: number;
  }>;
}

interface LeaderboardData {
  rank: number;
  studentId: string;
  namaLengkap: string;
  kelas: string;
  skorSPK: number;
}

export default function SiswaDashboard() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, statsRes, leaderboardRes] = await Promise.all([
          fetch("/api/students/me"),
          fetch("/api/students/me/attendance-stats"),
          fetch("/api/students/me/class-leaderboard"),
        ]);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
        }
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
        if (leaderboardRes.ok) {
           const lbData = await leaderboardRes.json();
           if (Array.isArray(lbData)) {
              setLeaderboard(lbData);
           }
        }
      } catch (err) {
        console.error("Failed to fetch student data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
        <p className="text-lg font-medium">Profil siswa tidak ditemukan</p>
        <p className="text-sm">Silakan hubungi admin jika ini adalah kesalahan.</p>
      </div>
    );
  }

  // Get initials for avatar
  const initials = profile.namaLengkap
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const kelasLeaderboard = leaderboard.filter(
    (e) => e.kelas === profile.kelas
  );

  const chartData = stats?.dailyData || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Siswa"
        description={`Selamat datang, ${profile.namaLengkap}`}
        icon={LayoutDashboard}
      />

      {/* Profile Card */}
      <Card className="border-navy-100 bg-gradient-to-r from-navy-500 to-navy-700 text-white">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-5">
          <Avatar className="h-16 w-16 border-2 border-white/30">
            <AvatarFallback className="bg-white/20 text-xl font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-lg font-bold">{profile.namaLengkap}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge className="bg-white/20 text-white hover:bg-white/30">
                NIS: {profile.nis}
              </Badge>
              <Badge className="bg-amber-500 text-navy-950 hover:bg-amber-400">
                Kelas {profile.kelas}
              </Badge>
              <Badge className="bg-white/20 text-white hover:bg-white/30">
                Angkatan {profile.angkatan}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="stagger-children grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Persentase Kehadiran"
          value={stats ? `${stats.persentaseKehadiran}%` : "0%"}
          subtitle="semester ini"
          icon={CalendarCheck}
          color="emerald"
        />
        <StatCard
          title="Total Hadir"
          value={stats?.totalHadir ?? 0}
          subtitle={`dari ${stats?.totalRecords ?? 0} hari`}
          icon={Trophy}
          color="amber"
        />
        <StatCard
          title="Tidak Hadir"
          value={
            stats
              ? stats.totalIzin + stats.totalSakit + stats.totalAlfa
              : 0
          }
          subtitle={`${stats?.totalIzin ?? 0} izin, ${stats?.totalSakit ?? 0} sakit, ${stats?.totalAlfa ?? 0} alfa`}
          icon={Medal}
          color="navy"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Attendance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Grafik Riwayat Kehadiran
            </CardTitle>
            <CardDescription>
              {chartData.length > 0
                ? `Riwayat kehadiran dari ${chartData.length} hari pencatatan`
                : "Belum ada data kehadiran"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="fillHadir" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22C55E" stopOpacity={0.3} />
                        <stop
                          offset="100%"
                          stopColor="#22C55E"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E2E8F0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="tanggal"
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                      interval={chartData.length > 8 ? Math.floor(chartData.length / 6) : 0}
                      angle={chartData.length > 5 ? -45 : 0}
                      textAnchor={chartData.length > 5 ? "end" : "middle"}
                      height={chartData.length > 5 ? 60 : 30}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                         borderRadius: "10px",
                         border: "1px solid #E2E8F0",
                         boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                         fontSize: "13px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="hadir"
                      name="Hari Hadir"
                      stroke="#22C55E"
                      strokeWidth={2.5}
                      fill="url(#fillHadir)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <p className="text-sm">Belum ada data untuk ditampilkan</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mini leaderboard kelas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top 5 Kelas {profile.kelas}
            </CardTitle>
            <CardDescription>Peringkat siswa berdasarkan skor</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 pl-6">#</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="text-right pr-6">Skor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kelasLeaderboard.length > 0 ? (
                  kelasLeaderboard.slice(0, 5).map((entry) => (
                    <TableRow
                      key={entry.studentId}
                      className={
                        entry.studentId === profile.id
                          ? "bg-amber-50/50 font-semibold"
                          : ""
                      }
                    >
                      <TableCell className="pl-6">
                        {entry.rank <= 3 ? (
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                              entry.rank === 1
                                ? "bg-amber-500"
                                : entry.rank === 2
                                  ? "bg-gray-400"
                                  : "bg-amber-700"
                            }`}
                          >
                            {entry.rank}
                          </span>
                        ) : (
                          <span className="pl-1.5 text-muted-foreground">
                            {entry.rank}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.namaLengkap}
                        {entry.studentId === profile.id && (
                          <Badge className="ml-2 bg-navy-500 text-[10px] text-white">
                            Kamu
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-navy-600 pr-6">
                        {entry.skorSPK}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Belum ada data leaderboard
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
