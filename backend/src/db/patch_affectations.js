/**
 * Patch : enrichit equipment_assignments pour supporter
 * le cycle complet UC-11 (affectation / retour / demande liée).
 * Ajoute également l'état PERDU dans la contrainte de l'enum.
 * Usage : node backend/src/db/patch_affectations.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('./pool');

(async () => {
  try {
    // -- equipment_assignments : colonnes complémentaires
    await pool.query(`ALTER TABLE equipment_assignments ADD COLUMN IF NOT EXISTS commentaire TEXT`);
    await pool.query(`ALTER TABLE equipment_assignments ADD COLUMN IF NOT EXISTS created_by  UUID REFERENCES users(id)`);
    await pool.query(`ALTER TABLE equipment_assignments ADD COLUMN IF NOT EXISTS request_id  UUID REFERENCES requests(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE equipment_assignments ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ NOT NULL DEFAULT now()`);

    console.log('[patch] ✓ equipment_assignments enrichie (commentaire, created_by, request_id, created_at).');
  } catch (err) {
    console.error('[patch] ✗ Échec :', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
