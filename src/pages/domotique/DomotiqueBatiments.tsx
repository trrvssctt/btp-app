import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2, ChevronDown, ChevronRight, Plus, Home, Layers, DoorOpen,
  MapPin, Loader2, Pencil, Trash2, LayoutGrid,
} from "lucide-react";
import { domBuildingApi } from "@/lib/api";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────
type EntityKind = "building" | "floor" | "zone" | "apartment" | "room";
type ModalMode  = "create" | "edit";

interface ModalState {
  open: boolean;
  mode: ModalMode;
  kind: EntityKind;
  // create: parentId = parent entity id; buildingId = building to refresh
  // edit:   targetId = entity being edited; buildingId = building to refresh
  targetId:   string;
  buildingId: string;
  // pre-filled for edit
  initName: string;
  initAddr: string;
}

interface DeleteState {
  open: boolean;
  kind: EntityKind;
  id: string;
  label: string;
  buildingId: string;
}

const kindLabel: Record<EntityKind, { create: string; edit: string; field: string }> = {
  building:  { create: "Nouvel immeuble",    edit: "Modifier l'immeuble",    field: "Nom" },
  floor:     { create: "Nouvel étage",       edit: "Modifier l'étage",       field: "Nom" },
  zone:      { create: "Nouvel espace",      edit: "Modifier l'espace",      field: "Nom" },
  apartment: { create: "Nouvel appartement", edit: "Modifier l'appartement", field: "Numéro" },
  room:      { create: "Nouvelle pièce",     edit: "Modifier la pièce",      field: "Nom" },
};

const placeholder: Record<EntityKind, string> = {
  building:  "Ex: Immeuble C — Résidence…",
  floor:     "Ex: Étage 3",
  zone:      "Ex: Couloir commun",
  apartment: "Ex: APT-301",
  room:      "Ex: Cuisine",
};

