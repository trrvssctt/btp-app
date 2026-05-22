import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ShieldCheck, FileEdit, Trash2, LogIn, CheckCircle2, XCircle, Loader2, RefreshCw, PauseCircle, PlayCircle, MessageSquare, CalendarDays, Clock, User, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { auditApi } from "@/lib/api";

const actionMeta: Record<string, { label: string; icon: typeof LogIn; cls: string }> = {
  LOGIN:           { label: "Connexion",    icon: LogIn,         cls: "bg-muted text-muted-foreground" },
  CREATE:          { label: "Création",     icon: FileEdit,      cls: "bg-accent-soft text-accent" },
  UPDATE:          { label: "Modification", icon: FileEdit,      cls: "bg-warning-soft text-warning" },
  DELETE:          { label: "Suppression",  icon: Trash2,        cls: "bg-destructive/10 text-destructive" },
  VALIDATE:        { label: "Validation",   icon: CheckCircle2,  cls: "bg-success-soft text-success" },
  REJECT:          { label: "Rejet",        icon: XCircle,       cls: "bg-destructive/10 text-destructive" },
  EXPORT:          { label: "Export",       icon: ShieldCheck,   cls: "bg-muted text-muted-foreground" },
  COMPLEMENT:      { label: "Complément",   icon: MessageSquare, cls: "bg-warning-soft text-warning" },
  RESUBMIT:        { label: "Resoumission", icon: RefreshCw,     cls: "bg-accent-soft text-accent" },
  STATUT_SUSPENDU: { label: "Suspension",   icon: PauseCircle,   cls: "bg-orange-100 text-orange-600" },
  STATUT_ACTIF:    { label: "Relance",      icon: PlayCircle,    cls: "bg-success-soft text-success" },
  STATUT_SUPPRIME: { label: "Suppression",  icon: Trash2,        cls: "bg-destructive/10 text-destructive" },
  STATUT_CLOTURE:  { label: "Clôture",      icon: CheckCircle2,  cls: "bg-muted text-muted-foreground" },
};

function getActionMeta(action: string) {
  if (actionMeta[action]) return actionMeta[action];
  if (action?.startsWith("STATUT_")) return { label: action.replace("STATUT_", ""), icon: RefreshCw, cls: "bg-muted text-muted-foreground" };
  return actionMeta.CREATE;
}

function toDateStr(iso: string) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

