import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, Building2, FileText, Package, ArrowLeftRight,
  ShoppingCart, ClipboardCheck, TrendingUp, MapPin, User, Calendar,
  AlertCircle, ChevronRight, Wallet, History,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { projectsApi, budgetLotsApi } from "@/lib/api";
import { NewBudgetLotDialog } from "@/components/dialogs/NewBudgetLotDialog";
import { NewSiteDialog } from "@/components/dialogs/NewSiteDialog";
import { EditProjetDialog } from "@/components/dialogs/EditProjetDialog";
import { SuspendreProjetDialog } from "@/components/dialogs/SuspendreProjetDialog";
import { SupprimerProjetDialog } from "@/components/dialogs/SupprimerProjetDialog";
import { RelancerProjetDialog } from "@/components/dialogs/RelancerProjetDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  formatDate, formatEur, statutDemandeLabel, statutDemandeTone,
  urgenceTone, mouvementLabel,
} from "@/data/labels";

type Tone = "muted" | "info" | "warning" | "success" | "destructive" | "accent";

const statutProjetTone = (s: string): Tone =>
  s === "ACTIF" ? "success" : s === "CLOTURE" ? "muted" : "warning";

const statutSiteTone = (s: string): Tone =>
  s === "ACTIF" ? "success" : s === "PAUSE" ? "warning" : "muted";

const statutCommandeTone = (s: string): Tone =>
  s === "RECUE" ? "success" : s === "PARTIELLE" ? "warning" : s === "CLOTUREE" ? "muted" : s === "ENVOYEE" ? "info" : "accent";

const statutTransfertTone = (s: string): Tone =>
  s === "RECEPTIONNE" ? "success" : s === "EN_TRANSIT" ? "info" : s === "CLOTURE" ? "muted" : "accent";

const mouvementTone = (t: string): Tone =>
  t.startsWith("ENTREE") ? "success" :
  t.startsWith("SORTIE") ? "destructive" :
  t.startsWith("TRANSFERT") ? "info" :
  t === "RESERVATION" ? "warning" : "muted";

function KpiCard({ icon: Icon, label, value, sub, tone = "default" }: {
  icon: any; label: string; value: string | number; sub?: string; tone?: "default" | "warning" | "danger";
}) {
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${tone === "danger" ? "bg-destructive/5 border-destructive/20" : tone === "warning" ? "bg-warning-soft border-warning/20" : "bg-card border-border"}`}>
      <div className={`mt-0.5 p-2 rounded-lg ${tone === "danger" ? "bg-destructive/10 text-destructive" : tone === "warning" ? "bg-warning/10 text-warning" : "bg-accent-soft text-accent"}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold tabular-nums ${tone === "danger" ? "text-destructive" : ""}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center text-muted-foreground text-sm">{message}</div>
  );
}