// ── Component ──────────────────────────────────────────────────────────────
export default function DomotiqueBatiments() {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [trees, setTrees]         = useState<Record<string, any>>({});
  const [expanded, setExpanded]   = useState<Record<string, boolean>>({});
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  const defaultModal: ModalState = {
    open: false, mode: "create", kind: "building",
    targetId: "", buildingId: "", initName: "", initAddr: "",
  };
  const [modal, setModal]   = useState<ModalState>(defaultModal);
  const [formName, setFormName] = useState("");
  const [formAddr, setFormAddr] = useState("");

  const defaultDel: DeleteState = { open: false, kind: "building", id: "", label: "", buildingId: "" };
  const [delState, setDelState] = useState<DeleteState>(defaultDel);
  const [deleting, setDeleting] = useState(false);

  // ── Data helpers ──────────────────────────────────────────────────────
  const refreshBuildings = useCallback(() =>
    domBuildingApi.list().then(setBuildings).catch(() => {}), []);

  const refreshTree = useCallback((buildingId: string) =>
    domBuildingApi.getTree(buildingId)
      .then(tree => setTrees(p => ({ ...p, [buildingId]: tree })))
      .catch(() => {}), []);

  useEffect(() => {
    domBuildingApi.list().then(setBuildings).finally(() => setLoading(false));
  }, []);

  // ── Expand helpers ────────────────────────────────────────────────────
  async function toggleBuilding(id: string) {
    const open = !expanded[id];
    setExpanded(p => ({ ...p, [id]: open }));
    if (open && !trees[id]) await refreshTree(id);
  }
  function toggleNode(id: string) {
    setExpanded(p => ({ ...p, [id]: !p[id] }));
  }

  // ── Modal helpers ─────────────────────────────────────────────────────
  function openCreate(kind: EntityKind, targetId: string, buildingId: string) {
    setFormName(""); setFormAddr("");
    setModal({ open: true, mode: "create", kind, targetId, buildingId, initName: "", initAddr: "" });
  }
  function openEdit(kind: EntityKind, id: string, buildingId: string, name: string, addr = "") {
    setFormName(name); setFormAddr(addr);
    setModal({ open: true, mode: "edit", kind, targetId: id, buildingId, initName: name, initAddr: addr });
  }
  function openDelete(kind: EntityKind, id: string, label: string, buildingId: string) {
    setDelState({ open: true, kind, id, label, buildingId });
  }

  // ── Submit ────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!formName.trim()) { toast.error("Nom requis"); return; }
    setSaving(true);
    const { mode, kind, targetId, buildingId } = modal;
    try {
      if (mode === "create") {
        if (kind === "building") {
          const b = await domBuildingApi.create({ name: formName, address: formAddr });
          await refreshBuildings();
          toast.success(`Immeuble "${b.name}" ajouté`);
        } else if (kind === "floor") {
          await domBuildingApi.createFloor({ building_id: targetId, name: formName, level_num: 0 });
          await Promise.all([refreshBuildings(), refreshTree(buildingId)]);
          toast.success("Étage ajouté");
        } else if (kind === "zone") {
          await domBuildingApi.createZone({ floor_id: targetId, name: formName });
          await refreshTree(buildingId);
          toast.success("Espace commun ajouté");
        } else if (kind === "apartment") {
          await domBuildingApi.createApartment({ floor_id: targetId, number: formName });
          await refreshTree(buildingId);
          toast.success("Appartement ajouté");
        } else if (kind === "room") {
          await domBuildingApi.createRoom({ apartment_id: targetId, name: formName });
          await refreshTree(buildingId);
          toast.success("Pièce ajoutée");
        }
      } else {
        // edit
        if (kind === "building") {
          await domBuildingApi.update(targetId, { name: formName, address: formAddr });
          await refreshBuildings();
          toast.success("Immeuble modifié");
        } else if (kind === "floor") {
          await domBuildingApi.updateFloor(targetId, { name: formName });
          await refreshTree(buildingId);
          toast.success("Étage modifié");
        } else if (kind === "zone") {
          await domBuildingApi.updateZone(targetId, { name: formName });
          await refreshTree(buildingId);
          toast.success("Espace modifié");
        } else if (kind === "apartment") {
          await domBuildingApi.updateApartment(targetId, { number: formName });
          await refreshTree(buildingId);
          toast.success("Appartement modifié");
        } else if (kind === "room") {
          await domBuildingApi.updateRoom(targetId, { name: formName });
          await refreshTree(buildingId);
          toast.success("Pièce modifiée");
        }
      }
      setModal(defaultModal);
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────
  async function handleDelete() {
    const { kind, id, buildingId } = delState;
    setDeleting(true);
    try {
      if (kind === "building")  { await domBuildingApi.remove(id);          await refreshBuildings(); }
      else if (kind === "floor")     { await domBuildingApi.deleteFloor(id);     await Promise.all([refreshBuildings(), refreshTree(buildingId)]); }
      else if (kind === "zone")      { await domBuildingApi.deleteZone(id);      await refreshTree(buildingId); }
      else if (kind === "apartment") { await domBuildingApi.deleteApartment(id); await refreshTree(buildingId); }
      else if (kind === "room")      { await domBuildingApi.deleteRoom(id);      await refreshTree(buildingId); }
      toast.success("Supprimé avec succès");
      setDelState(defaultDel);
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
      <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
    </div>
  );

  return (
    <>
      <PageHeader
        breadcrumb="Domotique"
        title="Bâtiments"
        description="Configurez la hiérarchie des immeubles, étages, appartements et pièces."
      />

      <div className="flex justify-end mb-4">
        <Button size="sm" className="gap-1.5" onClick={() => openCreate("building", "", "")}>
          <Plus className="w-4 h-4" /> Nouvel immeuble
        </Button>
      </div>

      <div className="space-y-4">
        {buildings.map(b => {
          const tree   = trees[b.id];
          const isOpen = expanded[b.id];

          return (
            <div key={b.id} className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
              {/* ── Immeuble ── */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-base"
                onClick={() => toggleBuilding(b.id)}
              >
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
                {/* Actions immeuble */}
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs"
                  onClick={e => { e.stopPropagation(); openCreate("floor", b.id, b.id); }}>
                  <Plus className="w-3 h-3" /> Étage
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={e => { e.stopPropagation(); openEdit("building", b.id, b.id, b.name, b.address || ""); }}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={e => { e.stopPropagation(); openDelete("building", b.id, b.name, b.id); }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>

              {/* ── Étages ── */}
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
                        <span className="text-xs text-muted-foreground">{f.zones?.length ?? 0} espace(s)</span>
                        <span className="text-xs text-muted-foreground">{f.apartments?.length ?? 0} apt.</span>
                        <Button size="sm" variant="outline" className="gap-1 h-7 text-xs"
                          onClick={e => { e.stopPropagation(); openCreate("zone", f.id, b.id); }}>
                          <Plus className="w-3 h-3" /> Espace
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 h-7 text-xs"
                          onClick={e => { e.stopPropagation(); openCreate("apartment", f.id, b.id); }}>
                          <Plus className="w-3 h-3" /> Appartement
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={e => { e.stopPropagation(); openEdit("floor", f.id, b.id, f.name); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={e => { e.stopPropagation(); openDelete("floor", f.id, f.name, b.id); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        {expanded[f.id] ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>

                      {expanded[f.id] && (
                        <>
                          {/* ── Espaces communs ── */}
                          <div className="px-14 pb-2 pt-1">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1">
                                <LayoutGrid className="w-3 h-3" /> Espaces communs
                              </p>
                              <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs text-muted-foreground"
                                onClick={() => openCreate("zone", f.id, b.id)}>
                                <Plus className="w-3 h-3" /> Ajouter
                              </Button>
                            </div>
                            {!f.zones?.length ? (
                              <p className="text-xs text-muted-foreground/50 italic">Aucun espace commun</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {f.zones.map((z: any) => (
                                  <span key={z.id} className="group flex items-center gap-1.5 text-xs bg-muted rounded-md pl-2 pr-1 py-1 text-muted-foreground">
                                    {z.name}
                                    <button className="opacity-0 group-hover:opacity-100 hover:text-foreground transition-opacity"
                                      onClick={() => openEdit("zone", z.id, b.id, z.name)}>
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                                      onClick={() => openDelete("zone", z.id, z.name, b.id)}>
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* ── Appartements ── */}
                          {f.apartments?.map((a: any) => (
                            <div key={a.id} className="mx-12 mb-2 rounded-lg border border-border bg-muted/20">
                              <div
                                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-base"
                                onClick={() => toggleNode(a.id)}
                              >
                                <Home className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="flex-1 text-sm font-medium">{a.number}</span>
                                <span className="text-xs text-muted-foreground">{a.rooms?.length ?? 0} pièce(s)</span>
                                <Button size="sm" variant="ghost" className="gap-1 h-6 text-xs"
                                  onClick={e => { e.stopPropagation(); openCreate("room", a.id, b.id); }}>
                                  <Plus className="w-3 h-3" /> Pièce
                                </Button>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={e => { e.stopPropagation(); openEdit("apartment", a.id, b.id, a.number); }}>
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={e => { e.stopPropagation(); openDelete("apartment", a.id, a.number, b.id); }}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                                {expanded[a.id] ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                              </div>

                              {/* ── Pièces ── */}
                              {expanded[a.id] && (
                                <div className="px-4 pb-3">
                                  {!a.rooms?.length ? (
                                    <p className="text-xs text-muted-foreground">Aucune pièce</p>
                                  ) : (
                                    <div className="flex flex-wrap gap-2">
                                      {a.rooms.map((r: any) => (
                                        <span key={r.id} className="group flex items-center gap-1.5 text-xs bg-background border border-border rounded-md pl-2 pr-1 py-1">
                                          <DoorOpen className="w-3 h-3 text-muted-foreground" />
                                          {r.name}
                                          <button className="opacity-0 group-hover:opacity-100 hover:text-foreground transition-opacity ml-0.5"
                                            onClick={() => openEdit("room", r.id, b.id, r.name)}>
                                            <Pencil className="w-3 h-3" />
                                          </button>
                                          <button className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                                            onClick={() => openDelete("room", r.id, r.name, b.id)}>
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  )}
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

      {/* ── Modal création / édition ── */}
      <Dialog open={modal.open} onOpenChange={open => !open && setModal(defaultModal)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modal.mode === "create"
                ? kindLabel[modal.kind].create
                : kindLabel[modal.kind].edit}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{kindLabel[modal.kind].field}</Label>
              <Input
                placeholder={placeholder[modal.kind]}
                value={formName}
                onChange={e => setFormName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                autoFocus
              />
            </div>
            {modal.kind === "building" && (
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
            <Button variant="outline" onClick={() => setModal(defaultModal)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {modal.mode === "create" ? "Ajouter" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmation suppression ── */}
      <AlertDialog open={delState.open} onOpenChange={open => !open && setDelState(defaultDel)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Supprimer <strong>«&nbsp;{delState.label}&nbsp;»</strong> ?
              {(delState.kind === "building" || delState.kind === "floor" || delState.kind === "apartment") && (
                <span className="block mt-1 text-destructive font-medium">
                  Tous les éléments imbriqués seront également supprimés.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
