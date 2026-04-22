import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, Building2, FileText, Package, ArrowLeftRight,
  ShoppingCart, ClipboardCheck, TrendingUp, MapPin, User, Calendar,
  AlertCircle, ChevronRight, BarChart3,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { projectsApi } from "@/lib/api";
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
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    projectsApi.detail(id)
      .then(setData)
      .catch(() => setError("Impossible de charger ce projet."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Chargement du projet…
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout>
        <div className="flex items-center gap-3 py-16 justify-center text-muted-foreground">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <span>{error ?? "Projet introuvable."}</span>
        </div>
        <div className="text-center"><Link to="/projets" className="text-sm text-accent underline">← Retour aux projets</Link></div>
      </AppLayout>
    );
  }

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

  return (
    <AppLayout>
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

      {/* Tabs */}
      <Tabs defaultValue="chantiers" className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/50 p-1 rounded-xl">
          {[
            { value: "chantiers", label: "Chantiers", count: sites.length, icon: MapPin },
            { value: "demandes", label: "Demandes", count: requests.length, icon: FileText },
            { value: "mouvements", label: "Mouvements", count: movements.length, icon: TrendingUp },
            { value: "stock", label: "Stock", count: stock.length, icon: Package },
            { value: "achats", label: "Achats", count: purchaseOrders.length, icon: ShoppingCart },
            { value: "receptions", label: "Réceptions", count: receipts.length, icon: ClipboardCheck },
            { value: "transferts", label: "Transferts", count: transfers.length, icon: ArrowLeftRight },
          ].map(({ value, label, count, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5 text-xs sm:text-sm px-3 py-2 rounded-lg">
              <Icon className="w-3.5 h-3.5" />
              {label}
              <span className="ml-1 text-xs bg-muted rounded px-1.5 py-0.5 text-muted-foreground font-mono">{count}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ─── CHANTIERS ─── */}
        <TabsContent value="chantiers">
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
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 border border-border">
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            Affichage des 50 dernières commandes — le filtrage par projet sera disponible prochainement.
          </div>
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
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 border border-border">
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            Affichage des 50 dernières réceptions — le filtrage par projet sera disponible prochainement.
          </div>
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
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 border border-border">
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            Affichage des 50 derniers transferts — le filtrage par projet sera disponible prochainement.
          </div>
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
      </Tabs>
    </AppLayout>
  );
}