function toTimeMinutes(iso: string) {
  if (!iso) return 0;
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function timeToMinutes(t: string) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export default function AuditPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres texte / sélect
  const [q, setQ] = useState("");
  const [action, setAction] = useState("ALL");
  const [entite, setEntite] = useState("ALL");
  const [utilisateur, setUtilisateur] = useState("ALL");

  // Filtres date / heure
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");

  useEffect(() => {
    setLoading(true);
    auditApi.list()
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const entites = useMemo(() => Array.from(new Set(entries.map((a) => a.entity_type).filter(Boolean))).sort() as string[], [entries]);
  const utilisateurs = useMemo(() => Array.from(new Set(entries.map((a) => a.utilisateur).filter(Boolean))).sort() as string[], [entries]);

  const hasFilters = q !== "" || action !== "ALL" || entite !== "ALL" || utilisateur !== "ALL"
    || dateDebut !== "" || dateFin !== "" || heureDebut !== "" || heureFin !== "";

  const reset = () => {
    setQ(""); setAction("ALL"); setEntite("ALL"); setUtilisateur("ALL");
    setDateDebut(""); setDateFin(""); setHeureDebut(""); setHeureFin("");
  };

  const filtered = useMemo(() => {
    const debutMin = timeToMinutes(heureDebut);
    const finMin   = timeToMinutes(heureFin);

    return entries.filter((a) => {
      if (action !== "ALL" && a.action !== action) return false;
      if (entite !== "ALL" && a.entity_type !== entite) return false;
      if (utilisateur !== "ALL" && a.utilisateur !== utilisateur) return false;
      if (q && !`${a.utilisateur ?? ""} ${a.reference ?? ""} ${a.detail ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;

      if (a.created_at) {
        const d = toDateStr(a.created_at);
        if (dateDebut && d < dateDebut) return false;
        if (dateFin   && d > dateFin)   return false;

        const mins = toTimeMinutes(a.created_at);
        if (debutMin !== null && mins < debutMin) return false;
        if (finMin   !== null && mins > finMin)   return false;
      }

      return true;
    });
  }, [entries, q, action, entite, utilisateur, dateDebut, dateFin, heureDebut, heureFin]);

  return (
    <>
      <PageHeader
        breadcrumb="Pilotage"
        title="Journal d'audit"
        description="Traçabilité de toutes les actions sensibles effectuées dans l'application."
      />

      <div className="rounded-xl bg-card border border-border shadow-sm">
        {/* Ligne 1 : recherche texte + action + entité */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher utilisateur, référence, détail…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes les actions</SelectItem>
              {Array.from(new Set(entries.map((e) => e.action).filter(Boolean))).sort().map((k) => (
                <SelectItem key={k} value={k}>{getActionMeta(k).label} ({k})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={entite} onValueChange={setEntite}>
            <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Entité" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes les entités</SelectItem>
              {entites.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Ligne 2 : utilisateur + plage de dates + plage d'heures + reset */}
        <div className="px-4 py-3 border-b border-border flex flex-wrap gap-3 items-center bg-muted/20">
          {/* Utilisateur */}
          <div className="flex items-center gap-1.5 min-w-[180px]">
            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Select value={utilisateur} onValueChange={setUtilisateur}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Utilisateur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les utilisateurs</SelectItem>
                {utilisateurs.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Séparateur visuel */}
          <div className="hidden md:block h-5 w-px bg-border" />

          {/* Plage de dates */}
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">Du</span>
            <Input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="h-8 text-xs w-36"
            />
            <span className="text-xs text-muted-foreground">au</span>
            <Input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="h-8 text-xs w-36"
            />
          </div>

          {/* Séparateur visuel */}
          <div className="hidden md:block h-5 w-px bg-border" />

          {/* Plage d'heures */}
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">De</span>
            <Input
              type="time"
              value={heureDebut}
              onChange={(e) => setHeureDebut(e.target.value)}
              className="h-8 text-xs w-28"
            />
            <span className="text-xs text-muted-foreground">à</span>
            <Input
              type="time"
              value={heureFin}
              onChange={(e) => setHeureFin(e.target.value)}
              className="h-8 text-xs w-28"
            />
          </div>

          {/* Reset */}
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={reset} className="ml-auto gap-1.5 text-muted-foreground h-8 text-xs">
              <X className="w-3 h-3" /> Réinitialiser
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Date / Heure</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entité</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Détail</TableHead>
                  <TableHead className="text-right">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                      Aucune entrée ne correspond à ces filtres.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((a) => {
                    const meta = getActionMeta(a.action);
                    const Icon = meta.icon;
                    const dt = a.created_at ? new Date(a.created_at) : null;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap">
                          {dt ? (
                            <>
                              <div className="text-xs tabular-nums text-foreground font-medium">
                                {dt.toLocaleDateString("fr-SN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                              </div>
                              <div className="text-xs tabular-nums text-muted-foreground">
                                {dt.toLocaleTimeString("fr-SN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                              </div>
                            </>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{a.utilisateur ?? "Système"}</div>
                          {a.role && <div className="text-xs text-muted-foreground">{a.role}</div>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${meta.cls} border-transparent`}>
                            <Icon className="w-3 h-3" />
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{a.entity_type ?? "—"}</TableCell>
                        <TableCell className="text-sm font-mono text-xs">{a.reference ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-md truncate" title={a.detail ?? ""}>{a.detail ?? "—"}</TableCell>
                        <TableCell className="text-right text-xs font-mono text-muted-foreground">{a.ip ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="p-3 border-t border-border text-xs text-muted-foreground text-center">
          {filtered.length} entrée{filtered.length !== 1 ? "s" : ""} affichée{filtered.length !== 1 ? "s" : ""} sur {entries.length}
        </div>
      </div>
    </>
  );
}
