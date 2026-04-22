const router = require('express').Router();
const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const { authenticate, requireRole } = require('../middleware/auth');
const model = require('../models/stockModel');

const schema = z.object({
  article_id: z.string().uuid(),
  depot_id: z.string().uuid(),
  qte_disponible: z.coerce.number().nonnegative().default(0),
  qte_reservee: z.coerce.number().nonnegative().optional(),
  seuil_alerte: z.coerce.number().nonnegative().optional(),
});

router.get('/', authenticate, asyncHandler(async (req, res) => {
  res.json({ data: await model.list(req.query) });
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const s = await model.findById(req.params.id);
  if (!s) throw new HttpError(404, 'Stock entry not found');
  res.json({ data: s });
}));

router.post('/', authenticate, requireRole('ADMIN', 'MAGASINIER'), validate(schema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await model.create(req.body) });
}));

router.put('/:id', authenticate, requireRole('ADMIN', 'MAGASINIER'), validate(schema.partial()), asyncHandler(async (req, res) => {
  const updated = await model.update(req.params.id, req.body);
  if (!updated) throw new HttpError(404, 'Stock entry not found');
  res.json({ data: updated });
}));

router.delete('/:id', authenticate, requireRole('ADMIN'), asyncHandler(async (req, res) => {
  await model.remove(req.params.id);
  res.status(204).end();
}));

module.exports = router;
