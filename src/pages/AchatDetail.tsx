import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit2, Trash2, FileText, Loader2, Download } from "lucide-react";
import { purchaseOrdersApi, companySettingsApi, suppliersApi, receiptsApi, apiError } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { generatePurchaseOrderPDF } from "@/utils/generatePurchaseOrderPDF";
import { NewCommandeDialog } from "@/components/dialogs/NewCommandeDialog";

const formatFcfa = (n: number | string | null) =>
  n == null ? "—" : `${Number(n).toLocaleString("fr-SN")} FCFA`;

const formatDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR");
};

const statutTone = (s: string) =>
  s === "RECUE" || s === "RECEPTIONNE" ? "success" :
  s === "ENVOYEE" ? "info" :
  s === "PARTIELLEMENT_RECEPTIONNE" ? "warning" :
  s === "BROUILLON" ? "muted" : "accent";

export default function AchatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canEdit = hasRole("ADMIN", "RESP_LOGISTIQUE", "ACHETEUR");

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [bc, setBc] = useState<any>(null);
  const [receipts, setReceipts] = useState<any[]>([]);

  const load = () => {
    if (!id) return;
    setLoading(true);
    purchaseOrdersApi
      .get(id)
      .then(setBc)
      .catch(() => toast.error("Impossible de charger le bon de commande"))
      .finally(() => setLoading(false));
    receiptsApi
      .list({ purchase_order_id: id })
      .then((rs) => setReceipts([...rs].sort((a, b) => String(a.date_reception).localeCompare(String(b.date_reception)))))
      .catch(() => setReceipts([]));
  };

  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async () => {
    if (!id || !bc) return;
    setDeleting(true);
    try {
      await purchaseOrdersApi.remove(id);
      toast.success("Bon de commande supprimé");
      navigate("/achats");
    } catch (err) {
      toast.error("Erreur lors de la suppression", { description: apiError(err) });
      setDeleting(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!bc) return;

    setGeneratingPDF(true);
    try {
      // Charger les paramètres de l'entreprise
      const companySettings = await companySettingsApi.get();

      // Charger les infos du fournisseur (optionnel)
      let supplier = null;
      try {
        const suppliers = await suppliersApi.list();
        supplier = suppliers.find((s: any) => s.raison_sociale === bc.supplier_nom);
      } catch (err) {
        // Ignore si erreur de chargement fournisseur
      }

      // Générer le PDF
      await generatePurchaseOrderPDF(bc, companySettings, supplier);

      toast.success("PDF généré avec succès", {
        description: `Fichier : Bon_Commande_${bc.numero}.pdf`,
      });
    } catch (err) {
      toast.error("Erreur lors de la génération du PDF", { description: apiError(err) });
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!bc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Bon de commande introuvable</p>
        <Button variant="outline" onClick={() => navigate("/achats")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux achats
        </Button>
      </div>
    );
  }

  const total = bc.montant_total || 0;
  const isDraft = bc.statut === "BROUILLON";

  return (
    <>
      <PageHeader
        breadcrumb="Achats"
        title={`Bon de commande ${bc.numero}`}
        description={`Fournisseur : ${bc.supplier_nom || "—"}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/achats")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            {canEdit && (
              <>
                <Button variant="outline" size="sm" onClick={handleGeneratePDF} disabled={generatingPDF}>
                  {generatingPDF ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Télécharger PDF
                </Button>
                {isDraft && (
                  <>
                    <NewCommandeDialog
                      order={bc}
                      onSuccess={load}
                      trigger={
                        <Button variant="outline" size="sm">
                          <Edit2 className="w-4 h-4 mr-2" />
                          Modifier
                        </Button>
                      }
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={deleting}>
                          {deleting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 mr-2" />
                          )}
                          Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer le bon de commande {bc.numero} ? Cette action est
                            irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-6">
        {/* Informations générales */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Informations générales</h3>
              <p className="text-sm text-muted-foreground">Détails du bon de commande</p>
            </div>
            <StatusBadge tone={statutTone(bc.statut) as any}>{bc.statut}</StatusBadge>
          </div>
          <Separator className="mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Numéro</p>
              <p className="font-mono text-sm font-semibold">{bc.numero}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Fournisseur</p>
              <p className="text-sm font-medium">{bc.supplier_nom || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Demande d'origine</p>
              {bc.request_id ? (
                <Link to={`/demandes/${bc.request_id}`} className="font-mono text-sm font-semibold text-primary hover:underline">
                  {bc.request_numero}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Date création</p>
              <p className="text-sm">{formatDate(bc.created_at)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Montant total HT</p>
              <p className="text-sm font-bold text-primary">{formatFcfa(total)}</p>
            </div>
          </div>
        </Card>

        {/* Lignes du bon de commande */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Articles commandés</h3>
            <p className="text-sm text-muted-foreground">{bc.lignes?.length || 0} ligne(s)</p>
          </div>
          <Separator className="mb-4" />
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Article</th>
                  <th className="text-right font-medium px-4 py-3">Quantité</th>
                  <th className="text-right font-medium px-4 py-3">Reçu</th>
                  <th className="text-right font-medium px-4 py-3">Prix unitaire</th>
                  <th className="text-right font-medium px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bc.lignes && bc.lignes.length > 0 ? (
                  bc.lignes.map((ligne: any, idx: number) => {
                    const subtotal = (parseFloat(ligne.quantite) || 0) * (parseFloat(ligne.prix_unitaire) || 0);
                    return (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{ligne.article_designation || ligne.designation_libre || "—"}</p>
                            {ligne.article_code && (
                              <p className="text-xs text-muted-foreground font-mono">{ligne.article_code}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{ligne.quantite ? Number(ligne.quantite) : "—"}</td>
                        <td className={`px-4 py-3 text-right tabular-nums ${Number(ligne.quantite_recue) < Number(ligne.quantite) ? "text-warning" : "text-muted-foreground"}`}>
                          {Number(ligne.quantite_recue) || 0}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatFcfa(ligne.prix_unitaire)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatFcfa(subtotal)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Aucune ligne de commande
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-muted/20 border-t-2 border-border">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-semibold">
                    Total HT
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-lg font-bold text-primary">
                    {formatFcfa(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Livraisons reçues pour ce BC */}
        {receipts.length > 0 && (
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Réceptions</h3>
              <p className="text-sm text-muted-foreground">{receipts.length} livraison(s) enregistrée(s)</p>
            </div>
            <Separator className="mb-4" />
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Bon de réception</th>
                    <th className="text-left font-medium px-4 py-3">Date</th>
                    <th className="text-left font-medium px-4 py-3">Dépôt</th>
                    <th className="text-left font-medium px-4 py-3">Conformité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {receipts.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/receptions/${r.id}`} className="font-mono text-sm font-semibold text-primary hover:underline">{r.numero}</Link>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{formatDate(r.date_reception)}</td>
                      <td className="px-4 py-3">{r.depot_code}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={r.conformite === "CONFORME" ? "success" : r.conformite === "PARTIELLE" ? "warning" : "destructive"}>
                          {r.conformite}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Informations complémentaires */}
        {isDraft && (
          <Card className="p-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 dark:text-amber-100">Brouillon</h4>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                  Ce bon de commande est en brouillon. Vous pouvez le modifier ou le supprimer. Changez le statut en "Envoyée" pour le valider.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
