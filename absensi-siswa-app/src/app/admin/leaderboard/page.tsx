"use client";

import React, { useEffect, useState, useRef } from "react";
import { 
  Trophy, Download, Upload, FileSpreadsheet, Loader2, Trash2,
  AlertTriangle, CheckCircle2, Globe, Lock, Unlock, ShieldAlert
} from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

interface MissingCriterion {
  studentId: string;
  studentName: string;
  kelas: string;
  criteriaId: string;
  criteriaName: string;
  reason: string;
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
  const [validation, setValidation] = useState<{
    isValid: boolean;
    missing: MissingCriterion[];
  } | null>(null);
  const [publishStatus, setPublishStatus] = useState<{
    periode: string;
    isPublished: boolean;
    publishedAt: string | null;
    publishedBy: string | null;
  } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [showMissingDialog, setShowMissingDialog] = useState(false);

  const [archives, setArchives] = useState(initialArchives);
  const archiveRef = useRef<HTMLInputElement>(null);

  const fetchPublishStatus = async () => {
    try {
      const r = await fetch("/api/spk/publish");
      const res = await r.json();
      setPublishStatus(res);
    } catch (e) {
      console.error("Gagal mengambil status publikasi", e);
    }
  };

  useEffect(() => {
    fetch("/api/classes").then(r => r.json()).then(setClasses).catch(() => {});
    fetchPublishStatus();
  }, []);

  useEffect(() => {
    setLoading(true);
    const targetKelas = activeTab === "umum" || activeTab === "kelas" || activeTab === "angkatan" ? "umum" : activeTab;
    fetch(`/api/spk/calculate?kelas=${encodeURIComponent(targetKelas)}`)
      .then(r => r.json())
      .then(res => {
         // res is { results, validation } for admin
         setData(res.results || []);
         setValidation(res.validation || null);
         setLoading(false);
      })
      .catch(() => {
         toast.error("Gagal memuat SPK");
         setLoading(false);
      });
  }, [activeTab]);

