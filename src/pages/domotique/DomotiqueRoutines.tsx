import { useEffect, useState } from "react";
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
import {
  Plus, Zap, ChevronDown, ChevronRight, Play, Activity, Loader2, Trash2, ArrowRight,
} from "lucide-react";
import { domRuleApi, domDeviceApi, domBuildingApi } from "@/lib/api";
import { toast } from "sonner";

const OPERATORS = ["=", ">", "<", ">=", "<=", "!="];
const COMMANDS  = ["ON", "OFF", "LOCK", "UNLOCK", "ALERT"];
const METRICS   = ["présence", "température", "humidité", "état", "consommation_journalière", "projection_mensuelle"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ── Helpers Radix (interdit value="") ─────────────────────────────────────
const NONE = "__none__";
function toSelect(v: string)  { return v || NONE; }
function fromSelect(v: string){ return v === NONE ? "" : v; }

// ── Sélecteur Immeuble → Capteur (une ligne) ──────────────────────────────
interface DevicePickerProps {
  buildings: any[];
  devices:   any[];
  buildingId: string;
  deviceId:   string;
  onChange: (buildingId: string, deviceId: string, deviceName: string) => void;
  placeholder?: string;
}

function DevicePicker({ buildings, devices, buildingId, deviceId, onChange, placeholder = "Capteur" }: DevicePickerProps) {
  const buildingDevices = buildingId
    ? devices.filter(d => d.building_id === buildingId)
    : [];

  function handleBuilding(val: string) {
    const bid = fromSelect(val);
    onChange(bid, "", "");
  }

  function handleDevice(val: string) {
    const did = fromSelect(val);
    const dev = devices.find(d => d.id === did);
    const bld = buildings.find(b => b.id === buildingId);
    const name = dev ? `${bld?.name ?? ""} — ${dev.name}` : "";
    onChange(buildingId, did, name);
  }

  return (
    <div className="flex gap-2 flex-1">
      {/* Immeuble */}
      <Select value={toSelect(buildingId)} onValueChange={handleBuilding}>
        <SelectTrigger className="h-8 text-xs w-[160px] shrink-0">
          <SelectValue placeholder="Immeuble" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE} className="text-xs text-muted-foreground">— Immeuble —</SelectItem>
          {buildings.map(b => (
            <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Capteur filtré */}
      <Select
        value={toSelect(deviceId)}
        onValueChange={handleDevice}
        disabled={!buildingId || buildingDevices.length === 0}
      >
        <SelectTrigger className="h-8 text-xs flex-1">
          <SelectValue placeholder={!buildingId ? "Choisir un immeuble" : buildingDevices.length === 0 ? "Aucun capteur" : placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE} className="text-xs text-muted-foreground">— {placeholder} —</SelectItem>
          {buildingDevices.map(d => (
            <SelectItem key={d.id} value={d.id} className="text-xs">
              <span className="font-medium">{d.name}</span>
              {d.location && (
                <span className="text-muted-foreground ml-1 text-[10px]">· {d.location.split(" — ").slice(1).join(" › ")}</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── Ligne de condition ─────────────────────────────────────────────────────
interface ConditionRowProps {
  cond: any;
  buildings: any[];
  devices:   any[];
  onChange:  (c: any) => void;
  onDelete:  () => void;
}

function ConditionRow({ cond, buildings, devices, onChange, onDelete }: ConditionRowProps) {
  return (
    <div className="p-3 bg-muted/40 rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <DevicePicker
          buildings={buildings} devices={devices}
          buildingId={cond.building_id || ""} deviceId={cond.device_id || ""}
          onChange={(bid, did, name) => onChange({ ...cond, building_id: bid, device_id: did, device_name: name })}
          placeholder="Capteur / Actionneur"
        />
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
          onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="flex gap-2">
        <Select value={cond.metric} onValueChange={v => onChange({ ...cond, metric: v })}>
          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>{METRICS.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={cond.operator} onValueChange={v => onChange({ ...cond, operator: v })}>
          <SelectTrigger className="h-8 text-xs w-16"><SelectValue /></SelectTrigger>
          <SelectContent>{OPERATORS.map(o => <SelectItem key={o} value={o} className="text-xs font-mono">{o}</SelectItem>)}</SelectContent>
        </Select>
        <Input className="h-8 text-xs w-28" placeholder="Valeur"
          value={cond.value}
          onChange={e => onChange({ ...cond, value: e.target.value })} />
      </div>
    </div>
  );
}

// ── Ligne d'action ─────────────────────────────────────────────────────────
interface ActionRowProps {
  action:   any;
  buildings: any[];
  devices:   any[];
  onChange:  (a: any) => void;
  onDelete:  () => void;
}

function ActionRow({ action, buildings, devices, onChange, onDelete }: ActionRowProps) {
  return (
    <div className="p-3 bg-muted/40 rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <DevicePicker
          buildings={buildings} devices={devices}
          buildingId={action.building_id || ""} deviceId={action.device_id || ""}
          onChange={(bid, did, name) => onChange({ ...action, building_id: bid, device_id: did, device_name: name })}
          placeholder="Actionneur cible"
        />
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
          onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <Select value={action.command} onValueChange={v => onChange({ ...action, command: v })}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>{COMMANDS.map(c => <SelectItem key={c} value={c} className="text-xs font-mono">{c}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────
export default function DomotiqueRoutines() {
  const [rules, setRules]       = useState<any[]>([]);
  const [devices, setDevices]   = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [modal, setModal]       = useState(false);
  const [loading, setLoading]   = useState(true);

  const [fName, setFName] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fConditions, setFConditions] = useState<any[]>([]);
  const [fActions, setFActions]       = useState<any[]>([]);

  const blankCond   = () => ({ building_id: "", device_id: "", device_name: "", metric: METRICS[0], operator: "=", value: "" });
  const blankAction = () => ({ building_id: "", device_id: "", device_name: "", command: "OFF" });

  useEffect(() => {
    Promise.all([domRuleApi.list(), domDeviceApi.list(), domBuildingApi.list()])
      .then(([r, d, b]) => { setRules((r || []).filter(Boolean)); setDevices(d); setBuildings(b); })
      .finally(() => setLoading(false));
  }, []);

  async function toggleEnabled(r: any) {
    try {
      const updated = await domRuleApi.toggle(r.id, !r.enabled);
      setRules(p => p.map(x => x.id === r.id ? { ...x, ...updated } : x));
      toast(updated.enabled ? "Routine activée" : "Routine désactivée");
    } catch { toast.error("Erreur lors de la mise à jour"); }
  }

  async function simulate(r: any) {
    try {
      await domRuleApi.trigger(r.id);
      setRules(p => p.map(x => x.id === r.id
        ? { ...x, trigger_count: x.trigger_count + 1, last_triggered_at: new Date().toISOString() }
        : x));
      toast.success(`Simulation : "${r.name}" déclenchée`);
    } catch { toast.error("Erreur simulation"); }
  }

  function openModal() {
    setFName(""); setFDesc("");
    setFConditions([blankCond()]);
    setFActions([blankAction()]);
    setModal(true);
  }

  async function handleSubmit() {
    if (!fName.trim()) { toast.error("Nom requis"); return; }
    try {
      await domRuleApi.create({
        name: fName, description: fDesc,
        conditions: fConditions.filter(c => c.device_id || c.metric),
        actions:    fActions.filter(a => a.device_id || a.command),
      });
      const fresh = await domRuleApi.list();
      setRules((fresh || []).filter(Boolean));
      toast.success(`Routine "${fName}" créée`);
      setModal(false);
    } catch { toast.error("Erreur lors de la création"); }
  }

  // ── Affichage d'une condition dans le récap ────────────────────────────
  function condLabel(c: any) {
    return c.device_name || c.device_id || "—";
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
      <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
    </div>
  );

  return (
    <>
      <PageHeader breadcrumb="Domotique" title="Routines & Automatisation"
        description="Créez des règles conditionnelles. Une condition d'un immeuble peut déclencher une action dans un autre." />

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-3 text-sm text-muted-foreground">
          <span><span className="font-semibold text-foreground">{rules.length}</span> routines</span>
          <span><span className="font-semibold text-success">{rules.filter(r => r.enabled).length}</span> actives</span>
          <span><span className="font-semibold text-foreground">{rules.reduce((s, r) => s + (r.trigger_count || 0), 0)}</span> déclenchements</span>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openModal}>
          <Plus className="w-4 h-4" /> Nouvelle routine
        </Button>
      </div>

      {/* ── Liste des routines ── */}
      <div className="space-y-3">
        {rules.map(r => (
          <div key={r.id} className={`rounded-xl bg-card border shadow-sm overflow-hidden ${r.enabled ? "border-border" : "border-border opacity-70"}`}>
            <div
              className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-base"
              onClick={() => setExpanded(p => ({ ...p, [r.id]: !p[r.id] }))}
            >
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
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"
                  onClick={e => { e.stopPropagation(); simulate(r); }}>
                  <Play className="w-3 h-3" /> Tester
                </Button>
                <Switch checked={r.enabled} onClick={e => e.stopPropagation()} onCheckedChange={() => toggleEnabled(r)} />
                {expanded[r.id] ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {expanded[r.id] && (
              <div className="border-t border-border grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-border">
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Conditions
                  </p>
                  <div className="space-y-2">
                    {(r.conditions || []).map((c: any, i: number) => (
                      <div key={i} className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="bg-muted rounded px-2 py-1 font-medium max-w-[200px] truncate" title={condLabel(c)}>
                          {condLabel(c)}
                        </span>
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
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Actions
                  </p>
                  <div className="space-y-2">
                    {(r.actions || []).map((a: any, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        <span className="font-mono bg-primary/10 text-primary rounded px-2 py-1 font-bold">{a.command}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="bg-muted rounded px-2 py-1 font-medium max-w-[200px] truncate" title={a.device_name || a.device_id || "—"}>
                          {a.device_name || a.device_id || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Modal création ── */}
      <Dialog open={modal} onOpenChange={v => !v && setModal(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle routine d'automatisation</DialogTitle>
            <p className="text-xs text-muted-foreground pt-1">
              Chaque condition et action cible un immeuble indépendamment — une condition dans l'Immeuble A peut déclencher une action dans l'Immeuble B.
            </p>
          </DialogHeader>

          <div className="space-y-5">
            {/* Nom / Description */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input placeholder="Ex: Extinction clim si absence" value={fName} onChange={e => setFName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input placeholder="Description courte" value={fDesc} onChange={e => setFDesc(e.target.value)} />
              </div>
            </div>

            {/* Conditions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-muted-foreground" /> Conditions
                  <span className="text-xs font-normal text-muted-foreground">(SI…)</span>
                </Label>
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
                  onClick={() => setFConditions(p => [...p, blankCond()])}>
                  <Plus className="w-3 h-3" /> Ajouter
                </Button>
              </div>
              {fConditions.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border rounded-lg">
                  Aucune condition — la routine se déclenchera manuellement.
                </p>
              )}
              {fConditions.map((c, i) => (
                <ConditionRow
                  key={i}
                  cond={c}
                  buildings={buildings}
                  devices={devices}
                  onChange={v => setFConditions(p => p.map((x, j) => j === i ? v : x))}
                  onDelete={() => setFConditions(p => p.filter((_, j) => j !== i))}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-muted-foreground" /> Actions
                  <span className="text-xs font-normal text-muted-foreground">(ALORS…)</span>
                </Label>
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
                  onClick={() => setFActions(p => [...p, blankAction()])}>
                  <Plus className="w-3 h-3" /> Ajouter
                </Button>
              </div>
              {fActions.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border rounded-lg">
                  Aucune action configurée.
                </p>
              )}
              {fActions.map((a, i) => (
                <ActionRow
                  key={i}
                  action={a}
                  buildings={buildings}
                  devices={devices}
                  onChange={v => setFActions(p => p.map((x, j) => j === i ? v : x))}
                  onDelete={() => setFActions(p => p.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Annuler</Button>
            <Button onClick={handleSubmit}>Créer la routine</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
