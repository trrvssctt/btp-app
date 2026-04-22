import type {
  Article, Chantier, Commande, Demande, Depot, Equipement,
  Mouvement, Projet, Reception, Stock,
} from "./types";

// Données réalistes — contexte Sénégal / Afrique de l'Ouest (prix en FCFA)

export const projets: Projet[] = [
  { id: "p1", code: "PRJ-SN-001", nom: "Lycée Technique Régional de Thiès",        client: "Ministère de l'Éducation Nationale — DGCPE", budget: 2_850_000_000, consomme: 1_243_500_000, statut: "ACTIF",   dateDebut: "2025-03-01", dateFin: "2026-12-31" },
  { id: "p2", code: "PRJ-SN-002", nom: "Réhabilitation RN1 Dakar–Thiès (PK0–PK65)", client: "AGEROUTE Sénégal",                                budget: 8_400_000_000, consomme: 3_150_000_000, statut: "ACTIF",   dateDebut: "2025-01-15", dateFin: "2026-09-30" },
  { id: "p3", code: "PRJ-SN-003", nom: "Centre de Santé Niveau 2 — Ziguinchor",    client: "Ministère de la Santé et de l'Action Sociale",   budget: 1_250_000_000, consomme:   412_800_000, statut: "ACTIF",   dateDebut: "2025-06-01", dateFin: "2026-11-30" },
  { id: "p4", code: "PRJ-SN-004", nom: "Complexe Résidentiel Les Almadies — Dakar", client: "SICAP SA",                                       budget: 5_600_000_000, consomme: 2_890_000_000, statut: "ACTIF",   dateDebut: "2024-09-01", dateFin: "2026-06-30" },
  { id: "p5", code: "PRJ-SN-005", nom: "Marché Moderne de Kaolack",                client: "Mairie de Kaolack",                              budget:   980_000_000, consomme:   980_000_000, statut: "CLOTURE", dateDebut: "2024-02-01", dateFin: "2025-01-31" },
];

export const chantiers: Chantier[] = [
  { id: "c1", code: "SN1-001", nom: "Bloc Administratif & Salles de Cours",   projetId: "p1", localisation: "Thiès — Plateau",          responsable: "Amadou Diallo",   statut: "ACTIF",  avancement: 58 },
  { id: "c2", code: "SN1-002", nom: "Ateliers Techniques & Laboratoires",     projetId: "p1", localisation: "Thiès — Plateau",          responsable: "Mariama Ba",      statut: "ACTIF",  avancement: 34 },
  { id: "c3", code: "SN2-001", nom: "Section PK0–PK25 (Dakar–Rufisque)",      projetId: "p2", localisation: "Dakar / Rufisque",         responsable: "El Hadji Ndiaye", statut: "ACTIF",  avancement: 72 },
  { id: "c4", code: "SN2-002", nom: "Section PK25–PK65 (Rufisque–Thiès)",     projetId: "p2", localisation: "Rufisque / Thiès",         responsable: "El Hadji Ndiaye", statut: "PAUSE",  avancement: 41 },
  { id: "c5", code: "SN3-001", nom: "Bloc Maternité & Pédiatrie",             projetId: "p3", localisation: "Ziguinchor — Lyndiane",    responsable: "Fatou Ndoye",     statut: "ACTIF",  avancement: 45 },
  { id: "c6", code: "SN4-001", nom: "Tour A — R+8 (Logements)",               projetId: "p4", localisation: "Dakar — Les Almadies",     responsable: "Cheikh Diagne",   statut: "ACTIF",  avancement: 82 },
  { id: "c7", code: "SN4-002", nom: "Tour B — R+8 (Logements)",               projetId: "p4", localisation: "Dakar — Les Almadies",     responsable: "Cheikh Diagne",   statut: "ACTIF",  avancement: 63 },
  { id: "c8", code: "SN5-001", nom: "Halle Centrale — Marché de Kaolack",     projetId: "p5", localisation: "Kaolack — Centre",         responsable: "Moussa Faye",     statut: "TERMINE",avancement: 100 },
];

