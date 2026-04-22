const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const model = require('../models/phaseModel');

const schema = z.object({
  site_id: z.string().uuid(),
  libelle: z.string().min(2).max(200),
  ordre: z.coerce.number().nonnegative().optional().default(0),
});

exports.list = asyncHandler(async (req, res) => {
  res.json({ data: await model.list({ site_id: req.query.site_id }) });
});

exports.get = asyncHandler(async (req, res) => {
  const p = await model.findById(req.params.id);
  if (!p) throw new HttpError(404, 'Phase not found');
  res.json({ data: p });
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
    if (!updated) throw new HttpError(404, 'Phase not found');
    res.json({ data: updated });
  }),
];

exports.remove = asyncHandler(async (req, res) => {
  await model.remove(req.params.id);
  res.status(204).end();
});
