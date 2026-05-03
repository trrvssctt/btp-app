const { query, withTransaction } = require('../db/pool');

// ─── Lecture liste ────────────────────────────────────────────────────────────
async function list({ search } = {}) {
  const params = [];
  let where = '';
  if (search) {
    params.push(`%${search}%`);
    where = `WHERE e.code_inventaire ILIKE $1 OR COALESCE(e.designation, a.designation, '') ILIKE $1`;
  }
  const { rows } = await query(
    `SELECT
       e.id,
       e.code_inventaire,
       COALESCE(e.designation, a.designation, e.code_inventaire) AS designation,
       e.etat,
       e.created_at,
       ea.id        AS affectation_id,
       ea.site_id   AS chantier_id,
       ea.date_debut,
       ea.request_id,
       s.nom        AS chantier_nom,
       u.nom        AS affecte_a,
       u.id         AS affecte_user_id
     FROM equipments e
     LEFT JOIN articles a ON a.id = e.article_id
     LEFT JOIN equipment_assignments ea ON ea.equipment_id = e.id AND ea.date_fin IS NULL
     LEFT JOIN sites s ON s.id = ea.site_id
     LEFT JOIN users u ON u.id = ea.user_id
     ${where}
     ORDER BY e.code_inventaire`,
    params,
  );
  return rows;
}

// ─── Fiche détail ─────────────────────────────────────────────────────────────
async function findById(id) {
  const { rows } = await query(
    `SELECT e.*,
            COALESCE(e.designation, a.designation, e.code_inventaire) AS designation_resolved,
            a.code AS article_code, a.designation AS article_designation
     FROM equipments e
     LEFT JOIN articles a ON a.id = e.article_id
     WHERE e.id = $1`,
    [id],
  );
  return rows[0] || null;
}

// ─── Création ─────────────────────────────────────────────────────────────────
async function create({ code_inventaire, designation, etat, article_id }) {
  const { rows } = await query(
    `INSERT INTO equipments(code_inventaire, designation, etat, article_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [code_inventaire, designation ?? null, etat ?? 'DISPONIBLE', article_id ?? null],
  );
  return rows[0];
}

// ─── Mise à jour simple (état / désignation) ──────────────────────────────────
async function update(id, { etat, designation }) {
  const sets = ['updated_at = now()'];
  const params = [id];
  const add = (col, val) => { params.push(val ?? null); sets.push(`${col} = $${params.length}`); };
  if (etat !== undefined)        add('etat', etat);
  if (designation !== undefined) add('designation', designation);
  const { rows } = await query(
    `UPDATE equipments SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  );
  return rows[0] || null;
}

// ─── Historique des affectations ─────────────────────────────────────────────
async function listAssignments(equipmentId) {
  const { rows } = await query(
    `SELECT
       ea.id,
       ea.date_debut,
       ea.date_fin,
       ea.commentaire,
       ea.created_at,
       ea.request_id,
       s.id   AS site_id,
       s.code AS site_code,
       s.nom  AS site_nom,
       u.id   AS user_id,
       u.nom  AS user_nom,
       cb.nom AS created_by_nom,
       r.numero AS request_numero
     FROM equipment_assignments ea
     LEFT JOIN sites   s  ON s.id  = ea.site_id
     LEFT JOIN users   u  ON u.id  = ea.user_id
     LEFT JOIN users   cb ON cb.id = ea.created_by
     LEFT JOIN requests r ON r.id  = ea.request_id
     WHERE ea.equipment_id = $1
     ORDER BY ea.date_debut DESC, ea.created_at DESC`,
    [equipmentId],
  );
  return rows;
}

// ─── Créer une affectation (UC-11) ───────────────────────────────────────────
async function createAssignment({ equipment_id, site_id, user_id, date_debut, commentaire, created_by, request_id }) {
  return withTransaction(async (c) => {
    // Vérifier que l'équipement est DISPONIBLE
    const eq = (await c.query(`SELECT etat FROM equipments WHERE id = $1 FOR UPDATE`, [equipment_id])).rows[0];
    if (!eq) throw Object.assign(new Error('Équipement introuvable'), { status: 404 });
    if (eq.etat !== 'DISPONIBLE') {
      throw Object.assign(
        new Error(`L'équipement doit être DISPONIBLE pour être affecté (état actuel : ${eq.etat})`),
        { status: 422 },
      );
    }

    // Clôturer toute affectation ouverte résiduelle (sécurité)
    await c.query(
      `UPDATE equipment_assignments SET date_fin = now()::date WHERE equipment_id = $1 AND date_fin IS NULL`,
      [equipment_id],
    );

    // Créer la nouvelle affectation
    const { rows } = await c.query(
      `INSERT INTO equipment_assignments(equipment_id, site_id, user_id, date_debut, commentaire, created_by, request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [equipment_id, site_id ?? null, user_id ?? null, date_debut, commentaire ?? null, created_by ?? null, request_id ?? null],
    );

    // Passer l'équipement à AFFECTE
    await c.query(`UPDATE equipments SET etat = 'AFFECTE', updated_at = now() WHERE id = $1`, [equipment_id]);

    return rows[0];
  });
}

// ─── Retour / clôture d'affectation ──────────────────────────────────────────
async function closeAssignment(assignmentId, { date_fin, etat_retour, commentaire, updated_by }) {
  return withTransaction(async (c) => {
    const aff = (await c.query(
      `SELECT ea.*, e.etat AS eq_etat FROM equipment_assignments ea
       JOIN equipments e ON e.id = ea.equipment_id
       WHERE ea.id = $1 AND ea.date_fin IS NULL FOR UPDATE`,
      [assignmentId],
    )).rows[0];

    if (!aff) throw Object.assign(new Error('Affectation active introuvable'), { status: 404 });

    // Clôturer l'affectation
    await c.query(
      `UPDATE equipment_assignments SET date_fin = $2, commentaire = COALESCE($3, commentaire) WHERE id = $1`,
      [assignmentId, date_fin ?? new Date().toISOString().slice(0, 10), commentaire ?? null],
    );

    // Mettre à jour l'état de l'équipement
    const nouvelEtat = etat_retour ?? 'DISPONIBLE';
    await c.query(`UPDATE equipments SET etat = $2, updated_at = now() WHERE id = $1`, [aff.equipment_id, nouvelEtat]);

    return { assignment_id: assignmentId, equipment_id: aff.equipment_id, etat: nouvelEtat };
  });
}

module.exports = { list, findById, create, update, listAssignments, createAssignment, closeAssignment };
