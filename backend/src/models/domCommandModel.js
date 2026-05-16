const { query } = require('../db/pool');

async function list({ device_id, limit = 50 } = {}) {
  const params = [];
  const wheres = [];
  if (device_id) { params.push(device_id); wheres.push(`c.device_id = $${params.length}`); }
  params.push(limit);
  const where = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';
  const { rows } = await query(`
    SELECT c.*, d.name AS device_name, u.nom AS sent_by_name
      FROM dom_commands c
      JOIN dom_devices d ON d.id = c.device_id
      LEFT JOIN users u ON u.id = c.sent_by
     ${where}
     ORDER BY c.sent_at DESC
     LIMIT $${params.length}
  `, params);
  return rows;
}

async function create(c) {
  const { rows } = await query(`
    INSERT INTO dom_commands(device_id, command, payload, status, sent_by, reason)
    VALUES($1,$2,$3,'PENDING',$4,$5) RETURNING *
  `, [c.device_id, c.command, c.payload ? JSON.stringify(c.payload) : null, c.sent_by ?? null, c.reason ?? null]);
  return rows[0];
}

async function updateStatus(id, status, executedAt) {
  const { rows } = await query(`
    UPDATE dom_commands SET status = $2, executed_at = $3 WHERE id = $1 RETURNING *
  `, [id, status, executedAt ?? null]);
  return rows[0] || null;
}

async function createWithHistory(c) {
  const cmd = await create(c);
  const isOnline = c._device_status === 'online';
  const finalStatus = isOnline ? 'EXECUTED' : 'FAILED';
  return updateStatus(cmd.id, finalStatus, isOnline ? new Date().toISOString() : null);
}

module.exports = { list, create, updateStatus, createWithHistory };
