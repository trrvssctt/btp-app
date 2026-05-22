import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { articlesApi, articleFamiliesApi, unitsApi, apiError } from "@/lib/api";

interface ArticleRow {
  id: string;
  code: string;
  designation: string;
  famille_id?: string | null;
  unite_id?: string | null;
  nature: string;
  prix_moyen: number | string | null;
  seuil_min: number | string | null;
  is_used: boolean;
}

interface Props {
  article: ArticleRow;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function EditArticleDialog({ article, trigger, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [familles, setFamilles] = useState<any[]>([]);
  const [unites, setUnites] = useState<any[]>([]);

  const [code, setCode] = useState(article.code);
  const [designation, setDesignation] = useState(article.designation);
  const [familleId, setFamilleId] = useState(article.famille_id ?? "");
  const [uniteId, setUniteId] = useState(article.unite_id ?? "");
  const [nature, setNature] = useState(article.nature);
  const [prix, setPrix] = useState(article.prix_moyen != null ? String(article.prix_moyen) : "");
  const [seuilMin, setSeuilMin] = useState(article.seuil_min != null ? String(article.seuil_min) : "");

  useEffect(() => {
    if (!open) return;
    setCode(article.code);
    setDesignation(article.designation);
    setFamilleId(article.famille_id ?? "");
    setUniteId(article.unite_id ?? "");
    setNature(article.nature);
    setPrix(article.prix_moyen != null ? String(article.prix_moyen) : "");
    setSeuilMin(article.seuil_min != null ? String(article.seuil_min) : "");
    Promise.all([articleFamiliesApi.list(), unitsApi.list()])
      .then(([f, u]) => { setFamilles(f); setUnites(u); })
      .catch(() => {});
  }, [open, article]);

  const submit = async () => {
    if (!code || !designation) { toast.error("Code et désignation obligatoires"); return; }
    setSaving(true);
    try {
      await articlesApi.update(article.id, {
        code,
        designation,
        famille_id: familleId || null,
        unite_id: uniteId || null,
        nature,
        prix_moyen: prix ? parseFloat(prix) : null,
        seuil_min: seuilMin ? parseFloat(seuilMin) : null,
      });
      toast.success("Article modifié", { description: `${code} — ${designation}` });
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error("Modification impossible", { description: apiError(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="gap-1.5 h-7 px-2 text-xs" disabled={article.is_used}>
            <Pencil className="w-3 h-3" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4" /> Modifier l'article
          </DialogTitle>
          <DialogDescription>
            Modification de <span className="font-mono font-semibold">{article.code}</span>
          </DialogDescription>
        </DialogHeader>

        {article.is_used && (
          <div className="flex items-start gap-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2.5 text-sm text-orange-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Cet article est référencé dans des documents existants (demandes, bons de commande, mouvements de stock…). La modification est bloquée pour préserver la traçabilité.</span>
          </div>
        )}

        <fieldset disabled={article.is_used} className="space-y-4 disabled:opacity-60">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Famille</Label>
              <Select value={familleId} onValueChange={setFamilleId}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {familles.map((f) => <SelectItem key={f.id} value={f.id}>{f.libelle}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Désignation *</Label>
            <Input value={designation} onChange={(e) => setDesignation(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Unité</Label>
              <Select value={uniteId} onValueChange={setUniteId}>
                <SelectTrigger><SelectValue placeholder="…" /></SelectTrigger>
                <SelectContent>
                  {unites.map((u) => <SelectItem key={u.id} value={u.id}>{u.libelle}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nature</Label>
              <Select value={nature} onValueChange={setNature}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STOCKABLE">Stockable</SelectItem>
                  <SelectItem value="ACHAT_DIRECT">Achat direct</SelectItem>
                  <SelectItem value="DURABLE">Durable</SelectItem>
                  <SelectItem value="CONSOMMABLE">Consommable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prix moyen (FCFA)</Label>
              <Input type="number" min="0" step="1" value={prix} onChange={(e) => setPrix(e.target.value)} className="text-right tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label>Seuil minimum (alerte stock)</Label>
              <Input type="number" min="0" step="1" value={seuilMin} onChange={(e) => setSeuilMin(e.target.value)} className="text-right tabular-nums" placeholder="0" />
            </div>
          </div>
        </fieldset>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving || article.is_used}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
