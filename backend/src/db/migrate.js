const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    console.log('[migrate] Applying schema.sql…');
    await pool.query(sql);
    console.log('[migrate] ✓ Done.');
  } catch (err) {
    console.error('[migrate] ✗ Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
