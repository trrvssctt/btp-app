/**
 * Patch : ajoute la colonne motif_statut à la table projects
 * Usage : node backend/src/db/patch_project_motif.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('./pool');

(async () => {
  try {
    await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS motif_statut TEXT`);
    console.log('[patch] ✓ projects.motif_statut ajouté.');
  } catch (err) {
    console.error('[patch] ✗ Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