  const handlePublish = async () => {
    if (!publishStatus) return;
    setPublishing(true);
    try {
      const r = await fetch("/api/spk/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periode: publishStatus.periode
        })
      });
      const res = await r.json();
      if (!r.ok) {
        if (res.missing) {
          setValidation({ isValid: false, missing: res.missing });
        }
        toast.error(res.error || "Gagal mempublikasikan leaderboard");
      } else {
        toast.success(res.message || "Leaderboard berhasil dipublikasikan!");
        fetchPublishStatus();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat mempublikasikan.");
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!publishStatus) return;
    setPublishing(true);
    try {
      const r = await fetch(`/api/spk/publish?periode=${encodeURIComponent(publishStatus.periode)}`, {
        method: "DELETE"
      });
      const res = await r.json();
      if (!r.ok) {
        toast.error(res.error || "Gagal membatalkan publikasi");
      } else {
        toast.success(res.message || "Publikasi berhasil dibatalkan!");
        fetchPublishStatus();
      }
    } catch {
      toast.error("Terjadi kesalahan sistem saat membatalkan publikasi.");
    } finally {
      setPublishing(false);
    }
  };

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

  const hasMissing = validation ? !validation.isValid : false;

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

      {/* Modern Status Publikasi & Kontrol Banner (Premium UI) */}
      {publishStatus && (
        <Card className="border border-navy-100 overflow-hidden shadow-sm transition-all hover:shadow-md hide-on-print">
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-navy-500 to-indigo-600" />
          <CardContent className="p-6 pl-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="border-navy-300 text-navy-800 bg-navy-50/50 font-semibold px-2.5 py-0.5">
                    Periode Semester: {publishStatus.periode}
                  </Badge>
                  {publishStatus.isPublished ? (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1.5 animate-pulse-subtle">
                      <Globe className="h-3 w-3" /> Terpublikasi
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700 flex items-center gap-1.5 border border-slate-200">
                      <Lock className="h-3 w-3" /> Draf (Belum Dirilis)
                    </Badge>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                  Status Kelayakan & Kontrol Publikasi SPK
                </h3>
                <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
                  {publishStatus.isPublished 
                    ? `Peringkat resmi telah dipublikasikan secara umum. Guru dan siswa saat ini dapat melihat hasil leaderboard dari database hasil akhir.`
                    : `Siswa dan guru saat ini terblokir dari melihat hasil leaderboard. Anda dapat memantau kalkulasi real-time di bawah ini sebelum mempublikasikannya secara resmi.`}
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
                {publishStatus.isPublished ? (
                  <AlertDialog>
                    <AlertDialogTrigger render={
                      <Button variant="outline" className="border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 transition-all font-medium">
                        <Lock className="mr-2 h-4 w-4" /> Batalkan Publikasi
                      </Button>
                    } />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-slate-800">
                          <ShieldAlert className="h-5 w-5 text-red-500" />
                          Batalkan Publikasi Leaderboard?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 leading-relaxed text-sm">
                          Tindakan ini akan menarik kembali peringkat resmi untuk periode <strong className="text-slate-800">{publishStatus.periode}</strong>. Siswa dan guru tidak akan dapat melihat leaderboard lagi. Data akan dikembalikan ke mode draf.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleUnpublish} 
                          className="bg-red-600 hover:bg-red-700 text-white font-medium"
                          disabled={publishing}
                        >
                          {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Ya, Batalkan Publikasi
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <div className="flex flex-col gap-3">
                    <AlertDialog>
                      <AlertDialogTrigger render={
                        <Button 
                          className="bg-gradient-to-r from-navy-600 to-indigo-600 hover:from-navy-700 hover:to-indigo-700 text-white font-semibold shadow-sm transition-all"
                          disabled={hasMissing}
                        >
                          <Unlock className="mr-2 h-4 w-4" /> Publikasikan Leaderboard
                        </Button>
                      } />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2 text-slate-800">
                            <Trophy className="h-5 w-5 text-amber-500" />
                            Publikasikan Peringkat Semester Resmi?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-500 leading-relaxed text-sm">
                            Tindakan ini akan mengunci kalkulasi SPK SAW saat ini dan menyimpannya sebagai hasil resmi untuk periode <strong className="text-slate-800">{publishStatus.periode}</strong>. 
                            <span className="block mt-2 font-medium text-emerald-600">Semua data kriteria telah divalidasi 100% lengkap untuk seluruh siswa.</span>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handlePublish} 
                            className="bg-navy-600 hover:bg-navy-700 text-white font-medium"
                            disabled={publishing}
                          >
                            {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Konfirmasi & Rilis
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Notice Panel inside Status card */}
            {hasMissing && !publishStatus.isPublished && (
              <div className="mt-5 p-4 rounded-lg bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex gap-3 items-start">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">Validasi Kriteria Belum Lengkap ({validation?.missing.length} Item Kosong)</h4>
                    <p className="text-xs text-amber-700 leading-relaxed mt-0.5">
                      Beberapa kriteria penilaian manual belum diisi oleh guru, atau siswa belum tercatat di data absensi periode aktif.
                    </p>
                  </div>
                </div>

                <AlertDialog open={showMissingDialog} onOpenChange={setShowMissingDialog}>
                  <AlertDialogTrigger render={
                    <Button variant="outline" size="sm" className="border-amber-300 text-amber-800 hover:bg-amber-100/80 font-medium whitespace-nowrap shrink-0">
                      Lihat Rincian Kosong
                    </Button>
                  } />
                  <AlertDialogContent className="max-w-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-slate-800">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Daftar Penilaian Kosong (SPK SAW)
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-500 text-xs">
                        Item penilaian berikut belum diinput oleh guru untuk semester aktif ({publishStatus.periode}). Semua item ini harus dilengkapi sebelum peringkat semester dapat dipublikasikan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    {/* Scrollable list */}
                    <div className="my-4 border border-slate-100 rounded-lg max-h-[300px] overflow-y-auto bg-slate-50/50">
                      <Table>
                        <TableHeader className="bg-slate-100/70 sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="py-2.5 pl-3">Siswa</TableHead>
                            <TableHead className="py-2.5">Kelas</TableHead>
                            <TableHead className="py-2.5">Kriteria</TableHead>
                            <TableHead className="py-2.5 pr-3">Status/Penyebab</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {validation?.missing.map((item, idx) => (
                            <TableRow key={idx} className="hover:bg-amber-50/20 text-xs">
                              <TableCell className="font-semibold py-2 pl-3 text-slate-800">{item.studentName}</TableCell>
                              <TableCell className="py-2"><Badge variant="outline" className="px-1.5 py-0 text-[10px]">{item.kelas}</Badge></TableCell>
                              <TableCell className="py-2 font-medium text-slate-700">{item.criteriaName}</TableCell>
                              <TableCell className="py-2 pr-3 text-amber-700 italic font-mono">{item.reason}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <AlertDialogFooter>
                      <AlertDialogAction onClick={() => setShowMissingDialog(false)} className="bg-slate-800 hover:bg-slate-900 text-white font-medium">
                        Tutup Rincian
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {!hasMissing && !publishStatus.isPublished && (
              <div className="mt-5 p-4 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">Validasi Penilaian Sempurna (100%)</h4>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Semua kriteria manual dan otomatis telah terisi lengkap untuk setiap siswa. Hasil perhitungan SPK SAW dijamin akurat dan siap dirilis.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main calculation preview container */}
      <Card className="print-area">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Peringkat Semester Aktif</CardTitle>
              <CardDescription>
                {publishStatus ? `Kalkulasi SPK Real-Time Periode ${publishStatus.periode}` : "Mengambil data..."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
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

