import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { projectsApi, apiError } from "@/lib/api";

interface Props {
  project: {
    id: string;
    code: string;
    nom: string;
    client?: string | null;
    budget_initial: number;
    statut: string;
    date_debut?: string | null;
    date_fin?: string | null;
  };
  trigger?: React.ReactNode;
  onSuccess?: (updated: any) => void;
}

function toDateInput(val?: string | null) {
  if (!val) return "";
  return val.slice(0, 10);
}

export function EditProjetDialog({ project, trigger, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const [client, setClient] = useState("");
  const [budget, setBudget] = useState("");
  const [statut, setStatut] = useState("ACTIF");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  useEffect(() => {
    if (open) {
      setCode(project.code);
      setNom(project.nom);
      setClient(project.client ?? "");
      setBudget(String(project.budget_initial));
      setStatut(project.statut);
      setDateDebut(toDateInput(project.date_debut));
      setDateFin(toDateInput(project.date_fin));
    }
  }, [open, project]);

  const submit = async () => {
    if (!code.trim() || !nom.trim()) { toast.error("Code et nom sont obligatoires"); return; }
    const budgetNum = parseFloat(budget.replace(/\s/g, "").replace(",", "."));
    if (isNaN(budgetNum) || budgetNum < 0) { toast.error("Budget invalide"); return; }
    setSaving(true);
    try {
      const updated = await projectsApi.update(project.id, {
        code: code.trim(),
        nom: nom.trim(),
        client: client.trim() || undefined,
        budget_initial: budgetNum,
        statut,
        date_debut: dateDebut || undefined,
        date_fin: dateFin || undefined,
      });
      toast.success("Projet mis à jour", { description: `${code.trim()} — budget : ${budgetNum.toLocaleString("fr-SN")} FCFA` });
      setOpen(false);
      onSuccess?.(updated);
    } catch (err) {
      toast.error("Erreur lors de la mise à jour", { description: apiError(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="gap-1.5">
            <Pencil className="w-4 h-4" /> Modifier le projet
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier le projet</DialogTitle>
          <DialogDescription>Corrigez les informations du projet.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex : PRJ-SN-006" />
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={statut} onValueChange={setStatut}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIF">Actif</SelectItem>
                  <SelectItem value="SUSPENDU">Suspendu</SelectItem>
                  <SelectItem value="CLOTURE">Clôturé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nom du projet *</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Construction École Primaire — Pikine" />
          </div>
          <div className="space-y-1.5">
            <Label>Client / Maître d'ouvrage</Label>
            <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Ex : Mairie de Pikine" />
          </div>
          <div className="space-y-1.5">
            <Label>Budget initial (FCFA) *</Label>
            <Input
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Ex : 650000000"
              inputMode="numeric"
            />
            {budget && !isNaN(parseFloat(budget.replace(/\s/g, ""))) && (
              <p className="text-xs text-muted-foreground">
                = {parseFloat(budget.replace(/\s/g, "").replace(",", ".")).toLocaleString("fr-SN")} FCFA
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date de début</Label>
              <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date de fin prévue</Label>
              <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Enregistrer les modifications
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
