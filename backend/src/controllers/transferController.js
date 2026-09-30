const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const model = require('../models/transferModel');
const auditLog = require('../utils/auditLog');

const lineSchema = z.object({
  article_id: z.string().uuid(),
  quantite: z.coerce.number().positive(),
});

const createSchema = z.object({
  depot_from: z.string().uuid(),
  depot_to: z.string().uuid(),
  lines: z.array(lineSchema).min(1),
});

// EXPÉDIÉ et REÇU ne passent que par la création et l'accusé de réception,
// qui déplacent le stock : ce changement de statut libre ne les autorise pas.
const updateStatutSchema = z.object({
  statut: z.enum(['LITIGE', 'CLÔTURÉ']),
});

exports.list = asyncHandler(async (req, res) => {
  res.json({ data: await model.list({
    statut: req.query.statut,
    depot_from: req.query.depot_from,
    depot_to: req.query.depot_to,
    depot_id: req.query.depot_id,
    date_from: req.query.date_from,
    date_to: req.query.date_to,
    q: req.query.q,
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
    const t = await model.create({ ...req.body, user_id: req.user?.id });
    auditLog({ req, action: 'CREATE', entity_type: 'Transfert', entity_id: t.id, reference: t.numero ?? t.id, detail: `Expédition transfert — ${req.body.lines.length} ligne(s)` });
    res.status(201).json({ data: t });
  }),
];

exports.receive = asyncHandler(async (req, res) => {
  const t = await model.receive(req.params.id, { user_id: req.user?.id });
  auditLog({ req, action: 'STATUT_REÇU', entity_type: 'Transfert', entity_id: t.id, reference: t.numero, detail: 'Accusé de réception transfert — stock disponible au dépôt destination' });
  res.json({ data: t });
});

exports.updateStatut = [
  validate(updateStatutSchema),
  asyncHandler(async (req, res) => {
    const t = await model.updateStatut(req.params.id, req.body.statut);
    if (!t) throw new HttpError(404, 'Transfer not found');
    auditLog({ req, action: `STATUT_${req.body.statut}`, entity_type: 'Transfert', entity_id: t.id, reference: t.numero ?? t.id, detail: `Statut transfert → ${req.body.statut}` });
    res.json({ data: t });
  }),
];

exports.remove = asyncHandler(async (req, res) => {
  await model.remove(req.params.id);
  res.status(204).end();
});
