import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Loader2, ArrowDownToLine, ArrowUpFromLine, RefreshCw,
  RotateCcw, Wrench, Package, Warehouse, Hash, FileText, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { toast } from "sonner";
import { articlesApi, depotsApi, stockMovementsApi, apiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatNum } from "@/data/labels";

type MvtType = "AJUSTEMENT_INVENTAIRE" | "RETOUR_CHANTIER" | "ENTREE_ACHAT" | "SORTIE_CHANTIER";

interface MvtOption {
  value: MvtType;
  label: string;
  desc: string;
  icon: React.ElementType;
  dir: "in" | "out" | "neutral";
  color: string;
  iconColor: string;
}

const MVT_OPTIONS: MvtOption[] = [
  {
    value: "ENTREE_ACHAT",
    label: "Entrée achat",
    desc: "Réception d'une commande fournisseur",
    icon: ArrowDownToLine,
    dir: "in",
    color: "border-success/40 bg-success/5 hover:border-success/70 data-[active=true]:border-success data-[active=true]:bg-success/10",
    iconColor: "bg-success/10 text-success",
  },
  {
    value: "RETOUR_CHANTIER",
    label: "Retour chantier",
    desc: "Matériaux non utilisés retournés",
    icon: RotateCcw,
    dir: "in",
    color: "border-blue-400/40 bg-blue-50/50 hover:border-blue-400/70 data-[active=true]:border-blue-500 data-[active=true]:bg-blue-50 dark:data-[active=true]:bg-blue-950/20",
    iconColor: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    value: "SORTIE_CHANTIER",
    label: "Sortie chantier",
    desc: "Affectation de matériaux au chantier",
    icon: ArrowUpFromLine,
    dir: "out",
    color: "border-amber-400/40 bg-amber-50/50 hover:border-amber-400/70 data-[active=true]:border-amber-500 data-[active=true]:bg-amber-50 dark:data-[active=true]:bg-amber-950/20",
    iconColor: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  },
  {
    value: "AJUSTEMENT_INVENTAIRE",
    label: "Ajustement inventaire",
    desc: "Correction suite à inventaire physique",
    icon: RefreshCw,
    dir: "neutral",
    color: "border-muted-foreground/20 hover:border-muted-foreground/40 data-[active=true]:border-primary data-[active=true]:bg-primary/5",
    iconColor: "bg-muted text-muted-foreground",
  },
];

const DIR_INFO = {
  in: { icon: TrendingUp, label: "Entrée stock", color: "text-success" },
  out: { icon: TrendingDown, label: "Sortie stock", color: "text-amber-600 dark:text-amber-400" },
  neutral: { icon: Minus, label: "Ajustement", color: "text-muted-foreground" },
};

