const { query } = require('../db/pool');

async function list({ depot_id, article_id } = {}) {
  const params = [];
  const where = [];
  if (depot_id) { params.push(depot_id); where.push(`s.depot_id = $${params.length}`); }
  if (article_id) { params.push(article_id); where.push(`s.article_id = $${params.length}`); }
  const { rows } = await query(
    `SELECT s.*,
            a.code AS article_code, a.designation AS article_designation, a.actif AS article_actif,
            d.code AS depot_code, d.nom AS depot_nom, d.type_depot,
            u.code AS article_unite
       FROM stock_balances s
       JOIN articles a ON a.id = s.article_id
       JOIN depots d ON d.id = s.depot_id
       LEFT JOIN units u ON u.id = a.unite_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY a.code, d.code`,
    params,
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT s.*,
            a.code AS article_code, a.designation AS article_designation, a.actif AS article_actif,
            d.code AS depot_code, d.nom AS depot_nom
       FROM stock_balances s
       JOIN articles a ON a.id = s.article_id
       JOIN depots d ON d.id = s.depot_id
      WHERE s.id = $1`,
    [id],
  );
  return rows[0] || null;
}

async function create(s) {
  const { rows } = await query(
    `INSERT INTO stock_balances(article_id, depot_id, qte_disponible, qte_reservee, seuil_alerte)
     VALUES ($1,$2,$3,0,$4) RETURNING *`,
    [s.article_id, s.depot_id, s.qte_disponible || 0, s.seuil_alerte],
  );
  return rows[0];
}

async function update(id, s) {
  const sets = ['updated_at = now()'];
  const params = [id];
  const add = (col, val) => { params.push(val); sets.push(`${col} = $${params.length}`); };
  if (s.qte_disponible !== undefined) add('qte_disponible', s.qte_disponible);
  if (s.qte_reservee  !== undefined) add('qte_reservee',  s.qte_reservee);
  if (s.seuil_alerte  !== undefined) add('seuil_alerte',  s.seuil_alerte);
  const { rows } = await query(
    `UPDATE stock_balances SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  );
  return rows[0] || null;
}

async function remove(id) {
  await query(`DELETE FROM stock_balances WHERE id = $1`, [id]);
}

module.exports = { list, findById, create, update, remove };
