"use client";

import { useState, useEffect, useCallback } from "react";
import { GraduationCap, Plus, Search, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

interface TeacherRow {
  id: string;
  nip: string;
  namaLengkap: string;
  jenisKelamin: "L" | "P";
  status: "aktif" | "nonaktif";
}

export default function AdminGuruPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formNip, setFormNip] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formJK, setFormJK] = useState("L");
  const [formStatus, setFormStatus] = useState("aktif");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/teachers");
      const data = await res.json();
      setTeachers(data);
    } catch {
      toast.error("Gagal memuat data guru");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = teachers.filter(
    (t) =>
      t.namaLengkap.toLowerCase().includes(search.toLowerCase()) ||
      t.nip.includes(search)
  );

  const resetForm = () => {
    setFormNip("");
    setFormNama("");
    setFormJK("L");
    setFormStatus("aktif");
    setEditId(null);
  };

  const handleCreate = async () => {
    if (!formNip || !formNama) {
      toast.error("NIP dan Nama wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
           nip: formNip, 
           namaLengkap: formNama,
           jenisKelamin: formJK
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success("Data guru berhasil ditambahkan!");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal menambahkan guru";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (guru: TeacherRow) => {
    setEditId(guru.id);
    setFormNip(guru.nip);
    setFormNama(guru.namaLengkap);
    setFormJK(guru.jenisKelamin || "L");
    setFormStatus(guru.status);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editId || !formNama) {
      toast.error("Nama wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/teachers/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nip: formNip,
          namaLengkap: formNama,
          jenisKelamin: formJK,
          status: formStatus,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mengupdate");
      }

      toast.success("Data guru berhasil diperbarui!");
      setEditOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal mengupdate guru";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (teacher: TeacherRow) => {
    if (!confirm(`Yakin ingin menghapus data ${teacher.namaLengkap}?`)) return;

    try {
      const res = await fetch(`/api/teachers/${teacher.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Gagal menghapus");

      toast.success(`Data ${teacher.namaLengkap} berhasil dihapus!`);
      fetchData();
    } catch {
      toast.error("Gagal menghapus data guru");
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
      <PageHeader title="Data Guru" description="Kelola data guru dan staff pengajar" icon={GraduationCap}>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger render={
             <Button size="sm" className="gap-2 bg-navy-500 hover:bg-navy-600">
              <Plus className="h-4 w-4" /> Tambah Guru
             </Button>
          } />
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Tambah Guru Baru</DialogTitle>
              <DialogDescription>Isi data guru yang akan didaftarkan</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nip">NIP</Label>
                <Input id="nip" placeholder="Contoh: 199012012012" value={formNip} onChange={(e) => setFormNip(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nama-guru">Nama Lengkap</Label>
                <Input id="nama-guru" placeholder="Masukkan nama lengkap" value={formNama} onChange={(e) => setFormNama(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jenis-kelamin">Jenis Kelamin</Label>
                <Select value={formJK} onValueChange={(val) => setFormJK(val || "L")}>
                  <SelectTrigger id="jenis-kelamin">
                    <SelectValue placeholder="Pilih jenis kelamin">
                      {(value) => {
                        if (value === "L") return "Laki-laki";
                        if (value === "P") return "Perempuan";
                        return "Pilih jenis kelamin";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
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

        {/* Dialog Edit Guru */}
        <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Data Guru</DialogTitle>
              <DialogDescription>Perbarui informasi data guru</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nip">NIP</Label>
                <Input id="edit-nip" value={formNip} onChange={(e) => setFormNip(e.target.value)} />
                <p className="text-xs text-amber-600">Mengubah NIP akan mengubah Username login guru.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-nama-guru">Nama Lengkap</Label>
                <Input id="edit-nama-guru" placeholder="Masukkan nama lengkap" value={formNama} onChange={(e) => setFormNama(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-jenis-kelamin">Jenis Kelamin</Label>
                <Select value={formJK} onValueChange={(val) => setFormJK(val || "L")}>
                  <SelectTrigger id="edit-jenis-kelamin">
                    <SelectValue placeholder="Pilih jenis kelamin">
                      {(value) => {
                        if (value === "L") return "Laki-laki";
                        if (value === "P") return "Perempuan";
                        return "Pilih jenis kelamin";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formStatus} onValueChange={(val) => setFormStatus(val || "")}>
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Pilih status">
                      {(value) => {
                        if (value === "aktif") return "Aktif";
                        if (value === "nonaktif") return "Nonaktif";
                        return "Pilih status";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="nonaktif">Nonaktif</SelectItem>
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
            <Input placeholder="Cari nama atau NIP..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 pl-6">No</TableHead>
                <TableHead>NIP</TableHead>
                <TableHead>Nama Lengkap</TableHead>
                <TableHead>Jenis Kelamin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Tidak ada data guru yang ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((guru, i) => (
                  <TableRow key={guru.id}>
                    <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{guru.nip}</TableCell>
                    <TableCell className="font-medium">{guru.namaLengkap}</TableCell>
                    <TableCell>{guru.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}</TableCell>
                    <TableCell>
                      <Badge className={guru.status === "aktif" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                        {guru.status === "aktif" ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-navy-500 hover:bg-navy-50" aria-label={`Edit ${guru.namaLengkap}`} onClick={() => openEdit(guru)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" aria-label={`Hapus ${guru.namaLengkap}`} onClick={() => handleDelete(guru)}>
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
