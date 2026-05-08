import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "navy" | "amber" | "emerald" | "rose" | "blue";
  className?: string;
}

const colorMap = {
  navy: {
    bg: "bg-navy-50",
    icon: "bg-navy-500 text-white shadow-navy-500/30",
    trend: "text-navy-600",
  },
  amber: {
    bg: "bg-amber-50",
    icon: "bg-amber-500 text-navy-950 shadow-amber-500/30",
    trend: "text-amber-600",
  },
  emerald: {
    bg: "bg-emerald-50",
    icon: "bg-emerald-500 text-white shadow-emerald-500/30",
    trend: "text-emerald-600",
  },
  rose: {
    bg: "bg-rose-50",
    icon: "bg-rose-500 text-white shadow-rose-500/30",
    trend: "text-rose-600",
  },
  blue: {
    bg: "bg-sky-50",
    icon: "bg-sky-500 text-white shadow-sky-500/30",
    trend: "text-sky-600",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "navy",
  className,
}: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
        className
      )}
    >
      {/* Decorative background blob */}
      <div
        className={cn(
          "absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-[0.07] transition-transform duration-500 group-hover:scale-125",
          colors.bg
        )}
        style={{ background: color === "navy" ? "#1F4E78" : undefined }}
      />

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          {(subtitle || trend) && (
            <div className="flex items-center gap-2">
              {trend && (
                <span
                  className={cn(
                    "text-xs font-semibold",
                    trend.isPositive ? "text-emerald-600" : "text-rose-600"
                  )}
                >
                  {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                </span>
              )}
              {subtitle && (
                <span className="text-xs text-muted-foreground">
                  {subtitle}
                </span>
              )}
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110",
            colors.icon
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
