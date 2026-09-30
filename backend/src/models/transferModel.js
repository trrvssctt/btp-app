const { query, withTransaction } = require('../db/pool');
const HttpError = require('../utils/HttpError');

async function list({ statut, depot_from, depot_to, depot_id, date_from, date_to, q } = {}) {
  const params = [];
  const where = [];
  if (statut) { params.push(statut); where.push(`t.statut = $${params.length}`); }
  if (depot_from) { params.push(depot_from); where.push(`t.depot_from = $${params.length}`); }
  if (depot_to) { params.push(depot_to); where.push(`t.depot_to = $${params.length}`); }
  // Dépôt concerné, qu'il soit émetteur ou récepteur.
  if (depot_id) { params.push(depot_id); where.push(`(t.depot_from = $${params.length} OR t.depot_to = $${params.length})`); }
  if (date_from) { params.push(date_from); where.push(`t.created_at >= $${params.length}::date`); }
  if (date_to) { params.push(date_to); where.push(`t.created_at < $${params.length}::date + 1`); }
  // Recherche sur le numéro ou un article transféré.
  if (q) {
    params.push(`%${q}%`);
    where.push(`(t.numero ILIKE $${params.length} OR EXISTS (
      SELECT 1 FROM transfer_lines tl JOIN articles a ON a.id = tl.article_id
       WHERE tl.transfer_id = t.id AND (a.code ILIKE $${params.length} OR a.designation ILIKE $${params.length})))`);
  }

  const { rows } = await query(
    `SELECT t.*,
            d1.code AS depot_from_code, d1.nom AS depot_from_nom,
            d2.code AS depot_to_code, d2.nom AS depot_to_nom,
            (SELECT COUNT(*)::int FROM transfer_lines tl WHERE tl.transfer_id = t.id) AS nb_lignes
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
      WHERE tl.transfer_id = $1
      ORDER BY a.code`,
    [id],
  );

  const { rows: mvts } = await query(
    `SELECT sm.type_mouvement, MIN(sm.created_at) AS date, MIN(u.nom) AS user_nom
       FROM stock_movements sm LEFT JOIN users u ON u.id = sm.user_id
      WHERE sm.reference_doc = $1 AND sm.type_mouvement IN ('TRANSFERT_SORTANT','TRANSFERT_ENTRANT')
      GROUP BY sm.type_mouvement`,
    [t.rows[0].numero],
  );
  const sortant = mvts.find((m) => m.type_mouvement === 'TRANSFERT_SORTANT');
  const entrant = mvts.find((m) => m.type_mouvement === 'TRANSFERT_ENTRANT');

  return {
    ...t.rows[0],
    lines: lines.rows,
    expedie_le: sortant?.date ?? null, expedie_par: sortant?.user_nom ?? null,
    recu_le: entrant?.date ?? null, recu_par: entrant?.user_nom ?? null,
  };
}

// Numéro = plus grand suffixe de l'année + 1 (robuste aux suppressions).
async function nextNumero(c) {
  const year = new Date().getFullYear();
  const { rows } = await c.query(
    `SELECT COALESCE(MAX(SUBSTRING(numero FROM '^TR-[0-9]{4}-([0-9]+)$')::int), 0) + 1 AS n
       FROM transfers WHERE numero LIKE $1`,
    [`TR-${year}-%`],
  );
  return `TR-${year}-${String(rows[0].n).padStart(4, '0')}`;
}

// Statuts dont le stock a déjà bougé : suppression interdite.
const STOCK_ENGAGE = ['EXPÉDIÉ', 'REÇU', 'LITIGE', 'CLÔTURÉ'];

/* Création = expédition : le stock quitte le dépôt source (TRANSFERT_SORTANT)
   et passe en transit au dépôt destination, jusqu'à l'accusé de réception. */
