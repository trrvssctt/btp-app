import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Wifi, WifiOff, AlertCircle, Zap, Activity, Power, Unlock, Lock,
  Sun, Wind, Plug, ChevronRight, CheckCircle2, XCircle, Clock,
  Loader2, BarChart3, TrendingUp, DollarSign, Bot, ArrowLeft,
  Pencil, MapPin, PowerOff,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { domDeviceApi, domReadingApi, domCommandApi, domRuleApi, domBuildingApi } from "@/lib/api";
import { toast } from "sonner";

// ── Constants ─────────────────────────────────────────────────────────────────
const DEVICE_TYPES = ["Température","Humidité","Présence","Accès porte","Lumière","Climatiseur","Prise intelligente","Compteur énergie"];
const PROTOCOLS    = ["LoRaWAN","Zigbee","Z-Wave","Wi-Fi","Modbus","MQTT"];
const COMMANDS     = ["ON", "OFF", "LOCK", "UNLOCK", "ALERT"];
const TABS         = ["supervision", "controle", "energie", "routines"] as const;
type Tab = typeof TABS[number];

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusIcon(s: string) {
  if (s === "online")  return <Wifi className="w-4 h-4 text-success" />;
  if (s === "offline") return <WifiOff className="w-4 h-4 text-destructive" />;
  return <AlertCircle className="w-4 h-4 text-warning" />;
}
function statusTone(s: string): "success" | "destructive" | "warning" {
  if (s === "online") return "success"; if (s === "offline") return "destructive"; return "warning";
}
function statusLabel(s: string) {
  if (s === "online") return "En ligne"; if (s === "offline") return "Hors ligne"; return "Alerte";
}
function deviceIcon(type: string) {
  if (type === "Lumière")            return <Sun className="w-5 h-5" />;
  if (type === "Climatiseur")        return <Wind className="w-5 h-5" />;
  if (type === "Accès porte")        return <Lock className="w-5 h-5" />;
  if (type === "Prise intelligente") return <Plug className="w-5 h-5" />;
  return <Power className="w-5 h-5" />;
}
function cmdStatusIcon(s: string) {
  if (s === "EXECUTED") return <CheckCircle2 className="w-3.5 h-3.5 text-success" />;
  if (s === "FAILED")   return <XCircle className="w-3.5 h-3.5 text-destructive" />;
  return <Clock className="w-3.5 h-3.5 text-warning animate-pulse" />;
}
function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function fmt(n: number) { return Math.round(n).toLocaleString("fr-FR"); }

