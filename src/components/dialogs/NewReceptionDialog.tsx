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

  useEffect(() => {
    if (!open) return;
    Promise.all([
      depotsApi.list(),
      purchaseOrdersApi.list({ statut: "ENVOYEE" }),
    ])
      .then(([d, c]) => { setDepots(d); setCommandes(c); })
      .catch(() => {});
  }, [open]);

  const reset = () => { setCommandeId(""); setDepot(""); setDate(""); setConformite("CONFORME"); setReserve(""); };

  const submit = async () => {
    if (!depot || !date) { toast.error("Champs obligatoires manquants"); return; }
    setSaving(true);
    try {
      await receiptsApi.create({
        purchase_order_id: commandeId || undefined,
        depot_id: depot,
        date_reception: date,
        conformite,
        reserve: reserve || undefined,
      });
      toast.success("Réception enregistrée", {
        description: conformite === "CONFORME" ? "Stock mis à jour." : "Réserve enregistrée.",
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
      <DialogContent>
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
                    <SelectItem key={c.id} value={c.id}>{c.numero} — {c.supplier_nom}</SelectItem>
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
