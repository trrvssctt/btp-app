import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { equipementsApi, sitesApi, usersApi, requestsApi, apiError } from "@/lib/api";

interface Props {
  equipementId: string;
  equipementCode: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function AffectEquipementDialog({ equipementId, equipementCode, trigger, onSuccess }: Props) {
  const [open, setOpen]       = useState(false);
  const [saving, setSaving]   = useState(false);
  const [sites, setSites]     = useState<any[]>([]);
  const [users, setUsers]     = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  const [siteId,      setSiteId]      = useState("");
  const [userId,      setUserId]      = useState("");
  const [requestId,   setRequestId]   = useState("");
  const [dateDebut,   setDateDebut]   = useState(new Date().toISOString().slice(0, 10));
  const [commentaire, setCommentaire] = useState("");

  useEffect(() => {
    if (!open) return;
    Promise.all([sitesApi.list(), usersApi.list()])
      .then(([s, u]) => { setSites(s); setUsers(u); })
      .catch(() => {});
  }, [open]);

  // Charger les demandes approuvées du chantier sélectionné
  useEffect(() => {
    if (!siteId) { setRequests([]); setRequestId(""); return; }
    requestsApi.list({ statut: "APPROUVEE", project_id: undefined })
      .then((all: any[]) => setRequests(all.filter((r: any) => r.site_id === siteId)))
      .catch(() => setRequests([]));
  }, [siteId]);

  const reset = () => {
    setSiteId(""); setUserId(""); setRequestId("");
    setDateDebut(new Date().toISOString().slice(0, 10)); setCommentaire("");
  };

  const submit = async () => {
    if (!siteId && !userId) {
      toast.error("Choisissez au moins un chantier ou un destinataire");
      return;
    }
    setSaving(true);
    try {
      await equipementsApi.createAssignment(equipementId, {
        site_id:    siteId   || null,
        user_id:    userId   || null,
        request_id: requestId || null,
        date_debut: dateDebut,
        commentaire: commentaire || null,
      });
      toast.success("Équipement affecté", {
        description: `${equipementCode} → ${sites.find((s) => s.id === siteId)?.nom ?? ""}`,
      });
      reset();
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error("Erreur lors de l'affectation", { description: apiError(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Affecter
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Affecter l'équipement</DialogTitle>
          <DialogDescription>
            UC-11 — Associer <span className="font-mono font-semibold">{equipementCode}</span> à un chantier ou un agent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Chantier */}
          <div className="space-y-1.5">
            <Label>Chantier de destination *</Label>
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un chantier…" /></SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.code} — {s.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lier à une demande approuvée du chantier */}
          {requests.length > 0 && (
            <div className="space-y-1.5">
              <Label>Demande associée (optionnel)</Label>
              <Select value={requestId} onValueChange={setRequestId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une demande…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Aucune —</SelectItem>
                  {requests.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.numero} — {r.motif}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Rattache l'affectation à une demande approuvée sur ce chantier pour la traçabilité.
              </p>
            </div>
          )}

          {/* Affectataire */}
          <div className="space-y-1.5">
            <Label>Affectataire (agent, optionnel)</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un agent…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Aucun —</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nom} ({u.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date de début */}
          <div className="space-y-1.5">
            <Label>Date de début *</Label>
            <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
          </div>

          {/* Commentaire / accessoires */}
          <div className="space-y-1.5">
            <Label>Commentaire / accessoires (optionnel)</Label>
            <Textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Ex : Livré avec mallette, câble d'extension…"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmer l'affectation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
