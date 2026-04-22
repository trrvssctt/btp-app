const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const model = require('../models/siteModel');

const schema = z.object({
  project_id: z.string().uuid(),
  code: z.string().min(1).max(40),
  nom: z.string().min(2).max(200),
  localisation: z.string().max(300).optional().nullable(),
  responsable: z.string().max(100).optional().nullable(),
  statut: z.enum(['ACTIF', 'CLOTURE', 'SUSPENDU']).optional(),
});

exports.list = asyncHandler(async (req, res) => {
  res.json({ data: await model.list({ project_id: req.query.project_id }) });
});

exports.get = asyncHandler(async (req, res) => {
  const s = await model.findById(req.params.id);
  if (!s) throw new HttpError(404, 'Site not found');
  res.json({ data: s });
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
    if (!updated) throw new HttpError(404, 'Site not found');
    res.json({ data: updated });
  }),
];

exports.remove = asyncHandler(async (req, res) => {
  await model.remove(req.params.id);
  res.status(204).end();
});
