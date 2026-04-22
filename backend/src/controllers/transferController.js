const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const model = require('../models/transferModel');

const lineSchema = z.object({
  article_id: z.string().uuid(),
  quantite: z.coerce.number().positive(),
});

const createSchema = z.object({
  depot_from: z.string().uuid(),
  depot_to: z.string().uuid(),
  lines: z.array(lineSchema).min(1),
});

const updateStatutSchema = z.object({
  statut: z.enum(['CRÉÉ', 'VALIDÉ', 'PRÉPARÉ', 'EXPÉDIÉ', 'REÇU', 'LITIGE', 'CLÔTURÉ']),
});

exports.list = asyncHandler(async (req, res) => {
  res.json({ data: await model.list({
    statut: req.query.statut,
    depot_from: req.query.depot_from,
    depot_to: req.query.depot_to,
  }) });
});

exports.get = asyncHandler(async (req, res) => {
  const t = await model.findById(req.params.id);
  if (!t) throw new HttpError(404, 'Transfer not found');
  res.json({ data: t });
});

exports.create = [
  validate(createSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await model.create(req.body) });
  }),
];

exports.updateStatut = [
  validate(updateStatutSchema),
  asyncHandler(async (req, res) => {
    const t = await model.updateStatut(req.params.id, req.body.statut);
    if (!t) throw new HttpError(404, 'Transfer not found');
    res.json({ data: t });
  }),
];

exports.remove = asyncHandler(async (req, res) => {
  await model.remove(req.params.id);
  res.status(204).end();
});
