const { query } = require('../db/pool');

async function list() {
  const { rows } = await query(
    `SELECT p.*, COALESCE(s.count, 0)::int AS sites_count
       FROM projects p
       LEFT JOIN (SELECT project_id, COUNT(*) FROM sites GROUP BY project_id) s
              ON s.project_id = p.id
      ORDER BY p.created_at DESC`,
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(`SELECT * FROM projects WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function listSites(projectId) {
  const { rows } = await query(
    `SELECT * FROM sites WHERE project_id = $1 ORDER BY code`,
    [projectId],
  );
  return rows;
}

async function create(p) {
  const { rows } = await query(
    `INSERT INTO projects(code, nom, client, budget_initial, statut, date_debut, date_fin)
     VALUES ($1,$2,$3,$4,COALESCE($5,'ACTIF'),$6,$7) RETURNING *`,
    [p.code, p.nom, p.client, p.budget_initial, p.statut, p.date_debut, p.date_fin],
  );
  return rows[0];
}

async function update(id, p) {
  const sets = ['updated_at = now()'];
  const params = [id];
  const add = (col, val) => { params.push(val ?? null); sets.push(`${col} = $${params.length}`); };
  if (p.nom           !== undefined) add('nom',           p.nom);
  if (p.client        !== undefined) add('client',        p.client);
  if (p.budget_initial !== undefined) add('budget_initial', p.budget_initial);
  if (p.statut        !== undefined) add('statut',        p.statut);
  if (p.date_debut    !== undefined) add('date_debut',    p.date_debut);
  if (p.date_fin      !== undefined) add('date_fin',      p.date_fin);
  const { rows } = await query(
    `UPDATE projects SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  );
  return rows[0] || null;
}

async function remove(id) {
  await query(`DELETE FROM projects WHERE id = $1`, [id]);
}

async function getDetail(id) {
  const proj = (await query(`SELECT * FROM projects WHERE id = $1`, [id])).rows[0];
  if (!proj) return null;

  const sites = (await query(`SELECT * FROM sites WHERE project_id = $1 ORDER BY code`, [id])).rows;
  const siteIds = sites.map((s) => s.id);

  const requests = (await query(
    `SELECT r.*, u.nom AS requester_nom, s.code AS site_code, s.nom AS site_nom,
            COALESCE(l.cnt, 0)::int AS lignes_count
       FROM requests r
       JOIN users u ON u.id = r.requester_id
       JOIN sites s ON s.id = r.site_id
       LEFT JOIN (SELECT request_id, COUNT(*) AS cnt FROM request_lines GROUP BY request_id) l
              ON l.request_id = r.id
      WHERE r.project_id = $1
      ORDER BY r.created_at DESC`,
    [id],
  )).rows;

  let movements = [];
  if (siteIds.length > 0) {
    movements = (await query(
      `SELECT sm.*, a.code AS article_code, a.designation AS article_designation,
              d.code AS depot_code, d.nom AS depot_nom, u.nom AS user_nom
         FROM stock_movements sm
         JOIN articles a ON a.id = sm.article_id
         JOIN depots d ON d.id = sm.depot_id
         LEFT JOIN users u ON u.id = sm.user_id
        WHERE sm.site_id = ANY($1::uuid[])
        ORDER BY sm.created_at DESC
        LIMIT 300`,
      [siteIds],
    )).rows;
  }

  const depotIds = [...new Set(movements.map((m) => m.depot_id))];
  let stock = [];
  if (depotIds.length > 0) {
    stock = (await query(
      `SELECT sb.*, a.code AS article_code, a.designation AS article_designation,
              u.code AS unite, d.code AS depot_code, d.nom AS depot_nom
         FROM stock_balances sb
         JOIN articles a ON a.id = sb.article_id
         JOIN units u ON u.id = a.unite_id
         JOIN depots d ON d.id = sb.depot_id
        WHERE sb.depot_id = ANY($1::uuid[])
        ORDER BY a.code, d.code`,
      [depotIds],
    )).rows;
  }

  const purchaseOrders = (await query(
    `SELECT po.*, s.raison_sociale AS supplier_nom, COUNT(pol.id)::int AS nb_lignes
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       LEFT JOIN purchase_order_lines pol ON pol.purchase_order_id = po.id
      GROUP BY po.id, s.raison_sociale
      ORDER BY po.created_at DESC
      LIMIT 50`,
    [],
  )).rows;

  const receipts = (await query(
    `SELECT r.*, d.code AS depot_code, d.nom AS depot_nom,
            po.numero AS commande_numero, s.raison_sociale AS supplier_nom
       FROM receipts r
       JOIN depots d ON d.id = r.depot_id
       LEFT JOIN purchase_orders po ON po.id = r.purchase_order_id
       LEFT JOIN suppliers s ON s.id = po.supplier_id
      ORDER BY r.created_at DESC
      LIMIT 50`,
    [],
  )).rows;

  const transfers = (await query(
    `SELECT t.*, d1.code AS depot_from_code, d1.nom AS depot_from_nom,
            d2.code AS depot_to_code, d2.nom AS depot_to_nom
       FROM transfers t
       JOIN depots d1 ON d1.id = t.depot_from
       JOIN depots d2 ON d2.id = t.depot_to
      ORDER BY t.created_at DESC
      LIMIT 50`,
    [],
  )).rows;

  return { ...proj, sites, requests, movements, stock, purchaseOrders, receipts, transfers };
}

module.exports = { list, findById, listSites, create, update, remove, getDetail };
