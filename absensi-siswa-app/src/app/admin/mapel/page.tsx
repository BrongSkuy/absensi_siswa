"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, Search, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface SubjectRow {
  id: string;
  namaMapel: string;
  guruPengampu: string | null;
}

interface TeacherRow {
  id: string;
  namaLengkap: string;
}

export default function AdminMapelPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formGuru, setFormGuru] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [subjectRes, teacherRes] = await Promise.all([
        fetch("/api/subjects"),
        fetch("/api/teachers")
      ]);
      const subjectData = await subjectRes.json();
      const teacherData = await teacherRes.json();
      setSubjects(subjectData);
      setTeachers(teacherData);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = subjects.filter(
    (m) =>
      m.namaMapel.toLowerCase().includes(search.toLowerCase()) ||
      (m.guruPengampu || "").toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setFormName("");
    setFormGuru("none");
    setEditId(null);
  };

  const handleCreate = async () => {
    if (!formName) {
      toast.error("Nama mata pelajaran wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaMapel: formName,
          guruPengampu: formGuru === "none" ? null : formGuru,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success("Mata pelajaran berhasil ditambahkan!");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal menambahkan mata pelajaran";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (mapel: SubjectRow) => {
    setEditId(mapel.id);
    setFormName(mapel.namaMapel);
    setFormGuru(mapel.guruPengampu || "none");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editId || !formName) {
      toast.error("Nama mata pelajaran wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/subjects/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaMapel: formName,
          guruPengampu: formGuru === "none" ? null : formGuru,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mengupdate");
      }

      toast.success("Mata pelajaran berhasil diperbarui!");
      setEditOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal mengupdate mata pelajaran";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (subject: SubjectRow) => {
    if (!confirm(`Yakin ingin menghapus mata pelajaran ${subject.namaMapel}?`)) return;

    try {
      const res = await fetch(`/api/subjects/${subject.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Gagal menghapus");

      toast.success(`Mata pelajaran ${subject.namaMapel} berhasil dihapus!`);
      fetchData();
    } catch {
      toast.error("Gagal menghapus mata pelajaran");
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
      <PageHeader title="Mata Pelajaran" description="Kelola daftar mata pelajaran" icon={BookOpen}>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger render={
             <Button size="sm" className="gap-2 bg-navy-500 hover:bg-navy-600">
              <Plus className="h-4 w-4" /> Tambah Mata Pelajaran
             </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Mata Pelajaran</DialogTitle>
              <DialogDescription>Masukkan detail mata pelajaran baru</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nama-mapel">Nama Mata Pelajaran</Label>
                <Input id="nama-mapel" placeholder="Contoh: Matematika Lanjut" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guru">Guru Pengampu</Label>
                <Select value={formGuru} onValueChange={(val) => setFormGuru(val || "")}>
                  <SelectTrigger id="guru"><SelectValue placeholder="Pilih guru pangampu (opsional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Belum ditentukan</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.namaLengkap}>{t.namaLengkap}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Batal</Button>
              <Button className="bg-navy-500 hover:bg-navy-600" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Edit Mapel */}
        <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Mata Pelajaran</DialogTitle>
              <DialogDescription>Perbarui detail mata pelajaran</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nama-mapel">Nama Mata Pelajaran</Label>
                <Input id="edit-nama-mapel" placeholder="Contoh: Matematika Lanjut" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-guru">Guru Pengampu</Label>
                <Select value={formGuru} onValueChange={(val) => setFormGuru(val || "")}>
                  <SelectTrigger id="edit-guru"><SelectValue placeholder="Pilih guru pengampu (opsional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Belum ditentukan</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.namaLengkap}>{t.namaLengkap}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditOpen(false); resetForm(); }}>Batal</Button>
              <Button className="bg-navy-500 hover:bg-navy-600" onClick={handleEdit} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cari mata pelajaran atau guru..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 pl-6">No</TableHead>
                <TableHead>Nama Mata Pelajaran</TableHead>
                <TableHead>Guru Pengampu</TableHead>
                <TableHead className="text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Tidak ada data mata pelajaran yang ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((mapel, i) => (
                  <TableRow key={mapel.id}>
                    <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium text-navy-900">{mapel.namaMapel}</TableCell>
                    <TableCell>{mapel.guruPengampu || "-"}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-navy-500 hover:bg-navy-50" aria-label={`Edit ${mapel.namaMapel}`} onClick={() => openEdit(mapel)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" aria-label={`Hapus ${mapel.namaMapel}`} onClick={() => handleDelete(mapel)}>
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
