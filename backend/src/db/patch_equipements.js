/**
 * Patch : ajoute les colonnes designation et updated_at à la table equipments
 * Usage : node backend/src/db/patch_equipements.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('./pool');

(async () => {
  try {
    await pool.query(`ALTER TABLE equipments ADD COLUMN IF NOT EXISTS designation TEXT`);
    await pool.query(`ALTER TABLE equipments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
    console.log('[patch] ✓ equipments table patched.');
  } catch (err) {
    console.error('[patch] ✗ Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
