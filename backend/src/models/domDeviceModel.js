const { query } = require('../db/pool');

async function list({ building_id, type, category, status, search } = {}) {
  const params = [];
  const wheres = [];
  const add = (cond, val) => { params.push(val); wheres.push(cond.replace('?', `$${params.length}`)); };

  if (building_id) add('d.building_id = ?::uuid', building_id);
  if (type)        add('d.type = ?', type);
  if (category)    add('d.category = ?', category);
  if (status)      add('d.status = ?', status);
  if (search) {
    params.push(`%${search}%`);
    const n = params.length;
    wheres.push(`(d.name ILIKE $${n} OR d.unique_identifier ILIKE $${n} OR d.location ILIKE $${n})`);
  }

  const where = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';
  const { rows } = await query(`
    SELECT d.*,
           ep.nominal_power_watt, ep.kwh_price, ep.daily_threshold_kwh,
           ep.monthly_threshold_kwh, ep.can_be_auto_cut, ep.priority AS energy_priority
      FROM dom_devices d
      LEFT JOIN dom_energy_profiles ep ON ep.device_id = d.id
     ${where}
     ORDER BY d.name
  `, params);
  return rows;
}

async function findById(id) {
  const { rows } = await query(`
    SELECT d.*,
           ep.nominal_power_watt, ep.kwh_price, ep.daily_threshold_kwh,
           ep.monthly_threshold_kwh, ep.can_be_auto_cut, ep.priority AS energy_priority
      FROM dom_devices d
      LEFT JOIN dom_energy_profiles ep ON ep.device_id = d.id
     WHERE d.id = $1
  `, [id]);
  return rows[0] || null;
}

async function findByUniqueId(uid) {
  const { rows } = await query(`SELECT * FROM dom_devices WHERE unique_identifier = $1`, [uid]);
  return rows[0] || null;
}

async function create(d) {
  const { rows } = await query(`
    INSERT INTO dom_devices(id, unique_identifier, name, type, category, protocol, status, location, building_id, floor_id, apartment_id, room_id, last_seen_at, last_value, unit)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now(),$13,$14) RETURNING *
  `, [
    d.id, d.unique_identifier, d.name, d.type, d.category ?? 'sensor',
    d.protocol ?? 'LoRaWAN', d.status ?? 'online', d.location ?? null,
    d.building_id ?? null, d.floor_id ?? null, d.apartment_id ?? null, d.room_id ?? null,
    d.last_value ?? null, d.unit ?? null,
  ]);
  return rows[0];
}

async function update(id, d) {
  const sets = ['updated_at = now()'];
  const params = [id];
  const add = (col, val) => { params.push(val ?? null); sets.push(`${col} = $${params.length}`); };
  if (d.name !== undefined)       add('name', d.name);
  if (d.status !== undefined)     add('status', d.status);
  if (d.last_value !== undefined) add('last_value', d.last_value);
  if (d.last_seen_at !== undefined) add('last_seen_at', d.last_seen_at);
  if (d.location !== undefined)   add('location', d.location);
  const { rows } = await query(`UPDATE dom_devices SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
  return rows[0] || null;
}

async function upsertEnergyProfile(deviceId, ep) {
  const { rows } = await query(`
    INSERT INTO dom_energy_profiles(device_id, nominal_power_watt, kwh_price, daily_threshold_kwh, monthly_threshold_kwh, can_be_auto_cut, priority)
    VALUES($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (device_id) DO UPDATE SET
      nominal_power_watt    = EXCLUDED.nominal_power_watt,
      kwh_price             = EXCLUDED.kwh_price,
      daily_threshold_kwh   = EXCLUDED.daily_threshold_kwh,
      monthly_threshold_kwh = EXCLUDED.monthly_threshold_kwh,
      can_be_auto_cut       = EXCLUDED.can_be_auto_cut,
      priority              = EXCLUDED.priority
    RETURNING *
  `, [deviceId, ep.nominal_power_watt, ep.kwh_price ?? 120, ep.daily_threshold_kwh ?? null, ep.monthly_threshold_kwh ?? null, ep.can_be_auto_cut ?? false, ep.priority ?? 'normal']);
  return rows[0];
}

module.exports = { list, findById, findByUniqueId, create, update, upsertEnergyProfile };
