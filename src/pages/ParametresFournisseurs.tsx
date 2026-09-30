import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Loader2, Pencil, Trash2, Truck, Mail, Phone } from "lucide-react";
import { suppliersApi, apiError } from "@/lib/api";
import { toast } from "sonner";

interface Supplier {
  id: string; code: string; raison_sociale: string;
  contact?: string | null; email?: string | null; telephone?: string | null;
}

export default function ParametresFournisseursPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const load = async () => {
    setLoading(true);
    try { setSuppliers(await suppliersApi.list()); }
    catch (err) { toast.error("Erreur de chargement", { description: apiError(err) }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (s: Supplier) => {
    try { await suppliersApi.remove(s.id); toast.success("Fournisseur supprimé"); load(); }
    catch (err) { toast.error("Suppression impossible", { description: apiError(err) }); }
  };

  return (
    <>
      <PageHeader
        breadcrumb="Paramètres"
        title="Fournisseurs"
        description="Base fournisseurs, contacts et conditions commerciales"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/parametres"><ArrowLeft className="w-4 h-4 mr-2" />Retour</Link>
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />Nouveau fournisseur
            </Button>
          </div>
        }
      />

      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Truck className="w-8 h-8 opacity-30" /><p>Aucun fournisseur</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Code</th>
                <th className="text-left font-medium px-4 py-3">Raison sociale</th>
                <th className="text-left font-medium px-4 py-3">Contact</th>
                <th className="text-left font-medium px-4 py-3">Coordonnées</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                  <td className="px-4 py-3 font-medium">{s.raison_sociale}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.contact ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                      {s.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>}
                      {s.telephone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.telephone}</span>}
                      {!s.email && !s.telephone && "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(s); setDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer {s.raison_sociale} ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Action irréversible. Les bons de commande liés à ce fournisseur peuvent être impactés.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(s)} className="bg-destructive hover:bg-destructive/90">
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

      <SupplierDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={() => { setDialogOpen(false); load(); }} />
    </>
  );
}

function SupplierDialog({ open, onOpenChange, editing, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; editing: Supplier | null; onSaved: () => void;
}) {
  const [code, setCode] = useState("");
  const [raison, setRaison] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCode(editing?.code ?? "");
      setRaison(editing?.raison_sociale ?? "");
      setContact(editing?.contact ?? "");
      setEmail(editing?.email ?? "");
      setTelephone(editing?.telephone ?? "");
    }
  }, [open, editing]);

  const submit = async () => {
    if (!code.trim() || !raison.trim()) { toast.error("Code et raison sociale obligatoires"); return; }
    setSaving(true);
    try {
      const body = {
        code, raison_sociale: raison,
        contact: contact || null, email: email || null, telephone: telephone || null,
      };
      if (editing) { await suppliersApi.update(editing.id, body); toast.success("Fournisseur modifié"); }
      else { await suppliersApi.create(body); toast.success("Fournisseur créé"); }
      onSaved();
    } catch (err) {
      toast.error("Enregistrement impossible", { description: apiError(err) });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier le fournisseur" : "Nouveau fournisseur"}</DialogTitle>
          <DialogDescription>Coordonnées et contact commercial.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex: SENICO" />
            </div>
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Nom du contact" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Raison sociale *</Label>
            <Input value={raison} onChange={(e) => setRaison(e.target.value)} placeholder="Ex: SENICO — Sanitaires & Électricité" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@fournisseur.sn" />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+221 33 ..." />
            </div>
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
