import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { budgetLotsApi, apiError } from "@/lib/api";

interface Props {
  projectId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function NewBudgetLotDialog({ projectId, trigger, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState("");
  const [libelle, setLibelle] = useState("");
  const [montant, setMontant] = useState("");

  const reset = () => { setCode(""); setLibelle(""); setMontant(""); };

  const submit = async () => {
    if (!code || !libelle) {
      toast.error("Code et libellé sont obligatoires");
      return;
    }
    setSaving(true);
    try {
      await budgetLotsApi.create({
        project_id: projectId,
        code,
        libelle,
        montant_prevu: parseFloat(montant) || 0,
      });
      toast.success("Lot budgétaire créé", { description: `${code} — ${libelle}` });
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
        {trigger ?? <Button size="sm" variant="outline" className="gap-1.5"><Plus className="w-4 h-4" /> Nouveau lot</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau lot budgétaire</DialogTitle>
          <DialogDescription>Définir une enveloppe budgétaire pour ce projet.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="LOT-GC" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Montant prévu (FCFA)</Label>
              <Input type="number" min="0" value={montant} onChange={(e) => setMontant(e.target.value)} className="text-right tabular-nums" placeholder="0" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Libellé *</Label>
            <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Ex : Gros œuvre, Charpente, Finitions…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Créer le lot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
