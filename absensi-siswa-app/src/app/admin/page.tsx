"use client";

import {
  Users,
  GraduationCap,
  CalendarCheck,
  BookOpen,
  Trophy,
  Upload,
  Settings2,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useEffect } from "react";

interface DashboardStats {
  totalSiswa: number;
  totalGuru: number;
  kehadiranHariIni: number;
  tahunAjaran: string;
  weeklyAttendance?: Array<{
    hari: string;
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
  persentaseKehadiran?: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSiswa: 0,
    totalGuru: 0,
    kehadiranHariIni: 0,
    tahunAjaran: "-",
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardData[]>([]);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});

    fetch("/api/spk/calculate?kelas=umum")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLeaderboard(data);
      })
      .catch(() => {});
  }, []);

  const todayPercentage = stats.kehadiranHariIni || 0;

  // Cek weekly attendance dari API, fallback ke empty array jika belum ada
  const weeklyAttendance = stats.weeklyAttendance || [];

  // Parse semester/tahun from API
  const semesterLabel = stats.tahunAjaran.split(" ")[0] || "Genap";
  const tahunLabel = stats.tahunAjaran.split(" ")[1] || "-";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Admin"
        description="Ringkasan data keseluruhan sistem"
        icon={LayoutDashboard}
      />

      {/* Stats */}
      <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Siswa"
          value={stats.totalSiswa}
          subtitle="siswa aktif"
          icon={Users}
          color="navy"
          // trend={...} Removed to fix static 5.2% issue
        />
        <StatCard
          title="Total Guru"
          value={stats.totalGuru}
          subtitle="guru aktif"
          icon={GraduationCap}
          color="amber"
        />
        <StatCard
          title="Kehadiran Hari Ini"
          value={`${todayPercentage}%`}
          subtitle="dari total siswa"
          icon={CalendarCheck}
          color="emerald"
        />
        <StatCard
          title="Data Leaderboard"
          value={leaderboard.length > 0 ? "Tersedia" : "Kosong"}
          subtitle="berdasarkan nilai SPK"
          icon={BookOpen}
          color="blue"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Attendance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Grafik Kehadiran</CardTitle>
            <CardDescription>
              Data persentase kehadiran siswa dari awal absensi dicatat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {weeklyAttendance.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyAttendance} barGap={2}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E2E8F0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="hari"
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
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
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                  />
                  <Bar
                    dataKey="hadir"
                    name="Hadir"
                    fill="#22C55E"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="izin"
                    name="Izin"
                    fill="#f2a600"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="sakit"
                    name="Sakit"
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="alfa"
                    name="Alfa"
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                   Belum ada data absensi yang dicatat di sistem.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aksi Cepat</CardTitle>
            <CardDescription>Pintasan menu utama</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/siswa" className="block">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-11 hover:border-navy-300 hover:bg-navy-50"
              >
                <Upload className="h-4 w-4 text-navy-500" />
                Import Data Siswa
              </Button>
            </Link>
            <Link href="/admin/spk" className="block">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-11 hover:border-amber-300 hover:bg-amber-50"
              >
                <Settings2 className="h-4 w-4 text-amber-500" />
                Atur Bobot SPK
              </Button>
            </Link>
            <Link href="/admin/leaderboard" className="block">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-11 hover:border-emerald-300 hover:bg-emerald-50"
              >
                <Trophy className="h-4 w-4 text-emerald-500" />
                Lihat Leaderboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Mini Leaderboard */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">
              <Trophy className="mr-2 inline-block h-4 w-4 text-amber-500" />
              Top 5 Siswa Terbaik
            </CardTitle>
            <CardDescription>
              Berdasarkan perhitungan SPK semester ini
            </CardDescription>
          </div>
          <Link href="/admin/leaderboard">
            <Button variant="ghost" size="sm" className="gap-1 text-navy-500">
              Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Nama Siswa</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead className="text-right">Skor SPK</TableHead>
                <TableHead className="text-right">Kehadiran</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.length > 0 ? (
                leaderboard.slice(0, 5).map((entry) => (
                  <TableRow key={entry.studentId}>
                  <TableCell>
                    {entry.rank <= 3 ? (
                      <Badge
                        className={
                          entry.rank === 1
                            ? "bg-amber-500 text-white"
                            : entry.rank === 2
                              ? "bg-gray-400 text-white"
                              : "bg-amber-700 text-white"
                        }
                      >
                        #{entry.rank}
                      </Badge>
                    ) : (
                      <span className="pl-2 font-medium text-muted-foreground">
                        #{entry.rank}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {entry.namaLengkap}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{entry.kelas}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-navy-600">
                    {entry.skorSPK}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-emerald-600 font-medium">
                      {entry.persentaseKehadiran || "-"}%
                    </span>
                  </TableCell>
                </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Belum ada data nilai SPK untuk semester ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

