"use client";

import { useState } from "react";
import { Database, Download, Trash2, Loader2, AlertTriangle, ShieldAlert, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { getTodayWIB } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ManajemenDataPage() {
  const [exporting, setExporting] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Multi-step reset dialog
  const [resetStep, setResetStep] = useState(0); // 0=closed, 1=warning+export, 2=final confirm
  const [confirmText, setConfirmText] = useState("");

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
