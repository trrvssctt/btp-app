const { query } = require('../db/pool');

async function listForUser(user_id, { type, lu } = {}) {
  const conds = ['(n.user_id = $1 OR n.user_id IS NULL)'];
  const params = [user_id];

  if (type && type !== 'ALL') {
    params.push(type);
    conds.push(`n.type = $${params.length}`);
  }
  if (lu !== undefined && lu !== null) {
    params.push(lu === 'true' || lu === true);
    conds.push(`n.lu = $${params.length}`);
  }

  const { rows } = await query(
    `SELECT n.* FROM notifications n
     WHERE ${conds.join(' AND ')}
     ORDER BY n.created_at DESC
     LIMIT 100`,
    params,
  );
  return rows;
}

async function markRead(id, user_id) {
  const { rows } = await query(
    `UPDATE notifications SET lu = true WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) RETURNING *`,
    [id, user_id],
  );
  return rows[0] || null;
}

async function markAllRead(user_id) {
  await query(
    `UPDATE notifications SET lu = true WHERE (user_id = $1 OR user_id IS NULL) AND lu = false`,
    [user_id],
  );
}

async function create({ user_id, type, titre, message, urgence, entity_type, entity_id }) {
  const { rows } = await query(
    `INSERT INTO notifications(user_id, type, titre, message, urgence, entity_type, entity_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [user_id ?? null, type ?? 'INFO', titre, message, urgence ?? 'INFO', entity_type ?? null, entity_id ?? null],
  );
  return rows[0];
}

module.exports = { listForUser, markRead, markAllRead, create };
