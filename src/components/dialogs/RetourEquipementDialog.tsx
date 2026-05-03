import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { equipementsApi, apiError } from "@/lib/api";

interface Props {
  equipementId: string;
  affectationId: string;
  equipementCode: string;
  chantierNom?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const ETAT_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: "DISPONIBLE",    label: "Disponible",      description: "En bon état, prêt pour une nouvelle affectation" },
  { value: "EN_MAINTENANCE", label: "En maintenance",  description: "Nécessite une intervention avant réutilisation" },
  { value: "HORS_SERVICE",  label: "Hors service",    description: "Inutilisable, retrait temporaire du parc" },
  { value: "PERDU",         label: "Perdu / volé",    description: "Équipement introuvable ou déclaré volé" },
];

export function RetourEquipementDialog({ equipementId, affectationId, equipementCode, chantierNom, trigger, onSuccess }: Props) {
  const [open, setOpen]       = useState(false);
  const [saving, setSaving]   = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [dateFin,     setDateFin]     = useState(today);
  const [etatRetour,  setEtatRetour]  = useState<"DISPONIBLE" | "EN_MAINTENANCE" | "HORS_SERVICE" | "PERDU">("DISPONIBLE");
  const [commentaire, setCommentaire] = useState("");

  const reset = () => {
    setDateFin(today); setEtatRetour("DISPONIBLE"); setCommentaire("");
  };

  const submit = async () => {
    setSaving(true);
    try {
      await equipementsApi.returnEquipment(equipementId, affectationId, {
        date_fin:    dateFin,
        etat_retour: etatRetour,
        commentaire: commentaire || null,
      });
      toast.success("Retour enregistré", {
        description: `${equipementCode} — nouvel état : ${ETAT_OPTIONS.find((o) => o.value === etatRetour)?.label}`,
      });
      reset();
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error("Erreur lors du retour", { description: apiError(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="gap-1.5 text-warning border-warning/40 hover:border-warning">
            <RotateCcw className="w-3.5 h-3.5" /> Retour
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Retour d'équipement</DialogTitle>
          <DialogDescription>
            Clôture de l'affectation de <span className="font-mono font-semibold">{equipementCode}</span>
            {chantierNom && <> depuis <span className="font-semibold">{chantierNom}</span></>}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date de retour */}
          <div className="space-y-1.5">
            <Label>Date de retour *</Label>
            <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} max={today} />
          </div>

          {/* État à la réintégration */}
          <div className="space-y-1.5">
            <Label>État à la réintégration *</Label>
            <Select value={etatRetour} onValueChange={(v) => setEtatRetour(v as typeof etatRetour)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ETAT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    <div>
                      <p className="font-medium">{o.label}</p>
                      <p className="text-xs text-muted-foreground">{o.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Commentaire (obligatoire si hors service ou perdu) */}
          <div className="space-y-1.5">
            <Label>
              Observations
              {["HORS_SERVICE", "PERDU"].includes(etatRetour) && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder={
                etatRetour === "PERDU"
                  ? "Circonstances de la perte / vol…"
                  : etatRetour === "HORS_SERVICE"
                  ? "Nature de l'avarie, incident survenu…"
                  : "Observations lors du retour (optionnel)"
              }
              rows={3}
            />
            {["HORS_SERVICE", "PERDU"].includes(etatRetour) && !commentaire.trim() && (
              <p className="text-xs text-destructive">Une observation est requise pour cet état.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
          <Button
            onClick={submit}
            disabled={saving || (["HORS_SERVICE", "PERDU"].includes(etatRetour) && !commentaire.trim())}
            variant={etatRetour === "PERDU" ? "destructive" : "default"}
            className="gap-1.5"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Valider le retour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
