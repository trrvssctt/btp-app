import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  delta?: { value: string; positive?: boolean };
  icon: LucideIcon;
  tone?: "default" | "accent" | "success" | "warning" | "destructive";
  className?: string;
}

const toneIcon: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "bg-muted text-foreground",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

export function KpiCard({ label, value, hint, delta, icon: Icon, tone = "default", className }: KpiCardProps) {
  return (
    <div className={cn(
      "group relative rounded-xl bg-card border border-border p-5 shadow-sm hover:shadow-elegant hover:border-border/60 transition-base overflow-hidden",
      className,
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          {delta && (
            <p className={cn("text-xs font-medium tabular-nums", delta.positive ? "text-success" : "text-destructive")}>
              {delta.positive ? "▲" : "▼"} {delta.value}
            </p>
          )}
        </div>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", toneIcon[tone])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
