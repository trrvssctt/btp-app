const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const model = require('../models/receiptModel');
const HttpError = require('../utils/HttpError');
const auditLog = require('../utils/auditLog');

const lineSchema = z.object({
  article_id: z.string().uuid().optional().nullable(),
  designation_libre: z.string().optional().nullable(),
  quantite_recue: z.number().positive(),
  purchase_order_line_id: z.string().uuid().optional().nullable(),
});

const createSchema = z.object({
  purchase_order_id: z.string().uuid().optional().nullable(),
  depot_id: z.string().uuid(),
  date_reception: z.string(),
  conformite: z.enum(['CONFORME', 'PARTIELLE', 'RESERVE']).default('CONFORME'),
  reserve: z.string().max(500).optional().nullable(),
  lignes: z.array(lineSchema).optional(),
});

exports.list = asyncHandler(async (req, res) => {
  const { purchase_order_id, depot_id, supplier_id, conformite, date_from, date_to, q } = req.query;
  res.json({ data: await model.list({ purchase_order_id, depot_id, supplier_id, conformite, date_from, date_to, q }) });
});

exports.get = asyncHandler(async (req, res) => {
  const receipt = await model.findById(req.params.id);
  if (!receipt) throw new HttpError(404, 'Réception introuvable');
  res.json({ data: receipt });
});

exports.create = [
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const data = await model.create({ ...req.body, user_id: req.user?.id });
    auditLog({ req, action: 'CREATE', entity_type: 'Reception', entity_id: data.id, reference: data.numero, detail: `Réception ${data.conformite} — dépôt ${req.body.depot_id}` });
    res.status(201).json({ data });
  }),
];
