const { query } = require('../db/pool');

async function listBuildings() {
  const { rows } = await query(`
    SELECT b.*,
           COUNT(DISTINCT f.id)::int AS floor_count,
           COUNT(DISTINCT d.id)::int AS device_count
      FROM dom_buildings b
      LEFT JOIN dom_floors f ON f.building_id = b.id
      LEFT JOIN dom_devices d ON d.building_id = b.id
     GROUP BY b.id
     ORDER BY b.name
  `);
  return rows;
}

async function getTree(buildingId) {
  const [bRes, floorRes, zoneRes, aptRes, roomRes] = await Promise.all([
    query(`SELECT * FROM dom_buildings WHERE id = $1`, [buildingId]),
    query(`SELECT * FROM dom_floors WHERE building_id = $1 ORDER BY level_num`, [buildingId]),
    query(`SELECT z.* FROM dom_zones z JOIN dom_floors f ON f.id = z.floor_id WHERE f.building_id = $1`, [buildingId]),
    query(`SELECT a.* FROM dom_apartments a JOIN dom_floors f ON f.id = a.floor_id WHERE f.building_id = $1`, [buildingId]),
    query(`SELECT r.* FROM dom_rooms r JOIN dom_apartments a ON a.id = r.apartment_id JOIN dom_floors f ON f.id = a.floor_id WHERE f.building_id = $1`, [buildingId]),
  ]);

  const building = bRes.rows[0];
  if (!building) return null;

  const zones = zoneRes.rows;
  const apartments = aptRes.rows.map(a => ({
    ...a,
    rooms: roomRes.rows.filter(r => r.apartment_id === a.id),
  }));

  building.floors = floorRes.rows.map(f => ({
    ...f,
    zones: zones.filter(z => z.floor_id === f.id),
    apartments: apartments.filter(a => a.floor_id === f.id),
  }));

  return building;
}

async function createBuilding(b) {
  const { rows } = await query(
    `INSERT INTO dom_buildings(name, address, status) VALUES($1,$2,$3) RETURNING *`,
    [b.name, b.address ?? null, b.status ?? 'active'],
  );
  return rows[0];
}

async function updateBuilding(id, b) {
  const sets = ['updated_at = now()'];
  const params = [id];
  const add = (col, val) => { params.push(val ?? null); sets.push(`${col} = $${params.length}`); };
  if (b.name !== undefined)    add('name', b.name);
  if (b.address !== undefined) add('address', b.address);
  if (b.status !== undefined)  add('status', b.status);
  const { rows } = await query(`UPDATE dom_buildings SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
  return rows[0] || null;
}

async function createFloor(f) {
  const { rows } = await query(
    `INSERT INTO dom_floors(building_id, name, level_num) VALUES($1,$2,$3) RETURNING *`,
    [f.building_id, f.name, f.level_num ?? 0],
  );
  return rows[0];
}

async function createZone(z) {
  const { rows } = await query(
    `INSERT INTO dom_zones(floor_id, name, type) VALUES($1,$2,$3) RETURNING *`,
    [z.floor_id, z.name, z.type ?? 'common_area'],
  );
  return rows[0];
}

async function createApartment(a) {
  const { rows } = await query(
    `INSERT INTO dom_apartments(floor_id, number) VALUES($1,$2) RETURNING *`,
    [a.floor_id, a.number],
  );
  return rows[0];
}

async function createRoom(r) {
  const { rows } = await query(
    `INSERT INTO dom_rooms(apartment_id, name, usage) VALUES($1,$2,$3) RETURNING *`,
    [r.apartment_id, r.name, r.usage ?? 'autre'],
  );
  return rows[0];
}

async function deleteBuilding(id) {
  await query(`DELETE FROM dom_buildings WHERE id = $1`, [id]);
}

async function updateFloor(id, data) {
  const sets = ['updated_at = now()'];
  const params = [id];
  const add = (col, val) => { params.push(val ?? null); sets.push(`${col} = $${params.length}`); };
  if (data.name !== undefined)      add('name', data.name);
  if (data.level_num !== undefined) add('level_num', data.level_num);
  const { rows } = await query(`UPDATE dom_floors SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
  return rows[0] || null;
}
async function deleteFloor(id) {
  await query(`DELETE FROM dom_floors WHERE id = $1`, [id]);
}

async function updateZone(id, data) {
  const sets = [];
  const params = [id];
  const add = (col, val) => { params.push(val ?? null); sets.push(`${col} = $${params.length}`); };
  if (data.name !== undefined) add('name', data.name);
  if (data.type !== undefined) add('type', data.type);
  if (!sets.length) return null;
  const { rows } = await query(`UPDATE dom_zones SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
  return rows[0] || null;
}
async function deleteZone(id) {
  await query(`DELETE FROM dom_zones WHERE id = $1`, [id]);
}

async function updateApartment(id, data) {
  const { rows } = await query(
    `UPDATE dom_apartments SET number = $2 WHERE id = $1 RETURNING *`,
    [id, data.number],
  );
  return rows[0] || null;
}
async function deleteApartment(id) {
  await query(`DELETE FROM dom_apartments WHERE id = $1`, [id]);
}

async function updateRoom(id, data) {
  const sets = [];
  const params = [id];
  const add = (col, val) => { params.push(val ?? null); sets.push(`${col} = $${params.length}`); };
  if (data.name !== undefined)  add('name', data.name);
  if (data.usage !== undefined) add('usage', data.usage);
  if (!sets.length) return null;
  const { rows } = await query(`UPDATE dom_rooms SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, params);
  return rows[0] || null;
}
async function deleteRoom(id) {
  await query(`DELETE FROM dom_rooms WHERE id = $1`, [id]);
}

module.exports = {
  listBuildings, getTree, createBuilding, updateBuilding, deleteBuilding,
  createFloor, updateFloor, deleteFloor,
  createZone, updateZone, deleteZone,
  createApartment, updateApartment, deleteApartment,
  createRoom, updateRoom, deleteRoom,
};
