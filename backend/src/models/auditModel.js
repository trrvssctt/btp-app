const { query } = require('../db/pool');

async function list({ action, entity_type, search, limit = 200 } = {}) {
  const params = [];
  const conds = [];

  if (action && action !== 'ALL') {
    params.push(action);
    conds.push(`al.action = $${params.length}`);
  }
  if (entity_type && entity_type !== 'ALL') {
    params.push(entity_type);
    conds.push(`al.entity_type = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conds.push(`(u.nom ILIKE $${params.length} OR al.reference ILIKE $${params.length} OR al.detail ILIKE $${params.length})`);
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  params.push(limit);

  const { rows } = await query(
    `SELECT
       al.id,
       al.action,
       al.entity_type,
       al.reference,
       al.detail,
       al.ip,
       al.created_at,
       u.nom        AS utilisateur,
       r.code       AS role
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_id
     LEFT JOIN user_roles ur ON ur.user_id = al.actor_id
     LEFT JOIN roles r ON r.id = ur.role_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return rows;
}

async function create({ actor_id, action, entity_type, entity_id, reference, detail, ip } = {}) {
  const { rows } = await query(
    `INSERT INTO audit_logs(actor_id, action, entity_type, entity_id, reference, detail, ip)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [actor_id ?? null, action, entity_type, entity_id ?? null, reference ?? null, detail ?? null, ip ?? null],
  );
  return rows[0];
}

module.exports = { list, create };
