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

// Équipements actifs reliés à un topic MQTT (abonnements du client MQTT)
async function listMqttLinked() {
  const { rows } = await query(`
    SELECT id, name, unit, category, mqtt_topic, mqtt_value_path
      FROM dom_devices
     WHERE mqtt_topic IS NOT NULL AND actif = true
  `);
  return rows;
}

async function create(d) {
  const { rows } = await query(`
    INSERT INTO dom_devices(id, unique_identifier, name, type, category, protocol, status, location, building_id, floor_id, apartment_id, room_id, last_seen_at, last_value, unit,
                            mqtt_topic, mqtt_value_path, mqtt_command_topic)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now(),$13,$14,$15,$16,$17) RETURNING *
  `, [
    d.id, d.unique_identifier, d.name, d.type, d.category ?? 'sensor',
    d.protocol ?? 'LoRaWAN', d.status ?? 'online', d.location ?? null,
    d.building_id ?? null, d.floor_id ?? null, d.apartment_id ?? null, d.room_id ?? null,
    d.last_value ?? null, d.unit ?? null,
    d.mqtt_topic || null, d.mqtt_value_path || null, d.mqtt_command_topic || null,
  ]);
  return rows[0];
}

async function update(id, d) {
  const sets = ['updated_at = now()'];
  const params = [id];
  const add = (col, val) => { params.push(val ?? null); sets.push(`${col} = $${params.length}`); };
  if (d.name !== undefined)         add('name', d.name);
  if (d.type !== undefined)         add('type', d.type);
  if (d.category !== undefined)     add('category', d.category);
  if (d.protocol !== undefined)     add('protocol', d.protocol);
  if (d.unit !== undefined)         add('unit', d.unit);
  if (d.status !== undefined)       add('status', d.status);
  if (d.actif !== undefined)        add('actif', d.actif);
  if (d.last_value !== undefined)   add('last_value', d.last_value);
  if (d.last_seen_at !== undefined) add('last_seen_at', d.last_seen_at);
  if (d.location !== undefined)     add('location', d.location);
  if (d.building_id !== undefined)  add('building_id', d.building_id);
  if (d.floor_id !== undefined)     add('floor_id', d.floor_id);
  if (d.apartment_id !== undefined) add('apartment_id', d.apartment_id);
  if (d.room_id !== undefined)      add('room_id', d.room_id);
  if (d.mqtt_topic !== undefined)         add('mqtt_topic', d.mqtt_topic || null);
  if (d.mqtt_value_path !== undefined)    add('mqtt_value_path', d.mqtt_value_path || null);
  if (d.mqtt_command_topic !== undefined) add('mqtt_command_topic', d.mqtt_command_topic || null);
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

module.exports = { list, findById, findByUniqueId, listMqttLinked, create, update, upsertEnergyProfile };
