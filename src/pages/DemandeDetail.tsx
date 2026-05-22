import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Check, X, Calendar, MapPin, User, Paperclip,
  MessageSquare, Loader2, RotateCcw, AlertCircle, Send, Pencil, Trash2, Plus, ShoppingCart,
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { requestsApi, articlesApi, apiError } from "@/lib/api";
import { NewCommandeDialog } from "@/components/dialogs/NewCommandeDialog";
import { formatDate, formatEur, statutDemandeLabel, statutDemandeTone, urgenceTone } from "@/data/labels";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  SOUMISE:               "TECHNIQUE",
  VALIDATION_TECHNIQUE:  "TECHNIQUE",
  VALIDATION_BUDGETAIRE: "BUDGETAIRE",
  VALIDATION_DIRECTION:  "DIRECTION",
};

const etapePerm: Record<string, string> = {
  SOUMISE:               "REQUEST_VALIDATE_TECH",
  VALIDATION_TECHNIQUE:  "REQUEST_VALIDATE_TECH",
  VALIDATION_BUDGETAIRE: "REQUEST_VALIDATE_BUDGET",
  VALIDATION_DIRECTION:  "REQUEST_VALIDATE_DIRECTION",
};

export default function DemandeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, hasRole } = useAuth();
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentaire, setCommentaire] = useState("");
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | "complement" | "resubmit" | "saveResubmit" | "submit" | "cancel" | "save" | null>(null);

  // État édition brouillon
  const [editing, setEditing] = useState(false);
  const [editUrgence, setEditUrgence] = useState("");
  const [editMotif, setEditMotif] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editLignes, setEditLignes] = useState<Array<{ id: string; articleId: string; designationLibre: string; quantite: string }>>([]);
  const [allArticles, setAllArticles] = useState<any[]>([]);

  const reload = () => {
    if (!id) return;
    requestsApi.get(id).then(setD);
  };

  useEffect(() => {
    if (!id) return;
    requestsApi.get(id)
      .then((data) => {
        setD(data);
        // Auto-open edit form when request needs modification
        if (data.statut === 'EN_COMPLEMENT') {
          setEditUrgence(data.urgence);
          setEditMotif(data.motif ?? "");
          setEditDate(data.date_souhaitee ? data.date_souhaitee.slice(0, 10) : "");
          const lignes = (data.lignes ?? []).map((l: any, i: number) => ({
            id: l.id ?? String(i),
            articleId: l.article_id ?? "",
            designationLibre: l.article_id ? "" : (l.article_designation ?? l.designation_libre ?? ""),
            quantite: String(l.qte_demandee ?? ""),
          }));
          setEditLignes(lignes.length > 0 ? lignes : [{ id: "1", articleId: "", designationLibre: "", quantite: "" }]);
          articlesApi.list().then(setAllArticles).catch(() => {});
          setEditing(true);
        }
      })
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

  async function handleSaveAndResubmit() {
    if (!id) return;
    const lignesValides = editLignes.filter((l) => l.articleId || l.designationLibre.trim());
    if (lignesValides.length === 0 || lignesValides.some((l) => !l.quantite)) {
      toast.error("Lignes incomplètes", { description: "Chaque ligne doit avoir un article ou une désignation et une quantité." });
      return;
    }
    setActionLoading("saveResubmit");
    try {
      await requestsApi.update(id, {
        urgence: editUrgence,
        motif: editMotif,
        date_souhaitee: editDate || null,
        lignes: lignesValides.map((l) => ({
          article_id: l.articleId || null,
          designation_libre: l.articleId ? null : l.designationLibre.trim() || null,
          qte_demandee: parseFloat(l.quantite),
        })),
      });
      await requestsApi.resubmit(id);
      toast.success("Demande modifiée et resoumise au circuit de validation");
      setEditing(false);
      reload();
    } catch (e: any) {
      toast.error("Erreur lors de la resoumission", { description: apiError(e) });
    } finally {
      setActionLoading(null);
    }
  }

  function openEdit() {
    if (!d) return;
    setEditUrgence(d.urgence);
    setEditMotif(d.motif ?? "");
    setEditDate(d.date_souhaitee ? d.date_souhaitee.slice(0, 10) : "");
    const lignes = (d.lignes ?? []).map((l: any, i: number) => ({
      id: l.id ?? String(i),
      articleId: l.article_id ?? "",
      designationLibre: l.article_id ? "" : (l.article_designation ?? l.designation_libre ?? ""),
      quantite: String(l.qte_demandee ?? ""),
    }));
    setEditLignes(lignes.length > 0 ? lignes : [{ id: "1", articleId: "", designationLibre: "", quantite: "" }]);
    if (allArticles.length === 0) {
      articlesApi.list().then(setAllArticles).catch(() => {});
    }
    setEditing(true);
  }

  const addEditLigne = () =>
    setEditLignes((prev) => [...prev, { id: Date.now().toString(), articleId: "", designationLibre: "", quantite: "" }]);

  const removeEditLigne = (lid: string) =>
    setEditLignes((prev) => prev.filter((l) => l.id !== lid));

  const updateEditLigne = (lid: string, patch: Partial<{ articleId: string; designationLibre: string; quantite: string }>) =>
    setEditLignes((prev) => prev.map((l) => (l.id === lid ? { ...l, ...patch } : l)));

  const editTotal = editLignes.reduce((s, l) => {
    const a = allArticles.find((x) => x.id === l.articleId);
    return s + (Number(a?.prix_moyen) || 0) * (parseFloat(l.quantite) || 0);
  }, 0);

  async function handleSave() {
    if (!id) return;
    const lignesValides = editLignes.filter((l) => l.articleId || l.designationLibre.trim());
    if (lignesValides.length === 0 || lignesValides.some((l) => !l.quantite)) {
      toast.error("Lignes incomplètes", { description: "Chaque ligne doit avoir un article ou une désignation et une quantité." });
      return;
    }
    setActionLoading("save");
    try {
      await requestsApi.update(id, {
        urgence: editUrgence,
        motif: editMotif,
        date_souhaitee: editDate || null,
        lignes: lignesValides.map((l) => ({
          article_id: l.articleId || null,
          designation_libre: l.articleId ? null : l.designationLibre.trim() || null,
          qte_demandee: parseFloat(l.quantite),
        })),
      });
      toast.success("Brouillon mis à jour");
      setEditing(false);
      reload();
    } catch (e: any) {
      toast.error("Erreur lors de la sauvegarde", { description: apiError(e) });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSubmitDraft() {
    if (!id) return;
    setActionLoading("submit");
    try {
      await requestsApi.submit(id);
      toast.success("Demande soumise au circuit de validation");
      reload();
    } catch (e: any) {
      toast.error("Erreur lors de la soumission", { description: apiError(e) });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel() {
    if (!id) return;
    setActionLoading("cancel");
    try {
      await requestsApi.cancel(id);
      toast.success("Demande annulée");
      navigate("/demandes");
    } catch (e: any) {
      toast.error("Erreur lors de l'annulation", { description: apiError(e) });
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
        </div>
      </>
    );
  }

  if (!d) {
    return (
      <>
        <p className="text-muted-foreground">Demande introuvable.</p>
        <Button asChild variant="link"><Link to="/demandes">Retour</Link></Button>
      </>
    );
  }

  const currentStepIdx = workflow.findIndex((s) => s.key === d.statut);
  const isBrouillon = d.statut === "BROUILLON";
  const lastValidatorComment = (d.approvals as any[] | undefined)
    ?.slice().reverse().find((a) => a.commentaire)?.commentaire ?? null;
  const isTerminal = ["APPROUVEE", "REJETEE", "CLOTUREE", "MISE_A_DISPO"].includes(d.statut);
  const isValidableStatus = ["SOUMISE", "VALIDATION_TECHNIQUE", "VALIDATION_BUDGETAIRE", "VALIDATION_DIRECTION"].includes(d.statut);
  const canRequestComplement = ["SOUMISE", "VALIDATION_TECHNIQUE", "VALIDATION_BUDGETAIRE", "VALIDATION_DIRECTION"].includes(d.statut);
  const requiredPerm = etapePerm[d.statut];
  const canValidate = isValidableStatus && (hasRole("ADMIN") || (!!requiredPerm && hasPermission(requiredPerm)));
  const isEnComplement = d.statut === "EN_COMPLEMENT";
  const canCreateRequest = hasPermission("REQUEST_CREATE");
  const isOwner = canCreateRequest;
  const canCreatePO = hasRole("ADMIN") || hasRole("ACHETEUR");

  const getApproval = (etape: string | null) => {
    if (!etape || !d.approvals) return null;
    return d.approvals.find((a: any) => a.etape === etape) ?? null;
  };

  return (
    <>
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

          {/* ─── Panneau BROUILLON / EN_COMPLEMENT ─── */}
          {(isBrouillon || isEnComplement) && isOwner && (
            <div className={`rounded-xl border p-5 space-y-4 ${
              isBrouillon
                ? "border-dashed border-amber-300 bg-amber-50"
                : "border-2 border-orange-400 bg-orange-50"
            }`}>
              <div className="flex items-center justify-between">
                <h2 className={`font-semibold flex items-center gap-2 ${isBrouillon ? "text-amber-800" : "text-orange-800"}`}>
                  <Pencil className="w-4 h-4" />
                  {isBrouillon ? "Demande en brouillon" : "Modifications requises par le validateur"}
                </h2>
                <span className={`text-xs ${isBrouillon ? "text-amber-600" : "text-orange-600"}`}>
                  {isBrouillon ? "Non encore soumise au circuit de validation" : "Modifiez puis resoumettez"}
                </span>
              </div>

              {/* Motif du retour (uniquement EN_COMPLEMENT) */}
              {isEnComplement && (
                <div className="flex items-start gap-2.5 bg-orange-100 border border-orange-200 rounded-lg px-3.5 py-3">
                  <MessageSquare className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-orange-700 mb-0.5">Motif du retour</p>
                    <p className="text-sm text-orange-800">
                      {lastValidatorComment
                        ? `"${lastValidatorComment}"`
                        : "Le validateur a demandé des modifications — veuillez mettre à jour votre demande avant de resoumettre."}
                    </p>
                  </div>
                </div>
              )}

              {/* Formulaire d'édition inline */}
              {editing ? (
                <div className={`space-y-4 bg-white rounded-lg p-4 border ${isBrouillon ? "border-amber-200" : "border-orange-200"}`}>
                  {/* Champs généraux */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Niveau d'urgence</Label>
                      <Select value={editUrgence} onValueChange={setEditUrgence}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NORMALE">Normale</SelectItem>
                          <SelectItem value="URGENTE">Urgente</SelectItem>
                          <SelectItem value="HAUTE">Haute</SelectItem>
                          <SelectItem value="CRITIQUE">Critique</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Date souhaitée</Label>
                      <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="h-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Motif / justification</Label>
                    <Textarea value={editMotif} onChange={(e) => setEditMotif(e.target.value)} rows={2} className="bg-card" />
                  </div>

                  {/* Éditeur de lignes */}
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between bg-muted/40 px-3 py-2 border-b border-border">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Articles demandés</p>
                      <Button type="button" variant="ghost" size="sm" onClick={addEditLigne} className="h-7 gap-1 text-xs">
                        <Plus className="w-3 h-3" /> Ligne
                      </Button>
                    </div>
                    <div className="divide-y divide-border">
                      {editLignes.map((l) => {
                        const art = allArticles.find((x) => x.id === l.articleId);
                        const sub = art ? Number(art.prix_moyen) * (parseFloat(l.quantite) || 0) : 0;
                        return (
                          <div key={l.id} className="grid grid-cols-12 gap-2 p-2.5 items-start">
                            <div className="col-span-6 space-y-1">
                              <Select
                                value={l.articleId || "none"}
                                onValueChange={(v) => updateEditLigne(l.id, { articleId: v === "none" ? "" : v, designationLibre: "" })}
                              >
                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Article du catalogue…" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">— Désignation libre —</SelectItem>
                                  {allArticles.map((a) => (
                                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.designation}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {!l.articleId && (
                                <Input
                                  value={l.designationLibre}
                                  onChange={(e) => updateEditLigne(l.id, { designationLibre: e.target.value })}
                                  placeholder="Désignation libre…"
                                  className="h-8 text-xs"
                                />
                              )}
                            </div>
                            <div className="col-span-1 pt-2 text-center text-xs text-muted-foreground">{art?.unite ?? ""}</div>
                            <div className="col-span-2">
                              <Input
                                type="number" min="0" placeholder="Qté"
                                value={l.quantite}
                                onChange={(e) => updateEditLigne(l.id, { quantite: e.target.value })}
                                className="h-9 text-right tabular-nums text-xs"
                              />
                            </div>
                            <div className="col-span-2 pt-2 text-right text-xs tabular-nums text-muted-foreground">
                              {art && sub > 0 && `${sub.toLocaleString("fr-SN")} F`}
                            </div>
                            <div className="col-span-1 text-right">
                              <Button type="button" variant="ghost" size="icon"
                                onClick={() => removeEditLigne(l.id)}
                                disabled={editLignes.length === 1}
                                className="h-9 w-9 text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {editTotal > 0 && (
                      <div className="flex justify-between px-3 py-2 bg-muted/40 border-t border-border text-sm">
                        <span className="font-medium">Total estimé</span>
                        <span className="font-bold tabular-nums">{editTotal.toLocaleString("fr-SN")} FCFA</span>
                      </div>
                    )}
                  </div>

                  {/* Boutons d'action selon le statut */}
                  {isBrouillon ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSave} disabled={!!actionLoading}>
                        {actionLoading === "save" && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                        Enregistrer les modifications
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap pt-1 border-t border-orange-200">
                      <Button
                        size="sm"
                        className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={handleSaveAndResubmit}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === "saveResubmit" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Enregistrer et resoumettre
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleSave} disabled={!!actionLoading}
                        className="border-orange-300 text-orange-700 hover:bg-orange-100">
                        {actionLoading === "save" && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                        Enregistrer sans resoumettre
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-muted-foreground">
                        Annuler l'édition
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  size="sm" variant="outline" onClick={openEdit}
                  className={`gap-1.5 ${isBrouillon ? "border-amber-300 text-amber-700 hover:bg-amber-100" : "border-orange-300 text-orange-700 hover:bg-orange-100"}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {isBrouillon ? "Modifier le brouillon" : "Modifier la demande"}
                </Button>
              )}

              {/* Actions principales hors édition */}
              {!editing && (
                <div className={`flex items-center gap-2 flex-wrap pt-1 border-t ${isBrouillon ? "border-amber-200" : "border-orange-200"}`}>
                  {isBrouillon ? (
                    <>
                      <Button className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={handleSubmitDraft} disabled={!!actionLoading}>
                        {actionLoading === "submit" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Soumettre la demande
                      </Button>
                      <Button variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:border-destructive/60 hover:bg-destructive/5" onClick={handleCancel} disabled={!!actionLoading}>
                        {actionLoading === "cancel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Annuler la demande
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" className="gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-100" onClick={handleResubmit} disabled={!!actionLoading}>
                      {actionLoading === "resubmit" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                      Resoumettre sans modification
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

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
                  Retourner au demandeur
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

          {/* Panneau APPROUVEE — action acheteur */}
          {d.statut === "APPROUVEE" && canCreatePO && (
            <div className="rounded-xl border-2 border-green-300 bg-green-50 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <h2 className="font-semibold text-green-800">Demande approuvée — prête à être mise en commande</h2>
              </div>
              <p className="text-sm text-green-700">
                Cette demande a obtenu toutes les validations. Créez un bon de commande fournisseur pour déclencher l'approvisionnement.
              </p>
              <NewCommandeDialog
                trigger={
                  <Button className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                    <ShoppingCart className="w-4 h-4" /> Créer un bon de commande
                  </Button>
                }
                initialLines={(d.lignes ?? [])
                  .filter((l: any) => l.article_id)
                  .map((l: any) => ({
                    articleId: l.article_id,
                    quantite: String(l.qte_approuvee ?? l.qte_demandee),
                    prixMoyen: l.article_prix_moyen ? String(l.article_prix_moyen) : "",
                  }))}
                onSuccess={() => navigate("/achats")}
              />
            </div>
          )}

          {/* Demande clôturée / approuvée — message informatif */}
          {isTerminal && !["EN_COMPLEMENT"].includes(d.statut) && !(d.statut === "APPROUVEE" && canCreatePO) && (
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
    </>
  );
}
