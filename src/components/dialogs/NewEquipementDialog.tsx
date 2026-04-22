import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { equipementsApi, apiError } from "@/lib/api";

export function NewEquipementDialog({ trigger, onSuccess }: { trigger?: React.ReactNode; onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [designation, setDesignation] = useState("");
  const [etat, setEtat] = useState("DISPONIBLE");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!code || !designation) { toast.error("Champs obligatoires manquants"); return; }
    setSaving(true);
    try {
      await equipementsApi.create({ code_inventaire: code, designation, etat });
      toast.success("Équipement ajouté au parc", { description: `${code} — ${designation}` });
      setOpen(false);
      setCode(""); setDesignation(""); setEtat("DISPONIBLE");
      onSuccess?.();
    } catch (err) {
      toast.error("Erreur lors de l'ajout", { description: apiError(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Nouvel équipement</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel équipement durable</DialogTitle>
          <DialogDescription>Suivi individuel : affectation, maintenance, état.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Code inventaire *</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="EQ-PERF-015" className="font-mono" /></div>
            <div className="space-y-1.5">
              <Label>État initial</Label>
              <Select value={etat} onValueChange={setEtat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                  <SelectItem value="AFFECTE">Affecté</SelectItem>
                  <SelectItem value="EN_MAINTENANCE">En maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Désignation *</Label><Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Ex : Perforateur Hilti TE60" /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Enregistrement…" : "Ajouter au parc"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
