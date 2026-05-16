import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import {
  Power, Unlock, Lock, Sun, Wind, Plug, CheckCircle2, XCircle, Clock, Loader2,
} from "lucide-react";
import { domDeviceApi, domCommandApi } from "@/lib/api";
import { toast } from "sonner";

function deviceIcon(type: string) {
  if (type === "Lumière") return <Sun className="w-5 h-5" />;
  if (type === "Climatiseur") return <Wind className="w-5 h-5" />;
  if (type === "Accès porte") return <Lock className="w-5 h-5" />;
  if (type === "Prise intelligente") return <Plug className="w-5 h-5" />;
  return <Power className="w-5 h-5" />;
}
function cmdStatusIcon(s: string) {
  if (s === "EXECUTED") return <CheckCircle2 className="w-4 h-4 text-success" />;
  if (s === "FAILED")   return <XCircle className="w-4 h-4 text-destructive" />;
  return <Clock className="w-4 h-4 text-warning animate-pulse" />;
}
function cmdStatusTone(s: string): "success" | "destructive" | "warning" {
  if (s === "EXECUTED") return "success";
  if (s === "FAILED")   return "destructive";
  return "warning";
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function DomotiqueControle() {
  const [actuators, setActuators] = useState<any[]>([]);
  const [commands, setCommands]   = useState<any[]>([]);
  const [states, setStates]       = useState<Record<string, boolean>>({});
  const [confirm, setConfirm]     = useState<{ device: any; action: string } | null>(null);
  const [sending, setSending]     = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      domDeviceApi.list(),
      domCommandApi.list({ limit: 30 }),
    ]).then(([devs, cmds]) => {
      const acts = devs.filter((d: any) => d.category === "actuator" || d.category === "hybrid");
      setActuators(acts);
      setStates(Object.fromEntries(acts.map((d: any) => [d.id, d.last_value === "ON" || d.last_value === "Fermé"])));
      setCommands(cmds);
    }).finally(() => setLoading(false));
  }, []);

  function requestToggle(d: any) {
    const isOn = states[d.id];
    const action = d.type === "Accès porte" ? (isOn ? "UNLOCK" : "LOCK") : (isOn ? "OFF" : "ON");
    setConfirm({ device: d, action });
  }

  async function executeCommand() {
    if (!confirm) return;
    const { device, action } = confirm;
    setConfirm(null);
    setSending(device.id);
    try {
      const cmd = await domDeviceApi.sendCommand(device.id, { command: action });
      setCommands(p => [{ ...cmd, device_name: device.name }, ...p]);
      if (cmd.status === "EXECUTED") {
        setStates(p => ({ ...p, [device.id]: action === "ON" || action === "LOCK" }));
        toast.success(`${device.name} → ${action}`);
      } else {
        toast.error("Commande échouée — équipement hors ligne");
      }
    } catch {
      toast.error("Erreur lors de l'envoi de la commande");
    } finally {
      setSending(null);
    }
  }

  if (loading) return (
    <>
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
      </div>
    </>
  );

  return (
    <>
      <PageHeader breadcrumb="Domotique" title="Contrôle à distance" description="Envoyez des commandes aux actionneurs depuis l'interface." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {actuators.map(d => {
          const isOn = states[d.id];
          const isOffline = d.status === "offline";
          const isSending = sending === d.id;
          return (
            <div key={d.id} className={`rounded-xl bg-card border shadow-sm p-5 space-y-4 transition-base ${isOffline ? "opacity-60" : ""} ${isOn ? "border-primary/30 bg-primary/5" : "border-border"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isOn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {deviceIcon(d.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight">{d.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{d.location}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{d.protocol}</p>
                  {isOffline
                    ? <StatusBadge tone="destructive">Hors ligne</StatusBadge>
                    : <span className={`text-sm font-bold ${isOn ? "text-primary" : "text-muted-foreground"}`}>
                        {d.type === "Accès porte" ? (isOn ? "Verrouillé" : "Déverrouillé") : (isOn ? "ON" : "OFF")}
                      </span>
                  }
                </div>
                <div className="flex items-center gap-2">
                  {isSending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  {d.type === "Accès porte" ? (
                    <Button size="sm" variant={isOn ? "destructive" : "default"} className="gap-1.5 h-8 text-xs" disabled={isOffline || isSending} onClick={() => requestToggle(d)}>
                      {isOn ? <><Unlock className="w-3.5 h-3.5" /> Déverrouiller</> : <><Lock className="w-3.5 h-3.5" /> Verrouiller</>}
                    </Button>
                  ) : (
                    <Switch checked={isOn} disabled={isOffline || isSending} onCheckedChange={() => requestToggle(d)} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-card border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-sm">Historique des commandes</h2>
          <p className="text-xs text-muted-foreground">{commands.length} commandes</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-center font-medium px-4 py-3">État</th>
                <th className="text-left font-medium px-4 py-3">Équipement</th>
                <th className="text-left font-medium px-4 py-3">Commande</th>
                <th className="text-left font-medium px-4 py-3">Envoyée</th>
                <th className="text-left font-medium px-4 py-3">Exécutée</th>
                <th className="text-left font-medium px-4 py-3">Par</th>
                <th className="text-left font-medium px-4 py-3">Raison</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {commands.map(c => (
                <tr key={c.id} className="hover:bg-muted/30 transition-base">
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {cmdStatusIcon(c.status)}
                      <StatusBadge tone={cmdStatusTone(c.status)}>
                        {c.status === "EXECUTED" ? "OK" : c.status === "FAILED" ? "Échec" : "En cours"}
                      </StatusBadge>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">{c.device_name}</td>
                  <td className="px-4 py-3"><span className="font-mono text-xs bg-muted px-2 py-1 rounded">{c.command}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(c.sent_at)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.executed_at ? formatDate(c.executed_at) : "—"}</td>
                  <td className="px-4 py-3 text-xs">{c.sent_by_name || "Système"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={open => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la commande</AlertDialogTitle>
            <AlertDialogDescription>
              Envoyer <strong>{confirm?.action}</strong> à <strong>{confirm?.device.name}</strong> ? Cette action sera journalisée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={executeCommand}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
