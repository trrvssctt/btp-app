/**
 * Patch : ajoute reference, detail, ip à audit_logs
 * Usage : node backend/src/db/patch_audit.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('./pool');

(async () => {
  try {
    await pool.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reference TEXT`);
    await pool.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS detail    TEXT`);
    await pool.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip        TEXT`);
    console.log('[patch] ✓ audit_logs table patched.');
  } catch (err) {
    console.error('[patch] ✗ Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
