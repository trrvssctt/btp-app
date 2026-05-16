const { query } = require('../db/pool');

async function list({ resolved, severity, building_id } = {}) {
  const params = [];
  const wheres = [];
  if (resolved !== undefined) { params.push(resolved); wheres.push(`a.resolved = $${params.length}`); }
  if (severity)               { params.push(severity); wheres.push(`a.severity = $${params.length}`); }
  if (building_id)            { params.push(building_id); wheres.push(`d.building_id = $${params.length}::uuid`); }

  const where = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';
  const { rows } = await query(`
    SELECT a.*, d.name AS device_name, d.location, d.building_id
      FROM dom_alerts a
      LEFT JOIN dom_devices d ON d.id = a.device_id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT 200
  `, params);
  return rows;
}

async function create(a) {
  const { rows } = await query(`
    INSERT INTO dom_alerts(device_id, message, severity, resolved)
    VALUES($1,$2,$3,false) RETURNING *
  `, [a.device_id ?? null, a.message, a.severity ?? 'info']);
  return rows[0];
}

async function resolve(id) {
  const { rows } = await query(`
    UPDATE dom_alerts SET resolved = true, resolved_at = now() WHERE id = $1 RETURNING *
  `, [id]);
  return rows[0] || null;
}

module.exports = { list, create, resolve };
