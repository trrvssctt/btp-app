const { query } = require('../db/pool');

async function list() {
  const { rows } = await query(`SELECT * FROM suppliers WHERE actif = true ORDER BY raison_sociale`);
  return rows;
}

async function findById(id) {
  const { rows } = await query(`SELECT * FROM suppliers WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create(s) {
  const { rows } = await query(
    `INSERT INTO suppliers(code, raison_sociale, contact, email, telephone)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [s.code, s.raison_sociale, s.contact, s.email, s.telephone],
  );
  return rows[0];
}

async function update(id, s) {
  const sets = ['updated_at = now()'];
  const params = [id];
  const add = (col, val) => { params.push(val ?? null); sets.push(`${col} = $${params.length}`); };
  if (s.code           !== undefined) add('code',           s.code);
  if (s.raison_sociale !== undefined) add('raison_sociale', s.raison_sociale);
  if (s.contact        !== undefined) add('contact',        s.contact);
  if (s.email          !== undefined) add('email',          s.email);
  if (s.telephone      !== undefined) add('telephone',      s.telephone);
  const { rows } = await query(
    `UPDATE suppliers SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  );
  return rows[0] || null;
}

async function remove(id) {
  await query(`UPDATE suppliers SET actif=false, updated_at=now() WHERE id = $1`, [id]);
}

module.exports = { list, findById, create, update, remove };
