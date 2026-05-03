const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const model = require('../models/articleModel');

const schema = z.object({
  code: z.string().min(1).max(40),
  designation: z.string().min(2).max(200),
  famille_id: z.string().uuid().optional().nullable(),
  unite_id: z.string().uuid().optional().nullable(),
  nature: z.enum(['STOCKABLE', 'ACHAT_DIRECT', 'DURABLE', 'CONSOMMABLE']),
  prix_moyen: z.coerce.number().nonnegative().optional().nullable(),
  seuil_min: z.coerce.number().nonnegative().optional().nullable(),
  actif: z.boolean().optional(),
});

exports.list = asyncHandler(async (req, res) => {
  res.json({ data: await model.list({ search: req.query.search }) });
});

exports.get = asyncHandler(async (req, res) => {
  const a = await model.findById(req.params.id);
  if (!a) throw new HttpError(404, 'Article not found');
  res.json({ data: a });
});

exports.create = [
  validate(schema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await model.create(req.body) });
  }),
];

exports.update = [
  validate(schema.partial()),
  asyncHandler(async (req, res) => {
    const updated = await model.update(req.params.id, req.body);
    if (!updated) throw new HttpError(404, 'Article not found');
    res.json({ data: updated });
  }),
];

exports.remove = asyncHandler(async (req, res) => {
  await model.remove(req.params.id);
  res.status(204).end();
});
