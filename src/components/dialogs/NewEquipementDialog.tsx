import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { equipementsApi, apiError } from "@/lib/api";

const NOUVELLE = "__nouvelle__";
const FAMILLE_RE = /^[A-Z0-9]{2,10}$/;

export function NewEquipementDialog({ trigger, onSuccess }: { trigger?: React.ReactNode; onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [familles, setFamilles] = useState<any[]>([]);
  const [choix, setChoix] = useState("");
  const [nouvelle, setNouvelle] = useState("");
  const [designation, setDesignation] = useState("");
  const [etat, setEtat] = useState("DISPONIBLE");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    equipementsApi.familles().then(setFamilles).catch(() => setFamilles([]));
  }, [open]);

  const famille = choix === NOUVELLE ? nouvelle.trim().toUpperCase() : choix;
  const existante = familles.find((f) => f.famille === famille);
  const familleValide = FAMILLE_RE.test(famille);
  // Aperçu indicatif : le numéro définitif est attribué par le serveur à l'enregistrement.
  const apercu = !familleValide ? null : existante ? existante.prochain_code : `EQ-${famille}-001`;

  const reset = () => { setChoix(""); setNouvelle(""); setDesignation(""); setEtat("DISPONIBLE"); };

  const submit = async () => {
    if (!familleValide || !designation.trim()) {
      toast.error("Champs obligatoires manquants", {
        description: !familleValide ? "Famille : 2 à 10 lettres ou chiffres, sans espace (ex. BETON)." : undefined,
      });
      return;
    }
    setSaving(true);
    try {
      const eq = await equipementsApi.create({ famille, designation: designation.trim(), etat });
      toast.success("Équipement ajouté au parc", { description: `${eq.code_inventaire} — ${eq.designation}` });
      setOpen(false);
      reset();
      onSuccess?.();
    } catch (err) {
      toast.error("Erreur lors de l'ajout", { description: apiError(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Nouvel équipement</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel équipement durable</DialogTitle>
          <DialogDescription>Le code inventaire est attribué automatiquement dans la famille choisie.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Famille *</Label>
              <Select value={choix} onValueChange={setChoix}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>
                  {familles.map((f) => (
                    <SelectItem key={f.famille} value={f.famille}>
                      <span className="font-mono text-xs mr-2">{f.famille}</span>
                      <span className="text-muted-foreground">({f.nb}) {f.exemple}</span>
                    </SelectItem>
                  ))}
                  <SelectItem value={NOUVELLE}>+ Nouvelle famille…</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>État initial</Label>
              <Select value={etat} onValueChange={setEtat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                  <SelectItem value="EN_MAINTENANCE">En maintenance</SelectItem>
                  <SelectItem value="HORS_SERVICE">Hors service</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {choix === NOUVELLE && (
            <div className="space-y-1.5">
              <Label>Code de la nouvelle famille *</Label>
              <Input value={nouvelle} onChange={(e) => setNouvelle(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                maxLength={10} placeholder="Ex : DAMEUSE" className="font-mono" />
              <p className="text-xs text-muted-foreground">2 à 10 lettres ou chiffres, sans espace ni accent.</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Désignation *</Label>
            <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Ex : Bétonnière électrique 350 L — ALTRAD BM350" />
          </div>
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 text-sm flex items-center justify-between">
            <span className="text-muted-foreground">Code attribué</span>
            <span className="font-mono font-semibold">{apercu ?? "—"}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Enregistrement…" : "Ajouter au parc"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
