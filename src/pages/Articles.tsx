import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { articles as mockArticles } from "@/data/mock";
import { formatEur, natureLabel } from "@/data/labels";
import { NewArticleDialog } from "@/components/dialogs/NewArticleDialog";
import { EditArticleDialog } from "@/components/dialogs/EditArticleDialog";
import { useApiData } from "@/hooks/useApiData";
import { articlesApi, apiError } from "@/lib/api";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Loader2, Search, X, Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const natureTone: Record<string, "muted" | "info" | "warning" | "success" | "accent"> = {
  STOCKABLE: "info", ACHAT_DIRECT: "warning", DURABLE: "accent", CONSOMMABLE: "muted",
};

type ApiArticle = {
  id: string;
  code: string;
  designation: string;
  famille?: string;
  famille_id?: string | null;
  unite?: string;
  unite_id?: string | null;
  nature: string;
  prix_moyen: number | string | null;
  seuil_min: number | string | null;
  is_used: boolean;
};

const NATURES = ["STOCKABLE", "ACHAT_DIRECT", "DURABLE", "CONSOMMABLE"];

function fmt(v: number | string | null) {
  const n = Number(v);
  return n > 0 ? n.toLocaleString("fr-SN") : "—";
}

export default function ArticlesPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole("ADMIN", "MAGASINIER");
  const canDelete = hasRole("ADMIN");
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [filtreNature, setFiltreNature] = useState("");
  const [filtreFamille, setFiltreFamille] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ApiArticle | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, loading, usingFallback } = useApiData<ApiArticle[]>(
    () => articlesApi.list(),
    mockArticles.map((a) => ({
      id: a.id, code: a.code, designation: a.designation,
      famille: a.famille, unite: a.unite, nature: a.nature,
      prix_moyen: a.prixMoyen, seuil_min: null, is_used: false,
    })),
    [refreshKey],
  );

  const familles = useMemo(() => {
    const set = new Set(data.map((a) => a.famille).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((a) => {
      if (q && !a.code.toLowerCase().includes(q) && !a.designation.toLowerCase().includes(q)) return false;
      if (filtreNature && a.nature !== filtreNature) return false;
      if (filtreFamille && a.famille !== filtreFamille) return false;
      return true;
    });
  }, [data, search, filtreNature, filtreFamille]);

  const hasFilters = search !== "" || filtreNature !== "" || filtreFamille !== "";
  const resetFilters = () => { setSearch(""); setFiltreNature(""); setFiltreFamille(""); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await articlesApi.remove(deleteTarget.id);
      toast.success("Article supprimé", { description: `${deleteTarget.code} désactivé du catalogue.` });
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error("Suppression impossible", { description: apiError(err) });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const colSpan = canWrite ? 8 : 7;

  return (
    <>
      <PageHeader
        breadcrumb="Référentiels"
        title="Articles"
        description="Catalogue des articles, familles et natures (stockable, achat direct, durable)."
        actions={canWrite ? <NewArticleDialog onSuccess={() => setRefreshKey((k) => k + 1)} /> : undefined}
      />
      <OfflineBanner show={usingFallback} />

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par code ou désignation…"
            className="pl-8"
          />
        </div>
        <Select value={filtreFamille} onValueChange={setFiltreFamille}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Toutes les familles" />
          </SelectTrigger>
          <SelectContent>
            {familles.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtreNature} onValueChange={setFiltreNature}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Toutes les natures" />
          </SelectTrigger>
          <SelectContent>
            {NATURES.map((n) => (
              <SelectItem key={n} value={n}>{natureLabel[n as keyof typeof natureLabel] ?? n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5 text-muted-foreground">
            <X className="w-3.5 h-3.5" /> Réinitialiser
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-3">Code</th>
              <th className="text-left font-medium px-4 py-3">Désignation</th>
              <th className="text-left font-medium px-4 py-3">Famille</th>
              <th className="text-left font-medium px-4 py-3">Unité</th>
              <th className="text-left font-medium px-4 py-3">Nature</th>
              <th className="text-right font-medium px-4 py-3">Prix moy.</th>
              <th className="text-right font-medium px-4 py-3">Seuil min.</th>
              {canWrite && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td colSpan={colSpan} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />Chargement…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="py-10 text-center text-muted-foreground">
                  Aucun article ne correspond aux filtres sélectionnés.
                </td>
              </tr>
            )}
            {!loading && filtered.map((a) => (
              <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{a.code}</td>
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-1.5">
                    {a.is_used && (
                      <AlertTriangle
                        className="w-3.5 h-3.5 text-amber-500 shrink-0"
                        title="Article référencé dans des documents — modification et suppression bloquées"
                      />
                    )}
                    {a.designation}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{a.famille ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.unite ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={natureTone[a.nature] ?? "muted"}>
                    {natureLabel[a.nature as keyof typeof natureLabel] ?? a.nature}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {formatEur(Number(a.prix_moyen) || 0)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {fmt(a.seuil_min)}
                </td>
                {canWrite && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <EditArticleDialog
                        article={a}
                        onSuccess={() => setRefreshKey((k) => k + 1)}
                      />
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-7 px-2 text-xs border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40"
                          disabled={a.is_used}
                          title={a.is_used ? "Article référencé — suppression impossible" : "Supprimer l'article"}
                          onClick={() => setDeleteTarget(a)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && (
        <p className="text-xs text-muted-foreground mt-2 text-right">
          {filtered.length} article{filtered.length !== 1 ? "s" : ""}
          {hasFilters && data.length !== filtered.length ? ` sur ${data.length}` : ""}
        </p>
      )}

      {/* Confirmation suppression */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-destructive" /> Supprimer l'article
            </AlertDialogTitle>
            <AlertDialogDescription>
              L'article <span className="font-mono font-semibold">{deleteTarget?.code}</span> —{" "}
              <strong>{deleteTarget?.designation}</strong> sera désactivé et n'apparaîtra plus dans le catalogue.
              Cette action est une suppression logique (l'historique est conservé).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-3 h-3 animate-spin mr-2" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
