/**
 * Patch : ajoute les colonnes request_id, commentaire, created_by à equipment_assignments
 * Usage : node backend/src/db/patch_equipment_assignments.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('./pool');

(async () => {
  try {
    await pool.query(`ALTER TABLE equipment_assignments ADD COLUMN IF NOT EXISTS request_id   UUID REFERENCES requests(id)`);
    await pool.query(`ALTER TABLE equipment_assignments ADD COLUMN IF NOT EXISTS commentaire  TEXT`);
    await pool.query(`ALTER TABLE equipment_assignments ADD COLUMN IF NOT EXISTS created_by   UUID REFERENCES users(id)`);
    await pool.query(`ALTER TABLE equipment_assignments ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ NOT NULL DEFAULT now()`);
    console.log('[patch] ✓ equipment_assignments table patched.');
  } catch (err) {
    console.error('[patch] ✗ Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
