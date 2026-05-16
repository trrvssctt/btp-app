const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Connection failed:', err.message);
    if (err.message.includes('self signed certificate')) {
      console.log('SSL certificate issue detected.');
    }
  } else {
    console.log('Connection successful:', res.rows[0]);
  }
  pool.end();
});
