"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { PenLine, Save, Loader2, BookOpen, Trash2, Upload, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
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

interface KelasRow { id: string; namaKelas: string; }
interface MapelRow { namaMapel: string; kelasDiampu?: string | null; }
interface CriteriaRow { id: string; namaKriteria: string; bobot: number; tipe: string; deskripsi: string; }
interface ScoreStudent { studentId: string; nis: string; namaLengkap: string; nilai: number; details: Record<string, number>; scoreId: string | null; }

const AVAILABLE_CATEGORIES = ["Tugas", "UTS", "UAS", "Praktek"];

export default function AdminNilaiPage() {
  const [classes, setClasses] = useState<KelasRow[]>([]);
  const [subjects, setSubjects] = useState<MapelRow[]>([]);
  const [criteria, setCriteria] = useState<CriteriaRow[]>([]);
  
  const [selectedKelas, setSelectedKelas] = useState("");
  const [selectedMapel, setSelectedMapel] = useState("Umum");
  const [selectedCriteria, setSelectedCriteria] = useState("");
  
  const [siswaList, setSiswaList] = useState<ScoreStudent[]>([]);
  const [details, setDetails] = useState<Record<string, Record<string, number>>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [newCat, setNewCat] = useState<string>("");
  
  const [showGrid, setShowGrid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/classes").then(r => r.json()),
      fetch("/api/subjects").then(r => r.json()),
      fetch("/api/spk/criteria").then(r => r.json()),
    ]).then(([classesData, subjectsData, criteriaData]) => {
      setClasses(classesData);
      if (classesData.length > 0) setSelectedKelas(classesData[0].namaKelas);
      
      const manualCriteria = criteriaData.filter((c: CriteriaRow) => c.tipe === "Manual" || c.namaKriteria.toLowerCase().includes("akademik"));
      setCriteria(manualCriteria);
      if (manualCriteria.length > 0) setSelectedCriteria(manualCriteria[0].id);

      if (Array.isArray(subjectsData) && subjectsData.length > 0) {
        // De-duplicate subjects by namaMapel
        const uniqueMapel: MapelRow[] = Array.from(
          new Map(subjectsData.map((s: MapelRow) => [s.namaMapel, s])).values()
        );
        setSubjects(uniqueMapel);
        setSelectedMapel(uniqueMapel[0].namaMapel);
      }
    }).catch(() => toast.error("Gagal memuat preferensi guru"));
  }, []);

  // Reset selectedMapel if it's not valid for the selected class
  useEffect(() => {
    if (!selectedKelas || subjects.length === 0) return;
    const validSubjects = subjects.filter(s => {
      if (!s.kelasDiampu) return false;
      return s.kelasDiampu.split(",").map(k => k.trim()).includes(selectedKelas);
    });
    const isValid = selectedMapel === "Umum" || validSubjects.some(s => s.namaMapel === selectedMapel);
    if (!isValid) {
      if (validSubjects.length > 0) {
        setSelectedMapel(validSubjects[0].namaMapel);
      } else {
        setSelectedMapel("Umum");
      }
    }
  }, [selectedKelas, selectedMapel, subjects]);

  const handleLoad = useCallback(async () => {
    if (!selectedKelas || !selectedCriteria) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/spk/scores?kelas=${encodeURIComponent(selectedKelas)}&criteriaId=${encodeURIComponent(selectedCriteria)}&mapel=${encodeURIComponent(selectedMapel)}`);
      if (!res.ok) throw new Error("Gagal load nilai");
      const data: { categories: string[], students: ScoreStudent[] } = await res.json();
      
      const isAka = criteria.find(c => c.id === selectedCriteria)?.namaKriteria.toLowerCase().includes("akademik");
      let fetchedCats = data.categories || [];
      if (!isAka) {
         fetchedCats = ["Nilai"];
      }
      setCategories(fetchedCats);
      setSiswaList(data.students);
      
      const init: Record<string, Record<string, number>> = {};
      data.students.forEach((s) => { 
         let det = s.details || {};
         if (!isAka && Object.keys(det).length === 0 && s.nilai > 0) {
             det = { "Nilai": s.nilai };
         }
         init[s.studentId] = det; 
      });
      setDetails(init);
      setShowGrid(true);
    } catch {
      toast.error("Gagal memuat grid nilai");
    } finally {
      setLoading(false);
    }
  }, [selectedKelas, selectedCriteria, selectedMapel, criteria]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = Object.entries(details).map(([studentId, studDetails]) => ({
        studentId,
        details: studDetails,
      }));

      const res = await fetch("/api/spk/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
           kelas: selectedKelas, 
           criteriaId: selectedCriteria, 
           mapel: selectedMapel, 
           categories,
           records 
        }),
      });

      if (!res.ok) throw new Error("Gagal menyimpan");

      toast.success("Catatan kategori dan nilai berhasil disimpan!");
      handleLoad();
    } catch {
      toast.error("Gagal menyimpan nilai");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/spk/scores?kelas=${encodeURIComponent(selectedKelas)}&criteriaId=${encodeURIComponent(selectedCriteria)}&mapel=${encodeURIComponent(selectedMapel)}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Gagal hapus");
      toast.success("Seluruh nilai mapel ini berhasil dihapus");
      handleLoad();
      setDeleteOpen(false);
    } catch {
      toast.error("Gagal menghapus nilai");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddCategory = () => {
     if (!newCat) return;
     let finalName = newCat;
     if (categories.includes(finalName)) {
        let i = 1;
        while (categories.includes(finalName)) {
           finalName = `${newCat} ${i + 1}`;
           i++;
        }
     }
     setCategories([...categories, finalName]);
     setNewCat("");
  };

  const handleRemoveCategory = (catToRemove: string) => {
     setCategories(categories.filter(c => c !== catToRemove));
     setDetails(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(studentId => {
           if (next[studentId]?.[catToRemove] !== undefined) {
              const nd = { ...next[studentId] };
              delete nd[catToRemove];
              next[studentId] = nd;
           }
        });
        return next;
     });
  };

  // Helper to compute live average
  const getAverage = (studentId: string) => {
     if (categories.length === 0) return 0;
     const studsDetails = details[studentId] || {};
     let sum = 0;
     categories.forEach(c => {
        sum += (studsDetails[c] || 0);
     });
     return Math.round(sum / categories.length);
  };

  const isAkademik = criteria.find(c => c.id === selectedCriteria)?.namaKriteria.toLowerCase().includes("akademik");

  return (
    <div className="space-y-6">
      <PageHeader title="Input Nilai Multi-Kategori (Admin)" description="Kelola nilai beserta kategori seperti Tugas, UTS, UAS, atau Praktek di pengaturan kriteria" icon={PenLine} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pengaturan Sesi Penilaian</CardTitle>
          <CardDescription>Pilih target kelas, mapel, dan kriteria spesifik</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end">
            <div className="space-y-2 flex-1 sm:min-w-[150px]">
              <Label>Target Kelas</Label>
              <Select value={selectedKelas} onValueChange={(val: string | null) => val && setSelectedKelas(val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {classes.map((k) => (
                    <SelectItem key={k.id} value={k.namaKelas}>{k.namaKelas}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 flex-1 sm:min-w-[250px]">
              <Label>Mata Pelajaran (Isikan Umum untuk Non-Akademik)</Label>
              <Select value={selectedMapel} onValueChange={(val: string | null) => val && setSelectedMapel(val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Umum">Umum / Semua Mapel</SelectItem>
                  {subjects
                    .filter((s) => {
                      if (!s.kelasDiampu) return false;
                      return s.kelasDiampu.split(",").map((k) => k.trim()).includes(selectedKelas);
                    })
                    .map((s, i) => (
                      <SelectItem key={i} value={s.namaMapel}>{s.namaMapel}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 flex-1 sm:min-w-[300px]">
              <Label>Pilih Kriteria Penilaian</Label>
              <Select value={selectedCriteria} onValueChange={(val: string | null) => val && setSelectedCriteria(val)}>
                <SelectTrigger className="w-full">
                  <span className="line-clamp-1 truncate">
                    {criteria.find(c => c.id === selectedCriteria)
                      ? `${criteria.find(c => c.id === selectedCriteria)!.namaKriteria} (Bobot: ${criteria.find(c => c.id === selectedCriteria)!.bobot}%)`
                      : "Pilih Kriteria..."}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-w-[100vw] xl:max-w-2xl">
                  {criteria.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                       {c.namaKriteria} (Bobot: {c.bobot}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="bg-navy-500 hover:bg-navy-600 w-full xl:w-auto h-10 gap-2 shrink-0" onClick={handleLoad} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />} Muat Data Tabel
            </Button>
            <input
              ref={importRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={async (e) => {
                 const file = e.target.files?.[0];
                 if (!file) return;
                 setImporting(true);
                 try {
                   const data = await file.arrayBuffer();
                   const workbook = XLSX.read(data);
                   const sheet = workbook.Sheets[workbook.SheetNames[0]];
                   const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet);
                   
                   if (rows.length === 0) {
                     toast.error("File excel kosong");
                     return;
                   }

                   let matchCount = 0;
                   const excelCategories = categories.filter(c => rows[0] && (c in rows[0] || c.toLowerCase() in rows[0]));

                   if (excelCategories.length === 0 && categories.length > 0) {
                      toast.error("Format Excel tidak sesuai. Gagal menemukan kolom dengan nama kategori. Coba Download Template Excel terlebih dahulu.");
                      return;
                   }

                   setDetails((prev) => {
                     const next = { ...prev };
                     rows.forEach(row => {
                        const rowNis = String(row.NIS || row.nis || "").trim();
                        
                        if (rowNis) {
                           const matchedStudent = siswaList.find(s => s.nis === rowNis);
                           if (matchedStudent) {
                              if (!next[matchedStudent.studentId]) next[matchedStudent.studentId] = {};
                              
                              categories.forEach(cat => {
                                 const val = row[cat] !== undefined ? row[cat] : (row[cat.toLowerCase()] !== undefined ? row[cat.toLowerCase()] : "");
                                 const parsed = parseFloat(String(val));
                                 if (!isNaN(parsed)) {
                                    next[matchedStudent.studentId][cat] = parsed;
                                 }
                              });
                              matchCount++;
                           }
                        }
                     });
                     return next;
                   });

                   if (matchCount > 0) {
                      toast.success(`Berhasil mengimpor nilai untuk ${matchCount} siswa. Klik 'Simpan Record Nilai' jika sudah sesuai.`);
                   } else {
                      toast.warning("Tidak ada NIS yang cocok dengan daftar di kelas ini.");
                   }
                 } catch {
                   toast.error("Gagal membaca file excel");
                 } finally {
                   setImporting(false);
                   if (importRef.current) importRef.current.value = "";
                 }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {showGrid && (
        <>
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 mb-4">
             {isAkademik ? (
               <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end w-full xl:w-auto">
                  <div className="space-y-2 w-full sm:w-auto">
                     <Label>Kategori Nilai</Label>
                     <Select value={newCat} onValueChange={(val) => val && setNewCat(val)}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                           <SelectValue placeholder="Pilih Kategori" />
                        </SelectTrigger>
                        <SelectContent>
                           {AVAILABLE_CATEGORIES.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
                  <Button variant="secondary" className="gap-2 border border-slate-200 w-full sm:w-auto" onClick={handleAddCategory} disabled={!newCat}>
                     <Plus className="h-4 w-4" /> Tambah Kategori
                  </Button>
               </div>
             ) : (
               <div className="hidden xl:block"></div>
             )}
             <div className="flex flex-wrap justify-start xl:justify-end gap-2 items-center w-full xl:w-auto">
                <Button variant="outline" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50" onClick={() => {
                    const dataToExport = siswaList.map(s => {
                       const row: Record<string, string | number> = {
                          NIS: s.nis,
                          NamaLengkap: s.namaLengkap,
                       };
                       categories.forEach(c => {
                          row[c] = details[s.studentId]?.[c] !== undefined ? details[s.studentId][c] : "";
                       });
                       row["Rata-rata"] = getAverage(s.studentId);
                       return row;
                    });
                    if (dataToExport.length === 0) return toast.error("Tidak ada siswa");
                    const ws = XLSX.utils.json_to_sheet(dataToExport);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Data Nilai");
                    XLSX.writeFile(wb, `Data_Nilai_${selectedKelas}_${selectedMapel}.xlsx`);
                }}>
                    <Download className="h-4 w-4 gap-2 mr-2" /> Export Excel
                </Button>
                <Button variant="outline" className="border-navy-200 text-navy-600 hover:bg-navy-50" onClick={() => {
                    const templateData = siswaList.map(s => {
                       const baseRow: Record<string, string | number> = {
                          NIS: s.nis,
                          NamaLengkap: s.namaLengkap,
                       };
                       categories.forEach(c => {
                          baseRow[c] = "";
                       });
                       return baseRow;
                    });
                    if (templateData.length === 0) return toast.error("Tidak ada siswa");
                    const ws = XLSX.utils.json_to_sheet(templateData);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Format Nilai");
                    XLSX.writeFile(wb, `Template_Nilai_${selectedKelas}_${selectedMapel}.xlsx`);
                }}>
                    <Download className="h-4 w-4 gap-2 mr-2" /> Download Template
                </Button>
                <Button variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50" disabled={importing || categories.length === 0} onClick={() => importRef.current?.click()}>
                    {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 gap-2 mr-2" />} Import Excel
                </Button>
                <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                      <AlertDialogTrigger render={
                         <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" disabled={deleting}>
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Trash2 className="h-4 w-4 mr-2" />} Hapus Spesifik
                         </Button>
                      } />
                      <AlertDialogContent>
                         <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Data Penilaian?</AlertDialogTitle>
                            <AlertDialogDescription>
                               Menghapus seluruh nilai pada kelas <b>{selectedKelas}</b>, mapel <b>{selectedMapel}</b>, untuk kriteria ini. 
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
             </div>
          </div>

          <Card>
            <CardContent className="p-0">
               {categories.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-6 text-slate-500 bg-muted/10 border-b">
                     <BookOpen className="h-6 w-6 mb-2 text-slate-400" />
                     <p className="text-sm">Anda harus menambahkan setidaknya 1 kategori (Tugas, UTS, dsb) untuk mengisi nilai!</p>
                  </div>
               )}
                 <div className="overflow-x-auto">
                    <table className="w-full min-w-max border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-12 sticky left-0 bg-muted/50 z-10">No</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-24 sticky left-12 bg-muted/50 z-10">NIS</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground min-w-[200px] whitespace-nowrap">Nama Siswa</th>
                          {categories.map((cat) => (
                            <th key={cat} className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground min-w-[120px]">
                               <div className="flex items-center justify-center gap-1 group">
                                  {cat}
                                  {isAkademik && (
                                    <button onClick={() => handleRemoveCategory(cat)} className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600" title="Hapus Kategori">
                                       &times;
                                    </button>
                                  )}
                               </div>
                            </th>
                          ))}
                          {isAkademik && (
                             <th className="px-4 py-3 text-center text-xs font-semibold text-navy-800 bg-navy-50/50 min-w-[110px]">
                                Rata-rata 
                             </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {siswaList.length === 0 ? (
                          <tr><td colSpan={10} className="text-center py-6 text-muted-foreground">Tidak ada data murid di kelas ini</td></tr>
                        ) : siswaList.map((siswa, i) => {
                           const rerata = getAverage(siswa.studentId);
                           return (
                             <tr key={siswa.studentId} className="border-b transition-colors hover:bg-muted/30">
                               <td className="px-4 py-3 text-sm text-muted-foreground sticky left-0 bg-white group-hover:bg-muted/10">{i + 1}</td>
                               <td className="px-4 py-3 font-mono text-sm sticky left-12 bg-white group-hover:bg-muted/10">{siswa.nis}</td>
                               <td className="px-4 py-3 text-sm font-medium">{siswa.namaLengkap}</td>
                               
                               {categories.map(cat => (
                                  <td key={cat} className="px-2 py-3">
                                    <div className="flex justify-center">
                                      <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={details[siswa.studentId]?.[cat] !== undefined ? details[siswa.studentId][cat] : ""}
                                        onChange={(e) =>
                                          setDetails((p) => ({
                                            ...p,
                                            [siswa.studentId]: {
                                               ...(p[siswa.studentId] || {}),
                                               [cat]: parseFloat(e.target.value) || 0
                                            }
                                          }))
                                        }
                                        className="w-20 text-center font-semibold focus-visible:ring-1"
                                      />
                                    </div>
                                  </td>
                               ))}
                               {isAkademik && (
                                  <td className="px-4 py-3 text-center font-bold bg-navy-50/20 text-navy-800">
                                     {rerata > 0 ? rerata : "-"}
                                  </td>
                               )}
                             </tr>
                           );
                        })}
                      </tbody>
                    </table>
                 </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button size="lg" className="gap-2 bg-navy-500 hover:bg-navy-600 shadow-lg shadow-navy-500/20" onClick={handleSave} disabled={saving || categories.length === 0}>
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Simpan Record Nilai
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
