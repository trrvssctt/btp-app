const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function test() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name IN ('users', 'audit_logs')
    `);
    console.log('Columns:', res.rows);
  } catch (err) {
    console.error('Failed:', err.message);
  } finally {
    pool.end();
  }
}

test();
