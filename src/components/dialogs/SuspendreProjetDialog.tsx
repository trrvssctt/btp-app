import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PauseCircle, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { projectsApi, apiError } from "@/lib/api";

const MOTIFS_SUSPENSION = [
  "Suspension temporaire — attente de financement",
  "Arrêt de chantier — décision technique",
  "Litige contractuel en cours",
  "Intempéries ou force majeure",
  "Révision du périmètre du projet",
  "Autre (préciser ci-dessous)",
];

interface Props {
  projectId: string;
  projectNom: string;
  trigger?: React.ReactNode;
  onSuccess?: (updated: any) => void;
}

export function SuspendreProjetDialog({ projectId, projectNom, trigger, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [motifSelect, setMotifSelect] = useState("");
  const [motifLibre, setMotifLibre] = useState("");

  const showLibre = motifSelect === "Autre (préciser ci-dessous)";
  const motifFinal = showLibre ? motifLibre.trim() : motifSelect;

  const reset = () => { setMotifSelect(""); setMotifLibre(""); };

  const submit = async () => {
    if (!motifFinal) { toast.error("Veuillez indiquer un motif de suspension"); return; }
    setSaving(true);
    try {
      const updated = await projectsApi.update(projectId, {
        statut: "SUSPENDU",
        motif_statut: motifFinal,
      });
      toast.warning("Projet suspendu", {
        description: "Aucune nouvelle action ne peut être effectuée sur ce projet.",
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
          <Button size="sm" variant="outline" className="gap-1.5 border-orange-300 text-orange-600 hover:bg-orange-50">
            <PauseCircle className="w-4 h-4" /> Suspendre
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PauseCircle className="w-5 h-5 text-orange-500" />
            Suspendre le projet
          </DialogTitle>
          <DialogDescription>
            <strong>{projectNom}</strong> sera suspendu. Plus aucune demande, création de site
            ou ajout de lot budgétaire ne pourra être effectué tant que le projet reste suspendu.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 flex gap-2 text-sm text-orange-700">
          <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Le projet peut être réactivé à tout moment via le bouton <strong>Modifier</strong>.</span>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Motif de suspension *</Label>
            <Select value={motifSelect} onValueChange={setMotifSelect}>
              <SelectTrigger><SelectValue placeholder="Choisir un motif…" /></SelectTrigger>
              <SelectContent>
                {MOTIFS_SUSPENSION.map((m) => (
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
                placeholder="Décrivez la raison de la suspension…"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button
            onClick={submit}
            disabled={saving || !motifFinal}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Confirmer la suspension
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
