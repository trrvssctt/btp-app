const { query, withTransaction } = require('../db/pool');

async function list() {
  const [rulesRes, condRes, actRes] = await Promise.all([
    query(`SELECT * FROM dom_automation_rules ORDER BY priority DESC, created_at`),
    query(`SELECT * FROM dom_rule_conditions ORDER BY rule_id, sort_order`),
    query(`SELECT * FROM dom_rule_actions ORDER BY rule_id, sort_order`),
  ]);
  return rulesRes.rows.map(r => ({
    ...r,
    conditions: condRes.rows.filter(c => c.rule_id === r.id),
    actions: actRes.rows.filter(a => a.rule_id === r.id),
  }));
}

async function findById(id) {
  const [rRes, condRes, actRes] = await Promise.all([
    query(`SELECT * FROM dom_automation_rules WHERE id = $1`, [id]),
    query(`SELECT * FROM dom_rule_conditions WHERE rule_id = $1 ORDER BY sort_order`, [id]),
    query(`SELECT * FROM dom_rule_actions WHERE rule_id = $1 ORDER BY sort_order`, [id]),
  ]);
  if (!rRes.rows[0]) return null;
  return { ...rRes.rows[0], conditions: condRes.rows, actions: actRes.rows };
}

async function create(r) {
  return withTransaction(async (client) => {
    const { rows: [rule] } = await client.query(`
      INSERT INTO dom_automation_rules(name, description, enabled, priority)
      VALUES($1,$2,$3,$4) RETURNING *
    `, [r.name, r.description ?? null, r.enabled ?? true, r.priority ?? 0]);

    for (const [i, c] of (r.conditions ?? []).entries()) {
      await client.query(`
        INSERT INTO dom_rule_conditions(rule_id, device_id, device_name, metric, operator, value, duration_min, sort_order)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      `, [rule.id, c.device_id ?? null, c.device_name ?? null, c.metric, c.operator, String(c.value), c.duration_min ?? null, i]);
    }

    for (const [i, a] of (r.actions ?? []).entries()) {
      await client.query(`
        INSERT INTO dom_rule_actions(rule_id, device_id, device_name, command, sort_order)
        VALUES($1,$2,$3,$4,$5)
      `, [rule.id, a.device_id ?? null, a.device_name ?? null, a.command, i]);
    }

    return findById(rule.id);
  });
}

async function toggleEnabled(id, enabled) {
  const { rows } = await query(`
    UPDATE dom_automation_rules SET enabled = $2, updated_at = now() WHERE id = $1 RETURNING *
  `, [id, enabled]);
  return rows[0] || null;
}

async function recordTrigger(id) {
  await query(`
    UPDATE dom_automation_rules
       SET trigger_count = trigger_count + 1, last_triggered_at = now(), updated_at = now()
     WHERE id = $1
  `, [id]);
}

module.exports = { list, findById, create, toggleEnabled, recordTrigger };
