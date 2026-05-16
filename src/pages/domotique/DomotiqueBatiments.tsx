import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Building2, ChevronDown, ChevronRight, Plus, Home, Layers, DoorOpen, MapPin, Loader2 } from "lucide-react";
import { domBuildingApi } from "@/lib/api";
import { toast } from "sonner";

type ModalType = "building" | "floor" | "apartment" | "room" | null;

const modalLabel: Record<NonNullable<ModalType>, string> = {
  building: "Nouvel immeuble", floor: "Nouvel étage",
  apartment: "Nouvel appartement", room: "Nouvelle pièce",
};

export default function DomotiqueBatiments() {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [trees, setTrees]         = useState<Record<string, any>>({});
  const [expanded, setExpanded]   = useState<Record<string, boolean>>({});
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [modal, setModal]         = useState<ModalType>(null);
  // targetId = id of the parent (building_id for floor, floor_id for apt, apt_id for room)
  // targetBuildingId = always the building whose tree needs a refresh
  const [targetId, setTargetId]             = useState<string | null>(null);
  const [targetBuildingId, setTargetBuildingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formAddr, setFormAddr] = useState("");

  const refreshBuildings = () =>
    domBuildingApi.list().then(setBuildings).catch(() => {});

  const refreshTree = useCallback((buildingId: string) =>
    domBuildingApi.getTree(buildingId).then(tree => setTrees(p => ({ ...p, [buildingId]: tree }))).catch(() => {}),
  []);

  useEffect(() => {
    domBuildingApi.list().then(setBuildings).finally(() => setLoading(false));
  }, []);

  async function toggleBuilding(id: string) {
    const open = !expanded[id];
    setExpanded(p => ({ ...p, [id]: open }));
    if (open && !trees[id]) await refreshTree(id);
  }

  function toggleNode(id: string) {
    setExpanded(p => ({ ...p, [id]: !p[id] }));
  }

  function openModal(type: ModalType, targetId: string, buildingId: string) {
    setFormName(""); setFormAddr("");
    setModal(type); setTargetId(targetId); setTargetBuildingId(buildingId);
  }

  async function handleSubmit() {
    if (!formName.trim()) { toast.error("Nom requis"); return; }
    setSaving(true);
    try {
      if (modal === "building") {
        const b = await domBuildingApi.create({ name: formName, address: formAddr });
        await refreshBuildings();
        toast.success(`Immeuble "${b.name}" ajouté`);
      } else if (modal === "floor" && targetId) {
        await domBuildingApi.createFloor({ building_id: targetId, name: formName, level_num: 0 });
        await Promise.all([refreshBuildings(), refreshTree(targetBuildingId!)]);
        toast.success("Étage ajouté");
      } else if (modal === "apartment" && targetId) {
        await domBuildingApi.createApartment({ floor_id: targetId, number: formName });
        await refreshTree(targetBuildingId!);
        toast.success("Appartement ajouté");
      } else if (modal === "room" && targetId) {
        await domBuildingApi.createRoom({ apartment_id: targetId, name: formName });
        await refreshTree(targetBuildingId!);
        toast.success("Pièce ajoutée");
      }
      setModal(null);
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
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
      <PageHeader
        breadcrumb="Domotique"
        title="Bâtiments"
        description="Configurez la hiérarchie des immeubles, étages, appartements et pièces."
      />

      <div className="flex justify-end mb-4">
        <Button size="sm" className="gap-1.5" onClick={() => { setFormName(""); setFormAddr(""); setModal("building"); }}>
          <Plus className="w-4 h-4" /> Nouvel immeuble
        </Button>
      </div>

      <div className="space-y-4">
        {buildings.map(b => {
          const tree = trees[b.id];
          const isOpen = expanded[b.id];

          return (
            <div key={b.id} className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
              {/* Immeuble header */}
              <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-base" onClick={() => toggleBuilding(b.id)}>
                <div className="w-8 h-8 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{b.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {b.address || "—"}
                  </p>
                </div>
                <StatusBadge tone={b.status === "active" ? "success" : "muted"}>
                  {b.status === "active" ? "Actif" : "Inactif"}
                </StatusBadge>
                <span className="text-xs text-muted-foreground">{b.floor_count ?? 0} étage(s)</span>
                <Button
                  size="sm" variant="outline" className="gap-1 h-7 text-xs"
                  onClick={e => { e.stopPropagation(); openModal("floor", b.id, b.id); }}
                >
                  <Plus className="w-3 h-3" /> Étage
                </Button>
                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>

              {/* Étages */}
              {isOpen && (
                <div className="border-t border-border">
                  {!tree ? (
                    <div className="flex items-center gap-2 px-8 py-4 text-muted-foreground text-xs">
                      <Loader2 className="w-3 h-3 animate-spin" /> Chargement de la structure…
                    </div>
                  ) : !tree.floors?.length ? (
                    <p className="text-xs text-muted-foreground px-8 py-4">Aucun étage configuré.</p>
                  ) : tree.floors.map((f: any) => (
                    <div key={f.id} className="border-b border-border last:border-0">
                      <div
                        className="flex items-center gap-3 px-8 py-3 cursor-pointer hover:bg-muted/20 transition-base"
                        onClick={() => toggleNode(f.id)}
                      >
                        <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm font-medium">{f.name}</span>
                        {f.zones?.length > 0 && <span className="text-xs text-muted-foreground">{f.zones.length} zone(s)</span>}
                        <span className="text-xs text-muted-foreground">{f.apartments?.length ?? 0} apt.</span>
                        <Button
                          size="sm" variant="outline" className="gap-1 h-7 text-xs"
                          onClick={e => { e.stopPropagation(); openModal("apartment", f.id, b.id); }}
                        >
                          <Plus className="w-3 h-3" /> Appartement
                        </Button>
                        {expanded[f.id] ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>

                      {expanded[f.id] && (
                        <>
                          {/* Zones communes */}
                          {f.zones?.length > 0 && (
                            <div className="px-14 pb-2">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5">Espaces communs</p>
                              <div className="flex flex-wrap gap-2">
                                {f.zones.map((z: any) => (
                                  <span key={z.id} className="text-xs bg-muted rounded-md px-2 py-1 text-muted-foreground">{z.name}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Appartements */}
                          {f.apartments?.map((a: any) => (
                            <div key={a.id} className="mx-12 mb-2 rounded-lg border border-border bg-muted/20">
                              <div
                                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-base"
                                onClick={() => toggleNode(a.id)}
                              >
                                <Home className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="flex-1 text-sm font-medium">{a.number}</span>
                                <span className="text-xs text-muted-foreground">{a.rooms?.length ?? 0} pièce(s)</span>
                                <Button
                                  size="sm" variant="ghost" className="gap-1 h-6 text-xs"
                                  onClick={e => { e.stopPropagation(); openModal("room", a.id, b.id); }}
                                >
                                  <Plus className="w-3 h-3" /> Pièce
                                </Button>
                                {expanded[a.id] ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                              </div>

                              {/* Pièces */}
                              {expanded[a.id] && (
                                <div className="px-4 pb-3 flex flex-wrap gap-2">
                                  {!a.rooms?.length ? (
                                    <p className="text-xs text-muted-foreground">Aucune pièce</p>
                                  ) : a.rooms.map((r: any) => (
                                    <span key={r.id} className="flex items-center gap-1 text-xs bg-background border border-border rounded-md px-2 py-1">
                                      <DoorOpen className="w-3 h-3 text-muted-foreground" /> {r.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <Dialog open={!!modal} onOpenChange={open => !open && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modal ? modalLabel[modal] : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                {modal === "apartment" ? "Numéro" : "Nom"}
              </Label>
              <Input
                placeholder={
                  modal === "building" ? "Ex: Immeuble C — Résidence…" :
                  modal === "floor"    ? "Ex: Étage 3" :
                  modal === "apartment"? "Ex: APT-301" : "Ex: Cuisine"
                }
                value={formName}
                onChange={e => setFormName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
            </div>
            {modal === "building" && (
              <div className="space-y-1.5">
                <Label>Adresse</Label>
                <Input
                  placeholder="Ex: 23 Rue Ouakam, Dakar"
                  value={formAddr}
                  onChange={e => setFormAddr(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
