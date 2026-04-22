const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const model = require('../models/equipementModel');

const createSchema = z.object({
  code_inventaire: z.string().min(1).max(60),
  designation: z.string().min(2).max(200).optional().nullable(),
  etat: z.enum(['DISPONIBLE', 'AFFECTE', 'EN_MAINTENANCE', 'HORS_SERVICE']).default('DISPONIBLE'),
  article_id: z.string().uuid().optional().nullable(),
});

const updateSchema = z.object({
  etat: z.enum(['DISPONIBLE', 'AFFECTE', 'EN_MAINTENANCE', 'HORS_SERVICE']).optional(),
  designation: z.string().min(2).max(200).optional().nullable(),
});

exports.list = asyncHandler(async (req, res) => {
  res.json({ data: await model.list({ search: req.query.search }) });
});

exports.get = asyncHandler(async (req, res) => {
  const eq = await model.findById(req.params.id);
  if (!eq) throw new HttpError(404, 'Équipement non trouvé');
  res.json({ data: eq });
});

exports.create = [
  validate(createSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await model.create(req.body) });
  }),
];

exports.update = [
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const updated = await model.update(req.params.id, req.body);
    if (!updated) throw new HttpError(404, 'Équipement non trouvé');
    res.json({ data: updated });
  }),
];
