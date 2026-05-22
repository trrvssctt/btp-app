import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { projectsApi, apiError } from "@/lib/api";

const MOTIFS_SUPPRESSION = [
  "Arrêt pour insuffisance de financement",
  "Résiliation du contrat client",
  "Décision de la direction générale",
  "Fusion avec un autre projet",
  "Projet annulé avant démarrage",
  "Doublon — saisie erronée",
  "Autre (préciser ci-dessous)",
];

interface Props {
  projectId: string;
  projectNom: string;
  projectCode: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function SupprimerProjetDialog({ projectId, projectNom, projectCode, trigger, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [motifSelect, setMotifSelect] = useState("");
  const [motifLibre, setMotifLibre] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const showLibre = motifSelect === "Autre (préciser ci-dessous)";
  const motifFinal = showLibre ? motifLibre.trim() : motifSelect;
  const confirmOk = confirmation.trim().toUpperCase() === projectCode.trim().toUpperCase();

  const reset = () => { setMotifSelect(""); setMotifLibre(""); setConfirmation(""); };

  const submit = async () => {
    if (!motifFinal) { toast.error("Veuillez indiquer un motif"); return; }
    if (!confirmOk) { toast.error(`Saisissez exactement le code ${projectCode} pour confirmer`); return; }
    setSaving(true);
    try {
      await projectsApi.update(projectId, {
        statut: "SUPPRIME",
        motif_statut: motifFinal,
      });
      toast.error("Projet supprimé", {
        description: "Le projet n'apparaît plus dans la liste des projets.",
      });
      reset();
      setOpen(false);
      onSuccess?.();
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
          <Button size="sm" variant="outline" className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50">
            <Trash2 className="w-4 h-4" /> Supprimer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Supprimer le projet
          </DialogTitle>
          <DialogDescription>
            <strong>{projectNom}</strong> sera marqué comme supprimé et n'apparaîtra plus
            dans la liste des projets. Cette action est réversible uniquement par un administrateur.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex gap-2 text-sm text-red-700">
          <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            L'historique (demandes, stock, mouvements) est conservé en base de données.
            Il s'agit d'une <strong>suppression logique</strong>.
          </span>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Motif de suppression *</Label>
            <Select value={motifSelect} onValueChange={setMotifSelect}>
              <SelectTrigger><SelectValue placeholder="Choisir un motif…" /></SelectTrigger>
              <SelectContent>
                {MOTIFS_SUPPRESSION.map((m) => (
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
                placeholder="Décrivez la raison de la suppression…"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>
              Confirmez en saisissant le code du projet :{" "}
              <span className="font-mono font-bold text-foreground">{projectCode}</span>
            </Label>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={projectCode}
              className={confirmation.length > 0 ? (confirmOk ? "border-green-500 focus-visible:ring-green-300" : "border-red-400 focus-visible:ring-red-300") : ""}
            />
            {confirmation.length > 0 && !confirmOk && (
              <p className="text-xs text-red-500 mt-1">Code incorrect — attendu : <span className="font-mono font-bold">{projectCode}</span></p>
            )}
            {confirmOk && (
              <p className="text-xs text-green-600 mt-1">✓ Code confirmé</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button
            onClick={submit}
            disabled={saving || !confirmOk}
            variant="destructive"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Supprimer définitivement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
