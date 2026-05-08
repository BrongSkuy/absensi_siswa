"use client";

import React, { useEffect, useState, useRef } from "react";
import { Trophy, Download, Upload, FileSpreadsheet, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const initialArchives: { id: string; fileUrl: string; namaFile: string; periode: string; uploadedAt: string }[] = [];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-bold text-white shadow-lg shadow-amber-500/30">1</div>;
  if (rank === 2) return <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gray-300 to-gray-500 text-sm font-bold text-white shadow-lg shadow-gray-400/30">2</div>;
  if (rank === 3) return <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-sm font-bold text-white shadow-lg shadow-amber-700/30">3</div>;
  return <span className="pl-2.5 text-sm font-medium text-muted-foreground">#{rank}</span>;
}

export default function AdminLeaderboardPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [activeTab, setActiveTab] = useState("umum");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SpkResult[]>([]);
  const [archives, setArchives] = useState(initialArchives);
  const archiveRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/classes").then(r => r.json()).then(setClasses).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const targetKelas = activeTab === "umum" || activeTab === "kelas" || activeTab === "angkatan" ? "umum" : activeTab;
    fetch(`/api/spk/calculate?kelas=${encodeURIComponent(targetKelas)}`)
      .then(r => r.json())
      .then(res => {
         setData(res);
         setLoading(false);
      })
      .catch(() => {
         toast.error("Gagal memuat SPK");
         setLoading(false);
      });
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

  const handleUploadArsip = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.success(`Arsip ${file.name} berhasil diunggah!`);
    const fileUrl = URL.createObjectURL(file);
    setArchives([...archives, { id: String(Date.now()), fileUrl, namaFile: file.name, periode: "Baru Diunggah", uploadedAt: new Date().toLocaleDateString("id-ID") }]);
    if (archiveRef.current) archiveRef.current.value = "";
  };

  const handleDeleteArsip = (id: string, namaFile: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus arsip " + namaFile + "?")) {
      setArchives(archives.filter((arc) => arc.id !== id));
      toast.success("Arsip berhasil dihapus.");
    }
  };

  const handleDownloadArsip = (arc: { fileUrl: string, namaFile: string }) => {
    if (!arc.fileUrl) {
      toast.info(`File mock ${arc.namaFile} tidak memiliki isi (hanya sampel UI).`);
      return;
    }
    const a = document.createElement("a");
    a.href = arc.fileUrl;
    a.download = arc.namaFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Berhasil mengunduh ${arc.namaFile}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leaderboard & Arsip"
        description="Peringkat siswa terbaik dan arsip semester sebelumnya berdasarkan SPK SAW"
        icon={Trophy}
      >
        <Button variant="outline" size="sm" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hide-on-print" onClick={handleExport} disabled={data.length === 0}>
          <Download className="h-4 w-4" /> Export Excel
        </Button>
        <Button variant="outline" size="sm" className="gap-2 border-navy-200 text-navy-600 hover:bg-navy-50 hide-on-print" onClick={handleExportPDF} disabled={data.length === 0}>
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
      `}} />

      <Card className="print-area">
        <CardHeader>
          <CardTitle className="text-base">Peringkat Semester Aktif</CardTitle>
          <CardDescription>Semester Genap (Kalkulasi SPK Realtime)</CardDescription>
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

      {/* Archives */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Arsip Historis (Tahun Ajaran)</CardTitle>
            <CardDescription>File rekapitulasi semester sebelumnya</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => archiveRef.current?.click()}>
            <Upload className="h-4 w-4" /> Upload Arsip Tahun Ajaran
          </Button>
          <input ref={archiveRef} type="file" accept=".xlsx,.pdf,.csv" className="hidden" onChange={handleUploadArsip} />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {archives.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground border rounded-lg bg-muted/20">
                Belum ada rekap dari semester sebelumnya.
              </div>
            ) : (
              archives.map((arc) => (
                <div key={arc.id} className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                      <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{arc.namaFile}</p>
                      <p className="text-xs text-muted-foreground">
                        Periode: {arc.periode} · Upload: {arc.uploadedAt}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                     <Button variant="ghost" size="sm" className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteArsip(arc.id, arc.namaFile)}>
                       <Trash2 className="h-3.5 w-3.5" /> Hapus
                     </Button>
                     <Button variant="outline" size="sm" className="gap-1 text-navy-600 border-navy-200" onClick={() => handleDownloadArsip(arc)}>
                       <Download className="h-3.5 w-3.5" /> Unduh
                     </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
