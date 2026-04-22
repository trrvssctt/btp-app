import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Loader2 } from "lucide-react";
import { commandes } from "@/data/mock";
import { formatDate } from "@/data/labels";
import { NewCommandeDialog } from "@/components/dialogs/NewCommandeDialog";
import { useApiData } from "@/hooks/useApiData";
import { purchaseOrdersApi } from "@/lib/api";

const MOCK_FALLBACK = commandes.map((c) => ({
  id: c.id,
  numero: c.numero,
  supplier_nom: c.fournisseur,
  created_at: c.date,
  nb_lignes: c.lignes,
  montant_total: c.montant,
  statut: c.statut,
}));

const tone = (s: string) =>
  s === "RECUE" ? "success" : s === "PARTIELLE" ? "warning" : s === "CLOTUREE" ? "muted" : s === "ENVOYEE" ? "info" : "accent";

const formatFcfa = (n: number | string | null) =>
  n == null ? "—" : `${Number(n).toLocaleString("fr-SN")} FCFA`;

export default function AchatsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, loading, usingFallback } = useApiData<any[]>(
    () => purchaseOrdersApi.list(),
    MOCK_FALLBACK,
    [refreshKey],
  );

  return (
    <AppLayout>
      <PageHeader
        breadcrumb="Approvisionnement"
        title="Achats & commandes"
        description="Consultations fournisseurs, devis, bons de commande, suivi des livraisons et reliquats."
        actions={<NewCommandeDialog onSuccess={() => setRefreshKey((k) => k + 1)} />}
      />
      <OfflineBanner show={usingFallback} />
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
            {loading && (
              <tr><td colSpan={6} className="py-10 text-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Chargement…</td></tr>
            )}
            {!loading && data.map((c) => (
              <tr key={c.id} className="hover:bg-muted/30 transition-base">
                <td className="px-4 py-3 font-mono text-xs text-accent">{c.numero}</td>
                <td className="px-4 py-3 font-medium">{c.supplier_nom}</td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">{formatDate(c.created_at)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{c.nb_lignes ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatFcfa(c.montant_total)}</td>
                <td className="px-4 py-3"><StatusBadge tone={tone(c.statut) as any}>{c.statut}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
