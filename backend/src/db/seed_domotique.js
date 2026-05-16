// Seed : données pré-existantes du module domotique
const { pool } = require('./pool');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Bâtiments ───────────────────────────────────────────────────────────
    await client.query(`DELETE FROM dom_buildings`);

    const { rows: [batA] } = await client.query(`
      INSERT INTO dom_buildings(name, address, status)
      VALUES('Immeuble A — Résidence Les Palmiers', '12 Avenue de la République, Dakar', 'active')
      RETURNING id
    `);
    const { rows: [batB] } = await client.query(`
      INSERT INTO dom_buildings(name, address, status)
      VALUES('Immeuble B — Tour Horizon', '45 Rue Cheikh Anta Diop, Dakar', 'active')
      RETURNING id
    `);

    // ── Étages Imm. A ───────────────────────────────────────────────────────
    const { rows: [aRdc] } = await client.query(`INSERT INTO dom_floors(building_id,name,level_num) VALUES($1,'Rez-de-chaussée',0) RETURNING id`, [batA.id]);
    const { rows: [aE1]  } = await client.query(`INSERT INTO dom_floors(building_id,name,level_num) VALUES($1,'Étage 1',1) RETURNING id`, [batA.id]);
    const { rows: [aE2]  } = await client.query(`INSERT INTO dom_floors(building_id,name,level_num) VALUES($1,'Étage 2',2) RETURNING id`, [batA.id]);

    // Zones RDC
    await client.query(`INSERT INTO dom_zones(floor_id,name,type) VALUES($1,'Hall d''entrée','common_area'),($1,'Parking','common_area'),($1,'Local technique','technical')`, [aRdc.id]);
    await client.query(`INSERT INTO dom_zones(floor_id,name,type) VALUES($1,'Couloir','common_area')`, [aE1.id]);
    await client.query(`INSERT INTO dom_zones(floor_id,name,type) VALUES($1,'Couloir','common_area')`, [aE2.id]);

    // Appartements E1
    const { rows: [apt101] } = await client.query(`INSERT INTO dom_apartments(floor_id,number) VALUES($1,'APT-101') RETURNING id`, [aE1.id]);
    const { rows: [apt102] } = await client.query(`INSERT INTO dom_apartments(floor_id,number) VALUES($1,'APT-102') RETURNING id`, [aE1.id]);
    // Appartements E2
    const { rows: [apt201] } = await client.query(`INSERT INTO dom_apartments(floor_id,number) VALUES($1,'APT-201') RETURNING id`, [aE2.id]);

    // Pièces APT-101
    const { rows: [salon101]   } = await client.query(`INSERT INTO dom_rooms(apartment_id,name,usage) VALUES($1,'Salon','living') RETURNING id`, [apt101.id]);
    await client.query(`INSERT INTO dom_rooms(apartment_id,name,usage) VALUES($1,'Chambre principale','bedroom'),($1,'Cuisine','kitchen'),($1,'Salle de bain','bathroom')`, [apt101.id]);
    // Pièces APT-102
    await client.query(`INSERT INTO dom_rooms(apartment_id,name,usage) VALUES($1,'Salon','living'),($1,'Chambre','bedroom')`, [apt102.id]);
    // Pièces APT-201
    const { rows: [bureau201] } = await client.query(`INSERT INTO dom_rooms(apartment_id,name,usage) VALUES($1,'Bureau','office') RETURNING id`, [apt201.id]);
    await client.query(`INSERT INTO dom_rooms(apartment_id,name,usage) VALUES($1,'Salon','living'),($1,'Chambre','bedroom')`, [apt201.id]);

    // ── Étages Imm. B ───────────────────────────────────────────────────────
    const { rows: [bRdc] } = await client.query(`INSERT INTO dom_floors(building_id,name,level_num) VALUES($1,'Rez-de-chaussée',0) RETURNING id`, [batB.id]);
    const { rows: [bE1]  } = await client.query(`INSERT INTO dom_floors(building_id,name,level_num) VALUES($1,'Étage 1',1) RETURNING id`, [batB.id]);

    await client.query(`INSERT INTO dom_zones(floor_id,name,type) VALUES($1,'Hall','common_area')`, [bRdc.id]);
    const { rows: [aptB101] } = await client.query(`INSERT INTO dom_apartments(floor_id,number) VALUES($1,'APT-101') RETURNING id`, [bE1.id]);
    await client.query(`INSERT INTO dom_rooms(apartment_id,name,usage) VALUES($1,'Salon','living'),($1,'Chambre','bedroom')`, [aptB101.id]);

    // ── Équipements ─────────────────────────────────────────────────────────
    const devices = [
      { id: 'dev-001', uid: 'BAT-A-E1-APT101-SALON-TEMP-001', name: 'Température Salon 101',      type: 'Température',     cat: 'sensor',   proto: 'LoRaWAN', status: 'online',  val: '27.4', unit: '°C',  loc: 'Imm. A — Étage 1 — APT-101 — Salon',   bId: batA.id, aId: apt101.id, rId: salon101.id },
      { id: 'dev-002', uid: 'BAT-A-E1-APT101-SALON-CLIM-001', name: 'Climatiseur Salon 101',     type: 'Climatiseur',     cat: 'hybrid',   proto: 'Wi-Fi',   status: 'online',  val: 'ON',   unit: '',    loc: 'Imm. A — Étage 1 — APT-101 — Salon',   bId: batA.id, aId: apt101.id, rId: salon101.id },
      { id: 'dev-003', uid: 'BAT-A-E1-APT101-SALON-PRES-001', name: 'Détecteur présence Salon 101', type: 'Présence',    cat: 'sensor',   proto: 'Zigbee',  status: 'online',  val: 'Présent', unit: '', loc: 'Imm. A — Étage 1 — APT-101 — Salon',   bId: batA.id, aId: apt101.id, rId: salon101.id },
      { id: 'dev-004', uid: 'BAT-A-RDC-HALL-LUM-001',         name: 'Lumière Hall RDC',          type: 'Lumière',         cat: 'actuator', proto: 'Zigbee',  status: 'online',  val: 'ON',   unit: '',    loc: 'Imm. A — RDC — Hall d\'entrée',         bId: batA.id },
      { id: 'dev-005', uid: 'BAT-A-E1-APT102-PORTE-001',      name: 'Serrure APT-102',           type: 'Accès porte',     cat: 'hybrid',   proto: 'Z-Wave',  status: 'online',  val: 'Fermé', unit: '',   loc: 'Imm. A — Étage 1 — APT-102',           bId: batA.id, aId: apt102.id },
      { id: 'dev-006', uid: 'BAT-A-E2-APT201-BUREAU-TEMP-001', name: 'Température Bureau 201',  type: 'Température',     cat: 'sensor',   proto: 'LoRaWAN', status: 'alert',   val: '32.1', unit: '°C',  loc: 'Imm. A — Étage 2 — APT-201 — Bureau',  bId: batA.id, aId: apt201.id, rId: bureau201.id },
      { id: 'dev-007', uid: 'BAT-A-GLOBAL-CMPT-001',           name: 'Compteur général Imm. A',  type: 'Compteur énergie', cat: 'sensor',  proto: 'Modbus',  status: 'online',  val: '4.2',  unit: 'kW',  loc: 'Imm. A — Local technique',             bId: batA.id },
      { id: 'dev-008', uid: 'BAT-B-E1-APT101-SALON-CLIM-001',  name: 'Climatiseur Salon B-101', type: 'Climatiseur',     cat: 'hybrid',   proto: 'Wi-Fi',   status: 'offline', val: 'OFF',  unit: '',    loc: 'Imm. B — Étage 1 — APT-101 — Salon',   bId: batB.id, aId: aptB101.id },
      { id: 'dev-009', uid: 'BAT-B-RDC-HALL-PRES-001',         name: 'Présence Hall Imm. B',     type: 'Présence',        cat: 'sensor',   proto: 'Zigbee',  status: 'online',  val: 'Absent', unit: '', loc: 'Imm. B — RDC — Hall',                  bId: batB.id },
      { id: 'dev-010', uid: 'BAT-A-E1-APT101-SALON-PRISE-001', name: 'Prise intelligente Salon 101', type: 'Prise intelligente', cat: 'hybrid', proto: 'Zigbee', status: 'online', val: 'ON', unit: '', loc: 'Imm. A — Étage 1 — APT-101 — Salon', bId: batA.id, aId: apt101.id, rId: salon101.id },
    ];

    for (const d of devices) {
      await client.query(`
        INSERT INTO dom_devices(id, unique_identifier, name, type, category, protocol, status, last_seen_at, last_value, unit, location, building_id, floor_id, apartment_id, room_id)
        VALUES($1,$2,$3,$4,$5,$6,$7, now() - INTERVAL '5 minutes',$8,$9,$10,$11,$12,$13,$14)
      `, [d.id, d.uid, d.name, d.type, d.cat, d.proto, d.status, d.val, d.unit || null, d.loc, d.bId, d.fId ?? null, d.aId ?? null, d.rId ?? null]);
    }

    // ── Profils énergétiques ────────────────────────────────────────────────
    const profiles = [
      { devId: 'dev-002', w: 1200, price: 120, daily: 8,  monthly: 180, cut: true,  prio: 'normal'   },
      { devId: 'dev-004', w: 60,   price: 120, daily: 5,  monthly: 100, cut: true,  prio: 'low'      },
      { devId: 'dev-008', w: 900,  price: 120, daily: 6,  monthly: 140, cut: true,  prio: 'normal'   },
      { devId: 'dev-010', w: 500,  price: 120, daily: 3,  monthly: 60,  cut: false, prio: 'critical' },
    ];
    for (const p of profiles) {
      await client.query(`
        INSERT INTO dom_energy_profiles(device_id, nominal_power_watt, kwh_price, daily_threshold_kwh, monthly_threshold_kwh, can_be_auto_cut, priority)
        VALUES($1,$2,$3,$4,$5,$6,$7)
      `, [p.devId, p.w, p.price, p.daily, p.monthly, p.cut, p.prio]);
    }

    // ── Mesures historiques ─────────────────────────────────────────────────
    const now = new Date();
    const readings = [
      // Température salon 101 — dernières 24h
      ...Array.from({ length: 24 }, (_, i) => ({ dev: 'dev-001', val: 25 + Math.random() * 4, unit: '°C', h: i })),
      // Température bureau 201
      ...Array.from({ length: 12 }, (_, i) => ({ dev: 'dev-006', val: 29 + Math.random() * 4, unit: '°C', h: i })),
      // Compteur énergie — 7 jours
      ...Array.from({ length: 7 * 4 }, (_, i) => ({ dev: 'dev-007', val: 3.5 + Math.random() * 1.5, unit: 'kW', h: i * 6 })),
    ];

    for (const r of readings) {
      const ts = new Date(now.getTime() - r.h * 3600 * 1000);
      await client.query(`
        INSERT INTO dom_readings(device_id, value, unit, received_at)
        VALUES($1, $2, $3, $4)
      `, [r.dev, r.val.toFixed(4), r.unit, ts.toISOString()]);
    }

    // ── Commandes historiques ───────────────────────────────────────────────
    await client.query(`
      INSERT INTO dom_commands(device_id, command, status, reason, sent_at, executed_at)
      VALUES
        ('dev-002','OFF','EXECUTED','Dépassement seuil journalier', now()-INTERVAL '1h30m', now()-INTERVAL '1h29m55s'),
        ('dev-004','ON', 'EXECUTED', null,                          now()-INTERVAL '7h',    now()-INTERVAL '6h59m58s'),
        ('dev-005','UNLOCK','EXECUTED',null,                        now()-INTERVAL '5h',    now()-INTERVAL '4h59m57s'),
        ('dev-008','ON', 'FAILED','Test démarrage',                 now()-INTERVAL '4h',    null),
        ('dev-010','OFF','PENDING',null,                            now()-INTERVAL '5m',    null)
    `);

    // ── Alertes ─────────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO dom_alerts(device_id, message, severity, resolved, created_at)
      VALUES
        ('dev-006','Température critique : 32.1°C (seuil 30°C)','critical',false, now()-INTERVAL '2h'),
        ('dev-008','Équipement hors ligne depuis 6h20','warning',false, now()-INTERVAL '6h'),
        ('dev-002','Consommation journalière proche du seuil (7.8/8 kWh)','warning',false, now()-INTERVAL '3h'),
        ('dev-004','Lumière allumée sans présence depuis 30 min','info',true, now()-INTERVAL '35m')
    `);

    // ── Routines d'automatisation ───────────────────────────────────────────
    const { rows: [rule1] } = await client.query(`
      INSERT INTO dom_automation_rules(name, description, enabled, priority, trigger_count, last_triggered_at)
      VALUES('Extinction clim si absence prolongée','Éteint le climatiseur du salon si aucune présence pendant 15 min et consommation > 10 kWh',true,10,12, now()-INTERVAL '1h30m')
      RETURNING id
    `);
    await client.query(`INSERT INTO dom_rule_conditions(rule_id,device_name,metric,operator,value,duration_min,sort_order) VALUES($1,'Détecteur présence Salon 101','présence','=','false',15,0)`, [rule1.id]);
    await client.query(`INSERT INTO dom_rule_conditions(rule_id,device_name,metric,operator,value,sort_order) VALUES($1,'Climatiseur Salon 101','consommation_journalière','>','10',1)`, [rule1.id]);
    await client.query(`INSERT INTO dom_rule_actions(rule_id,device_name,command,sort_order) VALUES($1,'Climatiseur Salon 101','OFF',0)`, [rule1.id]);

    const { rows: [rule2] } = await client.query(`
      INSERT INTO dom_automation_rules(name, description, enabled, priority, trigger_count, last_triggered_at)
      VALUES('Lumière hall — extinction automatique','Éteint la lumière du hall si aucune présence depuis 10 min',true,5,47, now()-INTERVAL '35m')
      RETURNING id
    `);
    await client.query(`INSERT INTO dom_rule_conditions(rule_id,device_name,metric,operator,value,duration_min,sort_order) VALUES($1,'Présence Hall Imm. B','présence','=','false',10,0)`, [rule2.id]);
    await client.query(`INSERT INTO dom_rule_actions(rule_id,device_name,command,sort_order) VALUES($1,'Lumière Hall RDC','OFF',0)`, [rule2.id]);

    const { rows: [rule3] } = await client.query(`
      INSERT INTO dom_automation_rules(name, description, enabled, priority, trigger_count, last_triggered_at)
      VALUES('Alerte température critique','Crée une alerte si la température dépasse 30°C dans un bureau',true,3,3, now()-INTERVAL '2h')
      RETURNING id
    `);
    await client.query(`INSERT INTO dom_rule_conditions(rule_id,device_name,metric,operator,value,sort_order) VALUES($1,'Température Bureau 201','température','>','30',0)`, [rule3.id]);
    await client.query(`INSERT INTO dom_rule_actions(rule_id,device_name,command,sort_order) VALUES($1,'SYSTÈME','ALERT',0)`, [rule3.id]);

    const { rows: [rule4] } = await client.query(`
      INSERT INTO dom_automation_rules(name, description, enabled, priority, trigger_count)
      VALUES('Coupure automatique seuil mensuel','Coupe les équipements non critiques si projection mensuelle > seuil',false,1,0)
      RETURNING id
    `);
    await client.query(`INSERT INTO dom_rule_conditions(rule_id,device_name,metric,operator,value,sort_order) VALUES($1,'Compteur général Imm. A','projection_mensuelle','>','500',0)`, [rule4.id]);
    await client.query(`INSERT INTO dom_rule_actions(rule_id,device_name,command,sort_order) VALUES($1,'Climatiseur Salon 101','OFF',0),($1,'Prise intelligente Salon 101','OFF',1)`, [rule4.id]);

    await client.query('COMMIT');
    console.log('[domotique] Seed OK — 2 immeubles, 10 équipements, 4 routines, alertes et historique insérés');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[domotique] Seed FAILED:', e.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

run();
