const { query } = require('../db/pool');

async function list() {
  const { rows } = await query(`SELECT * FROM depots ORDER BY code`);
  return rows;
}

async function findById(id) {
  const { rows } = await query(`SELECT * FROM depots WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create(d) {
  const { rows } = await query(
    `INSERT INTO depots(code, nom, type_depot, localisation)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [d.code, d.nom, d.type_depot, d.localisation],
  );
  return rows[0];
}

async function update(id, d) {
  const sets = ['updated_at = now()'];
  const params = [id];
  const add = (col, val) => { params.push(val ?? null); sets.push(`${col} = $${params.length}`); };
  if (d.code        !== undefined) add('code',        d.code);
  if (d.nom         !== undefined) add('nom',         d.nom);
  if (d.type_depot  !== undefined) add('type_depot',  d.type_depot);
  if (d.localisation !== undefined) add('localisation', d.localisation);
  const { rows } = await query(
    `UPDATE depots SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  );
  return rows[0] || null;
}

async function remove(id) {
  await query(`DELETE FROM depots WHERE id = $1`, [id]);
}

module.exports = { list, findById, create, update, remove };