export const depots: Depot[] = [
  { id: "d1", code: "MAG-DAKAR",   nom: "Magasin Central Dakar (Parcelles Assainies)", type: "MAGASIN_CENTRAL",  localisation: "Dakar — Parcelles Assainies" },
  { id: "d2", code: "DEP-THIES",   nom: "Dépôt Chantier Thiès",                        type: "DEPOT_SECONDAIRE", localisation: "Thiès — Zone Industrielle"   },
  { id: "d3", code: "DEP-ZIGUI",   nom: "Dépôt Chantier Ziguinchor",                  type: "DEPOT_SECONDAIRE", localisation: "Ziguinchor — Lyndiane"       },
  { id: "d4", code: "DEP-ALMAD",   nom: "Dépôt Chantier Les Almadies",                type: "STOCK_CHANTIER",   localisation: "Dakar — Les Almadies"        },
  { id: "d5", code: "DEP-KAOLACK", nom: "Dépôt Chantier Kaolack",                     type: "DEPOT_SECONDAIRE", localisation: "Kaolack — Quartier Léona"    },
];

export const articles: Article[] = [
  { id: "a1",  code: "CIM-SOCOCIM",  designation: "Ciment SOCOCIM CEM II 42.5 — sac 50 kg",       famille: "Liants",      unite: "sac",   nature: "STOCKABLE",    prixMoyen: 6200  },
  { id: "a2",  code: "CIM-CIMAF",    designation: "Ciment CIMAF 32.5 — sac 50 kg",                famille: "Liants",      unite: "sac",   nature: "STOCKABLE",    prixMoyen: 5500  },
  { id: "a3",  code: "ACI-SN-HA12",  designation: "Acier HA Ø12 — barre 12 m",                   famille: "Aciers",      unite: "barre", nature: "STOCKABLE",    prixMoyen: 12500 },
  { id: "a4",  code: "ACI-SN-HA16",  designation: "Acier HA Ø16 — barre 12 m",                   famille: "Aciers",      unite: "barre", nature: "STOCKABLE",    prixMoyen: 21500 },
  { id: "a5",  code: "ACI-SN-HA20",  designation: "Acier HA Ø20 — barre 12 m",                   famille: "Aciers",      unite: "barre", nature: "STOCKABLE",    prixMoyen: 34000 },
  { id: "a6",  code: "PAR-SN-15",    designation: "Parpaing creux 15×20×40 cm",                  famille: "Maçonnerie",  unite: "u",     nature: "STOCKABLE",    prixMoyen: 420   },
  { id: "a7",  code: "SABLE-LAG",    designation: "Sable lagunaire lavé",                         famille: "Béton",       unite: "m³",    nature: "ACHAT_DIRECT", prixMoyen: 32000 },
  { id: "a8",  code: "GRAVIER-14",   designation: "Gravier concassé 14/25",                       famille: "Béton",       unite: "m³",    nature: "ACHAT_DIRECT", prixMoyen: 58000 },
  { id: "a9",  code: "EPI-SN-CAS",   designation: "Casque de chantier EN 397",                   famille: "EPI",         unite: "u",     nature: "DURABLE",      prixMoyen: 3500  },
  { id: "a10", code: "CARREL-60",    designation: "Carrelage sol 60×60 cm",                      famille: "Carrelage",   unite: "m²",    nature: "STOCKABLE",    prixMoyen: 18000 },
  { id: "a11", code: "PEINTURE-INT", designation: "Peinture intérieure blanche — bidon 20 L",    famille: "Finitions",   unite: "pot",   nature: "STOCKABLE",    prixMoyen: 35000 },
  { id: "a12", code: "CAB-3G25",     designation: "Câble électrique 3G2.5 — rouleau 100 m",      famille: "Électricité", unite: "rouleau",nature:"STOCKABLE",    prixMoyen: 85000 },
  { id: "a13", code: "TUBE-PVC110",  designation: "Tube PVC Ø110 mm assainissement — ml",        famille: "Hydraulique", unite: "ml",    nature: "STOCKABLE",    prixMoyen: 5500  },
  { id: "a14", code: "BOIS-COF-27",  designation: "Bois de coffrage 27 mm",                      famille: "Bois",        unite: "ml",    nature: "STOCKABLE",    prixMoyen: 2500  },
  { id: "a15", code: "LATERITE-M3",  designation: "Latérite compactée tout venant",              famille: "Terrassement",unite: "m³",    nature: "ACHAT_DIRECT", prixMoyen: 15000 },
];

