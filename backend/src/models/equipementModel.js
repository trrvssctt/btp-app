const { query, withTransaction } = require('../db/pool');
const HttpError = require('../utils/HttpError');

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

// ─── Codes inventaire : EQ-<FAMILLE>-NNN, numérotés par famille ──────────────
const CODE_RE = '^EQ-([A-Z0-9]+)-([0-9]+)$';

const formatCode = (famille, n) => `EQ-${famille}-${String(n).padStart(3, '0')}`;

// Familles existantes avec le prochain code de chacune.
async function listFamilles() {
  const { rows } = await query(
    `SELECT (regexp_match(code_inventaire, '${CODE_RE}'))[1] AS famille,
            COUNT(*)::int AS nb,
            MAX((regexp_match(code_inventaire, '${CODE_RE}'))[2]::int) AS dernier,
            (ARRAY_AGG(COALESCE(designation, code_inventaire) ORDER BY code_inventaire))[1] AS exemple
       FROM equipments
      WHERE code_inventaire ~ '${CODE_RE}'
      GROUP BY 1
      ORDER BY 1`,
  );
  return rows.map((r) => ({ ...r, prochain_code: formatCode(r.famille, r.dernier + 1) }));
}

async function nextCode(c, famille) {
  const { rows } = await c.query(
    `SELECT COALESCE(MAX((regexp_match(code_inventaire, '${CODE_RE}'))[2]::int), 0) + 1 AS n
       FROM equipments
      WHERE (regexp_match(code_inventaire, '${CODE_RE}'))[1] = $1`,
    [famille],
  );
  return formatCode(famille, rows[0].n);
}

// ─── Création ─────────────────────────────────────────────────────────────────
// Le code est toujours généré par le serveur à partir de la famille. Le verrou
// consultatif (par famille) empêche deux créations simultanées d'obtenir le même numéro.
async function create({ famille, designation, etat, article_id }) {
  return withTransaction(async (c) => {
    await c.query(`SELECT pg_advisory_xact_lock(hashtext('equipments:' || $1))`, [famille]);
    const code = await nextCode(c, famille);
    const { rows } = await c.query(
      `INSERT INTO equipments(code_inventaire, designation, etat, article_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [code, designation ?? null, etat ?? 'DISPONIBLE', article_id ?? null],
    );
    return rows[0];
  });
}

// ─── Mise à jour simple (état / désignation) ──────────────────────────────────
// Un changement d'état est tracé dans audit_logs (action CHANGEMENT_ETAT) dans la
// même transaction : c'est la source de l'historique des états de l'équipement.
async function update(id, { etat, designation, commentaire, actor_id }) {
  return withTransaction(async (c) => {
    const before = (await c.query(`SELECT * FROM equipments WHERE id = $1 FOR UPDATE`, [id])).rows[0];
    if (!before) return null;

    if (etat !== undefined && etat !== before.etat) {
      // AFFECTE n'est posé/levé que par l'affectation et le retour (qui gèrent la période d'affectation).
      if (etat === 'AFFECTE') throw new HttpError(400, "Utilisez l'action « Affecter » pour affecter un équipement");
      if (before.etat === 'AFFECTE') {
        throw new HttpError(400, `${before.code_inventaire} est affecté à un chantier : enregistrez d'abord son retour`);
      }
    }

    const sets = ['updated_at = now()'];
    const params = [id];
    const add = (col, val) => { params.push(val ?? null); sets.push(`${col} = $${params.length}`); };
    if (etat !== undefined)        add('etat', etat);
    if (designation !== undefined) add('designation', designation);
    const { rows } = await c.query(
      `UPDATE equipments SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      params,
    );

    if (etat !== undefined && etat !== before.etat) {
      await c.query(
        `INSERT INTO audit_logs(actor_id, action, entity_type, entity_id, reference, detail, payload_before, payload_after)
         VALUES ($1, 'CHANGEMENT_ETAT', 'equipements', $2, $3, $4, $5, $6)`,
        [actor_id ?? null, id, before.code_inventaire, commentaire ?? null,
         JSON.stringify({ etat: before.etat }), JSON.stringify({ etat })],
      );
    }
    return rows[0];
  });
}

// ─── Historique des changements d'état ───────────────────────────────────────
async function listStateChanges(equipmentId) {
  const { rows } = await query(
    `SELECT al.id, al.created_at, al.detail AS commentaire,
            al.payload_before->>'etat' AS etat_avant,
            al.payload_after->>'etat'  AS etat_apres,
            u.nom AS user_nom
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_id
      WHERE al.entity_type = 'equipements' AND al.entity_id = $1 AND al.action = 'CHANGEMENT_ETAT'
      ORDER BY al.created_at DESC`,
    [equipmentId],
  );
  return rows;
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
    if (!eq) throw new HttpError(404, 'Équipement introuvable');
    if (eq.etat !== 'DISPONIBLE') {
      throw new HttpError(422, `L'équipement doit être DISPONIBLE pour être affecté (état actuel : ${eq.etat})`);
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
async function closeAssignment(assignmentId, { date_fin, etat_retour, commentaire }) {
  return withTransaction(async (c) => {
    const aff = (await c.query(
      `SELECT ea.*, to_char(ea.date_debut, 'YYYY-MM-DD') AS debut_iso, e.etat AS eq_etat FROM equipment_assignments ea
       JOIN equipments e ON e.id = ea.equipment_id
       WHERE ea.id = $1 AND ea.date_fin IS NULL FOR UPDATE`,
      [assignmentId],
    )).rows[0];

    if (!aff) throw new HttpError(404, 'Affectation active introuvable');

    const fin = date_fin ?? new Date().toISOString().slice(0, 10);
    const debut = aff.debut_iso;
    if (fin < debut) throw new HttpError(400, `La date de retour (${fin}) est antérieure au début de l'affectation (${debut})`);

    // Clôturer l'affectation — le commentaire de retour complète celui de l'affectation
    await c.query(
      `UPDATE equipment_assignments
          SET date_fin = $2,
              commentaire = CASE WHEN $3::text IS NULL THEN commentaire
                                 ELSE CONCAT_WS(E'\n', commentaire, 'Retour : ' || $3::text) END
        WHERE id = $1`,
      [assignmentId, fin, commentaire ?? null],
    );

    // Mettre à jour l'état de l'équipement
    const nouvelEtat = etat_retour ?? 'DISPONIBLE';
    await c.query(`UPDATE equipments SET etat = $2, updated_at = now() WHERE id = $1`, [aff.equipment_id, nouvelEtat]);

    return { assignment_id: assignmentId, equipment_id: aff.equipment_id, etat: nouvelEtat };
  });
}

module.exports = { list, findById, listFamilles, create, update, listStateChanges, listAssignments, createAssignment, closeAssignment };
