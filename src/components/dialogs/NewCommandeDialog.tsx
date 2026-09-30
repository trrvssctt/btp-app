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
interface InitialLine { articleId: string; quantite: string; prixMoyen?: string; }

const formatFcfa = (n: number) => n > 0 ? `${n.toLocaleString("fr-SN")} FCFA` : "";

/* `order` fourni → mode édition d'un BC brouillon existant.
   `requestId` fourni → le BC créé est rattaché à cette demande approuvée. */
export function NewCommandeDialog({
  trigger,
  onSuccess,
  initialLines,
  requestId,
  order,
}: {
  trigger?: React.ReactNode;
  onSuccess?: (po: any) => void;
  initialLines?: InitialLine[];
  requestId?: string;
  order?: any;
}) {
  const isEdit = !!order;
  const buildLignes = (): Ligne[] =>
    isEdit && order.lignes?.length > 0
      ? order.lignes.map((l: any, i: number) => ({
          id: String(i + 1), articleId: l.article_id ?? "", quantite: String(Number(l.quantite)), prix: String(Number(l.prix_unitaire)),
        }))
      : initialLines && initialLines.length > 0
      ? initialLines.map((l, i) => ({ id: String(i + 1), articleId: l.articleId, quantite: l.quantite, prix: l.prixMoyen ?? "" }))
      : [{ id: "1", articleId: "", quantite: "", prix: "" }];

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [statut, setStatut] = useState("BROUILLON");
  const [lignes, setLignes] = useState<Ligne[]>(buildLignes());

  useEffect(() => {
    if (!open) return;
    Promise.all([suppliersApi.list(), articlesApi.list()])
      .then(([s, a]) => { setSuppliers(s); setArticles(a); })
      .catch(() => {});
    setLignes(buildLignes());
    if (isEdit) { setSupplierId(order.supplier_id); setStatut(order.statut); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = lignes.reduce((s, l) => s + (parseFloat(l.quantite) || 0) * (parseFloat(l.prix) || 0), 0);

  const reset = () => { setSupplierId(""); setStatut("BROUILLON"); setLignes(buildLignes()); };

  const submit = async () => {
    if (!supplierId || lignes.some((l) => !l.articleId || !l.quantite || !l.prix)) {
      toast.error("Champs obligatoires manquants"); return;
    }
    setSaving(true);
    try {
      const body = {
        supplier_id: supplierId,
        statut,
        lignes: lignes.map((l) => ({
          article_id: l.articleId,
          quantite: parseFloat(l.quantite),
          prix_unitaire: parseFloat(l.prix),
        })),
      };
      const po = isEdit
        ? await purchaseOrdersApi.update(order.id, body)
        : await purchaseOrdersApi.create({ ...body, ...(requestId ? { request_id: requestId } : {}) });
      const msg = statut === "BROUILLON" ? (isEdit ? "Brouillon mis à jour" : "Brouillon enregistré") :
                  statut === "ENVOYEE" ? `Bon de commande ${po.numero} envoyé` : "Bon de commande créé";
      toast.success(msg, {
        description: `Montant : ${formatFcfa(total)}`,
      });
      reset();
      setOpen(false);
      onSuccess?.(po);
    } catch (err) {
      toast.error(isEdit ? "Erreur lors de la modification" : "Erreur lors de la création", { description: apiError(err) });
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
          <DialogTitle>{isEdit ? `Modifier le bon de commande ${order.numero}` : "Nouveau bon de commande"}</DialogTitle>
          <DialogDescription>Engagement fournisseur — réceptions partielles autorisées.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-1.5">
              <Label>Statut *</Label>
              <Select value={statut} onValueChange={setStatut}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BROUILLON">Brouillon</SelectItem>
                  <SelectItem value="ENVOYEE">Envoyée</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {statut === "BROUILLON" ? "Enregistrer le brouillon" : "Émettre le BC"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
