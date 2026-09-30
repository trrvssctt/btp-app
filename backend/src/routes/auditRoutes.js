const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, requireRole } = require('../middleware/auth');
const model = require('../models/auditModel');

router.use(authenticate);
// Aligné sur la route front /audit (+ RESP_TECHNIQUE, déjà autorisé ici).
router.use(requireRole('ADMIN', 'AUDITEUR', 'CONTROLEUR', 'RESP_TECHNIQUE'));

router.get('/', asyncHandler(async (req, res) => {
  const { action, entity_type, search } = req.query;
  res.json({ data: await model.list({ action, entity_type, search }) });
}));

module.exports = router;
