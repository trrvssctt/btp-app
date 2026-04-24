import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight, AlertTriangle, FileText, HardHat, TrendingUp,
  Package, ArrowDownToLine, ArrowUpFromLine, RefreshCw, RotateCcw,
  Loader2, CheckCircle2, Clock, Zap, BarChart2, Activity,
  ChevronRight, CircleAlert, ShieldCheck, User, Lock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { projectsApi, requestsApi, stockApi, stockMovementsApi } from "@/lib/api";
import { formatDateTime, formatEur, mouvementLabel, statutDemandeLabel, statutDemandeTone, urgenceTone } from "@/data/labels";
import { NewDemandeDialog } from "@/components/dialogs/NewDemandeDialog";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

/* ─── role config ───────────────────────────────────────────────── */

const ROLE_INFO: Record<string, { label: string; desc: string; color: string; access: string[] }> = {
  ADMIN:          { label: "Administrateur",                    desc: "Accès complet au système, gestion des utilisateurs et paramètres.",            color: "bg-violet-600",  access: ["Tout le système", "Paramètres", "Utilisateurs"] },
  DEMANDEUR:      { label: "Demandeur",                         desc: "Exprimez vos besoins terrain et suivez vos demandes de matériaux.",             color: "bg-blue-600",    access: ["Créer des demandes", "Suivre mes demandes", "Notifications"] },
  CONDUCTEUR:     { label: "Conducteur de travaux",             desc: "Pilotez vos chantiers, créez des demandes et gérez les équipements.",           color: "bg-indigo-600",  access: ["Demandes", "Projets & chantiers", "Stock", "Équipements"] },
  RESP_TECHNIQUE: { label: "Responsable technique",             desc: "Validez techniquement les demandes de besoin avant passage budgétaire.",        color: "bg-cyan-600",    access: ["Validation technique des demandes"] },
  CONTROLEUR:     { label: "Contrôleur budgétaire",             desc: "Contrôlez la conformité budgétaire des demandes et suivez la consommation.",    color: "bg-teal-600",    access: ["Validation budgétaire des demandes", "Reporting"] },
  CHEF_PROJET:    { label: "Chef de projet",                    desc: "Pilotez les projets, gérez les budgets et validez les demandes budgétaires.",   color: "bg-emerald-600", access: ["Projets & budgets", "Validation budgétaire", "Reporting", "Lots budgétaires"] },
  DAF:            { label: "Directeur Administratif & Financier", desc: "Approbation financière finale des demandes et supervision des budgets.",      color: "bg-amber-600",   access: ["Approbation finale des demandes", "Reporting budgétaire"] },
  DG:             { label: "Directeur Général",                 desc: "Vision globale de l'activité, pilotage stratégique et reporting.",              color: "bg-orange-600",  access: ["Reporting", "Tableau de bord global"] },
  MAGASINIER:     { label: "Magasinier",                        desc: "Gérez les stocks, enregistrez les mouvements et traitez les réceptions.",       color: "bg-rose-600",    access: ["Stock", "Mouvements", "Transferts", "Réceptions", "Articles"] },
  ACHETEUR:       { label: "Acheteur",                          desc: "Émettez les commandes fournisseurs et réceptionnez les livraisons.",            color: "bg-pink-600",    access: ["Achats", "Réceptions", "Articles"] },
  RESP_LOGISTIQUE:{ label: "Responsable logistique",            desc: "Coordonnez les flux logistiques entre dépôts et chantiers.",                   color: "bg-red-600",     access: ["Stock", "Mouvements", "Transferts", "Achats", "Réceptions"] },
  AUDITEUR:       { label: "Auditeur",                          desc: "Consultez le journal d'audit et vérifiez la conformité des opérations.",        color: "bg-slate-600",   access: ["Journal d'audit", "Reporting (lecture seule)"] },
};

