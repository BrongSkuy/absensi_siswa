"use client";

import { useState, useEffect } from "react";

import { usePathname, useRouter } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import type { User } from "@/lib/mock-data";
import { authClient } from "@/lib/auth-client";

function getBreadcrumbs(pathname: string): string[] {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg) =>
    seg
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case "ADMIN":
      return "bg-navy-500 text-white";
    case "GURU":
      return "bg-amber-500 text-navy-950";
    case "SISWA":
      return "bg-emerald-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
}

interface TopbarProps {
  user: User;
  onMenuClick: () => void;
}

export function Topbar({ user, onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const breadcrumbs = getBreadcrumbs(pathname);
  const [openSearch, setOpenSearch] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpenSearch((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white/80 px-4 backdrop-blur-md lg:px-6">
      {/* Left */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Buka menu navigasi"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="hidden sm:block">
          <ol className="flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span className="text-muted-foreground/40">/</span>
                )}
                <span
                  className={
                    i === breadcrumbs.length - 1
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {crumb}
                </span>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Search placeholder */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label="Cari"
          onClick={() => setOpenSearch(true)}
        >
          <Search className="h-4.5 w-4.5" />
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger render={<button className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted" />}>
              <Avatar className="h-8 w-8 border-2 border-navy-100">
                <AvatarFallback className="bg-navy-500 text-xs font-bold text-white">
                  {getInitials(user.nama)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-sm font-semibold leading-tight">
                  {user.nama}
                </p>
                <Badge
                  className={`mt-0.5 px-1.5 py-0 text-[10px] font-bold ${getRoleBadgeColor(user.role)}`}
                >
                  {user.role}
                </Badge>
              </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 md:hidden">
              <p className="text-sm font-semibold">{user.nama}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
            <DropdownMenuSeparator className="md:hidden" />
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`/${user.role.toLowerCase()}/profil`)}>
              Profil Saya
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={async () => {
              await authClient.signOut();
              router.push('/login');
            }}>
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <CommandDialog open={openSearch} onOpenChange={setOpenSearch}>
          <CommandInput placeholder="Ketik perintah atau cari..." />
          <CommandList>
            <CommandEmpty>Tidak ada yang ditemukan.</CommandEmpty>
            {/* Role-based navigation items */}
            <CommandGroup heading={`Navigasi ${user.role === "ADMIN" ? "Administrator" : user.role === "GURU" ? "Guru" : "Siswa"}`}>
              <CommandItem onSelect={() => { setOpenSearch(false); router.push(`/${user.role.toLowerCase()}`); }}>
                Dashboard
              </CommandItem>
              
              {user.role === "ADMIN" && (
                <>
                  <CommandItem onSelect={() => { setOpenSearch(false); router.push("/admin/siswa"); }}>
                    Data Siswa
                  </CommandItem>
                  <CommandItem onSelect={() => { setOpenSearch(false); router.push("/admin/guru"); }}>
                    Data Guru
                  </CommandItem>
                  <CommandItem onSelect={() => { setOpenSearch(false); router.push("/admin/kelas"); }}>
                    Data Kelas
                  </CommandItem>
                  <CommandItem onSelect={() => { setOpenSearch(false); router.push("/admin/absensi"); }}>
                    Absensi
                  </CommandItem>
                  <CommandItem onSelect={() => { setOpenSearch(false); router.push("/admin/nilai"); }}>
                    Input Nilai
                  </CommandItem>
                  <CommandItem onSelect={() => { setOpenSearch(false); router.push("/admin/rekap"); }}>
                    Rekap Kelas
                  </CommandItem>
                  <CommandItem onSelect={() => { setOpenSearch(false); router.push("/admin/mapel"); }}>
                    Mata Pelajaran
                  </CommandItem>
                  <CommandItem onSelect={() => { setOpenSearch(false); router.push("/admin/spk"); }}>
                    Konfigurasi SPK
                  </CommandItem>
                  <CommandItem onSelect={() => { setOpenSearch(false); router.push("/admin/manajemen-data"); }}>
                    Manajemen Data
                  </CommandItem>
                  <CommandItem onSelect={() => { setOpenSearch(false); router.push("/admin/leaderboard"); }}>
                    Leaderboard
                  </CommandItem>
                  <CommandItem onSelect={() => { setOpenSearch(false); router.push("/admin/akun"); }}>
                    Manajemen Akun
                  </CommandItem>
                </>
              )}

              {user.role === "GURU" && (
                <>
                  <CommandItem onSelect={() => { setOpenSearch(false); router.push("/guru/absensi"); }}>
                    Input Absensi
                  </CommandItem>
                  <CommandItem onSelect={() => { setOpenSearch(false); router.push("/guru/nilai"); }}>
                    Input Nilai
                  </CommandItem>
                  <CommandItem onSelect={() => { setOpenSearch(false); router.push("/guru/rekap"); }}>
                    Rekap Kelas
                  </CommandItem>
                </>
              )}

              {user.role === "SISWA" && (
                <>
                  <CommandItem onSelect={() => { setOpenSearch(false); router.push("/siswa/absensi"); }}>
                    Riwayat Absensi
                  </CommandItem>
                  <CommandItem onSelect={() => { setOpenSearch(false); router.push("/siswa/nilai"); }}>
                    Nilai Saya
                  </CommandItem>
                  <CommandItem onSelect={() => { setOpenSearch(false); router.push("/siswa/leaderboard"); }}>
                    Leaderboard
                  </CommandItem>
                </>
              )}
              
              <CommandItem onSelect={() => { setOpenSearch(false); router.push(`/${user.role.toLowerCase()}/profil`); }}>
                Profil Saya
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Aksi Cepat">
              <CommandItem className="text-red-600" onSelect={async () => { setOpenSearch(false); await authClient.signOut(); router.push("/login"); }}>
                Keluar / Logout
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </div>
    </header>
  );
}
