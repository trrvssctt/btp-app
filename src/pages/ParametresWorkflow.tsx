import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Save, ShieldCheck } from "lucide-react";
import { validationRulesApi, apiError } from "@/lib/api";
import { toast } from "sonner";

interface Rule {
  id: string; code: string; libelle: string;
  seuil_montant: number | string; unite: string;
  escalade?: string | null; actif: boolean; ordre: number;
}

export default function ParametresWorkflowPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await validationRulesApi.list();
      setRules(data.map((r: any) => ({ ...r, seuil_montant: Number(r.seuil_montant) })));
    } catch (err) {
      toast.error("Erreur de chargement", { description: apiError(err) });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const patch = (id: string, field: keyof Rule, value: any) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  };

  const save = async (rule: Rule) => {
    setSavingId(rule.id);
    try {
      await validationRulesApi.update(rule.id, {
        libelle: rule.libelle,
        seuil_montant: Number(rule.seuil_montant),
        unite: rule.unite,
        escalade: rule.escalade ?? null,
        actif: rule.actif,
      });
      toast.success("Seuil enregistré", { description: rule.libelle });
    } catch (err) {
      toast.error("Enregistrement impossible", { description: apiError(err) });
    } finally { setSavingId(null); }
  };

  const toggle = async (rule: Rule, actif: boolean) => {
    patch(rule.id, "actif", actif);
    try {
      await validationRulesApi.update(rule.id, { actif });
      toast.success(actif ? "Règle activée" : "Règle désactivée");
    } catch (err) {
      patch(rule.id, "actif", !actif);
      toast.error("Modification impossible", { description: apiError(err) });
    }
  };

  return (
    <>
      <PageHeader
        breadcrumb="Paramètres"
        title="Circuit de validation"
        description="Paramétrage des seuils du workflow d'approbation des demandes"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/parametres"><ArrowLeft className="w-4 h-4 mr-2" />Retour</Link>
          </Button>
        }
      />

      <Card className="p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 mb-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">Seuils d'escalade</h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              Ces seuils déterminent le niveau de validation requis selon le montant d'une demande.
              Une demande dépassant un seuil actif est routée vers le valideur correspondant.
            </p>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <Card key={rule.id} className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1.5fr_auto_auto] gap-4 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Règle</Label>
                  <Input value={rule.libelle} onChange={(e) => patch(rule.id, "libelle", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Seuil ({rule.unite})</Label>
                  <Input
                    type="number" min="0"
                    value={rule.seuil_montant}
                    onChange={(e) => patch(rule.id, "seuil_montant", e.target.value)}
                    className="text-right tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Escalade vers</Label>
                  <Input
                    value={rule.escalade ?? ""}
                    onChange={(e) => patch(rule.id, "escalade", e.target.value)}
                    placeholder="Ex: Chef de Projet"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Actif</Label>
                  <div className="h-9 flex items-center">
                    <Switch checked={rule.actif} onCheckedChange={(v) => toggle(rule, v)} />
                  </div>
                </div>
                <Button size="sm" onClick={() => save(rule)} disabled={savingId === rule.id}>
                  {savingId === rule.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
