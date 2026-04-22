const { query } = require('../db/pool');

async function list({ project_id } = {}) {
  const params = [];
  let where = '1=1';
  if (project_id) {
    params.push(project_id);
    where += ` AND s.project_id = $${params.length}`;
  }
  const { rows } = await query(
    `SELECT s.*, p.code AS project_code, p.nom AS project_nom
       FROM sites s
       JOIN projects p ON p.id = s.project_id
      WHERE ${where}
      ORDER BY s.code`,
    params,
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT s.*, p.code AS project_code, p.nom AS project_nom
       FROM sites s
       JOIN projects p ON p.id = s.project_id
      WHERE s.id = $1`,
    [id],
  );
  return rows[0] || null;
}

async function create(s) {
  const { rows } = await query(
    `INSERT INTO sites(project_id, code, nom, localisation, responsable, statut)
     VALUES ($1,$2,$3,$4,$5,COALESCE($6,'ACTIF')) RETURNING *`,
    [s.project_id, s.code, s.nom, s.localisation, s.responsable, s.statut],
  );
  return rows[0];
}

async function update(id, s) {
  const sets = ['updated_at = now()'];
  const params = [id];
  const add = (col, val) => { params.push(val ?? null); sets.push(`${col} = $${params.length}`); };
  if (s.code         !== undefined) add('code',         s.code);
  if (s.nom          !== undefined) add('nom',          s.nom);
  if (s.localisation !== undefined) add('localisation', s.localisation);
  if (s.responsable  !== undefined) add('responsable',  s.responsable);
  if (s.statut       !== undefined) add('statut',       s.statut);
  const { rows } = await query(
    `UPDATE sites SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  );
  return rows[0] || null;
}

async function remove(id) {
  await query(`DELETE FROM sites WHERE id = $1`, [id]);
}

module.exports = { list, findById, create, update, remove };
