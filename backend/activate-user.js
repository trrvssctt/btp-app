// Active un compte utilisateur (actif = true) et affiche son état avant / après.
// Usage : cd backend && node activate-user.js amadou.diallo@btp-sn.com
const { query } = require('./src/db/pool');

const email = process.argv[2];
if (!email) {
  console.error('Usage : node activate-user.js <email>');
  process.exit(1);
}

(async () => {
  const { rows: [avant] } = await query(`SELECT id, nom, email, actif FROM users WHERE lower(email) = lower($1)`, [email]);
  if (!avant) {
    console.error(`Aucun utilisateur avec l'email ${email}`);
    process.exit(1);
  }
  console.log('Avant :', avant);
  if (avant.actif) {
    console.log('Le compte est déjà actif — rien à faire.');
    process.exit(0);
  }
  const { rows: [apres] } = await query(
    `UPDATE users SET actif = true, updated_at = now() WHERE id = $1 RETURNING id, nom, email, actif`,
    [avant.id],
  );
  await query(
    `INSERT INTO audit_logs(action, entity_type, entity_id, reference, detail)
     VALUES ('UPDATE', 'Utilisateur', $1, $2, 'Activation du compte (script activate-user.js)')`,
    [avant.id, avant.email],
  );
  console.log('Après :', apres);
  process.exit(0);
})().catch((e) => { console.error('ERR', e.code, e.message); process.exit(1); });
