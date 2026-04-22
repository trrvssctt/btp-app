const { query } = require('../db/pool');

async function list() {
  const { rows } = await query(`SELECT * FROM article_families ORDER BY code`);
  return rows;
}

async function findById(id) {
  const { rows } = await query(`SELECT * FROM article_families WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create(f) {
  const { rows } = await query(
    `INSERT INTO article_families(code, libelle) VALUES ($1,$2) RETURNING *`,
    [f.code, f.libelle],
  );
  return rows[0];
}

async function update(id, f) {
  const sets = ['updated_at = now()'];
  const params = [id];
  const add = (col, val) => { params.push(val ?? null); sets.push(`${col} = $${params.length}`); };
  if (f.code    !== undefined) add('code',    f.code);
  if (f.libelle !== undefined) add('libelle', f.libelle);
  const { rows } = await query(
    `UPDATE article_families SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  );
  return rows[0] || null;
}

async function remove(id) {
  await query(`DELETE FROM article_families WHERE id = $1`, [id]);
}

module.exports = { list, findById, create, update, remove };
