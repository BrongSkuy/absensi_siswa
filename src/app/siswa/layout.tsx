import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function SiswaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell role="SISWA">{children}</DashboardShell>;
}