export const stocks: Stock[] = [
  // Magasin Central Dakar
  { id: "s1",  articleId: "a1",  depotId: "d1", qteDisponible: 2400, qteReservee: 600,  seuilAlerte: 200 },
  { id: "s2",  articleId: "a2",  depotId: "d1", qteDisponible: 1850, qteReservee: 400,  seuilAlerte: 150 },
  { id: "s3",  articleId: "a3",  depotId: "d1", qteDisponible:  420, qteReservee:  80,  seuilAlerte:  50 },
  { id: "s4",  articleId: "a4",  depotId: "d1", qteDisponible:  185, qteReservee:  40,  seuilAlerte:  40 },
  { id: "s5",  articleId: "a5",  depotId: "d1", qteDisponible:   95, qteReservee:  15,  seuilAlerte:  20 },
  { id: "s6",  articleId: "a6",  depotId: "d1", qteDisponible: 6200, qteReservee: 1200, seuilAlerte: 800 },
  { id: "s7",  articleId: "a9",  depotId: "d1", qteDisponible:  145, qteReservee:   0,  seuilAlerte:  30 },
  { id: "s8",  articleId: "a10", depotId: "d1", qteDisponible:  650, qteReservee: 200,  seuilAlerte:  80 },
  { id: "s9",  articleId: "a11", depotId: "d1", qteDisponible:   85, qteReservee:  12,  seuilAlerte:  10 },
  { id: "s10", articleId: "a12", depotId: "d1", qteDisponible:   24, qteReservee:   0,  seuilAlerte:   5 },
  { id: "s11", articleId: "a14", depotId: "d1", qteDisponible:  850, qteReservee: 150,  seuilAlerte: 120 },
  // Dépôt Thiès
  { id: "s12", articleId: "a1",  depotId: "d2", qteDisponible:  850, qteReservee: 200,  seuilAlerte: 100 },
  { id: "s13", articleId: "a3",  depotId: "d2", qteDisponible:  210, qteReservee:  40,  seuilAlerte:  40 },
  { id: "s14", articleId: "a6",  depotId: "d2", qteDisponible: 3200, qteReservee: 500,  seuilAlerte: 500 },
  // Dépôt Almadies
  { id: "s15", articleId: "a1",  depotId: "d4", qteDisponible: 1200, qteReservee: 300,  seuilAlerte: 150 },
  { id: "s16", articleId: "a5",  depotId: "d4", qteDisponible:   55, qteReservee:  10,  seuilAlerte:  15 },
  { id: "s17", articleId: "a10", depotId: "d4", qteDisponible:  580, qteReservee: 100,  seuilAlerte:  80 },
];

