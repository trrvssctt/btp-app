import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { equipementsApi, apiError } from "@/lib/api";

// AFFECTE est exclu : il passe par « Affecter » et « Retour ».
const ETATS = [
  { value: "DISPONIBLE",     label: "Disponible" },
  { value: "EN_MAINTENANCE", label: "En maintenance" },
  { value: "HORS_SERVICE",   label: "Hors service" },
  { value: "PERDU",          label: "Perdu / volé" },
];

interface Props {
  equipementId: string;
  equipementCode: string;
  etatActuel: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function EtatEquipementDialog({ equipementId, equipementCode, etatActuel, trigger, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [etat, setEtat] = useState("");
  const [commentaire, setCommentaire] = useState("");

  const reset = () => { setEtat(""); setCommentaire(""); };

  const submit = async () => {
    if (!etat) { toast.error("Choisissez le nouvel état"); return; }
    if (etat !== "DISPONIBLE" && !commentaire.trim()) {
      toast.error("Un commentaire est obligatoire", { description: "Indiquez la raison (panne, révision, perte…)." });
      return;
    }
    setSaving(true);
    try {
      await equipementsApi.update(equipementId, { etat, commentaire: commentaire.trim() || null });
      toast.success("État mis à jour", { description: `${equipementCode} — ${ETATS.find((e) => e.value === etat)?.label}` });
      reset();
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error("Erreur lors du changement d'état", { description: apiError(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="gap-1.5">
            <Settings2 className="w-3.5 h-3.5" /> Changer l'état
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Changer l'état</DialogTitle>
          <DialogDescription>
            <span className="font-mono font-semibold">{equipementCode}</span> — état actuel : {ETATS.find((e) => e.value === etatActuel)?.label ?? etatActuel}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nouvel état *</Label>
            <Select value={etat} onValueChange={setEtat}>
              <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
              <SelectContent>
                {ETATS.filter((e) => e.value !== etatActuel).map((e) => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Commentaire {etat && etat !== "DISPONIBLE" ? "*" : ""}</Label>
            <Textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} rows={3}
              placeholder="Ex : Roulement usé — révision atelier Dakar." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
