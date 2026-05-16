import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Wifi, WifiOff, AlertCircle, Zap, Loader2 } from "lucide-react";
import { domDeviceApi, domBuildingApi } from "@/lib/api";
import { toast } from "sonner";

const DEVICE_TYPES = ["Température","Humidité","Présence","Accès porte","Lumière","Climatiseur","Prise intelligente","Compteur énergie"];
const PROTOCOLS    = ["LoRaWAN","Zigbee","Z-Wave","Wi-Fi","Modbus","MQTT"];

function statusIcon(s: string) {
  if (s === "online")  return <Wifi className="w-3.5 h-3.5 text-success" />;
  if (s === "offline") return <WifiOff className="w-3.5 h-3.5 text-destructive" />;
  return <AlertCircle className="w-3.5 h-3.5 text-warning" />;
}
function statusTone(s: string): "success" | "destructive" | "warning" {
  if (s === "online") return "success"; if (s === "offline") return "destructive"; return "warning";
}
function categoryBadge(c: string) {
  if (c === "sensor")   return <StatusBadge tone="info">Capteur</StatusBadge>;
  if (c === "actuator") return <StatusBadge tone="accent">Actionneur</StatusBadge>;
  return <StatusBadge tone="warning">Hybride</StatusBadge>;
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function DomotiqueCapteurs() {
  const [devices, setDevices]     = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [search, setSearch]       = useState("");
  const [filterType, setFilterType]         = useState("all");
  const [filterBuilding, setFilterBuilding] = useState("all");
  const [modal, setModal]         = useState(false);
  const [withEnergy, setWithEnergy] = useState(false);
  const [loading, setLoading]     = useState(true);

  const [fName, setFName]       = useState("");
  const [fId, setFId]           = useState("");
  const [fType, setFType]       = useState(DEVICE_TYPES[0]);
  const [fCategory, setFCategory] = useState("sensor");
  const [fProtocol, setFProtocol] = useState(PROTOCOLS[0]);
  const [fLocation, setFLocation] = useState("");
  const [fBuilding, setFBuilding] = useState("");
  const [fPower, setFPower]     = useState("");
  const [fKwh, setFKwh]         = useState("120");

  useEffect(() => {
    Promise.all([domDeviceApi.list(), domBuildingApi.list()])
      .then(([d, b]) => { setDevices(d); setBuildings(b); if (b[0]) setFBuilding(b[0].id); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = devices.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.unique_identifier.toLowerCase().includes(search.toLowerCase()) || (d.location || "").toLowerCase().includes(search.toLowerCase());
    const matchType     = filterType === "all" || d.type === filterType;
    const matchBuilding = filterBuilding === "all" || d.building_id === filterBuilding;
    return matchSearch && matchType && matchBuilding;
  });

  async function handleSubmit() {
    if (!fName.trim() || !fId.trim()) { toast.error("Nom et identifiant requis"); return; }
    try {
      const devId = `dev-${Date.now()}`;
      const payload: any = {
        id: devId, unique_identifier: fId, name: fName, type: fType,
        category: fCategory, protocol: fProtocol, location: fLocation || null,
        building_id: fBuilding || null,
      };
      if (withEnergy && fPower) {
        payload.energy_profile = { nominal_power_watt: Number(fPower), kwh_price: Number(fKwh), can_be_auto_cut: fCategory !== "sensor", priority: "normal" };
      }
      const created = await domDeviceApi.create(payload);
      setDevices(p => [...p, created]);
      toast.success(`Capteur "${fName}" enregistré`);
      setModal(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Erreur lors de la création");
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
      <PageHeader breadcrumb="Domotique" title="Capteurs & Actionneurs" description="Référentiel des équipements connectés par immeuble." />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Nom, identifiant, localisation…" className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {DEVICE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterBuilding} onValueChange={setFilterBuilding}>
          <SelectTrigger className="w-52 h-9"><SelectValue placeholder="Immeuble" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les immeubles</SelectItem>
            {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button size="sm" className="gap-1.5" onClick={() => setModal(true)}><Plus className="w-4 h-4" /> Nouveau capteur</Button>
        </div>
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground mb-4">
        <span><span className="font-semibold text-foreground">{filtered.length}</span> équipements</span>
        <span><span className="font-semibold text-success">{filtered.filter(d => d.status === "online").length}</span> en ligne</span>
        <span><span className="font-semibold text-destructive">{filtered.filter(d => d.status === "offline").length}</span> hors ligne</span>
        <span><span className="font-semibold text-warning">{filtered.filter(d => d.status === "alert").length}</span> en alerte</span>
      </div>

      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Nom</th>
                <th className="text-left font-medium px-4 py-3">Identifiant</th>
                <th className="text-left font-medium px-4 py-3">Type</th>
                <th className="text-left font-medium px-4 py-3">Catégorie</th>
                <th className="text-left font-medium px-4 py-3">Localisation</th>
                <th className="text-right font-medium px-4 py-3">Dernière valeur</th>
                <th className="text-left font-medium px-4 py-3">Protocole</th>
                <th className="text-center font-medium px-4 py-3">État</th>
                <th className="text-center font-medium px-4 py-3">Énergie</th>
                <th className="text-left font-medium px-4 py-3">Vu le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-muted/30 transition-base">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{d.unique_identifier}</td>
                  <td className="px-4 py-3 text-sm">{d.type}</td>
                  <td className="px-4 py-3">{categoryBadge(d.category)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px] truncate">{d.location || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{d.last_value || "—"} <span className="text-muted-foreground text-xs">{d.unit}</span></td>
                  <td className="px-4 py-3 text-xs"><span className="bg-muted px-2 py-0.5 rounded text-muted-foreground">{d.protocol}</span></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {statusIcon(d.status)}
                      <StatusBadge tone={statusTone(d.status)}>{d.status === "online" ? "En ligne" : d.status === "offline" ? "Hors ligne" : "Alerte"}</StatusBadge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {d.nominal_power_watt
                      ? <span className="flex items-center justify-center gap-1 text-xs text-warning"><Zap className="w-3 h-3" /> {d.nominal_power_watt}W</span>
                      : <span className="text-xs text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{d.last_seen_at ? formatTime(d.last_seen_at) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouveau capteur / actionneur</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Nom affiché</Label><Input placeholder="Température Salon 301" value={fName} onChange={e => setFName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Identifiant IoT unique</Label><Input placeholder="BAT-A-E3-APT301-SALON-TEMP" value={fId} onChange={e => setFId(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={fType} onValueChange={setFType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DEVICE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Select value={fCategory} onValueChange={setFCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sensor">Capteur</SelectItem><SelectItem value="actuator">Actionneur</SelectItem><SelectItem value="hybrid">Hybride</SelectItem></SelectContent></Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Protocole</Label>
                <Select value={fProtocol} onValueChange={setFProtocol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PROTOCOLS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5">
                <Label>Immeuble</Label>
                <Select value={fBuilding} onValueChange={setFBuilding}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Localisation</Label><Input placeholder="Imm. A — Étage 3 — APT-301 — Salon" value={fLocation} onChange={e => setFLocation(e.target.value)} /></div>
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <div><p className="text-sm font-medium">Profil énergétique</p><p className="text-xs text-muted-foreground">Si l'équipement consomme</p></div>
                <Switch checked={withEnergy} onCheckedChange={setWithEnergy} />
              </div>
              {withEnergy && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Puissance (W)</Label><Input type="number" placeholder="1200" value={fPower} onChange={e => setFPower(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Prix kWh (FCFA)</Label><Input type="number" placeholder="120" value={fKwh} onChange={e => setFKwh(e.target.value)} /></div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Annuler</Button>
            <Button onClick={handleSubmit}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
