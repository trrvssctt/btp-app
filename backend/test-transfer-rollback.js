// Test des transferts (expédition / réception) et des mouvements manuels — tout est
// annulé (ROLLBACK), la base n'est pas modifiée.
// Usage : cd backend && node test-transfer-rollback.js
const B = './src';
const poolMod = require(B + '/db/pool');
let client;
poolMod.withTransaction = async (fn) => fn(client); // tout dans UNE transaction annulée
poolMod.query = (text, params) => client.query(text, params);
const transfer = require(B + '/models/transferModel');
const movement = require(B + '/models/stockMovementModel');

(async () => {
  client = await poolMod.pool.connect();
  await client.query('BEGIN');
  const q = (t, p) => client.query(t, p).then((r) => r.rows);
  const solde = async (a, d) => (await q(
    `SELECT qte_disponible::float AS dispo, qte_transit::float AS transit FROM stock_balances WHERE article_id=$1 AND depot_id=$2`, [a, d]))[0] ?? { dispo: 0, transit: 0 };
  const essai = async (label, fn) => {
    await client.query('SAVEPOINT s');
    try { await fn(); console.log('ERREUR :', label, 'accepté'); }
    catch (e) { console.log(label, 'refusé :', e.status, e.message); await client.query('ROLLBACK TO SAVEPOINT s'); }
  };
  try {
    const [src] = await q(`SELECT b.article_id, b.depot_id, b.qte_disponible::float AS dispo, a.code, d.code AS depot
                             FROM stock_balances b JOIN articles a ON a.id=b.article_id JOIN depots d ON d.id=b.depot_id
                            WHERE b.qte_disponible >= 10 ORDER BY b.qte_disponible DESC LIMIT 1`);
    const [dst] = await q(`SELECT id, code FROM depots WHERE id <> $1 LIMIT 1`, [src.depot_id]);
    const avantDst = await solde(src.article_id, dst.id);
    console.log(`Article ${src.code} : ${src.depot} (${src.dispo}) → ${dst.code} (${avantDst.dispo})`);

    // 1) expédition
    const t = await transfer.create({ depot_from: src.depot_id, depot_to: dst.id, lines: [{ article_id: src.article_id, quantite: 10 }] });
    console.log('Expédition', t.numero, t.statut,
      '| source', (await solde(src.article_id, src.depot_id)).dispo,
      '| dest dispo/transit', Object.values(await solde(src.article_id, dst.id)).join('/'));

    // 2) contrôles
    await essai('Stock insuffisant', () => transfer.create({ depot_from: src.depot_id, depot_to: dst.id, lines: [{ article_id: src.article_id, quantite: 1e9 }] }));
    await essai('Même dépôt', () => transfer.create({ depot_from: src.depot_id, depot_to: src.depot_id, lines: [{ article_id: src.article_id, quantite: 1 }] }));
    await essai('Suppression transfert expédié', () => transfer.remove(t.id));

    // 3) réception
    const r = await transfer.receive(t.id);
    console.log('Réception', r.statut, '| dest dispo/transit', Object.values(await solde(src.article_id, dst.id)).join('/'));
    await essai('Double réception', () => transfer.receive(t.id));
    const d = await transfer.findById(t.id);
    console.log('Détail : expédié', !!d.expedie_le, '| reçu', !!d.recu_le, '| lignes', d.lines.length);

    // 4) mouvements manuels
    await movement.createManual({ type_mouvement: 'SORTIE_CHANTIER', article_id: src.article_id, depot_id: dst.id, quantite: 4, reference_doc: 'TEST' });
    console.log('Sortie chantier 4 → dest', (await solde(src.article_id, dst.id)).dispo);
    await movement.createManual({ type_mouvement: 'AJUSTEMENT_INVENTAIRE', article_id: src.article_id, depot_id: dst.id, quantite: -1, reference_doc: 'TEST' });
    console.log('Ajustement -1 → dest', (await solde(src.article_id, dst.id)).dispo);
    await essai('Sortie > stock', () => movement.createManual({ type_mouvement: 'SORTIE', article_id: src.article_id, depot_id: dst.id, quantite: 1e9 }));
  } catch (e) { console.error('ÉCHEC', e.status ?? '', e.message); } finally {
    await client.query('ROLLBACK');
    client.release();
    process.exit(0);
  }
})().catch((e) => { console.error('ERR', e.code, e.message); process.exit(1); });
