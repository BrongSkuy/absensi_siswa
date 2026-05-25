"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import {
  ClipboardCheck, Save, Download, Upload, CheckCheck, Calendar as CalendarIcon, Loader2, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { getTodayWIB } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Status = "Hadir" | "Izin" | "Sakit" | "Alfa";

interface KelasRow {
  id: string;
  namaKelas: string;
  tingkat: string;
}

interface MapelRow {
  namaMapel: string;
  kelas?: string[];
}

interface AttendanceStudent {
  studentId: string;
  nis: string;
  namaLengkap: string;
  status: Status | null;
  attendanceId: string | null;
}

const statusColors: Record<Status, string> = {
  Hadir: "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200",
  Izin: "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200",
  Sakit: "bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-200",
  Alfa: "bg-red-100 text-red-800 border-red-300 hover:bg-red-200",
};

const statusList: Status[] = ["Hadir", "Izin", "Sakit", "Alfa"];

interface HistoryRecord {
  id: string;
  nis: string;
  nama: string;
  history: Record<string, string>;
}

export default function GuruAbsensiPage() {
  const [classes, setClasses] = useState<KelasRow[]>([]);
  const [subjects, setSubjects] = useState<MapelRow[]>([]);
  const [selectedKelas, setSelectedKelas] = useState("");
  const [selectedMapel, setSelectedMapel] = useState("Umum");
  const [tanggal, setTanggal] = useState(getTodayWIB());
  const [showGrid, setShowGrid] = useState(false);
  const [siswaList, setSiswaList] = useState<AttendanceStudent[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, Status>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isWaliKelas, setIsWaliKelas] = useState(false);
  const [waliClasses, setWaliClasses] = useState<string[]>([]);
  const [historyData, setHistoryData] = useState<{dates: string[], records: HistoryRecord[]}>({dates: [], records: []});
  const [loadingHistory, setLoadingHistory] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  // Fetch classes and subjects on mount
  useEffect(() => {
    Promise.all([
      fetch("/api/classes").then((r) => r.json()),
      fetch("/api/teachers/me/subjects")
        .then((r) => r.json())
        .catch(() => ({ isWaliKelas: false, waliClasses: [], classes: [], subjects: [] })),
    ])
      .then(([classesData, subjectsRes]) => {
        const isWali = subjectsRes.isWaliKelas || false;
        const wClasses = subjectsRes.waliClasses || [];
        const assignedClasses = subjectsRes.classes || []; // The string array of assigned class names

        setIsWaliKelas(isWali);
        setWaliClasses(wClasses);

        // Filter out classes that are not assigned to this teacher
        const filteredClasses = classesData.filter((c: KelasRow) => assignedClasses.includes(c.namaKelas));
        setClasses(filteredClasses);

        const firstClass = filteredClasses.length > 0 ? filteredClasses[0].namaKelas : "";
        if (firstClass) setSelectedKelas(firstClass);

        const subjectsData = subjectsRes.subjects || [];
        if (Array.isArray(subjectsData) && subjectsData.length > 0) {
          setSubjects(subjectsData);
          if (!isWali || !wClasses.includes(firstClass)) {
            setSelectedMapel(subjectsData[0].namaMapel);
          } else {
            setSelectedMapel("Umum");
          }
        } else if (!isWali || !wClasses.includes(firstClass)) {
          setSelectedMapel("");
        }
      })
      .catch(() => toast.error("Gagal memuat data awal"));
  }, []);

  // Handle Mapel Reset when Class changes
  useEffect(() => {
    if (selectedKelas && selectedMapel === "Umum" && !waliClasses.includes(selectedKelas)) {
      if (subjects.length > 0) {
        setSelectedMapel(subjects[0].namaMapel);
      } else {
        setSelectedMapel("");
      }
    }
  }, [selectedKelas, selectedMapel, waliClasses, subjects]);

  const fetchHistory = useCallback(async () => {
    if (!selectedKelas) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/attendance/history?kelas=${encodeURIComponent(selectedKelas)}&mapel=${encodeURIComponent(selectedMapel)}`);
      const data = await res.json();
      setHistoryData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedKelas, selectedMapel]);

  const handleLoadGrid = useCallback(async () => {
    if (!selectedKelas) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/attendance?kelas=${encodeURIComponent(selectedKelas)}&tanggal=${tanggal}&mapel=${encodeURIComponent(selectedMapel)}`
      );
      const data: AttendanceStudent[] = await res.json();
      setSiswaList(data);

      // Initialize attendance data
      const init: Record<string, Status> = {};
      data.forEach((s) => {
        init[s.studentId] = s.status || "Hadir";
      });
      setAttendanceData(init);
      setShowGrid(true);
      
      await fetchHistory();
    } catch {
      toast.error("Gagal memuat data absensi");
    } finally {
      setLoading(false);
    }
  }, [selectedKelas, tanggal, selectedMapel, fetchHistory]);

  const handleStatusChange = (studentId: string, status: Status) => {
    setAttendanceData((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAllPresent = () => {
    const all: Record<string, Status> = {};
    siswaList.forEach((s) => { all[s.studentId] = "Hadir"; });
    setAttendanceData(all);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = Object.entries(attendanceData).map(([studentId, status]) => ({
        studentId,
        status,
      }));

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tanggal, mapel: selectedMapel, records }),
      });

      if (!res.ok) throw new Error("Gagal menyimpan");

      const result = await res.json();
      toast.success(`Absensi berhasil disimpan! (${result.count} siswa)`);
      handleLoadGrid(); // refresh
    } catch {
      toast.error("Gagal menyimpan absensi");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/attendance?kelas=${encodeURIComponent(selectedKelas)}&tanggal=${tanggal}&mapel=${encodeURIComponent(selectedMapel)}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Gagal menghapus absensi");

      toast.success(`Data absensi berhasil dihapus!`);
      handleLoadGrid(); // Refresh grid to clear statuses
      setDeleteOpen(false);
    } catch {
      toast.error("Gagal menghapus absensi");
    } finally {
      setDeleting(false);
    }
  };

  const summary = {
    hadir: Object.values(attendanceData).filter((s) => s === "Hadir").length,
    izin: Object.values(attendanceData).filter((s) => s === "Izin").length,
    sakit: Object.values(attendanceData).filter((s) => s === "Sakit").length,
    alfa: Object.values(attendanceData).filter((s) => s === "Alfa").length,
  };

  const handleDownloadTemplate = () => {
    if (!showGrid || siswaList.length === 0) {
      toast.error("Muat absensi terlebih dahulu untuk men-download template");
      return;
    }
    const templateData = siswaList.map((s, i) => ({
      No: i + 1,
      NIS: s.nis,
      NamaLengkap: s.namaLengkap,
      StatusKehadiran: "", // Kosongkan untuk template
    }));
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Absensi");
    XLSX.writeFile(wb, `template_absensi_${selectedKelas}_${selectedMapel}_${tanggal}.xlsx`);
    toast.success("Template absensi berhasil diunduh!");
  };

  const handleExportData = () => {
    if (!showGrid || siswaList.length === 0) {
      toast.error("Muat absensi terlebih dahulu untuk mengekspor data");
      return;
    }
    const exportData = siswaList.map((s, i) => ({
      No: i + 1,
      NIS: s.nis,
      NamaLengkap: s.namaLengkap,
      StatusKehadiran: attendanceData[s.studentId] || "Hadir",
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Absensi");
    XLSX.writeFile(wb, `data_absensi_${selectedKelas}_${selectedMapel}_${tanggal}.xlsx`);
    toast.success("Data absensi berhasil diekspor!");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!showGrid || siswaList.length === 0) {
      toast.error("Muat absensi terlebih dahulu sebelum import");
      if (importRef.current) importRef.current.value = "";
      return;
    }
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

      if (rows.length === 0) {
        toast.error("File kosong atau format tidak sesuai");
        return;
      }

      const statusMap: Record<string, Status> = {};
      const validStatuses = ["Hadir", "Izin", "Sakit", "Alfa"];

      for (const row of rows) {
        const nis = String(row.NIS || row.nis || "").replace(/['"]/g, "").trim();
        const rawStatus = String(row.StatusKehadiran || row.Status || row.statusKehadiran || row.status || row.Keterangan || row.keterangan || "").trim();

        // Normalize status: H/I/S/A shortcuts or full names
        let status: Status = "Hadir";
        if (rawStatus.toUpperCase() === "H" || rawStatus === "Hadir" || rawStatus.toUpperCase() === "HADIR") status = "Hadir";
        else if (rawStatus.toUpperCase() === "I" || rawStatus === "Izin" || rawStatus.toUpperCase() === "IZIN") status = "Izin";
        else if (rawStatus.toUpperCase() === "S" || rawStatus === "Sakit" || rawStatus.toUpperCase() === "SAKIT") status = "Sakit";
        else if (rawStatus.toUpperCase() === "A" || rawStatus === "Alfa" || rawStatus.toUpperCase() === "ALFA") status = "Alfa";
        else if (validStatuses.includes(rawStatus)) status = rawStatus as Status;

        const matched = siswaList.find((s) => s.nis === nis);
        if (matched) {
          statusMap[matched.studentId] = status;
        }
      }

      if (Object.keys(statusMap).length === 0) {
        toast.error("Tidak ada NIS yang cocok dengan data siswa di kelas ini");
        return;
      }

      setAttendanceData((prev) => ({ ...prev, ...statusMap }));
      toast.success(`${Object.keys(statusMap).length} status kehadiran diimport dari file!`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal import";
      toast.error(msg);
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Absensi Siswa (Per Mapel)"
        description="Input kehadiran siswa spesifik pada jam/mata pelajaran yang Anda ampu"
        icon={ClipboardCheck}
      >
        <Button variant="outline" size="sm" className="gap-2 border-navy-200 text-navy-600 hover:bg-navy-50" onClick={handleDownloadTemplate}>
          <Download className="h-4 w-4" /> Template
        </Button>
        <Button variant="outline" size="sm" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={handleExportData}>
          <Save className="h-4 w-4" /> Eksport
        </Button>
        <Button variant="outline" size="sm" className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => importRef.current?.click()} disabled={importing}>
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import
        </Button>
        <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
      </PageHeader>

      {/* Step 1: Select class, mapel, & date */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pengaturan Sesi</CardTitle>
          <CardDescription>Pilih kelas, mata pelajaran, dan tanggal absensi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-2 flex-1">
              <Label>Kelas</Label>
              <Select value={selectedKelas} onValueChange={(val) => setSelectedKelas(val as string)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {classes.map((k) => (
                    <SelectItem key={k.id} value={k.namaKelas}>
                      {k.namaKelas}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 flex-1 sm:min-w-[250px]">
              <Label>Mata Pelajaran</Label>
              <Select value={selectedMapel} onValueChange={(val) => setSelectedMapel(val as string)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isWaliKelas && waliClasses.includes(selectedKelas) && <SelectItem value="Umum">Absen Pagi (Wali Kelas)</SelectItem>}
                  {subjects
                    .filter((s) => s.kelas?.includes(selectedKelas))
                    .map((s, i) => (
                      <SelectItem key={i} value={s.namaMapel}>
                        {s.namaMapel}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex-1">
              <Label>Tanggal</Label>
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <Button className="bg-navy-500 hover:bg-navy-600 gap-2 shrink-0" onClick={handleLoadGrid} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarIcon className="h-4 w-4" />}
              Muat Absensi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Attendance Grid */}
      {showGrid && (
        <>
          {/* Summary bar */}
          <div className="flex flex-wrap flex-col sm:flex-row items-start sm:items-center gap-3">
             <div className="flex items-center gap-2">
                <Badge className="status-hadir gap-1 px-3 py-1.5 text-sm">
                   Hadir: {summary.hadir}
                </Badge>
                <Badge className="status-izin gap-1 px-3 py-1.5 text-sm">
                   Izin: {summary.izin}
                </Badge>
                <Badge className="status-sakit gap-1 px-3 py-1.5 text-sm">
                   Sakit: {summary.sakit}
                </Badge>
                <Badge className="status-alfa gap-1 px-3 py-1.5 text-sm">
                   Alfa: {summary.alfa}
                </Badge>
             </div>
             
             <div className="sm:ml-auto flex items-center gap-2 w-full sm:w-auto">
                {/* Hapus Absensi Button */}
                <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                   <AlertDialogTrigger render={
                      <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 flex-1 sm:flex-none">
                         <Trash2 className="h-4 w-4 mr-2" /> Hapus
                      </Button>
                   } />
                   <AlertDialogContent>
                      <AlertDialogHeader>
                         <AlertDialogTitle>Hapus Data Absensi?</AlertDialogTitle>
                         <AlertDialogDescription>
                            Anda yakin ingin menghapus data absensi <b>{selectedKelas}</b> untuk mapel <b>{selectedMapel}</b> pada tanggal <b>{tanggal}</b>? Tindakan ini tidak dapat dibatalkan.
                         </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                         <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
                         <AlertDialogAction disabled={deleting} onClick={(e) => { e.preventDefault(); handleDelete(); }} className="bg-red-600 hover:bg-red-700 text-white">
                            {deleting ? "Menghapus..." : "Ya, Hapus"}
                         </AlertDialogAction>
                      </AlertDialogFooter>
                   </AlertDialogContent>
                </AlertDialog>

                <Button variant="outline" size="default" className="gap-1 flex-1 sm:flex-none border-navy-200 text-navy-600" onClick={handleMarkAllPresent}>
                   <CheckCheck className="h-4 w-4" /> Hadir Semua
                </Button>
             </div>
          </div>

          {/* Grid Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-max border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-12">No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-24">NIS</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground min-w-[200px] whitespace-nowrap">Nama Siswa</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Status Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siswaList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          Tidak ada siswa di kelas ini
                        </td>
                      </tr>
                    ) : (
                      siswaList.map((siswa, i) => {
                        const currentStatus = attendanceData[siswa.studentId] || "Hadir";
                        return (
                          <tr
                            key={siswa.studentId}
                            className="border-b transition-colors hover:bg-muted/30"
                          >
                            <td className="px-4 py-3 text-sm text-muted-foreground">{i + 1}</td>
                            <td className="px-4 py-3 font-mono text-sm">{siswa.nis}</td>
                            <td className="px-4 py-3 text-sm font-medium">{siswa.namaLengkap}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                {statusList.map((status) => (
                                  <button
                                    key={status}
                                    onClick={() => handleStatusChange(siswa.studentId, status)}
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                                      currentStatus === status
                                        ? `${statusColors[status]} ring-2 ring-offset-1 ${
                                            status === "Hadir" ? "ring-emerald-400" :
                                            status === "Izin" ? "ring-amber-400" :
                                            status === "Sakit" ? "ring-sky-400" :
                                            "ring-red-400"
                                          } scale-105`
                                        : "border-gray-200 bg-white text-gray-400 hover:bg-gray-50"
                                    }`}
                                    aria-label={`Tandai ${siswa.namaLengkap} ${status}`}
                                  >
                                    {status === "Hadir" ? "H" :
                                     status === "Izin" ? "I" :
                                     status === "Sakit" ? "S" : "A"}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              size="lg"
              className="gap-2 bg-navy-500 hover:bg-navy-600 shadow-lg shadow-navy-500/20 w-full sm:w-auto"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {saving ? "Menyimpan..." : "Simpan Semua Absensi"}
            </Button>
          </div>

          {/* History Table */}
          {/* History Table */}
          <Card className="mt-8">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                Riwayat Kehadiran ({selectedMapel === "Umum" ? "Umum / Wali Kelas" : selectedMapel})
                {loadingHistory && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardTitle>
              <CardDescription>Menampilkan semua riwayat absen yang pernah diinput untuk mata pelajaran ini</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {historyData.dates.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Belum ada riwayat absensi yang disimpan untuk mata pelajaran ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max text-left border-collapse">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-sm font-semibold text-muted-foreground w-12 border-b text-center">No</th>
                        <th className="px-4 py-3 text-sm font-semibold text-muted-foreground border-b text-center">NIS</th>
                        <th className="px-4 py-3 text-sm font-semibold text-muted-foreground border-b min-w-[200px]">Nama Siswa</th>
                        {historyData.dates.map(date => (
                          <th key={date} className="px-4 py-3 text-center text-sm font-semibold text-muted-foreground border-b whitespace-nowrap">
                            {new Date(date).toLocaleDateString("id-ID", { day: '2-digit', month: 'short' })}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.records.map((siswa, index) => (
                        <tr key={siswa.id} className="border-b transition-colors hover:bg-muted/30">
                          <td className="px-4 py-3 text-sm text-muted-foreground text-center">{index + 1}</td>
                          <td className="px-4 py-3 font-mono text-sm text-center">{siswa.nis}</td>
                          <td className="px-4 py-3 text-sm font-medium">{siswa.nama}</td>
                          {historyData.dates.map(date => {
                            const status = siswa.history[date];
                            return (
                              <td key={date} className="px-4 py-3 text-center text-sm">
                                <Badge variant={
                                  status === "Hadir" ? "default" :
                                  status === "Izin" ? "secondary" :
                                  status === "Sakit" ? "outline" :
                                  status === "Alfa" ? "destructive" : "outline"
                                } className={
                                  status === "Hadir" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-transparent" :
                                  status === "Izin" ? "bg-amber-100 text-amber-700 hover:bg-amber-200 border-transparent" :
                                  status === "Sakit" ? "bg-sky-100 text-sky-700 hover:bg-sky-200 border-sky-200 border-transparent" :
                                  status === "Alfa" ? "bg-red-100 text-red-700 hover:bg-red-200 border-transparent" : "bg-gray-100 text-gray-400 border-gray-200"
                                }>
                                  {status === "Hadir" ? "H" : status === "Izin" ? "I" : status === "Sakit" ? "S" : status === "Alfa" ? "A" : "-"}
                                </Badge>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