export const demandes: Demande[] = [
  {
    id: "dm1", numero: "DM-2025-001", dateDemande: "2025-04-02", dateSouhaitee: "2025-04-10",
    demandeur: "Fatou Ndoye", chantierId: "c1", projetId: "p1", urgence: "NORMALE",
    statut: "CLOTUREE",
    motif: "Approvisionnement ciment pour fondations bâtiment administratif — Lycée Thiès",
    lignes: [
      { id: "l1", articleId: "a1", quantiteDemandee: 2000, quantiteValidee: 2000 },
      { id: "l2", articleId: "a3", quantiteDemandee: 150,  quantiteValidee: 150  },
    ],
    montantEstime: 14_275_000,
    validations: [
      { etape: "TECHNIQUE",  valideur: "El Hadji Ndiaye", date: "2025-04-03", decision: "APPROUVEE", commentaire: "Matériaux conformes aux spécifications techniques." },
      { etape: "BUDGETAIRE", valideur: "Amadou Diallo",   date: "2025-04-04", decision: "APPROUVEE", commentaire: "Budget disponible sur LOT-01 Gros œuvre." },
    ],
  },
  {
    id: "dm2", numero: "DM-2025-002", dateDemande: "2025-04-08", dateSouhaitee: "2025-04-12",
    demandeur: "Fatou Ndoye", chantierId: "c2", projetId: "p1", urgence: "URGENTE",
    statut: "APPROUVEE",
    motif: "Aciers HA pour dalle ateliers techniques — planning de coulage impératif",
    lignes: [
      { id: "l3", articleId: "a4", quantiteDemandee: 200, quantiteValidee: 200 },
      { id: "l4", articleId: "a5", quantiteDemandee: 80,  quantiteValidee: 80  },
    ],
    montantEstime: 7_020_000,
    validations: [
      { etape: "TECHNIQUE",  valideur: "El Hadji Ndiaye", date: "2025-04-09", decision: "APPROUVEE", commentaire: "Aciers HA20 et HA16 requis pour charges de plancher." },
      { etape: "BUDGETAIRE", valideur: "Amadou Diallo",   date: "2025-04-09", decision: "APPROUVEE" },
    ],
  },
  {
    id: "dm3", numero: "DM-2025-003", dateDemande: "2025-04-10", dateSouhaitee: "2025-04-18",
    demandeur: "Cheikh Diagne", chantierId: "c6", projetId: "p4", urgence: "NORMALE",
    statut: "EN_ACHAT",
    motif: "Béton armé élévation R+1 à R+4 — Tour A Almadies",
    lignes: [
      { id: "l5", articleId: "a1", quantiteDemandee: 4000, quantiteValidee: 4000 },
      { id: "l6", articleId: "a3", quantiteDemandee:  500, quantiteValidee:  500 },
      { id: "l7", articleId: "a4", quantiteDemandee:  350, quantiteValidee:  350 },
      { id: "l8", articleId: "a14",quantiteDemandee:  800, quantiteValidee:  800 },
    ],
    montantEstime: 35_750_000,
    validations: [
      { etape: "TECHNIQUE",  valideur: "El Hadji Ndiaye", date: "2025-04-11", decision: "APPROUVEE" },
      { etape: "BUDGETAIRE", valideur: "Cheikh Diagne",   date: "2025-04-12", decision: "APPROUVEE", commentaire: "Lot 02 Gros œuvre — budget suffisant." },
    ],
  },
  {
    id: "dm4", numero: "DM-2025-004", dateDemande: "2025-04-14", dateSouhaitee: "2025-04-25",
    demandeur: "Mariama Ba", chantierId: "c2", projetId: "p1", urgence: "NORMALE",
    statut: "VALIDATION_BUDGETAIRE",
    motif: "Carrelage et finitions internat — réception programmée en décembre 2025",
    lignes: [
      { id: "l9",  articleId: "a10", quantiteDemandee: 420 },
      { id: "l10", articleId: "a11", quantiteDemandee:  24 },
    ],
    montantEstime: 8_400_000,
    validations: [
      { etape: "TECHNIQUE", valideur: "El Hadji Ndiaye", date: "2025-04-15", decision: "APPROUVEE", commentaire: "Carrelage 60×60 conforme au CCTP." },
    ],
  },
  {
    id: "dm5", numero: "DM-2025-005", dateDemande: "2025-04-15", dateSouhaitee: "2025-04-20",
    demandeur: "Fatou Ndoye", chantierId: "c5", projetId: "p3", urgence: "URGENTE",
    statut: "VALIDATION_TECHNIQUE",
    motif: "Parpaings et ciment — murs porteurs bloc maternité Ziguinchor",
    lignes: [
      { id: "l11", articleId: "a6", quantiteDemandee: 6000 },
      { id: "l12", articleId: "a2", quantiteDemandee:  400 },
    ],
    montantEstime: 4_720_000,
    validations: [],
  },
  {
    id: "dm6", numero: "DM-2025-006", dateDemande: "2025-04-16", dateSouhaitee: "2025-05-05",
    demandeur: "Oumar Sarr", chantierId: "c7", projetId: "p4", urgence: "NORMALE",
    statut: "SOUMISE",
    motif: "Finitions peinture Tour B — livraison prévue mars 2026",
    lignes: [
      { id: "l13", articleId: "a11", quantiteDemandee: 85 },
    ],
    montantEstime: 2_975_000,
    validations: [],
  },
  {
    id: "dm7", numero: "DM-2025-007", dateDemande: "2025-04-17", dateSouhaitee: "2025-04-28",
    demandeur: "Aïssatou Mbaye", chantierId: "c1", projetId: "p1", urgence: "NORMALE",
    statut: "SOUMISE",
    motif: "Câblage électricité bâtiment administratif — lot 04 électricité",
    lignes: [
      { id: "l14", articleId: "a12", quantiteDemandee: 15 },
    ],
    montantEstime: 1_275_000,
    validations: [],
  },
  {
    id: "dm8", numero: "DM-2025-008", dateDemande: "2025-04-18", dateSouhaitee: "2025-04-22",
    demandeur: "Oumar Sarr", chantierId: "c5", projetId: "p3", urgence: "CRITIQUE",
    statut: "BROUILLON",
    motif: "Réseau assainissement bloc urgences — démarrage travaux sous 5 jours",
    lignes: [
      { id: "l15", articleId: "a13", quantiteDemandee: 200 },
    ],
    montantEstime: 1_100_000,
    validations: [],
  },
  {
    id: "dm9", numero: "DM-2025-009", dateDemande: "2025-04-10", dateSouhaitee: "2025-04-15",
    demandeur: "Cheikh Diagne", chantierId: "c6", projetId: "p4", urgence: "URGENTE",
    statut: "REJETEE",
    motif: "Granulats hors budget prévisionnel — demande à reformuler",
    lignes: [
      { id: "l16", articleId: "a8",  quantiteDemandee: 500 },
      { id: "l17", articleId: "a15", quantiteDemandee: 200 },
    ],
    montantEstime: 32_000_000,
    validations: [
      { etape: "BUDGETAIRE", valideur: "Cheikh Diagne", date: "2025-04-11", decision: "REJETEE", commentaire: "Dépassement budgétaire — reformuler en plusieurs lots selon planning d'avancement." },
    ],
  },
];

