// Test des réceptions (reliquats, dépassement, BC soldé) — tout est annulé (ROLLBACK), la base n'est pas modifiée.
// Usage : cd backend && node test-receipt-rollback.js
const B = './src';
const poolMod = require(B + '/db/pool');
let client;
poolMod.withTransaction = async (fn) => fn(client); // tout dans UNE transaction annulée
const receipt = require(B + '/models/receiptModel');
(async () => {
  client = await poolMod.pool.connect();
  await client.query('BEGIN');
  try {
    const q = (t, p) => client.query(t, p).then((r) => r.rows);
    const [po] = await q(`SELECT id, numero FROM purchase_orders WHERE statut='ENVOYEE' ORDER BY numero DESC LIMIT 1`);
    const [dep] = await q(`SELECT id, code FROM depots LIMIT 1`);
    const lines = await q(`SELECT id, article_id, quantite FROM purchase_order_lines WHERE purchase_order_id=$1`, [po.id]);
    console.log('BC', po.numero, 'lignes', lines.map((l) => +l.quantite), 'dépôt', dep.code);
    const stockBefore = await q(`SELECT qte_disponible FROM stock_balances WHERE article_id=$1 AND depot_id=$2`, [lines[0].article_id, dep.id]);

    // 1) réception partielle : 1ère ligne à moitié
    const half = +lines[0].quantite / 2;
    const r1 = await receipt.create({ purchase_order_id: po.id, depot_id: dep.id, date_reception: '2026-05-21', conformite: 'CONFORME',
      lignes: lines.map((l, i) => ({ purchase_order_line_id: l.id, article_id: l.article_id, quantite_recue: i === 0 ? half : +l.quantite })) });
    console.log('R1', r1.numero, '→', r1.commande_statut);
    const stockAfter = await q(`SELECT qte_disponible FROM stock_balances WHERE article_id=$1 AND depot_id=$2`, [lines[0].article_id, dep.id]);
    console.log('stock ligne1', stockBefore[0]?.qte_disponible ?? 0, '→', stockAfter[0].qte_disponible);

    // 2) dépassement du reste
    await client.query('SAVEPOINT s');
    try {
      await receipt.create({ purchase_order_id: po.id, depot_id: dep.id, date_reception: '2026-05-28',
        lignes: [{ purchase_order_line_id: lines[0].id, article_id: lines[0].article_id, quantite_recue: half + 1 }] });
      console.log('ERREUR: dépassement accepté');
    } catch (e) { console.log('Dépassement refusé :', e.status, e.message); await client.query('ROLLBACK TO SAVEPOINT s'); }

    // 3) reliquat sans lignes → reste à livrer auto
    const r3 = await receipt.create({ purchase_order_id: po.id, depot_id: dep.id, date_reception: '2026-05-28' });
    console.log('R3', r3.numero, '→', r3.commande_statut);

    // 4) BC soldé → nouvelle réception refusée
    try { await receipt.create({ purchase_order_id: po.id, depot_id: dep.id, date_reception: '2026-05-29' }); console.log('ERREUR: BC soldé accepté'); }
    catch (e) { console.log('BC soldé refusé :', e.status, e.message); }
  } finally {
    await client.query('ROLLBACK');
    client.release();
    process.exit(0);
  }
})().catch((e) => { console.error('ERR', e); process.exit(1); });
