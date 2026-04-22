const model = require('../models/auditModel');

/**
 * Écrit une entrée d'audit de façon non-bloquante (fire-and-forget).
 * N'impacte pas la réponse HTTP même en cas d'erreur.
 */
function auditLog({ req, actor_id, action, entity_type, entity_id, reference, detail }) {
  const ip = req?.ip || req?.headers?.['x-forwarded-for'] || null;
  const uid = actor_id ?? req?.user?.id ?? null;
  model
    .create({ actor_id: uid, action, entity_type, entity_id, reference, detail, ip })
    .catch((err) => console.warn('[auditLog] failed:', err.message));
}

module.exports = auditLog;
