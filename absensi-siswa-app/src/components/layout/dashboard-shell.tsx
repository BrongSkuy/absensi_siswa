"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import type { UserRole } from "@/lib/mock-data";

interface DashboardShellProps {
  children: React.ReactNode;
  role: UserRole;
}

export function DashboardShell({ children, role }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [isPending, session, router]);

  // Build user object from session data
  const user = {
    id: session?.user?.id || "",
    nama: session?.user?.name || "User",
    username: (session?.user as Record<string, unknown>)?.username as string || "",
    role: role,
  };

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-200 border-t-navy-500" />
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar
            role={role}
            collapsed={collapsed}
            onToggle={() => setCollapsed(!collapsed)}
          />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[264px] p-0 bg-sidebar border-sidebar-border">
            <Sidebar
              role={role}
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div
          className={cn(
            "flex flex-1 flex-col transition-all duration-300",
            collapsed ? "lg:ml-[72px]" : "lg:ml-[264px]"
          )}
        >
          <Topbar
            user={user}
            onMenuClick={() => setMobileOpen(true)}
          />

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
