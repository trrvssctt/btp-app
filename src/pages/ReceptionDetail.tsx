import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { receiptsApi } from "@/lib/api";
import { formatDate } from "@/data/labels";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const conformiteTone = (c: string) =>
  c === "CONFORME" ? "success" : c === "PARTIELLE" ? "warning" : "destructive";

const commandeTone = (s: string) =>
  s === "RECEPTIONNE" || s === "RECUE" ? "success" :
  s === "PARTIELLEMENT_RECEPTIONNE" || s === "PARTIELLE" ? "warning" :
  s === "ENVOYEE" ? "info" : "muted";

const qte = (n: number | string | null | undefined) =>
  n == null ? "—" : Number(n).toLocaleString("fr-SN", { maximumFractionDigits: 2 });

export default function ReceptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canSeeCommande = hasRole("ADMIN", "ACHETEUR", "RESP_LOGISTIQUE");

  const [loading, setLoading] = useState(true);
  const [br, setBr] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    receiptsApi
      .get(id)
      .then(setBr)
      .catch(() => toast.error("Impossible de charger la réception"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!br) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Réception introuvable</p>
        <Button variant="outline" onClick={() => navigate("/receptions")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux réceptions
        </Button>
      </div>
    );
  }

  const histo = br.historique;
  const receptions: any[] = histo?.receptions ?? [];

  return (
    <>
      <PageHeader
        breadcrumb="Réceptions"
        title={`Bon de réception ${br.numero}`}
        description={br.commande_numero ? `Commande ${br.commande_numero} — ${br.supplier_nom}` : "Réception hors commande"}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate("/receptions")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        }
      />

      <div className="grid gap-6">
        {/* Informations générales */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Informations générales</h3>
              <p className="text-sm text-muted-foreground">Livraison enregistrée</p>
            </div>
            <StatusBadge tone={conformiteTone(br.conformite) as any}>{br.conformite}</StatusBadge>
          </div>
          <Separator className="mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Date réception</p>
              <p className="text-sm font-semibold">{formatDate(br.date_reception)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Dépôt</p>
              <p className="text-sm font-medium">{br.depot_code}</p>
              <p className="text-xs text-muted-foreground">{br.depot_nom}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Commande</p>
              {br.purchase_order_id ? (
                canSeeCommande ? (
                  <Link to={`/achats/${br.purchase_order_id}`} className="font-mono text-sm font-semibold text-primary hover:underline">
                    {br.commande_numero}
                  </Link>
                ) : (
                  <p className="font-mono text-sm font-semibold">{br.commande_numero}</p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Fournisseur</p>
              <p className="text-sm font-medium">{br.supplier_nom ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Réceptionné par</p>
              <p className="text-sm">{br.recu_par ?? "—"}</p>
            </div>
          </div>
          {br.reserve && (
            <div className="mt-4 flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="whitespace-pre-line">{br.reserve}</p>
            </div>
          )}
        </Card>

        {/* Articles reçus lors de cette livraison */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Articles reçus</h3>
            <p className="text-sm text-muted-foreground">{br.lignes?.length || 0} ligne(s) dans cette livraison</p>
          </div>
          <Separator className="mb-4" />
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Article</th>
                  <th className="text-right font-medium px-4 py-3">Commandé</th>
                  <th className="text-right font-medium px-4 py-3">Reçu ce jour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {br.lignes?.length > 0 ? (
                  br.lignes.map((l: any) => (
                    <tr key={l.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{l.article_designation || l.designation_libre || "—"}</p>
                        {l.article_code && <p className="text-xs text-muted-foreground font-mono">{l.article_code}</p>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{qte(l.quantite_commandee)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">{qte(l.quantite_recue)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      Aucune ligne détaillée pour cette réception
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Suivi des livraisons de la commande (réceptions sur plusieurs jours) */}
        {histo && (
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Suivi des livraisons — {br.commande_numero}</h3>
                <p className="text-sm text-muted-foreground">
                  {receptions.length} réception(s) pour cette commande
                </p>
              </div>
              <StatusBadge tone={commandeTone(br.commande_statut) as any}>{br.commande_statut}</StatusBadge>
            </div>
            <Separator className="mb-4" />

            {/* Chronologie des bons de réception */}
            <ol className="relative border-l border-border ml-2 mb-6 space-y-4">
              {receptions.map((r) => {
                const current = r.id === br.id;
                return (
                  <li key={r.id} className="ml-4">
                    <span className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-background ${current ? "bg-primary" : "bg-muted-foreground/40"}`} />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-sm tabular-nums text-muted-foreground w-24">{formatDate(r.date_reception)}</span>
                      {current ? (
                        <span className="font-mono text-sm font-semibold">{r.numero} (cette réception)</span>
                      ) : (
                        <Link to={`/receptions/${r.id}`} className="font-mono text-sm font-semibold text-primary hover:underline">
                          {r.numero}
                        </Link>
                      )}
                      <span className="text-xs text-muted-foreground">{r.depot_code}</span>
                      <StatusBadge tone={conformiteTone(r.conformite) as any}>{r.conformite}</StatusBadge>
                    </div>
                    {r.reserve && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.reserve}</p>}
                  </li>
                );
              })}
            </ol>

            {/* Matrice article × livraison */}
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Article</th>
                    <th className="text-right font-medium px-3 py-3">Commandé</th>
                    {receptions.map((r) => (
                      <th key={r.id} className={`text-right font-medium px-3 py-3 whitespace-nowrap ${r.id === br.id ? "text-primary" : ""}`}>
                        {formatDate(r.date_reception)}
                        <span className="block font-mono normal-case text-[10px]">{r.numero}</span>
                      </th>
                    ))}
                    <th className="text-right font-medium px-3 py-3">Total reçu</th>
                    <th className="text-right font-medium px-4 py-3">Reste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {histo.lignes.map((l: any) => {
                    const reste = Number(l.quantite_commandee) - Number(l.total_recu);
                    return (
                      <tr key={l.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{l.article_designation || l.designation_libre || "—"}</p>
                          {l.article_code && <p className="text-xs text-muted-foreground font-mono">{l.article_code}</p>}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{qte(l.quantite_commandee)}</td>
                        {receptions.map((r) => (
                          <td key={r.id} className={`px-3 py-3 text-right tabular-nums ${r.id === br.id ? "font-semibold bg-primary/5" : ""}`}>
                            {l.recus?.[r.id] ? qte(l.recus[r.id]) : <span className="text-muted-foreground/50">—</span>}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-right tabular-nums font-semibold">{qte(l.total_recu)}</td>
                        <td className={`px-4 py-3 text-right tabular-nums font-semibold ${reste > 0 ? "text-warning" : "text-success"}`}>
                          {reste > 0 ? qte(reste) : "Soldé"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
