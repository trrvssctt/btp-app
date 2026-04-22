import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Truck, Package, ArrowDown, ArrowUp, RotateCcw, Sliders, Loader2 } from "lucide-react";
import { stockMovementsApi } from "@/lib/api";
import { formatDateTime, mouvementLabel } from "@/data/labels";
import { useEffect, useState } from "react";
import { NewMouvementDialog } from "@/components/dialogs/NewMouvementDialog";

const iconFor = (type: string) => {
  if (type === "ENTREE" || type.includes("ENTREE") || type === "TRANSFERT_ENTRANT") return ArrowDown;
  if (type === "SORTIE" || type.includes("SORTIE") || type === "TRANSFERT_SORTANT") return ArrowUp;
  if (type === "RETOUR_CHANTIER") return RotateCcw;
  if (type === "AJUSTEMENT_INVENTAIRE") return Sliders;
  return Package;
};

const isSortie = (type: string, quantite: number) =>
  type === "SORTIE" || type.includes("SORTIE") || type === "TRANSFERT_SORTANT" ||
  (type === "AJUSTEMENT_INVENTAIRE" && quantite < 0);

export default function MouvementsPage() {
  const [mouvements, setMouvements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    stockMovementsApi.list()
      .then(setMouvements)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <AppLayout>
      <PageHeader
        breadcrumb="Opérations"
        title="Journal des mouvements"
        description="Traçabilité complète des entrées, sorties, transferts, retours et ajustements."
        actions={<NewMouvementDialog onSuccess={() => setRefreshKey((k) => k + 1)} />}
      />
      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
          </div>
        ) : (
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
              {mouvements.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Aucun mouvement enregistré.</td></tr>
              )}
              {mouvements.map((m) => {
                const Icon = iconFor(m.type_mouvement);
                const negative = isSortie(m.type_mouvement, Number(m.quantite));
                const qte = Math.abs(Number(m.quantite));
                return (
                  <tr key={m.id} className="hover:bg-muted/30 transition-base">
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{formatDateTime(m.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${negative ? "text-warning" : "text-success"}`} />
                        <span className="text-sm">{mouvementLabel[m.type_mouvement] ?? m.type_mouvement}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{m.article_code}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[260px]">{m.article_designation}</p>
                    </td>
                    <td className="px-4 py-3 text-foreground">{m.depot_code}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${negative ? "text-warning" : "text-success"}`}>
                      {negative ? "−" : "+"}{qte}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{m.reference_doc ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.user_nom ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
