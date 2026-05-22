const { query, withTransaction } = require('../db/pool');

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

async function create({ purchase_order_id, depot_id, date_reception, conformite = 'CONFORME', reserve, lignes, user_id }) {
  return withTransaction(async (c) => {
    // Resolve lines: use provided lignes, or auto-fetch from purchase order
    let lines = lignes;
    if (!lines && purchase_order_id) {
      const { rows: poLines } = await c.query(
        `SELECT pol.id AS purchase_order_line_id,
                pol.article_id,
                pol.designation_libre,
                pol.quantite AS quantite_recue
           FROM purchase_order_lines pol
          WHERE pol.purchase_order_id = $1`,
        [purchase_order_id],
      );
      lines = poLines;
    }

    // Generate receipt number inside transaction to avoid gaps
    const { rows: numRows } = await c.query(
      `SELECT COUNT(*)::int + 1 AS n FROM receipts
        WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now())`,
    );
    const numero = `BR-${new Date().getFullYear()}-${String(numRows[0].n).padStart(4, '0')}`;

    // Create the receipt header
    const { rows } = await c.query(
      `INSERT INTO receipts(numero, purchase_order_id, depot_id, date_reception, conformite, reserve)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [numero, purchase_order_id || null, depot_id, date_reception, conformite, reserve || null],
    );
    const receipt = rows[0];

    // Process each line: traceability + stock movement + balance upsert
    if (lines && lines.length > 0) {
      for (const l of lines) {
        if (!l.quantite_recue || parseFloat(l.quantite_recue) <= 0) continue;

        await c.query(
          `INSERT INTO receipt_lines(receipt_id, purchase_order_line_id, article_id, designation_libre, quantite_recue)
           VALUES ($1,$2,$3,$4,$5)`,
          [receipt.id, l.purchase_order_line_id || null, l.article_id || null, l.designation_libre || null, l.quantite_recue],
        );

        if (l.article_id) {
          // Upsert stock balance
          await c.query(
            `INSERT INTO stock_balances(article_id, depot_id, qte_disponible, qte_reservee)
             VALUES ($1, $2, $3, 0)
             ON CONFLICT (article_id, depot_id)
             DO UPDATE SET qte_disponible = stock_balances.qte_disponible + $3,
                           updated_at = now()`,
            [l.article_id, depot_id, l.quantite_recue],
          );

          // Create stock movement for full traceability
          await c.query(
            `INSERT INTO stock_movements(type_mouvement, article_id, depot_id, quantite, reference_doc, user_id)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            ['ENTREE_ACHAT', l.article_id, depot_id, l.quantite_recue, receipt.numero, user_id || null],
          );
        }
      }
    }

    // Update purchase order status after reception
    if (purchase_order_id) {
      const newStatut = conformite === 'PARTIELLE' ? 'PARTIELLEMENT_RECEPTIONNE' : 'RECEPTIONNE';
      await c.query(
        `UPDATE purchase_orders SET statut = $1 WHERE id = $2`,
        [newStatut, purchase_order_id],
      );
    }

    return receipt;
  });
}

module.exports = { list, create };
