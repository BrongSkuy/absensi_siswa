"use client";

import React, { useEffect, useState } from "react";
import { Trophy, Download, Loader2, Medal, Lock, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface SpkResult {
  studentId: string;
  nis: string;
  namaLengkap: string;
  kelas: string;
  rawScore: number;
  persentase: number;
  rank: number;
  detailRaw: Record<string, number>;
}

interface ClassRow {
  id: string;
  namaKelas: string;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-bold text-white shadow-lg shadow-amber-500/30">1</div>;
  if (rank === 2) return <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-500 text-sm font-bold text-white shadow-lg shadow-gray-400/30">2</div>;
  if (rank === 3) return <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-sm font-bold text-white shadow-lg shadow-amber-700/30">3</div>;
  return <span className="pl-2.5 text-sm font-medium text-muted-foreground">#{rank}</span>;
}

export default function GuruLeaderboardPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [activeTab, setActiveTab] = useState("umum");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SpkResult[]>([]);
  
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [kelasData, setKelasData] = useState<string[]>([]);
  const [activePeriodeName, setActivePeriodeName] = useState<string>("Sedang memuat...");

  useEffect(() => {
    fetch("/api/classes").then(r => r.json()).then(setClasses).catch(() => {});
  }, []);

  useEffect(() => {
    const loadCalculation = async () => {
      setLoading(true);
      try {
        const targetKelas = activeTab === "umum" || activeTab === "kelas" || activeTab === "angkatan" ? "umum" : activeTab;
        const res = await fetch(`/api/spk/calculate?kelas=${encodeURIComponent(targetKelas)}`);
        const spkData = await res.json();
        
        if (spkData.activePeriode) {
           const formattedPeriode = spkData.activePeriode.replace('-', ' - ');
           setActivePeriodeName(formattedPeriode);
        }

        if (spkData.isPublished === false) {
           setIsPublished(false);
        } else {
           setIsPublished(true);
           if (spkData.data && Array.isArray(spkData.data)) {
             setData(spkData.data);
             const classes = Array.from(new Set(spkData.data.map((item: any) => item.kelas))) as string[];
             setKelasData(classes.sort());
           } else {
             setData([]);
           }
        }
      } catch {
        toast.error("Gagal memuat SPK");
      } finally {
        setLoading(false);
      }
    };

    loadCalculation();
  }, [activeTab]);

  const handleExport = () => {
    if (data.length === 0) return;
    const templateData = data.map((d) => ({
      Rank: d.rank,
      NIS: d.nis,
      NamaSiswa: d.namaLengkap,
      Kelas: d.kelas,
      SkorSPK_Persen: d.persentase,
      RawScore: d.rawScore,
    }));
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leaderboard " + activeTab);
    XLSX.writeFile(wb, `Leaderboard_${activeTab}_SPK.xlsx`);
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 min-h-[80vh] relative overflow-hidden">
      <PageHeader
        title="Leaderboard Siswa"
        description="Peringkat siswa terbaik berdasarkan perhitungan SPK SAW"
        icon={Trophy}
      >
        <Button variant="outline" size="sm" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hide-on-print" onClick={handleExport} disabled={data.length === 0 || !isPublished}>
          <Download className="h-4 w-4" /> Export Excel
        </Button>
        <Button variant="outline" size="sm" className="gap-2 border-navy-200 text-navy-600 hover:bg-navy-50 hide-on-print" onClick={handleExportPDF} disabled={data.length === 0 || !isPublished}>
          <Download className="h-4 w-4" /> Export PDF
        </Button>
      </PageHeader>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .hide-on-print { display: none !important; }
        }
        @keyframes lockPulse {
          0%, 100% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.2)); }
          50% { transform: scale(1.05); opacity: 0.95; filter: drop-shadow(0 0 25px rgba(99, 102, 241, 0.4)); }
        }
        .lock-pulse {
          animation: lockPulse 3s infinite ease-in-out;
        }
      `}} />

      {!isPublished ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 md:py-20 relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/15 via-white to-navy-50/5 pointer-events-none rounded-2xl" />
          
          <Card className="max-w-2xl w-full border border-slate-100 bg-white/80 backdrop-blur-xl shadow-xl shadow-slate-100/40 overflow-hidden relative p-8 md:p-12 text-center rounded-2xl">
            <div className="relative mx-auto mb-8 w-24 h-24 flex items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-50 to-indigo-100/80 border border-indigo-200/50 lock-pulse shadow-sm">
              <Trophy className="h-12 w-12 text-indigo-500" />
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-slate-700 to-slate-900 border border-white text-white p-2 rounded-xl shadow-md">
                <Lock className="h-4 w-4" />
              </div>
            </div>

            <Badge variant="outline" className="border-indigo-300 text-indigo-800 bg-indigo-50 font-bold tracking-wide uppercase px-3 py-1 mb-4 rounded-full">
              Peringkat Belum Dirilis
            </Badge>

            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight mb-4">
              Leaderboard Semester Aktif Terkunci (Draf)
            </h2>
            
            <p className="text-sm md:text-base text-slate-500 leading-relaxed max-w-lg mx-auto mb-8">
              Hasil kalkulasi Sistem Pendukung Keputusan (SPK) SAW penentuan siswa terbaik saat ini dalam status draf dan belum dirilis oleh Admin. Hasil resmi akan muncul secara otomatis setelah dipublikasikan oleh sekolah.
            </p>

            <div className="border border-slate-100 rounded-xl bg-slate-50/50 p-6 text-left max-w-md mx-auto space-y-3.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" /> Alur Validasi Sekolah
              </h4>
              
              <div className="flex items-center gap-3 text-xs">
                <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">✓</div>
                <span className="text-slate-600 font-medium">Rekapitulasi Absensi Harian (Sistem Otomatis)</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">✓</div>
                <span className="text-slate-600 font-medium">Input Kriteria Manual (Oleh Wali Kelas & Guru)</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="h-5 w-5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-500 flex items-center justify-center font-semibold text-[10px] animate-pulse">●</div>
                <span className="text-slate-700 font-bold">Sidang Pleno & Validasi Akhir (Oleh Sekolah)</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="h-5 w-5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center font-bold text-[10px]">-</div>
                <span className="text-slate-400">Pengumuman & Publikasi Peringkat Resmi</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic mt-8 flex items-center justify-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Periode Semester Aktif: {activePeriodeName}
            </p>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {data.length > 0 && !loading && (
            <div className="md:col-span-3 grid gap-4 sm:grid-cols-3 hide-on-print">
              {data.slice(0, 3).map((student, i) => (
                <Card
                  key={student.studentId}
                  className={`relative overflow-hidden transition-all hover:-translate-y-1 ${
                    i === 0
                      ? "border-amber-300 bg-amber-50/50 shadow-amber-500/10"
                      : i === 1
                        ? "border-gray-300 bg-gray-50/50"
                        : "border-amber-700/30 bg-amber-900/5"
                  }`}
                >
                  <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-current opacity-[0.03]" />
                  <CardContent className="p-6 text-center">
                    <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full shadow-lg ${
                      i === 0 ? "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30" :
                      i === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500 shadow-gray-400/30" :
                      "bg-gradient-to-br from-amber-600 to-amber-800 shadow-amber-700/30"
                    }`}>
                      <Medal className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="mb-1 text-lg font-bold">
                      {student.namaLengkap}
                    </h3>
                    <p className="mb-3 text-sm text-muted-foreground">Kelas {student.kelas}</p>
                    <div className="flex justify-center gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Skor</p>
                        <p className="font-bold text-navy-700">{student.persentase}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="print-area md:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">
                {activeTab === "umum" ? "Peringkat Keseluruhan (Semua Kelas)" : `Peringkat Kelas ${activeTab}`}
              </CardTitle>
              <CardDescription>Semester {activePeriodeName.split(" - ")[1]} {activePeriodeName.split(" - ")[0]}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4 flex-wrap h-auto">
                  <TabsTrigger value="umum">Umum (Semua Kelas)</TabsTrigger>
                  {classes.map(c => (
                     <TabsTrigger key={c.id} value={c.namaKelas}>{c.namaKelas}</TabsTrigger>
                  ))}
                </TabsList>

                <div className="mt-4">
                  {loading ? (
                    <div className="flex py-12 justify-center">
                      <Loader2 className="animate-spin h-8 w-8 text-navy-500" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16 pl-4">Rank</TableHead>
                          <TableHead>Nama Siswa</TableHead>
                          <TableHead>Kelas</TableHead>
                          <TableHead className="text-right">Logika SAW</TableHead>
                          <TableHead className="text-right pr-4">Skor (%)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.length > 0 ? data.map((entry) => (
                          <TableRow key={entry.studentId} className={entry.rank <= 3 ? "bg-amber-50/30" : ""}>
                            <TableCell className="pl-4"><RankBadge rank={entry.rank} /></TableCell>
                            <TableCell className="font-medium">{entry.namaLengkap}</TableCell>
                            <TableCell><Badge variant="outline">{entry.kelas}</Badge></TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">{entry.rawScore.toFixed(4)}</TableCell>
                            <TableCell className="text-right pr-4">
                              <span className="font-bold text-navy-700">{entry.persentase}</span>
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                             <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Tidak ada data leaderboard</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
