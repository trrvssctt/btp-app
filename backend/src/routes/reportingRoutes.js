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
    { rows: topArticlesCommandes },
  ] = await Promise.all([
    // Budget vs consommé par projet
    query(`SELECT code, nom, client, budget_initial, budget_consomme
           FROM projects WHERE statut != 'ARCHIVE' ORDER BY nom`),

    // Répartition des demandes par statut
    query(`SELECT statut, COUNT(*)::int AS count FROM requests GROUP BY statut ORDER BY count DESC`),

    // Top 8 fournisseurs par montant des commandes émises (hors brouillons)
    query(`SELECT s.raison_sociale AS nom, COALESCE(SUM(po.montant_total), 0)::numeric AS montant
           FROM purchase_orders po
           JOIN suppliers s ON s.id = po.supplier_id
          WHERE po.statut <> 'BROUILLON'
           GROUP BY s.id, s.raison_sociale
           ORDER BY montant DESC LIMIT 8`),

    // Mouvements par mois : les 6 derniers mois (mois en cours inclus), mois vides à 0,
    // libellés en français (ex. « sept. 26 »).
    query(`WITH mois AS (
             SELECT generate_series(DATE_TRUNC('month', NOW()) - INTERVAL '5 months',
                                    DATE_TRUNC('month', NOW()), INTERVAL '1 month') AS m
           )
           SELECT
             (ARRAY['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'])[EXTRACT(MONTH FROM mois.m)::int]
               || ' ' || TO_CHAR(mois.m, 'YY') AS mois,
             TO_CHAR(mois.m, 'YYYY-MM') AS mois_key,
             COUNT(sm.id) FILTER (WHERE sm.type_mouvement ILIKE 'ENTREE%' OR sm.type_mouvement = 'TRANSFERT_ENTRANT'
                                   OR (sm.type_mouvement = 'AJUSTEMENT_INVENTAIRE' AND sm.quantite > 0))::int AS entrees,
             COUNT(sm.id) FILTER (WHERE sm.type_mouvement ILIKE 'SORTIE%' OR sm.type_mouvement = 'TRANSFERT_SORTANT'
                                   OR (sm.type_mouvement = 'AJUSTEMENT_INVENTAIRE' AND sm.quantite < 0))::int AS sorties
           FROM mois
           LEFT JOIN stock_movements sm ON DATE_TRUNC('month', sm.created_at) = mois.m
           GROUP BY mois.m
           ORDER BY mois.m`),

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

    // Top 6 articles commandés (BC émis, hors brouillons) par montant
    query(`SELECT a.code, a.designation,
             SUM(pol.quantite)::float AS quantite,
             ROUND(SUM(pol.quantite * pol.prix_unitaire) / 1000, 1)::float AS valeur
           FROM purchase_order_lines pol
           JOIN purchase_orders po ON po.id = pol.purchase_order_id
           JOIN articles a ON a.id = pol.article_id
           WHERE po.statut <> 'BROUILLON'
           GROUP BY a.id, a.code, a.designation
           ORDER BY valeur DESC LIMIT 6`),
  ]);

  res.json({
    data: {
      projects,
      requestStatuts,
      topSuppliers,
      mouvementsParMois,
      topArticles,
      budgetLots,
      topArticlesCommandes,
    },
  });
}));

module.exports = router;
