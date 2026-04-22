import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Save, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { usersApi, rolesApi, depotsApi, suppliersApi } from "@/lib/api";
import { typeDepotLabel } from "@/data/labels";
import { toast } from "sonner";

const seuils = [
  { libelle: "Validation technique requise",      montant: 500_000,    escalade: "Responsable Technique" },
  { libelle: "Validation budgétaire requise",     montant: 2_000_000,  escalade: "Chef de Projet" },
  { libelle: "Validation direction requise",      montant: 10_000_000, escalade: "DG / DAF" },
  { libelle: "Blocage dépassement budget projet", montant: 95,         escalade: "Escalade automatique" },
];

function useData<T>(fetcher: () => Promise<T[]>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetcher().then(setData).catch(() => setData([])).finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

export default function ParametresPage() {
  const { data: utilisateurs, loading: loadUsers } = useData(usersApi.list);
  const { data: roles,        loading: loadRoles } = useData(rolesApi.list);
  const { data: depots,       loading: loadDepots } = useData(depotsApi.list);
  const { data: fournisseurs, loading: loadFournisseurs } = useData(suppliersApi.list);

  return (
    <AppLayout>
      <PageHeader
        breadcrumb="Pilotage"
        title="Paramètres"
        description="Utilisateurs, rôles, dépôts, fournisseurs et seuils de validation."
      />
      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="roles">Rôles & permissions</TabsTrigger>
          <TabsTrigger value="depots">Dépôts</TabsTrigger>
          <TabsTrigger value="fournisseurs">Fournisseurs</TabsTrigger>
          <TabsTrigger value="seuils">Seuils de validation</TabsTrigger>
        </TabsList>

        {/* Utilisateurs */}
        <TabsContent value="users">
          <div className="rounded-xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="font-semibold">Comptes utilisateurs</h2>
                {!loadUsers && (
                  <p className="text-xs text-muted-foreground">
                    {utilisateurs.length} utilisateurs · {utilisateurs.filter((u: any) => u.actif).length} actifs
                  </p>
                )}
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => toast.info("Formulaire utilisateur à venir")}>
                <Plus className="w-4 h-4" /> Inviter
              </Button>
            </div>
            {loadUsers ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Nom</th>
                    <th className="text-left font-medium px-4 py-3">Email</th>
                    <th className="text-left font-medium px-4 py-3">Rôle(s)</th>
                    <th className="text-left font-medium px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {utilisateurs.map((u: any) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-base">
                      <td className="px-4 py-3 font-medium">{u.nom}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3 text-sm">{(u.role_libelles ?? []).join(", ") || "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={u.actif ? "success" : "muted"}>{u.actif ? "Actif" : "Désactivé"}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* Rôles */}
        <TabsContent value="roles">
          {loadRoles ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((r: any) => (
                <div key={r.id} className="rounded-xl bg-card border border-border p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{r.libelle}</h3>
                    <StatusBadge tone="accent">{r.code}</StatusBadge>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono text-xs">{r.code}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Dépôts */}
        <TabsContent value="depots">
          <div className="rounded-xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">Dépôts & emplacements</h2>
              <Button size="sm" className="gap-1.5" onClick={() => toast.info("Formulaire dépôt à venir")}>
                <Plus className="w-4 h-4" /> Nouveau dépôt
              </Button>
            </div>
            {loadDepots ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Code</th>
                    <th className="text-left font-medium px-4 py-3">Nom</th>
                    <th className="text-left font-medium px-4 py-3">Type</th>
                    <th className="text-left font-medium px-4 py-3">Localisation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {depots.map((d: any) => (
                    <tr key={d.id} className="hover:bg-muted/30 transition-base">
                      <td className="px-4 py-3 font-mono text-xs">{d.code}</td>
                      <td className="px-4 py-3 font-medium">{d.nom}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone="info">{typeDepotLabel[d.type_depot as keyof typeof typeDepotLabel] ?? d.type_depot}</StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{d.localisation ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* Fournisseurs */}
        <TabsContent value="fournisseurs">
          <div className="rounded-xl bg-card border border-border shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">Référentiel fournisseurs</h2>
              <Button size="sm" className="gap-1.5" onClick={() => toast.info("Formulaire fournisseur à venir")}>
                <Plus className="w-4 h-4" /> Nouveau fournisseur
              </Button>
            </div>
            {loadFournisseurs ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Code</th>
                    <th className="text-left font-medium px-4 py-3">Raison sociale</th>
                    <th className="text-left font-medium px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fournisseurs.map((f: any) => (
                    <tr key={f.id} className="hover:bg-muted/30 transition-base">
                      <td className="px-4 py-3 font-mono text-xs">{f.code}</td>
                      <td className="px-4 py-3 font-medium">{f.raison_sociale}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={f.actif ? "success" : "muted"}>{f.actif ? "Actif" : "Inactif"}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* Seuils */}
        <TabsContent value="seuils">
          <div className="rounded-xl bg-card border border-border shadow-sm p-5 space-y-5">
            <div>
              <h2 className="font-semibold">Seuils & escalade</h2>
              <p className="text-xs text-muted-foreground">Règles automatiques de routage du workflow de validation.</p>
            </div>
            {seuils.map((s, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end pb-4 border-b border-border last:border-0">
                <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Règle</Label><p className="font-medium text-sm">{s.libelle}</p></div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{i === 3 ? "Seuil (%)" : "Seuil (FCFA)"}</Label>
                  <Input type="number" defaultValue={s.montant} className="text-right tabular-nums" />
                </div>
                <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Escalade vers</Label><p className="text-sm">{s.escalade}</p></div>
                <div className="flex items-center gap-2"><Label className="text-xs">Actif</Label><Switch defaultChecked /></div>
              </div>
            ))}
            <Button className="gap-1.5" onClick={() => toast.success("Paramètres enregistrés (mock)")}><Save className="w-4 h-4" /> Enregistrer</Button>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
