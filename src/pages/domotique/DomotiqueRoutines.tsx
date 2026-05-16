import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Zap, ChevronDown, ChevronRight, Play, Activity, Loader2 } from "lucide-react";
import { domRuleApi, domDeviceApi } from "@/lib/api";
import { toast } from "sonner";

const OPERATORS = ["=", ">", "<", ">=", "<=", "!="];
const COMMANDS  = ["ON", "OFF", "LOCK", "UNLOCK", "ALERT"];
const METRICS   = ["présence", "température", "humidité", "état", "consommation_journalière", "projection_mensuelle"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function DomotiqueRoutines() {
  const [rules, setRules]       = useState<any[]>([]);
  const [devices, setDevices]   = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [modal, setModal]       = useState(false);
  const [loading, setLoading]   = useState(true);

  const [fName, setFName]     = useState("");
  const [fDesc, setFDesc]     = useState("");
  const [fConditions, setFConditions] = useState<any[]>([{ device_name: "", metric: METRICS[0], operator: "=", value: "" }]);
  const [fActions, setFActions]       = useState<any[]>([{ device_name: "", command: "OFF" }]);

  const deviceNames = devices.map(d => d.name);

  useEffect(() => {
    Promise.all([domRuleApi.list(), domDeviceApi.list()])
      .then(([r, d]) => { setRules(r); setDevices(d); })
      .finally(() => setLoading(false));
  }, []);

  async function toggleEnabled(r: any) {
    try {
      const updated = await domRuleApi.toggle(r.id, !r.enabled);
      setRules(p => p.map(x => x.id === r.id ? { ...x, ...updated } : x));
      toast(updated.enabled ? `Routine activée` : `Routine désactivée`);
    } catch { toast.error("Erreur lors de la mise à jour"); }
  }

  async function simulate(r: any) {
    try {
      await domRuleApi.trigger(r.id);
      setRules(p => p.map(x => x.id === r.id ? { ...x, trigger_count: x.trigger_count + 1, last_triggered_at: new Date().toISOString() } : x));
      toast.success(`Simulation : "${r.name}" déclenchée`);
    } catch { toast.error("Erreur simulation"); }
  }

  async function handleSubmit() {
    if (!fName.trim()) { toast.error("Nom requis"); return; }
    try {
      const rule = await domRuleApi.create({ name: fName, description: fDesc, conditions: fConditions, actions: fActions });
      setRules(p => [...p, rule]);
      toast.success(`Routine "${fName}" créée`);
      setModal(false);
    } catch { toast.error("Erreur lors de la création"); }
  }

  function openModal() {
    setFName(""); setFDesc("");
    setFConditions([{ device_name: deviceNames[0] || "", metric: METRICS[0], operator: "=", value: "" }]);
    setFActions([{ device_name: deviceNames[0] || "", command: "OFF" }]);
    setModal(true);
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
      <PageHeader breadcrumb="Domotique" title="Routines & Automatisation" description="Créez des règles conditionnelles sans modifier le code." />

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-3 text-sm text-muted-foreground">
          <span><span className="font-semibold text-foreground">{rules.length}</span> routines</span>
          <span><span className="font-semibold text-success">{rules.filter(r => r.enabled).length}</span> actives</span>
          <span><span className="font-semibold text-foreground">{rules.reduce((s, r) => s + (r.trigger_count || 0), 0)}</span> déclenchements</span>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openModal}><Plus className="w-4 h-4" /> Nouvelle routine</Button>
      </div>

      <div className="space-y-3">
        {rules.map(r => (
          <div key={r.id} className={`rounded-xl bg-card border shadow-sm overflow-hidden ${r.enabled ? "border-border" : "border-border opacity-70"}`}>
            <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-base" onClick={() => setExpanded(p => ({ ...p, [r.id]: !p[r.id] }))}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                <Zap className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{r.name}</p>
                <p className="text-xs text-muted-foreground truncate">{r.description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-muted-foreground">{r.trigger_count || 0} déclenchement(s)</p>
                  {r.last_triggered_at && <p className="text-[10px] text-muted-foreground/60">Dernier : {formatDate(r.last_triggered_at)}</p>}
                </div>
                <StatusBadge tone={r.enabled ? "success" : "muted"}>{r.enabled ? "Active" : "Inactive"}</StatusBadge>
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={e => { e.stopPropagation(); simulate(r); }}>
                  <Play className="w-3 h-3" /> Tester
                </Button>
                <Switch checked={r.enabled} onClick={e => e.stopPropagation()} onCheckedChange={() => toggleEnabled(r)} />
                {expanded[r.id] ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {expanded[r.id] && (
              <div className="border-t border-border grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Conditions</p>
                  <div className="space-y-2">
                    {(r.conditions || []).map((c: any, i: number) => (
                      <div key={i} className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="bg-muted rounded px-2 py-1 font-medium">{c.device_name || c.device_id || "—"}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{c.metric}</span>
                        <span className="font-mono font-bold">{c.operator}</span>
                        <span className="bg-primary/10 text-primary rounded px-2 py-1 font-medium">{String(c.value)}</span>
                        {c.duration_min && <span className="text-muted-foreground">pendant {c.duration_min} min</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Actions</p>
                  <div className="space-y-2">
                    {(r.actions || []).map((a: any, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        <span className="font-mono bg-primary/10 text-primary rounded px-2 py-1 font-bold">{a.command}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="bg-muted rounded px-2 py-1 font-medium">{a.device_name || a.device_id || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouvelle routine d'automatisation</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input placeholder="Ex: Extinction clim si absence" value={fName} onChange={e => setFName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input placeholder="Description courte" value={fDesc} onChange={e => setFDesc(e.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Conditions</Label>
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setFConditions(p => [...p, { device_name: deviceNames[0] || "", metric: METRICS[0], operator: "=", value: "" }])}>
                  <Plus className="w-3 h-3" /> Ajouter
                </Button>
              </div>
              {fConditions.map((c, i) => (
                <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-muted/40 rounded-lg">
                  <div className="col-span-2">
                    <Select value={c.device_name} onValueChange={v => setFConditions(p => p.map((x, j) => j === i ? { ...x, device_name: v } : x))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Équipement" /></SelectTrigger>
                      <SelectContent>{deviceNames.map(n => <SelectItem key={n} value={n} className="text-xs">{n}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Select value={c.metric} onValueChange={v => setFConditions(p => p.map((x, j) => j === i ? { ...x, metric: v } : x))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{METRICS.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    <Select value={c.operator} onValueChange={v => setFConditions(p => p.map((x, j) => j === i ? { ...x, operator: v } : x))}>
                      <SelectTrigger className="h-8 text-xs w-16"><SelectValue /></SelectTrigger>
                      <SelectContent>{OPERATORS.map(o => <SelectItem key={o} value={o} className="text-xs font-mono">{o}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input className="h-8 text-xs flex-1" placeholder="Valeur" value={c.value} onChange={e => setFConditions(p => p.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Actions</Label>
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setFActions(p => [...p, { device_name: deviceNames[0] || "", command: "OFF" }])}>
                  <Plus className="w-3 h-3" /> Ajouter
                </Button>
              </div>
              {fActions.map((a, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-lg">
                  <Select value={a.device_name} onValueChange={v => setFActions(p => p.map((x, j) => j === i ? { ...x, device_name: v } : x))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Équipement" /></SelectTrigger>
                    <SelectContent>{deviceNames.map(n => <SelectItem key={n} value={n} className="text-xs">{n}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={a.command} onValueChange={v => setFActions(p => p.map((x, j) => j === i ? { ...x, command: v } : x))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{COMMANDS.map(c => <SelectItem key={c} value={c} className="text-xs font-mono">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Annuler</Button>
            <Button onClick={handleSubmit}>Créer la routine</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
