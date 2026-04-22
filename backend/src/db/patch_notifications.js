/**
 * Patch : crée la table notifications si elle n'existe pas
 * Usage : node backend/src/db/patch_notifications.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('./pool');

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
        type        TEXT NOT NULL DEFAULT 'INFO',
        titre       TEXT NOT NULL,
        message     TEXT NOT NULL,
        urgence     TEXT NOT NULL DEFAULT 'INFO',
        lu          BOOLEAN NOT NULL DEFAULT false,
        entity_type TEXT,
        entity_id   UUID,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, lu)`);
    console.log('[patch] ✓ notifications table created/verified.');
  } catch (err) {
    console.error('[patch] ✗ Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
