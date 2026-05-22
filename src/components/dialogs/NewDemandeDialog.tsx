import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { projectsApi, sitesApi, articlesApi, budgetLotsApi, requestsApi, apiError } from "@/lib/api";

interface Ligne { id: string; articleId: string; designationLibre: string; quantite: string; }

const formatFcfa = (n: number) => n > 0 ? `${n.toLocaleString("fr-SN")} FCFA` : "";

export function NewDemandeDialog({ trigger, onSuccess }: { trigger?: React.ReactNode; onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projets, setProjets] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);

  const [projetId, setProjetId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [budgetLotId, setBudgetLotId] = useState("none");
  const [urgence, setUrgence] = useState("NORMALE");
  const [dateSouhaitee, setDateSouhaitee] = useState("");
  const [motif, setMotif] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([{ id: "1", articleId: "", designationLibre: "", quantite: "" }]);

  useEffect(() => {
    if (!open) return;
    Promise.all([projectsApi.list(), articlesApi.list()])
      .then(([p, a]) => {
        setProjets(p.filter((x: any) => x.statut === "ACTIF"));
        setArticles(a);
      })
      .catch(() => {});
  }, [open]);

  // Chargement des sites et lots à chaque changement de projet
  useEffect(() => {
    setSiteId("");
    setBudgetLotId("none");
    setLots([]);
    if (!projetId) { setSites([]); return; }
    Promise.all([
      sitesApi.list({ project_id: projetId }),
      budgetLotsApi.list({ project_id: projetId }),
    ])
      .then(([s, l]) => { setSites(s); setLots(l); })
      .catch(() => {});
  }, [projetId]);

  const total = lignes.reduce((s, l) => {
    const a = articles.find((x) => x.id === l.articleId);
    return s + (Number(a?.prix_moyen) || 0) * (parseFloat(l.quantite) || 0);
  }, 0);

  const lotSelectionne = budgetLotId !== "none" ? lots.find((l) => l.id === budgetLotId) : null;

  const addLigne = () => setLignes([...lignes, { id: Date.now().toString(), articleId: "", designationLibre: "", quantite: "" }]);
  const removeLigne = (id: string) => setLignes(lignes.filter((l) => l.id !== id));
  const updateLigne = (id: string, patch: Partial<Ligne>) =>
    setLignes(lignes.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const reset = () => {
    setProjetId(""); setSiteId(""); setBudgetLotId("none"); setUrgence("NORMALE");
    setDateSouhaitee(""); setMotif(""); setLignes([{ id: "1", articleId: "", designationLibre: "", quantite: "" }]);
  };

  const submit = async () => {
    const lignesValides = lignes.filter((l) => l.articleId || l.designationLibre.trim());
    if (!projetId || !siteId || !motif || lignesValides.length === 0 ||
        lignesValides.some((l) => !l.quantite)) {
      toast.error("Champs obligatoires manquants", {
        description: "Projet, chantier, motif et au moins une ligne complète.",
      });
      return;
    }
    setSaving(true);
    try {
      await requestsApi.create({
        project_id: projetId,
        site_id: siteId,
        budget_lot_id: budgetLotId !== "none" ? budgetLotId : null,
        urgence,
        motif,
        date_souhaitee: dateSouhaitee || null,
        lignes: lignesValides.map((l) => ({
          article_id: l.articleId || null,
          designation_libre: l.articleId ? null : l.designationLibre.trim() || null,
          qte_demandee: parseFloat(l.quantite),
        })),
      });
      toast.success("Demande soumise", {
        description: `Montant estimé : ${formatFcfa(total)}`,
      });
      reset();
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error("Erreur lors de la soumission", { description: apiError(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Nouvelle demande</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle demande de besoin</DialogTitle>
          <DialogDescription>Expression de besoin terrain — rattachement projet/chantier obligatoire.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Projet */}
          <div className="space-y-1.5">
            <Label>Projet *</Label>
            <Select value={projetId} onValueChange={(v) => { setProjetId(v); setSiteId(""); }}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger>
              <SelectContent>{projets.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.code} — {p.nom}</SelectItem>
              ))}</SelectContent>
            </Select>
          </div>

          {/* Chantier */}
          <div className="space-y-1.5">
            <Label>Chantier *</Label>
            <Select value={siteId} onValueChange={setSiteId} disabled={!projetId}>
              <SelectTrigger>
                <SelectValue placeholder={projetId ? "Sélectionner" : "Choisir un projet d'abord"} />
              </SelectTrigger>
              <SelectContent>{sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.code} — {s.nom}</SelectItem>
              ))}</SelectContent>
            </Select>
          </div>

          {/* Lot budgétaire — toute la largeur */}
          <div className="md:col-span-2 space-y-1.5">
            <Label>Lot budgétaire <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
            <Select value={budgetLotId} onValueChange={setBudgetLotId} disabled={!projetId || lots.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={
                  !projetId ? "Choisir un projet d'abord"
                  : lots.length === 0 ? "Aucun lot défini sur ce projet"
                  : "Rattacher à un lot…"
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sans lot —</SelectItem>
                {lots.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.code} — {l.libelle}
                    {l.montant_prevu > 0 && ` (${Number(l.montant_prevu).toLocaleString("fr-SN")} FCFA)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lotSelectionne && (
              <p className="text-xs text-muted-foreground">
                Budget prévu : <span className="font-semibold tabular-nums">{Number(lotSelectionne.montant_prevu).toLocaleString("fr-SN")} FCFA</span>
                {lotSelectionne.montant_consomme > 0 && (
                  <> — Engagé : <span className="font-semibold tabular-nums">{Number(lotSelectionne.montant_consomme).toLocaleString("fr-SN")} FCFA</span></>
                )}
              </p>
            )}
          </div>

          {/* Urgence */}
          <div className="space-y-1.5">
            <Label>Niveau d'urgence</Label>
            <Select value={urgence} onValueChange={setUrgence}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NORMALE">Normale</SelectItem>
                <SelectItem value="URGENTE">Urgente</SelectItem>
                <SelectItem value="HAUTE">Haute</SelectItem>
                <SelectItem value="CRITIQUE">Critique</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date souhaitée */}
          <div className="space-y-1.5">
            <Label>Date souhaitée</Label>
            <Input type="date" value={dateSouhaitee} onChange={(e) => setDateSouhaitee(e.target.value)} />
          </div>

          {/* Motif */}
          <div className="space-y-1.5 md:col-span-2">
            <Label>Motif / justification *</Label>
            <Textarea value={motif} onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex : Coulage dalle niveau R+2, rupture sur chantier…" rows={2} />
          </div>
        </div>

        {/* Lignes d'articles */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between bg-muted/40 px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Articles demandés</p>
            <Button type="button" variant="ghost" size="sm" onClick={addLigne} className="h-7 gap-1">
              <Plus className="w-3.5 h-3.5" /> Ligne
            </Button>
          </div>
          <div className="divide-y divide-border">
            {lignes.map((l) => {
              const art = articles.find((x) => x.id === l.articleId);
              const sub = art ? Number(art.prix_moyen) * (parseFloat(l.quantite) || 0) : 0;
              return (
                <div key={l.id} className="grid grid-cols-12 gap-2 p-2.5 items-start">
                  {/* Article ou désignation libre */}
                  <div className="col-span-6 space-y-1">
                    <Select value={l.articleId} onValueChange={(v) => updateLigne(l.id, { articleId: v, designationLibre: "" })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Article du catalogue…" /></SelectTrigger>
                      <SelectContent>{articles.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.code} — {a.designation}</SelectItem>
                      ))}</SelectContent>
                    </Select>
                    {!l.articleId && (
                      <Input
                        value={l.designationLibre}
                        onChange={(e) => updateLigne(l.id, { designationLibre: e.target.value })}
                        placeholder="ou saisir désignation libre…"
                        className="h-8 text-xs"
                      />
                    )}
                  </div>
                  {/* Unité */}
                  <div className="col-span-1 pt-1.5 text-center text-xs text-muted-foreground">
                    {art?.unite ?? ""}
                  </div>
                  {/* Quantité */}
                  <div className="col-span-2">
                    <Input type="number" min="0" placeholder="Qté" value={l.quantite}
                      onChange={(e) => updateLigne(l.id, { quantite: e.target.value })}
                      className="h-9 text-right tabular-nums" />
                  </div>
                  {/* Sous-total */}
                  <div className="col-span-2 pt-2 text-right text-xs tabular-nums text-muted-foreground">
                    {art && sub > 0 && formatFcfa(sub)}
                  </div>
                  {/* Supprimer */}
                  <div className="col-span-1 text-right">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLigne(l.id)}
                      disabled={lignes.length === 1} className="h-9 w-9 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 bg-muted/40 border-t border-border">
            <span className="text-sm font-medium">Total estimé</span>
            <span className="text-base font-bold tabular-nums">{formatFcfa(total)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Soumettre la demande
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
