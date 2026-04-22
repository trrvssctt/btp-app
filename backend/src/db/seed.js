const bcrypt = require('bcrypt');
const { pool, withTransaction } = require('./pool');

const ROLES = [
  ['ADMIN',           'Administrateur'],
  ['CHEF_PROJET',     'Chef de projet'],
  ['CONDUCTEUR',      'Conducteur de travaux'],
  ['MAGASINIER',      'Magasinier'],
  ['ACHETEUR',        'Acheteur'],
  ['CONTROLEUR',      'Contrôleur de gestion'],
  ['RESP_TECHNIQUE',  'Responsable technique'],
  ['DEMANDEUR',       'Demandeur'],
  ['RESP_LOGISTIQUE', 'Responsable logistique'],
  ['DG',              'Directeur Général'],
  ['DAF',             'Directeur Administratif et Financier'],
  ['AUDITEUR',        'Auditeur interne'],
  ['CHEF_CHANTIER',   'Chef de chantier'],
];

const PERMISSIONS = [
  ['REQUEST_CREATE', 'Créer une demande'],
  ['REQUEST_VALIDATE_TECH', 'Validation technique'],
  ['REQUEST_VALIDATE_BUDGET', 'Validation budgétaire'],
  ['STOCK_WRITE', 'Modifier le stock'],
  ['PURCHASE_WRITE', 'Émettre une commande'],
  ['PROJECT_WRITE', 'Gérer projets et chantiers'],
  ['ARTICLE_WRITE', 'Gérer le référentiel articles'],
  ['ADMIN_ALL', 'Accès administrateur complet'],
];

const ROLE_PERMS = {
  ADMIN: PERMISSIONS.map(([c]) => c),
  CHEF_PROJET: ['REQUEST_VALIDATE_BUDGET', 'PROJECT_WRITE'],
  CONDUCTEUR: ['REQUEST_CREATE'],
  MAGASINIER: ['STOCK_WRITE', 'ARTICLE_WRITE'],
  ACHETEUR: ['PURCHASE_WRITE'],
  CONTROLEUR: ['REQUEST_VALIDATE_BUDGET'],
  RESP_TECHNIQUE: ['REQUEST_VALIDATE_TECH'],
  DEMANDEUR: ['REQUEST_CREATE'],
};

const FAMILIES = [
  ['LIANTS', 'Liants'],
  ['ACIERS', 'Aciers'],
  ['MACONNERIE', 'Maçonnerie'],
  ['BETON', 'Béton'],
  ['EPI', 'EPI'],
  ['FINITIONS', 'Finitions'],
];

const UNITS = [
  ['SAC', 'Sac'],
  ['BARRE', 'Barre'],
  ['U', 'Unité'],
  ['M3', 'Mètre cube'],
  ['JOUR', 'Jour'],
  ['POT', 'Pot'],
];

const ARTICLES = [
  ['CIM-32.5', 'Ciment CEM II 32.5 - sac 35kg', 'LIANTS', 'SAC', 'STOCKABLE', 8.4, 50],
  ['CIM-42.5', 'Ciment CEM I 42.5 - sac 35kg', 'LIANTS', 'SAC', 'STOCKABLE', 11.2, 50],
  ['ACI-HA12', 'Acier HA Ø12 - barre 12m', 'ACIERS', 'BARRE', 'STOCKABLE', 18.5, 30],
  ['ACI-HA16', 'Acier HA Ø16 - barre 12m', 'ACIERS', 'BARRE', 'STOCKABLE', 32.8, 30],
  ['PAR-15', 'Parpaing creux 15x20x50', 'MACONNERIE', 'U', 'STOCKABLE', 1.45, 200],
  ['BPE-C25', 'Béton prêt à l\'emploi C25/30', 'BETON', 'M3', 'ACHAT_DIRECT', 142, null],
  ['EPI-CAS', 'Casque chantier EN 397', 'EPI', 'U', 'DURABLE', 24, 20],
  ['PEI-FAC', 'Peinture façade extérieure 15L', 'FINITIONS', 'POT', 'STOCKABLE', 78, 10],
];

const DEPOTS = [
  ['MC-LYON', 'Magasin Central Lyon', 'MAGASIN_CENTRAL', 'Lyon Vénissieux'],
  ['DS-STE', 'Dépôt Saint-Étienne', 'DEPOT_SECONDAIRE', 'Saint-Étienne'],
];

const SUPPLIERS = [
  ['VICAT', 'Vicat SA'],
  ['LAFARGE', 'Lafarge France'],
  ['POINT-P', 'Point.P Distribution'],
  ['ARCELOR', 'ArcelorMittal Construction'],
];

const PROJECTS = [
  ['PRJ-2026-001', 'Résidence Les Cèdres', 'Habitat Sud', 4_850_000, 2_134_000, 'ACTIF', '2026-01-15', '2026-12-20'],
  ['PRJ-2026-002', 'Pont Verdoyant', 'Conseil Régional', 12_400_000, 3_980_000, 'ACTIF', '2026-02-01', '2027-06-30'],
  ['PRJ-2026-003', 'École Jean Moulin', 'Mairie de Lyon', 2_300_000, 2_120_000, 'ACTIF', '2025-09-10', '2026-08-15'],
];

