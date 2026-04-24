import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search, AlertTriangle, Loader2, Package, Warehouse,
  TrendingDown, BarChart3, Filter, X, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, Eye
} from "lucide-react";
import { stockApi, depotsApi } from "@/lib/api";
import { formatNum, typeDepotLabel } from "@/data/labels";
import { useEffect, useMemo, useState, useCallback } from "react";
import { NewMouvementDialog } from "@/components/dialogs/NewMouvementDialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type SortField = "article_code" | "article_designation" | "depot_nom" | "qte_disponible" | "qte_reservee" | "seuil_alerte";
type SortDir = "asc" | "desc";
type EtatFilter = "all" | "alerte" | "bas" | "ok";

const PAGE_SIZE = 15;

function KpiCard({
  icon: Icon, label, value, sub, tone = "default", barValue, barMax,
}: {
  icon: React.ElementType; label: string; value: React.ReactNode; sub?: string;
  tone?: "default" | "success" | "warning" | "danger"; barValue?: number; barMax?: number;
}) {
  const toneMap = {
    default: { card: "bg-card border-border", icon: "bg-primary/10 text-primary", bar: "bg-primary" },
    success: { card: "bg-card border-border", icon: "bg-success/10 text-success", bar: "bg-success" },
    warning: { card: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800", icon: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400", bar: "bg-amber-500" },
    danger: { card: "bg-destructive/5 border-destructive/20", icon: "bg-destructive/10 text-destructive", bar: "bg-destructive" },
  };
  const t = toneMap[tone];
  const pct = barValue != null && barMax ? Math.min(100, (barValue / barMax) * 100) : null;

  return (
    <div className={cn("rounded-2xl border p-5 flex flex-col gap-3 transition-shadow hover:shadow-md", t.card)}>
      <div className="flex items-start justify-between">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", t.icon)}>
          <Icon className="w-5 h-5" />
        </div>
        {pct != null && (
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">{Math.round(pct)}%</span>
        )}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-0.5 tabular-nums leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {pct != null && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-700", t.bar)} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function StockBar({ dispo, reserve, seuil }: { dispo: number; reserve: number; seuil: number }) {
  const total = Math.max(dispo + reserve, seuil * 2, 1);
  const dispoPct = Math.min(100, (dispo / total) * 100);
  const reservePct = Math.min(100 - dispoPct, (reserve / total) * 100);
  const seuilPct = Math.min(100, (seuil / total) * 100);
  const isAlert = dispo <= seuil;
  const isWarn = !isAlert && dispo <= seuil * 1.5;

  return (
    <div className="relative h-2 w-full rounded-full bg-muted overflow-visible mt-1.5 min-w-[80px]">
      <div
        className={cn("absolute left-0 top-0 h-full rounded-full", isAlert ? "bg-destructive" : isWarn ? "bg-amber-500" : "bg-success")}
        style={{ width: `${dispoPct}%` }}
      />
      {reserve > 0 && (
        <div
          className="absolute top-0 h-full rounded-r-full bg-blue-400/60"
          style={{ left: `${dispoPct}%`, width: `${reservePct}%` }}
        />
      )}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3.5 bg-foreground/40 rounded-full"
        style={{ left: `${seuilPct}%` }}
        title={`Seuil: ${formatNum(seuil)}`}
      />
    </div>
  );
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
  return sortDir === "asc"
    ? <ArrowUp className="w-3 h-3 ml-1 text-primary" />
    : <ArrowDown className="w-3 h-3 ml-1 text-primary" />;
}

export default function StockPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole("ADMIN", "MAGASINIER");
  const [search, setSearch] = useState("");
  const [depot, setDepot] = useState("all");
  const [etat, setEtat] = useState<EtatFilter>("all");
  const [sortField, setSortField] = useState<SortField>("article_designation");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [stock, setStock] = useState<any[]>([]);
  const [depotsList, setDepotsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([stockApi.list(), depotsApi.list()])
      .then(([s, d]) => { setStock(s); setDepotsList(d); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const totalDispo = stock.reduce((s, x) => s + Number(x.qte_disponible), 0);
  const totalReserve = stock.reduce((s, x) => s + Number(x.qte_reservee || 0), 0);
  const alertCount = stock.filter((s) => Number(s.qte_disponible) <= Number(s.seuil_alerte)).length;
  const warnCount = stock.filter((s) => {
    const d = Number(s.qte_disponible), seuil = Number(s.seuil_alerte);
    return d > seuil && d <= seuil * 1.5;
  }).length;
  const articlesCount = new Set(stock.map((s) => s.article_code)).size;
  const okRate = stock.length ? Math.round(((stock.length - alertCount - warnCount) / stock.length) * 100) : 0;

  const filtered = useMemo(() => {
    let rows = stock.filter((s) => {
      if (depot !== "all" && String(s.depot_id) !== String(depot)) return false;
      if (search) {
        const txt = `${s.article_code} ${s.article_designation} ${s.depot_nom}`.toLowerCase();
        if (!txt.includes(search.toLowerCase())) return false;
      }
      if (etat === "alerte") return Number(s.qte_disponible) <= Number(s.seuil_alerte);
      if (etat === "bas") {
        const d = Number(s.qte_disponible), seuil = Number(s.seuil_alerte);
        return d > seuil && d <= seuil * 1.5;
      }
      if (etat === "ok") {
        const d = Number(s.qte_disponible), seuil = Number(s.seuil_alerte);
        return d > seuil * 1.5;
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      let va: any = a[sortField], vb: any = b[sortField];
      if (["qte_disponible", "qte_reservee", "seuil_alerte"].includes(sortField)) {
        va = Number(va); vb = Number(vb);
      } else {
        va = String(va ?? "").toLowerCase(); vb = String(vb ?? "").toLowerCase();
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [search, depot, etat, stock, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setPage(1);
  };

  const hasFilters = search !== "" || depot !== "all" || etat !== "all";
  const clearFilters = () => { setSearch(""); setDepot("all"); setEtat("all"); setPage(1); };

  const th = (label: string, field: SortField, align: "left" | "right" = "left") => (
    <th
      className={cn("px-4 py-3 font-semibold text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap", align === "right" ? "text-right" : "text-left")}
      onClick={() => toggleSort(field)}
    >
      <span className={cn("inline-flex items-center gap-0.5", align === "right" && "flex-row-reverse")}>
        {label}<SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </span>
    </th>
  );

  return (
    <AppLayout>
      <PageHeader
        breadcrumb="Opérations"
        title="État du stock"
        description="Suivi multi-dépôts en temps réel — magasin central, dépôts secondaires, stocks chantier."
        actions={canWrite ? <NewMouvementDialog onSuccess={loadData} /> : undefined}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={Package}
          label="Articles référencés"
          value={articlesCount}
          sub={`${stock.length} lignes de stock`}
          tone="default"
        />
        <KpiCard
          icon={BarChart3}
          label="Total disponible"
          value={<>{formatNum(totalDispo)} <span className="text-base font-normal text-muted-foreground">u.</span></>}
          sub={`Dont ${formatNum(totalReserve)} réservées`}
          tone="success"
          barValue={totalDispo - totalReserve}
          barMax={totalDispo || 1}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Alertes seuil"
          value={alertCount}
          sub={`${warnCount} articles en niveau bas`}
          tone={alertCount > 0 ? "danger" : "success"}
          barValue={alertCount}
          barMax={stock.length || 1}
        />
        <KpiCard
          icon={Warehouse}
          label="Taux de conformité"
          value={`${okRate}%`}
          sub={`${stock.length - alertCount - warnCount} articles en stock OK`}
          tone={okRate >= 80 ? "success" : okRate >= 60 ? "warning" : "danger"}
          barValue={okRate}
          barMax={100}
        />
      </div>

      {/* Table card */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">

        {/* Filter bar */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Rechercher par article, code, dépôt…"
                className="pl-9 h-9"
              />
              {search && (
                <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Depot select */}
            <Select value={depot} onValueChange={(v) => { setDepot(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-full sm:w-52">
                <Warehouse className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Tous les dépôts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les dépôts</SelectItem>
                {depotsList.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    <span className="font-mono text-xs mr-2">{d.code}</span>{d.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* État filter */}
            <Select value={etat} onValueChange={(v) => { setEtat(v as EtatFilter); setPage(1); }}>
              <SelectTrigger className="h-9 w-full sm:w-44">
                <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="État" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les états</SelectItem>
                <SelectItem value="alerte">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-destructive" />Alerte seuil</span>
                </SelectItem>
                <SelectItem value="bas">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" />Niveau bas</span>
                </SelectItem>
                <SelectItem value="ok">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-success" />Stock OK</span>
                </SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />Effacer
              </Button>
            )}
          </div>

          {/* Results info + active filter badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
              {hasFilters && ` sur ${stock.length}`}
            </span>
            {etat !== "all" && (
              <Badge variant="secondary" className="text-xs gap-1">
                {etat === "alerte" ? "Alerte seuil" : etat === "bas" ? "Niveau bas" : "Stock OK"}
                <button onClick={() => setEtat("all")}><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {depot !== "all" && (
              <Badge variant="secondary" className="text-xs gap-1">
                {depotsList.find((d) => String(d.id) === depot)?.code ?? depot}
                <button onClick={() => setDepot("all")}><X className="w-3 h-3" /></button>
              </Badge>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin opacity-40" />
            <p className="text-sm">Chargement du stock…</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                  <tr>
                    {th("Code", "article_code")}
                    {th("Article", "article_designation")}
                    {th("Dépôt", "depot_nom")}
                    {th("Disponible", "qte_disponible", "right")}
                    {th("Réservé", "qte_reservee", "right")}
                    {th("Seuil", "seuil_alerte", "right")}
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Niveau</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">État</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <Package className="w-10 h-10 opacity-20" />
                          <p className="text-sm font-medium">Aucun article trouvé</p>
                          {hasFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5">
                              <X className="w-3.5 h-3.5" />Effacer les filtres
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : pageRows.map((s) => {
                    const dispo = Number(s.qte_disponible);
                    const reserve = Number(s.qte_reservee || 0);
                    const seuil = Number(s.seuil_alerte);
                    const isAlert = dispo <= seuil;
                    const isWarn = !isAlert && dispo <= seuil * 1.5;
                    const isSelected = selected === s.id;
                    const typeLabel = (typeDepotLabel as Record<string, string>)[s.type_depot] ?? s.type_depot;

                    return (
                      <tr
                        key={s.id}
                        onClick={() => setSelected(isSelected ? null : s.id)}
                        className={cn(
                          "group transition-colors cursor-pointer",
                          isAlert
                            ? "bg-destructive/[0.03] hover:bg-destructive/[0.07]"
                            : isWarn
                            ? "hover:bg-amber-50/50 dark:hover:bg-amber-950/10"
                            : "hover:bg-muted/40",
                          isSelected && "ring-2 ring-inset ring-primary/20",
                        )}
                      >
                        {/* Code */}
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{s.article_code}</span>
                        </td>

                        {/* Article */}
                        <td className="px-4 py-3.5 max-w-[220px]">
                          <p className="font-medium truncate leading-tight">{s.article_designation}</p>
                          {s.article_categorie && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{s.article_categorie}</p>
                          )}
                        </td>

                        {/* Dépôt */}
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-sm">{s.depot_nom}</p>
                          <p className="text-xs text-muted-foreground">{typeLabel}</p>
                        </td>

                        {/* Disponible */}
                        <td className="px-4 py-3.5 text-right">
                          <span className={cn("font-bold tabular-nums text-base", isAlert && "text-destructive", isWarn && "text-amber-600 dark:text-amber-400")}>
                            {formatNum(dispo)}
                          </span>
                          {s.article_unite && (
                            <span className="ml-1 text-xs text-muted-foreground font-normal">{s.article_unite}</span>
                          )}
                        </td>

                        {/* Réservé */}
                        <td className="px-4 py-3.5 text-right">
                          {reserve > 0 ? (
                            <span className="tabular-nums text-blue-600 dark:text-blue-400 font-medium">{formatNum(reserve)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Seuil */}
                        <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground text-xs">{formatNum(seuil)}</td>

                        {/* Barre de niveau */}
                        <td className="px-4 py-3.5 w-28">
                          <StockBar dispo={dispo} reserve={reserve} seuil={seuil} />
                          <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                            {seuil > 0 ? `${Math.round((dispo / seuil) * 100)}% du seuil` : "—"}
                          </p>
                        </td>

                        {/* État */}
                        <td className="px-4 py-3.5">
                          {isAlert
                            ? <StatusBadge tone="destructive">Sous seuil</StatusBadge>
                            : isWarn
                            ? <StatusBadge tone="warning">Niveau bas</StatusBadge>
                            : <StatusBadge tone="success">Stock OK</StatusBadge>}
                        </td>

                        {/* Action */}
                        <td className="px-2 py-3.5">
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} sur {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                    return (
                      <Button
                        key={p}
                        variant={p === page ? "default" : "ghost"}
                        size="icon"
                        className="h-7 w-7 text-xs"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    );
                  })}
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 px-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 rounded-full bg-success inline-block" />Stock OK
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 rounded-full bg-amber-500 inline-block" />Niveau bas (≤ 1.5× seuil)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 rounded-full bg-destructive inline-block" />Sous seuil d'alerte
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 rounded-full bg-blue-400 inline-block" />Quantité réservée
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-0.5 h-3.5 bg-foreground/40 inline-block" />Marqueur seuil
        </span>
      </div>
    </AppLayout>
  );
}
