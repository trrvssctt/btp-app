import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight, AlertTriangle, FileText, HardHat, TrendingUp,
  Package, ArrowDownToLine, ArrowUpFromLine, RefreshCw, RotateCcw,
  Loader2, CheckCircle2, Clock, Zap, BarChart2, Activity,
  ChevronRight, CircleAlert,
} from "lucide-react";
import { Link } from "react-router-dom";
import { projectsApi, requestsApi, stockApi, stockMovementsApi } from "@/lib/api";
import { formatDateTime, formatEur, mouvementLabel, statutDemandeLabel, statutDemandeTone, urgenceTone } from "@/data/labels";
import { NewDemandeDialog } from "@/components/dialogs/NewDemandeDialog";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/* ─── helpers ──────────────────────────────────────────────────── */

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function todayFr() {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function Initials({ name }: { name?: string }) {
  const parts = (name ?? "?").split(" ").filter(Boolean);
  const ini = parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
  const colors = ["bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700"];
  const idx = (name?.charCodeAt(0) ?? 0) % colors.length;
  return (
    <span className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0", colors[idx])}>
      {ini}
    </span>
  );
}

const mvtIcon: Record<string, React.ElementType> = {
  ENTREE_ACHAT: ArrowDownToLine,
  SORTIE_CHANTIER: ArrowUpFromLine,
  AJUSTEMENT_INVENTAIRE: RefreshCw,
  RETOUR_CHANTIER: RotateCcw,
};

const urgenceColor: Record<string, string> = {
  CRITIQUE: "bg-destructive",
  HAUTE: "bg-orange-500",
  URGENTE: "bg-amber-500",
  NORMALE: "bg-muted-foreground/30",
};

/* ─── sub-components ────────────────────────────────────────────── */

function BigKpi({
  label, value, sub, icon: Icon, tone, delta,
}: {
  label: string; value: React.ReactNode; sub?: string;
  icon: React.ElementType; tone: "primary" | "success" | "warning" | "danger";
  delta?: { val: string; up: boolean };
}) {
  const cfg = {
    primary: {
      wrap: "from-slate-800 to-slate-700 dark:from-slate-700 dark:to-slate-600",
      icon: "bg-white/10",
      text: "text-white",
      sub: "text-white/60",
      delta: "bg-white/15 text-white",
    },
    success: {
      wrap: "from-emerald-600 to-emerald-500 dark:from-emerald-700 dark:to-emerald-600",
      icon: "bg-white/15",
      text: "text-white",
      sub: "text-white/60",
      delta: "bg-white/15 text-white",
    },
    warning: {
      wrap: "from-amber-500 to-amber-400 dark:from-amber-600 dark:to-amber-500",
      icon: "bg-white/15",
      text: "text-white",
      sub: "text-white/60",
      delta: "bg-white/15 text-white",
    },
    danger: {
      wrap: "from-rose-600 to-rose-500 dark:from-rose-700 dark:to-rose-600",
      icon: "bg-white/15",
      text: "text-white",
      sub: "text-white/60",
      delta: "bg-white/15 text-white",
    },
  }[tone];

  return (
    <div className={cn("relative rounded-2xl bg-gradient-to-br p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow", cfg.wrap)}>
      {/* Decorative circle */}
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/5" />
      <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-black/10" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className={cn("text-xs font-semibold uppercase tracking-wider", cfg.sub)}>{label}</p>
          <p className={cn("text-3xl font-extrabold tracking-tight tabular-nums", cfg.text)}>{value}</p>
          {sub && <p className={cn("text-xs", cfg.sub)}>{sub}</p>}
          {delta && (
            <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1", cfg.delta)}>
              {delta.up ? "▲" : "▼"} {delta.val}
            </span>
          )}
        </div>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", cfg.icon)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title, sub, action, icon: Icon, children, className,
}: {
  title: string; sub?: string; action?: React.ReactNode; icon?: React.ElementType;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-card border border-border shadow-sm overflow-hidden flex flex-col", className)}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0"><Icon className="w-3.5 h-3.5 text-muted-foreground" /></div>}
          <div className="min-w-0">
            <h2 className="font-semibold text-sm text-foreground leading-tight">{title}</h2>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-12 text-muted-foreground">
      <Icon className="w-8 h-8 opacity-20" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function ViewAll({ to, label = "Tout voir" }: { to: string; label?: string }) {
  return (
    <Button asChild variant="ghost" size="sm" className="gap-1 h-7 text-xs text-muted-foreground hover:text-foreground">
      <Link to={to}>{label} <ChevronRight className="w-3.5 h-3.5" /></Link>
    </Button>
  );
}

/* ─── page ──────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [projets, setProjets] = useState<any[]>([]);
  const [demandes, setDemandes] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [mouvements, setMouvements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      projectsApi.list(),
      requestsApi.list(),
      stockApi.list(),
      stockMovementsApi.list(),
    ]).then(([p, d, s, m]) => {
      setProjets(p); setDemandes(d); setStock(s); setMouvements(m);
    }).finally(() => setLoading(false));
  }, []);

  const demandesAttente = demandes.filter((d) =>
    ["SOUMISE", "VALIDATION_TECHNIQUE", "VALIDATION_BUDGETAIRE"].includes(d.statut)
  );
  const demandesUrgentes = demandesAttente.filter((d) => ["CRITIQUE", "HAUTE", "URGENTE"].includes(d.urgence));
  const stockAlertes = stock.filter((s) => Number(s.qte_disponible) <= Number(s.seuil_alerte));
  const stockBas = stock.filter((s) => {
    const d = Number(s.qte_disponible), seuil = Number(s.seuil_alerte);
    return d > seuil && d <= seuil * 1.5;
  });
  const budgetTotal = projets.reduce((s, p) => s + Number(p.budget_initial || 0), 0);
  const consommeTotal = projets.reduce((s, p) => s + Number(p.budget_consomme || 0), 0);
  const projetsActifs = projets.filter((p) => p.statut === "ACTIF");
  const budgetPct = budgetTotal > 0 ? Math.round((consommeTotal / budgetTotal) * 100) : 0;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin opacity-40" />
          <p className="text-sm">Chargement du tableau de bord…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* ── Hero banner ────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 shadow-lg">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl translate-y-1/2" />

        <div className="relative px-6 py-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">{todayFr()}</p>
            <h1 className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight">
              {greeting()}, <span className="text-blue-300">Responsable</span>
            </h1>
            <p className="text-white/60 text-sm mt-1.5">
              {demandesAttente.length > 0
                ? `${demandesAttente.length} demande${demandesAttente.length > 1 ? "s" : ""} en attente de validation${demandesUrgentes.length > 0 ? ` · ${demandesUrgentes.length} urgente${demandesUrgentes.length > 1 ? "s" : ""}` : ""}`
                : "Toutes les demandes sont traitées · bonne journée !"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NewDemandeDialog trigger={
              <Button size="sm" className="gap-1.5 bg-white/15 hover:bg-white/25 text-white border-white/20 border shadow-none">
                <FileText className="w-4 h-4" />Nouvelle demande
              </Button>
            } />
          </div>
        </div>

        {/* Quick stats strip */}
        <div className="relative border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/10">
          {[
            { label: "Projets actifs", val: projetsActifs.length, icon: HardHat },
            { label: "Articles en alerte", val: stockAlertes.length, icon: AlertTriangle },
            { label: "Demandes en attente", val: demandesAttente.length, icon: Clock },
            { label: "Budget consommé", val: `${budgetPct}%`, icon: BarChart2 },
          ].map(({ label, val, icon: Ic }) => (
            <div key={label} className="px-5 py-3.5 flex items-center gap-3">
              <Ic className="w-4 h-4 text-white/40 shrink-0" />
              <div>
                <p className="text-white text-lg font-bold tabular-nums leading-none">{val}</p>
                <p className="text-white/50 text-xs mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <BigKpi
          label="Demandes à valider"
          value={demandesAttente.length}
          sub={demandesUrgentes.length > 0 ? `dont ${demandesUrgentes.length} urgente${demandesUrgentes.length > 1 ? "s" : ""}` : "Aucune urgence"}
          icon={FileText}
          tone="primary"
          delta={demandesUrgentes.length > 0 ? { val: "priorité haute", up: false } : undefined}
        />
        <BigKpi
          label="Alertes stock"
          value={stockAlertes.length}
          sub={stockBas.length > 0 ? `+ ${stockBas.length} en niveau bas` : "Hors alertes : " + (stock.length - stockAlertes.length - stockBas.length)}
          icon={AlertTriangle}
          tone={stockAlertes.length > 0 ? "danger" : "success"}
        />
        <BigKpi
          label="Projets actifs"
          value={projetsActifs.length}
          sub={`${projets.length} projet${projets.length > 1 ? "s" : ""} au total`}
          icon={HardHat}
          tone="success"
        />
        <BigKpi
          label="Budget consommé"
          value={`${budgetPct}%`}
          sub={budgetTotal > 0 ? `${formatEur(consommeTotal)} / ${formatEur(budgetTotal)}` : "Aucun budget"}
          icon={TrendingUp}
          tone={budgetPct > 90 ? "danger" : budgetPct > 75 ? "warning" : "success"}
        />
      </div>

      {/* ── Main grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── Demandes (2/3) ─────────────────────── */}
        <SectionCard
          className="xl:col-span-2"
          title="Demandes à traiter"
          sub={`${demandesAttente.length} en attente · workflow de validation`}
          icon={FileText}
          action={<ViewAll to="/demandes" />}
        >
          {demandesAttente.length === 0 ? (
            <EmptyState icon={CheckCircle2} text="Aucune demande en attente" />
          ) : (
            <div className="divide-y divide-border/60">
              {demandesAttente.slice(0, 6).map((d) => (
                <Link
                  key={d.id}
                  to={`/demandes/${d.id}`}
                  className="group flex items-center gap-3.5 px-5 py-3.5 hover:bg-muted/40 transition-colors"
                >
                  {/* Urgence dot */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <span className={cn("w-2 h-2 rounded-full", urgenceColor[d.urgence] ?? "bg-muted-foreground/30")} />
                  </div>

                  {/* Initials */}
                  <Initials name={d.requester_nom} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{d.numero}</span>
                      <StatusBadge tone={(urgenceTone as Record<string, any>)[d.urgence] ?? "muted"} className="text-[10px]">{d.urgence}</StatusBadge>
                    </div>
                    <p className="text-sm font-medium text-foreground mt-0.5 truncate">{d.motif}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.project_nom} · {d.requester_nom}
                    </p>
                  </div>

                  {/* Right */}
                  <div className="text-right shrink-0 space-y-1.5">
                    <p className="text-sm font-bold tabular-nums">{formatEur(Number(d.montant_estime || 0))}</p>
                    <StatusBadge tone={(statutDemandeTone as Record<string, any>)[d.statut] ?? "muted"} className="text-[10px]">
                      {(statutDemandeLabel as Record<string, string>)[d.statut] ?? d.statut}
                    </StatusBadge>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── Alertes stock (1/3) ─────────────────── */}
        <SectionCard
          title="Alertes stock"
          sub={`${stockAlertes.length} article${stockAlertes.length !== 1 ? "s" : ""} sous seuil`}
          icon={AlertTriangle}
          action={<ViewAll to="/stock" label="Stock" />}
        >
          {stockAlertes.length === 0 ? (
            <EmptyState icon={CheckCircle2} text="Aucune alerte stock" />
          ) : (
            <div className="divide-y divide-border/60">
              {stockAlertes.slice(0, 7).map((s) => {
                const seuil = Number(s.seuil_alerte);
                const dispo = Number(s.qte_disponible);
                const pct = seuil > 0 ? Math.min(100, (dispo / seuil) * 100) : 0;
                const severity = pct === 0 ? "destructive" : pct < 50 ? "destructive" : "warning";
                return (
                  <div key={s.id} className="px-5 py-3.5 space-y-2">
                    <div className="flex items-start gap-2 justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate leading-tight">{s.article_designation}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{s.article_code}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={cn("text-sm font-bold tabular-nums", severity === "destructive" ? "text-destructive" : "text-amber-600 dark:text-amber-400")}>
                          {dispo}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">{s.article_unite ?? ""}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", severity === "destructive" ? "bg-destructive" : "bg-amber-500")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{Math.round(pct)}% du seuil</span>
                        <span>Seuil : {seuil} {s.article_unite ?? ""}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* ── Projets (2/3) ─────────────────────────── */}
        <SectionCard
          className="xl:col-span-2"
          title="Projets en cours"
          sub="Consommation budgétaire par chantier"
          icon={HardHat}
          action={<ViewAll to="/projets" />}
        >
          <div className="divide-y divide-border/60">
            {projets.filter((p) => p.statut !== "TERMINE").slice(0, 4).length === 0 ? (
              <EmptyState icon={HardHat} text="Aucun projet en cours" />
            ) : projets.filter((p) => p.statut !== "TERMINE").slice(0, 4).map((p) => {
              const bI = Number(p.budget_initial || 0);
              const bC = Number(p.budget_consomme || 0);
              const pct = bI > 0 ? Math.round((bC / bI) * 100) : 0;
              const isOver = pct > 100;
              const isWarn = pct > 80;

              return (
                <div key={p.id} className="group px-5 py-4 flex items-start gap-4 hover:bg-muted/30 transition-colors">
                  {/* Color accent */}
                  <div className={cn(
                    "w-1 rounded-full self-stretch shrink-0",
                    isOver ? "bg-destructive" : isWarn ? "bg-amber-500" : "bg-success",
                  )} />

                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate leading-tight">{p.nom}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.client}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("text-base font-extrabold tabular-nums", isOver ? "text-destructive" : isWarn ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
                          {pct}%
                        </p>
                        <StatusBadge
                          tone={p.statut === "ACTIF" ? "success" : p.statut === "EN_PAUSE" ? "warning" : "muted"}
                          className="text-[10px] mt-0.5"
                        >
                          {p.statut}
                        </StatusBadge>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Progress
                        value={Math.min(pct, 100)}
                        className={cn("h-2", isOver && "[&>div]:bg-destructive", isWarn && !isOver && "[&>div]:bg-amber-500")}
                      />
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{formatEur(bC)} consommés</span>
                        <span>Budget : {formatEur(bI)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* ── Mouvements récents (1/3) ──────────────── */}
        <SectionCard
          title="Mouvements récents"
          sub="Dernières opérations de stock"
          icon={Activity}
          action={<ViewAll to="/mouvements" label="Historique" />}
        >
          {mouvements.length === 0 ? (
            <EmptyState icon={Package} text="Aucun mouvement" />
          ) : (
            <div className="divide-y divide-border/60">
              {mouvements.slice(0, 8).map((m) => {
                const isSortie = m.type_mouvement?.includes("SORTIE") || m.type_mouvement === "TRANSFERT_SORTANT";
                const isNeutral = m.type_mouvement === "AJUSTEMENT_INVENTAIRE";
                const MvtIc = mvtIcon[m.type_mouvement] ?? Package;
                const qty = Math.abs(Number(m.quantite));

                return (
                  <div key={m.id} className="px-5 py-3 flex items-center gap-3">
                    {/* Icon */}
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                      isNeutral ? "bg-muted text-muted-foreground"
                        : isSortie ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
                    )}>
                      <MvtIc className="w-4 h-4" />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate leading-tight">
                        {m.article_designation ?? m.article_code}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {mouvementLabel[m.type_mouvement] ?? m.type_mouvement}
                        {" · "}{formatDateTime(m.created_at)}
                      </p>
                    </div>

                    {/* Quantity */}
                    <span className={cn(
                      "text-sm font-bold tabular-nums shrink-0",
                      isNeutral ? "text-muted-foreground"
                        : isSortie ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-600 dark:text-emerald-400",
                    )}>
                      {isNeutral ? "±" : isSortie ? "−" : "+"}{qty}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

      </div>

      {/* ── Bottom status bar ───────────────────────────────── */}
      {(stockBas.length > 0 || demandesUrgentes.length > 0) && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-5 py-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <CircleAlert className="w-4 h-4 shrink-0" />
            <p className="text-sm font-semibold">Points d'attention</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-amber-700 dark:text-amber-300">
            {demandesUrgentes.length > 0 && (
              <Link to="/demandes" className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100">
                {demandesUrgentes.length} demande{demandesUrgentes.length > 1 ? "s" : ""} urgente{demandesUrgentes.length > 1 ? "s" : ""} non traitée{demandesUrgentes.length > 1 ? "s" : ""}
              </Link>
            )}
            {stockBas.length > 0 && (
              <Link to="/stock?etat=bas" className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100">
                {stockBas.length} article{stockBas.length > 1 ? "s" : ""} en niveau bas
              </Link>
            )}
            {budgetPct > 85 && (
              <Link to="/projets" className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100">
                Budget global à {budgetPct}%
              </Link>
            )}
          </div>
          <Zap className="w-3.5 h-3.5 text-amber-500 ml-auto shrink-0" />
        </div>
      )}
    </AppLayout>
  );
}
