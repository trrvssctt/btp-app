import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Zap, TrendingUp, AlertTriangle, DollarSign, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { domEnergyApi, domAlertApi } from "@/lib/api";

function fmt(n: number) { return Math.round(n).toLocaleString("fr-FR"); }

function priorityTone(p: string): "destructive" | "warning" | "info" {
  if (p === "critical") return "destructive"; if (p === "normal") return "warning"; return "info";
}
function priorityLabel(p: string) {
  if (p === "critical") return "Critique"; if (p === "normal") return "Normal"; return "Faible";
}

const COLORS = ["#f59e0b", "#f97316", "#ef4444", "#8b5cf6", "#06b6d4", "#10b981"];

const MOCK_MONTHLY = [
  { month: "Déc", kWh: 312 }, { month: "Jan", kWh: 298 },
  { month: "Fév", kWh: 275 }, { month: "Mar", kWh: 261 },
  { month: "Avr", kWh: 289 }, { month: "Mai", kWh: 134 },
];

export default function DomotiqueEnergie() {
  const [energy, setEnergy]   = useState<any>(null);
  const [alerts, setAlerts]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([domEnergyApi.summary(), domAlertApi.list({ resolved: false })])
      .then(([e, a]) => { setEnergy(e); setAlerts(a); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <>
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
      </div>
    </>
  );

  const topConsumers: any[] = energy?.top_consumers || [];
  const byBuilding: any[]   = energy?.buildings || [];
  const totalDailyKwh = byBuilding.reduce((s: number, b: any) => s + Number(b.estimated_daily_kwh || 0), 0);
  const projectedMonthly = Math.round(totalDailyKwh * 31);
  const energyAlerts = alerts.filter(a => a.severity !== "info");

  return (
    <>
      <PageHeader breadcrumb="Domotique" title="Énergie intelligente" description="Consommation, coûts, projections et optimisation." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Consommation estimée/jour" value={`${totalDailyKwh.toFixed(1)} kWh`} hint={`${fmt(totalDailyKwh * 120)} FCFA/jour`} icon={Zap} tone="accent" />
        <KpiCard label="Projection mensuelle" value={`${fmt(projectedMonthly)} kWh`} hint={`≈ ${fmt(projectedMonthly * 120)} FCFA`} icon={TrendingUp} tone={projectedMonthly > 280 ? "destructive" : "warning"} />
        <KpiCard label="Équipements monitorés" value={topConsumers.length} hint="Avec profil énergétique" icon={Zap} tone="default" />
        <KpiCard label="Alertes énergétiques" value={energyAlerts.length} hint="Seuils dépassés ou proches" icon={AlertTriangle} tone={energyAlerts.length > 0 ? "warning" : "success"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Historique simulé (tendance) */}
        <div className="lg:col-span-2 rounded-xl bg-card border border-border shadow-sm p-5">
          <h2 className="font-semibold text-sm mb-4">Tendance consommation (kWh estimés)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MOCK_MONTHLY} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} unit=" kWh" />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v} kWh — ${fmt(v * 120)} FCFA`, "Consommation"]}
              />
              <Bar dataKey="kWh" radius={[4, 4, 0, 0]}>
                {MOCK_MONTHLY.map((_, i) => (
                  <Cell key={i} fill={i === MOCK_MONTHLY.length - 1 ? "hsl(var(--warning))" : "hsl(var(--primary))"} fillOpacity={i === MOCK_MONTHLY.length - 1 ? 0.7 : 0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-2">* Le mois en cours est partiel</p>
        </div>

        {/* Par immeuble */}
        <div className="rounded-xl bg-card border border-border shadow-sm p-5">
          <h2 className="font-semibold text-sm mb-4">Estimation par immeuble (jour)</h2>
          <div className="space-y-4">
            {byBuilding.map((b: any, i: number) => {
              const kwh = Number(b.estimated_daily_kwh || 0);
              const budget = 15;
              const pct = Math.min(Math.round((kwh / budget) * 100), 100);
              return (
                <div key={b.id}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium truncate max-w-[140px]" title={b.name}>{b.name?.split("—")[0]?.trim()}</span>
                    <span className="text-muted-foreground tabular-nums text-xs">{kwh.toFixed(1)} kWh</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">{pct}% du budget estimé</span>
                    <span className="text-[10px] text-muted-foreground">{fmt(kwh * 120)} FCFA</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Top consommateurs */}
      <div className="rounded-xl bg-card border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-warning" /> Top consommateurs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Équipement</th>
                <th className="text-left font-medium px-4 py-3">Localisation</th>
                <th className="text-right font-medium px-4 py-3">Puissance nominale</th>
                <th className="text-right font-medium px-4 py-3">Seuil journalier</th>
                <th className="text-right font-medium px-4 py-3">Coût estimé/jour</th>
                <th className="text-center font-medium px-4 py-3">Priorité</th>
                <th className="text-center font-medium px-4 py-3">Coupure auto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topConsumers.map((d: any) => (
                <tr key={d.id} className="hover:bg-muted/30 transition-base">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{d.location || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono">{d.nominal_power_watt} <span className="text-muted-foreground text-xs">W</span></td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono">
                    {d.daily_threshold_kwh ? `${d.daily_threshold_kwh} kWh` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {d.daily_threshold_kwh ? `${fmt(d.daily_threshold_kwh * (d.kwh_price || 120))} FCFA` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge tone={priorityTone(d.priority)}>{priorityLabel(d.priority)}</StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {d.can_be_auto_cut
                      ? <span className="text-success text-xs font-medium">✓ Autorisée</span>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