export const mouvements: Mouvement[] = [
  { id: "m1",  date: "2025-04-18T08:30", type: "ENTREE_ACHAT",         articleId: "a1",  depotId: "d1", quantite: 3000, reference: "BON-REC-2025-001", utilisateur: "Ibrahima Sow" },
  { id: "m2",  date: "2025-04-18T09:15", type: "ENTREE_ACHAT",         articleId: "a3",  depotId: "d1", quantite:  600, reference: "BON-REC-2025-002", utilisateur: "Ibrahima Sow" },
  { id: "m3",  date: "2025-04-17T14:00", type: "SORTIE_CHANTIER",      articleId: "a1",  depotId: "d2", quantite:  600, reference: "BON-SORT-2025-001", utilisateur: "Ibrahima Sow", chantierId: "c1" },
  { id: "m4",  date: "2025-04-17T14:45", type: "SORTIE_CHANTIER",      articleId: "a3",  depotId: "d2", quantite:  180, reference: "BON-SORT-2025-002", utilisateur: "Ibrahima Sow", chantierId: "c1" },
  { id: "m5",  date: "2025-04-16T11:00", type: "SORTIE_CHANTIER",      articleId: "a1",  depotId: "d4", quantite:  800, reference: "BON-SORT-2025-004", utilisateur: "Ibrahima Sow", chantierId: "c6" },
  { id: "m6",  date: "2025-04-16T11:30", type: "SORTIE_CHANTIER",      articleId: "a10", depotId: "d4", quantite:  350, reference: "BON-SORT-2025-006", utilisateur: "Ibrahima Sow", chantierId: "c6" },
  { id: "m7",  date: "2025-04-15T16:00", type: "TRANSFERT_SORTANT",    articleId: "a6",  depotId: "d1", quantite: 2000, reference: "TR-2025-0012",      utilisateur: "Ibrahima Sow" },
  { id: "m8",  date: "2025-04-15T16:00", type: "TRANSFERT_ENTRANT",    articleId: "a6",  depotId: "d2", quantite: 2000, reference: "TR-2025-0012",      utilisateur: "Ibrahima Sow", chantierId: "c2" },
  { id: "m9",  date: "2025-04-14T10:00", type: "ENTREE_ACHAT",         articleId: "a4",  depotId: "d1", quantite:  250, reference: "BON-REC-2025-003",  utilisateur: "Ibrahima Sow" },
  { id: "m10", date: "2025-04-13T09:00", type: "RETOUR_CHANTIER",      articleId: "a9",  depotId: "d1", quantite:   12, reference: "RT-2025-0008",      utilisateur: "Ibrahima Sow", chantierId: "c5" },
  { id: "m11", date: "2025-04-12T15:30", type: "AJUSTEMENT_INVENTAIRE",articleId: "a2",  depotId: "d1", quantite:  -30, reference: "AJ-2025-0003",      utilisateur: "Ibrahima Sow" },
  { id: "m12", date: "2025-04-11T08:45", type: "SORTIE_CHANTIER",      articleId: "a14", depotId: "d1", quantite:  420, reference: "BON-SORT-2025-003", utilisateur: "Ibrahima Sow", chantierId: "c2" },
];

