"use client";

import { useState, useEffect, useCallback } from "react";
import { School, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface ClassRow {
  id: string;
  namaKelas: string;
  tingkat: string;
  waliKelas: string | null;
  jumlahSiswa: number;
}

interface TeacherRow {
  id: string;
  namaLengkap: string;
}

export default function AdminKelasPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formTingkat, setFormTingkat] = useState("");
  const [formWali, setFormWali] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [classRes, teacherRes] = await Promise.all([
        fetch("/api/classes"),
        fetch("/api/teachers")
      ]);
      const classData = await classRes.json();
      const teacherData = await teacherRes.json();
      setClasses(classData);
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

  const resetForm = () => {
    setFormName("");
    setFormTingkat("");
    setFormWali("none");
    setEditId(null);
  };

  const handleCreate = async () => {
    if (!formName || !formTingkat) {
      toast.error("Nama kelas dan tingkat wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaKelas: formName,
          tingkat: formTingkat,
          waliKelas: formWali === "none" ? null : formWali,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success("Kelas berhasil ditambahkan!");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal menambahkan kelas";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (kls: ClassRow) => {
    setEditId(kls.id);
    setFormName(kls.namaKelas);
    setFormTingkat(kls.tingkat);
    setFormWali(kls.waliKelas || "none");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editId || !formName || !formTingkat) {
      toast.error("Nama kelas dan tingkat wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/classes/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaKelas: formName,
          tingkat: formTingkat,
          waliKelas: formWali === "none" ? null : formWali,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mengupdate");
      }

      toast.success("Kelas berhasil diperbarui!");
      setEditOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal mengupdate kelas";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (kls: ClassRow) => {
    if (!confirm(`Yakin ingin menghapus kelas ${kls.namaKelas}?`)) return;

    try {
      const res = await fetch(`/api/classes/${kls.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Gagal menghapus");

      toast.success(`Kelas ${kls.namaKelas} berhasil dihapus!`);
      fetchData();
    } catch {
      toast.error("Gagal menghapus kelas");
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
      <PageHeader title="Data Kelas" description="Kelola data kelas dan pembagian wali kelas" icon={School}>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger render={
             <Button size="sm" className="gap-2 bg-navy-500 hover:bg-navy-600">
              <Plus className="h-4 w-4" /> Tambah Kelas
             </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Kelas Baru</DialogTitle>
              <DialogDescription>Isi informasi kelas yang akan dibuat</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nama-kelas">Nama Kelas</Label>
                  <Input id="nama-kelas" placeholder="Contoh: X-A" value={formName} onChange={(e) => setFormName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tingkat">Tingkat</Label>
                  <Select value={formTingkat} onValueChange={(val) => setFormTingkat(val || "")}>
                    <SelectTrigger id="tingkat"><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="11">11</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wali">Wali Kelas</Label>
                <Select value={formWali} onValueChange={(val) => setFormWali(val || "")}>
                  <SelectTrigger id="wali"><SelectValue placeholder="Pilih guru (Opsional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak ada wali kelas</SelectItem>
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

        {/* Dialog Edit Kelas */}
        <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Data Kelas</DialogTitle>
              <DialogDescription>Perbarui informasi kelas</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nama-kelas">Nama Kelas</Label>
                  <Input id="edit-nama-kelas" placeholder="Contoh: X-A" value={formName} onChange={(e) => setFormName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-tingkat">Tingkat</Label>
                  <Select value={formTingkat} onValueChange={(val) => setFormTingkat(val || "")}>
                    <SelectTrigger id="edit-tingkat"><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="11">11</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-wali">Wali Kelas</Label>
                <Select value={formWali} onValueChange={(val) => setFormWali(val || "")}>
                  <SelectTrigger id="edit-wali"><SelectValue placeholder="Pilih guru (Opsional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak ada wali kelas</SelectItem>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            Belum ada data kelas yang didaftarkan.
          </div>
        ) : (
          classes.map((kelas) => (
            <Card key={kelas.id} className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-navy-700">{kelas.namaKelas}</h3>
                    <p className="text-sm text-muted-foreground">Tingkat {kelas.tingkat}</p>
                  </div>
                  <Badge className="bg-navy-100 text-navy-700">{kelas.jumlahSiswa} siswa</Badge>
                </div>
                <div className="mb-4 rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Wali Kelas</p>
                  <p className="text-sm font-medium">{kelas.waliKelas || "-"}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1 text-navy-600 hover:bg-navy-50" onClick={() => openEdit(kelas)}>
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-red-500 hover:bg-red-50 hover:text-red-700" onClick={() => handleDelete(kelas)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
