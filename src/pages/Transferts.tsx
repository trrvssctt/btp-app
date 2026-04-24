import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ArrowRight, Loader2 } from "lucide-react";
import { NewTransfertDialog } from "@/components/dialogs/NewTransfertDialog";
import { useApiData } from "@/hooks/useApiData";
import { transfersApi } from "@/lib/api";
import { formatDate } from "@/data/labels";
import { useAuth } from "@/contexts/AuthContext";

const MOCK_TRANSFERTS = [
  { id: "t1", numero: "TR-2026-0034", created_at: "2026-04-17", article_code: "CIM-32.5", article_designation: "Ciment Portland 32.5R",  quantite: 60,  unite: "sac",  depot_from_code: "MAG-DKR", depot_to_code: "CHAN-01", statut: "REÇU" },
  { id: "t2", numero: "TR-2026-0033", created_at: "2026-04-16", article_code: "RON-10",   article_designation: "Rond à béton Ø10",        quantite: 30,  unite: "barre",depot_from_code: "MAG-DKR", depot_to_code: "CHAN-02", statut: "EXPÉDIÉ" },
  { id: "t3", numero: "TR-2026-0032", created_at: "2026-04-15", article_code: "GRS-0-20", article_designation: "Gravier concassé 0/20",   quantite: 400, unite: "m³",   depot_from_code: "MAG-DKR", depot_to_code: "CHAN-03", statut: "PRÉPARÉ" },
];

const tone = (s: string) =>
  s === "REÇU" ? "success" : s === "EXPÉDIÉ" ? "info" : s === "PRÉPARÉ" ? "warning" : s === "LITIGE" ? "destructive" : "muted";

export default function TransfertsPage() {
  const { hasRole } = useAuth();
  const canCreate = hasRole("ADMIN", "MAGASINIER", "RESP_LOGISTIQUE");
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, loading, usingFallback } = useApiData<any[]>(
    () => transfersApi.list(),
    MOCK_TRANSFERTS,
    [refreshKey],
  );

  return (
    <AppLayout>
      <PageHeader
        breadcrumb="Opérations"
        title="Transferts inter-dépôts"
        description="Mouvements émetteur → récepteur avec accusé de réception obligatoire."
        actions={canCreate ? <NewTransfertDialog onSuccess={() => setRefreshKey((k) => k + 1)} /> : undefined}
      />
      <OfflineBanner show={usingFallback} />
      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-3">Numéro</th>
              <th className="text-left font-medium px-4 py-3">Date</th>
              <th className="text-left font-medium px-4 py-3">Trajet</th>
              <th className="text-left font-medium px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr><td colSpan={4} className="py-10 text-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Chargement…</td></tr>
            )}
            {!loading && data.map((t) => (
              <tr key={t.id} className="hover:bg-muted/30 transition-base">
                <td className="px-4 py-3 font-mono text-xs text-accent">{t.numero}</td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">{formatDate(t.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono">{t.depot_from_code}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-mono">{t.depot_to_code}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={tone(t.statut) as any}>{t.statut}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