export const commandes: Commande[] = [
  { id: "co1", numero: "BC-2025-001", fournisseur: "SOCOCIM Industries",    date: "2025-04-05", statut: "RECUE",    montant: 24_800_000, demandeId: "dm1", lignes: 2 },
  { id: "co2", numero: "BC-2025-002", fournisseur: "Sahel Acier Distribution", date: "2025-04-09", statut: "RECUE", montant: 14_700_000, demandeId: "dm2", lignes: 2 },
  { id: "co3", numero: "BC-2025-003", fournisseur: "SOCOCIM Industries",    date: "2025-04-13", statut: "PARTIELLE",montant: 58_500_000, demandeId: "dm3", lignes: 4 },
  { id: "co4", numero: "BC-2025-004", fournisseur: "Matériaux Sénégal SARL",date: "2025-04-16", statut: "ENVOYEE", montant: 12_650_000, lignes: 3 },
  { id: "co5", numero: "BC-2025-005", fournisseur: "CIMAF Sénégal",         date: "2025-04-17", statut: "BROUILLON",montant: 8_420_000, lignes: 3 },
];

export const receptions: Reception[] = [
  { id: "r1", numero: "REC-2025-001", date: "2025-04-10", commandeNumero: "BC-2025-001", fournisseur: "SOCOCIM Industries",     conformite: "CONFORME",  depotId: "d1", receptionnaire: "Ibrahima Sow" },
  { id: "r2", numero: "REC-2025-002", date: "2025-04-18", commandeNumero: "BC-2025-002", fournisseur: "Sahel Acier Distribution",conformite: "CONFORME",  depotId: "d1", receptionnaire: "Ibrahima Sow" },
  { id: "r3", numero: "REC-2025-003", date: "2025-04-20", commandeNumero: "BC-2025-003", fournisseur: "SOCOCIM Industries",     conformite: "PARTIELLE", depotId: "d4", receptionnaire: "Ibrahima Sow" },
  { id: "r4", numero: "REC-2025-004", date: "2025-04-05", commandeNumero: "BC-2025-001", fournisseur: "SOCOCIM Industries",     conformite: "RESERVE",   depotId: "d2", receptionnaire: "Mariama Ba"   },
];

export const equipements: Equipement[] = [
  { id: "e1", code: "EQ-BETON-001",  designation: "Bétonnière 300 L — ALTRAD",         etat: "AFFECTE",        affecteA: "Amadou Diallo",   chantierId: "c1" },
  { id: "e2", code: "EQ-VIBRO-005",  designation: "Aiguille vibrante Ø50 mm — Wacker",etat: "AFFECTE",        affecteA: "Cheikh Diagne",   chantierId: "c6" },
  { id: "e3", code: "EQ-NIVO-012",   designation: "Niveau laser rotatif Leica Rugby",  etat: "DISPONIBLE"                                               },
  { id: "e4", code: "EQ-COMP-003",   designation: "Compresseur 100 L — Michelin",      etat: "EN_MAINTENANCE"                                           },
  { id: "e5", code: "EQ-PERF-008",   designation: "Perforateur Bosch GBH 5-40",        etat: "AFFECTE",        affecteA: "Fatou Ndoye",     chantierId: "c5" },
  { id: "e6", code: "EQ-ECHAF-020",  designation: "Lot échafaudage tubulaire 200 m²",  etat: "AFFECTE",        affecteA: "Mariama Ba",      chantierId: "c2" },
  { id: "e7", code: "EQ-GRPE-004",   designation: "Groupe électrogène 15 kVA — Gesan", etat: "DISPONIBLE"                                               },
  { id: "e8", code: "EQ-POMPE-002",  designation: 'Pompe à eau centrifuge 3"',          etat: "HORS_SERVICE"                                             },
];

// Helpers
export const getProjet   = (id: string) => projets.find((p) => p.id === id);
export const getChantier = (id: string) => chantiers.find((c) => c.id === id);
export const getArticle  = (id: string) => articles.find((a) => a.id === id);
export const getDepot    = (id: string) => depots.find((d) => d.id === id);
