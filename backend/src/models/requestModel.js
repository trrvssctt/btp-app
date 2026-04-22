const { query, withTransaction } = require('../db/pool');

async function list({ statut, project_id, requester_id } = {}) {
  const params = [];
  const where = [];
  if (statut) { params.push(statut); where.push(`r.statut = $${params.length}`); }
  if (project_id) { params.push(project_id); where.push(`r.project_id = $${params.length}`); }
  if (requester_id) { params.push(requester_id); where.push(`r.requester_id = $${params.length}`); }

  const { rows } = await query(
    `SELECT r.*,
            u.nom AS requester_nom,
            p.code AS project_code, p.nom AS project_nom,
            s.code AS site_code, s.nom AS site_nom,
            COALESCE(l.count, 0)::int AS lignes_count
       FROM requests r
       JOIN users u ON u.id = r.requester_id
       JOIN projects p ON p.id = r.project_id
       JOIN sites s ON s.id = r.site_id
       LEFT JOIN (SELECT request_id, COUNT(*) FROM request_lines GROUP BY request_id) l
              ON l.request_id = r.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY r.created_at DESC`,
    params,
  );
  return rows;
}

async function findById(id) {
  const r = await query(
    `SELECT r.*, u.nom AS requester_nom, p.code AS project_code, p.nom AS project_nom,
            s.code AS site_code, s.nom AS site_nom
       FROM requests r
       JOIN users u ON u.id = r.requester_id
       JOIN projects p ON p.id = r.project_id
       JOIN sites s ON s.id = r.site_id
      WHERE r.id = $1`,
    [id],
  );
  if (!r.rows[0]) return null;
  const lignes = await query(
    `SELECT rl.*, a.code AS article_code, a.designation AS article_designation,
            a.prix_moyen AS article_prix_moyen
       FROM request_lines rl
       LEFT JOIN articles a ON a.id = rl.article_id
      WHERE rl.request_id = $1`,
    [id],
  );
  const approvals = await query(
    `SELECT ap.*, u.nom AS decideur_nom
       FROM approvals ap
       JOIN users u ON u.id = ap.decideur_id
      WHERE ap.request_id = $1
      ORDER BY ap.decided_at`,
    [id],
  );
  return { ...r.rows[0], lignes: lignes.rows, approvals: approvals.rows };
}

async function nextNumero() {
  const { rows } = await query(
    `SELECT COUNT(*)::int + 1 AS n FROM requests
      WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now())`,
  );
  const year = new Date().getFullYear();
  return `DM-${year}-${String(rows[0].n).padStart(4, '0')}`;
}

async function create({ requester_id, project_id, site_id, urgence, motif, date_souhaitee, lignes }) {
  return withTransaction(async (c) => {
    const numero = await nextNumero();
    const r = await c.query(
      `INSERT INTO requests(numero, requester_id, project_id, site_id, statut, urgence, motif, date_souhaitee)
       VALUES ($1,$2,$3,$4,'SOUMISE',$5,$6,$7) RETURNING *`,
      [numero, requester_id, project_id, site_id, urgence, motif, date_souhaitee],
    );
    const req = r.rows[0];
    let montant = 0;
    for (const l of lignes) {
      await c.query(
        `INSERT INTO request_lines(request_id, article_id, designation_libre, qte_demandee)
         VALUES ($1,$2,$3,$4)`,
        [req.id, l.article_id || null, l.designation_libre || null, l.qte_demandee],
      );
      if (l.article_id) {
        const p = await c.query(`SELECT prix_moyen FROM articles WHERE id = $1`, [l.article_id]);
        const prix = Number(p.rows[0]?.prix_moyen || 0);
        montant += prix * Number(l.qte_demandee);
      }
    }
    await c.query(`UPDATE requests SET montant_estime = $2 WHERE id = $1`, [req.id, montant]);
    return { ...req, montant_estime: montant };
  });
}

