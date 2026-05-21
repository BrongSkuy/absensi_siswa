"use client";

import { useState, useEffect } from "react";
import { Trophy, Medal, Loader2, Users, School, Lock, Calendar, Clock } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";

import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-bold text-white shadow-lg shadow-amber-500/30">1</div>;
  if (rank === 2) return <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-500 text-sm font-bold text-white shadow-lg shadow-gray-400/30">2</div>;
  if (rank === 3) return <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-sm font-bold text-white shadow-lg shadow-amber-700/30">3</div>;
  return <span className="pl-2.5 text-sm font-medium text-muted-foreground">#{rank}</span>;
}

export default function SiswaLeaderboardPage() {
  const [data, setData] = useState<SpkResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"umum" | "kelas">("umum");
  const [myData, setMyData] = useState<{ nama: string; kelas: string; studentId: string } | null>(null);
  
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [activePeriodeName, setActivePeriodeName] = useState<string>("Sedang memuat...");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let profile = myData;
        
        // Fetch profile if we don't have it yet
        if (!profile) {
           const pRes = await fetch("/api/students/me");
           const pData = await pRes.json();
           if (!pData.error) {
              profile = { nama: pData.namaLengkap, kelas: pData.kelas, studentId: pData.id };
              setMyData(profile);
           }
        }
        
        // Determine the target class to calculate leaderboard
        const targetKelas = filterType === "umum" ? "umum" : (profile?.kelas || "umum");
        
        const spkRes = await fetch(`/api/spk/calculate?kelas=${encodeURIComponent(targetKelas)}`);
        const spkData = await spkRes.json();
        
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
           } else {
             setData([]);
           }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType]);

  if (loading && !myData) {
     return (
        <div className="flex justify-center items-center h-64">
           <Loader2 className="animate-spin h-8 w-8 text-navy-500" />
        </div>
     );
  }

  return (
    <div className="space-y-6 relative overflow-hidden min-h-[80vh]">
      <PageHeader
        title="Leaderboard Siswa"
        description="Peringkat siswa terbaik berdasarkan perhitungan SPK semester aktif"
        icon={Trophy}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes lockPulse {
          0%, 100% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.2)); }
          50% { transform: scale(1.05); opacity: 0.95; filter: drop-shadow(0 0 25px rgba(245, 158, 11, 0.5)); }
        }
        .lock-pulse {
          animation: lockPulse 3s infinite ease-in-out;
        }
      `}} />

      {!isPublished ? (
        // Beautiful premium Glassmorphic Lock Screen
        <div className="flex flex-col items-center justify-center py-12 px-4 md:py-20 relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/20 via-white to-amber-50/10 dark:from-slate-900 dark:to-slate-950 pointer-events-none rounded-2xl" />
          
          <Card className="max-w-2xl w-full border border-slate-100 bg-white/80 backdrop-blur-xl shadow-xl shadow-slate-100/40 overflow-hidden relative p-8 md:p-12 text-center rounded-2xl">
            {/* Glowing gold trophy & lock visual */}
            <div className="relative mx-auto mb-8 w-24 h-24 flex items-center justify-center rounded-3xl bg-gradient-to-br from-amber-50 to-amber-100/80 border border-amber-200/50 lock-pulse shadow-sm">
              <Trophy className="h-12 w-12 text-amber-500" />
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-slate-700 to-slate-900 border border-white text-white p-2 rounded-xl shadow-md">
                <Lock className="h-4 w-4" />
              </div>
            </div>

            <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 font-bold tracking-wide uppercase px-3 py-1 mb-4 rounded-full">
              Peringkat Belum Dirilis
            </Badge>

            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight mb-4">
              Leaderboard Semester Aktif Sedang Diproses
            </h2>
            
            <p className="text-sm md:text-base text-slate-500 leading-relaxed max-w-lg mx-auto mb-8">
              Hasil Sistem Pendukung Keputusan (SPK) SAW penentuan siswa terbaik masih dalam tahap penyusunan oleh sekolah. Peringkat akhir resmi akan dipublikasikan secara serentak di akhir semester.
            </p>

            {/* Academic Integrity Integrity checklist mockup */}
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
        <>
          <div className="flex justify-center sm:justify-start">
            <Tabs value={filterType} onValueChange={(val) => setFilterType(val as "umum" | "kelas")} className="w-full sm:w-auto">
              <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
                 <TabsTrigger value="umum" className="gap-2"><School className="h-4 w-4" /> Peringkat Umum</TabsTrigger>
                 <TabsTrigger value="kelas" className="gap-2" disabled={!myData?.kelas}>
                    <Users className="h-4 w-4" /> Kelas Saya {myData?.kelas ? `(${myData.kelas})` : ""}
                 </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {loading ? (
             <div className="flex py-12 justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-navy-500" />
             </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Top 3 Cards */}
              <div className="md:col-span-3 grid gap-4 sm:grid-cols-3">
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

              {/* Full Table */}
              <Card className="md:col-span-3">
                <CardHeader>
                  <CardTitle className="text-base">
                     {filterType === "umum" ? "Peringkat Keseluruhan (Semua Kelas)" : `Peringkat Kelas ${myData?.kelas}`}
                  </CardTitle>
                  <CardDescription>Semester {activePeriodeName.split(" - ")[1]} {activePeriodeName.split(" - ")[0]}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 pl-6">Rank</TableHead>
                        <TableHead>Nama Siswa</TableHead>
                        <TableHead>Kelas</TableHead>
                        <TableHead className="text-right pr-6">Skor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.length > 0 ? data.map((entry) => (
                        <TableRow
                          key={entry.studentId}
                          className={
                            myData && entry.studentId === myData.studentId
                              ? "bg-amber-50/50 font-semibold"
                              : entry.rank <= 3
                                ? "bg-gray-50/50"
                                : ""
                          }
                        >
                          <TableCell className="pl-6"><RankBadge rank={entry.rank} /></TableCell>
                          <TableCell>
                            {entry.namaLengkap}
                            {myData && entry.studentId === myData.studentId && (
                              <Badge className="ml-2 bg-navy-500 text-[10px] text-white">Kamu</Badge>
                            )}
                          </TableCell>
                          <TableCell><Badge variant="outline">{entry.kelas}</Badge></TableCell>
                          <TableCell className="text-right font-bold text-navy-700 pr-6">{entry.persentase}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Belum ada data perhitungan SPK untuk kategori ini.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
