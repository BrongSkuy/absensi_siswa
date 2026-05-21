"use client";

import { useState } from "react";
import { User, KeyRound, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function ProfilGuruPage() {
  const { data: session } = authClient.useSession();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi sandi baru tidak cocok.");
      return;
    }
    if (newPassword.length < 4) {
      toast.error("Sandi baru minimal 4 karakter.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.changePassword({
        newPassword,
        currentPassword,
        revokeOtherSessions: true,
      });

      if (error) {
        throw new Error(error.message || "Gagal mengubah kata sandi.");
      }

      toast.success("Kata sandi berhasil diperbarui!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title="Profil Saya" description="Kelola detail profil pribadi dan keamanan akun" icon={User} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Akun</CardTitle>
            <CardDescription>Detail identitas Anda di sistem.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-muted-foreground">Nama Lengkap</Label>
              <div className="font-semibold text-lg">{session?.user?.name || "-"}</div>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label className="text-muted-foreground">Username / ID</Label>
              <div className="font-mono bg-muted py-1 px-2 rounded w-fit">{(session?.user as Record<string, unknown>)?.username as string || "-"}</div>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label className="text-muted-foreground">Peran Pengguna</Label>
              <div className="font-medium text-navy-600 bg-navy-50 py-1 px-2 rounded w-fit">{(session?.user as Record<string, unknown>)?.appRole as string || "-"}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5"/> Keamanan</CardTitle>
            <CardDescription>Perbarui kata sandi untuk mengamankan akun.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 rounded-md bg-blue-50 p-3 text-sm text-blue-800 border border-blue-100">
              <p className="font-medium">Informasi Kata Sandi:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Demi keamanan, sistem tidak dapat menampilkan kata sandi Anda saat ini.</li>
                <li>Sandi bawaan (default) Anda adalah Username (NIP) Anda, kecuali sudah Anda ubah.</li>
              </ul>
            </div>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current">Kata Sandi Saat Ini</Label>
                <div className="relative">
                  <Input
                    id="current"
                    type={showCurrent ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new">Kata Sandi Baru</Label>
                <div className="relative">
                  <Input
                    id="new"
                    type={showNew ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Konfirmasi Sandi Baru</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full bg-navy-500 hover:bg-navy-600" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Simpan Perubahan
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
