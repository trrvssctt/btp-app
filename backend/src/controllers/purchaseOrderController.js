const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const model = require('../models/purchaseOrderModel');
const requestModel = require('../models/requestModel');
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
  request_id: z.string().uuid().optional().nullable(),
});

// Un BC modifié garde sa demande d'origine : request_id n'est pas modifiable.
const updateSchema = createSchema.omit({ request_id: true });

exports.list = asyncHandler(async (req, res) => {
  res.json({ data: await model.list({ statut: req.query.statut, supplier_id: req.query.supplier_id, request_id: req.query.request_id }) });
});

exports.get = asyncHandler(async (req, res) => {
  const po = await model.findById(req.params.id);
  if (!po) throw new HttpError(404, 'Purchase order not found');
  res.json({ data: po });
});

exports.create = [
  validate(createSchema),
  asyncHandler(async (req, res) => {
    let request = null;
    if (req.body.request_id) {
      request = await requestModel.findById(req.body.request_id);
      if (!request) throw new HttpError(404, 'Demande introuvable');
      if (request.statut !== 'APPROUVEE') {
        throw new HttpError(400, `La demande ${request.numero} n'est pas approuvée (statut ${request.statut})`);
      }
    }
    const po = await model.create(req.body);
    const origine = request ? ` — issu de ${request.numero}` : '';
    auditLog({ req, action: 'CREATE', entity_type: 'BonCommande', entity_id: po.id, reference: po.numero, detail: `Création BC fournisseur — ${req.body.lignes?.length ?? '?'} ligne(s)${origine}` });
    res.status(201).json({ data: po });
  }),
];

exports.update = [
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const existing = await model.findById(req.params.id);
    if (!existing) throw new HttpError(404, 'Purchase order not found');
    // Seul un brouillon est modifiable : un BC envoyé engage déjà le fournisseur.
    if (existing.statut !== 'BROUILLON') {
      throw new HttpError(400, `Impossible de modifier un BC en statut ${existing.statut}`);
    }
    const po = await model.update(req.params.id, req.body);
    auditLog({ req, action: 'UPDATE', entity_type: 'BonCommande', entity_id: po.id, reference: po.numero, detail: `Modification BC — ${req.body.lignes?.length ?? '?'} ligne(s)` });
    res.json({ data: po });
  }),
];

exports.remove = asyncHandler(async (req, res) => {
  const po = await model.findById(req.params.id);
  if (!po) throw new HttpError(404, 'Purchase order not found');

  // Vérifier que le BC n'est pas déjà envoyé ou réceptionné
  if (!['BROUILLON'].includes(po.statut)) {
    throw new HttpError(400, `Impossible de supprimer un BC en statut ${po.statut}`);
  }

  await model.remove(req.params.id);
  auditLog({ req, action: 'DELETE', entity_type: 'BonCommande', entity_id: req.params.id, reference: po.numero, detail: `Suppression BC brouillon` });
  res.json({ data: { success: true } });
});
