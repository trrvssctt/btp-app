const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const { query } = require('../db/pool');

router.use(authenticate);

router.get('/', asyncHandler(async (_req, res) => {
  const [
    { rows: projects },
    { rows: requestStatuts },
    { rows: topSuppliers },
    { rows: mouvementsParMois },
    { rows: topArticles },
    { rows: budgetLots },
  ] = await Promise.all([
    // Budget vs consommé par projet
    query(`SELECT code, nom, client, budget_initial, budget_consomme
           FROM projects WHERE statut != 'ARCHIVE' ORDER BY nom`),

    // Répartition des demandes par statut
    query(`SELECT statut, COUNT(*)::int AS count FROM requests GROUP BY statut ORDER BY count DESC`),

    // Top 5 fournisseurs par montant total des commandes
    query(`SELECT s.raison_sociale AS nom, COALESCE(SUM(po.montant_total), 0)::numeric AS montant
           FROM purchase_orders po
           JOIN suppliers s ON s.id = po.supplier_id
           GROUP BY s.id, s.raison_sociale
           ORDER BY montant DESC LIMIT 5`),

    // Mouvements par mois (6 derniers mois)
    query(`SELECT
             TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS mois,
             TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS mois_key,
             SUM(CASE WHEN type_mouvement ILIKE 'ENTREE%' OR type_mouvement = 'TRANSFERT_ENTRANT' THEN 1 ELSE 0 END)::int AS entrees,
             SUM(CASE WHEN type_mouvement ILIKE 'SORTIE%' OR type_mouvement = 'TRANSFERT_SORTANT' THEN 1 ELSE 0 END)::int AS sorties
           FROM stock_movements
           WHERE created_at >= NOW() - INTERVAL '6 months'
           GROUP BY DATE_TRUNC('month', created_at)
           ORDER BY DATE_TRUNC('month', created_at)`),

    // Top 6 articles consommés par valeur estimée
    query(`SELECT a.code, a.designation,
             ROUND(SUM(ABS(sm.quantite) * COALESCE(a.prix_moyen, 0)) / 1000, 1)::float AS valeur
           FROM stock_movements sm
           JOIN articles a ON a.id = sm.article_id
           WHERE sm.type_mouvement ILIKE 'SORTIE%'
           GROUP BY a.id, a.code, a.designation
           ORDER BY valeur DESC LIMIT 6`),

    // Suivi budget prévisionnel vs réel par lot
    query(`SELECT
             bl.id, bl.code, bl.libelle, bl.montant_prevu,
             p.code AS project_code, p.nom AS project_nom,
             COALESCE((
               SELECT SUM(r.montant_estime)
                 FROM requests r
                WHERE r.budget_lot_id = bl.id
                  AND r.statut NOT IN ('BROUILLON','REJETEE')
             ), 0)::numeric AS montant_demandes,
             COALESCE((
               SELECT SUM(po.montant_total)
                 FROM purchase_orders po
                 JOIN requests r ON r.id = po.request_id
                WHERE r.budget_lot_id = bl.id
             ), 0)::numeric AS montant_commandes
           FROM budget_lots bl
           JOIN projects p ON p.id = bl.project_id
           WHERE p.statut != 'ARCHIVE'
           ORDER BY p.code, bl.code`),
  ]);

  res.json({
    data: {
      projects,
      requestStatuts,
      topSuppliers,
      mouvementsParMois,
      topArticles,
      budgetLots,
    },
  });
}));

module.exports = router;
