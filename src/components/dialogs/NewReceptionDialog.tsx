import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { depotsApi, purchaseOrdersApi, receiptsApi, apiError } from "@/lib/api";

interface ReceptionLine {
  purchase_order_line_id?: string;
  article_id?: string | null;
  designation_libre?: string | null;
  designation: string;
  quantite_commandee: number;
  deja_recu: number;
  quantite_recue: number;
}

const reste = (l: ReceptionLine) => Math.max(0, l.quantite_commandee - l.deja_recu);

export function NewReceptionDialog({ trigger, onSuccess }: { trigger?: React.ReactNode; onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [depots, setDepots] = useState<any[]>([]);
  const [commandes, setCommandes] = useState<any[]>([]);
  const [commandeId, setCommandeId] = useState("");
  const [depot, setDepot] = useState("");
  const [date, setDate] = useState("");
  const [conformite, setConformite] = useState("CONFORME");
  const [reserve, setReserve] = useState("");
  const [lignes, setLignes] = useState<ReceptionLine[]>([]);
  const [loadingLignes, setLoadingLignes] = useState(false);

  useEffect(() => {
    if (!open) return;
    // BC réceptionnables : envoyés, ou déjà partiellement reçus (reliquats).
    Promise.all([
      depotsApi.list(),
      purchaseOrdersApi.list({ statut: "ENVOYEE" }),
      purchaseOrdersApi.list({ statut: "PARTIELLEMENT_RECEPTIONNE" }),
    ])
      .then(([d, env, part]) => { setDepots(d); setCommandes([...part, ...env]); })
      .catch(() => {});
  }, [open]);

  // When a commande is selected, fetch its lines
  useEffect(() => {
    if (!commandeId) { setLignes([]); return; }
    setLoadingLignes(true);
    purchaseOrdersApi.get(commandeId)
      .then((po) => {
        // Pré-remplissage avec le reste à livrer de chaque ligne.
        const mapped: ReceptionLine[] = (po.lignes || []).map((l: any) => {
          const commandee = parseFloat(l.quantite);
          const dejaRecu = parseFloat(l.quantite_recue) || 0;
          return {
            purchase_order_line_id: l.id,
            article_id: l.article_id || null,
            designation_libre: l.designation_libre || null,
            designation: l.article_code
              ? `${l.article_code} — ${l.article_designation}`
              : l.article_designation || l.designation_libre || "Article sans nom",
            quantite_commandee: commandee,
            deja_recu: dejaRecu,
            quantite_recue: Math.max(0, commandee - dejaRecu),
          };
        });
        setLignes(mapped);
      })
      .catch(() => setLignes([]))
      .finally(() => setLoadingLignes(false));
  }, [commandeId]);

  const updateQte = (idx: number, val: string) => {
    setLignes((prev) => prev.map((l, i) => i === idx ? { ...l, quantite_recue: parseFloat(val) || 0 } : l));
  };

  const reset = () => {
    setCommandeId(""); setDepot(""); setDate(""); setConformite("CONFORME");
    setReserve(""); setLignes([]);
  };

  const submit = async () => {
    if (!depot || !date) { toast.error("Champs obligatoires manquants"); return; }
    const depassement = lignes.find((l) => l.quantite_recue > reste(l));
    if (depassement) {
      toast.error("Quantité reçue supérieure au reste à livrer", { description: depassement.designation });
      return;
    }
    const lignesValides = lignes.filter((l) => l.quantite_recue > 0);
    if (commandeId && lignesValides.length === 0) { toast.error("Aucune quantité reçue"); return; }
    setSaving(true);
    try {
      const br = await receiptsApi.create({
        purchase_order_id: commandeId || undefined,
        depot_id: depot,
        date_reception: date,
        conformite,
        reserve: reserve || undefined,
        lignes: lignesValides.length > 0 ? lignesValides.map((l) => ({
          article_id: l.article_id,
          designation_libre: l.designation_libre,
          quantite_recue: l.quantite_recue,
          purchase_order_line_id: l.purchase_order_line_id,
        })) : undefined,
      });
      toast.success(`Réception ${br.numero} enregistrée`, {
        description: [
          lignesValides.length > 0 ? `${lignesValides.length} article(s) ajouté(s) au stock.` : "Réserve enregistrée.",
          br.commande_statut ? `BC : ${br.commande_statut}.` : "",
        ].join(" "),
      });
      reset();
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement", { description: apiError(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Nouvelle réception</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enregistrer une réception</DialogTitle>
          <DialogDescription>Contrôle de conformité et affectation dépôt.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Bon de commande</Label>
              <Select value={commandeId} onValueChange={setCommandeId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner (optionnel)…" /></SelectTrigger>
                <SelectContent>
                  {commandes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.numero} — {c.supplier_nom}{c.statut === "PARTIELLEMENT_RECEPTIONNE" ? " (reliquat)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date réception *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Dépôt destination *</Label>
              <Select value={depot} onValueChange={setDepot}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>{depots.map((d) => <SelectItem key={d.id} value={d.id}>{d.code} — {d.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Conformité</Label>
              <Select value={conformite} onValueChange={setConformite}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONFORME">Conforme</SelectItem>
                  <SelectItem value="PARTIELLE">Partielle (reliquat)</SelectItem>
                  <SelectItem value="RESERVE">Avec réserve</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lines from the purchase order */}
          {loadingLignes && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement des lignes…
            </div>
          )}
          {lignes.length > 0 && (
            <div className="space-y-2">
              <Label>Articles réceptionnés</Label>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Désignation</th>
                      <th className="text-right px-3 py-2 font-medium w-24">Commandé</th>
                      <th className="text-right px-3 py-2 font-medium w-24">Déjà reçu</th>
                      <th className="text-right px-3 py-2 font-medium w-28">Reçu *</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.map((l, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">{l.designation}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{l.quantite_commandee}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{l.deja_recu || "—"}</td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            max={reste(l)}
                            disabled={reste(l) === 0}
                            step="any"
                            value={l.quantite_recue}
                            onChange={(e) => updateQte(idx, e.target.value)}
                            className="h-7 text-right w-full"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {conformite !== "CONFORME" && (
            <div className="space-y-1.5">
              <Label>Détail réserve / écart</Label>
              <Textarea value={reserve} onChange={(e) => setReserve(e.target.value)} rows={3}
                placeholder="Ex : 5 sacs manquants, 2 emballages endommagés…" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Enregistrer la réception
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
