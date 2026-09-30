import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, Bell, Mail, Monitor } from "lucide-react";
import { notificationSettingsApi, apiError } from "@/lib/api";
import { toast } from "sonner";

interface NotifSetting {
  id: string; code: string; libelle: string; description?: string | null;
  canal_systeme: boolean; canal_email: boolean; actif: boolean; ordre: number;
}

export default function ParametresNotificationsPage() {
  const [settings, setSettings] = useState<NotifSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setSettings(await notificationSettingsApi.list()); }
    catch (err) { toast.error("Erreur de chargement", { description: apiError(err) }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const patch = async (s: NotifSetting, field: "canal_systeme" | "canal_email" | "actif", value: boolean) => {
    const prev = settings;
    setSettings((cur) => cur.map((x) => x.id === s.id ? { ...x, [field]: value } : x));
    try {
      await notificationSettingsApi.update(s.id, { [field]: value });
    } catch (err) {
      setSettings(prev);
      toast.error("Modification impossible", { description: apiError(err) });
    }
  };

  return (
    <>
      <PageHeader
        breadcrumb="Paramètres"
        title="Notifications"
        description="Configuration des alertes et notifications (système, email)"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/parametres"><ArrowLeft className="w-4 h-4 mr-2" />Retour</Link>
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground font-medium">
            <span>Événement</span>
            <span className="flex items-center gap-1 w-24 justify-center"><Monitor className="w-3.5 h-3.5" />Système</span>
            <span className="flex items-center gap-1 w-24 justify-center"><Mail className="w-3.5 h-3.5" />Email</span>
            <span className="flex items-center gap-1 w-20 justify-center"><Bell className="w-3.5 h-3.5" />Actif</span>
          </div>
          <Separator />
          <div className="divide-y divide-border">
            {settings.map((s) => (
              <div key={s.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-4 items-center hover:bg-muted/20 transition-colors">
                <div>
                  <p className="font-medium text-sm">{s.libelle}</p>
                  {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                </div>
                <div className="w-24 flex justify-center">
                  <Switch checked={s.canal_systeme} disabled={!s.actif} onCheckedChange={(v) => patch(s, "canal_systeme", v)} />
                </div>
                <div className="w-24 flex justify-center">
                  <Switch checked={s.canal_email} disabled={!s.actif} onCheckedChange={(v) => patch(s, "canal_email", v)} />
                </div>
                <div className="w-20 flex justify-center">
                  <Switch checked={s.actif} onCheckedChange={(v) => patch(s, "actif", v)} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <p className="text-xs text-muted-foreground mt-4">
        Les notifications <strong>Système</strong> apparaissent dans la cloche en haut de l'application.
        Les notifications <strong>Email</strong> sont envoyées aux destinataires concernés (nécessite un serveur SMTP configuré).
        Désactiver un événement coupe tous ses canaux.
      </p>
    </>
  );
}
