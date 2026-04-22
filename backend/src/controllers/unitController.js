const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const model = require('../models/unitModel');

const schema = z.object({
  code: z.string().min(1).max(40),
  libelle: z.string().min(2).max(100),
});

exports.list = asyncHandler(async (req, res) => {
  res.json({ data: await model.list() });
});

exports.get = asyncHandler(async (req, res) => {
  const u = await model.findById(req.params.id);
  if (!u) throw new HttpError(404, 'Unit not found');
  res.json({ data: u });
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
    if (!updated) throw new HttpError(404, 'Unit not found');
    res.json({ data: updated });
  }),
];

exports.remove = asyncHandler(async (req, res) => {
  await model.remove(req.params.id);
  res.status(204).end();
});
