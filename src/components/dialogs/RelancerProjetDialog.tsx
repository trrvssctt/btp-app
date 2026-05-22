import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { projectsApi, apiError } from "@/lib/api";

const MOTIFS_RELANCE = [
  "Financement débloqué",
  "Décision de reprise par la direction",
  "Résolution du litige contractuel",
  "Conditions de chantier rétablies",
  "Révision du périmètre validée par le client",
  "Avenant contractuel signé",
  "Autre (préciser ci-dessous)",
];

interface Props {
  projectId: string;
  projectNom: string;
  trigger?: React.ReactNode;
  onSuccess?: (updated: any) => void;
}

export function RelancerProjetDialog({ projectId, projectNom, trigger, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [motifSelect, setMotifSelect] = useState("");
  const [motifLibre, setMotifLibre] = useState("");

  const showLibre = motifSelect === "Autre (préciser ci-dessous)";
  const motifFinal = showLibre ? motifLibre.trim() : motifSelect;

  const reset = () => { setMotifSelect(""); setMotifLibre(""); };

  const submit = async () => {
    if (!motifFinal) { toast.error("Un motif de relance est obligatoire"); return; }
    setSaving(true);
    try {
      const updated = await projectsApi.update(projectId, {
        statut: "ACTIF",
        motif_statut: motifFinal,
      });
      toast.success("Projet relancé", {
        description: "Le projet est à nouveau actif. Toutes les actions sont disponibles.",
      });
      reset();
      setOpen(false);
      onSuccess?.(updated);
    } catch (err) {
      toast.error("Erreur", { description: apiError(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
            <PlayCircle className="w-4 h-4" /> Relancer le projet
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-green-600" />
            Relancer le projet
          </DialogTitle>
          <DialogDescription>
            <strong>{projectNom}</strong> passera en statut <strong>ACTIF</strong>.
            Toutes les actions redeviendront disponibles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Motif de relance *</Label>
            <Select value={motifSelect} onValueChange={setMotifSelect}>
              <SelectTrigger><SelectValue placeholder="Choisir un motif…" /></SelectTrigger>
              <SelectContent>
                {MOTIFS_RELANCE.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showLibre && (
            <div className="space-y-1.5">
              <Label>Précisez le motif</Label>
              <Textarea
                value={motifLibre}
                onChange={(e) => setMotifLibre(e.target.value)}
                rows={3}
                placeholder="Décrivez la raison de la relance…"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button
            onClick={submit}
            disabled={saving || !motifFinal}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Confirmer la relance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
