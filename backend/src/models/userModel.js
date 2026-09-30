const { query, withTransaction } = require('../db/pool');

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

async function listAll() {
  const { rows } = await query(
    `SELECT u.id, u.email, u.nom, u.actif, u.created_at,
            COALESCE(array_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS roles,
            COALESCE(array_agg(DISTINCT r.libelle) FILTER (WHERE r.libelle IS NOT NULL), '{}') AS role_libelles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
      GROUP BY u.id
      ORDER BY u.nom`,
  );
  return rows;
}

// Annuaire : utilisateurs actifs, sans email ni données de compte.
async function listDirectory() {
  const { rows } = await query(
    `SELECT u.id, u.nom, u.actif,
            COALESCE(array_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.actif
      GROUP BY u.id
      ORDER BY u.nom`,
  );
  return rows;
}

async function update(id, { email, nom, actif }) {
  const { rows } = await query(
    `UPDATE users
        SET email = COALESCE($2, email),
            nom = COALESCE($3, nom),
            actif = COALESCE($4, actif),
            updated_at = now()
      WHERE id = $1
      RETURNING id, email, nom, actif, created_at`,
    [id, email ?? null, nom ?? null, actif ?? null],
  );
  return rows[0] || null;
}

async function updatePassword(id, password_hash) {
  await query(`UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, [id, password_hash]);
}

async function remove(id) {
  return withTransaction(async (c) => {
    // Détacher les entrées d'audit (préserve la traçabilité sans bloquer la suppression)
    await c.query(`UPDATE audit_logs SET actor_id = NULL WHERE actor_id = $1`, [id]);
    // user_roles et user_scope ont ON DELETE CASCADE ; les données métier (requests,
    // approvals, mouvements...) bloqueront la suppression via FK -> géré dans le contrôleur.
    await c.query(`DELETE FROM users WHERE id = $1`, [id]);
  });
}

// Remplace tous les rôles d'un utilisateur par la liste fournie (codes de rôle)
async function syncRoles(userId, roleCodes = []) {
  await query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
  for (const code of roleCodes) {
    const roleId = await getRoleIdByCode(code);
    if (roleId) await attachRole(userId, roleId);
  }
}

module.exports = { listDirectory,
  findByEmail, findById, create, getRoleIdByCode, attachRole, getRolesAndPermissions,
  listAll, update, updatePassword, remove, syncRoles,
};
