"use client";

import { useState, useEffect } from "react";
import {
  ClipboardList,
  Loader2,
  TrendingUp,
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CriteriaScore {
  id: string;
  namaKriteria: string;
  bobot: number;
  tipe: string;
  deskripsi: string | null;
  nilaiRataRata: number;
  detailMapel: Record<string, number>;
  nilaiTerbobot: number;
}

interface KehadiranData {
  hadir: number;
  izin: number;
  sakit: number;
  alfa: number;
  total: number;
  persentase: number;
}

interface ScoreData {
  student: {
    id: string;
    nis: string;
    namaLengkap: string;
    kelas: string;
  };
  periode: string | null;
  criteria: CriteriaScore[];
  kehadiran: KehadiranData | null;
  totalSkorSPK: number;
}

export default function SiswaNilaiPage() {
  const [data, setData] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/students/me/scores")
      .then((res) => res.json())
      .then((result) => {
        if (result.error) {
          setError(result.error);
        } else {
          setData(result);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Gagal memuat data nilai");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-lg font-medium">Gagal Memuat Nilai</p>
        <p className="text-sm">{error || "Data tidak tersedia"}</p>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-600";
    if (score >= 70) return "text-amber-600";
    if (score >= 50) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBg = (score: number) => {
    if (score >= 85) return "bg-emerald-50 border-emerald-200";
    if (score >= 70) return "bg-amber-50 border-amber-200";
    if (score >= 50) return "bg-orange-50 border-orange-200";
    return "bg-red-50 border-red-200";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return "Sangat Baik";
    if (score >= 70) return "Baik";
    if (score >= 50) return "Cukup";
    return "Perlu Perbaikan";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nilai Saya"
        description="Rincian lengkap penilaian kriteria dan skor SPK"
        icon={ClipboardList}
      />

      {/* Score Summary Card */}
      <Card className="border-navy-100 bg-gradient-to-r from-navy-500 to-navy-700 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2em0wIDMwYzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2em0tMjQgMGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnptMC0zMGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        <CardContent className="py-6 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-white/70 text-sm font-medium">
                Periode: {data.periode || "Belum ada data"}
              </p>
              <h2 className="text-2xl font-bold mt-1">
                {data.student.namaLengkap}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-white/20 text-white hover:bg-white/30">
                  NIS: {data.student.nis}
                </Badge>
                <Badge className="bg-amber-500 text-navy-950 hover:bg-amber-400">
                  Kelas {data.student.kelas}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/20">
              <Award className="h-10 w-10 text-amber-400" />
              <div className="text-center">
                <p className="text-white/70 text-xs font-medium uppercase tracking-wider">
                  Total Skor SPK
                </p>
                <p className="text-3xl font-extrabold tabular-nums">
                  {data.totalSkorSPK}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Summary */}
      {data.kehadiran && (
        <div className="grid gap-4 sm:grid-cols-5">
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="py-4 text-center">
              <p className="text-xs text-emerald-600 font-medium">Hadir</p>
              <p className="text-2xl font-bold text-emerald-700">
                {data.kehadiran.hadir}
              </p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="py-4 text-center">
              <p className="text-xs text-blue-600 font-medium">Izin</p>
              <p className="text-2xl font-bold text-blue-700">
                {data.kehadiran.izin}
              </p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="py-4 text-center">
              <p className="text-xs text-amber-600 font-medium">Sakit</p>
              <p className="text-2xl font-bold text-amber-700">
                {data.kehadiran.sakit}
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="py-4 text-center">
              <p className="text-xs text-red-600 font-medium">Alfa</p>
              <p className="text-2xl font-bold text-red-700">
                {data.kehadiran.alfa}
              </p>
            </CardContent>
          </Card>
          <Card className="border-navy-200 bg-navy-50/50">
            <CardContent className="py-4 text-center">
              <p className="text-xs text-navy-600 font-medium">% Kehadiran</p>
              <p
                className={`text-2xl font-bold ${getScoreColor(data.kehadiran.persentase)}`}
              >
                {data.kehadiran.persentase}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Criteria Detail Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.criteria.map((c) => (
          <Card
            key={c.id}
            className={`border transition-all hover:shadow-md ${getScoreBg(c.nilaiRataRata)}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    {c.tipe === "Otomatis" ? (
                      <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                    ) : (
                      <BookOpen className="h-4 w-4 text-purple-500 shrink-0" />
                    )}
                    <span className="truncate">{c.namaKriteria}</span>
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    {c.deskripsi || `Bobot: ${c.bobot}%`}
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 ml-2 text-[10px] font-semibold"
                >
                  {c.bobot}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Nilai Rata-Rata
                  </p>
                  <p
                    className={`text-3xl font-extrabold tabular-nums ${getScoreColor(c.nilaiRataRata)}`}
                  >
                    {c.nilaiRataRata}
                  </p>
                  <Badge
                    variant="outline"
                    className={`mt-1 text-[10px] ${getScoreColor(c.nilaiRataRata)}`}
                  >
                    {getScoreLabel(c.nilaiRataRata)}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">
                    Skor Terbobot
                  </p>
                  <p className="text-lg font-bold text-navy-600">
                    {c.nilaiTerbobot}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    ({c.nilaiRataRata} × {c.bobot}%)
                  </p>
                </div>
              </div>

              {/* Per-Mapel detail if any */}
              {Object.keys(c.detailMapel).length > 0 && c.tipe === "Manual" && (
                <div className="mt-4 pt-3 border-t border-dashed">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Detail Per Mapel
                  </p>
                  <div className="space-y-1.5">
                    {Object.entries(c.detailMapel).map(([mapel, nilai]) => (
                      <div
                        key={mapel}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground truncate mr-2">
                          {mapel}
                        </span>
                        <span
                          className={`font-semibold tabular-nums ${getScoreColor(nilai)}`}
                        >
                          {nilai}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full Table Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-navy-500" />
            Ringkasan Perhitungan Skor SPK
          </CardTitle>
          <CardDescription>
            Rumus: Skor Akhir = Σ (Nilai × Bobot%)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Kriteria</TableHead>
                <TableHead className="text-center">Tipe</TableHead>
                <TableHead className="text-center">Bobot</TableHead>
                <TableHead className="text-center">Nilai</TableHead>
                <TableHead className="text-right pr-6">
                  Skor Terbobot
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.criteria.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="pl-6 font-medium">
                    {c.namaKriteria}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={
                        c.tipe === "Otomatis"
                          ? "border-blue-200 text-blue-600 bg-blue-50"
                          : "border-purple-200 text-purple-600 bg-purple-50"
                      }
                    >
                      {c.tipe}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {c.bobot}%
                  </TableCell>
                  <TableCell
                    className={`text-center font-bold ${getScoreColor(c.nilaiRataRata)}`}
                  >
                    {c.nilaiRataRata}
                  </TableCell>
                  <TableCell className="text-right pr-6 font-bold text-navy-600">
                    {c.nilaiTerbobot}
                  </TableCell>
                </TableRow>
              ))}
              {/* Total Row */}
              <TableRow className="bg-navy-50/50 border-t-2 border-navy-200">
                <TableCell
                  colSpan={4}
                  className="pl-6 font-bold text-navy-700"
                >
                  Total Skor SPK
                </TableCell>
                <TableCell className="text-right pr-6 font-extrabold text-xl text-navy-700">
                  {data.totalSkorSPK}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
