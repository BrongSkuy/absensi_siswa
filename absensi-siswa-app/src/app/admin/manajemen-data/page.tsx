"use client";

import { useState, useEffect, useCallback } from "react";
import { Database, Download, Trash2, Loader2, AlertTriangle, ShieldAlert, FileSpreadsheet, Calendar, Plus, Check } from "lucide-react";
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function ManajemenDataPage() {
  const [exporting, setExporting] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Multi-step reset dialog
  const [resetStep, setResetStep] = useState(0); // 0=closed, 1=warning+export, 2=final confirm
  const [confirmText, setConfirmText] = useState("");

  // Academic Period State
  const [periods, setPeriods] = useState<any[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [submittingPeriod, setSubmittingPeriod] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);

  // Form State
  const [newTahunAjaran, setNewTahunAjaran] = useState("");
  const [newSemester, setNewSemester] = useState("Ganjil");
  const [newIsActive, setNewIsActive] = useState("false");

  const fetchPeriods = useCallback(async () => {
    setLoadingPeriods(true);
    try {
      const res = await fetch("/api/system/academic-years");
      if (!res.ok) throw new Error("Gagal mengambil data periode");
      const data = await res.json();
      setPeriods(data);
    } catch {
      toast.error("Gagal memuat data periode semester.");
    } finally {
      setLoadingPeriods(false);
    }
  }, []);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const resetPeriodForm = () => {
    setNewTahunAjaran("");
    setNewSemester("Ganjil");
    setNewIsActive("false");
  };

  const handleAddPeriod = async () => {
    if (!newTahunAjaran) {
      toast.error("Tahun Ajaran wajib diisi.");
      return;
    }
    const yearPattern = /^\d{4}\/\d{4}$/;
    if (!yearPattern.test(newTahunAjaran)) {
      toast.error("Format Tahun Ajaran harus YYYY/YYYY (misalnya: 2025/2026).");
      return;
    }

    setSubmittingPeriod(true);
    try {
      const res = await fetch("/api/system/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tahunAjaran: newTahunAjaran,
          semester: newSemester,
          isActive: newIsActive === "true",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");

      toast.success(data.message || "Periode semester berhasil disimpan!");
      setOpenAddDialog(false);
      resetPeriodForm();
      fetchPeriods();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmittingPeriod(false);
    }
  };

  const handleSetActive = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin mengaktifkan periode ini?\nSemua data operasional yang tampil di dashboard dan penginputan absensi/nilai akan beralih ke periode baru ini.")) {
      return;
    }

    try {
      const res = await fetch("/api/system/academic-years", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status aktif");

      toast.success(data.message || "Periode aktif berhasil diubah!");
      fetchPeriods();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeletePeriod = async (period: any) => {
    if (period.isActive) {
      toast.error("Tidak dapat menghapus periode semester yang aktif.");
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus periode semester ${period.tahunAjaran} - ${period.semester}?\nTindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/system/academic-years?id=${period.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");

      toast.success(data.message || "Periode semester berhasil dihapus.");
      fetchPeriods();
    } catch (error: any) {
      toast.error(error.message);
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
    } catch {
      toast.error("Gagal mereset data.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Data"
        description="Export seluruh data sistem atau reset data untuk memulai periode baru."
        icon={Database}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Export Card */}
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              Export Seluruh Data
            </CardTitle>
            <CardDescription>
              Unduh semua data sistem dalam format Excel (.xlsx) dengan banyak sheet:
              Siswa, Guru, Kelas, Mapel, Absensi, Nilai, Kriteria SPK, Penugasan Guru, dan Leaderboard SPK.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 mb-4">
              <ul className="text-sm text-emerald-800 space-y-1">
                <li>• Data Siswa (NIS, Nama, Kelas, Angkatan)</li>
                <li>• Data Guru (NIP, Nama, Status)</li>
                <li>• Data Kelas & Mata Pelajaran</li>
                <li>• Seluruh Catatan Absensi</li>
                <li>• Seluruh Nilai & Kriteria SPK</li>
                <li>• Penugasan Guru-Kelas & Guru-Mapel</li>
                <li>• Hasil Leaderboard SPK (Umum & Per Kelas)</li>
              </ul>
            </div>
            <Button
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
              size="lg"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              {exporting ? "Mengunduh..." : "Download Excel Seluruh Data"}
            </Button>
          </CardContent>
        </Card>

        {/* Reset Card */}
        <Card className="border-red-200 bg-gradient-to-br from-red-50/50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              Reset Seluruh Data
            </CardTitle>
            <CardDescription>
              Hapus semua data operasional (siswa, guru, kelas, mapel, absensi, dan nilai).
              Konfigurasi SPK dan akun pengguna tetap dipertahankan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <p className="font-semibold mb-1">Peringatan!</p>
                  <p>Tindakan ini bersifat permanen dan tidak dapat dibatalkan. Pastikan Anda sudah mengklik tombol &quot;Export Seluruh Data&quot; sebelum melakukan reset.</p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setResetStep(1)}
            >
              <Trash2 className="h-5 w-5" />
              Reset Seluruh Data
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Pengaturan Periode Semester */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-white shadow-md">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-blue-100">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Calendar className="h-5 w-5 text-blue-600" />
              Pengaturan Periode Semester
            </CardTitle>
            <CardDescription className="mt-1">
              Kelola Tahun Ajaran dan Semester yang aktif untuk mengisolasi absensi, nilai, dan penentuan siswa terbaik.
            </CardDescription>
          </div>
          <Dialog open={openAddDialog} onOpenChange={(open) => { setOpenAddDialog(open); if (!open) resetPeriodForm(); }}>
            <DialogTrigger render={
              <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm">
                <Plus className="h-4 w-4" /> Tambah Periode
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Tambah Periode Semester</DialogTitle>
                <DialogDescription>
                  Masukkan detail Tahun Ajaran baru dan pilih semester untuk ditambahkan ke sistem.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="tahun-ajaran">Tahun Ajaran</Label>
                  <Input 
                    id="tahun-ajaran" 
                    placeholder="Contoh: 2025/2026" 
                    value={newTahunAjaran} 
                    onChange={(e) => setNewTahunAjaran(e.target.value)} 
                  />
                  <p className="text-xs text-muted-foreground">Format penulisan yang disarankan: YYYY/YYYY (misal: 2025/2026)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester</Label>
                  <Select value={newSemester} onValueChange={(val) => setNewSemester(val || "Ganjil")}>
                    <SelectTrigger id="semester">
                      <SelectValue placeholder="Pilih Semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ganjil">Ganjil</SelectItem>
                      <SelectItem value="Genap">Genap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="set-active">Status Keaktifan</Label>
                  <Select value={newIsActive} onValueChange={(val) => setNewIsActive(val || "false")}>
                    <SelectTrigger id="set-active">
                      <SelectValue placeholder="Pilih Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Langsung Aktifkan Periode Ini</SelectItem>
                      <SelectItem value="false">Simpan sebagai Tidak Aktif</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-amber-600">Mengaktifkan periode ini otomatis akan menonaktifkan periode yang saat ini sedang aktif.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setOpenAddDialog(false); resetPeriodForm(); }}>Batal</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAddPeriod} disabled={submittingPeriod}>
                  {submittingPeriod ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Simpan Periode
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="pt-6">
          {loadingPeriods ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : periods.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center">
              <p className="text-sm text-gray-500 font-medium">Belum ada periode semester yang terdaftar.</p>
              <p className="text-xs text-gray-400 mt-1">Klik tombol &quot;Tambah Periode&quot; untuk menambahkan periode pertama.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50/75">
                  <TableRow>
                    <TableHead className="w-12 pl-6">No</TableHead>
                    <TableHead>Tahun Ajaran</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((item, index) => (
                    <TableRow key={item.id} className={item.isActive ? "bg-emerald-50/20 hover:bg-emerald-50/30" : "hover:bg-gray-50/50"}>
                      <TableCell className="pl-6 text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-semibold text-gray-900">{item.tahunAjaran}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={item.semester === "Ganjil" ? "bg-blue-50 text-blue-700 hover:bg-blue-50" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-50"}>
                          {item.semester}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 w-fit">
                            <Check className="h-3 w-3" /> Aktif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50 hover:bg-gray-50">
                            Tidak Aktif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {!item.isActive && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs border-blue-200 text-blue-600 hover:bg-blue-50 h-8 px-3"
                              onClick={() => handleSetActive(item.id)}
                            >
                              Aktifkan
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={`h-8 w-8 text-red-500 hover:bg-red-50 ${item.isActive ? "opacity-40 cursor-not-allowed" : ""}`}
                            disabled={item.isActive}
                            onClick={() => handleDeletePeriod(item)}
                            title={item.isActive ? "Tidak dapat menghapus periode aktif" : "Hapus periode"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
                Data yang dihapus: Siswa, Guru, Kelas, Mapel, Absensi, Nilai, dan Leaderboard SPK.
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
