const { query } = require('../db/pool');

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
       ea.site_id   AS chantier_id,
       s.nom        AS chantier_nom,
       u.nom        AS affecte_a
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

async function findById(id) {
  const { rows } = await query(
    `SELECT e.*, COALESCE(e.designation, a.designation, e.code_inventaire) AS designation_resolved
     FROM equipments e LEFT JOIN articles a ON a.id = e.article_id WHERE e.id = $1`,
    [id],
  );
  return rows[0] || null;
}

async function create({ code_inventaire, designation, etat, article_id }) {
  const { rows } = await query(
    `INSERT INTO equipments(code_inventaire, designation, etat, article_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [code_inventaire, designation ?? null, etat, article_id ?? null],
  );
  return rows[0];
}

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

module.exports = { list, findById, create, update };
