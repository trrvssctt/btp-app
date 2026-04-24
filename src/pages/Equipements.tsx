import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Wrench, Loader2, Search, X, MapPin, User, Package } from "lucide-react";
import { equipementsApi } from "@/lib/api";
import { NewEquipementDialog } from "@/components/dialogs/NewEquipementDialog";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

type Etat = "DISPONIBLE" | "AFFECTE" | "EN_MAINTENANCE" | "HORS_SERVICE";
type AffectFilter = "tous" | "affecte" | "libre";

const ETATS: Etat[] = ["DISPONIBLE", "AFFECTE", "EN_MAINTENANCE", "HORS_SERVICE"];

const etatTone = (e: string) =>
  e === "DISPONIBLE" ? "success" : e === "AFFECTE" ? "info" : e === "EN_MAINTENANCE" ? "warning" : "destructive";

const etatLabel: Record<string, string> = {
  DISPONIBLE: "Disponible",
  AFFECTE: "Affecté",
  EN_MAINTENANCE: "En maintenance",
  HORS_SERVICE: "Hors service",
};

const etatFilterClass = (active: boolean, etat: Etat) => {
  if (!active) return "bg-muted text-muted-foreground hover:bg-muted/70 border border-border";
  const map: Record<Etat, string> = {
    DISPONIBLE: "bg-success text-success-foreground border border-success/60 shadow-sm",
    AFFECTE: "bg-info text-info-foreground border border-info/60 shadow-sm",
    EN_MAINTENANCE: "bg-warning text-warning-foreground border border-warning/60 shadow-sm",
    HORS_SERVICE: "bg-destructive text-destructive-foreground border border-destructive/60 shadow-sm",
  };
  return map[etat];
};

