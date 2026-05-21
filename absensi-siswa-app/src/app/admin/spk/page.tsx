"use client";

import { useState, useEffect } from "react";
import { Settings2, Save, AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";

interface SpkCriteria {
  id: string;
  namaKriteria: string;
  bobot: number;
  tipe: "Otomatis" | "Manual";
  deskripsi: string | null;
}

export default function AdminSpkPage() {
  const [criteria, setCriteria] = useState<SpkCriteria[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/spk-criteria")
      .then((r) => r.json())
      .then((data) => { setCriteria(data); setLoading(false); })
      .catch(() => { toast.error("Gagal memuat kriteria"); setLoading(false); });
  }, []);

  const totalBobot = criteria.reduce((sum, c) => sum + c.bobot, 0);
  const isValid = totalBobot === 100;

  const updateBobot = (id: string, value: number) => {
    setSaved(false);
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, bobot: value } : c))
    );
  };

  const handleSave = async () => {
    if (!isValid) {
      toast.error(`Total bobot harus 100%. Saat ini: ${totalBobot}%`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/spk-criteria", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(criteria.map((c) => ({ id: c.id, bobot: c.bobot }))),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setSaved(true);
      toast.success("Bobot kriteria SPK berhasil disimpan!");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal menyimpan";
      toast.error(msg);
    } finally {
      setSaving(false);
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
        title="Konfigurasi SPK"
        description="Atur bobot persentase untuk setiap kriteria penilaian siswa terbaik"
        icon={Settings2}
      >
        <Button
          className="gap-2 bg-navy-500 hover:bg-navy-600"
          size="sm"
          disabled={!isValid || saving}
          onClick={handleSave}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </PageHeader>

      {/* Total indicator */}
      <Card className={isValid ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"}>
        <CardContent className="flex items-center gap-3 py-4">
          {isValid ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          )}
          <div>
            <p className={`text-sm font-semibold ${isValid ? "text-emerald-700" : "text-amber-700"}`}>
              Total Bobot: {totalBobot}%
            </p>
            <p className={`text-xs ${isValid ? "text-emerald-600" : "text-amber-600"}`}>
              {isValid ? "Bobot sudah valid (total = 100%)" : `Sisa ${100 - totalBobot}% lagi untuk mencapai 100%`}
            </p>
          </div>
          {saved && (
            <Badge className="ml-auto bg-emerald-500 text-white animate-fade-in">
              ✓ Tersimpan
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Criteria cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {criteria.map((c, index) => (
          <Card
            key={c.id}
            className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{c.namaKriteria}</CardTitle>
                <Badge
                  variant="outline"
                  className={
                    c.tipe === "Otomatis"
                      ? "border-sky-200 bg-sky-50 text-sky-700"
                      : "border-purple-200 bg-purple-50 text-purple-700"
                  }
                >
                  {c.tipe}
                </Badge>
              </div>
              <CardDescription className="text-xs">{c.deskripsi}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={c.bobot}
                    onChange={(e) =>
                      updateBobot(c.id, parseInt(e.target.value) || 0)
                    }
                    className="h-12 text-center text-2xl font-bold text-navy-700 w-24"
                  />
                  <span className="text-lg font-semibold text-muted-foreground">
                    %
                  </span>
                </div>
                {/* Visual bar */}
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-navy-500 to-amber-500 transition-all duration-500"
                    style={{ width: `${Math.min(c.bobot, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info box */}
      <Card className="border-navy-100 bg-navy-50/50">
        <CardContent className="flex items-start gap-3 py-4">
          <Info className="h-5 w-5 text-navy-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-navy-700">
            <p className="font-semibold mb-1">Tentang Perhitungan SPK</p>
            <p className="text-navy-600">
              Sistem akan mengalikan nilai setiap kriteria dengan bobotnya, kemudian menjumlahkan
              hasilnya untuk mendapatkan skor akhir. Kriteria bertipe <strong>Otomatis</strong> dihitung
              langsung dari data sistem, sedangkan <strong>Manual</strong> diinput oleh guru.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
