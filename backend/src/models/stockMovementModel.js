const { query, withTransaction } = require('../db/pool');

async function list({ article_id, depot_id, type_mouvement } = {}) {
  const params = [];
  const where = [];
  if (article_id) { params.push(article_id); where.push(`sm.article_id = $${params.length}`); }
  if (depot_id) { params.push(depot_id); where.push(`sm.depot_id = $${params.length}`); }
  if (type_mouvement) { params.push(type_mouvement); where.push(`sm.type_mouvement = $${params.length}`); }

  const { rows } = await query(
    `SELECT sm.*,
            a.code AS article_code, a.designation AS article_designation,
            d.code AS depot_code, d.nom AS depot_nom,
            u.nom AS user_nom
       FROM stock_movements sm
       JOIN articles a ON a.id = sm.article_id
       JOIN depots d ON d.id = sm.depot_id
       LEFT JOIN users u ON u.id = sm.user_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY sm.created_at DESC`,
    params,
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT sm.*,
            a.code AS article_code, a.designation AS article_designation,
            d.code AS depot_code, d.nom AS depot_nom,
            u.nom AS user_nom
       FROM stock_movements sm
       JOIN articles a ON a.id = sm.article_id
       JOIN depots d ON d.id = sm.depot_id
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

module.exports = { list, findById, create, createWithBalanceUpdate };
