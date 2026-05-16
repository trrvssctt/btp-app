const { query } = require('../db/pool');

async function list({ device_id, limit = 100, since } = {}) {
  const params = [];
  const wheres = [];
  if (device_id) { params.push(device_id); wheres.push(`r.device_id = $${params.length}`); }
  if (since)     { params.push(since);     wheres.push(`r.received_at >= $${params.length}`); }
  params.push(limit);
  const where = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';
  const { rows } = await query(`
    SELECT r.*, d.name AS device_name, d.location, d.building_id
      FROM dom_readings r
      JOIN dom_devices d ON d.id = r.device_id
     ${where}
     ORDER BY r.received_at DESC
     LIMIT $${params.length}
  `, params);
  return rows;
}

async function create(r) {
  const { rows } = await query(`
    INSERT INTO dom_readings(device_id, value, unit, metadata, received_at)
    VALUES($1,$2,$3,$4, COALESCE($5::timestamptz, now())) RETURNING *
  `, [r.device_id, r.value, r.unit ?? null, r.metadata ? JSON.stringify(r.metadata) : null, r.received_at ?? null]);
  return rows[0];
}

async function createBulk(readings) {
  const results = [];
  for (const r of readings) results.push(await create(r));
  return results;
}

module.exports = { list, create, createBulk };
