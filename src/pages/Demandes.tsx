import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Download, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { demandes as mockDemandes, getChantier, getProjet } from "@/data/mock";
import { formatDate, formatEur, statutDemandeLabel, statutDemandeTone, urgenceTone } from "@/data/labels";
import { useMemo, useState } from "react";
import { NewDemandeDialog } from "@/components/dialogs/NewDemandeDialog";
import { useApiData } from "@/hooks/useApiData";
import { requestsApi } from "@/lib/api";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useAuth } from "@/contexts/AuthContext";

type ApiDemande = {
  id: string;
  numero: string;
  motif?: string;
  requester_nom?: string;
  project_nom?: string;
  site_nom?: string;
  created_at: string;
  urgence: string;
  montant_estime: number | string;
  statut: string;
};

// Statuts visibles selon la position dans le circuit de validation
const VISIBLE_FROM: Record<string, string[]> = {
  REQUEST_VALIDATE_BUDGET:    ["BROUILLON", "SOUMISE"],
  REQUEST_VALIDATE_DIRECTION: ["BROUILLON", "SOUMISE", "EN_COMPLEMENT", "VALIDATION_BUDGETAIRE"],
};

const ACHETEUR_STATUTS = ["APPROUVEE", "EN_ACHAT", "EN_PREPARATION", "MISE_A_DISPO"];

export default function DemandesPage() {
  const { hasPermission, hasRole } = useAuth();
  const canCreate  = hasPermission("REQUEST_CREATE");
  const isAdmin    = hasRole("ADMIN");
  const isAcheteur = hasRole("ACHETEUR") && !isAdmin;
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, loading, usingFallback } = useApiData<ApiDemande[]>(
    () => requestsApi.list(),
    // Fallback: convertir le mock au format API
    mockDemandes.map((d) => ({
      id: d.id,
      numero: d.numero,
      motif: d.motif,
      requester_nom: d.demandeur,
      project_nom: getProjet(d.projetId)?.nom,
      site_nom: getChantier(d.chantierId)?.nom,
      created_at: d.dateDemande,
      urgence: d.urgence,
      montant_estime: d.montantEstime,
      statut: d.statut,
    })),
    [refreshKey],
  );

  // Filtre selon la position dans le circuit : chaque valideur ne voit que
  // les demandes ayant déjà franchi les étapes qui le précèdent.
  const roleVisible = useMemo(() => {
    if (isAdmin) return data;
    if (isAcheteur) return data.filter((d) => ACHETEUR_STATUTS.includes(d.statut));
    for (const [perm, hidden] of Object.entries(VISIBLE_FROM)) {
      if (hasPermission(perm)) return data.filter((d) => !hidden.includes(d.statut));
    }
    return data;
  }, [data, isAdmin, isAcheteur, hasPermission]);

  // Onglet "À valider" adapté au rôle
  const attenteStatuts: string[] = (() => {
    if (isAcheteur)                                              return ["APPROUVEE"];
    if (!isAdmin && hasPermission("REQUEST_VALIDATE_BUDGET"))    return ["VALIDATION_BUDGETAIRE"];
    if (!isAdmin && hasPermission("REQUEST_VALIDATE_DIRECTION")) return ["VALIDATION_DIRECTION"];
    if (!isAdmin && hasPermission("REQUEST_VALIDATE_TECH"))      return ["SOUMISE"];
    return ["SOUMISE", "VALIDATION_TECHNIQUE", "VALIDATION_BUDGETAIRE", "VALIDATION_DIRECTION"];
  })();

  const filtered = useMemo(() => {
    return roleVisible.filter((d) => {
      if (filter === "attente"  && !attenteStatuts.includes(d.statut)) return false;
      if (filter === "approuvee" && !["APPROUVEE", "EN_ACHAT", "EN_PREPARATION", "MISE_A_DISPO"].includes(d.statut)) return false;
      if (filter === "cloturee"  && !["CLOTUREE", "REJETEE"].includes(d.statut)) return false;
      if (search && !`${d.numero} ${d.motif ?? ""} ${d.requester_nom ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [roleVisible, filter, search, attenteStatuts]);

  return (
    <>
      <PageHeader
        breadcrumb="Opérations"
        title="Demandes de besoin"
        description="Expression de besoin terrain, validation technique et budgétaire, mise à disposition."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5"><Download className="w-4 h-4" /> Exporter</Button>
            {canCreate && <NewDemandeDialog onSuccess={() => setRefreshKey((k) => k + 1)} />}
          </>
        }
      />

      <OfflineBanner show={usingFallback} />

      <div className="rounded-xl bg-card border border-border shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4 border-b border-border">
          <Tabs value={filter} onValueChange={setFilter} className="w-full lg:w-auto">
            <TabsList>
              <TabsTrigger value="all">Toutes <span className="ml-1.5 text-xs text-muted-foreground">{roleVisible.length}</span></TabsTrigger>
              <TabsTrigger value="attente">{isAcheteur ? "À commander" : "À valider"} <span className="ml-1.5 text-xs text-muted-foreground">{roleVisible.filter(d => attenteStatuts.includes(d.statut)).length || ""}</span></TabsTrigger>
              <TabsTrigger value="approuvee">En cours</TabsTrigger>
              <TabsTrigger value="cloturee">Clôturées</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex-1 flex items-center gap-2 lg:justify-end">
            <div className="relative flex-1 lg:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Numéro, motif, demandeur…" className="pl-9 h-9" />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5"><Filter className="w-4 h-4" /> Filtres</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Numéro</th>
                <th className="text-left font-medium px-4 py-3">Motif & chantier</th>
                <th className="text-left font-medium px-4 py-3">Demandeur</th>
                <th className="text-left font-medium px-4 py-3">Date</th>
                <th className="text-left font-medium px-4 py-3">Urgence</th>
                <th className="text-right font-medium px-4 py-3">Montant</th>
                <th className="text-left font-medium px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr><td colSpan={7} className="py-10 text-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Chargement…</td></tr>
              )}
              {!loading && filtered.map((d) => (
                <tr key={d.id} className="hover:bg-muted/30 transition-base cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link to={`/demandes/${d.id}`} className="text-accent hover:underline">{d.numero}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{d.motif || "—"}</p>
                    <p className="text-xs text-muted-foreground">{d.project_nom} · {d.site_nom}</p>
                  </td>
                  <td className="px-4 py-3 text-foreground">{d.requester_nom}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{formatDate(d.created_at)}</td>
                  <td className="px-4 py-3"><StatusBadge tone={urgenceTone[d.urgence as keyof typeof urgenceTone] ?? "muted"}>{d.urgence}</StatusBadge></td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatEur(Number(d.montant_estime) || 0)}</td>
                  <td className="px-4 py-3"><StatusBadge tone={statutDemandeTone[d.statut as keyof typeof statutDemandeTone] ?? "muted"}>{statutDemandeLabel[d.statut as keyof typeof statutDemandeLabel] ?? d.statut}</StatusBadge></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">Aucune demande ne correspond aux filtres.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
