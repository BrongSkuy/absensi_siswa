"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogIn, Eye, EyeOff, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: signInError } = await authClient.signIn.username({
        username,
        password,
      });

      if (signInError) {
        setError(signInError.message || "Username atau password salah");
        setLoading(false);
        return;
      }

      // Fetch session to get appRole for routing
      const { data: session } = await authClient.getSession();
      const appRole = (session?.user as Record<string, unknown>)?.appRole as string | undefined;

      if (appRole === "ADMIN") {
        router.push("/admin");
      } else if (appRole === "GURU") {
        router.push("/guru");
      } else {
        router.push("/siswa");
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950" />

      {/* Decorative shapes */}
      <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-navy-500/20 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Login Card */}
      <Card className="animate-scale-in relative z-10 w-full max-w-md border-white/10 bg-white/[0.97] shadow-2xl shadow-black/20 backdrop-blur-xl">
        <CardHeader className="items-center pb-2 pt-8">
          {/* Logo */}
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-500 to-navy-700 p-3 shadow-xl shadow-navy-500/30">
            <Image
              src="/logo.png"
              alt="Logo Sekolah"
              width={56}
              height={56}
              className="object-contain"
            />
          </div>
          <CardTitle className="text-center text-xl text-navy-900">
            SistemKu
          </CardTitle>
          <CardDescription className="text-center text-sm">
            Sistem Absensi & SPK Siswa Terbaik
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-8 pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                NIP / NIS
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Masukkan NIP atau NIS"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-11 border-navy-200 focus-visible:ring-navy-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Kata Sandi
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 border-navy-200 pr-10 focus-visible:ring-navy-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full bg-navy-500 text-white shadow-lg shadow-navy-500/25 transition-all hover:bg-navy-600 hover:shadow-xl hover:shadow-navy-500/30"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
}
