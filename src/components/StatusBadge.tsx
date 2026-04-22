import { cn } from "@/lib/utils";

type Tone = "muted" | "info" | "warning" | "success" | "destructive" | "accent";

interface StatusBadgeProps {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const toneClasses: Record<Tone, string> = {
  muted: "bg-muted text-muted-foreground border-border",
  info: "bg-info-soft text-info border-info/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  success: "bg-success-soft text-success border-success/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  accent: "bg-accent-soft text-accent border-accent/20",
};

const dotClasses: Record<Tone, string> = {
  muted: "bg-muted-foreground",
  info: "bg-info",
  warning: "bg-warning",
  success: "bg-success",
  destructive: "bg-destructive",
  accent: "bg-accent",
};

export function StatusBadge({ tone = "muted", children, className, dot = true }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-medium whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotClasses[tone])} />}
      {children}
    </span>
  );
}
