import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, AlertTriangle, CheckCircle2, FileText, Truck, Package, Clock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { notificationsApi } from "@/lib/api";

const typeIcons: Record<string, typeof Bell> = {
  DEMANDE:    FileText,
  STOCK:      Package,
  RECEPTION:  CheckCircle2,
  VALIDATION: Clock,
  TRANSFERT:  Truck,
};

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    setLoading(true);
    notificationsApi.list()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (id: string, currentLu: boolean) => {
    if (!currentLu) {
      try {
        await notificationsApi.markRead(id);
        setItems((s) => s.map((n) => (n.id === id ? { ...n, lu: true } : n)));
      } catch { /* silencieux */ }
    } else {
      setItems((s) => s.map((n) => (n.id === id ? { ...n, lu: false } : n)));
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((s) => s.map((n) => ({ ...n, lu: true })));
    } catch { /* silencieux */ }
  };

  const unreadCount = items.filter((n) => !n.lu).length;

  const filtered = items.filter((n) => {
    if (tab === "unread") return !n.lu;
    if (tab === "alerts") return n.urgence === "CRITICAL" || n.urgence === "WARNING";
    return true;
  });

  return (
    <AppLayout>
      <PageHeader
        breadcrumb="Notifications"
        title="Centre de notifications"
        description={`${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}.`}
        actions={
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
            Tout marquer comme lu
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">Toutes ({items.length})</TabsTrigger>
            <TabsTrigger value="unread">Non lues ({unreadCount})</TabsTrigger>
            <TabsTrigger value="alerts">{`Alertes (${items.filter((n) => n.urgence === "CRITICAL" || n.urgence === "WARNING").length})`}</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="space-y-2">
            {filtered.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-10 text-center">
                <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Aucune notification dans cette catégorie.</p>
              </div>
            ) : (
              filtered.map((n) => {
                const Icon = typeIcons[n.type] ?? Bell;
                const urgenceColor =
                  n.urgence === "CRITICAL" ? "bg-destructive/10 text-destructive"
                  : n.urgence === "WARNING"  ? "bg-warning-soft text-warning"
                  : "bg-accent-soft text-accent";
                const dateStr = n.created_at
                  ? new Date(n.created_at).toLocaleString("fr-SN")
                  : "";
                return (
                  <button
                    key={n.id}
                    onClick={() => toggle(n.id, !!n.lu)}
                    className={`w-full text-left rounded-xl border bg-card p-4 flex gap-4 transition-base hover:border-accent/40 ${
                      !n.lu ? "border-accent/30 shadow-sm" : "border-border"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${urgenceColor}`}>
                      {n.urgence === "CRITICAL" ? <AlertTriangle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-sm">{n.titre}</p>
                        {!n.lu && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                      </div>
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">{dateStr}</p>
                    </div>
                  </button>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
}
