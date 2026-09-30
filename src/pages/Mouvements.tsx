import { PageHeader } from "@/components/PageHeader";
import { Package, ArrowDown, ArrowUp, RotateCcw, Sliders, Loader2, Search, X, Warehouse, Filter } from "lucide-react";
import { depotsApi, stockMovementsApi } from "@/lib/api";
import { formatDateTime, mouvementLabel } from "@/data/labels";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUrlFilters } from "@/hooks/useUrlFilters";

const FILTRES = ["q", "type", "sens", "depot", "du", "au"] as const;
const LIMIT = 500;
import { NewMouvementDialog } from "@/components/dialogs/NewMouvementDialog";
import { useAuth } from "@/contexts/AuthContext";

const iconFor = (type: string) => {
  if (type === "ENTREE" || type.includes("ENTREE") || type === "TRANSFERT_ENTRANT") return ArrowDown;
  if (type === "SORTIE" || type.includes("SORTIE") || type === "TRANSFERT_SORTANT") return ArrowUp;
  if (type === "RETOUR_CHANTIER") return RotateCcw;
  if (type === "AJUSTEMENT_INVENTAIRE") return Sliders;
  return Package;
};

const isSortie = (type: string, quantite: number) =>
  type === "SORTIE" || type.includes("SORTIE") || type === "TRANSFERT_SORTANT" ||
  (type === "AJUSTEMENT_INVENTAIRE" && quantite < 0);

export default function MouvementsPage() {
  const { hasRole } = useAuth();
  const canCreate = hasRole("ADMIN", "MAGASINIER");
  const [mouvements, setMouvements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [depots, setDepots] = useState<any[]>([]);
  const { values: f, debounced, set, clear, active } = useUrlFilters(FILTRES);

  useEffect(() => { depotsApi.list().then(setDepots).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    stockMovementsApi.list({
      q: debounced.q || undefined,
      type_mouvement: debounced.type || undefined,
      sens: debounced.sens || undefined,
      depot_id: debounced.depot || undefined,
      date_from: debounced.du || undefined,
      date_to: debounced.au || undefined,
      limit: LIMIT,
    })
      .then(setMouvements)
      .catch(() => setMouvements([]))
      .finally(() => setLoading(false));
  }, [refreshKey, debounced]);

  return (
    <>
      <PageHeader
        breadcrumb="Opérations"
        title="Journal des mouvements"
        description="Traçabilité complète des entrées, sorties, transferts, retours et ajustements."
        actions={canCreate ? <NewMouvementDialog onSuccess={() => setRefreshKey((k) => k + 1)} /> : undefined}
      />
      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        {/* Barre de filtres */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input value={f.q} onChange={(e) => set("q", e.target.value)}
                placeholder="Article, code ou référence (BR-…, TR-…)" className="pl-9 h-9" />
              {f.q && (
                <button onClick={() => set("q", "")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Select value={f.depot || "all"} onValueChange={(v) => set("depot", v === "all" ? "" : v)}>
              <SelectTrigger className="h-9 w-full lg:w-48">
                <Warehouse className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Tous les dépôts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les dépôts</SelectItem>
                {depots.map((d) => (
                  <SelectItem key={d.id} value={d.id}><span className="font-mono text-xs mr-2">{d.code}</span>{d.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={f.type || "all"} onValueChange={(v) => set("type", v === "all" ? "" : v)}>
              <SelectTrigger className="h-9 w-full lg:w-48">
                <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {Object.entries(mouvementLabel).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={f.sens || "all"} onValueChange={(v) => set("sens", v === "all" ? "" : v)}>
              <SelectTrigger className="h-9 w-full lg:w-36"><SelectValue placeholder="Sens" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Entrées & sorties</SelectItem>
                <SelectItem value="entree">Entrées</SelectItem>
                <SelectItem value="sortie">Sorties</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Du</span>
              <Input type="date" value={f.du} max={f.au || undefined} onChange={(e) => set("du", e.target.value)} className="h-9 w-40" />
              <span className="text-muted-foreground">au</span>
              <Input type="date" value={f.au} min={f.du || undefined} onChange={(e) => set("au", e.target.value)} className="h-9 w-40" />
            </div>
            <span className="text-xs text-muted-foreground">
              {loading ? "…" : `${mouvements.length} mouvement${mouvements.length !== 1 ? "s" : ""}`}
              {!loading && mouvements.length === LIMIT && ` (limité aux ${LIMIT} plus récents — affinez les filtres)`}
            </span>
            {active > 0 && (
              <Button variant="ghost" size="sm" onClick={clear} className="h-9 gap-1.5 ml-auto text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />Effacer les filtres ({active})
              </Button>
            )}
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Date</th>
                <th className="text-left font-medium px-4 py-3">Type</th>
                <th className="text-left font-medium px-4 py-3">Article</th>
                <th className="text-left font-medium px-4 py-3">Dépôt</th>
                <th className="text-right font-medium px-4 py-3">Quantité</th>
                <th className="text-left font-medium px-4 py-3">Référence</th>
                <th className="text-left font-medium px-4 py-3">Utilisateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mouvements.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  {active > 0 ? "Aucun mouvement ne correspond aux filtres." : "Aucun mouvement enregistré."}
                </td></tr>
              )}
              {mouvements.map((m) => {
                const Icon = iconFor(m.type_mouvement);
                const negative = isSortie(m.type_mouvement, Number(m.quantite));
                const qte = Math.abs(Number(m.quantite));
                return (
                  <tr key={m.id} className="hover:bg-muted/30 transition-base">
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{formatDateTime(m.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${negative ? "text-warning" : "text-success"}`} />
                        <span className="text-sm">{mouvementLabel[m.type_mouvement] ?? m.type_mouvement}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{m.article_code}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[260px]">{m.article_designation}</p>
                    </td>
                    <td className="px-4 py-3 text-foreground">{m.depot_code}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${negative ? "text-warning" : "text-success"}`}>
                      {negative ? "−" : "+"}{qte}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{m.reference_doc ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.user_nom ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
