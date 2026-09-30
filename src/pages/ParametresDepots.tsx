import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Loader2, Pencil, Trash2, Warehouse } from "lucide-react";
import { depotsApi, apiError } from "@/lib/api";
import { typeDepotLabel } from "@/data/labels";
import { toast } from "sonner";

interface Depot { id: string; code: string; nom: string; type_depot: string; localisation?: string | null; }

const TYPES = [
  { value: "MAGASIN_CENTRAL", label: "Magasin central" },
  { value: "DEPOT_SECONDAIRE", label: "Dépôt secondaire" },
  { value: "DEPOT_CHANTIER", label: "Dépôt chantier" },
  { value: "STOCK_CHANTIER", label: "Stock chantier" },
  { value: "TRANSIT", label: "Transit" },
];

export default function ParametresDepotsPage() {
  const [depots, setDepots] = useState<Depot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Depot | null>(null);

  const load = async () => {
    setLoading(true);
    try { setDepots(await depotsApi.list()); }
    catch (err) { toast.error("Erreur de chargement", { description: apiError(err) }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (d: Depot) => {
    try { await depotsApi.remove(d.id); toast.success("Dépôt supprimé"); load(); }
    catch (err) { toast.error("Suppression impossible", { description: apiError(err) }); }
  };

  return (
    <>
      <PageHeader
        breadcrumb="Paramètres"
        title="Dépôts et entrepôts"
        description="Configuration des dépôts, magasins et sites de stockage"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/parametres"><ArrowLeft className="w-4 h-4 mr-2" />Retour</Link>
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />Nouveau dépôt
            </Button>
          </div>
        }
      />

      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
          </div>
        ) : depots.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Warehouse className="w-8 h-8 opacity-30" /><p>Aucun dépôt</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Code</th>
                <th className="text-left font-medium px-4 py-3">Nom</th>
                <th className="text-left font-medium px-4 py-3">Type</th>
                <th className="text-left font-medium px-4 py-3">Localisation</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {depots.map((d) => (
                <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{d.code}</td>
                  <td className="px-4 py-3 font-medium">{d.nom}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone="info">
                      {typeDepotLabel[d.type_depot as keyof typeof typeDepotLabel] ?? d.type_depot}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{d.localisation ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(d); setDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer le dépôt {d.code} ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Action irréversible. Attention : les stocks et mouvements liés peuvent être impactés.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(d)} className="bg-destructive hover:bg-destructive/90">
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DepotDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={() => { setDialogOpen(false); load(); }} />
    </>
  );
}

function DepotDialog({ open, onOpenChange, editing, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; editing: Depot | null; onSaved: () => void;
}) {
  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const [type, setType] = useState("MAGASIN_CENTRAL");
  const [localisation, setLocalisation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCode(editing?.code ?? "");
      setNom(editing?.nom ?? "");
      setType(editing?.type_depot ?? "MAGASIN_CENTRAL");
      setLocalisation(editing?.localisation ?? "");
    }
  }, [open, editing]);

  const submit = async () => {
    if (!code.trim() || !nom.trim()) { toast.error("Code et nom obligatoires"); return; }
    setSaving(true);
    try {
      const body = { code, nom, type_depot: type, localisation: localisation || null };
      if (editing) { await depotsApi.update(editing.id, body); toast.success("Dépôt modifié"); }
      else { await depotsApi.create(body); toast.success("Dépôt créé"); }
      onSaved();
    } catch (err) {
      toast.error("Enregistrement impossible", { description: apiError(err) });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier le dépôt" : "Nouveau dépôt"}</DialogTitle>
          <DialogDescription>Emplacement de stockage des articles.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex: MAG-DAKAR" />
            </div>
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nom *</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Magasin Central Dakar" />
          </div>
          <div className="space-y-1.5">
            <Label>Localisation</Label>
            <Input value={localisation} onChange={(e) => setLocalisation(e.target.value)} placeholder="Ex: Parcelles Assainies, Dakar" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editing ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
