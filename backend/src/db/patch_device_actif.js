// Migration: add actif column to dom_devices + extend updatable fields
const { pool } = require('./pool');

const SQL = `
BEGIN;
ALTER TABLE dom_devices ADD COLUMN IF NOT EXISTS actif BOOLEAN NOT NULL DEFAULT true;
COMMIT;
`;

(async () => {
  try {
    console.log('[patch:device_actif] Adding actif column to dom_devices…');
    await pool.query(SQL);
    console.log('[patch:device_actif] ✓ Done.');
  } catch (err) {
    console.error('[patch:device_actif] ✗ Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
