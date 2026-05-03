import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, ArrowLeft, Package, Warehouse, MapPin, RefreshCw, Eye } from "lucide-react";
import { stockApi, stockMovementsApi, articlesApi, apiError } from "@/lib/api";
import { formatNum, mouvementLabel, typeDepotLabel, formatDateTime } from "@/data/labels";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function StockDetail() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const canEdit = hasRole("ADMIN", "MAGASINIER");

  const [stock, setStock] = useState<any | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ seuil_alerte: "", article_code: "", article_actif: true });

  const reload = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const stockData = await stockApi.get(id);
      setStock(stockData);
      setForm({
        seuil_alerte: String(stockData.seuil_alerte ?? 0),
        article_code: stockData.article_code ?? "",
        article_actif: stockData.article_actif ?? true,
      });
      const movimientos = await stockMovementsApi.list({ article_id: stockData.article_id, depot_id: stockData.depot_id });
      setMovements(movimientos);
      setError(null);
    } catch (err: any) {
      setError(typeof err === "string" ? err : apiError(err));
      setStock(null);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [id]);

  const handleSave = async () => {
    if (!stock) return;
    setSaving(true);
    try {
      const updateTasks: Promise<any>[] = [
        stockApi.update(stock.id, {
          seuil_alerte: Number(form.seuil_alerte),
        }),
      ];

      if (form.article_code !== stock.article_code || form.article_actif !== stock.article_actif) {
        updateTasks.push(
          articlesApi.update(stock.article_id, {
            code: form.article_code,
            actif: form.article_actif,
          }),
        );
      }

      await Promise.all(updateTasks);
      toast.success("Mise à jour enregistrée.");
      await reload();
    } catch (err: any) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const dispo = Number(stock?.qte_disponible ?? 0);
  const seuil = Number(stock?.seuil_alerte ?? 0);
  const isAlert = dispo <= seuil;
  const isWarn = !isAlert && dispo <= seuil * 1.5;
  const stateTone = isAlert ? "destructive" : isWarn ? "warning" : "success";

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-32 text-muted-foreground gap-3">
          <Loader2 className="w-5 h-5 animate-spin" /> Chargement des détails…
        </div>
      </AppLayout>
    );
  }

  if (error || !stock) {
    return (
      <AppLayout>
        <div className="rounded-2xl bg-card border border-border p-8 text-center text-destructive">
          <p className="mb-4">{error ?? "Détail du stock introuvable."}</p>
          <Button asChild>
            <Link to="/stock">Retour au stock</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/stock"><ArrowLeft className="w-4 h-4" /> Retour au stock</Link>
        </Button>
      </div>

      <PageHeader
        breadcrumb="Stock"
        title={`Détail ${stock.article_designation}`}
        description={`${stock.depot_nom} (${typeDepotLabel[stock.type_depot] ?? stock.type_depot})`}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={stateTone}>{isAlert ? "Sous seuil" : isWarn ? "Niveau bas" : "Stock OK"}</StatusBadge>
            {stock.article_actif === false && <StatusBadge tone="muted">Produit désactivé</StatusBadge>}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl bg-card border border-border shadow-sm p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Article</p>
                <h2 className="text-2xl font-bold mt-1">{stock.article_designation}</h2>
                <p className="text-sm text-muted-foreground mt-1">{stock.article_code}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">Dépôt</p>
                <p>{stock.depot_nom}</p>
                <p>{stock.depot_code}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-muted/70 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Disponible</p>
                <p className="text-3xl font-bold mt-2 tabular-nums">{formatNum(dispo)}</p>
              </div>
              <div className="rounded-2xl bg-muted/70 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Réservé</p>
                <p className="text-3xl font-bold mt-2 tabular-nums">{formatNum(Number(stock.qte_reservee ?? 0))}</p>
              </div>
              <div className="rounded-2xl bg-muted/70 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Seuil d’alerte</p>
                <p className="text-3xl font-bold mt-2 tabular-nums">{formatNum(seuil)}</p>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="rounded-2xl bg-card border border-border shadow-sm p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <p className="text-sm font-semibold">Modifier le seuil d’alerte</p>
                  <p className="text-xs text-muted-foreground">La quantité disponible et la quantité réservée ne sont pas modifiables ici.</p>
                </div>
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Seuil d’alerte</label>
                  <Input
                    type="number"
                    value={form.seuil_alerte}
                    onChange={(event) => setForm((prev) => ({ ...prev, seuil_alerte: event.target.value }))}
                    className="mt-2"
                  />
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Référence article</label>
                    <Input
                      type="text"
                      value={form.article_code}
                      onChange={(event) => setForm((prev) => ({ ...prev, article_code: event.target.value }))}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border p-3 bg-muted/70">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Produit actif</p>
                      <p className="text-sm text-foreground">Désactivez le produit si nécessaire.</p>
                    </div>
                    <Switch
                      checked={form.article_actif}
                      onCheckedChange={(checked) => setForm((prev) => ({ ...prev, article_actif: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <Button variant="secondary" size="sm" onClick={reload} disabled={saving}>
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="border-b border-border px-6 py-4 bg-muted/50">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Eye className="w-4 h-4" />
                <span>Mouvements associés</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left uppercase tracking-wider text-xs">Date</th>
                    <th className="px-4 py-3 text-left uppercase tracking-wider text-xs">Type</th>
                    <th className="px-4 py-3 text-right uppercase tracking-wider text-xs">Quantité</th>
                    <th className="px-4 py-3 text-left uppercase tracking-wider text-xs">Chantier</th>
                    <th className="px-4 py-3 text-left uppercase tracking-wider text-xs">Référence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Aucun mouvement trouvé pour cet article / dépôt.</td>
                    </tr>
                  ) : movements.map((movement) => (
                    <tr key={movement.id}>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{movement.created_at ? formatDateTime(movement.created_at) : "—"}</td>
                      <td className="px-4 py-3">{mouvementLabel[movement.type_mouvement] ?? movement.type_mouvement}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatNum(Number(movement.quantite))}</td>
                      <td className="px-4 py-3">{movement.site_code || movement.site_nom ? `${movement.site_code ?? ""} ${movement.site_nom ?? ""}`.trim() : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{movement.reference_doc || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl bg-card border border-border shadow-sm p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              <Package className="w-4 h-4" /> Détails rapides
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>
                <div className="text-xs uppercase tracking-wider">Code article</div>
                <div className="text-foreground font-medium mt-1">{stock.article_code}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider">Dépôt</div>
                <div className="text-foreground font-medium mt-1">{stock.depot_nom} ({stock.depot_code})</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider">Type de dépôt</div>
                <div className="text-foreground font-medium mt-1">{typeDepotLabel[stock.type_depot] ?? stock.type_depot}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider">Unité</div>
                <div className="text-foreground font-medium mt-1">{stock.article_unite ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider">Dernière mise à jour</div>
                <div className="text-foreground font-medium mt-1">{stock.updated_at ? formatDateTime(stock.updated_at) : "—"}</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}
