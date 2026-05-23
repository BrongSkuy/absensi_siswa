"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="rounded-full bg-white p-6 shadow-sm mb-6 border border-gray-100">
        <FileQuestion className="h-16 w-16 text-navy-500" />
      </div>
      <h1 className="mb-2 text-4xl font-extrabold text-navy-950 tracking-tight">404</h1>
      <h2 className="mb-4 text-2xl font-semibold text-gray-900">Halaman Tidak Ditemukan</h2>
      <p className="mb-8 max-w-md text-gray-600">
        Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan. Silakan kembali ke halaman utama untuk melanjutkan.
      </p>
      <Link
        href="/"
        className={`${buttonVariants({ variant: "default" })} bg-navy-600 hover:bg-navy-700 text-white shadow-md`}
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
