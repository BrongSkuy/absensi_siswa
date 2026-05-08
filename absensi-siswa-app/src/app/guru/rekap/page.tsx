"use client";

import { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { BarChart3, Loader2, Download } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StudentRekap {
  id: string;
  nama: string;
  nis: string;
  hadir: number;
  izin: number;
  sakit: number;
  alfa: number;
  persen: number;
  nilai?: Record<string, number>;
}

interface ClassData {
  id: string;
  namaKelas: string;
}

export default function GuruRekapPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedTanggal, setSelectedTanggal] = useState<string>("");
  const [rekapData, setRekapData] = useState<StudentRekap[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRekap, setLoadingRekap] = useState(false);

  useEffect(() => {
    // Fetch classes available
    fetch("/api/classes")
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) {
          console.error("API Error: ", data);
          setClasses([]);
          setLoading(false);
          return;
        }
        setClasses(data);
        if (data.length > 0) {
          setSelectedClass(data[0].namaKelas);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedClass) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingRekap(true);
    const url = `/api/attendance/rekap?kelas=${encodeURIComponent(selectedClass)}${selectedTanggal ? `&tanggal=${selectedTanggal}` : ""}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) {
          console.error("API Error: ", data);
          setRekapData([]);
          setLoadingRekap(false);
          return;
        }
        setRekapData(data);
        setLoadingRekap(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingRekap(false);
      });
  }, [selectedClass, selectedTanggal]);

  const chartData = useMemo(() => {
    let hadir = 0, izin = 0, sakit = 0, alfa = 0;
    rekapData.forEach(r => {
      hadir += r.hadir;
      izin += r.izin;
      sakit += r.sakit;
      alfa += r.alfa;
    });
    return [
      { status: "Hadir", jumlah: hadir },
      { status: "Izin", jumlah: izin },
      { status: "Sakit", jumlah: sakit },
      { status: "Alfa", jumlah: alfa },
    ];
  }, [rekapData]);

  const criteriaKeys = useMemo(() => {
    if (rekapData.length === 0) return [];
    const keys = new Set<string>();
    rekapData.forEach(r => {
      if (r.nilai) Object.keys(r.nilai).forEach(k => keys.add(k));
    });
    return Array.from(keys);
  }, [rekapData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-navy-500" />
      </div>
    );
  }

  const handleExport = () => {
    if (!rekapData || rekapData.length === 0) return;
    const templateData = rekapData.map((s, i) => {
      const baseRow: Record<string, string | number> = {
        No: i + 1,
        NIS: s.nis,
        NamaSiswa: s.nama,
        Hadir: s.hadir,
        Izin: s.izin,
        Sakit: s.sakit,
        Alfa: s.alfa,
        "Persentase (%)": s.persen,
      };
      criteriaKeys.forEach(k => {
        baseRow[`Nilai ${k}`] = s.nilai?.[k] || 0;
      });
      return baseRow;
    });
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Kelas");
    XLSX.writeFile(wb, `Rekap_Kehadiran_Nilai_Kelas_${selectedClass}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Rekap Kelas" description="Ringkasan kehadiran dan nilai siswa" icon={BarChart3}>
        <Button variant="outline" size="sm" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={handleExport} disabled={rekapData.length === 0}>
          <Download className="h-4 w-4" /> Download Rekap Excel
        </Button>
      </PageHeader>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Belum ada data kelas.
          </CardContent>
        </Card>
      ) : (
        <Tabs value={selectedClass} onValueChange={setSelectedClass}>
          <TabsList className="flex flex-wrap h-auto">
            {classes.map(c => (
              <TabsTrigger key={c.id} value={c.namaKelas}>Kelas {c.namaKelas}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedClass} className="space-y-6 mt-4">
            {loadingRekap ? (
              <div className="flex py-12 justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-navy-500" />
              </div>
            ) : (
              <>
                {/* Chart */}
                <Card>
                  <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-4 pb-2">
                    <div>
                      <CardTitle className="text-base">Ringkasan Kehadiran Tersimpan</CardTitle>
                      <CardDescription>Kelas {selectedClass} · {selectedTanggal ? `Tanggal: ${selectedTanggal}` : "Total Kehadiran Keseluruhan"}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={selectedTanggal}
                        onChange={(e) => setSelectedTanggal(e.target.value)}
                        className="w-auto h-9 text-sm"
                      />
                      {selectedTanggal && (
                        <Button variant="ghost" size="sm" onClick={() => setSelectedTanggal("")} className="text-muted-foreground h-9 px-2">
                          Reset
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px] mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" barSize={28}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="status" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} width={60} />
                          <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E2E8F0", fontSize: "13px" }} />
                          <Bar dataKey="jumlah" fill="#1F4E78" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Detail Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Detail Per Siswa</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-6 whitespace-nowrap">NIS</TableHead>
                          <TableHead className="whitespace-nowrap min-w-[200px]">Nama</TableHead>
                          <TableHead className="text-center whitespace-nowrap">Hadir</TableHead>
                          <TableHead className="text-center whitespace-nowrap">Izin</TableHead>
                          <TableHead className="text-center whitespace-nowrap">Sakit</TableHead>
                          <TableHead className="text-center whitespace-nowrap">Alfa</TableHead>
                          <TableHead className="text-right whitespace-nowrap pr-6">Kehadiran</TableHead>
                          {criteriaKeys.map((k, idx) => (
                            <TableHead key={k} className={`text-right whitespace-nowrap min-w-[120px] ${idx === criteriaKeys.length - 1 ? "pr-6" : ""}`}>{k}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rekapData.length > 0 ? rekapData.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="pl-6 font-medium text-muted-foreground whitespace-nowrap">{r.nis}</TableCell>
                            <TableCell className="font-medium whitespace-nowrap">{r.nama}</TableCell>
                            <TableCell className="text-center"><Badge className="status-hadir">{r.hadir}</Badge></TableCell>
                            <TableCell className="text-center"><Badge className="status-izin">{r.izin}</Badge></TableCell>
                            <TableCell className="text-center"><Badge className="status-sakit">{r.sakit}</Badge></TableCell>
                            <TableCell className="text-center"><Badge className="status-alfa">{r.alfa}</Badge></TableCell>
                            <TableCell className="text-right whitespace-nowrap pr-6">
                              <span className={`font-bold ${r.persen >= 90 ? "text-emerald-600" : r.persen >= 75 ? "text-amber-600" : "text-red-600"}`}>
                                {r.persen}%
                              </span>
                            </TableCell>
                            {criteriaKeys.map((k, idx) => (
                              <TableCell key={k} className={`text-right font-medium whitespace-nowrap ${idx === criteriaKeys.length - 1 ? "pr-6" : ""}`}>
                                {r.nilai?.[k] || 0}
                              </TableCell>
                            ))}
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={7 + criteriaKeys.length} className="text-center py-6 text-muted-foreground">
                              Belum ada data siswa
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
