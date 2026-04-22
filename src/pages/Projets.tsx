import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  MapPin, User, Loader2, Search, Building2, Calendar, TrendingUp,
  ChevronRight, Wallet, BarChart3, FolderOpen, AlertTriangle,
} from "lucide-react";
import { chantiers, projets as mockProjets } from "@/data/mock";
import { formatDate, formatEur } from "@/data/labels";
import { NewProjetDialog } from "@/components/dialogs/NewProjetDialog";
import { useApiData } from "@/hooks/useApiData";
import { projectsApi } from "@/lib/api";
import { OfflineBanner } from "@/components/OfflineBanner";

type ApiProject = {
  id: string;
  code: string;
  nom: string;
  client: string | null;
  budget_initial: number | string;
  budget_consomme: number | string;
  statut: string;
  date_debut: string | null;
  date_fin: string | null;
  sites_count?: number;
};

const STATUTS = ["Tous", "ACTIF", "SUSPENDU", "CLOTURE"] as const;
type StatutFilter = typeof STATUTS[number];

const statutTone = (s: string) =>
  s === "ACTIF" ? "success" : s === "CLOTURE" ? "muted" : "warning";

const statutFilterClass = (s: StatutFilter, active: boolean) => {
  if (!active) return "bg-muted text-muted-foreground hover:bg-muted/70 border border-border";
  if (s === "ACTIF") return "bg-success text-success-foreground border border-success/60 shadow-sm";
  if (s === "CLOTURE") return "bg-muted-foreground text-background border border-muted-foreground/60 shadow-sm";
  if (s === "SUSPENDU") return "bg-warning text-warning-foreground border border-warning/60 shadow-sm";
  return "bg-accent text-accent-foreground border border-accent/60 shadow-sm";
};

