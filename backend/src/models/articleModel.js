const { query } = require('../db/pool');

async function list({ search } = {}) {
  const params = [];
  let where = 'WHERE a.actif = true';
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (a.code ILIKE $${params.length} OR a.designation ILIKE $${params.length})`;
  }
  const { rows } = await query(
    `SELECT a.*, f.libelle AS famille, u.code AS unite
       FROM articles a
       LEFT JOIN article_families f ON f.id = a.famille_id
       LEFT JOIN units u ON u.id = a.unite_id
      ${where}
      ORDER BY a.code`,
    params,
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(`SELECT * FROM articles WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create(a) {
  const { rows } = await query(
    `INSERT INTO articles(code, designation, famille_id, unite_id, nature, prix_moyen, seuil_min)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [a.code, a.designation, a.famille_id ?? null, a.unite_id ?? null, a.nature, a.prix_moyen ?? null, a.seuil_min ?? null],
  );
  return rows[0];
}

async function update(id, a) {
  const sets = ['updated_at = now()'];
  const params = [id];
  const add = (col, val) => { params.push(val ?? null); sets.push(`${col} = $${params.length}`); };
  if (a.code !== undefined)        add('code', a.code);
  if (a.designation !== undefined) add('designation', a.designation);
  if (a.famille_id !== undefined)  add('famille_id', a.famille_id);
  if (a.unite_id !== undefined)    add('unite_id', a.unite_id);
  if (a.nature !== undefined)      add('nature', a.nature);
  if (a.prix_moyen !== undefined)  add('prix_moyen', a.prix_moyen);
  if (a.seuil_min !== undefined)   add('seuil_min', a.seuil_min);
  if (a.actif !== undefined)       add('actif', a.actif);
  const { rows } = await query(
    `UPDATE articles SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  );
  return rows[0] || null;
}

async function remove(id) {
  await query(`UPDATE articles SET actif = false, updated_at = now() WHERE id = $1`, [id]);
}

module.exports = { list, findById, create, update, remove };
