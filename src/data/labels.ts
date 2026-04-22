import type { StatutDemande, Urgence, NatureArticle, TypeMouvement, TypeDepot } from "@/data/types";

export const statutDemandeLabel: Record<StatutDemande, string> = {
  BROUILLON: "Brouillon",
  SOUMISE: "Soumise",
  VALIDATION_TECHNIQUE: "Validation technique",
  VALIDATION_BUDGETAIRE: "Validation budgétaire",
  APPROUVEE: "Approuvée",
  EN_ACHAT: "En achat",
  EN_PREPARATION: "En préparation",
  MISE_A_DISPO: "Mise à disposition",
  CLOTUREE: "Clôturée",
  REJETEE: "Rejetée",
  EN_COMPLEMENT: "Complément requis",
};

export const statutDemandeTone: Record<StatutDemande, "muted" | "info" | "warning" | "success" | "destructive" | "accent"> = {
  BROUILLON: "muted",
  SOUMISE: "info",
  VALIDATION_TECHNIQUE: "warning",
  VALIDATION_BUDGETAIRE: "warning",
  APPROUVEE: "success",
  EN_ACHAT: "accent",
  EN_PREPARATION: "accent",
  MISE_A_DISPO: "success",
  CLOTUREE: "muted",
  REJETEE: "destructive",
  EN_COMPLEMENT: "warning",
};

export const urgenceTone: Record<Urgence, "muted" | "warning" | "destructive"> = {
  NORMALE: "muted",
  URGENTE: "warning",
  HAUTE: "warning",
  CRITIQUE: "destructive",
};

export const natureLabel: Record<NatureArticle, string> = {
  STOCKABLE: "Stockable",
  ACHAT_DIRECT: "Achat direct",
  DURABLE: "Durable",
  CONSOMMABLE: "Consommable",
};

export const typeDepotLabel: Record<TypeDepot, string> = {
  MAGASIN_CENTRAL: "Magasin central",
  DEPOT_SECONDAIRE: "Dépôt secondaire",
  STOCK_CHANTIER: "Stock chantier",
  DEPOT_CHANTIER: "Dépôt chantier",
  TRANSIT: "En transit",
};

export const mouvementLabel: Record<string, string> = {
  ENTREE: "Entrée",
  SORTIE: "Sortie",
  ENTREE_ACHAT: "Entrée achat",
  SORTIE_CHANTIER: "Sortie chantier",
  TRANSFERT_SORTANT: "Transfert sortant",
  TRANSFERT_ENTRANT: "Transfert entrant",
  RETOUR_CHANTIER: "Retour chantier",
  AJUSTEMENT_INVENTAIRE: "Ajustement inventaire",
  RESERVATION: "Réservation",
  ANNULATION_RESERVATION: "Annulation réservation",
};

export const formatEur = (n: number) =>
  new Intl.NumberFormat("fr-SN", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(n);

export const formatFCFA = formatEur;

export const formatNum = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
