"use client";

import { useState, useEffect } from "react";
import { Trophy, Medal, Loader2, Users, School } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
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
        
        if (Array.isArray(spkData)) setData(spkData);
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
    <div className="space-y-6">
      <PageHeader
        title="Leaderboard Siswa"
        description="Peringkat siswa terbaik berdasarkan perhitungan SPK semester aktif"
        icon={Trophy}
      />

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
                      <p className="text-xs text-muted-foreground">Skor SPK</p>
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
              <CardDescription>Semester Genap 2024/2025</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 pl-6">Rank</TableHead>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead className="text-right">Skor SPK</TableHead>
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
                      <TableCell className="text-right font-bold text-navy-700">{entry.persentase}</TableCell>
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
    </div>
  );
}
