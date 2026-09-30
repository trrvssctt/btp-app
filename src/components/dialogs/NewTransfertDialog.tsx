import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowRight, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { depotsApi, stockApi, transfersApi, apiError } from "@/lib/api";

interface Ligne { id: string; articleId: string; quantite: string; }

const newLigne = (): Ligne => ({ id: Date.now().toString() + Math.random(), articleId: "", quantite: "" });

export function NewTransfertDialog({ trigger, onSuccess }: { trigger?: React.ReactNode; onSuccess?: (t: any) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [depots, setDepots] = useState<any[]>([]);
  const [stockSource, setStockSource] = useState<any[]>([]);
  const [emetteur, setEmetteur] = useState("");
  const [recepteur, setRecepteur] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([newLigne()]);

  useEffect(() => {
    if (!open) return;
    depotsApi.list().then(setDepots).catch(() => {});
  }, [open]);

  // Articles proposés = stock disponible du dépôt émetteur.
  useEffect(() => {
    if (!emetteur) { setStockSource([]); return; }
    stockApi.list({ depot_id: emetteur })
      .then((s) => setStockSource(s.filter((x: any) => Number(x.qte_disponible) > 0)))
      .catch(() => setStockSource([]));
    setLignes([newLigne()]);
  }, [emetteur]);

  const dispo = (articleId: string) =>
    Number(stockSource.find((s) => s.article_id === articleId)?.qte_disponible ?? 0);

  // Quantité totale demandée par article (un article peut figurer sur plusieurs lignes).
  const demande = (articleId: string) =>
    lignes.filter((l) => l.articleId === articleId).reduce((s, l) => s + (parseFloat(l.quantite) || 0), 0);

  const reset = () => { setEmetteur(""); setRecepteur(""); setLignes([newLigne()]); };

  const submit = async () => {
    if (!emetteur || !recepteur || lignes.some((l) => !l.articleId || !(parseFloat(l.quantite) > 0))) {
      toast.error("Champs obligatoires manquants"); return;
    }
    if (emetteur === recepteur) {
      toast.error("Le dépôt émetteur et récepteur doivent être différents"); return;
    }
    const depasse = lignes.find((l) => demande(l.articleId) > dispo(l.articleId));
    if (depasse) {
      const a = stockSource.find((s) => s.article_id === depasse.articleId);
      toast.error("Stock insuffisant au dépôt émetteur", { description: `${a?.article_code} : ${dispo(depasse.articleId)} disponible(s)` });
      return;
    }
    setSaving(true);
    try {
      const t = await transfersApi.create({
        depot_from: emetteur,
        depot_to: recepteur,
        lines: lignes.map((l) => ({ article_id: l.articleId, quantite: parseFloat(l.quantite) })),
      });
      toast.success(`Transfert ${t.numero} expédié`, { description: "Stock en transit — à confirmer à la réception par le dépôt destinataire." });
      reset();
      setOpen(false);
      onSuccess?.(t);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouveau transfert inter-dépôts</DialogTitle>
          <DialogDescription>Le stock quitte le dépôt émetteur à l'expédition et devient disponible à l'accusé de réception.</DialogDescription>
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
                <SelectContent>
                  {depots.filter((d) => d.id !== emetteur).map((d) => <SelectItem key={d.id} value={d.id}>{d.code} — {d.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between bg-muted/40 px-3 py-2 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Articles à transférer</p>
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1" disabled={!emetteur}
                onClick={() => setLignes([...lignes, newLigne()])}>
                <Plus className="w-3.5 h-3.5" /> Ligne
              </Button>
            </div>
            {!emetteur ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">Choisissez d'abord le dépôt émetteur.</p>
            ) : stockSource.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">Aucun article en stock dans ce dépôt.</p>
            ) : (
              <div className="divide-y divide-border">
                {lignes.map((l) => {
                  const over = l.articleId && demande(l.articleId) > dispo(l.articleId);
                  return (
                    <div key={l.id} className="grid grid-cols-12 gap-2 p-2.5 items-center">
                      <div className="col-span-7">
                        <Select value={l.articleId} onValueChange={(v) => setLignes(lignes.map((x) => x.id === l.id ? { ...x, articleId: v } : x))}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Article…" /></SelectTrigger>
                          <SelectContent>
                            {stockSource.map((s) => (
                              <SelectItem key={s.article_id} value={s.article_id}>
                                {s.article_code} — {s.article_designation} ({Number(s.qte_disponible).toLocaleString("fr-SN")} dispo)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-4">
                        <Input type="number" min="0" placeholder="Qté" value={l.quantite}
                          onChange={(e) => setLignes(lignes.map((x) => x.id === l.id ? { ...x, quantite: e.target.value } : x))}
                          className={`h-9 text-right tabular-nums ${over ? "border-destructive text-destructive" : ""}`} />
                      </div>
                      <div className="col-span-1 text-right">
                        <Button type="button" variant="ghost" size="icon" disabled={lignes.length === 1}
                          onClick={() => setLignes(lignes.filter((x) => x.id !== l.id))}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Expédier le transfert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
