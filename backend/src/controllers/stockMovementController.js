const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const model = require('../models/stockMovementModel');
const auditLog = require('../utils/auditLog');
const HttpError = require('../utils/HttpError');

// Mouvements saisissables à la main. Les transferts et réservations sont
// générés par leurs propres workflows (ils déplacent le stock eux-mêmes).
const schema = z.object({
  type_mouvement: z.enum(['ENTREE', 'SORTIE', 'ENTREE_ACHAT', 'SORTIE_CHANTIER', 'RETOUR_CHANTIER', 'AJUSTEMENT_INVENTAIRE']),
  article_id: z.string().uuid(),
  depot_id: z.string().uuid(),
  quantite: z.coerce.number().refine((n) => n !== 0, 'Quantité non nulle requise'),
  reference_doc: z.string().max(100).optional().nullable(),
  site_id: z.string().uuid().optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
});

exports.list = asyncHandler(async (req, res) => {
  res.json({ data: await model.list({
    article_id: req.query.article_id,
    depot_id: req.query.depot_id,
    type_mouvement: req.query.type_mouvement,
    sens: req.query.sens,
    date_from: req.query.date_from,
    date_to: req.query.date_to,
    q: req.query.q,
    limit: req.query.limit,
  }) });
});

exports.get = asyncHandler(async (req, res) => {
  const m = await model.findById(req.params.id);
  if (!m) throw new HttpError(404, 'Stock movement not found');
  res.json({ data: m });
});

exports.create = [
  validate(schema),
  asyncHandler(async (req, res) => {
    const mv = await model.createManual({ ...req.body, user_id: req.user?.id });
    auditLog({ req, action: 'CREATE', entity_type: 'Mouvement', entity_id: mv.id, reference: mv.reference_doc || mv.id, detail: `${mv.type_mouvement} — qté ${mv.quantite}` });
    res.status(201).json({ data: mv });
  }),
];
