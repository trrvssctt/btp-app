/**
 * Patch : ajoute la colonne reserve à la table receipts
 * Usage : node backend/src/db/patch_receipts.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('./pool');

(async () => {
  try {
    await pool.query(`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS reserve TEXT`);
    console.log('[patch] ✓ receipts table patched.');
  } catch (err) {
    console.error('[patch] ✗ Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();