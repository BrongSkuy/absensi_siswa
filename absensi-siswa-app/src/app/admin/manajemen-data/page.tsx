"use client";

import { useState, useEffect } from "react";
import { 
  Database, 
  Download, 
  Trash2, 
  Loader2, 
  AlertTriangle, 
  ShieldAlert, 
  FileSpreadsheet,
  CalendarRange,
  Plus,
  CheckCircle2,
  CalendarPlus,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { getTodayWIB } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface AcademicYear {
  id: string;
  tahunAjaran: string;
  semester: "Ganjil" | "Genap";
  isActive: boolean;
}

export default function ManajemenDataPage() {
  const [exporting, setExporting] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Multi-step reset dialog
  const [resetStep, setResetStep] = useState(0); // 0=closed, 1=warning+export, 2=final confirm
  const [confirmText, setConfirmText] = useState("");

  // Academic years state
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loadingYears, setLoadingYears] = useState(false);
  const [isAddingYear, setIsAddingYear] = useState(false);
  const [newTahunAjaran, setNewTahunAjaran] = useState("");
  const [newSemester, setNewSemester] = useState<"Ganjil" | "Genap">("Ganjil");
  const [newIsActive, setNewIsActive] = useState(false);
  const [submittingYear, setSubmittingYear] = useState(false);

  // Controlled delete dialog state
  const [yearToDelete, setYearToDelete] = useState<AcademicYear | null>(null);

  const fetchAcademicYears = async () => {
    setLoadingYears(true);
    try {
      const res = await fetch("/api/system/academic-years");
      if (!res.ok) throw new Error("Gagal mengambil data");
      const data = await res.json();
      setAcademicYears(data);
    } catch {
      toast.error("Gagal memuat data tahun ajaran.");
    } finally {
      setLoadingYears(false);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const handleSetActive = async (id: string) => {
    try {
      const res = await fetch("/api/system/academic-years", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal mengubah periode aktif");
      }
      toast.success("Periode aktif berhasil diperbarui!");
      fetchAcademicYears();
    } catch (error: any) {
      toast.error(error.message || "Gagal memperbarui periode aktif.");
    }
  };

  const handleDeleteYear = async (id: string) => {
    try {
      const res = await fetch(`/api/system/academic-years?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus periode");
      }
      toast.success("Periode tahun ajaran berhasil dihapus!");
      fetchAcademicYears();
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus periode.");
    }
  };

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTahunAjaran) {
      toast.error("Tahun ajaran wajib diisi (contoh: 2025/2026)");
      return;
    }

    // Format validation (e.g. YYYY/YYYY)
    const yearPattern = /^\d{4}\/\d{4}$/;
    if (!yearPattern.test(newTahunAjaran)) {
      toast.error("Format Tahun Ajaran harus YYYY/YYYY (contoh: 2025/2026)");
      return;
    }

    setSubmittingYear(true);
    try {
      const res = await fetch("/api/system/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tahunAjaran: newTahunAjaran,
          semester: newSemester,
          isActive: newIsActive,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menambah periode");
      }
      toast.success("Periode tahun ajaran baru berhasil ditambahkan!");
      setIsAddingYear(false);
      setNewTahunAjaran("");
      setNewSemester("Ganjil");
      setNewIsActive(false);
      fetchAcademicYears();
    } catch (error: any) {
      toast.error(error.message || "Gagal menambahkan periode baru.");
    } finally {
      setSubmittingYear(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/system/export-all");
      if (!res.ok) throw new Error("Gagal export");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Export_Seluruh_Data_${getTodayWIB()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("File Excel berhasil diunduh!");
    } catch {
      toast.error("Gagal mengekspor data.");
    } finally {
      setExporting(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/system/reset", { method: "POST" });
      if (!res.ok) throw new Error("Gagal reset");
      const data = await res.json();
      toast.success(data.message || "Data berhasil direset!");
      setResetStep(0);
      setConfirmText("");
      fetchAcademicYears();
    } catch {
      toast.error("Gagal mereset data.");
    } finally {
      setResetting(false);
    }
  };

  const activePeriod = academicYears.find(y => y.isActive);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Data"
        description="Kelola periode tahun ajaran aktif, unduh backup data, atau reset data sistem."
        icon={Database}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Academic Years Management (Main Feature) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50/20 to-white shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-blue-900">
                  <CalendarRange className="h-5 w-5 text-blue-600 animate-pulse" />
                  Periode Tahun Ajaran
                </CardTitle>
                <CardDescription>
                  Kelola tahun ajaran dan semester aktif untuk memisahkan data absensi dan penilaian SPK.
                </CardDescription>
              </div>
              <Button 
                onClick={() => setIsAddingYear(true)} 
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Tambah Periode
              </Button>
            </CardHeader>
            <CardContent>
              {/* Highlight Active Period Banner */}
              {activePeriod ? (
                <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white shadow-inner mb-6 transition-all duration-300 hover:shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-white/20 p-2">
                      <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-100 font-medium tracking-wide uppercase">Periode Aktif Saat Ini</p>
                      <h3 className="text-xl font-bold tracking-tight">Tahun Ajaran {activePeriod.tahunAjaran} — Semester {activePeriod.semester}</h3>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-white/40 bg-white/10 text-white px-3 py-1 font-semibold uppercase text-xs tracking-wider animate-pulse">
                    Aktif
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-gradient-to-r from-amber-500 to-amber-600 p-4 text-white shadow-inner mb-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-white/20 p-2">
                      <AlertTriangle className="h-6 w-6 text-amber-100" />
                    </div>
                    <div>
                      <p className="text-xs text-amber-100 font-medium">PERINGATAN</p>
                      <h3 className="text-lg font-bold">Belum Ada Periode Aktif</h3>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-white/40 bg-white/10 text-white font-semibold">
                    Nonaktif
                  </Badge>
                </div>
              )}

              {/* Table of periods */}
              <div className="rounded-lg border border-gray-100 bg-white shadow-inner overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="font-semibold text-gray-700">Tahun Ajaran</TableHead>
                      <TableHead className="font-semibold text-gray-700">Semester</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">Status</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingYears ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          <div className="flex items-center justify-center gap-2 text-gray-500">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                            <span>Memuat data...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : academicYears.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                          Belum ada periode tahun ajaran terdaftar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      academicYears.map((year) => (
                        <TableRow 
                          key={year.id} 
                          className={`transition-colors duration-150 ${year.isActive ? "bg-blue-50/30 hover:bg-blue-50/50 font-medium" : "hover:bg-gray-50/50"}`}
                        >
                          <TableCell className="py-3.5 text-gray-900">{year.tahunAjaran}</TableCell>
                          <TableCell className="py-3.5 text-gray-900">{year.semester}</TableCell>
                          <TableCell className="py-3.5 text-center">
                            {year.isActive ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-semibold px-2 py-0.5">
                                Aktif
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-500 hover:bg-gray-100 px-2 py-0.5">
                                Tidak Aktif
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3.5 text-right">
                            <div className="flex justify-end items-center gap-2">
                              {!year.isActive && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => handleSetActive(year.id)}
                                    className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 text-xs py-1 h-7"
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Set Aktif
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setYearToDelete(year)}
                                    className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Export and Reset Cards (Stacked) */}
        <div className="space-y-6">
          {/* Export Card */}
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/30 to-white shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-emerald-950">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                Export Seluruh Data
              </CardTitle>
              <CardDescription>
                Unduh semua data sistem dalam format Excel (.xlsx) dengan banyak sheet untuk cadangan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4 mb-4">
                <ul className="text-xs text-emerald-800 space-y-1">
                  <li>• Data Siswa, Guru, Kelas & Mapel</li>
                  <li>• Seluruh Catatan Absensi</li>
                  <li>• Seluruh Nilai & Kriteria SPK</li>
                  <li>• Penugasan Guru-Kelas & Guru-Mapel</li>
                  <li>• Hasil Leaderboard SPK (Umum & Per Kelas)</li>
                </ul>
              </div>
              <Button
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/10"
                size="lg"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                {exporting ? "Mengunduh..." : "Download Excel"}
              </Button>
            </CardContent>
          </Card>

          {/* Reset Card */}
          <Card className="border-red-200 bg-gradient-to-br from-red-50/30 to-white shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-red-950">
                <ShieldAlert className="h-5 w-5 text-red-600" />
                Reset Seluruh Data
              </CardTitle>
              <CardDescription>
                Hapus semua data operasional sistem. Konfigurasi SPK dan akun pengguna tetap dipertahankan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-red-100 bg-red-50/50 p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-800 leading-relaxed">
                    <strong>Peringatan!</strong> Tindakan ini bersifat permanen dan menghapus semua data transaksi periode ini. Pastikan Anda sudah mengklik &quot;Download Excel&quot; sebelum melakukan reset.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="lg"
                className="w-full gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 shadow-sm"
                onClick={() => setResetStep(1)}
              >
                <Trash2 className="h-5 w-5" />
                Reset Seluruh Data
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Academic Year Dialog */}
      <Dialog open={isAddingYear} onOpenChange={setIsAddingYear}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleAddYear}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-blue-900">
                <CalendarPlus className="h-5 w-5 text-blue-600" />
                Tambah Periode Ajaran
              </DialogTitle>
              <DialogDescription>
                Buat periode tahun ajaran dan semester baru untuk pencatatan absensi dan SPK.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="tahunAjaran" className="text-sm font-medium">Tahun Ajaran</Label>
                <Input
                  id="tahunAjaran"
                  placeholder="Contoh: 2025/2026"
                  value={newTahunAjaran}
                  onChange={(e) => setNewTahunAjaran(e.target.value)}
                  className="focus-visible:ring-blue-500"
                  maxLength={9}
                />
                <span className="text-[10px] text-gray-400">Gunakan format YYYY/YYYY (contoh: 2025/2026)</span>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="semester" className="text-sm font-medium">Semester</Label>
                <Select
                  value={newSemester}
                  onValueChange={(val) => {
                    if (val === "Ganjil" || val === "Genap") {
                      setNewSemester(val);
                    }
                  }}
                >
                  <SelectTrigger id="semester" className="focus:ring-blue-500">
                    <SelectValue placeholder="Pilih Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ganjil">Ganjil</SelectItem>
                    <SelectItem value="Genap">Genap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={newIsActive}
                  onChange={(e) => setNewIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="isActive" className="text-sm font-normal text-gray-700 cursor-pointer">
                  Jadikan periode aktif saat ini
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddingYear(false)}
                disabled={submittingYear}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                disabled={submittingYear}
              >
                {submittingYear ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!yearToDelete} onOpenChange={(open) => { if (!open) setYearToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Periode Tahun Ajaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus periode tahun ajaran <strong className="text-gray-900">{yearToDelete?.tahunAjaran} ({yearToDelete?.semester})</strong>? 
              Tindakan ini tidak akan menghapus data absensi/SPK yang sudah berelasi, namun periode ini tidak akan tersedia lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setYearToDelete(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white animate-in"
              onClick={() => {
                if (yearToDelete) {
                  handleDeleteYear(yearToDelete.id);
                  setYearToDelete(null);
                }
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset System Dialog (Combined Warning & Confirmation) */}
      <AlertDialog open={resetStep === 1} onOpenChange={(open) => {
        if (!open) {
          setResetStep(0);
          setConfirmText("");
        }
      }}>
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Peringatan Reset Sistem
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus seluruh data operasional sistem. Sangat disarankan untuk <strong>Export Data</strong> terlebih dahulu sebagai arsip.
            </AlertDialogDescription>
            <div className="space-y-3 mt-4 text-sm">
              <span className="block font-semibold text-red-600 bg-red-50 p-3 rounded-md">
                Data yang dihapus: Siswa, Guru, Kelas, Mapel, Absensi, Nilai, and Leaderboard SPK.
                <br />
                <span className="text-sm font-normal text-red-500">(Konfigurasi SPK dan akun tetap tersimpan)</span>
              </span>
            </div>
          </AlertDialogHeader>

          <div className="py-2">
            <Label htmlFor="confirm-reset" className="text-sm font-medium text-gray-700">
              Ketik <strong className="text-red-600 font-mono">RESET</strong> untuk konfirmasi penghapusan:
            </Label>
            <Input
              id="confirm-reset"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Ketik RESET di sini..."
              className="mt-2 border-red-200 focus-visible:ring-red-500"
            />
          </div>

          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between items-center sm:items-stretch w-full mt-2">
            <div className="flex w-full sm:w-auto gap-2">
              <AlertDialogCancel onClick={() => { setResetStep(0); setConfirmText(""); }} disabled={resetting} className="w-full sm:w-auto">
                Batal
              </AlertDialogCancel>
              <Button
                variant="outline"
                className="w-full sm:w-auto gap-2 border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                onClick={() => handleExport()}
                disabled={exporting}
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export Dulu
              </Button>
            </div>
            
            <Button
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
              disabled={confirmText !== "RESET" || resetting}
              onClick={(e) => {
                e.preventDefault();
                handleReset();
              }}
            >
              {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {resetting ? "Menghapus..." : "Hapus Semua"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
