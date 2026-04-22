const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const model = require('../models/notificationModel');

router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const items = await model.listForUser(req.user.id, { type: req.query.type, lu: req.query.lu });
  res.json({ data: items });
}));

router.put('/:id/read', asyncHandler(async (req, res) => {
  const n = await model.markRead(req.params.id, req.user.id);
  res.json({ data: n });
}));

router.post('/read-all', asyncHandler(async (req, res) => {
  await model.markAllRead(req.user.id);
  res.status(204).end();
}));

module.exports = router;
