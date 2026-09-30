import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Loader2, Pencil, Trash2, Users } from "lucide-react";
import { usersApi, rolesApi, apiError } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface UserRow {
  id: string;
  email: string;
  nom: string;
  actif: boolean;
  roles: string[];
  role_libelles: string[];
}
interface Role { id: string; code: string; libelle: string; }

export default function ParametresUtilisateursPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([usersApi.list(), rolesApi.list()]);
      setUsers(u);
      setRoles(r);
    } catch (err) {
      toast.error("Erreur de chargement", { description: apiError(err) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (u: UserRow) => { setEditing(u); setDialogOpen(true); };

  const handleDelete = async (u: UserRow) => {
    try {
      await usersApi.remove(u.id);
      toast.success("Utilisateur supprimé");
      load();
    } catch (err) {
      toast.error("Suppression impossible", { description: apiError(err) });
    }
  };

  const toggleActif = async (u: UserRow) => {
    try {
      await usersApi.update(u.id, { actif: !u.actif });
      toast.success(u.actif ? "Compte désactivé" : "Compte activé");
      load();
    } catch (err) {
      toast.error("Modification impossible", { description: apiError(err) });
    }
  };

  return (
    <>
      <PageHeader
        breadcrumb="Paramètres"
        title="Utilisateurs et rôles"
        description="Gestion des comptes, attribution des rôles et permissions"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/parametres"><ArrowLeft className="w-4 h-4 mr-2" />Retour</Link>
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />Nouvel utilisateur
            </Button>
          </div>
        }
      />

      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Users className="w-8 h-8 opacity-30" />
            <p>Aucun utilisateur</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Nom</th>
                <th className="text-left font-medium px-4 py-3">Email</th>
                <th className="text-left font-medium px-4 py-3">Rôles</th>
                <th className="text-center font-medium px-4 py-3">Actif</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{u.nom}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(u.roles || []).length > 0 ? (
                        u.roles.map((code) => (
                          <span key={code} className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-medium">
                            {code}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <Switch checked={u.actif} onCheckedChange={() => toggleActif(u)} disabled={u.id === currentUser?.id} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={u.id === currentUser?.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer {u.nom} ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. Le compte et ses accès seront supprimés.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(u)} className="bg-destructive hover:bg-destructive/90">
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        roles={roles}
        onSaved={() => { setDialogOpen(false); load(); }}
      />
    </>
  );
}

function UserDialog({
  open, onOpenChange, editing, roles, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: UserRow | null;
  roles: Role[];
  onSaved: () => void;
}) {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [actif, setActif] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNom(editing?.nom ?? "");
      setEmail(editing?.email ?? "");
      setPassword("");
      setActif(editing?.actif ?? true);
      setSelectedRoles(editing?.roles ?? []);
    }
  }, [open, editing]);

  const toggleRole = (code: string) => {
    setSelectedRoles((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
  };

  const submit = async () => {
    if (!nom.trim() || !email.trim()) { toast.error("Nom et email obligatoires"); return; }
    if (!editing && password.length < 6) { toast.error("Mot de passe : 6 caractères minimum"); return; }
    if (selectedRoles.length === 0) { toast.error("Sélectionnez au moins un rôle"); return; }

    setSaving(true);
    try {
      if (editing) {
        await usersApi.update(editing.id, {
          nom, email, actif, roles: selectedRoles,
          ...(password ? { password } : {}),
        });
        toast.success("Utilisateur modifié");
      } else {
        await usersApi.create({ nom, email, password, actif, roles: selectedRoles });
        toast.success("Utilisateur créé");
      }
      onSaved();
    } catch (err) {
      toast.error("Enregistrement impossible", { description: apiError(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</DialogTitle>
          <DialogDescription>
            {editing ? "Modifiez les informations et les rôles." : "Créez un compte et attribuez ses rôles."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nom complet *</Label>
              <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Amadou Diallo" />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nom@btp-sn.com" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{editing ? "Nouveau mot de passe (laisser vide pour conserver)" : "Mot de passe *"}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
          </div>

          <div className="space-y-2">
            <Label>Rôles *</Label>
            <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto rounded-lg border border-border p-3">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={selectedRoles.includes(r.code)} onCheckedChange={() => toggleRole(r.code)} />
                  <span>{r.libelle || r.code}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Compte actif</p>
              <p className="text-xs text-muted-foreground">L'utilisateur peut se connecter</p>
            </div>
            <Switch checked={actif} onCheckedChange={setActif} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editing ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
