const { query, withTransaction } = require('../db/pool');

async function list({ statut, depot_from, depot_to } = {}) {
  const params = [];
  const where = [];
  if (statut) { params.push(statut); where.push(`t.statut = $${params.length}`); }
  if (depot_from) { params.push(depot_from); where.push(`t.depot_from = $${params.length}`); }
  if (depot_to) { params.push(depot_to); where.push(`t.depot_to = $${params.length}`); }

  const { rows } = await query(
    `SELECT t.*,
            d1.code AS depot_from_code, d1.nom AS depot_from_nom,
            d2.code AS depot_to_code, d2.nom AS depot_to_nom
       FROM transfers t
       JOIN depots d1 ON d1.id = t.depot_from
       JOIN depots d2 ON d2.id = t.depot_to
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY t.created_at DESC`,
    params,
  );
  return rows;
}

async function findById(id) {
  const t = await query(
    `SELECT t.*,
            d1.code AS depot_from_code, d1.nom AS depot_from_nom,
            d2.code AS depot_to_code, d2.nom AS depot_to_nom
       FROM transfers t
       JOIN depots d1 ON d1.id = t.depot_from
       JOIN depots d2 ON d2.id = t.depot_to
      WHERE t.id = $1`,
    [id],
  );
  if (!t.rows[0]) return null;

  const lines = await query(
    `SELECT tl.*, a.code AS article_code, a.designation AS article_designation
       FROM transfer_lines tl
       JOIN articles a ON a.id = tl.article_id
      WHERE tl.transfer_id = $1`,
    [id],
  );

  return { ...t.rows[0], lines: lines.rows };
}

async function nextNumero() {
  const { rows } = await query(
    `SELECT COUNT(*)::int + 1 AS n FROM transfers
      WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now())`,
  );
  const year = new Date().getFullYear();
  return `TR-${year}-${String(rows[0].n).padStart(4, '0')}`;
}

async function create({ depot_from, depot_to, lines }) {
  return withTransaction(async (c) => {
    const numero = await nextNumero();
    const t = await c.query(
      `INSERT INTO transfers(numero, statut, depot_from, depot_to)
       VALUES ($1,'CREÉ',$2,$3) RETURNING *`,
      [numero, depot_from, depot_to],
    );
    const transfer = t.rows[0];

    for (const l of lines) {
      await c.query(
        `INSERT INTO transfer_lines(transfer_id, article_id, quantite)
         VALUES ($1,$2,$3)`,
        [transfer.id, l.article_id, l.quantite],
      );
    }

    return transfer;
  });
}

async function updateStatut(id, statut) {
  const { rows } = await query(
    `UPDATE transfers SET statut = $2, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [id, statut],
  );
  return rows[0] || null;
}

async function remove(id) {
  await query(`DELETE FROM transfers WHERE id = $1`, [id]);
}

module.exports = { list, findById, create, updateStatut, remove };
