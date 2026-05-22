import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sitesApi, usersApi, apiError } from "@/lib/api";

const ROLES_RESPONSABLE = ["CONDUCTEUR", "CHEF_PROJET", "RESP_TECHNIQUE"];

interface Props {
  projectId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function NewSiteDialog({ projectId, trigger, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [responsables, setResponsables] = useState<{ id: string; nom: string; role: string }[]>([]);
  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const [localisation, setLocalisation] = useState("");
  const [responsableNom, setResponsableNom] = useState("");
  const [statut, setStatut] = useState("ACTIF");

  useEffect(() => {
    if (!open) return;
    usersApi.list()
      .then((users) => {
        const filtered = users
          .filter((u: any) => {
            const roles: string[] = u.roles ?? [];
            return u.actif && roles.some((r) => ROLES_RESPONSABLE.includes(r));
          })
          .map((u: any) => {
            const roles: string[] = u.roles ?? [];
            return {
              id: u.id,
              nom: u.nom,
              role: roles.find((r) => ROLES_RESPONSABLE.includes(r)) ?? "",
            };
          });
        setResponsables(filtered);
      })
      .catch(() => {});
  }, [open]);

  const ROLE_LABEL: Record<string, string> = {
    CONDUCTEUR: "Conducteur de travaux",
    CHEF_PROJET: "Chef de projet",
    RESP_TECHNIQUE: "Responsable technique",
  };

  const reset = () => {
    setCode(""); setNom(""); setLocalisation("");
    setResponsableNom(""); setStatut("ACTIF");
  };

  const submit = async () => {
    if (!code.trim() || !nom.trim()) { toast.error("Code et nom sont obligatoires"); return; }
    setSaving(true);
    try {
      await sitesApi.create({
        project_id: projectId,
        code: code.trim(),
        nom: nom.trim(),
        localisation: localisation.trim() || undefined,
        responsable: responsableNom || undefined,
        statut,
      });
      toast.success("Chantier créé", { description: `${code.trim()} — ${nom.trim()}` });
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
        {trigger ?? <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Ajouter un chantier</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau chantier / site</DialogTitle>
          <DialogDescription>Ajouter un site de travail à ce projet.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex : SN6-001" />
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
            <Label>Nom du site *</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Bâtiment Principal — Classes et Administration" />
          </div>
          <div className="space-y-1.5">
            <Label>Localisation</Label>
            <Input value={localisation} onChange={(e) => setLocalisation(e.target.value)} placeholder="Ex : Pikine — Quartier Guinaw Rail" />
          </div>
          <div className="space-y-1.5">
            <Label>Responsable</Label>
            <Select value={responsableNom} onValueChange={setResponsableNom}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un responsable…" />
              </SelectTrigger>
              <SelectContent>
                {responsables.length === 0 && (
                  <SelectItem value="-" disabled>Aucun responsable disponible</SelectItem>
                )}
                {responsables.map((u) => (
                  <SelectItem key={u.id} value={u.nom}>
                    <span>{u.nom}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      — {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Créer le chantier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
