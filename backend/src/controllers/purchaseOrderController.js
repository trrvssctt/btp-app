const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const model = require('../models/purchaseOrderModel');
const auditLog = require('../utils/auditLog');

const lineSchema = z.object({
  article_id: z.string().uuid().optional().nullable(),
  designation_libre: z.string().max(200).optional().nullable(),
  quantite: z.coerce.number().positive(),
  prix_unitaire: z.coerce.number().nonnegative().default(0),
});

const createSchema = z.object({
  supplier_id: z.string().uuid(),
  statut: z.enum(['BROUILLON', 'ENVOYEE', 'PARTIELLE', 'RECUE', 'CLOTUREE']).optional(),
  lignes: z.array(lineSchema).min(1),
});

exports.list = asyncHandler(async (req, res) => {
  res.json({ data: await model.list({ statut: req.query.statut, supplier_id: req.query.supplier_id }) });
});

exports.get = asyncHandler(async (req, res) => {
  const po = await model.findById(req.params.id);
  if (!po) throw new HttpError(404, 'Purchase order not found');
  res.json({ data: po });
});

exports.create = [
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const po = await model.create(req.body);
    auditLog({ req, action: 'CREATE', entity_type: 'BonCommande', entity_id: po.id, reference: po.numero, detail: `Création BC fournisseur — ${po.lignes?.length ?? '?'} ligne(s)` });
    res.status(201).json({ data: po });
  }),
];
