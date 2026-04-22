const { Pool } = require('pg');
const env = require('../config/env');

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('[pg] unexpected error on idle client', err);
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (env.nodeEnv === 'development') {
    const ms = Date.now() - start;
    console.log(`[pg] ${ms}ms — ${text.split('\n')[0].slice(0, 80)}`);
  }
  return res;
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
