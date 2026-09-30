// Test des contrôles du circuit des demandes (étape attendue, auteur) — tout est
// annulé (ROLLBACK), la base n'est pas modifiée.
// Usage : cd backend && node test-demande-rollback.js
const B = './src';
const poolMod = require(B + '/db/pool');
let client;
poolMod.withTransaction = async (fn) => fn(client);
poolMod.query = (text, params) => client.query(text, params);
const model = require(B + '/models/requestModel');

(async () => {
  client = await poolMod.pool.connect();
  await client.query('BEGIN');
  const q = (t, p) => client.query(t, p).then((r) => r.rows);
  const essai = async (label, fn) => {
    await client.query('SAVEPOINT s');
    try { await fn(); console.log('ERREUR :', label, 'accepté'); }
    catch (e) { console.log(label, 'refusé :', e.status, e.message); await client.query('ROLLBACK TO SAVEPOINT s'); }
  };
  try {
    const [soumise] = await q(`SELECT id, numero FROM requests WHERE statut = 'SOUMISE' LIMIT 1`);
    const [approuvee] = await q(`SELECT id, numero FROM requests WHERE statut = 'APPROUVEE' LIMIT 1`);
    const [u] = await q(`SELECT id FROM users LIMIT 1`);
    await essai(`DIRECTION sur ${soumise.numero} (SOUMISE)`, () => model.addApproval({ request_id: soumise.id, etape: 'DIRECTION', decideur_id: u.id, decision: 'APPROUVEE' }));
    await essai(`TECHNIQUE sur ${approuvee.numero} (APPROUVEE)`, () => model.addApproval({ request_id: approuvee.id, etape: 'TECHNIQUE', decideur_id: u.id, decision: 'APPROUVEE' }));
    await model.addApproval({ request_id: soumise.id, etape: 'TECHNIQUE', decideur_id: u.id, decision: 'APPROUVEE' });
    console.log(`TECHNIQUE sur ${soumise.numero} accepté →`, (await q(`SELECT statut FROM requests WHERE id=$1`, [soumise.id]))[0].statut);

    // Complément demandé → réponse du demandeur → resoumission : tout est tracé.
    await model.requestComplement(soumise.id, 'Préciser le diamètre des raccords', { decideur_id: u.id, etape: 'BUDGETAIRE' });
    await model.resubmit(soumise.id, { commentaire: 'Raccords Ø110 série S (10 unités)', user_id: u.id });
    const d = await model.findById(soumise.id);
    console.log('Après complément + réponse →', d.statut, '|', d.approvals.map((a) => `${a.etape}/${a.decision}${a.commentaire ? ` "${a.commentaire}"` : ''}`).join(' → '));
  } catch (e) { console.error('ÉCHEC', e.status ?? '', e.message); } finally {
    await client.query('ROLLBACK'); client.release(); process.exit(0);
  }
})();
