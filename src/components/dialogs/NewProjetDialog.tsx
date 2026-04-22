import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { projectsApi, apiError } from "@/lib/api";

export function NewProjetDialog({ trigger, onSuccess }: { trigger?: React.ReactNode; onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const [client, setClient] = useState("");
  const [budget, setBudget] = useState("");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");

  const reset = () => { setCode(""); setNom(""); setClient(""); setBudget(""); setDebut(""); setFin(""); };

  const submit = async () => {
    if (!code || !nom || !client || !budget) {
      toast.error("Champs obligatoires manquants"); return;
    }
    setSaving(true);
    try {
      await projectsApi.create({
        code,
        nom,
        client,
        budget_initial: parseFloat(budget),
        date_debut: debut || null,
        date_fin: fin || null,
      });
      toast.success("Projet créé", { description: `${code} — ${nom}` });
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
        {trigger ?? <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Nouveau projet</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau projet</DialogTitle>
          <DialogDescription>Création d'un projet — les chantiers et lots sont rattachés ensuite.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Code *</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PRJ-2026-005" className="font-mono" /></div>
            <div className="space-y-1.5"><Label>Client *</Label><Input value={client} onChange={(e) => setClient(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Nom du projet *</Label><Input value={nom} onChange={(e) => setNom(e.target.value)} /></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Budget (FCFA) *</Label><Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="text-right tabular-nums" /></div>
            <div className="space-y-1.5"><Label>Date début</Label><Input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Date fin</Label><Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Créer le projet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
