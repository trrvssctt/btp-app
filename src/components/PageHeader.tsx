import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, breadcrumb, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 mb-6 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="space-y-1">
        {breadcrumb && (
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{breadcrumb}</p>
        )}
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
