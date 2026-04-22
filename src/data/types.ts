// Domain types — BTP Manager

export type StatutDemande =
  | "BROUILLON"
  | "SOUMISE"
  | "VALIDATION_TECHNIQUE"
  | "VALIDATION_BUDGETAIRE"
  | "APPROUVEE"
  | "EN_ACHAT"
  | "EN_PREPARATION"
  | "MISE_A_DISPO"
  | "CLOTUREE"
  | "REJETEE"
  | "EN_COMPLEMENT";

export type Urgence = "NORMALE" | "URGENTE" | "HAUTE" | "CRITIQUE";
export type NatureArticle = "STOCKABLE" | "ACHAT_DIRECT" | "DURABLE" | "CONSOMMABLE";
export type TypeDepot = "MAGASIN_CENTRAL" | "DEPOT_SECONDAIRE" | "STOCK_CHANTIER" | "DEPOT_CHANTIER" | "TRANSIT";

export type TypeMouvement =
  | "ENTREE_ACHAT"
  | "SORTIE_CHANTIER"
  | "TRANSFERT_SORTANT"
  | "TRANSFERT_ENTRANT"
  | "RETOUR_CHANTIER"
  | "AJUSTEMENT_INVENTAIRE"
  | "RESERVATION";

export interface Projet {
  id: string;
  code: string;
  nom: string;
  client: string;
  budget: number;
  consomme: number;
  statut: "ACTIF" | "CLOTURE" | "SUSPENDU";
  dateDebut: string;
  dateFin: string;
}

export interface Chantier {
  id: string;
  code: string;
  nom: string;
  projetId: string;
  localisation: string;
  responsable: string;
  statut: "ACTIF" | "PAUSE" | "TERMINE";
  avancement: number;
}

export interface Article {
  id: string;
  code: string;
  designation: string;
  famille: string;
  unite: string;
  nature: NatureArticle;
  prixMoyen: number;
}

export interface Depot {
  id: string;
  code: string;
  nom: string;
  type: TypeDepot;
  localisation: string;
}

export interface Stock {
  id: string;
  articleId: string;
  depotId: string;
  qteDisponible: number;
  qteReservee: number;
  seuilAlerte: number;
}

export interface LigneDemande {
  id: string;
  articleId: string;
  quantiteDemandee: number;
  quantiteValidee?: number;
}

export interface Demande {
  id: string;
  numero: string;
  dateDemande: string;
  dateSouhaitee: string;
  demandeur: string;
  chantierId: string;
  projetId: string;
  urgence: Urgence;
  statut: StatutDemande;
  motif: string;
  lignes: LigneDemande[];
  montantEstime: number;
  validations: Validation[];
}

export interface Validation {
  etape: "TECHNIQUE" | "BUDGETAIRE" | "DIRECTION";
  valideur: string;
  date: string;
  decision: "APPROUVEE" | "REJETEE" | "EN_ATTENTE";
  commentaire?: string;
}

export interface Mouvement {
  id: string;
  date: string;
  type: TypeMouvement;
  articleId: string;
  depotId: string;
  quantite: number;
  reference: string;
  utilisateur: string;
  chantierId?: string;
}

export interface Commande {
  id: string;
  numero: string;
  fournisseur: string;
  date: string;
  statut: "BROUILLON" | "ENVOYEE" | "PARTIELLE" | "RECUE" | "CLOTUREE";
  montant: number;
  demandeId?: string;
  lignes: number;
}

export interface Reception {
  id: string;
  numero: string;
  date: string;
  commandeNumero: string;
  fournisseur: string;
  conformite: "CONFORME" | "RESERVE" | "PARTIELLE";
  depotId: string;
  receptionnaire: string;
}

export interface Equipement {
  id: string;
  code: string;
  designation: string;
  etat: "DISPONIBLE" | "AFFECTE" | "EN_MAINTENANCE" | "HORS_SERVICE";
  affecteA?: string;
  chantierId?: string;
}
