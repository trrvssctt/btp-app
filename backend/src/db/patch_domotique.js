// Migration : module domotique
const { pool } = require('./pool');

const SQL = `
BEGIN;

CREATE TABLE IF NOT EXISTS dom_buildings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dom_floors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES dom_buildings(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  level_num   INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dom_zones (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES dom_floors(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  type     TEXT NOT NULL DEFAULT 'common_area'
);

CREATE TABLE IF NOT EXISTS dom_apartments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id   UUID NOT NULL REFERENCES dom_floors(id) ON DELETE CASCADE,
  number     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dom_rooms (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID NOT NULL REFERENCES dom_apartments(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  usage        TEXT NOT NULL DEFAULT 'autre'
);

CREATE TABLE IF NOT EXISTS dom_devices (
  id                TEXT PRIMARY KEY,
  unique_identifier TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  type              TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'sensor',
  protocol          TEXT NOT NULL DEFAULT 'LoRaWAN',
  status            TEXT NOT NULL DEFAULT 'online',
  last_seen_at      TIMESTAMPTZ,
  last_value        TEXT,
  unit              TEXT,
  location          TEXT,
  building_id       UUID REFERENCES dom_buildings(id),
  floor_id          UUID REFERENCES dom_floors(id),
  apartment_id      UUID REFERENCES dom_apartments(id),
  room_id           UUID REFERENCES dom_rooms(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dom_energy_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id             TEXT NOT NULL UNIQUE REFERENCES dom_devices(id) ON DELETE CASCADE,
  nominal_power_watt    NUMERIC(10,2) NOT NULL,
  kwh_price             NUMERIC(10,4) NOT NULL DEFAULT 120,
  daily_threshold_kwh   NUMERIC(10,3),
  monthly_threshold_kwh NUMERIC(10,3),
  can_be_auto_cut       BOOLEAN NOT NULL DEFAULT false,
  priority              TEXT NOT NULL DEFAULT 'normal',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dom_readings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   TEXT NOT NULL REFERENCES dom_devices(id) ON DELETE CASCADE,
  value       NUMERIC(18,6) NOT NULL,
  unit        TEXT,
  metadata    JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dom_readings_device ON dom_readings(device_id, received_at DESC);

CREATE TABLE IF NOT EXISTS dom_commands (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   TEXT NOT NULL REFERENCES dom_devices(id),
  command     TEXT NOT NULL,
  payload     JSONB,
  status      TEXT NOT NULL DEFAULT 'PENDING',
  sent_by     UUID REFERENCES users(id),
  reason      TEXT,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dom_commands_device ON dom_commands(device_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS dom_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   TEXT REFERENCES dom_devices(id),
  message     TEXT NOT NULL,
  severity    TEXT NOT NULL DEFAULT 'info',
  resolved    BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dom_automation_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  description       TEXT,
  enabled           BOOLEAN NOT NULL DEFAULT true,
  priority          INT NOT NULL DEFAULT 0,
  trigger_count     INT NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dom_rule_conditions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id      UUID NOT NULL REFERENCES dom_automation_rules(id) ON DELETE CASCADE,
  device_id    TEXT REFERENCES dom_devices(id),
  device_name  TEXT,
  metric       TEXT NOT NULL,
  operator     TEXT NOT NULL,
  value        TEXT NOT NULL,
  duration_min INT,
  sort_order   INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dom_rule_actions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id     UUID NOT NULL REFERENCES dom_automation_rules(id) ON DELETE CASCADE,
  device_id   TEXT REFERENCES dom_devices(id),
  device_name TEXT,
  command     TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0
);

COMMIT;
`;

(async () => {
  const client = await pool.connect();
  try {
    await client.query(SQL);
    console.log('[domotique] Migration OK');
  } catch (e) {
    console.error('[domotique] Migration FAILED:', e.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
})();
