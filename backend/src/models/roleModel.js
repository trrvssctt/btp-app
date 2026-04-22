const { query } = require('../db/pool');

async function listRoles() {
  const { rows } = await query(`SELECT * FROM roles ORDER BY code`);
  return rows;
}

async function getRoleById(id) {
  const { rows } = await query(`SELECT * FROM roles WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function createRole(r) {
  const { rows } = await query(
    `INSERT INTO roles(code, libelle) VALUES ($1,$2) RETURNING *`,
    [r.code, r.libelle],
  );
  return rows[0];
}

async function updateRole(id, r) {
  const { rows } = await query(
    `UPDATE roles SET code=$2, libelle=$3 WHERE id=$1 RETURNING *`,
    [id, r.code, r.libelle],
  );
  return rows[0] || null;
}

async function removeRole(id) {
  await query(`DELETE FROM roles WHERE id = $1`, [id]);
}

async function listPermissions() {
  const { rows } = await query(`SELECT * FROM permissions ORDER BY code`);
  return rows;
}

async function assignPermission(roleId, permissionId) {
  await query(
    `INSERT INTO role_permissions(role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [roleId, permissionId],
  );
}

async function removePermission(roleId, permissionId) {
  await query(
    `DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2`,
    [roleId, permissionId],
  );
}

module.exports = {
  listRoles,
  getRoleById,
  createRole,
  updateRole,
  removeRole,
  listPermissions,
  assignPermission,
  removePermission,
};
