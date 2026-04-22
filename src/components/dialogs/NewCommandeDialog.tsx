import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { articlesApi, suppliersApi, purchaseOrdersApi, apiError } from "@/lib/api";

interface Ligne { id: string; articleId: string; quantite: string; prix: string; }

const formatFcfa = (n: number) => n > 0 ? `${n.toLocaleString("fr-SN")} FCFA` : "";

export function NewCommandeDialog({ trigger, onSuccess }: { trigger?: React.ReactNode; onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([{ id: "1", articleId: "", quantite: "", prix: "" }]);

  useEffect(() => {
    if (!open) return;
    Promise.all([suppliersApi.list(), articlesApi.list()])
      .then(([s, a]) => { setSuppliers(s); setArticles(a); })
      .catch(() => {});
  }, [open]);

  const total = lignes.reduce((s, l) => s + (parseFloat(l.quantite) || 0) * (parseFloat(l.prix) || 0), 0);

  const reset = () => { setSupplierId(""); setLignes([{ id: "1", articleId: "", quantite: "", prix: "" }]); };

  const submit = async (statut: string) => {
    if (!supplierId || lignes.some((l) => !l.articleId || !l.quantite || !l.prix)) {
      toast.error("Champs obligatoires manquants"); return;
    }
    setSaving(true);
    try {
      await purchaseOrdersApi.create({
        supplier_id: supplierId,
        statut,
        lignes: lignes.map((l) => ({
          article_id: l.articleId,
          quantite: parseFloat(l.quantite),
          prix_unitaire: parseFloat(l.prix),
        })),
      });
      toast.success(statut === "BROUILLON" ? "Brouillon enregistré" : "Bon de commande créé", {
        description: `Montant : ${formatFcfa(total)}`,
      });
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
        {trigger ?? <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Nouvelle commande</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nouveau bon de commande</DialogTitle>
          <DialogDescription>Engagement fournisseur — réceptions partielles autorisées.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Fournisseur *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.raison_sociale}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between bg-muted/40 px-3 py-2 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lignes commande</p>
              <Button type="button" variant="ghost" size="sm"
                onClick={() => setLignes([...lignes, { id: Date.now().toString(), articleId: "", quantite: "", prix: "" }])}
                className="h-7 gap-1">
                <Plus className="w-3.5 h-3.5" /> Ligne
              </Button>
            </div>
            <div className="divide-y divide-border">
              {lignes.map((l) => {
                const sub = (parseFloat(l.quantite) || 0) * (parseFloat(l.prix) || 0);
                return (
                  <div key={l.id} className="grid grid-cols-12 gap-2 p-2.5 items-center">
                    <div className="col-span-5">
                      <Select value={l.articleId} onValueChange={(v) => {
                        const a = articles.find((x) => x.id === v);
                        setLignes(lignes.map((x) => x.id === l.id ? { ...x, articleId: v, prix: x.prix || (a?.prix_moyen?.toString() ?? "") } : x));
                      }}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Article…" /></SelectTrigger>
                        <SelectContent>{articles.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.designation}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="0" placeholder="Qté" value={l.quantite}
                        onChange={(e) => setLignes(lignes.map((x) => x.id === l.id ? { ...x, quantite: e.target.value } : x))}
                        className="h-9 text-right tabular-nums" />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="0" step="0.01" placeholder="PU" value={l.prix}
                        onChange={(e) => setLignes(lignes.map((x) => x.id === l.id ? { ...x, prix: e.target.value } : x))}
                        className="h-9 text-right tabular-nums" />
                    </div>
                    <div className="col-span-2 text-right text-sm tabular-nums text-muted-foreground">
                      {sub > 0 && formatFcfa(sub)}
                    </div>
                    <div className="col-span-1 text-right">
                      <Button type="button" variant="ghost" size="icon"
                        onClick={() => setLignes(lignes.filter((x) => x.id !== l.id))}
                        disabled={lignes.length === 1}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 bg-muted/40 border-t border-border">
              <span className="text-sm font-medium">Total HT</span>
              <span className="text-base font-bold tabular-nums">{formatFcfa(total)}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button variant="outline" onClick={() => submit("BROUILLON")} disabled={saving}>Brouillon</Button>
          <Button onClick={() => submit("ENVOYEE")} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Émettre le BC
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
