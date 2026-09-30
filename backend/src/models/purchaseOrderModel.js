const { query, withTransaction } = require('../db/pool');

// Prochain numéro = plus grand suffixe de l'année + 1 (un COUNT réattribuerait
// un numéro déjà pris après la suppression d'un brouillon).
async function nextNumero(c) {
  const year = new Date().getFullYear();
  const { rows } = await c.query(
    `SELECT COALESCE(MAX(SUBSTRING(numero FROM '^BC-[0-9]{4}-([0-9]+)$')::int), 0) + 1 AS n
       FROM purchase_orders
      WHERE numero LIKE $1`,
    [`BC-${year}-%`],
  );
  return `BC-${year}-${String(rows[0].n).padStart(4, '0')}`;
}

async function list({ statut, supplier_id, request_id } = {}) {
  const params = [];
  const where = [];
  if (statut) { params.push(statut); where.push(`po.statut = $${params.length}`); }
  if (supplier_id) { params.push(supplier_id); where.push(`po.supplier_id = $${params.length}`); }
  if (request_id) { params.push(request_id); where.push(`po.request_id = $${params.length}`); }

  const { rows } = await query(
    `SELECT po.*,
            s.raison_sociale AS supplier_nom,
            r.numero AS request_numero,
            COUNT(pol.id)::int AS nb_lignes
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       LEFT JOIN requests r ON r.id = po.request_id
       LEFT JOIN purchase_order_lines pol ON pol.purchase_order_id = po.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      GROUP BY po.id, s.raison_sociale, r.numero
      ORDER BY po.created_at DESC`,
    params,
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT po.*, s.raison_sociale AS supplier_nom, r.numero AS request_numero
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       LEFT JOIN requests r ON r.id = po.request_id
      WHERE po.id = $1`,
    [id],
  );
  if (!rows[0]) return null;

  const lines = await query(
    `SELECT pol.*, a.code AS article_code, a.designation AS article_designation,
            (SELECT COALESCE(SUM(rl.quantite_recue), 0)
               FROM receipt_lines rl
              WHERE rl.purchase_order_line_id = pol.id) AS quantite_recue
       FROM purchase_order_lines pol
       LEFT JOIN articles a ON a.id = pol.article_id
      WHERE pol.purchase_order_id = $1
      ORDER BY a.code NULLS LAST, pol.id`,
    [id],
  );

  return { ...rows[0], lignes: lines.rows };
}

async function create({ supplier_id, lignes, statut = 'BROUILLON', request_id = null }) {
  return withTransaction(async (c) => {
    const numero = await nextNumero(c);
    let montant = 0;
    for (const l of lignes) {
      montant += (parseFloat(l.prix_unitaire) || 0) * (parseFloat(l.quantite) || 0);
    }

    const po = await c.query(
      `INSERT INTO purchase_orders(numero, supplier_id, statut, montant_total, request_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [numero, supplier_id, statut, montant, request_id],
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

async function update(id, { supplier_id, lignes, statut }) {
  return withTransaction(async (c) => {
    // Vérifier que le BC existe
    const existing = await c.query('SELECT * FROM purchase_orders WHERE id = $1', [id]);
    if (existing.rows.length === 0) throw new Error('Purchase order not found');

    // Calculer le nouveau montant
    let montant = 0;
    for (const l of lignes) {
      montant += (parseFloat(l.prix_unitaire) || 0) * (parseFloat(l.quantite) || 0);
    }

    // Mettre à jour le BC
    const po = await c.query(
      `UPDATE purchase_orders
       SET supplier_id = $1, statut = $2, montant_total = $3, updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [supplier_id, statut || existing.rows[0].statut, montant, id],
    );

    // Supprimer les anciennes lignes
    await c.query('DELETE FROM purchase_order_lines WHERE purchase_order_id = $1', [id]);

    // Insérer les nouvelles lignes
    for (const l of lignes) {
      await c.query(
        `INSERT INTO purchase_order_lines(purchase_order_id, article_id, designation_libre, quantite, prix_unitaire)
         VALUES ($1,$2,$3,$4,$5)`,
        [id, l.article_id || null, l.designation_libre || null, l.quantite, l.prix_unitaire || 0],
      );
    }

    return po.rows[0];
  });
}

async function remove(id) {
  return withTransaction(async (c) => {
    // Supprimer les lignes
    await c.query('DELETE FROM purchase_order_lines WHERE purchase_order_id = $1', [id]);
    // Supprimer le BC
    const result = await c.query('DELETE FROM purchase_orders WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  });
}

module.exports = { list, findById, create, update, remove };