export function NewMouvementDialog({ trigger, onSuccess }: { trigger?: React.ReactNode; onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [articles, setArticles] = useState<any[]>([]);
  const [depots, setDepots] = useState<any[]>([]);
  const [type, setType] = useState<MvtType>("ENTREE_ACHAT");
  const [articleId, setArticleId] = useState("");
  const [depot, setDepot] = useState("");
  const [quantite, setQuantite] = useState("");
  const [reference, setReference] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (!open) return;
    Promise.all([articlesApi.list(), depotsApi.list()])
      .then(([a, d]) => { setArticles(a); setDepots(d); })
      .catch(() => {});
  }, [open]);

  const reset = () => {
    setArticleId(""); setDepot(""); setQuantite(""); setReference(""); setStep(1); setType("ENTREE_ACHAT");
  };

  const selectedOpt = MVT_OPTIONS.find((o) => o.value === type)!;
  const selectedArticle = articles.find((a) => String(a.id) === String(articleId));
  const selectedDepot = depots.find((d) => String(d.id) === String(depot));
  const qty = parseFloat(quantite);
  const DirIcon = DIR_INFO[selectedOpt.dir].icon;

  const canStep2 = type && articleId && depot;
  const canSubmit = canStep2 && quantite && !isNaN(qty) && qty !== 0;

  const submit = async () => {
    if (!canSubmit) { toast.error("Champs obligatoires manquants"); return; }
    setSaving(true);
    try {
      await stockMovementsApi.create({
        type_mouvement: type,
        article_id: articleId,
        depot_id: depot,
        quantite: qty,
        reference_doc: reference || undefined,
      });
      toast.success("Mouvement enregistré avec succès", {
        description: `${selectedOpt.label} — ${selectedArticle?.designation ?? ""} (${formatNum(qty)} unités)`,
      });
      reset();
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement", { description: apiError(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" />Mouvement manuel
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden">
        {/* Header coloré selon le type */}
        <div className={cn(
          "px-6 pt-6 pb-5 border-b border-border",
          selectedOpt.dir === "in" ? "bg-success/5" : selectedOpt.dir === "out" ? "bg-amber-50/60 dark:bg-amber-950/10" : "bg-muted/40",
        )}>
          <div className="flex items-start gap-4">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", selectedOpt.iconColor)}>
              <selectedOpt.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold">Mouvement de stock</DialogTitle>
              <DialogDescription className="mt-0.5 text-sm">
                Tracé dans l'audit — saisie irréversible après validation.
              </DialogDescription>
            </div>
            <div className={cn("flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border", DIR_INFO[selectedOpt.dir].color, "border-current/20 bg-background/60")}>
              <DirIcon className="w-3 h-3" />
              {DIR_INFO[selectedOpt.dir].label}
            </div>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-2 mt-5">
            {[{ n: 1, label: "Type & localisation" }, { n: 2, label: "Quantité & référence" }].map(({ n, label }, i) => (
              <div key={n} className="flex items-center gap-2">
                {i > 0 && <div className={cn("flex-1 h-px w-8", step >= n ? "bg-primary" : "bg-border")} />}
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                    step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}>
                    {n}
                  </div>
                  <span className={cn("text-xs font-medium hidden sm:block", step >= n ? "text-foreground" : "text-muted-foreground")}>
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {step === 1 ? (
            <>
              {/* Type de mouvement — sélection visuelle */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Type de mouvement</Label>
                <div className="grid grid-cols-2 gap-2">
                  {MVT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      data-active={type === opt.value}
                      onClick={() => setType(opt.value)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150",
                        opt.color,
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", opt.iconColor)}>
                        <opt.icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight">{opt.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Article + Dépôt */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <Package className="w-3.5 h-3.5 text-muted-foreground" />Article <span className="text-destructive">*</span>
                  </Label>
                  <Select value={articleId} onValueChange={setArticleId}>
                    <SelectTrigger className={cn("h-10", !articleId && "text-muted-foreground")}>
                      <SelectValue placeholder="Sélectionner un article…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {articles.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{a.code}</span>
                            <span className="truncate">{a.designation}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <Warehouse className="w-3.5 h-3.5 text-muted-foreground" />Dépôt <span className="text-destructive">*</span>
                  </Label>
                  <Select value={depot} onValueChange={setDepot}>
                    <SelectTrigger className={cn("h-10", !depot && "text-muted-foreground")}>
                      <SelectValue placeholder="Sélectionner un dépôt…" />
                    </SelectTrigger>
                    <SelectContent>
                      {depots.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{d.code}</span>
                            <span>{d.nom}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Récapitulatif choix précédents */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Récapitulatif</p>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5"><selectedOpt.icon className="w-3.5 h-3.5" />Type</span>
                    <span className="font-medium">{selectedOpt.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Package className="w-3.5 h-3.5" />Article</span>
                    <span className="font-medium truncate max-w-[200px]">{selectedArticle?.designation ?? articleId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Warehouse className="w-3.5 h-3.5" />Dépôt</span>
                    <span className="font-medium">{selectedDepot?.nom ?? depot}</span>
                  </div>
                </div>
              </div>

              {/* Quantité */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                  Quantité <span className="text-destructive">*</span>
                  {selectedOpt.dir === "neutral" && (
                    <span className="text-xs text-muted-foreground font-normal ml-1">(négatif pour décrémenter)</span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={quantite}
                    onChange={(e) => setQuantite(e.target.value)}
                    placeholder={selectedOpt.dir === "out" ? "Ex. 50" : "Ex. 100"}
                    className={cn(
                      "h-12 text-lg font-bold tabular-nums pr-16 transition-colors",
                      !isNaN(qty) && qty > 0 && "border-success/60 focus-visible:ring-success/30",
                      !isNaN(qty) && qty < 0 && "border-destructive/60 focus-visible:ring-destructive/30",
                    )}
                  />
                  {selectedArticle?.unite && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground border-l border-border pl-3">
                      {selectedArticle.unite}
                    </span>
                  )}
                </div>
                {quantite && !isNaN(qty) && qty !== 0 && (
                  <div className={cn(
                    "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg",
                    qty > 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                  )}>
                    {qty > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {qty > 0 ? `+${formatNum(qty)}` : formatNum(qty)} unités {qty > 0 ? "ajoutées" : "retirées"} du stock
                  </div>
                )}
              </div>

              {/* Référence */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />Référence document
                  <span className="text-xs text-muted-foreground font-normal ml-1">(optionnel)</span>
                </Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="font-mono h-10"
                  placeholder="BL-2025-001, BC-034… (auto-généré si vide)"
                />
              </div>

              {/* Avertissement */}
              <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300">
                <Wrench className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <p>Ce mouvement sera tracé dans le journal d'audit. L'action ne peut pas être annulée, mais un mouvement inverse peut être saisi.</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => { setOpen(false); reset(); }}>
            Annuler
          </Button>
          <div className="flex items-center gap-2">
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)}>
                Retour
              </Button>
            )}
            {step === 1 ? (
              <Button onClick={() => setStep(2)} disabled={!canStep2} className="gap-1.5">
                Continuer <span className="opacity-60">→</span>
              </Button>
            ) : (
              <Button onClick={submit} disabled={saving || !canSubmit} className="gap-2 min-w-[140px]">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <selectedOpt.icon className="w-4 h-4" />}
                {saving ? "Enregistrement…" : "Valider le mouvement"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
