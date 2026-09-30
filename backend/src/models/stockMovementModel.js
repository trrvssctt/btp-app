const { query, withTransaction } = require('../db/pool');
const HttpError = require('../utils/HttpError');

const ENTREES_ALL = ['ENTREE', 'ENTREE_ACHAT', 'RETOUR_CHANTIER', 'TRANSFERT_ENTRANT', 'ANNULATION_RESERVATION'];
const SORTIES_ALL = ['SORTIE', 'SORTIE_CHANTIER', 'TRANSFERT_SORTANT', 'RESERVATION'];

async function list({ article_id, depot_id, type_mouvement, sens, date_from, date_to, q, limit = 200 } = {}) {
  const params = [];
  const where = [];
  if (article_id) { params.push(article_id); where.push(`sm.article_id = $${params.length}`); }
  if (depot_id) { params.push(depot_id); where.push(`sm.depot_id = $${params.length}`); }
  if (type_mouvement) { params.push(type_mouvement); where.push(`sm.type_mouvement = $${params.length}`); }
  // Sens : un ajustement compte comme entrée ou sortie selon son signe.
  if (sens === 'entree') {
    params.push(ENTREES_ALL);
    where.push(`(sm.type_mouvement = ANY($${params.length}) OR (sm.type_mouvement = 'AJUSTEMENT_INVENTAIRE' AND sm.quantite > 0))`);
  }
  if (sens === 'sortie') {
    params.push(SORTIES_ALL);
    where.push(`(sm.type_mouvement = ANY($${params.length}) OR (sm.type_mouvement = 'AJUSTEMENT_INVENTAIRE' AND sm.quantite < 0))`);
  }
  if (date_from) { params.push(date_from); where.push(`sm.created_at >= $${params.length}::date`); }
  if (date_to) { params.push(date_to); where.push(`sm.created_at < $${params.length}::date + 1`); }
  if (q) {
    params.push(`%${q}%`);
    where.push(`(a.code ILIKE $${params.length} OR a.designation ILIKE $${params.length} OR sm.reference_doc ILIKE $${params.length})`);
  }
  params.push(Math.min(Number(limit) || 200, 1000));

  const { rows } = await query(
    `SELECT sm.*,
            a.code AS article_code, a.designation AS article_designation,
            d.code AS depot_code, d.nom AS depot_nom,
            s.code AS site_code, s.nom AS site_nom,
            u.nom AS user_nom
       FROM stock_movements sm
       JOIN articles a ON a.id = sm.article_id
       JOIN depots d ON d.id = sm.depot_id
       LEFT JOIN sites s ON s.id = sm.site_id
       LEFT JOIN users u ON u.id = sm.user_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY sm.created_at DESC
      LIMIT $${params.length}`,
    params,
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT sm.*,
            a.code AS article_code, a.designation AS article_designation,
            d.code AS depot_code, d.nom AS depot_nom,
            s.code AS site_code, s.nom AS site_nom,
            u.nom AS user_nom
       FROM stock_movements sm
       JOIN articles a ON a.id = sm.article_id
       JOIN depots d ON d.id = sm.depot_id
       LEFT JOIN sites s ON s.id = sm.site_id
       LEFT JOIN users u ON u.id = sm.user_id
      WHERE sm.id = $1`,
    [id],
  );
  return rows[0] || null;
}

async function create(sm) {
  const { rows } = await query(
    `INSERT INTO stock_movements(type_mouvement, article_id, depot_id, quantite, reference_doc, site_id, user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [sm.type_mouvement, sm.article_id, sm.depot_id, sm.quantite, sm.reference_doc, sm.site_id, sm.user_id],
  );
  return rows[0];
}

async function createWithBalanceUpdate(movement, balanceUpdate) {
  return withTransaction(async (c) => {
    const m = await c.query(
      `INSERT INTO stock_movements(type_mouvement, article_id, depot_id, quantite, reference_doc, site_id, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [movement.type_mouvement, movement.article_id, movement.depot_id, movement.quantite, movement.reference_doc, movement.site_id, movement.user_id],
    );

    if (balanceUpdate) {
      await c.query(
        `UPDATE stock_balances SET qte_disponible = qte_disponible + $1, updated_at = now()
         WHERE article_id = $2 AND depot_id = $3`,
        [balanceUpdate.delta, balanceUpdate.article_id, balanceUpdate.depot_id],
      );
    }

    return m.rows[0];
  });
}

// Sens des mouvements manuels (quantité toujours positive, sauf ajustement signé).
const ENTREES = ['ENTREE', 'ENTREE_ACHAT', 'RETOUR_CHANTIER'];
const SORTIES = ['SORTIE', 'SORTIE_CHANTIER'];

/* Mouvement manuel : enregistre le mouvement ET met à jour le solde du dépôt. */
async function createManual(sm) {
  const q = Number(sm.quantite);
  const delta = ENTREES.includes(sm.type_mouvement) ? Math.abs(q)
    : SORTIES.includes(sm.type_mouvement) ? -Math.abs(q)
    : q; // AJUSTEMENT_INVENTAIRE : signé (+ surplus, - manquant)

  return withTransaction(async (c) => {
    const { rows: bal } = await c.query(
      `SELECT qte_disponible FROM stock_balances WHERE article_id = $1 AND depot_id = $2 FOR UPDATE`,
      [sm.article_id, sm.depot_id],
    );
    const dispo = Number(bal[0]?.qte_disponible ?? 0);
    if (dispo + delta < 0) {
      const { rows: art } = await c.query(`SELECT code FROM articles WHERE id = $1`, [sm.article_id]);
      throw new HttpError(400, `Stock insuffisant pour ${art[0]?.code ?? 'cet article'} : ${dispo} disponible(s), sortie de ${Math.abs(delta)} demandée`);
    }

    await c.query(
      `INSERT INTO stock_balances(article_id, depot_id, qte_disponible, qte_reservee)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (article_id, depot_id)
       DO UPDATE SET qte_disponible = stock_balances.qte_disponible + $3, updated_at = now()`,
      [sm.article_id, sm.depot_id, delta],
    );

    const m = await c.query(
      `INSERT INTO stock_movements(type_mouvement, article_id, depot_id, quantite, reference_doc, site_id, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [sm.type_mouvement, sm.article_id, sm.depot_id,
       sm.type_mouvement === 'AJUSTEMENT_INVENTAIRE' ? q : Math.abs(q),
       sm.reference_doc, sm.site_id, sm.user_id],
    );
    return m.rows[0];
  });
}

module.exports = { list, findById, create, createWithBalanceUpdate, createManual };
