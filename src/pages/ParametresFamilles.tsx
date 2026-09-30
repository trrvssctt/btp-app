import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Loader2, Pencil, Trash2, Boxes } from "lucide-react";
import { articleFamiliesApi, apiError } from "@/lib/api";
import { toast } from "sonner";

interface Family { id: string; code: string; libelle: string; }

export default function ParametresFamillesPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Family | null>(null);

  const load = async () => {
    setLoading(true);
    try { setFamilies(await articleFamiliesApi.list()); }
    catch (err) { toast.error("Erreur de chargement", { description: apiError(err) }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (f: Family) => {
    try { await articleFamiliesApi.remove(f.id); toast.success("Famille supprimée"); load(); }
    catch (err) { toast.error("Suppression impossible", { description: apiError(err) }); }
  };

  return (
    <>
      <PageHeader
        breadcrumb="Paramètres"
        title="Familles d'articles"
        description="Catégorisation des articles (maçonnerie, électricité, plomberie...)"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/parametres"><ArrowLeft className="w-4 h-4 mr-2" />Retour</Link>
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />Nouvelle famille
            </Button>
          </div>
        }
      />

      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
          </div>
        ) : families.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Boxes className="w-8 h-8 opacity-30" /><p>Aucune famille</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Code</th>
                <th className="text-left font-medium px-4 py-3">Libellé</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {families.map((f) => (
                <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{f.code}</td>
                  <td className="px-4 py-3 font-medium">{f.libelle}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(f); setDialogOpen(true); }}>
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
                            <AlertDialogTitle>Supprimer la famille {f.code} ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Action irréversible. Les articles rattachés perdront cette catégorie.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(f)} className="bg-destructive hover:bg-destructive/90">
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

      <FamilyDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={() => { setDialogOpen(false); load(); }} />
    </>
  );
}

function FamilyDialog({ open, onOpenChange, editing, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; editing: Family | null; onSaved: () => void;
}) {
  const [code, setCode] = useState("");
  const [libelle, setLibelle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setCode(editing?.code ?? ""); setLibelle(editing?.libelle ?? ""); }
  }, [open, editing]);

  const submit = async () => {
    if (!code.trim() || !libelle.trim()) { toast.error("Code et libellé obligatoires"); return; }
    setSaving(true);
    try {
      if (editing) { await articleFamiliesApi.update(editing.id, { code, libelle }); toast.success("Famille modifiée"); }
      else { await articleFamiliesApi.create({ code, libelle }); toast.success("Famille créée"); }
      onSaved();
    } catch (err) {
      toast.error("Enregistrement impossible", { description: apiError(err) });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier la famille" : "Nouvelle famille"}</DialogTitle>
          <DialogDescription>Catégorie de regroupement des articles.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Code *</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex: MACONNERIE" />
          </div>
          <div className="space-y-1.5">
            <Label>Libellé *</Label>
            <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Ex: Maçonnerie & gros œuvre" />
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