export default function ProjetsPage() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<StatutFilter>("Tous");

  const { data, loading, usingFallback } = useApiData<ApiProject[]>(
    () => projectsApi.list(),
    mockProjets.map((p) => ({
      id: p.id, code: p.code, nom: p.nom, client: p.client,
      budget_initial: p.budget, budget_consomme: p.consomme,
      statut: p.statut, date_debut: p.dateDebut, date_fin: p.dateFin,
    })),
    [refreshKey],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return data.filter((p) => {
      if (statutFilter !== "Tous" && p.statut !== statutFilter) return false;
      if (!q) return true;
      return (
        p.nom.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.client ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, search, statutFilter]);

  // Global KPIs
  const totalBudget = data.reduce((sum, p) => sum + (Number(p.budget_initial) || 0), 0);
  const totalConsomme = data.reduce((sum, p) => sum + (Number(p.budget_consomme) || 0), 0);
  const actifs = data.filter((p) => p.statut === "ACTIF").length;
  const enDepassement = data.filter((p) => {
    const b = Number(p.budget_initial) || 0;
    const c = Number(p.budget_consomme) || 0;
    return b > 0 && (c / b) > 0.95;
  }).length;

  return (
    <AppLayout>
      <PageHeader
        breadcrumb="Référentiels"
        title="Projets & chantiers"
        description="Vision opérationnelle et budgétaire de tous les projets."
        actions={<NewProjetDialog onSuccess={() => setRefreshKey((k) => k + 1)} />}
      />
      <OfflineBanner show={usingFallback} />

      {/* ─── KPI Summary ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: FolderOpen, label: "Total projets", value: data.length, sub: `${actifs} actifs`, tone: "default" as const },
          { icon: Wallet, label: "Budget global", value: formatEur(totalBudget), sub: undefined, tone: "default" as const },
          { icon: TrendingUp, label: "Consommé global", value: `${totalBudget > 0 ? Math.round((totalConsomme / totalBudget) * 100) : 0}%`, sub: formatEur(totalConsomme), tone: "default" as const },
          { icon: AlertTriangle, label: "Projets en alerte", value: enDepassement, sub: "Consommation > 95%", tone: enDepassement > 0 ? "danger" as const : "default" as const },
        ].map(({ icon: Icon, label, value, sub, tone }) => (
          <div key={label} className={`rounded-xl border p-4 flex items-start gap-3 bg-card ${tone === "danger" && enDepassement > 0 ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
            <div className={`p-2 rounded-lg mt-0.5 ${tone === "danger" && enDepassement > 0 ? "bg-destructive/10 text-destructive" : "bg-accent-soft text-accent"}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-xl font-bold tabular-nums ${tone === "danger" && enDepassement > 0 ? "text-destructive" : ""}`}>{value}</p>
              {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Filters ─── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher par nom, code, client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUTS.map((s) => (
            <button
              key={s}
              onClick={() => setStatutFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statutFilterClass(s, statutFilter === s)}`}
            >
              {s === "Tous" ? "Tous" : s}
            </button>
          ))}
        </div>
        {filtered.length !== data.length && (
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} / {data.length} projet{data.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ─── Loading ─── */}
      {loading && (
        <div className="text-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" />Chargement…
        </div>
      )}

      {/* ─── Empty state ─── */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun projet trouvé</p>
          <p className="text-sm mt-1">Modifiez vos filtres ou créez un nouveau projet.</p>
        </div>
      )}

      {/* ─── Project cards ─── */}
      <div className="space-y-4">
        {!loading && filtered.map((p) => {
          const budget = Number(p.budget_initial) || 0;
          const consomme = Number(p.budget_consomme) || 0;
          const pct = budget > 0 ? (consomme / budget) * 100 : 0;
          const overrun = pct > 95;
          const chs = usingFallback ? chantiers.filter((c) => c.projetId === p.id) : [];
          const sitesCount = p.sites_count ?? chs.length;

          return (
            <div
              key={p.id}
              onClick={() => navigate(`/projets/${p.id}`)}
              className="group rounded-2xl bg-card border border-border shadow-sm overflow-hidden hover:shadow-lg hover:border-accent/30 transition-all cursor-pointer"
            >
              {/* Card header */}
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{p.code}</span>
                      <StatusBadge tone={statutTone(p.statut)}>{p.statut}</StatusBadge>
                      {sitesCount > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {sitesCount} chantier{sitesCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-foreground truncate group-hover:text-accent transition-colors">
                      {p.nom}
                    </h3>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      {p.client && (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          {p.client}
                        </span>
                      )}
                      {p.date_debut && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          {formatDate(p.date_debut)} → {p.date_fin ? formatDate(p.date_fin) : "—"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Budget block */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground mb-1">Budget consommé</p>
                      <p className={`text-2xl font-bold tabular-nums ${overrun ? "text-destructive" : "text-foreground"}`}>
                        {Math.round(pct)}%
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatEur(consomme)} / {formatEur(budget)}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <Progress
                    value={Math.min(pct, 100)}
                    className={`h-1.5 ${overrun ? "[&>div]:bg-destructive" : ""}`}
                  />
                </div>
              </div>

              {/* Chantiers preview (mock fallback only) */}
              {chs.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/50">
                  {chs.slice(0, 3).map((c) => (
                    <div
                      key={c.id}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-card px-4 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-xs truncate">{c.nom}</p>
                        <StatusBadge
                          tone={c.statut === "ACTIF" ? "success" : c.statut === "PAUSE" ? "warning" : "muted"}
                          dot
                        >
                          {c.statut}
                        </StatusBadge>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{c.localisation}</p>
                        <p className="flex items-center gap-1.5"><User className="w-3 h-3" />{c.responsable}</p>
                      </div>
                      <div className="mt-2.5">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Avancement</span>
                          <span className="font-semibold tabular-nums">{c.avancement}%</span>
                        </div>
                        <Progress value={c.avancement} className="h-1" />
                      </div>
                    </div>
                  ))}
                  {chs.length > 3 && (
                    <div className="bg-card px-4 py-3 flex items-center justify-center text-xs text-muted-foreground">
                      +{chs.length - 3} chantier{chs.length - 3 > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
