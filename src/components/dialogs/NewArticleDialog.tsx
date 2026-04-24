import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { articlesApi, articleFamiliesApi, unitsApi, apiError } from "@/lib/api";

export function NewArticleDialog({ trigger, onSuccess }: { trigger?: React.ReactNode; onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [familles, setFamilles] = useState<any[]>([]);
  const [unites, setUnites] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [designation, setDesignation] = useState("");
  const [familleId, setFamilleId] = useState("");
  const [uniteId, setUniteId] = useState("");
  const [nature, setNature] = useState("STOCKABLE");
  const [prix, setPrix] = useState("");

  useEffect(() => {
    if (!open) return;
    Promise.all([articleFamiliesApi.list(), unitsApi.list()])
      .then(([f, u]) => { setFamilles(f); setUnites(u); })
      .catch(() => {});
  }, [open]);

  const reset = () => { setCode(""); setDesignation(""); setFamilleId(""); setUniteId(""); setPrix(""); setNature("STOCKABLE"); };

  const submit = async () => {
    if (!code || !designation) {
      toast.error("Champs obligatoires manquants"); return;
    }
    setSaving(true);
    try {
      await articlesApi.create({
        code,
        designation,
        famille_id: familleId || null,
        unite_id: uniteId || null,
        nature,
        prix_moyen: prix ? parseFloat(prix) : null,
      });
      toast.success("Article créé", { description: `${code} — ${designation}` });
      reset();
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error("Erreur lors de la création", { description: apiError(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Nouvel article</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel article</DialogTitle>
          <DialogDescription>Référencement catalogue — code unique requis.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex : CIM-32.5" className="font-mono" />
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
            <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Ex : Ciment CEM II 32.5 - sac 35kg" />
          </div>
          <div className="grid grid-cols-3 gap-3">
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
            <div className="space-y-1.5">
              <Label>Prix moyen (FCFA)</Label>
              <Input type="number" min="0" step="1" value={prix} onChange={(e) => setPrix(e.target.value)} className="text-right tabular-nums" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Créer l'article
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