/* ─── helpers ───────────────────────────────────────────────────── */

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function todayFr() {
  return new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
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

/* ─── sub-components ─────────────────────────────────────────────── */

function BigKpi({ label, value, sub, icon: Icon, tone, delta }: {
  label: string; value: React.ReactNode; sub?: string;
  icon: React.ElementType; tone: "primary" | "success" | "warning" | "danger";
  delta?: { val: string; up: boolean };
}) {
  const cfg = {
    primary: { wrap: "from-slate-800 to-slate-700", icon: "bg-white/10", text: "text-white", sub: "text-white/60", delta: "bg-white/15 text-white" },
    success: { wrap: "from-emerald-600 to-emerald-500", icon: "bg-white/15", text: "text-white", sub: "text-white/60", delta: "bg-white/15 text-white" },
    warning: { wrap: "from-amber-500 to-amber-400", icon: "bg-white/15", text: "text-white", sub: "text-white/60", delta: "bg-white/15 text-white" },
    danger:  { wrap: "from-rose-600 to-rose-500", icon: "bg-white/15", text: "text-white", sub: "text-white/60", delta: "bg-white/15 text-white" },
  }[tone];
  return (
    <div className={cn("relative rounded-2xl bg-gradient-to-br p-5 overflow-hidden shadow-sm hover:shadow-md transition-shadow", cfg.wrap)}>
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

function SectionCard({ title, sub, action, icon: Icon, children, className }: {
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

/* ─── role-aware request filter ─────────────────────────────────── */

function pendingForRole(demandes: any[], perms: string[]): any[] {
  if (perms.includes("REQUEST_VALIDATE_DIRECTION")) {
    return demandes.filter((d) => d.statut === "VALIDATION_DIRECTION");
  }
  if (perms.includes("REQUEST_VALIDATE_BUDGET")) {
    return demandes.filter((d) => d.statut === "VALIDATION_BUDGETAIRE");
  }
  if (perms.includes("REQUEST_VALIDATE_TECH")) {
    return demandes.filter((d) => d.statut === "VALIDATION_TECHNIQUE");
  }
  return demandes.filter((d) =>
    ["SOUMISE", "VALIDATION_TECHNIQUE", "VALIDATION_BUDGETAIRE", "VALIDATION_DIRECTION"].includes(d.statut)
  );
}

function pendingLabelForRole(perms: string[]): string {
  if (perms.includes("REQUEST_VALIDATE_DIRECTION")) return "En attente de votre approbation";
  if (perms.includes("REQUEST_VALIDATE_BUDGET"))    return "En attente de validation budgétaire";
  if (perms.includes("REQUEST_VALIDATE_TECH"))      return "En attente de validation technique";
  return "En attente de validation";
}

/* ─── constants ─────────────────────────────────────────────────── */

const STOCK_ROLES = ["MAGASINIER", "CONDUCTEUR", "CHEF_PROJET", "RESP_TECHNIQUE", "RESP_LOGISTIQUE"];
const PROJET_ROLES = ["CHEF_PROJET", "CONDUCTEUR", "ADMIN", "DG", "DAF", "CONTROLEUR"];
const MVT_ROLES = ["MAGASINIER", "RESP_LOGISTIQUE", "ADMIN"];

/* ─── page ──────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { user, hasPermission, hasRole } = useAuth();
  const canCreate  = hasPermission("REQUEST_CREATE");
  const canSeeStock   = hasRole(...STOCK_ROLES);
  const canSeeProjets = hasRole(...PROJET_ROLES);
  const canSeeMvt     = hasRole(...MVT_ROLES);

  const primaryRole = user?.roles?.[0] ?? "DEMANDEUR";
  const roleInfo = ROLE_INFO[primaryRole] ?? ROLE_INFO["DEMANDEUR"];
  const permissions: string[] = user?.permissions ?? [];
  const isValidator = permissions.some((p) =>
    ["REQUEST_VALIDATE_TECH", "REQUEST_VALIDATE_BUDGET", "REQUEST_VALIDATE_DIRECTION"].includes(p)
  );

  const [projets, setProjets]     = useState<any[]>([]);
  const [demandes, setDemandes]   = useState<any[]>([]);
  const [stock, setStock]         = useState<any[]>([]);
  const [mouvements, setMouvements] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const calls: Promise<any>[] = [requestsApi.list()];
    if (canSeeProjets || hasRole("ADMIN")) calls.push(projectsApi.list());
    if (canSeeStock)  calls.push(stockApi.list());
    if (canSeeMvt)    calls.push(stockMovementsApi.list());

    Promise.all(calls).then(([dem, ...rest]) => {
      setDemandes(dem ?? []);
      let idx = 0;
      if (canSeeProjets || hasRole("ADMIN")) { setProjets(rest[idx] ?? []); idx++; }
      if (canSeeStock)  { setStock(rest[idx] ?? []); idx++; }
      if (canSeeMvt)    { setMouvements(rest[idx] ?? []); }
    }).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── derived data ── */
  const myPending       = pendingForRole(demandes, permissions);
  const myPendingUrgent = myPending.filter((d) => ["CRITIQUE", "HAUTE", "URGENTE"].includes(d.urgence));
  const myPendingLabel  = pendingLabelForRole(permissions);

  const stockAlertes = stock.filter((s) => Number(s.qte_disponible) <= Number(s.seuil_alerte));
  const stockBas     = stock.filter((s) => {
    const d = Number(s.qte_disponible), seuil = Number(s.seuil_alerte);
    return d > seuil && d <= seuil * 1.5;
  });
  const projetsActifs = projets.filter((p) => p.statut === "ACTIF");
  const budgetTotal   = projets.reduce((s, p) => s + Number(p.budget_initial || 0), 0);
  const consommeTotal = projets.reduce((s, p) => s + Number(p.budget_consomme || 0), 0);
  const budgetPct     = budgetTotal > 0 ? Math.round((consommeTotal / budgetTotal) * 100) : 0;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin opacity-40" />
          <p className="text-sm">Chargement de votre espace…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>

      {/* ── Hero banner ────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 shadow-lg">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl translate-y-1/2" />

        <div className="relative px-6 py-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">{todayFr()}</p>
            <h1 className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              {greeting()}, <span className="text-blue-300">{user?.nom?.split(" ")[0] ?? "Utilisateur"}</span>
            </h1>

            {/* Role badge + description */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full text-white", roleInfo.color)}>
                <User className="w-3 h-3" />
                {roleInfo.label}
              </span>
              <span className="text-white/60 text-xs">{roleInfo.desc}</span>
            </div>

            {/* Access badges */}
            <div className="flex flex-wrap gap-1.5">
              {roleInfo.access.map((a) => (
                <span key={a} className="inline-flex items-center gap-1 text-[11px] bg-white/10 text-white/80 px-2 py-0.5 rounded-md">
                  <Lock className="w-2.5 h-2.5 opacity-60" />{a}
                </span>
              ))}
            </div>
          </div>

          {canCreate && (
            <div className="flex items-center gap-2 shrink-0 mt-1">
              <NewDemandeDialog trigger={
                <Button size="sm" className="gap-1.5 bg-white/15 hover:bg-white/25 text-white border-white/20 border shadow-none">
                  <FileText className="w-4 h-4" /> Nouvelle demande
                </Button>
              } />
            </div>
          )}
        </div>

        {/* Quick stats strip — adapté au rôle */}
        <div className="relative border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/10">
          <div className="px-5 py-3.5 flex items-center gap-3">
            <Clock className="w-4 h-4 text-white/40 shrink-0" />
            <div>
              <p className="text-white text-lg font-bold tabular-nums leading-none">{myPending.length}</p>
              <p className="text-white/50 text-xs mt-0.5">
                {isValidator ? "Demandes à traiter" : "Demandes en cours"}
              </p>
            </div>
          </div>
          {canSeeStock && (
            <div className="px-5 py-3.5 flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-white/40 shrink-0" />
              <div>
                <p className="text-white text-lg font-bold tabular-nums leading-none">{stockAlertes.length}</p>
                <p className="text-white/50 text-xs mt-0.5">Alertes stock</p>
              </div>
            </div>
          )}
          {canSeeProjets && (
            <div className="px-5 py-3.5 flex items-center gap-3">
              <HardHat className="w-4 h-4 text-white/40 shrink-0" />
              <div>
                <p className="text-white text-lg font-bold tabular-nums leading-none">{projetsActifs.length}</p>
                <p className="text-white/50 text-xs mt-0.5">Projets actifs</p>
              </div>
            </div>
          )}
          {(canSeeProjets || hasRole("DG", "DAF", "CONTROLEUR")) && budgetTotal > 0 && (
            <div className="px-5 py-3.5 flex items-center gap-3">
              <BarChart2 className="w-4 h-4 text-white/40 shrink-0" />
              <div>
                <p className="text-white text-lg font-bold tabular-nums leading-none">{budgetPct}%</p>
                <p className="text-white/50 text-xs mt-0.5">Budget consommé</p>
              </div>
            </div>
          )}
          {!canSeeStock && !canSeeProjets && (
            <div className="px-5 py-3.5 flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-white/40 shrink-0" />
              <div>
                <p className="text-white text-lg font-bold tabular-nums leading-none">
                  {demandes.filter((d) => d.statut === "APPROUVEE").length}
                </p>
                <p className="text-white/50 text-xs mt-0.5">Demandes approuvées</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── KPI row — adapté au rôle ─────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* KPI 1 — toujours présent */}
        <BigKpi
          label={isValidator ? "À traiter par vous" : "Demandes en attente"}
          value={myPending.length}
          sub={myPendingUrgent.length > 0
            ? `dont ${myPendingUrgent.length} urgente${myPendingUrgent.length > 1 ? "s" : ""}`
            : "Aucune urgence"}
          icon={FileText}
          tone="primary"
          delta={myPendingUrgent.length > 0 ? { val: "priorité haute", up: false } : undefined}
        />

        {/* KPI 2 — stock ou projets */}
        {canSeeStock ? (
          <BigKpi
            label="Alertes stock"
            value={stockAlertes.length}
            sub={stockBas.length > 0 ? `+ ${stockBas.length} en niveau bas` : "Stock OK"}
            icon={AlertTriangle}
            tone={stockAlertes.length > 0 ? "danger" : "success"}
          />
        ) : canSeeProjets ? (
          <BigKpi
            label="Projets actifs"
            value={projetsActifs.length}
            sub={`${projets.length} projet${projets.length !== 1 ? "s" : ""} au total`}
            icon={HardHat}
            tone="success"
          />
        ) : (
          <BigKpi
            label="Total demandes"
            value={demandes.length}
            sub="Toutes périodes"
            icon={Activity}
            tone="success"
          />
        )}

        {/* KPI 3 — budget ou projets */}
        {(canSeeProjets || hasRole("DG", "DAF", "CONTROLEUR")) && budgetTotal > 0 ? (
          <BigKpi
            label="Budget consommé"
            value={`${budgetPct}%`}
            sub={`${formatEur(consommeTotal)} / ${formatEur(budgetTotal)}`}
            icon={TrendingUp}
            tone={budgetPct > 90 ? "danger" : budgetPct > 75 ? "warning" : "success"}
          />
        ) : canSeeStock ? (
          <BigKpi
            label="Articles en stock"
            value={stock.length}
            sub={`${stockBas.length} niveau bas`}
            icon={Package}
            tone="success"
          />
        ) : (
          <BigKpi
            label="Demandes approuvées"
            value={demandes.filter((d) => d.statut === "APPROUVEE").length}
            sub="Total approuvées"
            icon={CheckCircle2}
            tone="success"
          />
        )}

        {/* KPI 4 — toujours pertinent */}
        {canSeeProjets ? (
          <BigKpi
            label="Projets actifs"
            value={projetsActifs.length}
            sub={`${projets.filter((p) => p.statut === "CLOTURE").length} clôturés`}
            icon={HardHat}
            tone="success"
          />
        ) : (
          <BigKpi
            label="Demandes rejetées"
            value={demandes.filter((d) => d.statut === "REJETEE").length}
            sub="Total rejetées"
            icon={AlertTriangle}
            tone={demandes.filter((d) => d.statut === "REJETEE").length > 0 ? "warning" : "success"}
          />
        )}
      </div>

      {/* ── Main grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── Demandes (2/3) — filtrées selon le rôle ─── */}
        <SectionCard
          className="xl:col-span-2"
          title={isValidator ? "Demandes à traiter" : "Demandes en cours"}
          sub={`${myPending.length} ${myPendingLabel.toLowerCase()}`}
          icon={FileText}
          action={<ViewAll to="/demandes" />}
        >
          {myPending.length === 0 ? (
            <EmptyState icon={CheckCircle2} text={isValidator ? "Aucune demande à traiter pour le moment" : "Aucune demande en attente"} />
          ) : (
            <div className="divide-y divide-border/60">
              {myPending.slice(0, 6).map((d) => (
                <Link
                  key={d.id}
                  to={`/demandes/${d.id}`}
                  className="group flex items-center gap-3.5 px-5 py-3.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <span className={cn("w-2 h-2 rounded-full", urgenceColor[d.urgence] ?? "bg-muted-foreground/30")} />
                  </div>
                  <Initials name={d.requester_nom} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{d.numero}</span>
                      <StatusBadge tone={(urgenceTone as Record<string, any>)[d.urgence] ?? "muted"} className="text-[10px]">{d.urgence}</StatusBadge>
                    </div>
                    <p className="text-sm font-medium text-foreground mt-0.5 truncate">{d.motif}</p>
                    <p className="text-xs text-muted-foreground truncate">{d.project_nom} · {d.requester_nom}</p>
                  </div>
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

        {/* ── Sidebar droite (1/3) — selon le rôle ─────── */}
        {canSeeStock ? (
          /* Alertes stock — MAGASINIER, CONDUCTEUR, CHEF_PROJET… */
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
                  const seuil = Number(s.seuil_alerte), dispo = Number(s.qte_disponible);
                  const pct = seuil > 0 ? Math.min(100, (dispo / seuil) * 100) : 0;
                  const sev = pct === 0 ? "destructive" : pct < 50 ? "destructive" : "warning";
                  return (
                    <div key={s.id} className="px-5 py-3.5 space-y-2">
                      <div className="flex items-start gap-2 justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate leading-tight">{s.article_designation}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{s.article_code}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={cn("text-sm font-bold tabular-nums", sev === "destructive" ? "text-destructive" : "text-amber-600")}>
                            {dispo}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">{s.article_unite ?? ""}</span>
                        </div>
                      </div>
                      <div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={cn("h-full rounded-full", sev === "destructive" ? "bg-destructive" : "bg-amber-500")} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                          <span>{Math.round(pct)}% du seuil</span>
                          <span>Seuil : {seuil}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        ) : (
          /* Carte "Mon profil & accès" — pour les rôles sans stock */
          <SectionCard
            title="Mon espace"
            sub={`Connecté en tant que ${roleInfo.label}`}
            icon={User}
          >
            <div className="p-5 space-y-4">
              {/* Avatar + identité */}
              <div className="flex items-center gap-3">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0", roleInfo.color)}>
                  {user?.nom?.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase() || "??"}
                </div>
                <div>
                  <p className="font-semibold text-sm">{user?.nom}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <span className={cn("inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white", roleInfo.color)}>
                    {roleInfo.label}
                  </span>
                </div>
              </div>

              {/* Accès autorisés */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Mes accès
                </p>
                <div className="space-y-1.5">
                  {roleInfo.access.map((a) => (
                    <div key={a} className="flex items-center gap-2 text-xs text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                      {a}
                    </div>
                  ))}
                </div>
              </div>

              {/* Roles système */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Rôles système</p>
                <div className="flex flex-wrap gap-1.5">
                  {(user?.roles ?? []).map((r: string) => (
                    <span key={r} className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {/* ── Projets (2/3) — visible CHEF_PROJET, CONDUCTEUR, DG, DAF, CONTROLEUR ─── */}
        {canSeeProjets && (
          <SectionCard
            className="xl:col-span-2"
            title="Projets en cours"
            sub="Consommation budgétaire par projet"
            icon={HardHat}
            action={hasRole("CHEF_PROJET", "CONDUCTEUR", "ADMIN") ? <ViewAll to="/projets" /> : undefined}
          >
            <div className="divide-y divide-border/60">
              {projets.filter((p) => p.statut !== "TERMINE").slice(0, 4).length === 0 ? (
                <EmptyState icon={HardHat} text="Aucun projet en cours" />
              ) : projets.filter((p) => p.statut !== "TERMINE").slice(0, 4).map((p) => {
                const bI = Number(p.budget_initial || 0), bC = Number(p.budget_consomme || 0);
                const pct = bI > 0 ? Math.round((bC / bI) * 100) : 0;
                const isOver = pct > 100, isWarn = pct > 80;
                return (
                  <div key={p.id} className="group px-5 py-4 flex items-start gap-4 hover:bg-muted/30 transition-colors">
                    <div className={cn("w-1 rounded-full self-stretch shrink-0", isOver ? "bg-destructive" : isWarn ? "bg-amber-500" : "bg-success")} />
                    <div className="flex-1 min-w-0 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{p.nom}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.client}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn("text-base font-extrabold tabular-nums", isOver ? "text-destructive" : isWarn ? "text-amber-600" : "text-foreground")}>{pct}%</p>
                          <StatusBadge tone={p.statut === "ACTIF" ? "success" : p.statut === "EN_PAUSE" ? "warning" : "muted"} className="text-[10px] mt-0.5">
                            {p.statut}
                          </StatusBadge>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Progress value={Math.min(pct, 100)} className={cn("h-2", isOver && "[&>div]:bg-destructive", isWarn && !isOver && "[&>div]:bg-amber-500")} />
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
        )}

        {/* ── Mouvements récents (1/3) — MAGASINIER, RESP_LOGISTIQUE ─── */}
        {canSeeMvt && (
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
                  const isSortie  = m.type_mouvement?.includes("SORTIE") || m.type_mouvement === "TRANSFERT_SORTANT";
                  const isNeutral = m.type_mouvement === "AJUSTEMENT_INVENTAIRE";
                  const MvtIc = mvtIcon[m.type_mouvement] ?? Package;
                  const qty = Math.abs(Number(m.quantite));
                  return (
                    <div key={m.id} className="px-5 py-3 flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                        isNeutral ? "bg-muted text-muted-foreground"
                          : isSortie ? "bg-amber-100 text-amber-600"
                          : "bg-emerald-100 text-emerald-600")}>
                        <MvtIc className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{m.article_designation ?? m.article_code}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {mouvementLabel[m.type_mouvement] ?? m.type_mouvement} · {formatDateTime(m.created_at)}
                        </p>
                      </div>
                      <span className={cn("text-sm font-bold tabular-nums shrink-0",
                        isNeutral ? "text-muted-foreground" : isSortie ? "text-amber-600" : "text-emerald-600")}>
                        {isNeutral ? "±" : isSortie ? "−" : "+"}{qty}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        )}

        {/* ── Mon profil (1/3) — seulement si stock ET projets visibles ─── */}
        {canSeeStock && canSeeProjets && (
          <SectionCard title="Mon espace" sub={`${roleInfo.label}`} icon={User}>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0", roleInfo.color)}>
                  {user?.nom?.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase() || "??"}
                </div>
                <div>
                  <p className="font-semibold text-sm">{user?.nom}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Accès
                </p>
                <div className="space-y-1">
                  {roleInfo.access.map((a) => (
                    <div key={a} className="flex items-center gap-2 text-xs text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                      {a}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(user?.roles ?? []).map((r: string) => (
                  <span key={r} className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground">{r}</span>
                ))}
              </div>
            </div>
          </SectionCard>
        )}

      </div>

      {/* ── Bottom attention bar ─────────────────────────── */}
      {(stockBas.length > 0 || myPendingUrgent.length > 0 || budgetPct > 85) && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-5 py-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <CircleAlert className="w-4 h-4 shrink-0" />
            <p className="text-sm font-semibold">Points d'attention</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-amber-700 dark:text-amber-300">
            {myPendingUrgent.length > 0 && (
              <Link to="/demandes" className="underline underline-offset-2 hover:text-amber-900">
                {myPendingUrgent.length} demande{myPendingUrgent.length > 1 ? "s" : ""} urgente{myPendingUrgent.length > 1 ? "s" : ""} non traitée{myPendingUrgent.length > 1 ? "s" : ""}
              </Link>
            )}
            {stockBas.length > 0 && canSeeStock && (
              <Link to="/stock" className="underline underline-offset-2 hover:text-amber-900">
                {stockBas.length} article{stockBas.length > 1 ? "s" : ""} en niveau bas
              </Link>
            )}
            {budgetPct > 85 && canSeeProjets && (
              <Link to="/projets" className="underline underline-offset-2 hover:text-amber-900">
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
