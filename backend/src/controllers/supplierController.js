const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const model = require('../models/supplierModel');

const schema = z.object({
  code: z.string().min(1).max(40),
  raison_sociale: z.string().min(2).max(200),
  contact: z.string().max(100).optional().nullable(),
  email: z.string().email().optional().nullable(),
  telephone: z.string().max(20).optional().nullable(),
});

exports.list = asyncHandler(async (req, res) => {
  res.json({ data: await model.list() });
});

exports.get = asyncHandler(async (req, res) => {
  const s = await model.findById(req.params.id);
  if (!s) throw new HttpError(404, 'Supplier not found');
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
    if (!updated) throw new HttpError(404, 'Supplier not found');
    res.json({ data: updated });
  }),
];

exports.remove = asyncHandler(async (req, res) => {
  await model.remove(req.params.id);
  res.status(204).end();
});
