import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Search, X, AlertTriangle, XCircle, Info, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNotifications, AppNotification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const urgenceConfig: Record<string, { icon: React.ElementType; ring: string; bg: string; text: string }> = {
  CRITIQUE: { icon: XCircle,       ring: "ring-destructive/30", bg: "bg-destructive/5",  text: "text-destructive" },
  HAUTE:    { icon: AlertTriangle, ring: "ring-amber-400/40",   bg: "bg-amber-50",       text: "text-amber-700" },
  NORMALE:  { icon: Info,          ring: "ring-blue-400/30",    bg: "bg-blue-50",        text: "text-blue-700" },
  INFO:     { icon: Info,          ring: "ring-muted/30",       bg: "bg-muted/30",       text: "text-muted-foreground" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

function NotifItem({ n, onRead, onNavigate }: {
  n: AppNotification;
  onRead: (id: string) => void;
  onNavigate: (path: string) => void;
}) {
  const cfg = urgenceConfig[n.urgence] ?? urgenceConfig.INFO;
  const Icon = cfg.icon;
  return (
    <div className={cn("flex items-start gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors ring-1 ring-inset mx-2 my-1.5 rounded-xl", cfg.ring, cfg.bg)}>
      <div className={cn("mt-0.5 shrink-0", cfg.text)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-semibold leading-snug", cfg.text)}>{n.titre}</p>
        {n.message && <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-3">{n.message}</p>}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground/70">{timeAgo(n.created_at)}</span>
          {n.entity_type === "Demande" && n.entity_id && (
            <button
              className="text-[10px] font-semibold text-accent underline underline-offset-2 hover:no-underline"
              onClick={() => { onRead(n.id); onNavigate(`/demandes/${n.entity_id}`); }}
            >
              Voir la demande →
            </button>
          )}
        </div>
      </div>
      <button
        onClick={() => onRead(n.id)}
        className="shrink-0 mt-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        title="Marquer comme lu"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30 flex items-center px-4 gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="h-5 w-px bg-border" />
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher demande, article, chantier…"
                className="pl-9 h-9 bg-muted/40 border-transparent focus-visible:bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="relative h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>

                <PopoverContent align="end" sideOffset={8} className="w-96 p-0 shadow-xl">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                      <h3 className="font-semibold text-sm">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
                        onClick={markAllRead}
                      >
                        Tout marquer lu
                      </Button>
                    )}
                  </div>

                  {/* List */}
                  {notifications.length === 0 ? (
                    <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="w-7 h-7 opacity-20" />
                      <p className="text-sm">Aucune notification non lue</p>
                    </div>
                  ) : (
                    <div className="max-h-[26rem] overflow-y-auto py-1">
                      {notifications.slice(0, 15).map((n) => (
                        <NotifItem
                          key={n.id}
                          n={n}
                          onRead={markRead}
                          onNavigate={(path) => { navigate(path); }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="border-t border-border px-4 py-2.5">
                    <p className="text-[10px] text-muted-foreground text-center">
                      Les notifications disparaissent une fois marquées comme lues
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </header>
          <main className="flex-1 p-6 lg:p-8 max-w-[1600px] w-full mx-auto animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
