import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Loader2 } from "lucide-react";
import { receptions } from "@/data/mock";
import { formatDate } from "@/data/labels";
import { NewReceptionDialog } from "@/components/dialogs/NewReceptionDialog";
import { useApiData } from "@/hooks/useApiData";
import { receiptsApi } from "@/lib/api";

const MOCK_FALLBACK = receptions.map((r) => ({
  id: r.id,
  numero: r.numero,
  created_at: r.date,
  commande_numero: r.commandeNumero,
  supplier_nom: r.fournisseur,
  depot_code: r.depotId,
  conformite: r.conformite,
}));

export default function ReceptionsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, loading, usingFallback } = useApiData<any[]>(
    () => receiptsApi.list(),
    MOCK_FALLBACK,
    [refreshKey],
  );

  return (
    <AppLayout>
      <PageHeader
        breadcrumb="Approvisionnement"
        title="Réceptions fournisseur"
        description="Bons de réception, contrôle de conformité, écarts et reliquats."
        actions={<NewReceptionDialog onSuccess={() => setRefreshKey((k) => k + 1)} />}
      />
      <OfflineBanner show={usingFallback} />
      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-3">Numéro</th>
              <th className="text-left font-medium px-4 py-3">Date</th>
              <th className="text-left font-medium px-4 py-3">Commande</th>
              <th className="text-left font-medium px-4 py-3">Fournisseur</th>
              <th className="text-left font-medium px-4 py-3">Dépôt</th>
              <th className="text-left font-medium px-4 py-3">Conformité</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr><td colSpan={6} className="py-10 text-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Chargement…</td></tr>
            )}
            {!loading && data.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30 transition-base">
                <td className="px-4 py-3 font-mono text-xs text-accent">{r.numero}</td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">{formatDate(r.created_at || r.date_reception)}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.commande_numero ?? "—"}</td>
                <td className="px-4 py-3 font-medium">{r.supplier_nom ?? "—"}</td>
                <td className="px-4 py-3 text-foreground">{r.depot_code}</td>
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
    </AppLayout>
  );
}
