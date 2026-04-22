import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { articlesApi, depotsApi, transfersApi, apiError } from "@/lib/api";

export function NewTransfertDialog({ trigger, onSuccess }: { trigger?: React.ReactNode; onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [depots, setDepots] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [emetteur, setEmetteur] = useState("");
  const [recepteur, setRecepteur] = useState("");
  const [articleId, setArticleId] = useState("");
  const [quantite, setQuantite] = useState("");
  const [motif, setMotif] = useState("");

  useEffect(() => {
    if (!open) return;
    Promise.all([depotsApi.list(), articlesApi.list()])
      .then(([d, a]) => { setDepots(d); setArticles(a); })
      .catch(() => {});
  }, [open]);

  const reset = () => { setEmetteur(""); setRecepteur(""); setArticleId(""); setQuantite(""); setMotif(""); };

  const submit = async () => {
    if (!emetteur || !recepteur || !articleId || !quantite) {
      toast.error("Champs obligatoires manquants"); return;
    }
    if (emetteur === recepteur) {
      toast.error("Le dépôt émetteur et récepteur doivent être différents"); return;
    }
    setSaving(true);
    try {
      await transfersApi.create({
        depot_from: emetteur,
        depot_to: recepteur,
        lines: [{ article_id: articleId, quantite: parseFloat(quantite) }],
      });
      toast.success("Transfert créé", { description: "En attente d'expédition magasinier." });
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
        {trigger ?? <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Nouveau transfert</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau transfert inter-dépôts</DialogTitle>
          <DialogDescription>Émetteur, récepteur et accusé de réception obligatoires.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div className="space-y-1.5">
              <Label>Dépôt émetteur *</Label>
              <Select value={emetteur} onValueChange={setEmetteur}>
                <SelectTrigger><SelectValue placeholder="Source…" /></SelectTrigger>
                <SelectContent>{depots.map((d) => <SelectItem key={d.id} value={d.id}>{d.code} — {d.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="hidden md:flex items-center justify-center w-9 h-9 rounded-full bg-accent-soft text-accent">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="space-y-1.5">
              <Label>Dépôt récepteur *</Label>
              <Select value={recepteur} onValueChange={setRecepteur}>
                <SelectTrigger><SelectValue placeholder="Destination…" /></SelectTrigger>
                <SelectContent>{depots.map((d) => <SelectItem key={d.id} value={d.id}>{d.code} — {d.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
            <div className="space-y-1.5">
              <Label>Article *</Label>
              <Select value={articleId} onValueChange={setArticleId}>
                <SelectTrigger><SelectValue placeholder="Article à transférer…" /></SelectTrigger>
                <SelectContent>{articles.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.designation}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantité *</Label>
              <Input type="number" min="0" value={quantite} onChange={(e) => setQuantite(e.target.value)} className="text-right tabular-nums" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Motif</Label>
            <Input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex : Approvisionnement chantier" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Créer le transfert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
