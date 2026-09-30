import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, ArrowRight, Loader2, PackageCheck, Truck } from "lucide-react";
import { transfersApi, apiError } from "@/lib/api";
import { formatDate, formatDateTime } from "@/data/labels";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const transfertTone = (s: string) =>
  s === "REÇU" || s === "CLÔTURÉ" ? "success" : s === "EXPÉDIÉ" ? "info" : s === "LITIGE" ? "destructive" : "muted";

const qte = (n: number | string) => Number(n).toLocaleString("fr-SN", { maximumFractionDigits: 2 });

export default function TransfertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canReceive = hasRole("ADMIN", "MAGASINIER", "RESP_LOGISTIQUE");

  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState(false);
  const [t, setT] = useState<any>(null);

  const load = () => {
    if (!id) return;
    setLoading(true);
    transfersApi
      .get(id)
      .then(setT)
      .catch(() => toast.error("Impossible de charger le transfert"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReceive = async () => {
    if (!id) return;
    setReceiving(true);
    try {
      await transfersApi.receive(id);
      toast.success(`Transfert ${t.numero} réceptionné`, { description: `Stock disponible au dépôt ${t.depot_to_code}.` });
      load();
    } catch (err) {
      toast.error("Erreur lors de la réception", { description: apiError(err) });
    } finally {
      setReceiving(false);
    }
  };

  if (loading && !t) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!t) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Transfert introuvable</p>
        <Button variant="outline" onClick={() => navigate("/transferts")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux transferts
        </Button>
      </div>
    );
  }

  const enTransit = t.statut === "EXPÉDIÉ";

  return (
    <>
      <PageHeader
        breadcrumb="Transferts"
        title={`Transfert ${t.numero}`}
        description={`${t.depot_from_code} → ${t.depot_to_code}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/transferts")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            {enTransit && canReceive && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" disabled={receiving}>
                    {receiving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PackageCheck className="w-4 h-4 mr-2" />}
                    Confirmer la réception
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Accusé de réception</AlertDialogTitle>
                    <AlertDialogDescription>
                      Confirmez que les {t.lines?.length} article(s) sont bien arrivés au dépôt {t.depot_to_code}.
                      Le stock en transit deviendra disponible dans ce dépôt.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReceive}>Confirmer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        }
      />

      <div className="grid gap-6">
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Informations générales</h3>
              <p className="text-sm text-muted-foreground">Créé le {formatDate(t.created_at)}</p>
            </div>
            <StatusBadge tone={transfertTone(t.statut) as any}>{t.statut}</StatusBadge>
          </div>
          <Separator className="mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Dépôt émetteur</p>
              <p className="font-semibold">{t.depot_from_code}</p>
              <p className="text-sm text-muted-foreground">{t.depot_from_nom}</p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Truck className="w-3.5 h-3.5" />
                {t.expedie_le ? `Expédié le ${formatDateTime(t.expedie_le)}${t.expedie_par ? ` par ${t.expedie_par}` : ""}` : "Pas encore expédié"}
              </p>
            </div>
            <ArrowRight className="hidden md:block w-5 h-5 text-muted-foreground" />
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Dépôt récepteur</p>
              <p className="font-semibold">{t.depot_to_code}</p>
              <p className="text-sm text-muted-foreground">{t.depot_to_nom}</p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <PackageCheck className="w-3.5 h-3.5" />
                {t.recu_le ? `Reçu le ${formatDateTime(t.recu_le)}${t.recu_par ? ` par ${t.recu_par}` : ""}` : enTransit ? "En transit — réception à confirmer" : "—"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Articles transférés</h3>
            <p className="text-sm text-muted-foreground">{t.lines?.length || 0} ligne(s)</p>
          </div>
          <Separator className="mb-4" />
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Article</th>
                  <th className="text-right font-medium px-4 py-3">Quantité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(t.lines ?? []).map((l: any) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{l.article_designation}</p>
                      <p className="text-xs text-muted-foreground font-mono">{l.article_code}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{qte(l.quantite)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
