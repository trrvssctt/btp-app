const { query } = require('../db/pool');

async function nextNumero() {
  const { rows } = await query(
    `SELECT COUNT(*)::int + 1 AS n FROM receipts
      WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now())`,
  );
  const year = new Date().getFullYear();
  return `BR-${year}-${String(rows[0].n).padStart(4, '0')}`;
}

async function list({ purchase_order_id, depot_id } = {}) {
  const params = [];
  const where = [];
  if (purchase_order_id) { params.push(purchase_order_id); where.push(`r.purchase_order_id = $${params.length}`); }
  if (depot_id) { params.push(depot_id); where.push(`r.depot_id = $${params.length}`); }

  const { rows } = await query(
    `SELECT r.*,
            d.code AS depot_code, d.nom AS depot_nom,
            po.numero AS commande_numero,
            s.raison_sociale AS supplier_nom
       FROM receipts r
       JOIN depots d ON d.id = r.depot_id
       LEFT JOIN purchase_orders po ON po.id = r.purchase_order_id
       LEFT JOIN suppliers s ON s.id = po.supplier_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY r.created_at DESC`,
    params,
  );
  return rows;
}

async function create({ purchase_order_id, depot_id, date_reception, conformite = 'CONFORME', reserve }) {
  const numero = await nextNumero();
  const { rows } = await query(
    `INSERT INTO receipts(numero, purchase_order_id, depot_id, date_reception, conformite, reserve)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [numero, purchase_order_id || null, depot_id, date_reception, conformite, reserve || null],
  );
  return rows[0];
}

module.exports = { list, create };
