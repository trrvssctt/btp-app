import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ShieldCheck, FileEdit, Trash2, LogIn, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { auditApi } from "@/lib/api";
import { formatDateTime } from "@/data/labels";

type AuditAction = "LOGIN" | "CREATE" | "UPDATE" | "DELETE" | "VALIDATE" | "REJECT" | "EXPORT";

const actionMeta: Record<string, { label: string; icon: typeof LogIn; cls: string }> = {
  LOGIN:    { label: "Connexion",    icon: LogIn,        cls: "bg-muted text-muted-foreground" },
  CREATE:   { label: "Création",     icon: FileEdit,     cls: "bg-accent-soft text-accent" },
  UPDATE:   { label: "Modification", icon: FileEdit,     cls: "bg-warning-soft text-warning" },
  DELETE:   { label: "Suppression",  icon: Trash2,       cls: "bg-destructive/10 text-destructive" },
  VALIDATE: { label: "Validation",   icon: CheckCircle2, cls: "bg-success-soft text-success" },
  REJECT:   { label: "Rejet",        icon: XCircle,      cls: "bg-destructive/10 text-destructive" },
  EXPORT:   { label: "Export",       icon: ShieldCheck,  cls: "bg-muted text-muted-foreground" },
};

export default function AuditPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("ALL");
  const [entite, setEntite] = useState("ALL");

  useEffect(() => {
    setLoading(true);
    auditApi.list()
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const entites = useMemo(() => Array.from(new Set(entries.map((a) => a.entity_type).filter(Boolean))), [entries]);

  const filtered = entries.filter((a) => {
    if (action !== "ALL" && a.action !== action) return false;
    if (entite !== "ALL" && a.entity_type !== entite) return false;
    if (q && !`${a.utilisateur ?? ""} ${a.reference ?? ""} ${a.detail ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <AppLayout>
      <PageHeader
        breadcrumb="Pilotage"
        title="Journal d'audit"
        description="Traçabilité de toutes les actions sensibles effectuées dans l'application."
      />

      <div className="rounded-xl bg-card border border-border shadow-sm">
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
              {Object.entries(actionMeta).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
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

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
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
                    const meta = actionMeta[a.action] || actionMeta.CREATE;
                    const Icon = meta.icon;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                          {a.created_at ? new Date(a.created_at).toLocaleString("fr-SN") : "—"}
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
                        <TableCell className="text-sm text-muted-foreground max-w-md">{a.detail ?? "—"}</TableCell>
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
          {filtered.length} entrée{filtered.length > 1 ? "s" : ""} affichée{filtered.length > 1 ? "s" : ""} sur {entries.length}
        </div>
      </div>
    </AppLayout>
  );
}
