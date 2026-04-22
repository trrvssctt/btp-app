const { query } = require('../db/pool');

async function list({ site_id } = {}) {
  const params = [];
  let where = '1=1';
  if (site_id) {
    params.push(site_id);
    where += ` AND p.site_id = $${params.length}`;
  }
  const { rows } = await query(
    `SELECT p.*, s.nom AS site_nom
       FROM phases p
       JOIN sites s ON s.id = p.site_id
      WHERE ${where}
      ORDER BY p.ordre`,
    params,
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT p.*, s.nom AS site_nom
       FROM phases p
       JOIN sites s ON s.id = p.site_id
      WHERE p.id = $1`,
    [id],
  );
  return rows[0] || null;
}

async function create(p) {
  const { rows } = await query(
    `INSERT INTO phases(site_id, libelle, ordre)
     VALUES ($1,$2,$3) RETURNING *`,
    [p.site_id, p.libelle, p.ordre || 0],
  );
  return rows[0];
}

async function update(id, p) {
  const sets = ['updated_at = now()'];
  const params = [id];
  const add = (col, val) => { params.push(val ?? null); sets.push(`${col} = $${params.length}`); };
  if (p.libelle !== undefined) add('libelle', p.libelle);
  if (p.ordre   !== undefined) add('ordre',   p.ordre);
  const { rows } = await query(
    `UPDATE phases SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  );
  return rows[0] || null;
}

async function remove(id) {
  await query(`DELETE FROM phases WHERE id = $1`, [id]);
}

module.exports = { list, findById, create, update, remove };