export default function EquipementsPage() {
  const { hasRole } = useAuth();
  const canCreate = hasRole("ADMIN", "MAGASINIER", "CHEF_PROJET");

  const [equipements, setEquipements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [search, setSearch] = useState("");
  const [etatFilter, setEtatFilter] = useState<Etat | "tous">("tous");
  const [affectFilter, setAffectFilter] = useState<AffectFilter>("tous");
  const [chantierFilter, setChantierFilter] = useState("tous");
  const [sortBy, setSortBy] = useState<"code" | "designation" | "etat">("code");

  useEffect(() => {
    setLoading(true);
    equipementsApi.list()
      .then(setEquipements)
      .catch(() => setEquipements([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const chantiers = useMemo(() => {
    const set = new Set<string>();
    equipements.forEach((e) => { if (e.chantier_nom) set.add(e.chantier_nom); });
    return Array.from(set).sort();
  }, [equipements]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return equipements
      .filter((e) => {
        if (etatFilter !== "tous" && e.etat !== etatFilter) return false;
        if (affectFilter === "affecte" && !e.affecte_a) return false;
        if (affectFilter === "libre" && e.affecte_a) return false;
        if (chantierFilter !== "tous" && e.chantier_nom !== chantierFilter) return false;
        if (q && !e.designation?.toLowerCase().includes(q) && !e.code_inventaire?.toLowerCase().includes(q) && !(e.affecte_a ?? "").toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "code") return (a.code_inventaire ?? "").localeCompare(b.code_inventaire ?? "");
        if (sortBy === "designation") return (a.designation ?? "").localeCompare(b.designation ?? "");
        if (sortBy === "etat") return (a.etat ?? "").localeCompare(b.etat ?? "");
        return 0;
      });
  }, [equipements, search, etatFilter, affectFilter, chantierFilter, sortBy]);

  const kpis = useMemo(() =>
    ETATS.map((e) => ({ etat: e, count: equipements.filter((eq) => eq.etat === e).length })),
    [equipements],
  );

  const hasActiveFilters = search || etatFilter !== "tous" || affectFilter !== "tous" || chantierFilter !== "tous";

  const resetFilters = () => {
    setSearch("");
    setEtatFilter("tous");
    setAffectFilter("tous");
    setChantierFilter("tous");
  };

  return (
    <AppLayout>
      <PageHeader
        breadcrumb="Référentiels"
        title="Parc équipements"
        description="Suivi du matériel durable : affectation, maintenance, état."
        actions={canCreate ? <NewEquipementDialog onSuccess={() => setRefreshKey((k) => k + 1)} /> : undefined}
      />

      {/* ─── KPI cards ─── */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map(({ etat, count }) => (
            <button
              key={etat}
              onClick={() => setEtatFilter(etatFilter === etat ? "tous" : etat)}
              className={`rounded-xl border p-4 flex items-center gap-3 text-left transition-all hover:shadow-md ${etatFilter === etat ? "ring-2 ring-offset-1 ring-accent" : "bg-card border-border"}`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${
                etat === "DISPONIBLE" ? "bg-success/10 text-success" :
                etat === "AFFECTE" ? "bg-info/10 text-info" :
                etat === "EN_MAINTENANCE" ? "bg-warning/10 text-warning" :
                "bg-destructive/10 text-destructive"
              }`}>
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{etatLabel[etat]}</p>
                <p className="text-2xl font-bold tabular-nums">{count}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ─── Filtres ─── */}
      <div className="space-y-3 mb-6">
        {/* Ligne 1 : recherche + tri */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher par code, désignation, affectataire…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tri */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue placeholder="Trier par…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="code">Trier par code</SelectItem>
              <SelectItem value="designation">Trier par désignation</SelectItem>
              <SelectItem value="etat">Trier par état</SelectItem>
            </SelectContent>
          </Select>

          {/* Affectation */}
          <Select value={affectFilter} onValueChange={(v) => setAffectFilter(v as AffectFilter)}>
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue placeholder="Affectation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Toute affectation</SelectItem>
              <SelectItem value="affecte">Affecté</SelectItem>
              <SelectItem value="libre">Non affecté</SelectItem>
            </SelectContent>
          </Select>

          {/* Chantier */}
          {chantiers.length > 0 && (
            <Select value={chantierFilter} onValueChange={setChantierFilter}>
              <SelectTrigger className="h-9 w-48 text-sm">
                <SelectValue placeholder="Chantier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les chantiers</SelectItem>
                {chantiers.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Reset */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 gap-1.5 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" /> Réinitialiser
            </Button>
          )}
        </div>

        {/* Ligne 2 : filtres état par chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setEtatFilter("tous")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${etatFilter === "tous" ? "bg-accent text-accent-foreground border-accent/60 shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/70 border-border"}`}
          >
            Tous les états
          </button>
          {ETATS.map((e) => (
            <button
              key={e}
              onClick={() => setEtatFilter(etatFilter === e ? "tous" : e)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${etatFilterClass(etatFilter === e, e)}`}
            >
              {etatLabel[e]}
            </button>
          ))}
        </div>

        {/* Compteur */}
        {!loading && (filtered.length !== equipements.length || hasActiveFilters) && (
          <p className="text-xs text-muted-foreground">
            {filtered.length} équipement{filtered.length !== 1 ? "s" : ""} sur {equipements.length}
          </p>
        )}
      </div>

      {/* ─── Contenu ─── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun équipement trouvé</p>
          <p className="text-sm mt-1">Modifiez vos filtres ou ajoutez un équipement.</p>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="mt-3 gap-1.5 text-muted-foreground">
              <X className="w-3.5 h-3.5" /> Réinitialiser les filtres
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((e) => (
            <div key={e.id} className="rounded-xl bg-card border border-border p-5 shadow-sm hover:shadow-elegant transition-base">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <StatusBadge tone={etatTone(e.etat) as any}>{etatLabel[e.etat] ?? e.etat}</StatusBadge>
              </div>
              <p className="font-mono text-xs text-muted-foreground mb-1">{e.code_inventaire}</p>
              <p className="font-semibold text-foreground mb-3 leading-snug">{e.designation}</p>
              {(e.affecte_a || e.chantier_nom) ? (
                <div className="text-xs text-muted-foreground space-y-1 pt-3 border-t border-border">
                  {e.affecte_a && (
                    <p className="flex items-center gap-1.5">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="text-foreground font-medium truncate">{e.affecte_a}</span>
                    </p>
                  )}
                  {e.chantier_nom && (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{e.chantier_nom}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground italic">Non affecté</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
