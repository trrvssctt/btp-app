import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Wrench, Loader2 } from "lucide-react";
import { equipementsApi } from "@/lib/api";
import { NewEquipementDialog } from "@/components/dialogs/NewEquipementDialog";
import { useEffect, useState } from "react";

const tone = (e: string) =>
  e === "DISPONIBLE" ? "success" : e === "AFFECTE" ? "info" : e === "EN_MAINTENANCE" ? "warning" : "destructive";

export default function EquipementsPage() {
  const [equipements, setEquipements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    equipementsApi.list()
      .then(setEquipements)
      .catch(() => setEquipements([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <AppLayout>
      <PageHeader
        breadcrumb="Référentiels"
        title="Parc équipements"
        description="Suivi du matériel durable : affectation, maintenance, état."
        actions={<NewEquipementDialog onSuccess={() => setRefreshKey((k) => k + 1)} />}
      />
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {equipements.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-16">Aucun équipement enregistré.</p>
          )}
          {equipements.map((e) => (
            <div key={e.id} className="rounded-xl bg-card border border-border p-5 shadow-sm hover:shadow-elegant transition-base">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <StatusBadge tone={tone(e.etat) as any}>{e.etat.replace(/_/g, " ")}</StatusBadge>
              </div>
              <p className="font-mono text-xs text-muted-foreground mb-1">{e.code_inventaire}</p>
              <p className="font-semibold text-foreground mb-3">{e.designation}</p>
              {e.affecte_a && (
                <div className="text-xs text-muted-foreground space-y-0.5 pt-3 border-t border-border">
                  <p>Affecté à : <span className="text-foreground font-medium">{e.affecte_a}</span></p>
                  {e.chantier_nom && <p>Chantier : <span className="text-foreground">{e.chantier_nom}</span></p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