// ── Composant principal ───────────────────────────────────────────────────────
export default function DomotiqueCapteurDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [device,    setDevice]   = useState<any>(null);
  const [readings,  setReadings] = useState<any[]>([]);
  const [commands,  setCommands] = useState<any[]>([]);
  const [rules,     setRules]    = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading,   setLoading]  = useState(true);

  const [tab, setTab] = useState<Tab>("supervision");

  // Contrôle remote
  const [isOn,    setIsOn]    = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Activate/deactivate
  const [toggling, setToggling] = useState(false);

  // Edit modal
  const [editOpen,    setEditOpen]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  // Form fields
  const [eName,     setEName]     = useState("");
  const [eType,     setEType]     = useState(DEVICE_TYPES[0]);
  const [eCategory, setECategory] = useState("sensor");
  const [eProtocol, setEProtocol] = useState(PROTOCOLS[0]);
  const [eUnit,     setEUnit]     = useState("");
  const [eBuilding, setEBuilding] = useState("");
  // Cascade — useRef flag prevents auto-build from overwriting device location on open
  const cascadeTouched = { current: false };
  const [eTree,        setETree]        = useState<any>(null);
  const [eTreeLoading, setETreeLoading] = useState(false);
  const [eFloorId,     setEFloorId]     = useState("");
  const [eSpaceId,     setESpaceId]     = useState(""); // "zone:{id}" | "apt:{id}"
  const [eRoomId,      setERoomId]      = useState("");
  const [eLocation,    setELocation]    = useState("");
  const [eCascadeActive, setECascadeActive] = useState(false); // true once user picks a floor
  // Energy
  const [eWithEnergy,  setEWithEnergy]  = useState(false);
  const [ePower,       setEPower]       = useState("");
  const [eKwh,         setEKwh]         = useState("120");
  const [eCanAutoCut,  setECanAutoCut]  = useState(false);
  const [ePriority,    setEPriority]    = useState("normal");

  // ── Load data ───────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [dev, rdgs, cmds, allRules, bldgs] = await Promise.all([
        domDeviceApi.get(id),
        domReadingApi.list({ device_id: id, limit: 50 }),
        domCommandApi.list({ device_id: id, limit: 20 }),
        domRuleApi.list(),
        domBuildingApi.list(),
      ]);
      setDevice(dev);
      setReadings(rdgs);
      setCommands(cmds);
      setBuildings(bldgs);
      setIsOn(dev.last_value === "ON" || dev.last_value === "Fermé");
      const relevant = allRules.filter((r: any) =>
        (r.conditions || []).some((c: any) => c.device_id === id) ||
        (r.actions    || []).some((a: any) => a.device_id === id)
      );
      setRules(relevant);
    } catch {
      toast.error("Impossible de charger l'équipement");
      navigate("/domotique/capteurs");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── Load tree when eBuilding changes (edit modal) ───────────────────────────
  useEffect(() => {
    // Reset cascade but NOT eLocation — location is only rebuilt when user picks a floor
    setEFloorId(""); setESpaceId(""); setERoomId(""); setETree(null);
    setECascadeActive(false);
    if (!eBuilding) return;
    setETreeLoading(true);
    domBuildingApi.getTree(eBuilding)
      .then(setETree)
      .catch(() => {})
      .finally(() => setETreeLoading(false));
  }, [eBuilding]);

  useEffect(() => { setESpaceId(""); setERoomId(""); }, [eFloorId]);
  useEffect(() => { setERoomId(""); }, [eSpaceId]);

  // Derive cascade options
  const selectedBuilding = buildings.find(b => b.id === eBuilding);
  const selectedFloor    = eTree?.floors?.find((f: any) => f.id === eFloorId);
  const spaceOptions: { value: string; label: string; kind: "zone" | "apt"; data: any }[] = selectedFloor
    ? [
        ...(selectedFloor.zones      || []).map((z: any) => ({ value: `zone:${z.id}`, label: `Espace commun — ${z.name}`, kind: "zone" as const, data: z })),
        ...(selectedFloor.apartments || []).map((a: any) => ({ value: `apt:${a.id}`,  label: `Appartement ${a.number}`,   kind: "apt"  as const, data: a })),
      ]
    : [];
  const selectedSpace = spaceOptions.find(s => s.value === eSpaceId);
  const roomOptions: any[] = selectedSpace?.kind === "apt" ? (selectedSpace.data.rooms || []) : [];
  const selectedRoom = roomOptions.find((r: any) => r.id === eRoomId);

  // Auto-build location only when the user has actively picked a floor/space/room
  useEffect(() => {
    if (!eCascadeActive) return;
    const parts: string[] = [];
    if (selectedBuilding) parts.push(selectedBuilding.name);
    if (selectedFloor)    parts.push(selectedFloor.name);
    if (selectedSpace)    parts.push(selectedSpace.kind === "zone" ? selectedSpace.data.name : selectedSpace.data.number);
    if (selectedRoom)     parts.push(selectedRoom.name);
    setELocation(parts.join(" — "));
  }, [eBuilding, eFloorId, eSpaceId, eRoomId, eCascadeActive]);

  // ── Open edit modal pre-filled ──────────────────────────────────────────────
  function openEdit() {
    if (!device) return;
    setEName(device.name ?? "");
    setEType(device.type ?? DEVICE_TYPES[0]);
    setECategory(device.category ?? "sensor");
    setEProtocol(device.protocol ?? PROTOCOLS[0]);
    setEUnit(device.unit ?? "");
    setEBuilding(device.building_id ?? "");  // do NOT fallback to first building
    setEFloorId(""); setESpaceId(""); setERoomId("");
    setECascadeActive(false);               // don't let auto-build overwrite existing location
    setELocation(device.location ?? "");
    setEWithEnergy(!!device.nominal_power_watt);
    setEPower(device.nominal_power_watt ? String(device.nominal_power_watt) : "");
    setEKwh(device.kwh_price ? String(device.kwh_price) : "120");
    setECanAutoCut(device.can_be_auto_cut ?? false);
    setEPriority(device.energy_priority ?? "normal");
    setEditOpen(true);
  }

  // ── Save edits ──────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!device) return;
    if (!eName.trim()) { toast.error("Le nom est requis"); return; }
    const powerNum = Number(ePower);
    if (eWithEnergy) {
      if (!ePower || isNaN(powerNum) || powerNum <= 0) {
        toast.error("Puissance nominale invalide (doit être > 0)");
        return;
      }
    }
    setSaving(true);
    try {
      const payload: any = {
        name:        eName.trim(),
        type:        eType,
        category:    eCategory,
        protocol:    eProtocol,
        unit:        eUnit.trim() || null,
        location:    eLocation || null,
        building_id: eBuilding || null,
      };
      if (eWithEnergy) {
        payload.energy_profile = {
          nominal_power_watt:  powerNum,
          kwh_price:           Number(eKwh) || 120,
          can_be_auto_cut:     eCanAutoCut,
          priority:            ePriority,
        };
      }
      await domDeviceApi.update(device.id, payload);
      setEditOpen(false);
      toast.success("Équipement mis à jour");
      // Reload from DB to get the freshest data (including energy profile)
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message;
      const details = e?.response?.data?.error?.details;
      const detailStr = details ? ` (${Object.entries(details).map(([k,v]) => `${k}: ${(v as string[]).join(', ')}`).join('; ')})` : '';
      toast.error((msg || "Erreur lors de la mise à jour") + detailStr);
    } finally {
      setSaving(false);
    }
  }

  // ── Activate / Deactivate ───────────────────────────────────────────────────
  async function toggleActif() {
    if (!device) return;
    setToggling(true);
    try {
      const updated = await domDeviceApi.update(device.id, { actif: !device.actif });
      setDevice(updated);
      toast.success(updated.actif ? "Équipement activé" : "Équipement désactivé");
    } catch {
      toast.error("Erreur lors de la modification");
    } finally {
      setToggling(false);
    }
  }

  // ── Send remote command ─────────────────────────────────────────────────────
  async function executeCommand(cmd: string) {
    if (!device) return;
    setSending(true);
    setConfirm(null);
    try {
      const result = await domDeviceApi.sendCommand(device.id, { command: cmd });
      setCommands(p => [{ ...result, device_name: device.name }, ...p]);
      if (result.status === "EXECUTED") {
        setIsOn(cmd === "ON" || cmd === "LOCK");
        setDevice((d: any) => ({ ...d, last_value: cmd }));
        toast.success(`${device.name} → ${cmd}`);
      } else {
        toast.error("Commande échouée — équipement hors ligne");
      }
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  }

  // ── Chart data ──────────────────────────────────────────────────────────────
  const chartData = [...readings].reverse().map(r => ({
    t:     fmtTime(r.received_at),
    value: Number(r.value),
  }));

  const isActuator = device?.category === "actuator" || device?.category === "hybrid";
  const hasEnergy  = !!device?.nominal_power_watt;

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
      <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
    </div>
  );
  if (!device) return null;

  return (
    <>
      {/* ── Breadcrumb ── */}
      <div className="mb-1">
        <Link to="/domotique/capteurs" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="w-3 h-3" /> Capteurs & Actionneurs
        </Link>
      </div>

      {/* ── Header card ── */}
      <div className={`rounded-xl bg-card border shadow-sm p-5 mb-6 ${!device.actif ? "border-border/50 opacity-80" : "border-border"}`}>
        <div className="flex flex-wrap items-start gap-4">
          {/* Icône */}
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
            !device.actif ? "bg-muted text-muted-foreground" :
            device.status === "online" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}>
            {device.actif ? deviceIcon(device.type) : <PowerOff className="w-5 h-5" />}
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-lg font-bold">{device.name}</h1>
              {device.actif
                ? <div className="flex items-center gap-1">{statusIcon(device.status)}<StatusBadge tone={statusTone(device.status)}>{statusLabel(device.status)}</StatusBadge></div>
                : <StatusBadge tone="muted">Désactivé</StatusBadge>
              }
            </div>
            <p className="text-xs text-muted-foreground font-mono mb-2">{device.unique_identifier}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground">{device.type}</span>
              <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground capitalize">
                {device.category === "sensor" ? "Capteur" : device.category === "actuator" ? "Actionneur" : "Hybride"}
              </span>
              <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground">{device.protocol}</span>
              {device.location && (
                <span className="text-muted-foreground flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" /> {device.location}
                </span>
              )}
            </div>
          </div>

          {/* Dernière valeur + actions */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums">
                {device.last_value ?? "—"}
                {device.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{device.unit}</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {device.last_seen_at ? `Vu à ${fmtTime(device.last_seen_at)}` : "Jamais vu"}
              </p>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Activate/deactivate toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{device.actif ? "Actif" : "Inactif"}</span>
                {toggling
                  ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  : <Switch checked={!!device.actif} onCheckedChange={toggleActif} />
                }
              </div>
              {/* Edit button */}
              <Button size="sm" variant="outline" className="gap-1.5" onClick={openEdit}>
                <Pencil className="w-3.5 h-3.5" /> Éditer
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-5 border-b border-border">
        {([
          ["supervision", <BarChart3 className="w-3.5 h-3.5" />, "Supervision"],
          ["controle",    <Power className="w-3.5 h-3.5" />,    "Contrôle"],
          ["energie",     <Zap className="w-3.5 h-3.5" />,      "Énergie"],
          ["routines",    <Bot className="w-3.5 h-3.5" />,      "Routines"],
        ] as [Tab, React.ReactNode, string][]).map(([key, icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {icon} {label}
            {key === "routines" && rules.length > 0 && (
              <span className="text-[10px] bg-primary/15 text-primary rounded-full px-1.5 font-bold">{rules.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══ SUPERVISION ══════════════════════════════════════════════════════ */}
      {tab === "supervision" && (
        <div className="space-y-5">
          {chartData.length === 0 ? (
            <div className="rounded-xl bg-card border border-border p-10 text-center text-muted-foreground text-sm">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Aucune mesure reçue pour cet équipement.
            </div>
          ) : (
            <div className="rounded-xl bg-card border border-border shadow-sm p-5">
              <h2 className="text-sm font-semibold mb-4">
                Historique des mesures
                <span className="text-xs font-normal text-muted-foreground ml-2">({readings.length} relevés)</span>
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} unit={device.unit ? ` ${device.unit}` : ""} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${v}${device.unit ? " " + device.unit : ""}`, "Valeur"]}
                  />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {readings.length > 0 && (
            <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="text-sm font-semibold">Derniers relevés</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">Heure</th>
                      <th className="text-right font-medium px-4 py-3">Valeur</th>
                      <th className="text-left font-medium px-4 py-3">Unité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {readings.slice(0, 20).map((r: any) => (
                      <tr key={r.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmtDatetime(r.received_at)}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums">{r.value}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.unit || device.unit || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ CONTRÔLE ══════════════════════════════════════════════════════════ */}
      {tab === "controle" && (
        <div className="space-y-5">
          {!isActuator ? (
            <div className="rounded-xl bg-card border border-border p-10 text-center text-muted-foreground text-sm">
              <Power className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Ce capteur ne supporte pas les commandes à distance.
            </div>
          ) : !device.actif ? (
            <div className="rounded-xl bg-card border border-border p-10 text-center text-muted-foreground text-sm">
              <PowerOff className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Cet équipement est désactivé. Activez-le d'abord pour envoyer des commandes.
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-card border border-border shadow-sm p-5">
                <h2 className="text-sm font-semibold mb-4">État & commandes</h2>
                <div className="flex flex-wrap items-center gap-4">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl ${isOn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {deviceIcon(device.type)}
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${isOn ? "text-primary" : "text-muted-foreground"}`}>
                      {device.type === "Accès porte" ? (isOn ? "Verrouillé" : "Déverrouillé") : (isOn ? "ON" : "OFF")}
                    </p>
                    <p className="text-xs text-muted-foreground">Dernière valeur : {device.last_value ?? "—"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 ml-auto">
                    {COMMANDS.map(cmd => (
                      <Button
                        key={cmd}
                        size="sm"
                        variant={cmd === "OFF" || cmd === "UNLOCK" ? "outline" : "default"}
                        className="gap-1.5 font-mono"
                        disabled={sending || device.status === "offline"}
                        onClick={() => setConfirm(cmd)}
                      >
                        {sending && confirm === cmd && <Loader2 className="w-3 h-3 animate-spin" />}
                        {cmd}
                      </Button>
                    ))}
                  </div>
                </div>
                {device.status === "offline" && (
                  <p className="mt-3 text-xs text-destructive flex items-center gap-1">
                    <WifiOff className="w-3 h-3" /> Équipement hors ligne — les commandes seront rejetées.
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Historique des commandes</h2>
                  <span className="text-xs text-muted-foreground">{commands.length} commande(s)</span>
                </div>
                {commands.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Aucune commande envoyée.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="text-center font-medium px-4 py-3">État</th>
                          <th className="text-left font-medium px-4 py-3">Commande</th>
                          <th className="text-left font-medium px-4 py-3">Envoyée</th>
                          <th className="text-left font-medium px-4 py-3">Par</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {commands.map((c: any) => (
                          <tr key={c.id} className="hover:bg-muted/30">
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {cmdStatusIcon(c.status)}
                                <span className="text-xs">{c.status === "EXECUTED" ? "OK" : c.status === "FAILED" ? "Échec" : "En cours"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5"><span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{c.command}</span></td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmtDatetime(c.sent_at)}</td>
                            <td className="px-4 py-2.5 text-xs">{c.sent_by_name || "Système"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ ÉNERGIE ═══════════════════════════════════════════════════════════ */}
      {tab === "energie" && (
        <div className="space-y-5">
          {!hasEnergy ? (
            <div className="rounded-xl bg-card border border-border p-10 text-center text-muted-foreground text-sm">
              <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Aucun profil énergétique configuré.
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={openEdit}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Configurer via Éditer
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Puissance nominale",         value: `${device.nominal_power_watt} W`,                                                                      icon: Zap,        color: "text-warning" },
                  { label: "Consommation estim./jour",   value: `${(device.nominal_power_watt * 8 / 1000).toFixed(2)} kWh`,                                             icon: TrendingUp, color: "text-primary" },
                  { label: "Coût estimé / jour",         value: `${fmt(device.nominal_power_watt * 8 / 1000 * (device.kwh_price || 120))} FCFA`,                        icon: DollarSign, color: "text-success" },
                  { label: "Coût estimé / mois",         value: `${fmt(device.nominal_power_watt * 8 / 1000 * 31 * (device.kwh_price || 120))} FCFA`,                   icon: BarChart3,  color: "text-accent"  },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-xl bg-card border border-border shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                    <p className="text-xl font-bold tabular-nums">{value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-card border border-border shadow-sm p-5">
                <h2 className="text-sm font-semibold mb-4">Profil énergétique détaillé</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div><p className="text-xs text-muted-foreground mb-1">Puissance nominale</p><p className="font-semibold">{device.nominal_power_watt} W</p></div>
                  <div><p className="text-xs text-muted-foreground mb-1">Prix kWh</p><p className="font-semibold">{device.kwh_price ?? 120} FCFA</p></div>
                  <div><p className="text-xs text-muted-foreground mb-1">Seuil journalier</p><p className="font-semibold">{device.daily_threshold_kwh ? `${device.daily_threshold_kwh} kWh` : "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-1">Seuil mensuel</p><p className="font-semibold">{device.monthly_threshold_kwh ? `${device.monthly_threshold_kwh} kWh` : "—"}</p></div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Coupure automatique</p>
                    <p className={`font-semibold ${device.can_be_auto_cut ? "text-success" : "text-muted-foreground"}`}>
                      {device.can_be_auto_cut ? "✓ Autorisée" : "Non autorisée"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Priorité</p>
                    <StatusBadge tone={device.energy_priority === "critical" ? "destructive" : device.energy_priority === "normal" ? "warning" : "info"}>
                      {device.energy_priority === "critical" ? "Critique" : device.energy_priority === "normal" ? "Normal" : "Faible"}
                    </StatusBadge>
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Formule de calcul</p>
                  <div className="bg-muted rounded-lg p-3 text-xs font-mono text-muted-foreground space-y-1">
                    <p>kWh/jour = {device.nominal_power_watt}W × 8h / 1000 = {(device.nominal_power_watt * 8 / 1000).toFixed(3)} kWh</p>
                    <p>Coût/jour = {(device.nominal_power_watt * 8 / 1000).toFixed(3)} kWh × {device.kwh_price ?? 120} FCFA = {fmt(device.nominal_power_watt * 8 / 1000 * (device.kwh_price || 120))} FCFA</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ ROUTINES ══════════════════════════════════════════════════════════ */}
      {tab === "routines" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {rules.length === 0
                ? "Aucune routine n'implique cet équipement."
                : `${rules.length} routine(s) impliquent cet équipement.`}
            </p>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => navigate("/domotique/routines")}>
              <Bot className="w-3.5 h-3.5" /> Gérer les routines
            </Button>
          </div>

          {rules.length === 0 ? (
            <div className="rounded-xl bg-card border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Créez une routine depuis la page Routines en sélectionnant cet équipement.
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((r: any) => {
                const conditionsHere = (r.conditions || []).filter((c: any) => c.device_id === id);
                const actionsHere    = (r.actions    || []).filter((a: any) => a.device_id === id);
                return (
                  <div key={r.id} className="rounded-xl bg-card border border-border shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${r.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          <Zap className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{r.name}</p>
                          {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                        </div>
                      </div>
                      <StatusBadge tone={r.enabled ? "success" : "muted"}>{r.enabled ? "Active" : "Inactive"}</StatusBadge>
                    </div>
                    {conditionsHere.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Utilisé en condition</p>
                        <div className="flex flex-wrap gap-1.5">
                          {conditionsHere.map((c: any, i: number) => (
                            <span key={i} className="text-xs bg-muted rounded px-2 py-0.5">
                              {c.metric} <span className="font-mono font-bold">{c.operator}</span> {c.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {actionsHere.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Utilisé en action</p>
                        <div className="flex flex-wrap gap-1.5">
                          {actionsHere.map((a: any, i: number) => (
                            <span key={i} className="text-xs bg-primary/10 text-primary rounded px-2 py-0.5 font-mono font-bold">{a.command}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ MODAL ÉDITION ═════════════════════════════════════════════════════ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifier l'équipement</DialogTitle></DialogHeader>
          <div className="space-y-4">

            {/* Nom */}
            <div className="space-y-1.5">
              <Label>Nom affiché</Label>
              <Input value={eName} onChange={e => setEName(e.target.value)} placeholder="Température Salon 301" />
            </div>

            {/* Type + Catégorie */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={eType} onValueChange={setEType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEVICE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Select value={eCategory} onValueChange={setECategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sensor">Capteur</SelectItem>
                    <SelectItem value="actuator">Actionneur</SelectItem>
                    <SelectItem value="hybrid">Hybride</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Protocole + Unité */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Protocole</Label>
                <Select value={eProtocol} onValueChange={setEProtocol}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROTOCOLS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Unité de mesure</Label>
                <Input value={eUnit} onChange={e => setEUnit(e.target.value)} placeholder="°C, %, lux…" />
              </div>
            </div>

            {/* Immeuble */}
            {buildings.length > 0 && (
              <div className="space-y-1.5">
                <Label>Immeuble</Label>
                <Select value={eBuilding || "__none__"} onValueChange={v => setEBuilding(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir un immeuble" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Aucun immeuble —</SelectItem>
                    {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Cascade localisation */}
            <div className="space-y-2">
              <Label>Localisation précise</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={eFloorId || "__none__"}
                  onValueChange={v => { setECascadeActive(true); setEFloorId(v === "__none__" ? "" : v); }}
                  disabled={!eTree && eTreeLoading}
                >
                  <SelectTrigger className="h-9 text-sm">
                    {eTreeLoading
                      ? <span className="flex items-center gap-1.5 text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Chargement…</span>
                      : <SelectValue placeholder="Étage" />}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Choisir un étage —</SelectItem>
                    {(eTree?.floors || []).map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select
                  value={eSpaceId || "__none__"}
                  onValueChange={v => setESpaceId(v === "__none__" ? "" : v)}
                  disabled={!eFloorId || spaceOptions.length === 0}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={!eFloorId ? "Sélectionner un étage" : "Appartement / Zone"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Choisir un espace —</SelectItem>
                    {spaceOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {selectedSpace?.kind === "apt" && (
                <Select
                  value={eRoomId || "__none__"}
                  onValueChange={v => setERoomId(v === "__none__" ? "" : v)}
                  disabled={roomOptions.length === 0}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={roomOptions.length === 0 ? "Aucune pièce" : "Pièce (optionnel)"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Toute l'appartement —</SelectItem>
                    {roomOptions.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              {eLocation && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                  <MapPin className="w-3 h-3 shrink-0 text-primary" />
                  <span className="font-mono">{eLocation}</span>
                </div>
              )}
            </div>

            {/* Profil énergétique */}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium">Profil énergétique</p>
                  <p className="text-xs text-muted-foreground">Si l'équipement consomme de l'énergie</p>
                </div>
                <Switch checked={eWithEnergy} onCheckedChange={setEWithEnergy} />
              </div>
              {eWithEnergy && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Puissance nominale (W)</Label>
                      <Input type="number" placeholder="1200" value={ePower} onChange={e => setEPower(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Prix kWh (FCFA)</Label>
                      <Input type="number" placeholder="120" value={eKwh} onChange={e => setEKwh(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Priorité</Label>
                      <Select value={ePriority} onValueChange={setEPriority}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Faible</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="critical">Critique</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                      <Switch checked={eCanAutoCut} onCheckedChange={setECanAutoCut} />
                      <Label className="text-sm font-normal">Coupure auto autorisée</Label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmation commande ── */}
      <AlertDialog open={!!confirm} onOpenChange={open => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la commande</AlertDialogTitle>
            <AlertDialogDescription>
              Envoyer <strong>{confirm}</strong> à <strong>{device?.name}</strong> ? Cette action sera journalisée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm && executeCommand(confirm)}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