async function update(id, fields) {
  const sets = [];
  const params = [id];
  if (fields.urgence !== undefined) { params.push(fields.urgence); sets.push(`urgence = $${params.length}`); }
  if (fields.motif !== undefined) { params.push(fields.motif); sets.push(`motif = $${params.length}`); }
  if (fields.date_souhaitee !== undefined) { params.push(fields.date_souhaitee); sets.push(`date_souhaitee = $${params.length}`); }
  if (sets.length === 0) return null;
  sets.push(`updated_at = now()`);
  const { rows } = await query(`UPDATE requests SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
  return rows[0] || null;
}

async function cancel(id) {
  const { rows } = await query(
    `UPDATE requests SET statut = 'REJETEE', updated_at = now() WHERE id = $1 RETURNING *`,
    [id],
  );
  return rows[0] || null;
}

async function addApproval({ request_id, etape, decideur_id, decision, commentaire }) {
  return withTransaction(async (c) => {
    const a = await c.query(
      `INSERT INTO approvals(request_id, etape, decideur_id, decision, commentaire)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [request_id, etape, decideur_id, decision, commentaire],
    );
    let next = null;
    if (decision === 'REJETEE') next = 'REJETEE';
    else if (etape === 'TECHNIQUE' && decision === 'APPROUVEE') next = 'VALIDATION_BUDGETAIRE';
    else if (etape === 'BUDGETAIRE' && decision === 'APPROUVEE') next = 'APPROUVEE';
    else if (etape === 'DIRECTION' && decision === 'APPROUVEE') next = 'APPROUVEE';
    if (next) {
      await c.query(`UPDATE requests SET statut = $2, updated_at = now() WHERE id = $1`, [request_id, next]);
    }

    if (next === 'APPROUVEE') {
      const req = (await c.query(`SELECT site_id, numero FROM requests WHERE id = $1`, [request_id])).rows[0];
      const lignes = (await c.query(
        `SELECT rl.article_id, rl.qte_approuvee, rl.qte_demandee, a.nature
           FROM request_lines rl
           JOIN articles a ON a.id = rl.article_id
          WHERE rl.request_id = $1 AND rl.article_id IS NOT NULL`,
        [request_id],
      )).rows;

      for (const ligne of lignes) {
        if (ligne.nature === 'ACHAT_DIRECT') continue;
        const qte = Number(ligne.qte_approuvee || ligne.qte_demandee);
        if (qte <= 0) continue;

        // Préférer le dépôt du même site, sinon celui avec le plus de stock disponible
        const sb = (await c.query(
          `SELECT sb.id, sb.depot_id, sb.qte_disponible
             FROM stock_balances sb
             JOIN depots d ON d.id = sb.depot_id
            WHERE sb.article_id = $1 AND sb.qte_disponible > 0
            ORDER BY (CASE WHEN d.site_id = $2 THEN 0 ELSE 1 END), sb.qte_disponible DESC
            LIMIT 1`,
          [ligne.article_id, req.site_id],
        )).rows[0];

        if (!sb) continue;

        const qte_res = Math.min(qte, Number(sb.qte_disponible));

        await c.query(
          `INSERT INTO stock_movements(type_mouvement, article_id, depot_id, quantite, reference_doc, site_id, user_id)
           VALUES ('RESERVATION', $1, $2, $3, $4, $5, $6)`,
          [ligne.article_id, sb.depot_id, qte_res, req.numero, req.site_id, decideur_id],
        );

        await c.query(
          `UPDATE stock_balances
              SET qte_disponible = qte_disponible - $1,
                  qte_reservee   = qte_reservee   + $1,
                  updated_at     = now()
            WHERE article_id = $2 AND depot_id = $3`,
          [qte_res, ligne.article_id, sb.depot_id],
        );
      }
    }

    return a.rows[0];
  });
}

async function requestComplement(id, commentaire) {
  const { rows } = await query(
    `UPDATE requests SET statut = 'EN_COMPLEMENT', updated_at = now() WHERE id = $1
     AND statut IN ('VALIDATION_TECHNIQUE','VALIDATION_BUDGETAIRE') RETURNING *`,
    [id],
  );
  return rows[0] || null;
}

async function resubmit(id) {
  const { rows } = await query(
    `UPDATE requests SET statut = 'SOUMISE', updated_at = now() WHERE id = $1
     AND statut = 'EN_COMPLEMENT' RETURNING *`,
    [id],
  );
  return rows[0] || null;
}

module.exports = { list, findById, create, update, cancel, addApproval, requestComplement, resubmit };
