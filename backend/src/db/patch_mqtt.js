// Migration : liaison des équipements domotique au broker MQTT (Home Assistant)
const { pool } = require('./pool');

const SQL = `
BEGIN;
ALTER TABLE dom_devices ADD COLUMN IF NOT EXISTS mqtt_topic         TEXT;
ALTER TABLE dom_devices ADD COLUMN IF NOT EXISTS mqtt_value_path    TEXT;
ALTER TABLE dom_devices ADD COLUMN IF NOT EXISTS mqtt_command_topic TEXT;
CREATE INDEX IF NOT EXISTS idx_dom_devices_mqtt_topic ON dom_devices(mqtt_topic) WHERE mqtt_topic IS NOT NULL;
COMMIT;
`;

(async () => {
  try {
    console.log('[patch:mqtt] Ajout des colonnes MQTT sur dom_devices…');
    await pool.query(SQL);
    console.log('[patch:mqtt] ✓ Done.');
  } catch (err) {
    console.error('[patch:mqtt] ✗ Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