export default function ProjetDetail() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budgetLots, setBudgetLots] = useState<any[]>([]);

  const reloadLots = () => {
    if (!id) return;
    budgetLotsApi.list({ project_id: id }).then(setBudgetLots).catch(() => {});
  };

  const reloadProject = () => {
    if (!id) return;
    projectsApi.detail(id).then(setData).catch(() => {});
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      projectsApi.detail(id),
      budgetLotsApi.list({ project_id: id }),
    ])
      .then(([proj, lots]) => { setData(proj); setBudgetLots(lots); })
      .catch(() => setError("Impossible de charger ce projet."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Chargement du projet…
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <div className="flex items-center gap-3 py-16 justify-center text-muted-foreground">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <span>{error ?? "Projet introuvable."}</span>
        </div>
        <div className="text-center"><Link to="/projets" className="text-sm text-accent underline">← Retour aux projets</Link></div>
      </>
    );
  }

  const isActif = data.statut === "ACTIF";
  const isSuspendu = data.statut === "SUSPENDU";
  const budget = Number(data.budget_initial) || 0;
  const consomme = Number(data.budget_consomme) || 0;
  const pct = budget > 0 ? Math.round((consomme / budget) * 100) : 0;
  const overrun = pct > 95;

  const requests: any[] = data.requests ?? [];
  const movements: any[] = data.movements ?? [];
  const stock: any[] = data.stock ?? [];
  const purchaseOrders: any[] = data.purchaseOrders ?? [];
  const receipts: any[] = data.receipts ?? [];
  const transfers: any[] = data.transfers ?? [];
  const sites: any[] = data.sites ?? [];
  const statusLogs: any[] = data.statusLogs ?? [];

  return (
    <>
      {/* Back */}
      <Link
        to="/projets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Retour aux projets
      </Link>

      {/* Header */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-accent/8 via-card to-card border-b border-border px-6 py-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{data.code}</span>
                <StatusBadge tone={statutProjetTone(data.statut)}>{data.statut}</StatusBadge>
                {(hasRole("ADMIN") || hasRole("CHEF_PROJET")) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <EditProjetDialog
                      project={data}
                      onSuccess={(updated) => setData((prev: any) => ({ ...prev, ...updated }))}
                    />
                    {isActif && (
                      <SuspendreProjetDialog
                        projectId={id!}
                        projectNom={data.nom}
                        onSuccess={(updated) => setData((prev: any) => ({ ...prev, ...updated }))}
                      />
                    )}
                    {isSuspendu && (
                      <RelancerProjetDialog
                        projectId={id!}
                        projectNom={data.nom}
                        onSuccess={(updated) => setData((prev: any) => ({ ...prev, ...updated }))}
                      />
                    )}
                    {(isActif || isSuspendu) && (
                      <SupprimerProjetDialog
                        projectId={id!}
                        projectNom={data.nom}
                        projectCode={data.code}
                        onSuccess={() => navigate("/projets")}
                      />
                    )}
                  </div>
                )}
              </div>
              <h1 className="text-2xl font-bold text-foreground leading-tight">{data.nom}</h1>
              <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-4 flex-wrap">
                {data.client && <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{data.client}</span>}
                {data.date_debut && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(data.date_debut)} → {data.date_fin ? formatDate(data.date_fin) : "—"}
                  </span>
                )}
              </p>
            </div>
            <div className="min-w-[200px]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Budget consommé</span>
                <span className={`text-lg font-bold tabular-nums ${overrun ? "text-destructive" : "text-foreground"}`}>{pct}%</span>
              </div>
              <Progress value={pct} className={`h-2 ${overrun ? "[&>div]:bg-destructive" : ""}`} />
              <p className="text-xs text-muted-foreground mt-1 text-right tabular-nums">
                {formatEur(consomme)} / {formatEur(budget)}
              </p>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border">
          {[
            { label: "Chantiers", value: sites.length, icon: MapPin },
            { label: "Demandes", value: requests.length, icon: FileText },
            { label: "Mouvements stock", value: movements.length, icon: TrendingUp },
            { label: "Articles en stock", value: stock.length, icon: Package },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="px-5 py-4 flex items-center gap-3">
              <Icon className="w-4 h-4 text-accent shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold tabular-nums">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bannière suspension */}
      {isSuspendu && (
        <div className="rounded-xl border border-orange-300 bg-orange-50 px-5 py-4 flex items-start gap-3 text-orange-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-orange-500" />
          <div>
            <p className="font-semibold text-sm">Projet suspendu</p>
            <p className="text-sm mt-0.5">
              Aucune nouvelle action ne peut être effectuée sur ce projet (demandes, sites, lots).
              {data.motif_statut && (
                <span className="block mt-1 text-orange-700">Motif : {data.motif_statut}</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="budget" className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="budget" className="gap-1.5 text-xs sm:text-sm px-3 py-2 rounded-lg">
            <Wallet className="w-3.5 h-3.5" />
            Budget
            <span className="ml-1 text-xs bg-muted rounded px-1.5 py-0.5 text-muted-foreground font-mono">{budgetLots.length}</span>
          </TabsTrigger>
          {[
            { value: "chantiers", label: "Chantiers", count: sites.length, icon: MapPin },
            { value: "demandes", label: "Demandes", count: requests.length, icon: FileText },
            { value: "mouvements", label: "Mouvements", count: movements.length, icon: TrendingUp },
            { value: "stock", label: "Stock", count: stock.length, icon: Package },
            { value: "achats", label: "Achats", count: purchaseOrders.length, icon: ShoppingCart },
            { value: "receptions", label: "Réceptions", count: receipts.length, icon: ClipboardCheck },
            { value: "transferts", label: "Transferts", count: transfers.length, icon: ArrowLeftRight },
            { value: "historique", label: "Historique", count: statusLogs.length, icon: History },
          ].map(({ value, label, count, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5 text-xs sm:text-sm px-3 py-2 rounded-lg">
              <Icon className="w-3.5 h-3.5" />
              {label}
              <span className="ml-1 text-xs bg-muted rounded px-1.5 py-0.5 text-muted-foreground font-mono">{count}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ─── BUDGET LOTS ─── */}
        <TabsContent value="budget">
          <div className="space-y-4">
            {(hasRole("ADMIN") || hasRole("CHEF_PROJET")) && isActif && (
              <div className="flex justify-end">
                <NewBudgetLotDialog projectId={id!} onSuccess={reloadLots} />
              </div>
            )}
            {budgetLots.length === 0 ? (
              <EmptyState message="Aucun lot budgétaire défini pour ce projet." />
            ) : (
              <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">Code</th>
                      <th className="text-left font-medium px-4 py-3">Libellé</th>
                      <th className="text-right font-medium px-4 py-3">Montant prévu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {budgetLots.map((lot: any) => (
                      <tr key={lot.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-accent">{lot.code}</td>
                        <td className="px-4 py-3 text-sm">{lot.libelle}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatEur(Number(lot.montant_prevu))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/40">
                      <td colSpan={2} className="px-4 py-3 text-right font-semibold text-sm">Total lots</td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold">
                        {formatEur(budgetLots.reduce((s: number, l: any) => s + Number(l.montant_prevu || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── CHANTIERS ─── */}
        <TabsContent value="chantiers">
          {(hasRole("ADMIN") || hasRole("CHEF_PROJET")) && isActif && (
            <div className="flex justify-end mb-4">
              <NewSiteDialog projectId={id!} onSuccess={reloadProject} />
            </div>
          )}
          {sites.length === 0 ? (
            <EmptyState message="Aucun chantier associé à ce projet." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sites.map((c: any) => (
                <div key={c.id} className="rounded-xl bg-card border border-border shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                      <h3 className="font-semibold text-sm mt-0.5">{c.nom}</h3>
                    </div>
                    <StatusBadge tone={statutSiteTone(c.statut)}>{c.statut}</StatusBadge>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground mb-4">
                    {c.localisation && <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 shrink-0" />{c.localisation}</p>}
                    {c.responsable && <p className="flex items-center gap-2"><User className="w-3.5 h-3.5 shrink-0" />{c.responsable}</p>}
                  </div>
                  {c.avancement != null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Avancement</span>
                        <span className="font-semibold tabular-nums">{c.avancement}%</span>
                      </div>
                      <Progress value={c.avancement} className="h-1.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── DEMANDES ─── */}
        <TabsContent value="demandes">
          {requests.length === 0 ? (
            <EmptyState message="Aucune demande pour ce projet." />
          ) : (
            <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Numéro</th>
                    <th className="text-left font-medium px-4 py-3">Chantier</th>
                    <th className="text-left font-medium px-4 py-3">Demandeur</th>
                    <th className="text-left font-medium px-4 py-3">Date</th>
                    <th className="text-left font-medium px-4 py-3">Urgence</th>
                    <th className="text-right font-medium px-4 py-3">Articles</th>
                    <th className="text-left font-medium px-4 py-3">Statut</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((r: any) => (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-accent">{r.numero}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.site_nom}</td>
                      <td className="px-4 py-3 text-xs">{r.requester_nom}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.created_at ? formatDate(r.created_at) : "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={(urgenceTone as Record<string, Tone>)[r.urgence] ?? "muted"} dot={false}>
                          {r.urgence}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-xs">{r.lignes_count ?? "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={(statutDemandeTone as Record<string, Tone>)[r.statut] ?? "muted"}>
                          {(statutDemandeLabel as Record<string, string>)[r.statut] ?? r.statut}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/demandes/${r.id}`} className="text-muted-foreground hover:text-accent transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ─── MOUVEMENTS DE STOCK ─── */}
        <TabsContent value="mouvements">
          {movements.length === 0 ? (
            <EmptyState message="Aucun mouvement de stock enregistré sur les chantiers de ce projet." />
          ) : (
            <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
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
                  {movements.map((m: any) => (
                    <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {m.created_at ? formatDate(m.created_at) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={mouvementTone(m.type_mouvement)} dot={false}>
                          {mouvementLabel[m.type_mouvement] ?? m.type_mouvement}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">{m.article_code}</span>
                        <p className="text-xs text-foreground">{m.article_designation}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{m.depot_nom}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-sm">{Number(m.quantite).toLocaleString("fr-SN")}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.reference_doc || "—"}</td>
                      <td className="px-4 py-3 text-xs">{m.user_nom || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ─── STOCK ─── */}
        <TabsContent value="stock">
          {stock.length === 0 ? (
            <EmptyState message="Aucun article en stock trouvé pour les dépôts de ce projet." />
          ) : (
            <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Article</th>
                    <th className="text-left font-medium px-4 py-3">Dépôt</th>
                    <th className="text-right font-medium px-4 py-3">Disponible</th>
                    <th className="text-right font-medium px-4 py-3">Réservé</th>
                    <th className="text-right font-medium px-4 py-3">Seuil alerte</th>
                    <th className="text-left font-medium px-4 py-3">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stock.map((s: any) => {
                    const dispo = Number(s.qte_disponible);
                    const seuil = Number(s.seuil_alerte) || 0;
                    const low = seuil > 0 && dispo <= seuil;
                    return (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-muted-foreground">{s.article_code}</span>
                          <p className="text-xs">{s.article_designation}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{s.depot_nom}</td>
                        <td className={`px-4 py-3 text-right tabular-nums font-semibold ${low ? "text-destructive" : ""}`}>
                          {dispo.toLocaleString("fr-SN")} <span className="font-normal text-muted-foreground text-xs">{s.unite}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {Number(s.qte_reservee).toLocaleString("fr-SN")}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {seuil > 0 ? seuil.toLocaleString("fr-SN") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {low
                            ? <StatusBadge tone="destructive" dot>Stock bas</StatusBadge>
                            : <StatusBadge tone="success" dot>OK</StatusBadge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ─── ACHATS ─── */}
        <TabsContent value="achats">
          {purchaseOrders.length === 0 ? (
            <EmptyState message="Aucune commande enregistrée." />
          ) : (
            <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Numéro</th>
                    <th className="text-left font-medium px-4 py-3">Fournisseur</th>
                    <th className="text-left font-medium px-4 py-3">Date</th>
                    <th className="text-right font-medium px-4 py-3">Lignes</th>
                    <th className="text-right font-medium px-4 py-3">Montant</th>
                    <th className="text-left font-medium px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {purchaseOrders.map((po: any) => (
                    <tr key={po.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-accent">{po.numero}</td>
                      <td className="px-4 py-3 text-xs">{po.supplier_nom}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{po.created_at ? formatDate(po.created_at) : "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-xs">{po.nb_lignes ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-xs font-medium">{po.montant_total ? formatEur(Number(po.montant_total)) : "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={statutCommandeTone(po.statut)}>{po.statut}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ─── RÉCEPTIONS ─── */}
        <TabsContent value="receptions">
          {receipts.length === 0 ? (
            <EmptyState message="Aucune réception enregistrée." />
          ) : (
            <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Numéro</th>
                    <th className="text-left font-medium px-4 py-3">Commande</th>
                    <th className="text-left font-medium px-4 py-3">Fournisseur</th>
                    <th className="text-left font-medium px-4 py-3">Dépôt</th>
                    <th className="text-left font-medium px-4 py-3">Date</th>
                    <th className="text-left font-medium px-4 py-3">Conformité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {receipts.map((r: any) => {
                    const confTone: Tone = r.conformite === "CONFORME" ? "success" : r.conformite === "RESERVE" ? "destructive" : "warning";
                    return (
                      <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-accent">{r.numero}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.commande_numero || "—"}</td>
                        <td className="px-4 py-3 text-xs">{r.supplier_nom || "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{r.depot_nom}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{r.date_reception ? formatDate(r.date_reception) : "—"}</td>
                        <td className="px-4 py-3">
                          <StatusBadge tone={confTone}>{r.conformite}</StatusBadge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ─── TRANSFERTS ─── */}
        <TabsContent value="transferts">
          {transfers.length === 0 ? (
            <EmptyState message="Aucun transfert enregistré." />
          ) : (
            <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Numéro</th>
                    <th className="text-left font-medium px-4 py-3">De</th>
                    <th className="text-left font-medium px-4 py-3">Vers</th>
                    <th className="text-left font-medium px-4 py-3">Date</th>
                    <th className="text-left font-medium px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transfers.map((t: any) => (
                    <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-accent">{t.numero}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className="font-mono text-muted-foreground">{t.depot_from_code}</span>
                        <p className="text-xs">{t.depot_from_nom}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="font-mono text-muted-foreground">{t.depot_to_code}</span>
                        <p className="text-xs">{t.depot_to_nom}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{t.created_at ? formatDate(t.created_at) : "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={statutTransfertTone(t.statut)}>{t.statut}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
        {/* ─── HISTORIQUE STATUTS ─── */}
        <TabsContent value="historique">
          {statusLogs.length === 0 ? (
            <EmptyState message="Aucun changement de statut enregistré pour ce projet." />
          ) : (
            <div className="relative">
              {/* Timeline */}
              <div className="space-y-0">
                {statusLogs.map((log: any, idx: number) => {
                  const isFirst = idx === 0;
                  const tone =
                    log.nouveau_statut === "ACTIF"     ? { bg: "bg-green-50",  border: "border-green-200",  dot: "bg-green-500",  label: "text-green-700"  } :
                    log.nouveau_statut === "SUSPENDU"  ? { bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-500", label: "text-orange-700" } :
                    log.nouveau_statut === "SUPPRIME"  ? { bg: "bg-red-50",    border: "border-red-200",    dot: "bg-red-500",    label: "text-red-700"    } :
                    log.nouveau_statut === "CLOTURE"   ? { bg: "bg-muted",     border: "border-border",     dot: "bg-muted-foreground", label: "text-muted-foreground" } :
                                                        { bg: "bg-card",       border: "border-border",     dot: "bg-accent",     label: "text-accent"     };
                  return (
                    <div key={log.id} className="flex gap-4 pb-0">
                      {/* Timeline line + dot */}
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full shrink-0 mt-4 ${tone.dot} ${isFirst ? "ring-2 ring-offset-2 ring-current" : ""}`} />
                        {idx < statusLogs.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1 mb-0" style={{ minHeight: "2rem" }} />
                        )}
                      </div>
                      {/* Card */}
                      <div className={`flex-1 mb-4 rounded-xl border ${tone.border} ${tone.bg} px-4 py-3`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground font-mono text-xs">{log.ancien_statut}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className={`font-semibold ${tone.label}`}>{log.nouveau_statut}</span>
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {log.created_at ? formatDate(log.created_at) : "—"}
                          </span>
                        </div>
                        {log.motif && (
                          <p className="text-sm mt-1.5 text-foreground">{log.motif}</p>
                        )}
                        {log.user_nom && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <User className="w-3 h-3" /> {log.user_nom}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
