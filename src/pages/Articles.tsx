import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { articles as mockArticles } from "@/data/mock";
import { formatEur, natureLabel } from "@/data/labels";
import { NewArticleDialog } from "@/components/dialogs/NewArticleDialog";
import { useApiData } from "@/hooks/useApiData";
import { articlesApi } from "@/lib/api";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const natureTone: Record<string, "muted" | "info" | "warning" | "success" | "accent"> = {
  STOCKABLE: "info", ACHAT_DIRECT: "warning", DURABLE: "accent", CONSOMMABLE: "muted",
};

type ApiArticle = {
  id: string;
  code: string;
  designation: string;
  famille?: string;
  unite?: string;
  nature: string;
  prix_moyen: number | string | null;
};

export default function ArticlesPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole("ADMIN", "MAGASINIER");
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, usingFallback } = useApiData<ApiArticle[]>(
    () => articlesApi.list(),
    mockArticles.map((a) => ({
      id: a.id, code: a.code, designation: a.designation,
      famille: a.famille, unite: a.unite, nature: a.nature, prix_moyen: a.prixMoyen,
    })),
    [refreshKey],
  );

  return (
    <AppLayout>
      <PageHeader
        breadcrumb="Référentiels"
        title="Articles"
        description="Catalogue des articles, familles et natures (stockable, achat direct, durable)."
        actions={canWrite ? <NewArticleDialog onSuccess={() => setRefreshKey((k) => k + 1)} /> : undefined}
      />
      <OfflineBanner show={usingFallback} />

      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-3">Code</th>
              <th className="text-left font-medium px-4 py-3">Désignation</th>
              <th className="text-left font-medium px-4 py-3">Famille</th>
              <th className="text-left font-medium px-4 py-3">Unité</th>
              <th className="text-left font-medium px-4 py-3">Nature</th>
              <th className="text-right font-medium px-4 py-3">Prix moyen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr><td colSpan={6} className="py-10 text-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Chargement…</td></tr>
            )}
            {!loading && data.map((a) => (
              <tr key={a.id} className="hover:bg-muted/30 transition-base">
                <td className="px-4 py-3 font-mono text-xs">{a.code}</td>
                <td className="px-4 py-3 font-medium">{a.designation}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.famille}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.unite}</td>
                <td className="px-4 py-3"><StatusBadge tone={natureTone[a.nature] ?? "muted"}>{natureLabel[a.nature as keyof typeof natureLabel] ?? a.nature}</StatusBadge></td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{formatEur(Number(a.prix_moyen) || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
