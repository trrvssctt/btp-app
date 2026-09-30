// Test du parc équipements (création, affectation, retour, changement d'état) —
// tout est annulé (ROLLBACK), la base n'est pas modifiée.
// Usage : cd backend && node test-equipement-rollback.js
const B = './src';
const poolMod = require(B + '/db/pool');
let client;
poolMod.withTransaction = async (fn) => fn(client); // tout dans UNE transaction annulée
poolMod.query = (text, params) => client.query(text, params);
const eq = require(B + '/models/equipementModel');

(async () => {
  client = await poolMod.pool.connect();
  await client.query('BEGIN');
  const q = (t, p) => client.query(t, p).then((r) => r.rows);
  const essai = async (label, fn) => {
    await client.query('SAVEPOINT s');
    try { await fn(); console.log('ERREUR :', label, 'accepté'); }
    catch (e) { console.log(label, 'refusé :', e.status ?? e.code, e.message); await client.query('ROLLBACK TO SAVEPOINT s'); }
  };
  try {
    const [site] = await q(`SELECT id, code FROM sites LIMIT 1`);
    const [user] = await q(`SELECT id FROM users LIMIT 1`);

    const e1 = await eq.create({ famille: 'BETON', designation: 'Bétonnière test', etat: 'DISPONIBLE' });
    const e2 = await eq.create({ famille: 'BETON', designation: 'Bétonnière test 2' });
    const e3 = await eq.create({ famille: 'TESTFAM', designation: 'Nouvelle famille' });
    console.log('Codes générés', e1.code_inventaire, e2.code_inventaire, e3.code_inventaire, '| état', e1.etat);

    const aff = await eq.createAssignment({ equipment_id: e1.id, site_id: site.id, date_debut: '2026-05-21', commentaire: 'Phase élévation', created_by: user.id });
    console.log('Affectation', site.code, '→', (await eq.findById(e1.id)).etat);
    await essai('Changement d\'état d\'un équipement affecté', () => eq.update(e1.id, { etat: 'EN_MAINTENANCE', actor_id: user.id }));
    await essai('Retour antérieur au début', () => eq.closeAssignment(aff.id, { date_fin: '2026-05-01' }));

    await eq.closeAssignment(aff.id, { date_fin: '2026-05-25', etat_retour: 'DISPONIBLE', commentaire: 'Retour anticipé' });
    const [a] = await eq.listAssignments(e1.id);
    console.log('Retour →', (await eq.findById(e1.id)).etat, '| commentaire :', JSON.stringify(a.commentaire));

    await eq.update(e1.id, { etat: 'EN_MAINTENANCE', commentaire: 'Roulement usé', actor_id: user.id });
    await essai('Passage manuel à AFFECTE', () => eq.update(e1.id, { etat: 'AFFECTE', actor_id: user.id }));
    const hist = await eq.listStateChanges(e1.id);
    console.log('Maintenance →', (await eq.findById(e1.id)).etat, '| historique :', hist.map((h) => `${h.etat_avant}→${h.etat_apres} (${h.commentaire})`).join(', '));
  } catch (e) { console.error('ÉCHEC', e.status ?? '', e.message); } finally {
    await client.query('ROLLBACK');
    client.release();
    process.exit(0);
  }
})().catch((e) => { console.error('ERR', e.code, e.message); process.exit(1); });
