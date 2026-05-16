import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Wifi, AlertTriangle, Zap, Building2, Activity, ChevronRight, Loader2, CheckCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { domBuildingApi, domDeviceApi, domAlertApi, domReadingApi } from "@/lib/api";
import { toast } from "sonner";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function severityTone(s: string): "destructive" | "warning" | "info" {
  if (s === "critical") return "destructive";
  if (s === "warning") return "warning";
  return "info";
}
function statusTone(s: string): "success" | "destructive" | "warning" {
  if (s === "online") return "success";
  if (s === "offline") return "destructive";
  return "warning";
}
function statusLabel(s: string) {
  if (s === "online") return "En ligne";
  if (s === "offline") return "Hors ligne";
  return "Alerte";
}

export default function DomotiqueDashboard() {
  const [buildings, setBuildings]   = useState<any[]>([]);
  const [devices, setDevices]       = useState<any[]>([]);
  const [alerts, setAlerts]         = useState<any[]>([]);
  const [readings, setReadings]     = useState<any[]>([]);
  const [resolving, setResolving]   = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      domBuildingApi.list(),
      domDeviceApi.list(),
      domAlertApi.list({ resolved: false }),
      domReadingApi.list({ limit: 8 }),
    ]).then(([b, d, a, r]) => {
      setBuildings(b); setDevices(d); setAlerts(a); setReadings(r);
    }).finally(() => setLoading(false));
  }, []);

  const online = devices.filter(d => d.status === "online").length;

  async function resolveAlert(id: string) {
    setResolving(id);
    try {
      await domAlertApi.resolve(id);
      setAlerts(p => p.filter(a => a.id !== id));
      toast.success("Alerte résolue");
    } catch {
      toast.error("Erreur lors de la résolution");
    } finally {
      setResolving(null);
    }
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <PageHeader breadcrumb="Domotique" title="Supervision" description="Vue temps réel de l'ensemble des immeubles connectés." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Immeubles supervisés" value={buildings.length} hint={`${buildings.filter(b => b.status === "active").length} actifs`} icon={Building2} tone="accent" />
        <KpiCard label="Capteurs en ligne" value={`${online}/${devices.length}`} hint={`${devices.filter(d => d.status === "offline").length} hors ligne`} icon={Wifi} tone="success" />
        <KpiCard label="Alertes actives" value={alerts.length} hint={`${alerts.filter(a => a.severity === "critical").length} critique(s)`} icon={AlertTriangle} tone={alerts.some(a => a.severity === "critical") ? "destructive" : "warning"} />
        <KpiCard label="Équipements en alerte" value={devices.filter(d => d.status === "alert").length} hint="Nécessitent une attention" icon={Zap} tone="default" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 rounded-xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-semibold text-sm">Immeubles</h2>
            <Link to="/domotique/batiments" className="text-xs text-primary flex items-center gap-1 hover:underline">
              Configurer <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {buildings.map(b => {
              const bDev = devices.filter(d => d.building_id === b.id);
              const bAlerts = alerts.filter(a => bDev.find(d => d.id === a.device_id));
              return (
                <div key={b.id} className="p-4 hover:bg-muted/30 transition-base">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{b.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{b.address}</p>
                    </div>
                    <StatusBadge tone="success">Actif</StatusBadge>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Wifi className="w-3 h-3 text-success" /> {bDev.filter(d => d.status === "online").length}/{bDev.length}</span>
                    {bAlerts.length > 0 && <span className="text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {bAlerts.length}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-semibold text-sm">Alertes actives</h2>
            <span className="text-xs text-muted-foreground">{alerts.length} non résolues</span>
          </div>
          <div className="divide-y divide-border">
            {alerts.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">Aucune alerte active</div>
            ) : alerts.map(a => (
              <div key={a.id} className="p-4 hover:bg-muted/30 transition-base">
                <div className="flex items-start gap-3">
                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${a.severity === "critical" ? "bg-destructive" : a.severity === "warning" ? "bg-warning" : "bg-blue-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-medium">{a.device_name || "Système"}</p>
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={severityTone(a.severity)}>
                          {a.severity === "critical" ? "Critique" : a.severity === "warning" ? "Avertissement" : "Info"}
                        </StatusBadge>
                        <Button
                          size="sm" variant="ghost" className="h-6 gap-1 text-xs text-muted-foreground hover:text-success"
                          disabled={resolving === a.id}
                          onClick={() => resolveAlert(a.id)}
                        >
                          {resolving === a.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <CheckCheck className="w-3 h-3" />}
                          Résoudre
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{a.location || ""} · {formatDate(a.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 rounded-xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-semibold text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Dernières mesures</h2>
            <Link to="/domotique/capteurs" className="text-xs text-primary flex items-center gap-1 hover:underline">Tous les capteurs <ChevronRight className="w-3 h-3" /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Équipement</th>
                  <th className="text-left font-medium px-4 py-3">Localisation</th>
                  <th className="text-right font-medium px-4 py-3">Valeur</th>
                  <th className="text-right font-medium px-4 py-3">Heure</th>
                  <th className="text-center font-medium px-4 py-3">État</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {devices.slice(0, 8).map(d => (
                  <tr key={d.id} className="hover:bg-muted/30 transition-base">
                    <td className="px-4 py-3 font-medium">{d.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{d.location}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{d.last_value || "—"} <span className="text-muted-foreground text-xs">{d.unit}</span></td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">{d.last_seen_at ? formatTime(d.last_seen_at) : "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge tone={statusTone(d.status)}>{statusLabel(d.status)}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
