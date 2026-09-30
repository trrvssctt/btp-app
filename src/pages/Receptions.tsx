import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Loader2, Search, X, Warehouse, Filter, Truck } from "lucide-react";
import { receptions } from "@/data/mock";
import { formatDate } from "@/data/labels";
import { NewReceptionDialog } from "@/components/dialogs/NewReceptionDialog";
import { useApiData } from "@/hooks/useApiData";
import { depotsApi, receiptsApi, suppliersApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const MOCK_FALLBACK = receptions.map((r) => ({
  id: r.id,
  numero: r.numero,
  created_at: r.date,
  commande_numero: r.commandeNumero,
  supplier_nom: r.fournisseur,
  depot_code: r.depotId,
  conformite: r.conformite,
}));

const FILTRES = ["q", "conformite", "depot", "fournisseur", "du", "au"] as const;

export default function ReceptionsPage() {
  const { hasRole } = useAuth();
  const canCreate = hasRole("ADMIN", "MAGASINIER", "ACHETEUR", "RESP_LOGISTIQUE");
  const [refreshKey, setRefreshKey] = useState(0);

  const [depots, setDepots] = useState<any[]>([]);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const { values: f, debounced, set, clear, active } = useUrlFilters(FILTRES);

  useEffect(() => {
    depotsApi.list().then(setDepots).catch(() => {});
    suppliersApi.list().then(setFournisseurs).catch(() => {});
  }, []);

  const { data, loading, usingFallback } = useApiData<any[]>(
    () => receiptsApi.list({
      q: debounced.q || undefined,
      conformite: debounced.conformite || undefined,
      depot_id: debounced.depot || undefined,
      supplier_id: debounced.fournisseur || undefined,
      date_from: debounced.du || undefined,
      date_to: debounced.au || undefined,
    }),
    MOCK_FALLBACK,
    [refreshKey, debounced],
  );

  return (
    <>
      <PageHeader
        breadcrumb="Approvisionnement"
        title="Réceptions fournisseur"
        description="Bons de réception, contrôle de conformité, écarts et reliquats."
        actions={canCreate ? <NewReceptionDialog onSuccess={() => setRefreshKey((k) => k + 1)} /> : undefined}
      />
      <OfflineBanner show={usingFallback} />
      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        {/* Barre de filtres */}
        {!usingFallback && (
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input value={f.q} onChange={(e) => set("q", e.target.value)}
                  placeholder="N° BR, n° BC, fournisseur ou article reçu" className="pl-9 h-9" />
                {f.q && (
                  <button onClick={() => set("q", "")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Select value={f.fournisseur || "all"} onValueChange={(v) => set("fournisseur", v === "all" ? "" : v)}>
                <SelectTrigger className="h-9 w-full lg:w-52">
                  <Truck className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Tous les fournisseurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les fournisseurs</SelectItem>
                  {fournisseurs.map((s) => <SelectItem key={s.id} value={s.id}>{s.raison_sociale}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={f.depot || "all"} onValueChange={(v) => set("depot", v === "all" ? "" : v)}>
                <SelectTrigger className="h-9 w-full lg:w-48">
                  <Warehouse className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Tous les dépôts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les dépôts</SelectItem>
                  {depots.map((d) => (
                    <SelectItem key={d.id} value={d.id}><span className="font-mono text-xs mr-2">{d.code}</span>{d.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={f.conformite || "all"} onValueChange={(v) => set("conformite", v === "all" ? "" : v)}>
                <SelectTrigger className="h-9 w-full lg:w-44">
                  <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Conformité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toute conformité</SelectItem>
                  <SelectItem value="CONFORME">Conforme</SelectItem>
                  <SelectItem value="PARTIELLE">Partielle</SelectItem>
                  <SelectItem value="RESERVE">Avec réserve</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Reçu du</span>
                <Input type="date" value={f.du} max={f.au || undefined} onChange={(e) => set("du", e.target.value)} className="h-9 w-40" />
                <span className="text-muted-foreground">au</span>
                <Input type="date" value={f.au} min={f.du || undefined} onChange={(e) => set("au", e.target.value)} className="h-9 w-40" />
              </div>
              <span className="text-xs text-muted-foreground">
                {loading ? "…" : `${data.length} réception${data.length !== 1 ? "s" : ""}`}
              </span>
              {active > 0 && (
                <Button variant="ghost" size="sm" onClick={clear} className="h-9 gap-1.5 ml-auto text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />Effacer les filtres ({active})
                </Button>
              )}
            </div>
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-3">Numéro</th>
              <th className="text-left font-medium px-4 py-3">Date</th>
              <th className="text-left font-medium px-4 py-3">Commande</th>
              <th className="text-left font-medium px-4 py-3">Fournisseur</th>
              <th className="text-left font-medium px-4 py-3">Dépôt</th>
              <th className="text-right font-medium px-4 py-3">Lignes</th>
              <th className="text-left font-medium px-4 py-3">Conformité</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr><td colSpan={7} className="py-10 text-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Chargement…</td></tr>
            )}
            {!loading && data.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">
                {active > 0 ? "Aucune réception ne correspond aux filtres." : "Aucune réception enregistrée."}
              </td></tr>
            )}
            {!loading && data.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30 transition-base">
                <td className="px-4 py-3 font-mono text-xs">
                  {usingFallback ? <span className="text-accent">{r.numero}</span> : (
                    <Link to={`/receptions/${r.id}`} className="text-accent hover:underline">{r.numero}</Link>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">{formatDate(r.date_reception || r.created_at)}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.commande_numero ?? "—"}</td>
                <td className="px-4 py-3 font-medium">{r.supplier_nom ?? "—"}</td>
                <td className="px-4 py-3 text-foreground">{r.depot_code}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{r.nb_lignes ?? "—"}</td>
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
    </>
  );
}
