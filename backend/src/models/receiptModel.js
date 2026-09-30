const { query, withTransaction } = require('../db/pool');
const HttpError = require('../utils/HttpError');

async function list({ purchase_order_id, depot_id, supplier_id, conformite, date_from, date_to, q } = {}) {
  const params = [];
  const where = [];
  if (purchase_order_id) { params.push(purchase_order_id); where.push(`r.purchase_order_id = $${params.length}`); }
  if (depot_id) { params.push(depot_id); where.push(`r.depot_id = $${params.length}`); }
  if (supplier_id) { params.push(supplier_id); where.push(`po.supplier_id = $${params.length}`); }
  if (conformite) { params.push(conformite); where.push(`r.conformite = $${params.length}`); }
  if (date_from) { params.push(date_from); where.push(`r.date_reception >= $${params.length}::date`); }
  if (date_to) { params.push(date_to); where.push(`r.date_reception <= $${params.length}::date`); }
  // Recherche : n° de BR, n° de BC, fournisseur ou article reçu.
  if (q) {
    params.push(`%${q}%`);
    const p = `$${params.length}`;
    where.push(`(r.numero ILIKE ${p} OR po.numero ILIKE ${p} OR s.raison_sociale ILIKE ${p} OR EXISTS (
      SELECT 1 FROM receipt_lines rl JOIN articles a ON a.id = rl.article_id
       WHERE rl.receipt_id = r.id AND (a.code ILIKE ${p} OR a.designation ILIKE ${p})))`);
  }

  const { rows } = await query(
    `SELECT r.*,
            d.code AS depot_code, d.nom AS depot_nom,
            po.numero AS commande_numero,
            s.raison_sociale AS supplier_nom,
            (SELECT COUNT(*)::int FROM receipt_lines rl WHERE rl.receipt_id = r.id) AS nb_lignes
       FROM receipts r
       JOIN depots d ON d.id = r.depot_id
       LEFT JOIN purchase_orders po ON po.id = r.purchase_order_id
       LEFT JOIN suppliers s ON s.id = po.supplier_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY r.date_reception DESC, r.created_at DESC`,
    params,
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT r.*,
            d.code AS depot_code, d.nom AS depot_nom,
            po.numero AS commande_numero, po.statut AS commande_statut,
            s.raison_sociale AS supplier_nom,
            (SELECT u.nom FROM stock_movements sm JOIN users u ON u.id = sm.user_id
              WHERE sm.reference_doc = r.numero LIMIT 1) AS recu_par
       FROM receipts r
       JOIN depots d ON d.id = r.depot_id
       LEFT JOIN purchase_orders po ON po.id = r.purchase_order_id
       LEFT JOIN suppliers s ON s.id = po.supplier_id
      WHERE r.id = $1`,
    [id],
  );
  const receipt = rows[0];
  if (!receipt) return null;

  const { rows: lignes } = await query(
    `SELECT rl.*, a.code AS article_code, a.designation AS article_designation,
            pol.quantite AS quantite_commandee
       FROM receipt_lines rl
       LEFT JOIN articles a ON a.id = rl.article_id
       LEFT JOIN purchase_order_lines pol ON pol.id = rl.purchase_order_line_id
      WHERE rl.receipt_id = $1
      ORDER BY a.code NULLS LAST, rl.id`,
    [id],
  );
  receipt.lignes = lignes;

  // Historique de toutes les livraisons du même BC (réceptions étalées sur plusieurs jours).
  if (receipt.purchase_order_id) {
    const { rows: receptions } = await query(
      `SELECT r.id, r.numero, r.date_reception, r.conformite, r.reserve, r.created_at,
              d.code AS depot_code
         FROM receipts r
         JOIN depots d ON d.id = r.depot_id
        WHERE r.purchase_order_id = $1
        ORDER BY r.date_reception, r.created_at`,
      [receipt.purchase_order_id],
    );
    const { rows: poLignes } = await query(
      `SELECT pol.id, pol.quantite AS quantite_commandee, pol.designation_libre,
              a.code AS article_code, a.designation AS article_designation,
              COALESCE(json_object_agg(rl.receipt_id, rl.qte) FILTER (WHERE rl.receipt_id IS NOT NULL), '{}') AS recus,
              COALESCE(SUM(rl.qte), 0) AS total_recu
         FROM purchase_order_lines pol
         LEFT JOIN articles a ON a.id = pol.article_id
         LEFT JOIN (SELECT purchase_order_line_id, receipt_id, SUM(quantite_recue) AS qte
                      FROM receipt_lines GROUP BY purchase_order_line_id, receipt_id) rl
                ON rl.purchase_order_line_id = pol.id
        WHERE pol.purchase_order_id = $1
        GROUP BY pol.id, a.code, a.designation
        ORDER BY a.code NULLS LAST, pol.id`,
      [receipt.purchase_order_id],
    );
    receipt.historique = { receptions, lignes: poLignes };
  }

  return receipt;
}

// Statuts de BC qui acceptent encore une réception.
const RECEIVABLE = ['ENVOYEE', 'PARTIELLEMENT_RECEPTIONNE'];

async function create({ purchase_order_id, depot_id, date_reception, conformite = 'CONFORME', reserve, lignes, user_id }) {
  return withTransaction(async (c) => {
    // Lignes du BC avec le cumul déjà reçu (verrou sur le BC : deux réceptions
    // simultanées ne peuvent pas dépasser la quantité commandée).
    let poLines = [];
    if (purchase_order_id) {
      const { rows: poRows } = await c.query(
        `SELECT numero, statut FROM purchase_orders WHERE id = $1 FOR UPDATE`,
        [purchase_order_id],
      );
      if (!poRows[0]) throw new HttpError(404, 'Bon de commande introuvable');
      if (!RECEIVABLE.includes(poRows[0].statut)) {
        throw new HttpError(400, `Le BC ${poRows[0].numero} est en statut ${poRows[0].statut} : réception impossible`);
      }
      ({ rows: poLines } = await c.query(
        `SELECT pol.id, pol.article_id, pol.designation_libre, pol.quantite, a.code AS article_code,
                COALESCE(SUM(rl.quantite_recue), 0) AS deja_recu
           FROM purchase_order_lines pol
           LEFT JOIN articles a ON a.id = pol.article_id
           LEFT JOIN receipt_lines rl ON rl.purchase_order_line_id = pol.id
          WHERE pol.purchase_order_id = $1
          GROUP BY pol.id, a.code`,
        [purchase_order_id],
      ));
    }
    const poLineById = new Map(poLines.map((l) => [l.id, l]));

    // Sans lignes fournies : on réceptionne le reste à livrer de chaque ligne du BC.
    let lines = lignes;
    if (!lines && purchase_order_id) {
      lines = poLines.map((l) => ({
        purchase_order_line_id: l.id,
        article_id: l.article_id,
        designation_libre: l.designation_libre,
        quantite_recue: parseFloat(l.quantite) - parseFloat(l.deja_recu),
      }));
    }

    // Contrôle : une ligne de BC ne peut pas recevoir plus que son reste à livrer.
    for (const l of lines || []) {
      if (!l.purchase_order_line_id) continue;
      const pol = poLineById.get(l.purchase_order_line_id);
      if (!pol) throw new HttpError(400, 'Ligne de réception étrangère au bon de commande');
      const reste = parseFloat(pol.quantite) - parseFloat(pol.deja_recu);
      if (parseFloat(l.quantite_recue) > reste + 1e-9) {
        throw new HttpError(400, `Quantité reçue (${l.quantite_recue}) supérieure au reste à livrer (${reste}) pour ${pol.article_code || pol.designation_libre || 'une ligne du BC'}`);
      }
    }

    // Numéro = plus grand suffixe de l'année + 1 (robuste aux suppressions).
    const year = new Date().getFullYear();
    const { rows: numRows } = await c.query(
      `SELECT COALESCE(MAX(SUBSTRING(numero FROM '^BR-[0-9]{4}-([0-9]+)$')::int), 0) + 1 AS n
         FROM receipts WHERE numero LIKE $1`,
      [`BR-${year}-%`],
    );
    const numero = `BR-${year}-${String(numRows[0].n).padStart(4, '0')}`;

    // Create the receipt header
    const { rows } = await c.query(
      `INSERT INTO receipts(numero, purchase_order_id, depot_id, date_reception, conformite, reserve)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [numero, purchase_order_id || null, depot_id, date_reception, conformite, reserve || null],
    );
    const receipt = rows[0];

    // Process each line: traceability + stock movement + balance upsert
    for (const l of lines || []) {
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

    // Statut du BC d'après les quantités cumulées réellement reçues
    // (et non d'après la conformité déclarée).
    if (purchase_order_id) {
      const { rows: [{ restant }] } = await c.query(
        `SELECT COUNT(*)::int AS restant
           FROM purchase_order_lines pol
          WHERE pol.purchase_order_id = $1
            AND pol.quantite > (SELECT COALESCE(SUM(rl.quantite_recue), 0)
                                  FROM receipt_lines rl
                                 WHERE rl.purchase_order_line_id = pol.id)`,
        [purchase_order_id],
      );
      const newStatut = restant === 0 ? 'RECEPTIONNE' : 'PARTIELLEMENT_RECEPTIONNE';
      await c.query(
        `UPDATE purchase_orders SET statut = $1, updated_at = now() WHERE id = $2`,
        [newStatut, purchase_order_id],
      );
      receipt.commande_statut = newStatut;
    }

    return receipt;
  });
}

module.exports = { list, findById, create };
