import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { Link, useNavigate } from "react-router-dom";
import { transfertTone } from "./TransfertDetail";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ArrowRight, Loader2, Search, X, Warehouse, Filter } from "lucide-react";
import { NewTransfertDialog } from "@/components/dialogs/NewTransfertDialog";
import { useApiData } from "@/hooks/useApiData";
import { depotsApi, transfersApi } from "@/lib/api";
import { formatDate } from "@/data/labels";
import { useAuth } from "@/contexts/AuthContext";

const MOCK_TRANSFERTS = [
  { id: "t1", numero: "TR-2026-0034", created_at: "2026-04-17", article_code: "CIM-32.5", article_designation: "Ciment Portland 32.5R",  quantite: 60,  unite: "sac",  depot_from_code: "MAG-DKR", depot_to_code: "CHAN-01", statut: "REÇU" },
  { id: "t2", numero: "TR-2026-0033", created_at: "2026-04-16", article_code: "RON-10",   article_designation: "Rond à béton Ø10",        quantite: 30,  unite: "barre",depot_from_code: "MAG-DKR", depot_to_code: "CHAN-02", statut: "EXPÉDIÉ" },
  { id: "t3", numero: "TR-2026-0032", created_at: "2026-04-15", article_code: "GRS-0-20", article_designation: "Gravier concassé 0/20",   quantite: 400, unite: "m³",   depot_from_code: "MAG-DKR", depot_to_code: "CHAN-03", statut: "PRÉPARÉ" },
];


const FILTRES = ["q", "statut", "depot", "sens", "du", "au"] as const;
const STATUTS = ["EXPÉDIÉ", "REÇU", "LITIGE", "CLÔTURÉ", "CREÉ", "VALIDÉ"];

export default function TransfertsPage() {
  const { hasRole } = useAuth();
  const canCreate = hasRole("ADMIN", "MAGASINIER", "RESP_LOGISTIQUE");
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  const [depots, setDepots] = useState<any[]>([]);
  const { values: f, debounced, set, clear, active } = useUrlFilters(FILTRES);

  useEffect(() => { depotsApi.list().then(setDepots).catch(() => {}); }, []);

  // Dépôt + sens : « depuis » = émetteur, « vers » = récepteur, sinon l'un ou l'autre.
  const depotParams = !debounced.depot ? {}
    : debounced.sens === "depuis" ? { depot_from: debounced.depot }
    : debounced.sens === "vers" ? { depot_to: debounced.depot }
    : { depot_id: debounced.depot };

  const { data, loading, usingFallback } = useApiData<any[]>(
    () => transfersApi.list({
      q: debounced.q || undefined,
      statut: debounced.statut || undefined,
      date_from: debounced.du || undefined,
      date_to: debounced.au || undefined,
      ...depotParams,
    }),
    MOCK_TRANSFERTS,
    [refreshKey, debounced],
  );

  return (
    <>
      <PageHeader
        breadcrumb="Opérations"
        title="Transferts inter-dépôts"
        description="Mouvements émetteur → récepteur avec accusé de réception obligatoire."
        actions={canCreate ? <NewTransfertDialog onSuccess={(t) => { setRefreshKey((k) => k + 1); navigate(`/transferts/${t.id}`); }} /> : undefined}
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
                  placeholder="Numéro (TR-…) ou article transféré" className="pl-9 h-9" />
                {f.q && (
                  <button onClick={() => set("q", "")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Select value={f.statut || "all"} onValueChange={(v) => set("statut", v === "all" ? "" : v)}>
                <SelectTrigger className="h-9 w-full lg:w-44">
                  <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {STATUTS.map((st) => <SelectItem key={st} value={st}>{st === "EXPÉDIÉ" ? "EXPÉDIÉ (en transit)" : st}</SelectItem>)}
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
              <Select value={f.sens || "all"} onValueChange={(v) => set("sens", v === "all" ? "" : v)} disabled={!f.depot}>
                <SelectTrigger className="h-9 w-full lg:w-40"><SelectValue placeholder="Sens" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Émis ou reçus</SelectItem>
                  <SelectItem value="depuis">Émis par ce dépôt</SelectItem>
                  <SelectItem value="vers">Reçus par ce dépôt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Du</span>
                <Input type="date" value={f.du} max={f.au || undefined} onChange={(e) => set("du", e.target.value)} className="h-9 w-40" />
                <span className="text-muted-foreground">au</span>
                <Input type="date" value={f.au} min={f.du || undefined} onChange={(e) => set("au", e.target.value)} className="h-9 w-40" />
              </div>
              <span className="text-xs text-muted-foreground">
                {loading ? "…" : `${data.length} transfert${data.length !== 1 ? "s" : ""}`}
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
              <th className="text-left font-medium px-4 py-3">Trajet</th>
              <th className="text-right font-medium px-4 py-3">Lignes</th>
              <th className="text-left font-medium px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr><td colSpan={5} className="py-10 text-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Chargement…</td></tr>
            )}
            {!loading && data.length === 0 && (
              <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">
                {active > 0 ? "Aucun transfert ne correspond aux filtres." : "Aucun transfert enregistré."}
              </td></tr>
            )}
            {!loading && data.map((t) => (
              <tr key={t.id} className="hover:bg-muted/30 transition-base">
                <td className="px-4 py-3 font-mono text-xs">
                  {usingFallback ? <span className="text-accent">{t.numero}</span> : (
                    <Link to={`/transferts/${t.id}`} className="text-accent hover:underline">{t.numero}</Link>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">{formatDate(t.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono">{t.depot_from_code}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-mono">{t.depot_to_code}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{t.nb_lignes ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={transfertTone(t.statut) as any}>{t.statut}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
