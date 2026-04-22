const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const model = require('../models/depotModel');

const schema = z.object({
  code: z.string().min(1).max(40),
  nom: z.string().min(2).max(200),
  type_depot: z.enum(['MAGASIN_CENTRAL', 'DEPOT_SECONDAIRE', 'DEPOT_CHANTIER', 'STOCK_CHANTIER', 'TRANSIT']).optional(),
  localisation: z.string().max(300).optional().nullable(),
});

exports.list = asyncHandler(async (req, res) => {
  res.json({ data: await model.list() });
});

exports.get = asyncHandler(async (req, res) => {
  const d = await model.findById(req.params.id);
  if (!d) throw new HttpError(404, 'Depot not found');
  res.json({ data: d });
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
    if (!updated) throw new HttpError(404, 'Depot not found');
    res.json({ data: updated });
  }),
];

exports.remove = asyncHandler(async (req, res) => {
  await model.remove(req.params.id);
  res.status(204).end();
});
