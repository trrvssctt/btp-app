/**
 * Patch : crée la table project_status_logs pour tracer chaque changement de statut
 * Usage : node backend/src/db/patch_project_status_logs.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('./pool');

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_status_logs (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        ancien_statut  TEXT NOT NULL,
        nouveau_statut TEXT NOT NULL,
        motif          TEXT,
        user_id        UUID REFERENCES users(id),
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_proj_status_logs ON project_status_logs(project_id, created_at DESC);
    `);
    console.log('[patch] ✓ project_status_logs créée.');
  } catch (err) {
    console.error('[patch] ✗ Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
