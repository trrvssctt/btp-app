import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TrendingUp, AlertTriangle, CheckCircle2, Loader2,
  Download, FileSpreadsheet, Printer, ChevronRight,
} from "lucide-react";
import { reportingApi } from "@/lib/api";
import { formatEur } from "@/data/labels";
import { useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--primary))",
  "hsl(var(--muted-foreground))",
];

function fmt(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Mrd`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)} k`;
  return `${n}`;
}

function downloadCSV(filename: string, rows: string[][]) {
  const bom = "﻿";
  const content = bom + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportBudgetCSV(projects: any[]) {
  const rows: string[][] = [
    ["Code projet", "Nom", "Client", "Budget initial (FCFA)", "Consommé (FCFA)", "Taux (%)"],
  ];
  for (const p of projects) {
    const pct = p.budget_initial > 0
      ? Math.round((Number(p.budget_consomme) / Number(p.budget_initial)) * 100)
      : 0;
    rows.push([p.code, p.nom, p.client, p.budget_initial, p.budget_consomme, String(pct)]);
  }
  downloadCSV("budget_projets.csv", rows);
}

function exportLotsCSV(budgetLots: any[]) {
  const rows: string[][] = [
    ["Projet", "Code lot", "Libellé lot", "Prévisionnel (FCFA)", "Demandes engagées (FCFA)", "Commandes réelles (FCFA)", "Écart (FCFA)", "Taux (%)"],
  ];
  for (const l of budgetLots) {
    const prevu     = Number(l.montant_prevu);
    const demandes  = Number(l.montant_demandes);
    const commandes = Number(l.montant_commandes);
    const consomme  = commandes > 0 ? commandes : demandes;
    const ecart     = prevu - consomme;
    const pct       = prevu > 0 ? Math.round((consomme / prevu) * 100) : 0;
    rows.push([l.project_nom, l.code, l.libelle, String(prevu), String(demandes), String(commandes), String(ecart), String(pct)]);
  }
  downloadCSV("budget_lots.csv", rows);
}

function exportFournisseursCSV(topSuppliers: any[]) {
  const rows: string[][] = [["Fournisseur", "Montant commandes (FCFA)"]];
  for (const s of topSuppliers) {
    rows.push([s.nom, s.montant]);
  }
  downloadCSV("top_fournisseurs.csv", rows);
}

function BudgetLotsSection({ budgetLots, onExport }: { budgetLots: any[]; onExport: () => void }) {
  const byProject: Record<string, { nom: string; code: string; lots: any[] }> = {};
  for (const lot of budgetLots) {
    if (!byProject[lot.project_code]) {
      byProject[lot.project_code] = { nom: lot.project_nom, code: lot.project_code, lots: [] };
    }
    byProject[lot.project_code].lots.push(lot);
  }

  const entries = Object.entries(byProject);

  return (
    <div className="rounded-xl bg-card border border-border shadow-sm p-5 mb-4">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold">Suivi budget prévisionnel vs réel par lot</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{entries.length} projet{entries.length > 1 ? "s" : ""} · {budgetLots.length} lots au total</p>
        </div>
        <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Exporter lots
        </Button>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {entries.map(([code, { nom, lots }]) => {
          const totalPrevu     = lots.reduce((s, l) => s + Number(l.montant_prevu),    0);
          const totalDemandes  = lots.reduce((s, l) => s + Number(l.montant_demandes), 0);
          const totalCommandes = lots.reduce((s, l) => s + Number(l.montant_commandes),0);
          const totalConsomme  = totalCommandes > 0 ? totalCommandes : totalDemandes;
          const pctGlobal      = totalPrevu > 0 ? Math.min((totalConsomme / totalPrevu) * 100, 100) : 0;
          const overrunGlobal  = totalConsomme > totalPrevu;
          const lotsEnSurcharge = lots.filter(l => {
            const c = Number(l.montant_commandes) > 0 ? Number(l.montant_commandes) : Number(l.montant_demandes);
            return c > Number(l.montant_prevu);
          }).length;

          return (
            <AccordionItem
              key={code}
              value={code}
              className="border border-border rounded-lg px-4 overflow-hidden data-[state=open]:border-accent/40"
            >
              <AccordionTrigger className="hover:no-underline py-3.5 [&>svg]:hidden">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded shrink-0">{code}</span>
                  <span className="font-medium text-sm truncate">{nom}</span>
                  {lotsEnSurcharge > 0 && (
                    <Badge variant="destructive" className="shrink-0 text-xs px-1.5 py-0">
                      {lotsEnSurcharge} dépassement{lotsEnSurcharge > 1 ? "s" : ""}
                    </Badge>
                  )}
                  <div className="ml-auto flex items-center gap-4 shrink-0 mr-3">
                    <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                      <span>Prévu&nbsp;: <strong className="text-foreground">{fmt(totalPrevu)}</strong></span>
                      <span>Engagé&nbsp;: <strong className="text-accent">{fmt(totalDemandes)}</strong></span>
                      <span>Commandé&nbsp;: <strong className="text-foreground">{fmt(totalCommandes)}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 w-24">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${overrunGlobal ? "bg-destructive" : "bg-accent"}`}
                          style={{ width: `${pctGlobal}%` }}
                        />
                      </div>
                      <span className={`text-xs tabular-nums font-medium ${overrunGlobal ? "text-destructive" : "text-muted-foreground"}`}>
                        {Math.round(pctGlobal)}%
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-90" />
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="pt-0">
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b border-border">
                        <th className="text-left pb-2.5 font-medium">Lot</th>
                        <th className="text-right pb-2.5 font-medium">Prévisionnel</th>
                        <th className="text-right pb-2.5 font-medium">Engagé</th>
                        <th className="text-right pb-2.5 font-medium">Commandé</th>
                        <th className="text-right pb-2.5 font-medium">Écart</th>
                        <th className="w-36 pb-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lots.map((lot) => {
                        const prevu     = Number(lot.montant_prevu);
                        const demandes  = Number(lot.montant_demandes);
                        const commandes = Number(lot.montant_commandes);
                        const consomme  = commandes > 0 ? commandes : demandes;
                        const ecart     = prevu - consomme;
                        const pct       = prevu > 0 ? Math.min((consomme / prevu) * 100, 100) : 0;
                        const overrun   = consomme > prevu;
                        return (
                          <tr key={lot.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 pr-4">
                              <span className="font-mono text-xs text-muted-foreground mr-2">{lot.code}</span>
                              <span className="text-sm">{lot.libelle}</span>
                            </td>
                            <td className="py-2.5 text-right tabular-nums text-sm">{fmt(prevu)}</td>
                            <td className="py-2.5 text-right tabular-nums text-sm text-accent">{fmt(demandes)}</td>
                            <td className="py-2.5 text-right tabular-nums text-sm">{fmt(commandes)}</td>
                            <td className={`py-2.5 text-right tabular-nums text-sm font-semibold ${overrun ? "text-destructive" : "text-success"}`}>
                              {overrun ? "−" : "+"}{fmt(Math.abs(ecart))}
                            </td>
                            <td className="py-2.5 pl-3">
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${overrun ? "bg-destructive" : "bg-accent"}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className={`text-xs tabular-nums w-8 text-right ${overrun ? "text-destructive" : "text-muted-foreground"}`}>
                                  {Math.round(pct)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/20">
                        <td className="py-2.5 font-semibold text-sm">Total</td>
                        <td className="py-2.5 text-right tabular-nums font-semibold text-sm">{fmt(totalPrevu)}</td>
                        <td className="py-2.5 text-right tabular-nums text-sm text-accent font-semibold">{fmt(totalDemandes)}</td>
                        <td className="py-2.5 text-right tabular-nums font-semibold text-sm">{fmt(totalCommandes)}</td>
                        <td className={`py-2.5 text-right tabular-nums font-bold text-sm ${overrunGlobal ? "text-destructive" : "text-success"}`}>
                          {overrunGlobal ? "−" : "+"}{fmt(Math.abs(totalPrevu - totalConsomme))}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

export default function ReportingPage() {
  const [data, setData] = useState<{
    projects: any[];
    requestStatuts: any[];
    topSuppliers: any[];
    mouvementsParMois: any[];
    topArticles: any[];
    budgetLots: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportingApi.get()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <PageHeader breadcrumb="Pilotage" title="Reporting & indicateurs" description="Tableau de bord agrégé par projet et par fournisseur." />
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement des indicateurs…
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <PageHeader breadcrumb="Pilotage" title="Reporting & indicateurs" description="Tableau de bord agrégé par projet et par fournisseur." />
        <p className="text-center py-16 text-muted-foreground">Impossible de charger les données de reporting.</p>
      </AppLayout>
    );
  }

  const { projects, requestStatuts, topSuppliers, mouvementsParMois, topArticles, budgetLots } = data;

  // KPIs
  const totalBudget   = projects.reduce((s: number, p: any) => s + Number(p.budget_initial  ?? 0), 0);
  const totalConsomme = projects.reduce((s: number, p: any) => s + Number(p.budget_consomme ?? 0), 0);
  const totalDemandes = requestStatuts.reduce((s: number, r: any) => s + Number(r.count), 0);
  const traitees      = requestStatuts.filter((r: any) => !['BROUILLON', 'REJETEE'].includes(r.statut)).reduce((s: number, r: any) => s + Number(r.count), 0);
  const tauxValidation = totalDemandes ? Math.round((traitees / totalDemandes) * 100) : 0;
  const totalAchats   = topSuppliers.reduce((s: number, r: any) => s + Number(r.montant ?? 0), 0);

  // Données graphiques
  const budgetData = projects.map((p: any) => ({
    nom:      p.nom.length > 18 ? p.nom.slice(0, 16) + "…" : p.nom,
    budget:   Math.round(Number(p.budget_initial)  / 1_000_000),
    consomme: Math.round(Number(p.budget_consomme) / 1_000_000),
  }));

  const statutsData     = requestStatuts.map((r: any) => ({ name: r.statut, value: Number(r.count) }));
  const fournisseursData = topSuppliers.map((s: any) => ({
    nom:     s.nom.length > 20 ? s.nom.slice(0, 18) + "…" : s.nom,
    montant: Math.round(Number(s.montant) / 1_000_000),
  }));
  const articleUsage = topArticles.map((a: any) => ({ nom: a.code, valeur: Number(a.valeur) }));

  return (
    <AppLayout>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <PageHeader
          breadcrumb="Pilotage"
          title="Reporting & indicateurs"
          description="Tableau de bord agrégé par projet et par fournisseur."
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 shrink-0">
              <Download className="w-4 h-4" />
              Exporter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Choisir un export</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => exportBudgetCSV(projects)} className="gap-2 cursor-pointer">
              <FileSpreadsheet className="w-4 h-4" />
              Budget par projet (.csv)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportLotsCSV(budgetLots)} className="gap-2 cursor-pointer">
              <FileSpreadsheet className="w-4 h-4" />
              Détail des lots (.csv)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportFournisseursCSV(topSuppliers)} className="gap-2 cursor-pointer">
              <FileSpreadsheet className="w-4 h-4" />
              Top fournisseurs (.csv)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.print()} className="gap-2 cursor-pointer">
              <Printer className="w-4 h-4" />
              Imprimer / PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Engagement budgétaire</p>
              <p className="text-2xl font-bold tabular-nums">
                {totalBudget ? Math.round((totalConsomme / totalBudget) * 100) : 0}%
              </p>
            </div>
          </div>
          <Progress value={totalBudget ? (totalConsomme / totalBudget) * 100 : 0} className="h-1.5 mb-2" />
          <p className="text-sm text-muted-foreground">{formatEur(totalConsomme)} sur {formatEur(totalBudget)}</p>
        </div>

        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-success-soft text-success flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Taux de validation</p>
              <p className="text-2xl font-bold tabular-nums">{tauxValidation}%</p>
            </div>
          </div>
          <Progress value={tauxValidation} className="h-1.5 mb-2 [&>div]:bg-success" />
          <p className="text-sm text-muted-foreground">{traitees} demandes traitées sur {totalDemandes}</p>
        </div>

        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-warning-soft text-warning flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Volume d'achats</p>
              <p className="text-2xl font-bold tabular-nums">{formatEur(totalAchats)}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-5">{topSuppliers.length} fournisseurs actifs</p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl bg-card border border-border shadow-sm p-5">
          <h2 className="font-semibold mb-4">Budget vs consommé par projet (M FCFA)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={budgetData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="nom" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="budget" fill="hsl(var(--muted-foreground))" name="Budget" radius={[4, 4, 0, 0]} />
              <Bar dataKey="consomme" fill="hsl(var(--accent))" name="Consommé" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl bg-card border border-border shadow-sm p-5">
          <h2 className="font-semibold mb-4">Répartition des demandes par statut</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statutsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={{ fontSize: 11 }}>
                {statutsData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl bg-card border border-border shadow-sm p-5">
          <h2 className="font-semibold mb-4">Top fournisseurs (M FCFA)</h2>
          {fournisseursData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Aucune commande enregistrée.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={fournisseursData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="nom" width={140} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="montant" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl bg-card border border-border shadow-sm p-5">
          <h2 className="font-semibold mb-4">Mouvements de stock (entrées / sorties)</h2>
          {mouvementsParMois.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Aucun mouvement sur les 6 derniers mois.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={mouvementsParMois}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="entrees" stroke="hsl(var(--success))" strokeWidth={2} name="Entrées" />
                <Line type="monotone" dataKey="sorties" stroke="hsl(var(--warning))" strokeWidth={2} name="Sorties" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Budget lots — accordéon par projet */}
      {budgetLots.length > 0 && (
        <BudgetLotsSection budgetLots={budgetLots} onExport={() => exportLotsCSV(budgetLots)} />
      )}

      {/* Bas de page */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-card border border-border shadow-sm p-5">
          <h2 className="font-semibold mb-4">Top articles consommés (valeur k FCFA)</h2>
          {articleUsage.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Aucune sortie de stock enregistrée.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={articleUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="nom" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="valeur" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl bg-card border border-border shadow-sm p-5">
          <h2 className="font-semibold mb-4">Consommation budgétaire par projet</h2>
          <div className="space-y-4">
            {projects.map((p: any) => {
              const pct     = p.budget_initial > 0 ? (Number(p.budget_consomme) / Number(p.budget_initial)) * 100 : 0;
              const overrun = pct > 95;
              return (
                <div key={p.code}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <p className="text-sm font-medium">{p.nom}</p>
                      <p className="text-xs text-muted-foreground">{p.client}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold tabular-nums ${overrun ? "text-destructive" : ""}`}>{Math.round(pct)}%</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{formatEur(Number(p.budget_consomme))} / {formatEur(Number(p.budget_initial))}</p>
                    </div>
                  </div>
                  <Progress value={pct} className={`h-2 ${overrun ? "[&>div]:bg-destructive" : ""}`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
