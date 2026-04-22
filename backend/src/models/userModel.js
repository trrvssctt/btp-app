const { query } = require('../db/pool');

async function findByEmail(email) {
  const { rows } = await query(`SELECT * FROM users WHERE email = $1`, [email]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(`SELECT id, email, nom, actif, created_at FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create({ email, nom, password_hash }) {
  const { rows } = await query(
    `INSERT INTO users(email, nom, password_hash) VALUES ($1,$2,$3)
     RETURNING id, email, nom, actif, created_at`,
    [email, nom, password_hash],
  );
  return rows[0];
}

async function getRoleIdByCode(code) {
  const { rows } = await query(`SELECT id FROM roles WHERE code = $1`, [code]);
  return rows[0]?.id || null;
}

async function attachRole(userId, roleId) {
  await query(
    `INSERT INTO user_roles(user_id, role_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [userId, roleId],
  );
}

async function getRolesAndPermissions(userId) {
  const { rows } = await query(
    `SELECT COALESCE(array_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS roles,
            COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL), '{}') AS permissions
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE u.id = $1`,
    [userId],
  );
  return rows[0] || { roles: [], permissions: [] };
}

module.exports = { findByEmail, findById, create, getRoleIdByCode, attachRole, getRolesAndPermissions };