const SITES = [
  // [project_code, code, nom, localisation, responsable]
  ['PRJ-2026-001', 'CH-001', 'Cèdres - Bâtiment A', 'Lyon 7e', 'M. Dubois'],
  ['PRJ-2026-001', 'CH-002', 'Cèdres - Bâtiment B', 'Lyon 7e', 'M. Dubois'],
  ['PRJ-2026-002', 'CH-003', 'Pont - Pile P2', 'Saint-Étienne', 'Mme Laurent'],
  ['PRJ-2026-003', 'CH-005', 'École - Gros œuvre', 'Lyon 3e', 'M. Petit'],
];

(async () => {
  try {
    await withTransaction(async (c) => {
      console.log('[seed] Roles & permissions…');
      const roleIds = {};
      for (const [code, lib] of ROLES) {
        const r = await c.query(
          `INSERT INTO roles(code, libelle) VALUES ($1,$2)
           ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle
           RETURNING id`,
          [code, lib],
        );
        roleIds[code] = r.rows[0].id;
      }
      const permIds = {};
      for (const [code, lib] of PERMISSIONS) {
        const r = await c.query(
          `INSERT INTO permissions(code, libelle) VALUES ($1,$2)
           ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle
           RETURNING id`,
          [code, lib],
        );
        permIds[code] = r.rows[0].id;
      }
      for (const [roleCode, perms] of Object.entries(ROLE_PERMS)) {
        for (const p of perms) {
          await c.query(
            `INSERT INTO role_permissions(role_id, permission_id) VALUES ($1,$2)
             ON CONFLICT DO NOTHING`,
            [roleIds[roleCode], permIds[p]],
          );
        }
      }

      console.log('[seed] Admin user…');
      const hash = await bcrypt.hash('Admin123!', 10);
      const u = await c.query(
        `INSERT INTO users(email, nom, password_hash, actif) VALUES ($1,$2,$3,true)
         ON CONFLICT (email) DO UPDATE SET nom = EXCLUDED.nom, password_hash = EXCLUDED.password_hash
         RETURNING id`,
        ['admin@btp.local', 'Administrateur Système', hash],
      );
      await c.query(
        `INSERT INTO user_roles(user_id, role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [u.rows[0].id, roleIds.ADMIN],
      );

      console.log('[seed] Familles, unités, articles…');
      const famIds = {};
      for (const [code, lib] of FAMILIES) {
        const r = await c.query(
          `INSERT INTO article_families(code, libelle) VALUES ($1,$2)
           ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle RETURNING id`,
          [code, lib],
        );
        famIds[code] = r.rows[0].id;
      }
      const unitIds = {};
      for (const [code, lib] of UNITS) {
        const r = await c.query(
          `INSERT INTO units(code, libelle) VALUES ($1,$2)
           ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle RETURNING id`,
          [code, lib],
        );
        unitIds[code] = r.rows[0].id;
      }
      const articleIds = {};
      for (const [code, des, fam, unit, nat, prix, seuil] of ARTICLES) {
        const r = await c.query(
          `INSERT INTO articles(code, designation, famille_id, unite_id, nature, prix_moyen, seuil_min)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (code) DO UPDATE SET designation = EXCLUDED.designation
           RETURNING id`,
          [code, des, famIds[fam], unitIds[unit], nat, prix, seuil],
        );
        articleIds[code] = r.rows[0].id;
      }

      console.log('[seed] Dépôts & fournisseurs…');
      const depotIds = {};
      for (const [code, nom, type, loc] of DEPOTS) {
        const r = await c.query(
          `INSERT INTO depots(code, nom, type_depot, localisation) VALUES ($1,$2,$3,$4)
           ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom RETURNING id`,
          [code, nom, type, loc],
        );
        depotIds[code] = r.rows[0].id;
      }
      for (const [code, raison] of SUPPLIERS) {
        await c.query(
          `INSERT INTO suppliers(code, raison_sociale) VALUES ($1,$2)
           ON CONFLICT (code) DO UPDATE SET raison_sociale = EXCLUDED.raison_sociale`,
          [code, raison],
        );
      }

      console.log('[seed] Stock initial…');
      for (const [aCode, qte] of [
        ['CIM-32.5', 480], ['CIM-42.5', 220], ['ACI-HA12', 150],
        ['ACI-HA16', 35], ['PAR-15', 1200], ['EPI-CAS', 60], ['PEI-FAC', 18],
      ]) {
        await c.query(
          `INSERT INTO stock_balances(article_id, depot_id, qte_disponible, seuil_alerte)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (article_id, depot_id) DO UPDATE SET qte_disponible = EXCLUDED.qte_disponible`,
          [articleIds[aCode], depotIds['MC-LYON'], qte, 50],
        );
      }

      console.log('[seed] Projets & sites…');
      const projectIds = {};
      for (const [code, nom, client, bi, bc, st, dd, df] of PROJECTS) {
        const r = await c.query(
          `INSERT INTO projects(code, nom, client, budget_initial, budget_consomme, statut, date_debut, date_fin)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom RETURNING id`,
          [code, nom, client, bi, bc, st, dd, df],
        );
        projectIds[code] = r.rows[0].id;
      }
      for (const [pCode, sCode, nom, loc, resp] of SITES) {
        await c.query(
          `INSERT INTO sites(project_id, code, nom, localisation, responsable)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (project_id, code) DO UPDATE SET nom = EXCLUDED.nom`,
          [projectIds[pCode], sCode, nom, loc, resp],
        );
      }
    });

    console.log('\n[seed] ✓ Done.');
    console.log('  Login : admin@btp.local / Admin123!');
  } catch (err) {
    console.error('[seed] ✗', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
