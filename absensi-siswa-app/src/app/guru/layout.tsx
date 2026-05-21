import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function GuruLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell role="GURU">{children}</DashboardShell>;
}
