/**
 * Patch DAF — ajoute le rôle DAF avec la permission REQUEST_VALIDATE_DIRECTION
 * et crée l'utilisateur DAF de démonstration.
 *
 * Usage : node backend/src/db/patch_daf.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const { pool, withTransaction } = require('./pool');

(async () => {
  try {
    await withTransaction(async (c) => {
      // 1. Rôle DAF
      const roleRes = await c.query(
        `INSERT INTO roles(code, libelle)
         VALUES ('DAF', 'Directeur Administratif et Financier')
         ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle
         RETURNING id`,
      );
      const dafRoleId = roleRes.rows[0].id;

      // 2. Permission REQUEST_VALIDATE_DIRECTION
      const permRes = await c.query(
        `INSERT INTO permissions(code, libelle)
         VALUES ('REQUEST_VALIDATE_DIRECTION', 'Validation direction (DAF)')
         ON CONFLICT (code) DO UPDATE SET libelle = EXCLUDED.libelle
         RETURNING id`,
      );
      const permId = permRes.rows[0].id;

      // 3. Lier permission au rôle DAF
      await c.query(
        `INSERT INTO role_permissions(role_id, permission_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [dafRoleId, permId],
      );

      // 4. Utilisateur DAF de démonstration
      const hash = await bcrypt.hash('Daf2025!', 10);
      const userRes = await c.query(
        `INSERT INTO users(email, nom, password_hash, actif)
         VALUES ('daf@btp-sn.com', 'Directeur Financier', $1, true)
         ON CONFLICT (email) DO UPDATE SET nom = EXCLUDED.nom, password_hash = EXCLUDED.password_hash
         RETURNING id`,
        [hash],
      );
      await c.query(
        `INSERT INTO user_roles(user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userRes.rows[0].id, dafRoleId],
      );

      console.log('[patch-daf] ✓ Rôle DAF + permission REQUEST_VALIDATE_DIRECTION insérés.');
      console.log('[patch-daf] ✓ Utilisateur DAF : daf@btp-sn.com / Daf2025!');
    });
  } catch (err) {
    console.error('[patch-daf] ✗', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
