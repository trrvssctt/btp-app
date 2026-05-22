/**
 * Patch : ajoute la table receipt_lines pour la traçabilité des réceptions
 * Usage : node backend/src/db/patch_receipt_lines.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { pool } = require('./pool');

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS receipt_lines (
        id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        receipt_id             UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
        purchase_order_line_id UUID REFERENCES purchase_order_lines(id),
        article_id             UUID REFERENCES articles(id),
        designation_libre      TEXT,
        quantite_recue         NUMERIC(18,4) NOT NULL,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    console.log('[patch] ✓ receipt_lines table created.');
  } catch (err) {
    console.error('[patch] ✗ Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
