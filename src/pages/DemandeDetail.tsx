import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Check, X, Calendar, MapPin, User, Paperclip,
  MessageSquare, Loader2, RotateCcw, AlertCircle,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { requestsApi } from "@/lib/api";
import { formatDate, formatEur, statutDemandeLabel, statutDemandeTone, urgenceTone } from "@/data/labels";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const workflow = [
  { key: "SOUMISE",               label: "Soumission",             role: "Demandeur",          etape: null },
  { key: "VALIDATION_TECHNIQUE",  label: "Validation technique",   role: "Conducteur travaux", etape: "TECHNIQUE" },
  { key: "VALIDATION_BUDGETAIRE", label: "Validation budgétaire",  role: "Contrôleur",         etape: "BUDGETAIRE" },
  { key: "VALIDATION_DIRECTION",  label: "Validation DAF",         role: "DAF",                etape: "DIRECTION" },
  { key: "APPROUVEE",             label: "Approuvée",              role: "Système",             etape: null },
  { key: "MISE_A_DISPO",          label: "Mise à disposition",     role: "Magasinier",         etape: null },
  { key: "CLOTUREE",              label: "Clôturée",               role: "Système",             etape: null },
];

const etapeMap: Record<string, string> = {
  VALIDATION_TECHNIQUE:  "TECHNIQUE",
  VALIDATION_BUDGETAIRE: "BUDGETAIRE",
  VALIDATION_DIRECTION:  "DIRECTION",
};

const etapePerm: Record<string, string> = {
  VALIDATION_TECHNIQUE:  "REQUEST_VALIDATE_TECH",
  VALIDATION_BUDGETAIRE: "REQUEST_VALIDATE_BUDGET",
  VALIDATION_DIRECTION:  "REQUEST_VALIDATE_DIRECTION",
};

