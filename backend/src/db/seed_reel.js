/**
 * Données réelles Sénégal / Afrique de l'Ouest — pour présentation BTP Manager
 * Prix en FCFA (XOF) — contexte : entreprise de BTP sénégalaise
 *
 * Usage : node backend/src/db/seed_reel.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const { pool, withTransaction } = require('./pool');

// ─── Familles supplémentaires ──────────────────────────────────────────────
const FAMILIES_EXTRA = [
  ['BOIS',        'Bois et coffrages'],
  ['LATERITE',    'Matériaux de terrassement'],
  ['CARRELAGE',   'Carrelages et revêtements'],
  ['HYDRAULIQUE', 'Plomberie et hydraulique'],
  ['ELECTRICITE', 'Électricité courante forte'],
];

// ─── Unités supplémentaires ────────────────────────────────────────────────
const UNITS_EXTRA = [
  ['KG',  'Kilogramme'],
  ['ML',  'Mètre linéaire'],
  ['T',   'Tonne'],
  ['L',   'Litre'],
  ['M2',  'Mètre carré'],
  ['M',   'Mètre'],
  ['ROL', 'Rouleau'],
];

// ─── Articles (prix en FCFA) ───────────────────────────────────────────────
// [code, designation, famille, unite, nature, prix_moyen, seuil_min]
const ARTICLES_SN = [
  // Liants
  ['CIM-SOCOCIM',    'Ciment SOCOCIM CEM II 42.5 — sac 50 kg',        'LIANTS',       'SAC',   'STOCKABLE',    6200,   100],
  ['CIM-CIMAF',      'Ciment CIMAF 32.5 — sac 50 kg',                 'LIANTS',       'SAC',   'STOCKABLE',    5500,   100],
  ['CHAUX-HY',       'Chaux hydraulique — sac 25 kg',                  'LIANTS',       'SAC',   'STOCKABLE',    4500,    50],

  // Aciers
  ['ACI-SN-HA8',     'Acier HA Ø8 — barre 12 m',                      'ACIERS',       'BARRE', 'STOCKABLE',    7500,    50],
  ['ACI-SN-HA10',    'Acier HA Ø10 — barre 12 m',                     'ACIERS',       'BARRE', 'STOCKABLE',    9800,    50],
  ['ACI-SN-HA12',    'Acier HA Ø12 — barre 12 m',                     'ACIERS',       'BARRE', 'STOCKABLE',   12500,    40],
  ['ACI-SN-HA16',    'Acier HA Ø16 — barre 12 m',                     'ACIERS',       'BARRE', 'STOCKABLE',   21500,    30],
  ['ACI-SN-HA20',    'Acier HA Ø20 — barre 12 m',                     'ACIERS',       'BARRE', 'STOCKABLE',   34000,    20],
  ['ACI-SN-R6',      'Acier rond lisse Ø6 (étriers) — barre 6 m',     'ACIERS',       'BARRE', 'STOCKABLE',    3200,    80],

  // Maçonnerie
  ['PAR-SN-10',      'Parpaing creux 10×20×40 cm',                    'MACONNERIE',   'U',     'STOCKABLE',     350,   500],
  ['PAR-SN-15',      'Parpaing creux 15×20×40 cm',                    'MACONNERIE',   'U',     'STOCKABLE',     420,   500],
  ['BRIQUE-ROUGE',   'Brique pleine rouge 22×10.5×6.5 cm',            'MACONNERIE',   'U',     'STOCKABLE',     275,   800],
  ['HOURDIS-16',     'Hourdis béton 16 cm',                           'MACONNERIE',   'U',     'STOCKABLE',     850,   200],

  // Béton / Granulats
  ['SABLE-LAG',      'Sable lagunaire lavé — m³',                      'BETON',        'M3',    'ACHAT_DIRECT', 32000,  null],
  ['SABLE-DUNE',     'Sable de dune concassé — m³',                    'BETON',        'M3',    'ACHAT_DIRECT', 25000,  null],
  ['GRAVIER-14',     'Gravier concassé 14/25 — m³',                   'BETON',        'M3',    'ACHAT_DIRECT', 58000,  null],
  ['GRAVILLON-8',    'Gravillon 8/15 — m³',                           'BETON',        'M3',    'ACHAT_DIRECT', 52000,  null],
  ['LATERITE-M3',    'Latérite compactée tout venant — m³',           'LATERITE',     'M3',    'ACHAT_DIRECT', 15000,  null],
  ['TOUT-VENANT',    'Tout-venant routier — tonne',                   'LATERITE',     'T',     'ACHAT_DIRECT', 18000,  null],

  // EPI
  ['EPI-SN-CAS',     'Casque de chantier EN 397',                     'EPI',          'U',     'DURABLE',       3500,   20],
  ['EPI-SN-GANT',    'Gants de manutention cuir',                     'EPI',          'U',     'DURABLE',       2500,   30],
  ['EPI-SN-BOTTE',   'Bottes de sécurité S3',                         'EPI',          'U',     'DURABLE',      15000,   10],
  ['EPI-SN-VIS',     'Veste haute visibilité classe 2',               'EPI',          'U',     'DURABLE',       8500,   15],
  ['EPI-SN-LUNE',    'Lunettes de protection polycarbonate',          'EPI',          'U',     'DURABLE',       3000,   20],

  // Finitions
  ['CARREL-30',      'Carrelage sol 30×30 cm — m²',                  'CARRELAGE',    'M2',    'STOCKABLE',     8500,   50],
  ['CARREL-60',      'Carrelage sol 60×60 cm — m²',                  'CARRELAGE',    'M2',    'STOCKABLE',    18000,   30],
  ['CARREL-MURAL',   'Faïence murale 20×30 cm — m²',                 'CARRELAGE',    'M2',    'STOCKABLE',    12000,   30],
  ['PEINTURE-INT',   'Peinture intérieure blanche — bidon 20 L',     'FINITIONS',    'POT',   'STOCKABLE',    35000,    8],
  ['PEINTURE-EXT',   'Peinture façade extérieure — bidon 20 L',      'FINITIONS',    'POT',   'STOCKABLE',    48000,    5],
  ['ENDUIT-FAC',     'Enduit de façade — sac 25 kg',                 'FINITIONS',    'SAC',   'STOCKABLE',     3500,   30],

  // Bois & coffrages
  ['BOIS-COF-27',    'Bois de coffrage 27 mm — ml',                  'BOIS',         'ML',    'STOCKABLE',     2500,  100],
  ['CONTRE-PLQ',     'Contre-plaqué coffrage 18 mm — m²',            'BOIS',         'M2',    'STOCKABLE',    12000,   40],
  ['POUTRELLE-IPN',  'Poutrelle IPN 80 — ml',                        'BOIS',         'ML',    'STOCKABLE',     7500,   30],

  // Hydraulique
  ['TUBE-PVC63',     'Tube PVC Ø63 mm assainissement — ml',          'HYDRAULIQUE',  'ML',    'STOCKABLE',     3200,   50],
  ['TUBE-PVC110',    'Tube PVC Ø110 mm — ml',                        'HYDRAULIQUE',  'ML',    'STOCKABLE',     5500,   50],
  ['TUBE-GALVA-1',   'Tube galvanisé 1" — ml',                       'HYDRAULIQUE',  'ML',    'STOCKABLE',     6500,   30],
  ['ROBINET-12',     'Robinet d\'arrêt 1/2"',                        'HYDRAULIQUE',  'U',     'STOCKABLE',     8500,   10],
  ['CIMENT-COLLE',   'Colle carrelage gris — sac 25 kg',             'CARRELAGE',    'SAC',   'STOCKABLE',     4200,   20],

  // Électricité
  ['CAB-3G25',       'Câble électrique 3G2.5 — rouleau 100 m',       'ELECTRICITE',  'ROL',   'STOCKABLE',    85000,    5],
  ['CAB-3G15',       'Câble électrique 3G1.5 — rouleau 100 m',       'ELECTRICITE',  'ROL',   'STOCKABLE',    62000,    5],
  ['INTER-SIMPLE',   'Interrupteur simple allumage encastré',         'ELECTRICITE',  'U',     'STOCKABLE',     4500,   20],
  ['PRISE-2P',       'Prise de courant 2P+T encastrée',              'ELECTRICITE',  'U',     'STOCKABLE',     5800,   20],
  ['DISJONCT-25A',   'Disjoncteur 25A modulaire',                    'ELECTRICITE',  'U',     'STOCKABLE',    12500,   10],
];

// ─── Fournisseurs sénégalais ───────────────────────────────────────────────
const SUPPLIERS_SN = [
  ['SOCOCIM',    'SOCOCIM Industries Sénégal'],
  ['CIMAF-SN',   'CIMAF Sénégal'],
  ['SAHEL-ACIER','Sahel Acier Distribution SARL'],
  ['MATSEN',     'Matériaux Sénégal SARL'],
  ['CFAO-BTP',   'CFAO Matériaux Sénégal'],
  ['SOREMAS',    'Soremas — Bois & Matériaux'],
  ['SENICO',     'SENICO — Sanitaires & Électricité'],
  ['AGRITRANS',  'Agri-Trans — Granulats & Terrassement'],
  ['BTP-DEPOT',  'Dépôt BTP Dakar Distribution'],
];

// ─── Dépôts sénégalais ─────────────────────────────────────────────────────
// [code, nom, type, localisation]
const DEPOTS_SN = [
  ['MAG-DAKAR',   'Magasin Central Dakar (Parcelles Assainies)', 'MAGASIN_CENTRAL',   'Dakar — Parcelles Assainies'],
  ['DEP-THIES',   'Dépôt Chantier Thiès',                        'DEPOT_SECONDAIRE',  'Thiès — Zone Industrielle'],
  ['DEP-ZIGUI',   'Dépôt Chantier Ziguinchor',                  'DEPOT_SECONDAIRE',  'Ziguinchor — Quartier Lyndiane'],
  ['DEP-ALMAD',   'Dépôt Chantier Almadies',                    'DEPOT_CHANTIER',    'Dakar — Les Almadies'],
  ['DEP-KAOLACK', 'Dépôt Chantier Kaolack',                     'DEPOT_SECONDAIRE',  'Kaolack — Quartier Léona'],
];

// ─── Projets BTP sénégalais ────────────────────────────────────────────────
// [code, nom, client, budget_initial, budget_consomme, statut, date_debut, date_fin]
const PROJECTS_SN = [
  [
    'PRJ-SN-001',
    'Construction Lycée Technique Régional de Thiès',
    'Ministère de l\'Éducation Nationale — DGCPE',
    2_850_000_000, 1_243_500_000,
    'ACTIF', '2025-03-01', '2026-12-31',
  ],
  [
    'PRJ-SN-002',
    'Réhabilitation RN1 Dakar–Thiès (Section PK0–PK65)',
    'AGEROUTE Sénégal — Agence des Travaux Routiers',
    8_400_000_000, 3_150_000_000,
    'ACTIF', '2025-01-15', '2026-09-30',
  ],
  [
    'PRJ-SN-003',
    'Construction Centre de Santé Niveau 2 — Ziguinchor',
    'Ministère de la Santé et de l\'Action Sociale',
    1_250_000_000, 412_800_000,
    'ACTIF', '2025-06-01', '2026-11-30',
  ],
  [
    'PRJ-SN-004',
    'Complexe Résidentiel Les Almadies — Dakar',
    'SICAP SA — Société Immobilière du Cap-Vert',
    5_600_000_000, 2_890_000_000,
    'ACTIF', '2024-09-01', '2026-06-30',
  ],
  [
    'PRJ-SN-005',
    'Construction Marché Moderne de Kaolack',
    'Mairie de Kaolack',
    980_000_000, 980_000_000,
    'TERMINE', '2024-02-01', '2025-01-31',
  ],
];

// ─── Sites par projet ──────────────────────────────────────────────────────
// [project_code, site_code, nom, localisation, responsable]
const SITES_SN = [
  // Lycée Thiès
  ['PRJ-SN-001', 'SN1-001', 'Bloc Administratif & Salles de Cours',  'Thiès — Plateau',         'M. Amadou Diallo'],
  ['PRJ-SN-001', 'SN1-002', 'Ateliers Techniques & Laboratoires',    'Thiès — Plateau',         'M. Amadou Diallo'],
  ['PRJ-SN-001', 'SN1-003', 'Internat & Réfectoire',                 'Thiès — Plateau',         'Mme Mariama Ba'],

  // Route Dakar-Thiès
  ['PRJ-SN-002', 'SN2-001', 'Section PK0–PK25 (Dakar–Rufisque)',    'Dakar / Rufisque',        'M. El Hadji Ndiaye'],
  ['PRJ-SN-002', 'SN2-002', 'Section PK25–PK65 (Rufisque–Thiès)',   'Rufisque / Thiès',        'M. El Hadji Ndiaye'],

  // Centre de Santé Ziguinchor
  ['PRJ-SN-003', 'SN3-001', 'Bloc Maternité & Pédiatrie',           'Ziguinchor — Lyndiane',   'Mme Fatou Ndoye'],
  ['PRJ-SN-003', 'SN3-002', 'Bloc Urgences & Consultations',        'Ziguinchor — Lyndiane',   'Mme Fatou Ndoye'],

  // Almadies
  ['PRJ-SN-004', 'SN4-001', 'Tour A — R+8 (Logements)',             'Dakar — Les Almadies',    'M. Cheikh Diagne'],
  ['PRJ-SN-004', 'SN4-002', 'Tour B — R+8 (Logements)',             'Dakar — Les Almadies',    'M. Cheikh Diagne'],
  ['PRJ-SN-004', 'SN4-003', 'Infrastructures, VRD & Parking',       'Dakar — Les Almadies',    'M. Cheikh Diagne'],

  // Marché Kaolack
  ['PRJ-SN-005', 'SN5-001', 'Halle Centrale (Gros œuvre)',          'Kaolack — Centre',        'M. Moussa Faye'],
  ['PRJ-SN-005', 'SN5-002', 'Boutiques & Annexes',                  'Kaolack — Centre',        'M. Moussa Faye'],
];

// ─── Budget lots par projet ────────────────────────────────────────────────
// [project_code, code, libelle, montant]
const BUDGET_LOTS = [
  ['PRJ-SN-001', 'LOT-01', 'Gros œuvre',              985_000_000],
  ['PRJ-SN-001', 'LOT-02', 'Charpente & Couverture',  320_000_000],
  ['PRJ-SN-001', 'LOT-03', 'Plomberie & Sanitaires',  185_000_000],
  ['PRJ-SN-001', 'LOT-04', 'Électricité',             245_000_000],
  ['PRJ-SN-001', 'LOT-05', 'Finitions & Peintures',   410_000_000],

  ['PRJ-SN-002', 'LOT-01', 'Terrassement & Plateforme',          2_100_000_000],
  ['PRJ-SN-002', 'LOT-02', 'Chaussée & Revêtement bitumineux',   3_800_000_000],
  ['PRJ-SN-002', 'LOT-03', 'Ouvrages d\'art (ponts & dalots)',   1_650_000_000],
  ['PRJ-SN-002', 'LOT-04', 'Signalisation & Équipements',          320_000_000],

  ['PRJ-SN-003', 'LOT-01', 'Gros œuvre',              420_000_000],
  ['PRJ-SN-003', 'LOT-02', 'Menuiseries & Vitrages',   95_000_000],
  ['PRJ-SN-003', 'LOT-03', 'Plomberie & Hydraulique',  185_000_000],
  ['PRJ-SN-003', 'LOT-04', 'Électricité & Climatisation', 210_000_000],
  ['PRJ-SN-003', 'LOT-05', 'Finitions',                145_000_000],

  ['PRJ-SN-004', 'LOT-01', 'Fondations profondes',     480_000_000],
  ['PRJ-SN-004', 'LOT-02', 'Gros œuvre (Béton armé)', 1_850_000_000],
  ['PRJ-SN-004', 'LOT-03', 'Façades & Menuiseries',    620_000_000],
  ['PRJ-SN-004', 'LOT-04', 'Équipements techniques',   385_000_000],
  ['PRJ-SN-004', 'LOT-05', 'Finitions & Espaces verts', 265_000_000],
];

// ─── Utilisateurs sénégalais ───────────────────────────────────────────────
// [email, nom, role, password]
const USERS_SN = [
  ['amadou.diallo@btp-sn.com',   'Amadou Diallo',     'CHEF_PROJET',    'Amadou2025!'],
  ['fatou.ndoye@btp-sn.com',     'Fatou Ndoye',       'CONDUCTEUR',     'Fatou2025!'],
  ['ibrahima.sow@btp-sn.com',    'Ibrahima Sow',      'MAGASINIER',     'Ibrahim2025!'],
  ['aminata.diop@btp-sn.com',    'Aminata Diop',      'CONTROLEUR',     'Aminata2025!'],
  ['moussa.faye@btp-sn.com',     'Moussa Faye',       'ACHETEUR',       'Moussa2025!'],
  ['aissatou.mbaye@btp-sn.com',  'Aïssatou Mbaye',   'DEMANDEUR',      'Aissatou2025!'],
  ['elhadji.ndiaye@btp-sn.com',  'El Hadji Ndiaye',  'RESP_TECHNIQUE', 'ElHadji2025!'],
  ['mariama.ba@btp-sn.com',      'Mariama Ba',        'CONDUCTEUR',     'Mariama2025!'],
  ['cheikh.diagne@btp-sn.com',   'Cheikh Diagne',     'CHEF_PROJET',    'Cheikh2025!'],
  ['oumar.sarr@btp-sn.com',      'Oumar Sarr',        'DEMANDEUR',      'Oumar2025!'],
];

// ─── Stock initial (depot MAG-DAKAR) ──────────────────────────────────────
// [article_code, qte, seuil]
const STOCK_INITIAL = [
  ['CIM-SOCOCIM', 2400,  200],
  ['CIM-CIMAF',   1850,  150],
  ['CHAUX-HY',     320,   50],
  ['ACI-SN-HA8',   280,   60],
  ['ACI-SN-HA10',  350,   60],
  ['ACI-SN-HA12',  420,   50],
  ['ACI-SN-HA16',  185,   40],
  ['ACI-SN-HA20',   95,   20],
  ['ACI-SN-R6',    600,  100],
  ['PAR-SN-10',   8500, 1000],
  ['PAR-SN-15',   6200,  800],
  ['BRIQUE-ROUGE',12000, 1500],
  ['HOURDIS-16',  3500,  400],
  ['EPI-SN-CAS',   145,   30],
  ['EPI-SN-GANT',  280,   50],
  ['EPI-SN-BOTTE',  58,   15],
  ['EPI-SN-VIS',    92,   20],
  ['EPI-SN-LUNE',  115,   25],
  ['CARREL-30',    650,   80],
  ['CARREL-60',    420,   60],
  ['PEINTURE-INT',  85,   10],
  ['PEINTURE-EXT',  42,    8],
  ['ENDUIT-FAC',   180,   30],
  ['BOIS-COF-27',  850,  120],
  ['CONTRE-PLQ',   420,   60],
  ['TUBE-PVC63',   380,   60],
  ['TUBE-PVC110',  245,   50],
  ['CAB-3G25',      24,    5],
  ['CAB-3G15',      38,    5],
  ['CIMENT-COLLE', 120,   20],
];

// Stock dépôt Thiès
const STOCK_THIES = [
  ['CIM-SOCOCIM', 850,  100],
  ['CIM-CIMAF',   620,   80],
  ['ACI-SN-HA10', 180,   40],
  ['ACI-SN-HA12', 210,   40],
  ['ACI-SN-HA16',  80,   20],
  ['PAR-SN-15',  3200,  500],
  ['EPI-SN-CAS',   42,   15],
  ['EPI-SN-GANT',  95,   20],
];

// Stock dépôt Almadies
const STOCK_ALMAD = [
  ['CIM-SOCOCIM', 1200, 150],
  ['ACI-SN-HA12',  280,  50],
  ['ACI-SN-HA16',  140,  30],
  ['ACI-SN-HA20',   55,  15],
  ['CARREL-60',    580,  80],
  ['CARREL-MURAL', 320,  40],
  ['PEINTURE-INT',  48,   8],
  ['BOIS-COF-27',  420,  80],
];

// ─── Phases par site ───────────────────────────────────────────────────────
// [site_code, libelle, ordre]
const PHASES = [
  ['SN1-001', 'Terrassement & Fondations',  1],
  ['SN1-001', 'Élévation — Gros œuvre',     2],
  ['SN1-001', 'Toiture & Charpente',        3],
  ['SN1-001', 'Corps d\'état secondaires', 4],
  ['SN1-001', 'Finitions & Réception',      5],

  ['SN1-002', 'Terrassement & Fondations',  1],
  ['SN1-002', 'Élévation — Gros œuvre',     2],
  ['SN1-002', 'Équipements techniques',     3],
  ['SN1-002', 'Finitions',                  4],

  ['SN3-001', 'Infrastructure & Fondations', 1],
  ['SN3-001', 'Superstructure béton armé',   2],
  ['SN3-001', 'Équipements médicaux',        3],
  ['SN3-001', 'Finitions',                   4],

  ['SN4-001', 'Fondations profondes (pieux)', 1],
  ['SN4-001', 'Sous-sol R-2 à R-1',          2],
  ['SN4-001', 'Superstructure R+1 à R+4',    3],
  ['SN4-001', 'Superstructure R+5 à R+8',    4],
  ['SN4-001', 'Finitions & livraison',        5],
];

// ─── Helper ────────────────────────────────────────────────────────────────
function pad(n, len = 3) { return String(n).padStart(len, '0'); }

// ─── SEED PRINCIPAL ────────────────────────────────────────────────────────
(async () => {
  try {
    await withTransaction(async (c) => {

      // 1. Familles & unités supplémentaires ───────────────────────────────
      console.log('[seed-sn] Familles supplémentaires…');
      const famIds = {};
      for (const [code, lib] of FAMILIES_EXTRA) {
        const r = await c.query(
          `INSERT INTO article_families(code, libelle) VALUES ($1,$2)
           ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle RETURNING id`,
          [code, lib],
        );
        famIds[code] = r.rows[0].id;
      }
      // récupérer les familles déjà existantes
      const existFam = await c.query(`SELECT code, id FROM article_families`);
      for (const row of existFam.rows) famIds[row.code] = row.id;

      const unitIds = {};
      for (const [code, lib] of UNITS_EXTRA) {
        const r = await c.query(
          `INSERT INTO units(code, libelle) VALUES ($1,$2)
           ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle RETURNING id`,
          [code, lib],
        );
        unitIds[code] = r.rows[0].id;
      }
      const existUnit = await c.query(`SELECT code, id FROM units`);
      for (const row of existUnit.rows) unitIds[row.code] = row.id;

      // 2. Articles ─────────────────────────────────────────────────────────
      console.log('[seed-sn] Articles…');
      const articleIds = {};
      for (const [code, des, fam, unit, nat, prix, seuil] of ARTICLES_SN) {
        const r = await c.query(
          `INSERT INTO articles(code, designation, famille_id, unite_id, nature, prix_moyen, seuil_min)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (code) DO UPDATE
             SET designation = EXCLUDED.designation,
                 prix_moyen  = EXCLUDED.prix_moyen,
                 seuil_min   = EXCLUDED.seuil_min
           RETURNING id`,
          [code, des, famIds[fam], unitIds[unit], nat, prix, seuil],
        );
        articleIds[code] = r.rows[0].id;
      }

      // 3. Fournisseurs ─────────────────────────────────────────────────────
      console.log('[seed-sn] Fournisseurs…');
      for (const [code, raison] of SUPPLIERS_SN) {
        await c.query(
          `INSERT INTO suppliers(code, raison_sociale) VALUES ($1,$2)
           ON CONFLICT (code) DO UPDATE SET raison_sociale = EXCLUDED.raison_sociale`,
          [code, raison],
        );
      }

      // 4. Dépôts ───────────────────────────────────────────────────────────
      console.log('[seed-sn] Dépôts…');
      const depotIds = {};
      for (const [code, nom, type, loc] of DEPOTS_SN) {
        const r = await c.query(
          `INSERT INTO depots(code, nom, type_depot, localisation) VALUES ($1,$2,$3,$4)
           ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom RETURNING id`,
          [code, nom, type, loc],
        );
        depotIds[code] = r.rows[0].id;
      }

      // 5. Projets & sites & phases & lots ──────────────────────────────────
      console.log('[seed-sn] Projets…');
      const projectIds = {};
      for (const [code, nom, client, bi, bc, st, dd, df] of PROJECTS_SN) {
        const r = await c.query(
          `INSERT INTO projects(code, nom, client, budget_initial, budget_consomme, statut, date_debut, date_fin)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (code) DO UPDATE
             SET nom = EXCLUDED.nom, budget_consomme = EXCLUDED.budget_consomme, statut = EXCLUDED.statut
           RETURNING id`,
          [code, nom, client, bi, bc, st, dd, df],
        );
        projectIds[code] = r.rows[0].id;
      }

      console.log('[seed-sn] Sites…');
      const siteIds = {};
      for (const [pCode, sCode, nom, loc, resp] of SITES_SN) {
        const r = await c.query(
          `INSERT INTO sites(project_id, code, nom, localisation, responsable)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (project_id, code) DO UPDATE SET nom = EXCLUDED.nom, responsable = EXCLUDED.responsable
           RETURNING id`,
          [projectIds[pCode], sCode, nom, loc, resp],
        );
        siteIds[sCode] = r.rows[0].id;
      }

      console.log('[seed-sn] Phases…');
      const phaseIds = {};
      for (const [sCode, lib, ord] of PHASES) {
        if (!siteIds[sCode]) continue;
        const r = await c.query(
          `INSERT INTO phases(site_id, libelle, ordre) VALUES ($1,$2,$3)
           ON CONFLICT DO NOTHING RETURNING id`,
          [siteIds[sCode], lib, ord],
        );
        if (r.rows.length > 0) {
          phaseIds[`${sCode}-${ord}`] = r.rows[0].id;
        } else {
          const ex = await c.query(
            `SELECT id FROM phases WHERE site_id=$1 AND libelle=$2`, [siteIds[sCode], lib]);
          if (ex.rows.length) phaseIds[`${sCode}-${ord}`] = ex.rows[0].id;
        }
      }

      console.log('[seed-sn] Budget lots…');
      const lotIds = {};
      for (const [pCode, code, lib, mnt] of BUDGET_LOTS) {
        const r = await c.query(
          `INSERT INTO budget_lots(project_id, code, libelle, montant_prevu) VALUES ($1,$2,$3,$4)
           ON CONFLICT (project_id, code) DO UPDATE SET montant_prevu = EXCLUDED.montant_prevu
           RETURNING id`,
          [projectIds[pCode], code, lib, mnt],
        );
        lotIds[`${pCode}-${code}`] = r.rows[0].id;
      }

      // 6. Utilisateurs sénégalais ───────────────────────────────────────────
      console.log('[seed-sn] Utilisateurs…');
      const roleRows = await c.query(`SELECT code, id FROM roles`);
      const roleIds = {};
      for (const row of roleRows.rows) roleIds[row.code] = row.id;

      const userIds = {};
      for (const [email, nom, roleCode, pwd] of USERS_SN) {
        const hash = await bcrypt.hash(pwd, 10);
        const r = await c.query(
          `INSERT INTO users(email, nom, password_hash, actif) VALUES ($1,$2,$3,true)
           ON CONFLICT (email) DO UPDATE SET nom = EXCLUDED.nom, password_hash = EXCLUDED.password_hash
           RETURNING id`,
          [email, nom, hash],
        );
        const uid = r.rows[0].id;
        userIds[email] = uid;
        await c.query(
          `INSERT INTO user_roles(user_id, role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [uid, roleIds[roleCode]],
        );
      }

      // 7. Stock ──────────────────────────────────────────────────────────────
      console.log('[seed-sn] Stock initial (Dakar)…');
      for (const [aCode, qte, seuil] of STOCK_INITIAL) {
        if (!articleIds[aCode]) continue;
        await c.query(
          `INSERT INTO stock_balances(article_id, depot_id, qte_disponible, seuil_alerte)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (article_id, depot_id) DO UPDATE
             SET qte_disponible = EXCLUDED.qte_disponible, seuil_alerte = EXCLUDED.seuil_alerte`,
          [articleIds[aCode], depotIds['MAG-DAKAR'], qte, seuil],
        );
      }

      console.log('[seed-sn] Stock Thiès…');
      for (const [aCode, qte, seuil] of STOCK_THIES) {
        if (!articleIds[aCode]) continue;
        await c.query(
          `INSERT INTO stock_balances(article_id, depot_id, qte_disponible, seuil_alerte)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (article_id, depot_id) DO UPDATE
             SET qte_disponible = EXCLUDED.qte_disponible`,
          [articleIds[aCode], depotIds['DEP-THIES'], qte, seuil],
        );
      }

      console.log('[seed-sn] Stock Almadies…');
      for (const [aCode, qte, seuil] of STOCK_ALMAD) {
        if (!articleIds[aCode]) continue;
        await c.query(
          `INSERT INTO stock_balances(article_id, depot_id, qte_disponible, seuil_alerte)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (article_id, depot_id) DO UPDATE
             SET qte_disponible = EXCLUDED.qte_disponible`,
          [articleIds[aCode], depotIds['DEP-ALMAD'], qte, seuil],
        );
      }

      // 8. Mouvements de stock réalistes ─────────────────────────────────────
      console.log('[seed-sn] Mouvements de stock…');
      const adminUser = await c.query(`SELECT id FROM users WHERE email='admin@btp.local'`);
      const adminId = adminUser.rows[0]?.id || userIds['amadou.diallo@btp-sn.com'];

      const mouvements = [
        // Entrées — réceptions fournisseurs (Dakar)
        ['ENTREE', 'CIM-SOCOCIM', 'MAG-DAKAR',  3000, 'BON-REC-2025-001'],
        ['ENTREE', 'ACI-SN-HA12', 'MAG-DAKAR',   600, 'BON-REC-2025-002'],
        ['ENTREE', 'ACI-SN-HA16', 'MAG-DAKAR',   250, 'BON-REC-2025-003'],
        ['ENTREE', 'PAR-SN-15',   'MAG-DAKAR', 10000, 'BON-REC-2025-004'],
        ['ENTREE', 'EPI-SN-CAS',  'MAG-DAKAR',   200, 'BON-REC-2025-005'],
        // Sorties — affectations chantier (Lycée Thiès)
        ['SORTIE', 'CIM-SOCOCIM', 'DEP-THIES',   600, 'BON-SORT-2025-001'],
        ['SORTIE', 'ACI-SN-HA12', 'DEP-THIES',   180, 'BON-SORT-2025-002'],
        ['SORTIE', 'PAR-SN-15',   'DEP-THIES',  2800, 'BON-SORT-2025-003'],
        // Sorties — Almadies
        ['SORTIE', 'CIM-SOCOCIM', 'DEP-ALMAD',   800, 'BON-SORT-2025-004'],
        ['SORTIE', 'ACI-SN-HA20', 'DEP-ALMAD',   100, 'BON-SORT-2025-005'],
        ['SORTIE', 'CARREL-60',   'DEP-ALMAD',   350, 'BON-SORT-2025-006'],
        // Entrées dépôt Thiès
        ['ENTREE', 'CIM-CIMAF',   'DEP-THIES',  1200, 'BON-REC-2025-006'],
        ['ENTREE', 'BRIQUE-ROUGE','DEP-THIES',  8000, 'BON-REC-2025-007'],
      ];

      for (const [type, aCode, dCode, qte, ref] of mouvements) {
        if (!articleIds[aCode] || !depotIds[dCode]) continue;
        await c.query(
          `INSERT INTO stock_movements(type_mouvement, article_id, depot_id, quantite, reference_doc, user_id)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [type, articleIds[aCode], depotIds[dCode], qte, ref, adminId],
        );
      }

      // 9. Demandes de matériaux (workflow complet) ──────────────────────────
      console.log('[seed-sn] Demandes & workflow…');

      const demandes = [
        // [numero, statut, urgence, project_code, site_code, motif, montant_estime, lignes]
        {
          numero: 'DM-2025-001',
          statut: 'APPROUVEE',
          urgence: 'NORMALE',
          proj: 'PRJ-SN-001', site: 'SN1-001', lot: 'LOT-01',
          motif: 'Approvisionnement ciment pour fondations bâtiment administratif',
          montant: 24_800_000,
          requester: 'fatou.ndoye@btp-sn.com',
          lignes: [
            { code: 'CIM-SOCOCIM', qte: 2000, qte_app: 2000 },
            { code: 'ACI-SN-HA12', qte: 150,  qte_app: 150  },
          ],
        },
        {
          numero: 'DM-2025-002',
          statut: 'APPROUVEE',
          urgence: 'URGENTE',
          proj: 'PRJ-SN-001', site: 'SN1-002', lot: 'LOT-01',
          motif: 'Aciers HA pour dalle ateliers — planning impératif',
          montant: 14_700_000,
          requester: 'fatou.ndoye@btp-sn.com',
          lignes: [
            { code: 'ACI-SN-HA16', qte: 200, qte_app: 200 },
            { code: 'ACI-SN-HA20', qte: 80,  qte_app: 80  },
            { code: 'ACI-SN-R6',   qte: 300, qte_app: 280 },
          ],
        },
        {
          numero: 'DM-2025-003',
          statut: 'APPROUVEE',
          urgence: 'NORMALE',
          proj: 'PRJ-SN-004', site: 'SN4-001', lot: 'LOT-02',
          motif: 'Béton armé élévation R+1 à R+4 Tour A',
          montant: 58_500_000,
          requester: 'cheikh.diagne@btp-sn.com',
          lignes: [
            { code: 'CIM-SOCOCIM', qte: 4000, qte_app: 4000 },
            { code: 'ACI-SN-HA12', qte: 500,  qte_app: 500  },
            { code: 'ACI-SN-HA16', qte: 350,  qte_app: 350  },
            { code: 'BOIS-COF-27', qte: 800,  qte_app: 800  },
          ],
        },
        {
          numero: 'DM-2025-004',
          statut: 'VALIDATION_BUDGETAIRE',
          urgence: 'NORMALE',
          proj: 'PRJ-SN-001', site: 'SN1-003', lot: 'LOT-05',
          motif: 'Carrelage et finitions internat — réception programmée en décembre',
          montant: 12_650_000,
          requester: 'mariama.ba@btp-sn.com',
          lignes: [
            { code: 'CARREL-30',    qte: 420, qte_app: null },
            { code: 'CARREL-MURAL', qte: 180, qte_app: null },
            { code: 'CIMENT-COLLE', qte: 80,  qte_app: null },
            { code: 'PEINTURE-INT', qte: 24,  qte_app: null },
          ],
        },
        {
          numero: 'DM-2025-005',
          statut: 'VALIDATION_BUDGETAIRE',
          urgence: 'URGENTE',
          proj: 'PRJ-SN-003', site: 'SN3-001', lot: 'LOT-01',
          motif: 'Parpaings et ciment — murs porteurs bloc maternité',
          montant: 8_420_000,
          requester: 'fatou.ndoye@btp-sn.com',
          lignes: [
            { code: 'PAR-SN-15',   qte: 6000, qte_app: null },
            { code: 'CIM-CIMAF',   qte: 400,  qte_app: null },
            { code: 'CHAUX-HY',    qte: 80,   qte_app: null },
          ],
        },
        {
          numero: 'DM-2025-006',
          statut: 'SOUMISE',
          urgence: 'NORMALE',
          proj: 'PRJ-SN-004', site: 'SN4-002', lot: 'LOT-05',
          motif: 'Finitions peinture Tour B — livraison prévue mars 2026',
          montant: 6_800_000,
          requester: 'oumar.sarr@btp-sn.com',
          lignes: [
            { code: 'PEINTURE-INT', qte: 85, qte_app: null },
            { code: 'PEINTURE-EXT', qte: 28, qte_app: null },
            { code: 'ENDUIT-FAC',   qte: 120, qte_app: null },
          ],
        },
        {
          numero: 'DM-2025-007',
          statut: 'SOUMISE',
          urgence: 'NORMALE',
          proj: 'PRJ-SN-001', site: 'SN1-001', lot: 'LOT-04',
          motif: 'Câblage électricité bâtiment administratif',
          montant: 4_150_000,
          requester: 'aissatou.mbaye@btp-sn.com',
          lignes: [
            { code: 'CAB-3G25',     qte: 15, qte_app: null },
            { code: 'CAB-3G15',     qte: 22, qte_app: null },
            { code: 'DISJONCT-25A', qte: 30, qte_app: null },
            { code: 'PRISE-2P',     qte: 80, qte_app: null },
          ],
        },
        {
          numero: 'DM-2025-008',
          statut: 'SOUMISE',
          urgence: 'HAUTE',
          proj: 'PRJ-SN-003', site: 'SN3-002', lot: 'LOT-03',
          motif: 'Plomberie réseau eau courante bloc urgences',
          montant: 5_500_000,
          requester: 'oumar.sarr@btp-sn.com',
          lignes: [
            { code: 'TUBE-PVC110', qte: 200, qte_app: null },
            { code: 'TUBE-PVC63',  qte: 150, qte_app: null },
            { code: 'ROBINET-12',  qte: 40,  qte_app: null },
          ],
        },
        {
          numero: 'DM-2025-009',
          statut: 'BROUILLON',
          urgence: 'NORMALE',
          proj: 'PRJ-SN-004', site: 'SN4-003', lot: 'LOT-01',
          motif: 'EPI chantier — renouvellement dotation annuelle',
          montant: 1_850_000,
          requester: 'aissatou.mbaye@btp-sn.com',
          lignes: [
            { code: 'EPI-SN-CAS',  qte: 50, qte_app: null },
            { code: 'EPI-SN-GANT', qte: 100, qte_app: null },
            { code: 'EPI-SN-VIS',  qte: 50, qte_app: null },
            { code: 'EPI-SN-LUNE', qte: 50, qte_app: null },
          ],
        },
        {
          numero: 'DM-2025-010',
          statut: 'REJETEE',
          urgence: 'URGENTE',
          proj: 'PRJ-SN-002', site: 'SN2-001', lot: 'LOT-02',
          motif: 'Gravier hors budget — demande reformulée nécessaire',
          montant: 29_000_000,
          requester: 'oumar.sarr@btp-sn.com',
          lignes: [
            { code: 'GRAVIER-14',  qte: 500, qte_app: null },
            { code: 'LATERITE-M3', qte: 200, qte_app: null },
          ],
        },
      ];

      const requesterUid = {};
      for (const [email] of USERS_SN) {
        if (userIds[email]) requesterUid[email] = userIds[email];
      }

      for (const dm of demandes) {
        const pid = projectIds[dm.proj];
        const sid = siteIds[dm.site];
        const lid = lotIds[`${dm.proj}-${dm.lot}`] || null;
        if (!pid || !sid) continue;

        const rUid = requesterUid[dm.requester] || adminId;
        const dateS = new Date(Date.now() - Math.random() * 60 * 24 * 3600 * 1000).toISOString();

        const rq = await c.query(
          `INSERT INTO requests(numero, requester_id, project_id, site_id, budget_lot_id, statut, urgence, motif, montant_estime, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (numero) DO NOTHING RETURNING id`,
          [dm.numero, rUid, pid, sid, lid, dm.statut, dm.urgence, dm.motif, dm.montant, dateS],
        );
        if (!rq.rows.length) continue;
        const reqId = rq.rows[0].id;

        for (const lg of dm.lignes) {
          await c.query(
            `INSERT INTO request_lines(request_id, article_id, qte_demandee, qte_approuvee)
             VALUES ($1,$2,$3,$4)`,
            [reqId, articleIds[lg.code], lg.qte, lg.qte_app],
          );
        }

        // Approbations selon statut
        const respTech = userIds['elhadji.ndiaye@btp-sn.com'];
        const chef     = userIds['amadou.diallo@btp-sn.com'];

        if (['VALIDATION_BUDGETAIRE', 'APPROUVEE'].includes(dm.statut)) {
          await c.query(
            `INSERT INTO approvals(request_id, etape, decideur_id, decision, commentaire)
             VALUES ($1,'VALIDATION_TECH',$2,'APPROVE',$3)`,
            [reqId, respTech, 'Validation technique — matériaux conformes aux spécifications'],
          );
        }
        if (dm.statut === 'APPROUVEE') {
          await c.query(
            `INSERT INTO approvals(request_id, etape, decideur_id, decision, commentaire)
             VALUES ($1,'VALIDATION_BUDGET',$2,'APPROVE',$3)`,
            [reqId, chef, 'Budget disponible — lot approuvé'],
          );
        }
        if (dm.statut === 'REJETEE') {
          await c.query(
            `INSERT INTO approvals(request_id, etape, decideur_id, decision, commentaire)
             VALUES ($1,'VALIDATION_BUDGET',$2,'REJECT',$3)`,
            [reqId, chef, 'Dépassement budgétaire — reformuler la demande en plusieurs lots'],
          );
        }
      }

      // 10. Bons de commande (purchase_orders) ───────────────────────────────
      console.log('[seed-sn] Bons de commande…');
      const supplierRows = await c.query(`SELECT code, id FROM suppliers`);
      const supplierIds = {};
      for (const r of supplierRows.rows) supplierIds[r.code] = r.id;

      const purchOrders = [
        ['BC-2025-001', 'SOCOCIM',    'LIVRE',  24_800_000, 'DM-2025-001'],
        ['BC-2025-002', 'SAHEL-ACIER','LIVRE',  14_700_000, 'DM-2025-002'],
        ['BC-2025-003', 'SOCOCIM',    'LIVRE',  58_500_000, 'DM-2025-003'],
        ['BC-2025-004', 'MATSEN',     'EN_COURS', 12_650_000, null],
        ['BC-2025-005', 'CIMAF-SN',   'EN_COURS',  8_420_000, null],
      ];

      const reqNumToId = {};
      const reqRows = await c.query(`SELECT id, numero FROM requests`);
      for (const r of reqRows.rows) reqNumToId[r.numero] = r.id;

      for (const [num, supCode, stat, mnt, reqNum] of purchOrders) {
        const supId = supplierIds[supCode];
        if (!supId) continue;
        const reqId = reqNum ? reqNumToId[reqNum] : null;
        await c.query(
          `INSERT INTO purchase_orders(numero, supplier_id, statut, montant_total, request_id)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (numero) DO NOTHING`,
          [num, supId, stat, mnt, reqId],
        );
      }

      // 11. Réceptions ────────────────────────────────────────────────────────
      console.log('[seed-sn] Réceptions…');
      const poRows = await c.query(`SELECT numero, id FROM purchase_orders`);
      const poIds  = {};
      for (const r of poRows.rows) poIds[r.numero] = r.id;

      const receptions = [
        ['REC-2025-001', 'BC-2025-001', '2025-04-10', 'MAG-DAKAR',  'CONFORME'],
        ['REC-2025-002', 'BC-2025-002', '2025-04-18', 'MAG-DAKAR',  'CONFORME'],
        ['REC-2025-003', 'BC-2025-003', '2025-05-05', 'DEP-ALMAD',  'CONFORME'],
        ['REC-2025-004', 'BC-2025-003', '2025-05-20', 'DEP-ALMAD',  'PARTIELLE'],
      ];

      for (const [num, poNum, date, depCode, conf] of receptions) {
        const poId  = poIds[poNum];
        const dId   = depotIds[depCode];
        if (!poId || !dId) continue;
        await c.query(
          `INSERT INTO receipts(numero, purchase_order_id, date_reception, depot_id, conformite)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT (numero) DO NOTHING`,
          [num, poId, date, dId, conf],
        );
      }

      // 12. Audit logs ───────────────────────────────────────────────────────
      console.log('[seed-sn] Audit logs…');
      const auditEntries = [
        { actor: 'amadou.diallo@btp-sn.com',  action: 'LOGIN',    entity_type: 'Session',    reference: null,          detail: 'Connexion réussie',                                ip: '192.168.1.10' },
        { actor: 'fatou.ndoye@btp-sn.com',    action: 'CREATE',   entity_type: 'Demande',    reference: 'DM-2025-001', detail: 'Création demande approvisionnement ciment fondations', ip: '192.168.1.12' },
        { actor: 'elhadji.ndiaye@btp-sn.com', action: 'VALIDATE', entity_type: 'Demande',    reference: 'DM-2025-001', detail: 'Validation technique — matériaux conformes',         ip: '192.168.1.15' },
        { actor: 'amadou.diallo@btp-sn.com',  action: 'VALIDATE', entity_type: 'Demande',    reference: 'DM-2025-001', detail: 'Validation budgétaire — budget disponible',          ip: '192.168.1.10' },
        { actor: 'cheikh.diagne@btp-sn.com',  action: 'CREATE',   entity_type: 'Demande',    reference: 'DM-2025-003', detail: 'Création demande béton armé Tour A',                 ip: '192.168.1.22' },
        { actor: 'moussa.faye@btp-sn.com',    action: 'CREATE',   entity_type: 'Commande',   reference: 'BC-2025-001', detail: 'Émission BC SOCOCIM 24 800 000 FCFA',                ip: '192.168.1.18' },
        { actor: 'ibrahima.sow@btp-sn.com',   action: 'CREATE',   entity_type: 'Réception',  reference: 'REC-2025-001', detail: 'Réception conforme BC-2025-001',                   ip: '192.168.1.11' },
        { actor: 'ibrahima.sow@btp-sn.com',   action: 'CREATE',   entity_type: 'Mouvement',  reference: 'BON-REC-2025-001', detail: 'Entrée stock 3000 sacs ciment SOCOCIM',        ip: '192.168.1.11' },
        { actor: 'ibrahima.sow@btp-sn.com',   action: 'CREATE',   entity_type: 'Mouvement',  reference: 'BON-SORT-2025-001', detail: 'Sortie 600 sacs ciment — chantier Thiès',      ip: '192.168.1.11' },
        { actor: 'amadou.diallo@btp-sn.com',  action: 'REJECT',   entity_type: 'Demande',    reference: 'DM-2025-010', detail: 'Rejet — dépassement budgétaire ligne gravier',      ip: '192.168.1.10' },
        { actor: 'moussa.faye@btp-sn.com',    action: 'CREATE',   entity_type: 'Commande',   reference: 'BC-2025-003', detail: 'Émission BC SOCOCIM 58 500 000 FCFA — Tour A',      ip: '192.168.1.18' },
        { actor: 'aminata.diop@btp-sn.com',   action: 'EXPORT',   entity_type: 'Reporting',  reference: 'Engagement-Q2', detail: 'Export rapport trimestriel engagement budgétaire', ip: '192.168.1.25' },
      ];

      for (const e of auditEntries) {
        const uid = userIds[e.actor] || adminId;
        await c.query(
          `INSERT INTO audit_logs(actor_id, action, entity_type, reference, detail, ip)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [uid, e.action, e.entity_type, e.reference, e.detail, e.ip],
        );
      }

      // 13. Notifications ────────────────────────────────────────────────────
      console.log('[seed-sn] Notifications…');
      // broadcast (user_id = null) visible par tous
      const notifsBroadcast = [
        { type: 'STOCK',      titre: 'Seuil d\'alerte atteint',        message: 'Ciment CIM-SOCOCIM — Stock Thiès : 850 sacs (seuil 1 000)',              urgence: 'WARNING' },
        { type: 'STOCK',      titre: 'Stock critique',                   message: 'Acier HA Ø16 — Dépôt Almadies : 140 barres (seuil 180)',                 urgence: 'CRITICAL' },
        { type: 'VALIDATION', titre: 'Demande à valider',                message: 'DM-2025-005 (Centre de Santé Ziguinchor) en attente de validation tech', urgence: 'WARNING' },
        { type: 'VALIDATION', titre: 'Demande à valider',                message: 'DM-2025-006 (Tour B Almadies) soumise pour approbation budgétaire',       urgence: 'WARNING' },
        { type: 'RECEPTION',  titre: 'Réception conforme confirmée',     message: 'REC-2025-003 — BC-2025-003 SOCOCIM — Dépôt Almadies',                   urgence: 'INFO' },
        { type: 'DEMANDE',    titre: 'Demande approuvée',                message: 'DM-2025-001 approuvée — passage en commande',                            urgence: 'INFO' },
        { type: 'TRANSFERT',  titre: 'Transfert initié',                 message: 'TR en cours : Magasin Dakar → Dépôt Thiès — 1 200 sacs ciment',         urgence: 'INFO' },
      ];

      for (const n of notifsBroadcast) {
        await c.query(
          `INSERT INTO notifications(user_id, type, titre, message, urgence) VALUES (NULL,$1,$2,$3,$4)`,
          [n.type, n.titre, n.message, n.urgence],
        );
      }

      // 14. Équipements ──────────────────────────────────────────────────────
      console.log('[seed-sn] Équipements…');
      // [code_inventaire, designation, etat]
      const EQUIPEMENTS_SN = [
        ['EQ-BETON-001', 'Bétonnière 300 L — ALTRAD B300',            'AFFECTE'],
        ['EQ-BETON-002', 'Bétonnière 350 L — ALTRAD B350',            'DISPONIBLE'],
        ['EQ-VIBRO-001', 'Aiguille vibrante 45 mm — PERLES',           'AFFECTE'],
        ['EQ-VIBRO-002', 'Aiguille vibrante 60 mm — WACKER',           'DISPONIBLE'],
        ['EQ-PERF-001',  'Perforateur Hilti TE 60-ATC',               'AFFECTE'],
        ['EQ-PERF-002',  'Perforateur Bosch GBH 8-45 D',              'DISPONIBLE'],
        ['EQ-POMPE-001', 'Pompe à eau thermique 3\\" — HONDA WB30',    'AFFECTE'],
        ['EQ-POMPE-002', 'Pompe à eau thermique 2\\" — HONDA WB20',    'EN_MAINTENANCE'],
        ['EQ-GENE-001',  'Groupe électrogène 10 kVA — SDMO J10',      'DISPONIBLE'],
        ['EQ-GENE-002',  'Groupe électrogène 20 kVA — SDMO J20',      'AFFECTE'],
        ['EQ-GRNI-001',  'Grue à tour 30 m — LIEBHERR 40K',           'AFFECTE'],
        ['EQ-COMP-001',  'Compresseur 100 L — LACME FOCUS 3 CV',      'DISPONIBLE'],
        ['EQ-COMP-002',  'Compresseur 200 L — ABAC FORMULA 3',        'HORS_SERVICE'],
        ['EQ-NIVEL-001', 'Niveau laser rotatif — LEICA RUGBY 640G',   'DISPONIBLE'],
        ['EQ-NIVEL-002', 'Niveau laser rotatif — HILTI PR 30-HVS A12','AFFECTE'],
        ['EQ-SCALE-001', 'Benne pesée 500 kg — KERN IXS 500K-1',      'DISPONIBLE'],
        ['EQ-CAMN-001',  'Camion-benne 10T — MERCEDES ACTROS',        'AFFECTE'],
        ['EQ-PICK-001',  'Pick-up double cabine — TOYOTA HILUX',      'AFFECTE'],
        ['EQ-PICK-002',  'Pick-up simple cabine — NISSAN NAVARA',     'DISPONIBLE'],
        ['EQ-LIFT-001',  'Chariot élévateur 2,5T — TOYOTA 8FBN25',   'EN_MAINTENANCE'],
      ];

      for (const [code, des, etat] of EQUIPEMENTS_SN) {
        await c.query(
          `INSERT INTO equipments(code_inventaire, designation, etat)
           VALUES ($1, $2, $3)
           ON CONFLICT (code_inventaire) DO UPDATE SET designation = EXCLUDED.designation, etat = EXCLUDED.etat`,
          [code, des, etat],
        );
      }

      // Affecter quelques équipements à des sites
      const eq1 = await c.query(`SELECT id FROM equipments WHERE code_inventaire='EQ-BETON-001'`);
      const eq3 = await c.query(`SELECT id FROM equipments WHERE code_inventaire='EQ-VIBRO-001'`);
      const eq7 = await c.query(`SELECT id FROM equipments WHERE code_inventaire='EQ-POMPE-001'`);
      const eq11= await c.query(`SELECT id FROM equipments WHERE code_inventaire='EQ-GRNI-001'`);
      const eq15= await c.query(`SELECT id FROM equipments WHERE code_inventaire='EQ-NIVEL-002'`);
      const chef = userIds['amadou.diallo@btp-sn.com'];

      const affectations = [
        [eq1.rows[0]?.id,  siteIds['SN1-001'], chef],
        [eq3.rows[0]?.id,  siteIds['SN4-001'], userIds['cheikh.diagne@btp-sn.com']],
        [eq7.rows[0]?.id,  siteIds['SN3-001'], userIds['fatou.ndoye@btp-sn.com']],
        [eq11.rows[0]?.id, siteIds['SN4-001'], userIds['cheikh.diagne@btp-sn.com']],
        [eq15.rows[0]?.id, siteIds['SN1-001'], chef],
      ];

      for (const [eId, sId, uId] of affectations) {
        if (!eId || !sId || !uId) continue;
        await c.query(
          `INSERT INTO equipment_assignments(equipment_id, site_id, user_id, date_debut)
           VALUES ($1,$2,$3, CURRENT_DATE)
           ON CONFLICT DO NOTHING`,
          [eId, sId, uId],
        );
      }

    }); // fin transaction

    console.log('\n[seed-sn] ✓ Données réelles Sénégal insérées avec succès.');
    console.log('\n  Comptes disponibles :');
    console.log('  ───────────────────────────────────────────────────────');
    console.log('  admin@btp.local              / Admin123!      (ADMIN)');
    console.log('  amadou.diallo@btp-sn.com     / Amadou2025!    (CHEF_PROJET)');
    console.log('  fatou.ndoye@btp-sn.com       / Fatou2025!     (CONDUCTEUR)');
    console.log('  ibrahima.sow@btp-sn.com      / Ibrahim2025!   (MAGASINIER)');
    console.log('  aminata.diop@btp-sn.com      / Aminata2025!   (CONTROLEUR)');
    console.log('  moussa.faye@btp-sn.com       / Moussa2025!    (ACHETEUR)');
    console.log('  elhadji.ndiaye@btp-sn.com    / ElHadji2025!   (RESP_TECHNIQUE)');
    console.log('  ───────────────────────────────────────────────────────');
    console.log('\n  Projets :');
    console.log('  PRJ-SN-001 — Lycée Technique de Thiès          (2,85 Mds FCFA)');
    console.log('  PRJ-SN-002 — Route RN1 Dakar–Thiès             (8,40 Mds FCFA)');
    console.log('  PRJ-SN-003 — Centre de Santé Ziguinchor        (1,25 Mds FCFA)');
    console.log('  PRJ-SN-004 — Complexe Résidentiel Almadies     (5,60 Mds FCFA)');
    console.log('  PRJ-SN-005 — Marché Moderne de Kaolack [TERMINÉ]\n');

  } catch (err) {
    console.error('[seed-sn] ✗', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
