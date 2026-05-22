const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const model = require('../models/articleModel');
const auditLog = require('../utils/auditLog');

const schema = z.object({
  code: z.string().min(1).max(40),
  designation: z.string().min(2).max(200),
  famille_id: z.string().uuid().optional().nullable(),
  unite_id: z.string().uuid().optional().nullable(),
  nature: z.enum(['STOCKABLE', 'ACHAT_DIRECT', 'DURABLE', 'CONSOMMABLE']),
  prix_moyen: z.coerce.number().nonnegative().optional().nullable(),
  seuil_min: z.coerce.number().nonnegative().optional().nullable(),
  actif: z.boolean().optional(),
});

exports.list = asyncHandler(async (req, res) => {
  res.json({ data: await model.list({ search: req.query.search }) });
});

exports.get = asyncHandler(async (req, res) => {
  const a = await model.findById(req.params.id);
  if (!a) throw new HttpError(404, 'Article not found');
  res.json({ data: a });
});

exports.create = [
  validate(schema),
  asyncHandler(async (req, res) => {
    const a = await model.create(req.body);
    auditLog({ req, action: 'CREATE', entity_type: 'Article', entity_id: a.id, reference: a.code, detail: `Création article : ${a.designation} (${a.nature})` });
    res.status(201).json({ data: a });
  }),
];

exports.update = [
  validate(schema.partial()),
  asyncHandler(async (req, res) => {
    const used = await model.checkUsage(req.params.id);
    if (used) throw new HttpError(409, 'Cet article est référencé dans des documents existants (demandes, bons de commande, mouvements…) et ne peut pas être modifié.');
    const updated = await model.update(req.params.id, req.body);
    if (!updated) throw new HttpError(404, 'Article not found');
    auditLog({ req, action: 'UPDATE', entity_type: 'Article', entity_id: updated.id, reference: updated.code, detail: `Modification article : ${updated.designation}` });
    res.json({ data: updated });
  }),
];

exports.remove = asyncHandler(async (req, res) => {
  const used = await model.checkUsage(req.params.id);
  if (used) throw new HttpError(409, 'Cet article est référencé dans des documents existants et ne peut pas être supprimé. Désactivez-le manuellement si nécessaire.');
  await model.remove(req.params.id);
  auditLog({ req, action: 'DELETE', entity_type: 'Article', entity_id: req.params.id, detail: 'Désactivation article (suppression logique)' });
  res.status(204).end();
});