export default function DemandeDetail() {
  const { id } = useParams();
  const { hasPermission, hasRole } = useAuth();
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentaire, setCommentaire] = useState("");
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | "complement" | "resubmit" | null>(null);

  const reload = () => {
    if (!id) return;
    requestsApi.get(id).then(setD);
  };

  useEffect(() => {
    if (!id) return;
    requestsApi.get(id)
      .then(setD)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleApprove() {
    if (!id || !d) return;
    const etape = etapeMap[d.statut];
    if (!etape) return;
    setActionLoading("approve");
    try {
      await requestsApi.approve(id, { etape, decision: "APPROUVEE", commentaire: commentaire || undefined });
      toast.success("Demande approuvée avec succès");
      setCommentaire("");
      reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Erreur lors de l'approbation");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject() {
    if (!id || !d) return;
    const etape = etapeMap[d.statut];
    if (!etape) return;
    setActionLoading("reject");
    try {
      await requestsApi.approve(id, { etape, decision: "REJETEE", commentaire: commentaire || undefined });
      toast.success("Demande rejetée");
      setCommentaire("");
      reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Erreur lors du rejet");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleComplement() {
    if (!id) return;
    if (!commentaire.trim()) {
      toast.warning("Veuillez préciser le complément d'information attendu");
      return;
    }
    setActionLoading("complement");
    try {
      await requestsApi.complement(id, commentaire);
      toast.success("Demande renvoyée au demandeur pour complément");
      setCommentaire("");
      reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Erreur lors de la demande de complément");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResubmit() {
    if (!id) return;
    setActionLoading("resubmit");
    try {
      await requestsApi.resubmit(id);
      toast.success("Demande resoumise au circuit de validation");
      reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Erreur lors de la resoumission");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
        </div>
      </AppLayout>
    );
  }

  if (!d) {
    return (
      <AppLayout>
        <p className="text-muted-foreground">Demande introuvable.</p>
        <Button asChild variant="link"><Link to="/demandes">Retour</Link></Button>
      </AppLayout>
    );
  }

  const currentStepIdx = workflow.findIndex((s) => s.key === d.statut);
  const isTerminal = ["APPROUVEE", "REJETEE", "CLOTUREE", "MISE_A_DISPO"].includes(d.statut);
  const isValidableStatus = ["VALIDATION_TECHNIQUE", "VALIDATION_BUDGETAIRE", "VALIDATION_DIRECTION"].includes(d.statut);
  const canRequestComplement = ["VALIDATION_TECHNIQUE", "VALIDATION_BUDGETAIRE"].includes(d.statut);
  const requiredPerm = etapePerm[d.statut];
  const canValidate = isValidableStatus && (hasRole("ADMIN") || (!!requiredPerm && hasPermission(requiredPerm)));
  const isEnComplement = d.statut === "EN_COMPLEMENT";
  const canCreateRequest = hasPermission("REQUEST_CREATE");

  const getApproval = (etape: string | null) => {
    if (!etape || !d.approvals) return null;
    return d.approvals.find((a: any) => a.etape === etape) ?? null;
  };

  return (
    <AppLayout>
      <Button asChild variant="ghost" size="sm" className="gap-1.5 mb-4 -ml-2">
        <Link to="/demandes"><ArrowLeft className="w-4 h-4" /> Retour aux demandes</Link>
      </Button>

      <PageHeader
        breadcrumb={`Demande ${d.numero}`}
        title={d.motif}
        description={`${d.project_nom} · ${d.site_nom}`}
        actions={
          <>
            <StatusBadge tone={(urgenceTone as Record<string, any>)[d.urgence] ?? "muted"}>{d.urgence}</StatusBadge>
            <StatusBadge tone={(statutDemandeTone as Record<string, any>)[d.statut] ?? "muted"}>
              {(statutDemandeLabel as Record<string, string>)[d.statut] ?? d.statut}
            </StatusBadge>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Circuit de validation */}
          <div className="rounded-xl bg-card border border-border shadow-sm p-5">
            <h2 className="font-semibold text-foreground mb-4">Circuit de validation</h2>
            <ol className="space-y-3">
              {workflow.map((s, i) => {
                const done = i < currentStepIdx || d.statut === "CLOTUREE";
                const current = i === currentStepIdx;
                const rejected = d.statut === "REJETEE" && i === currentStepIdx;
                const approval = getApproval(s.etape);
                return (
                  <li key={s.key} className="flex items-start gap-3">
                    <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                      rejected  ? "bg-destructive text-destructive-foreground" :
                      done      ? "bg-success text-success-foreground" :
                      current   ? "bg-accent text-accent-foreground ring-4 ring-accent/20" :
                                  "bg-muted text-muted-foreground"
                    }`}>
                      {rejected ? <X className="w-3.5 h-3.5" /> : done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <div className="flex-1 pb-3 border-b border-border last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className={`text-sm font-medium ${current ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
                        <span className="text-xs text-muted-foreground">{s.role}</span>
                      </div>
                      {approval && (
                        <div className="mt-1.5 text-xs text-muted-foreground">
                          {approval.decideur_nom} · {formatDate(approval.decided_at)}
                          {approval.commentaire && ` · "${approval.commentaire}"`}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Articles demandés */}
          <div className="rounded-xl bg-card border border-border shadow-sm">
            <div className="p-5 border-b border-border">
              <h2 className="font-semibold text-foreground">Articles demandés</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">Code</th>
                  <th className="text-left font-medium px-4 py-2.5">Désignation</th>
                  <th className="text-right font-medium px-4 py-2.5">Qté demandée</th>
                  <th className="text-right font-medium px-4 py-2.5">Qté approuvée</th>
                  <th className="text-right font-medium px-4 py-2.5">PU estimé</th>
                  <th className="text-right font-medium px-4 py-2.5">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(d.lignes ?? []).map((l: any) => {
                  const pu = Number(l.article_prix_moyen || 0);
                  return (
                    <tr key={l.id}>
                      <td className="px-4 py-3 font-mono text-xs">{l.article_code}</td>
                      <td className="px-4 py-3">{l.article_designation ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{l.qte_demandee}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{l.qte_approuvee ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{pu > 0 ? formatEur(pu) : "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{pu > 0 ? formatEur(pu * Number(l.qte_demandee)) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40">
                  <td colSpan={5} className="px-4 py-3 text-right font-semibold">Total estimé</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{formatEur(Number(d.montant_estime || 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Panneau d'action — validation */}
          {canValidate && (
            <div className="rounded-xl bg-gradient-to-br from-accent-soft to-card border border-accent/20 shadow-sm p-5">
              <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-accent" /> Action de validation
              </h2>
              <Textarea
                placeholder="Commentaire optionnel (motif, conditions, substitution proposée…)"
                className="mb-3 bg-card"
                rows={3}
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                disabled={!!actionLoading}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  className="gap-1.5"
                  onClick={handleApprove}
                  disabled={!!actionLoading}
                >
                  {actionLoading === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Approuver
                </Button>
                {canRequestComplement && (
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={handleComplement}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === "complement" ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                    Demander complément
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
                  onClick={handleReject}
                  disabled={!!actionLoading}
                >
                  {actionLoading === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  Rejeter
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Un commentaire est obligatoire pour demander un complément.
              </p>
            </div>
          )}

          {/* Info pour valideurs : demande en attente de complément du demandeur */}
          {isEnComplement && !canCreateRequest && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-warning" />
              En attente d'un complément d'information du demandeur — aucune action requise de votre part.
            </div>
          )}

          {/* Bannière "Complément requis" pour le demandeur */}
          {isEnComplement && canCreateRequest && (
            <div className="rounded-xl border border-warning/40 bg-warning-soft p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">Complément d'information requis</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Le validateur a demandé des informations complémentaires. Mettez à jour votre demande puis resoumettez-la.
                  </p>
                  <Button
                    className="mt-3 gap-1.5"
                    onClick={handleResubmit}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === "resubmit" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    Renouveler la soumission
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Demande clôturée / approuvée — message informatif */}
          {isTerminal && !["EN_COMPLEMENT"].includes(d.statut) && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              Cette demande est clôturée — aucune action supplémentaire n'est requise.
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-xl bg-card border border-border shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informations</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div><p className="text-xs text-muted-foreground">Demandeur</p><p className="font-medium">{d.requester_nom}</p></div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Date souhaitée</p>
                  <p className="font-medium">{d.date_souhaitee ? formatDate(d.date_souhaitee) : "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Site</p>
                  <p className="font-medium">{d.site_nom}</p>
                  <p className="text-xs text-muted-foreground">{d.site_code}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border shadow-sm p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Imputation budgétaire</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Projet</span><span className="font-medium">{d.project_code}</span></div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between font-semibold"><span>Estimé demande</span><span className="tabular-nums text-accent">{formatEur(Number(d.montant_estime || 0))}</span></div>
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border shadow-sm p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Paperclip className="w-3.5 h-3.5" /> Pièces jointes
            </h3>
            <p className="text-xs text-muted-foreground">Aucune pièce jointe.</p>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}