async function create({ depot_from, depot_to, lines, user_id }) {
  if (depot_from === depot_to) throw new HttpError(400, 'Les dépôts source et destination doivent être différents');

  // Cumul par article (un article saisi sur deux lignes est contrôlé en une fois).
  const parArticle = new Map();
  for (const l of lines) parArticle.set(l.article_id, (parArticle.get(l.article_id) || 0) + Number(l.quantite));

  return withTransaction(async (c) => {
    for (const [article_id, qte] of parArticle) {
      const { rows: bal } = await c.query(
        `SELECT qte_disponible FROM stock_balances
          WHERE article_id = $1 AND depot_id = $2 FOR UPDATE`,
        [article_id, depot_from],
      );
      const dispo = Number(bal[0]?.qte_disponible ?? 0);
      if (dispo < qte) {
        const { rows: art } = await c.query(`SELECT code FROM articles WHERE id = $1`, [article_id]);
        throw new HttpError(400, `Stock insuffisant pour ${art[0]?.code ?? 'un article'} au dépôt source : ${dispo} disponible(s), ${qte} demandé(s)`);
      }
    }

    const numero = await nextNumero(c);
    const t = await c.query(
      `INSERT INTO transfers(numero, statut, depot_from, depot_to)
       VALUES ($1,'EXPÉDIÉ',$2,$3) RETURNING *`,
      [numero, depot_from, depot_to],
    );
    const transfer = t.rows[0];

    for (const l of lines) {
      await c.query(
        `INSERT INTO transfer_lines(transfer_id, article_id, quantite) VALUES ($1,$2,$3)`,
        [transfer.id, l.article_id, l.quantite],
      );
    }

    for (const [article_id, qte] of parArticle) {
      await c.query(
        `UPDATE stock_balances SET qte_disponible = qte_disponible - $3, updated_at = now()
          WHERE article_id = $1 AND depot_id = $2`,
        [article_id, depot_from, qte],
      );
      await c.query(
        `INSERT INTO stock_balances(article_id, depot_id, qte_disponible, qte_reservee, qte_transit)
         VALUES ($1, $2, 0, 0, $3)
         ON CONFLICT (article_id, depot_id)
         DO UPDATE SET qte_transit = stock_balances.qte_transit + $3, updated_at = now()`,
        [article_id, depot_to, qte],
      );
      await c.query(
        `INSERT INTO stock_movements(type_mouvement, article_id, depot_id, quantite, reference_doc, user_id)
         VALUES ('TRANSFERT_SORTANT',$1,$2,$3,$4,$5)`,
        [article_id, depot_from, qte, numero, user_id || null],
      );
    }

    return transfer;
  });
}

/* Accusé de réception : le stock en transit devient disponible au dépôt destination. */
async function receive(id, { user_id } = {}) {
  return withTransaction(async (c) => {
    const { rows } = await c.query(`SELECT * FROM transfers WHERE id = $1 FOR UPDATE`, [id]);
    const transfer = rows[0];
    if (!transfer) throw new HttpError(404, 'Transfert introuvable');
    if (transfer.statut !== 'EXPÉDIÉ') {
      throw new HttpError(400, `Le transfert ${transfer.numero} est en statut ${transfer.statut} : réception impossible`);
    }

    const { rows: lignes } = await c.query(
      `SELECT article_id, SUM(quantite) AS qte FROM transfer_lines WHERE transfer_id = $1 GROUP BY article_id`,
      [id],
    );
    for (const l of lignes) {
      await c.query(
        `UPDATE stock_balances
            SET qte_transit = GREATEST(qte_transit - $3, 0),
                qte_disponible = qte_disponible + $3,
                updated_at = now()
          WHERE article_id = $1 AND depot_id = $2`,
        [l.article_id, transfer.depot_to, l.qte],
      );
      await c.query(
        `INSERT INTO stock_movements(type_mouvement, article_id, depot_id, quantite, reference_doc, user_id)
         VALUES ('TRANSFERT_ENTRANT',$1,$2,$3,$4,$5)`,
        [l.article_id, transfer.depot_to, l.qte, transfer.numero, user_id || null],
      );
    }

    const { rows: upd } = await c.query(
      `UPDATE transfers SET statut = 'REÇU', updated_at = now() WHERE id = $1 RETURNING *`,
      [id],
    );
    return upd[0];
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
  const { rows } = await query(`SELECT numero, statut FROM transfers WHERE id = $1`, [id]);
  if (!rows[0]) throw new HttpError(404, 'Transfert introuvable');
  if (STOCK_ENGAGE.includes(rows[0].statut)) {
    throw new HttpError(400, `Impossible de supprimer ${rows[0].numero} : le stock a déjà été déplacé (statut ${rows[0].statut})`);
  }
  await query(`DELETE FROM transfers WHERE id = $1`, [id]);
}

module.exports = { list, findById, create, receive, updateStatut, remove };
