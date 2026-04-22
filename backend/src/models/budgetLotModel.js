const { query } = require('../db/pool');

async function list({ project_id } = {}) {
  const params = [];
  let where = '1=1';
  if (project_id) {
    params.push(project_id);
    where += ` AND bl.project_id = $${params.length}`;
  }
  const { rows } = await query(
    `SELECT bl.*, p.nom AS project_nom
       FROM budget_lots bl
       JOIN projects p ON p.id = bl.project_id
      WHERE ${where}
      ORDER BY bl.code`,
    params,
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT bl.*, p.nom AS project_nom
       FROM budget_lots bl
       JOIN projects p ON p.id = bl.project_id
      WHERE bl.id = $1`,
    [id],
  );
  return rows[0] || null;
}

async function create(bl) {
  const { rows } = await query(
    `INSERT INTO budget_lots(project_id, code, libelle, montant_prevu)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [bl.project_id, bl.code, bl.libelle, bl.montant_prevu],
  );
  return rows[0];
}

async function update(id, bl) {
  const sets = ['updated_at = now()'];
  const params = [id];
  const add = (col, val) => { params.push(val ?? null); sets.push(`${col} = $${params.length}`); };
  if (bl.code          !== undefined) add('code',          bl.code);
  if (bl.libelle       !== undefined) add('libelle',       bl.libelle);
  if (bl.montant_prevu !== undefined) add('montant_prevu', bl.montant_prevu);
  const { rows } = await query(
    `UPDATE budget_lots SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  );
  return rows[0] || null;
}

async function remove(id) {
  await query(`DELETE FROM budget_lots WHERE id = $1`, [id]);
}

module.exports = { list, findById, create, update, remove };
