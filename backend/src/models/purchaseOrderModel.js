const { query, withTransaction } = require('../db/pool');

async function nextNumero() {
  const { rows } = await query(
    `SELECT COUNT(*)::int + 1 AS n FROM purchase_orders
      WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now())`,
  );
  const year = new Date().getFullYear();
  return `BC-${year}-${String(rows[0].n).padStart(4, '0')}`;
}

async function list({ statut, supplier_id } = {}) {
  const params = [];
  const where = [];
  if (statut) { params.push(statut); where.push(`po.statut = $${params.length}`); }
  if (supplier_id) { params.push(supplier_id); where.push(`po.supplier_id = $${params.length}`); }

  const { rows } = await query(
    `SELECT po.*,
            s.raison_sociale AS supplier_nom,
            COUNT(pol.id)::int AS nb_lignes
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       LEFT JOIN purchase_order_lines pol ON pol.purchase_order_id = po.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      GROUP BY po.id, s.raison_sociale
      ORDER BY po.created_at DESC`,
    params,
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT po.*, s.raison_sociale AS supplier_nom
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.id = $1`,
    [id],
  );
  if (!rows[0]) return null;

  const lines = await query(
    `SELECT pol.*, a.code AS article_code, a.designation AS article_designation
       FROM purchase_order_lines pol
       LEFT JOIN articles a ON a.id = pol.article_id
      WHERE pol.purchase_order_id = $1`,
    [id],
  );

  return { ...rows[0], lignes: lines.rows };
}

async function create({ supplier_id, lignes, statut = 'BROUILLON' }) {
  return withTransaction(async (c) => {
    const numero = await nextNumero();
    let montant = 0;
    for (const l of lignes) {
      montant += (parseFloat(l.prix_unitaire) || 0) * (parseFloat(l.quantite) || 0);
    }

    const po = await c.query(
      `INSERT INTO purchase_orders(numero, supplier_id, statut, montant_total)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [numero, supplier_id, statut, montant],
    );
    const order = po.rows[0];

    for (const l of lignes) {
      await c.query(
        `INSERT INTO purchase_order_lines(purchase_order_id, article_id, designation_libre, quantite, prix_unitaire)
         VALUES ($1,$2,$3,$4,$5)`,
        [order.id, l.article_id || null, l.designation_libre || null, l.quantite, l.prix_unitaire || 0],
      );
    }

    return order;
  });
}

module.exports = { list, findById, create };
