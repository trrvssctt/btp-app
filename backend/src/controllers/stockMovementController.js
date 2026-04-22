const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const model = require('../models/stockMovementModel');
const auditLog = require('../utils/auditLog');

const schema = z.object({
  type_mouvement: z.enum(['ENTREE', 'SORTIE', 'ENTREE_ACHAT', 'SORTIE_CHANTIER', 'TRANSFERT_SORTANT', 'TRANSFERT_ENTRANT', 'RETOUR_CHANTIER', 'AJUSTEMENT_INVENTAIRE', 'RESERVATION', 'ANNULATION_RESERVATION']),
  article_id: z.string().uuid(),
  depot_id: z.string().uuid(),
  quantite: z.coerce.number(),
  reference_doc: z.string().max(100).optional().nullable(),
  site_id: z.string().uuid().optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
});

exports.list = asyncHandler(async (req, res) => {
  res.json({ data: await model.list({
    article_id: req.query.article_id,
    depot_id: req.query.depot_id,
    type_mouvement: req.query.type_mouvement,
  }) });
});

exports.get = asyncHandler(async (req, res) => {
  const m = await model.findById(req.params.id);
  if (!m) throw new Error('Stock movement not found');
  res.json({ data: m });
});

exports.create = [
  validate(schema),
  asyncHandler(async (req, res) => {
    const mv = await model.create(req.body);
    auditLog({ req, action: 'CREATE', entity_type: 'Mouvement', entity_id: mv.id, reference: mv.reference_doc || mv.id, detail: `${mv.type_mouvement} — qté ${mv.quantite}` });
    res.status(201).json({ data: mv });
  }),
];
