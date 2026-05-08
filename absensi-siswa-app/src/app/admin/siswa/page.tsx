"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Users,
  Plus,
  Upload,
  Search,
  Edit,
  Trash2,
  Download,
  Filter,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StudentRow {
  id: string;
  userId: string;
  nis: string;
  namaLengkap: string;
  kelas: string;
  angkatan: string;
  jenisKelamin: "L" | "P";
  status: "aktif" | "nonaktif";
}

interface KelasRow {
  id: string;
  namaKelas: string;
  tingkat: string;
  waliKelas: string | null;
}

export default function AdminSiswaPage() {
  const [search, setSearch] = useState("");
  const [filterKelas, setFilterKelas] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<KelasRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formNis, setFormNis] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formKelas, setFormKelas] = useState("");
  const [formAngkatan, setFormAngkatan] = useState("2024");
  const [formJk, setFormJk] = useState("");
  const [formStatus, setFormStatus] = useState("aktif");

  const fetchData = useCallback(async () => {
    try {
      const [studentsRes, classesRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/classes"),
      ]);
      const studentsData = await studentsRes.json();
      const classesData = await classesRes.json();
      setStudents(studentsData);
      setClasses(classesData);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = students.filter((s) => {
    const matchSearch =
      s.namaLengkap.toLowerCase().includes(search.toLowerCase()) ||
      s.nis.includes(search);
    const matchKelas = filterKelas === "all" || s.kelas === filterKelas;
    return matchSearch && matchKelas;
  });

  const resetForm = () => {
    setFormNis("");
    setFormNama("");
    setFormKelas("");
    setFormAngkatan("2024");
    setFormJk("");
    setFormStatus("aktif");
    setEditId(null);
  };

  const handleCreate = async () => {
    if (!formNis || !formNama || !formKelas || !formJk) {
      toast.error("Semua field wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nis: formNis,
          namaLengkap: formNama,
          kelas: formKelas,
          angkatan: formAngkatan,
          jenisKelamin: formJk,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success("Data siswa berhasil ditambahkan!");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal menambahkan siswa";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (siswa: StudentRow) => {
    setEditId(siswa.id);
    setFormNis(siswa.nis);
    setFormNama(siswa.namaLengkap);
    setFormKelas(siswa.kelas);
    setFormAngkatan(siswa.angkatan);
    setFormJk(siswa.jenisKelamin);
    setFormStatus(siswa.status);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editId || !formNama || !formKelas || !formJk) {
      toast.error("Semua field wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/students/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nis: formNis,
          namaLengkap: formNama,
          kelas: formKelas,
          angkatan: formAngkatan,
          jenisKelamin: formJk,
          status: formStatus,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mengupdate");
      }

      toast.success("Data siswa berhasil diperbarui!");
      setEditOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal mengupdate siswa";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student: StudentRow) => {
    if (!confirm(`Yakin ingin menghapus data ${student.namaLengkap}?`)) return;

    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Gagal menghapus");

      toast.success(`Data ${student.namaLengkap} berhasil dihapus!`);
      fetchData();
    } catch {
      toast.error("Gagal menghapus data siswa");
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { NIS: "2024001", NamaLengkap: "Contoh Nama Siswa", Kelas: "X-A", Angkatan: "2024", JenisKelamin: "L" },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [{ wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
    XLSX.writeFile(wb, "template_data_siswa.xlsx");
    toast.success("Template berhasil diunduh!");
  };

  const handleExportData = () => {
    if (filtered.length === 0) {
      toast.error("Tidak ada data siswa untuk diekspor");
      return;
    }
    const templateData = filtered.map((s, i) => ({
      No: i + 1,
      NIS: s.nis,
      "Nama Lengkap": s.namaLengkap,
      Kelas: s.kelas,
      Angkatan: s.angkatan,
      "Jenis Kelamin": s.jenisKelamin,
      Status: s.status,
    }));
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
    XLSX.writeFile(wb, `Data_Siswa_Export.xlsx`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

      const studentsToImport = rows.map((row) => ({
        nis: String(row.NIS || row.nis || "").trim(),
        namaLengkap: String(row.NamaLengkap || row.namaLengkap || row["Nama Lengkap"] || "").trim(),
        kelas: String(row.Kelas || row.kelas || "").trim(),
        angkatan: String(row.Angkatan || row.angkatan || "").trim(),
        jenisKelamin: String(row.JenisKelamin || row.jenisKelamin || row["Jenis Kelamin"] || "").trim(),
      }));

      const res = await fetch("/api/students/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: studentsToImport }),
      });

      const result = await res.json();

      if (!res.ok) {
         if (result.details && result.details.length > 0) {
            // Show alert for pre-flight validation fail
            toast.error(result.error, {
              description: result.details.join(" | "),
              duration: 10000,
            });
            return;
         }
         throw new Error(result.error);
      }

      toast.success(`${result.imported} data siswa berhasil diimport (Dibuat & Diperbarui)!`);
      fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal import data";
      toast.error(msg);
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Siswa"
        description="Kelola data siswa yang terdaftar di sistem"
        icon={Users}
      >
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-navy-200 text-navy-600 hover:bg-navy-50"
          onClick={handleDownloadTemplate}
        >
          <Download className="h-4 w-4" />
          Template
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
          onClick={() => importRef.current?.click()}
          disabled={importing}
        >
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Import
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          onClick={handleExportData}
        >
          <Download className="h-4 w-4" />
          Export Data
        </Button>
        <input
          ref={importRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleImport}
        />
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger render={
            <Button size="sm" className="gap-2 bg-navy-500 hover:bg-navy-600">
                <Plus className="h-4 w-4" />
                Tambah Siswa
            </Button>
          } />
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Tambah Siswa Baru</DialogTitle>
              <DialogDescription>
                Isi data siswa yang akan didaftarkan ke sistem
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nis">NIS</Label>
                  <Input id="nis" placeholder="Contoh: 2024016" value={formNis} onChange={(e) => setFormNis(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jk">Jenis Kelamin</Label>
                  <Select value={formJk} onValueChange={(val) => setFormJk(val || "")}>
                    <SelectTrigger id="jk">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nama">Nama Lengkap</Label>
                <Input id="nama" placeholder="Masukkan nama lengkap" value={formNama} onChange={(e) => setFormNama(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="kelas">Kelas</Label>
                  <Select value={formKelas} onValueChange={(val) => setFormKelas(val || "")}>
                    <SelectTrigger id="kelas">
                      <SelectValue placeholder="Pilih kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((k) => (
                        <SelectItem key={k.id} value={k.namaKelas}>
                          {k.namaKelas}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="angkatan">Angkatan</Label>
                  <Input id="angkatan" placeholder="2024" value={formAngkatan} onChange={(e) => setFormAngkatan(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setDialogOpen(false); resetForm(); }}
              >
                Batal
              </Button>
              <Button
                className="bg-navy-500 hover:bg-navy-600"
                onClick={handleCreate}
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Edit Siswa */}
        <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Data Siswa</DialogTitle>
              <DialogDescription>
                Perbarui informasi data siswa
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nis">NIS</Label>
                  <Input id="edit-nis" value={formNis} onChange={(e) => setFormNis(e.target.value)} />
                  <p className="text-xs text-amber-600">Mengubah NIS akan mengubah Username login siswa.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-jk">Jenis Kelamin</Label>
                  <Select value={formJk} onValueChange={(val) => setFormJk(val || "")}>
                    <SelectTrigger id="edit-jk">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-nama">Nama Lengkap</Label>
                <Input id="edit-nama" placeholder="Masukkan nama lengkap" value={formNama} onChange={(e) => setFormNama(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-kelas">Kelas</Label>
                  <Select value={formKelas} onValueChange={(val) => setFormKelas(val || "")}>
                    <SelectTrigger id="edit-kelas">
                      <SelectValue placeholder="Pilih kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((k) => (
                        <SelectItem key={k.id} value={k.namaKelas}>
                          {k.namaKelas}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-angkatan">Angkatan</Label>
                  <Input id="edit-angkatan" placeholder="2024" value={formAngkatan} onChange={(e) => setFormAngkatan(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={formStatus} onValueChange={(v) => setFormStatus(v || "aktif")}>
                    <SelectTrigger id="edit-status">
                      <SelectValue placeholder="Pilih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aktif">Aktif</SelectItem>
                      <SelectItem value="nonaktif">Nonaktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setEditOpen(false); resetForm(); }}
              >
                Batal
              </Button>
              <Button
                className="bg-navy-500 hover:bg-navy-600"
                onClick={handleEdit}
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau NIS..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterKelas} onValueChange={(val) => setFilterKelas(val || "all")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {classes.map((k) => (
                  <SelectItem key={k.id} value={k.namaKelas}>
                    {k.namaKelas}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 pl-6">No</TableHead>
                <TableHead>NIS</TableHead>
                <TableHead>Nama Lengkap</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead>Angkatan</TableHead>
                <TableHead>JK</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    {search || filterKelas !== "all" ? "Tidak ada data yang cocok" : "Belum ada data siswa"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((siswa, i) => (
                  <TableRow key={siswa.id}>
                    <TableCell className="pl-6 text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {siswa.nis}
                    </TableCell>
                    <TableCell className="font-medium">
                      {siswa.namaLengkap}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{siswa.kelas}</Badge>
                    </TableCell>
                    <TableCell>{siswa.angkatan}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          siswa.jenisKelamin === "L"
                            ? "border-sky-200 bg-sky-50 text-sky-700"
                            : "border-pink-200 bg-pink-50 text-pink-700"
                        }
                      >
                        {siswa.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          siswa.status === "aktif"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }
                      >
                        {siswa.status === "aktif" ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-navy-500 hover:bg-navy-50 hover:text-navy-700"
                          aria-label={`Edit ${siswa.namaLengkap}`}
                          onClick={() => openEdit(siswa)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                          aria-label={`Hapus ${siswa.namaLengkap}`}
                          onClick={() => handleDelete(siswa)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
