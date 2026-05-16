const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function test() {
  try {
    // On cherche un user ID d'abord
    const userRes = await pool.query('SELECT id FROM users LIMIT 1');
    if (userRes.rows.length === 0) {
      console.log('No users found.');
      return;
    }
    const userId = userRes.rows[0].id;
    console.log('Testing with userId:', userId);

    const res = await pool.query(
      `SELECT COALESCE(array_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS roles,
              COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL), '{}') AS permissions
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         LEFT JOIN role_permissions rp ON rp.role_id = r.id
         LEFT JOIN permissions p ON p.id = rp.permission_id
        WHERE u.id = $1`,
      [userId]
    );
    console.log('Result:', JSON.stringify(res.rows[0]));
    console.log('Roles type:', typeof res.rows[0].roles);
    console.log('Roles isArray:', Array.isArray(res.rows[0].roles));
  } catch (err) {
    console.error('Failed:', err.message);
  } finally {
    pool.end();
  }
}

test();
