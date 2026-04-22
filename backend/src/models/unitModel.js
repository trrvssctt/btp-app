const { query } = require('../db/pool');

async function list() {
  const { rows } = await query(`SELECT * FROM units ORDER BY code`);
  return rows;
}

async function findById(id) {
  const { rows } = await query(`SELECT * FROM units WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create(u) {
  const { rows } = await query(
    `INSERT INTO units(code, libelle) VALUES ($1,$2) RETURNING *`,
    [u.code, u.libelle],
  );
  return rows[0];
}

async function update(id, u) {
  const sets = ['updated_at = now()'];
  const params = [id];
  const add = (col, val) => { params.push(val ?? null); sets.push(`${col} = $${params.length}`); };
  if (u.code    !== undefined) add('code',    u.code);
  if (u.libelle !== undefined) add('libelle', u.libelle);
  const { rows } = await query(
    `UPDATE units SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  );
  return rows[0] || null;
}

async function remove(id) {
  await query(`DELETE FROM units WHERE id = $1`, [id]);
}

module.exports = { list, findById, create, update, remove };
