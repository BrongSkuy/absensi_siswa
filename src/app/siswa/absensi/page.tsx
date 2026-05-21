"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CalendarCheck, ChevronLeft, ChevronRight, Loader2, BookOpen, BarChart3, List,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type StatusType = "Hadir" | "Izin" | "Sakit" | "Alfa" | null;

interface AttendanceRecord {
  id: string;
  tanggal: string; // YYYY-MM-DD
  mapel: string;
  status: StatusType;
}

const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const statusColorMap: Record<string, string> = {
  Hadir: "bg-emerald-400 text-white",
  Izin: "bg-amber-400 text-white",
  Sakit: "bg-sky-400 text-white",
  Alfa: "bg-red-400 text-white",
};

export default function SiswaAbsensiPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMapel, setSelectedMapel] = useState("Semua");
  const [viewMode, setViewMode] = useState<"kalender" | "grafik">("kalender");

  useEffect(() => {
    fetch("/api/students/me/attendance")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAttendanceRecords(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Get unique mapel list
  const mapelList = useMemo(() => {
    const set = new Set<string>();
    attendanceRecords.forEach(r => {
      if (r.mapel) set.add(r.mapel);
    });
    return Array.from(set).sort();
  }, [attendanceRecords]);

  // Filter records by selected mapel
  const filteredRecords = useMemo(() => {
    if (selectedMapel === "Semua") return attendanceRecords;
    return attendanceRecords.filter(r => r.mapel === selectedMapel);
  }, [attendanceRecords, selectedMapel]);

  // Summary statistics for filtered records
  const summary = useMemo(() => {
    const h = filteredRecords.filter(r => r.status === "Hadir").length;
    const i = filteredRecords.filter(r => r.status === "Izin").length;
    const s = filteredRecords.filter(r => r.status === "Sakit").length;
    const a = filteredRecords.filter(r => r.status === "Alfa").length;
    return { hadir: h, izin: i, sakit: s, alfa: a, total: h + i + s + a };
  }, [filteredRecords]);

  // Per-mapel chart data
  const perMapelChartData = useMemo(() => {
    const mapelMap: Record<string, { hadir: number; izin: number; sakit: number; alfa: number }> = {};
    attendanceRecords.forEach(r => {
      const key = r.mapel || "Umum";
      if (!mapelMap[key]) mapelMap[key] = { hadir: 0, izin: 0, sakit: 0, alfa: 0 };
      if (r.status === "Hadir") mapelMap[key].hadir++;
      else if (r.status === "Izin") mapelMap[key].izin++;
      else if (r.status === "Sakit") mapelMap[key].sakit++;
      else if (r.status === "Alfa") mapelMap[key].alfa++;
    });
    return Object.entries(mapelMap).map(([mapel, val]) => ({
      mapel,
      ...val,
    }));
  }, [attendanceRecords]);

  // Generate calendar data based on filtered records
  const generateCalendarData = (year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days: { date: number; status: StatusType; isWeekend: boolean; count: number }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = new Date(year, month, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      // Find ALL records for this date (filtered by mapel)
      const dayRecords = filteredRecords.filter(r => r.tanggal === dateStr);
      
      // Determine "most important" status to show on calendar
      // Priority: Alfa > Sakit > Izin > Hadir
      let displayStatus: StatusType = null;
      if (!isWeekend && dayRecords.length > 0) {
        if (dayRecords.some(r => r.status === "Alfa")) displayStatus = "Alfa";
        else if (dayRecords.some(r => r.status === "Sakit")) displayStatus = "Sakit";
        else if (dayRecords.some(r => r.status === "Izin")) displayStatus = "Izin";
        else if (dayRecords.some(r => r.status === "Hadir")) displayStatus = "Hadir";
      }

      days.push({
        date: d,
        status: isWeekend ? null : displayStatus,
        isWeekend,
        count: dayRecords.length,
      });
    }

    return { days, firstDay };
  };

  const { days, firstDay } = generateCalendarData(currentYear, currentMonth);

  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  // Sort descending by date for recent history
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const dateCompare = new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
      if (dateCompare !== 0) return dateCompare;
      return (a.mapel || "").localeCompare(b.mapel || "");
    });
  }, [filteredRecords]);
  
  const recentHistory = sortedRecords.slice(0, 15);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-navy-500" />
      </div>
    );
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Riwayat Absensi" description="Catatan kehadiran Anda sepanjang semester" icon={CalendarCheck} />

      {/* Controls: Filter + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mapel Filter */}
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedMapel} onValueChange={(val) => { if (val) setSelectedMapel(val); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter Mapel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua Mata Pelajaran</SelectItem>
                {mapelList.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* View Mode */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "kalender" | "grafik")}>
          <TabsList>
            <TabsTrigger value="kalender" className="gap-1.5">
              <CalendarCheck className="h-3.5 w-3.5" /> Kalender
            </TabsTrigger>
            <TabsTrigger value="grafik" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Grafik Per Mapel
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="py-3 text-center">
            <p className="text-xs text-emerald-600 font-medium">Hadir</p>
            <p className="text-2xl font-bold text-emerald-700">{summary.hadir}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-3 text-center">
            <p className="text-xs text-amber-600 font-medium">Izin</p>
            <p className="text-2xl font-bold text-amber-700">{summary.izin}</p>
          </CardContent>
        </Card>
        <Card className="border-sky-200 bg-sky-50/50">
          <CardContent className="py-3 text-center">
            <p className="text-xs text-sky-600 font-medium">Sakit</p>
            <p className="text-2xl font-bold text-sky-700">{summary.sakit}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="py-3 text-center">
            <p className="text-xs text-red-600 font-medium">Alfa</p>
            <p className="text-2xl font-bold text-red-700">{summary.alfa}</p>
          </CardContent>
        </Card>
        <Card className="border-navy-200 bg-navy-50/50 col-span-2 sm:col-span-1">
          <CardContent className="py-3 text-center">
            <p className="text-xs text-navy-600 font-medium">% Kehadiran</p>
            <p className={`text-2xl font-bold ${summary.total > 0 ? (Math.round((summary.hadir / summary.total) * 100) >= 75 ? 'text-emerald-600' : 'text-red-600') : 'text-gray-400'}`}>
              {summary.total > 0 ? Math.round((summary.hadir / summary.total) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-emerald-400" /><span className="text-xs text-muted-foreground">Hadir</span></div>
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-amber-400" /><span className="text-xs text-muted-foreground">Izin</span></div>
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-sky-400" /><span className="text-xs text-muted-foreground">Sakit</span></div>
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-red-400" /><span className="text-xs text-muted-foreground">Alfa</span></div>
        <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-gray-200" /><span className="text-xs text-muted-foreground">Belum ada / Libur</span></div>
        {selectedMapel !== "Semua" && (
          <Badge variant="outline" className="ml-2 border-navy-200 text-navy-600">
            Filter: {selectedMapel}
          </Badge>
        )}
      </div>

      {viewMode === "kalender" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">
                {months[currentMonth]} {currentYear}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth} aria-label="Bulan sebelumnya">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth} aria-label="Bulan selanjutnya">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {dayNames.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">
                    {d}
                  </div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {days.map((day) => (
                  <div
                    key={day.date}
                    className={`relative flex h-10 items-center justify-center rounded-lg text-sm font-medium transition-all ${
                      day.isWeekend
                        ? "bg-gray-100 text-gray-400"
                        : day.status
                          ? `${statusColorMap[day.status]} shadow-sm`
                          : "bg-gray-50 text-gray-400"
                    }`}
                    title={day.count > 1 ? `${day.count} catatan absensi` : undefined}
                  >
                    {day.date}
                    {/* Badge for multiple records on same day */}
                    {day.count > 1 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-navy-600 text-[9px] font-bold text-white shadow">
                        {day.count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <List className="h-4 w-4 text-navy-500" />
                Riwayat Terkini
              </CardTitle>
              <CardDescription>{recentHistory.length > 0 ? "Absensi terakhir" : "Belum ada absensi"}</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="max-h-[450px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Tanggal</TableHead>
                      <TableHead>Mapel</TableHead>
                      <TableHead className="text-right pr-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentHistory.length > 0 ? recentHistory.map((r, i) => {
                      try {
                        const parsedDate = new Date(r.tanggal);
                        const formattedDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsedDate);
                        const hariName = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(parsedDate);

                        return (
                          <TableRow key={`${r.id}-${i}`}>
                            <TableCell className="pl-6">
                              <p className="text-sm font-medium">{formattedDate}</p>
                              <p className="text-xs text-muted-foreground">{hariName}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-navy-50 text-navy-700 border-navy-200 text-[10px]">
                                {r.mapel || "Umum"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Badge className={`${r.status ? statusColorMap[r.status] : "bg-gray-200"}`}>
                                {r.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      } catch {
                        return null;
                      }
                    }) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                          Belum ada data riwayat.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Grafik Per Mapel View */
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-navy-500" />
                Grafik Kehadiran Per Mata Pelajaran
              </CardTitle>
              <CardDescription>
                Perbandingan status kehadiran untuk setiap mata pelajaran
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                {perMapelChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perMapelChartData} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="mapel" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "10px",
                          border: "1px solid #E2E8F0",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          fontSize: "13px",
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                      <Bar dataKey="hadir" name="Hadir" fill="#34D399" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="izin" name="Izin" fill="#FBBF24" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="sakit" name="Sakit" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="alfa" name="Alfa" fill="#F87171" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <p className="text-sm">Belum ada data untuk ditampilkan</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Per-Mapel Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-navy-500" />
                Rincian Per Mapel
              </CardTitle>
              <CardDescription>Detail kehadiran tiap mata pelajaran</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Mapel</TableHead>
                    <TableHead className="text-center">H</TableHead>
                    <TableHead className="text-center">I</TableHead>
                    <TableHead className="text-center">S</TableHead>
                    <TableHead className="text-center pr-6">A</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perMapelChartData.map((row) => (
                    <TableRow key={row.mapel}>
                      <TableCell className="pl-6">
                        <Badge variant="outline" className="bg-navy-50 text-navy-700 border-navy-200 text-[10px]">
                          {row.mapel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-emerald-600">{row.hadir}</TableCell>
                      <TableCell className="text-center font-semibold text-amber-600">{row.izin}</TableCell>
                      <TableCell className="text-center font-semibold text-sky-600">{row.sakit}</TableCell>
                      <TableCell className="text-center font-semibold text-red-600 pr-6">{row.alfa}</TableCell>
                    </TableRow>
                  ))}
                  {perMapelChartData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        Belum ada data absensi.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
