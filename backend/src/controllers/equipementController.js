const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const model = require('../models/equipementModel');
const { auditLog } = require('../utils/auditLog');

// États valides (spec 12.3 : DISPONIBLE, AFFECTE, EN_MAINTENANCE, HORS_SERVICE, PERDU)
const ETATS = ['DISPONIBLE', 'AFFECTE', 'EN_MAINTENANCE', 'HORS_SERVICE', 'PERDU'];

const createSchema = z.object({
  code_inventaire: z.string().min(1).max(60),
  designation: z.string().min(2).max(200).optional().nullable(),
  etat: z.enum(ETATS).default('DISPONIBLE'),
  article_id: z.string().uuid().optional().nullable(),
});

const updateSchema = z.object({
  etat: z.enum(ETATS).optional(),
  designation: z.string().min(2).max(200).optional().nullable(),
});

const affectSchema = z.object({
  site_id:    z.string().uuid().optional().nullable(),
  user_id:    z.string().uuid().optional().nullable(),
  date_debut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD attendu'),
  commentaire: z.string().max(500).optional().nullable(),
  request_id: z.string().uuid().optional().nullable(),
}).refine((d) => d.site_id || d.user_id, {
  message: 'Un chantier ou un utilisateur destinataire est obligatoire',
});

const retourSchema = z.object({
  date_fin:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD attendu').optional(),
  etat_retour: z.enum(['DISPONIBLE', 'EN_MAINTENANCE', 'HORS_SERVICE', 'PERDU']).default('DISPONIBLE'),
  commentaire: z.string().max(500).optional().nullable(),
});

// ─── CRUD de base ─────────────────────────────────────────────────────────────
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
    const eq = await model.create(req.body);
    await auditLog({ action: 'CREATE_EQUIPEMENT', entity_type: 'equipements', entity_id: eq.id, user_id: req.user.id, after: eq });
    res.status(201).json({ data: eq });
  }),
];

exports.update = [
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const before = await model.findById(req.params.id);
    if (!before) throw new HttpError(404, 'Équipement non trouvé');
    const updated = await model.update(req.params.id, req.body);
    await auditLog({ action: 'UPDATE_EQUIPEMENT', entity_type: 'equipements', entity_id: updated.id, user_id: req.user.id, before, after: updated });
    res.json({ data: updated });
  }),
];

// ─── Affectations (UC-11) ─────────────────────────────────────────────────────

exports.listAssignments = asyncHandler(async (req, res) => {
  const eq = await model.findById(req.params.id);
  if (!eq) throw new HttpError(404, 'Équipement non trouvé');
  res.json({ data: await model.listAssignments(req.params.id) });
});

exports.createAssignment = [
  validate(affectSchema),
  asyncHandler(async (req, res) => {
    const eq = await model.findById(req.params.id);
    if (!eq) throw new HttpError(404, 'Équipement non trouvé');

    const aff = await model.createAssignment({
      equipment_id: req.params.id,
      site_id:      req.body.site_id,
      user_id:      req.body.user_id,
      date_debut:   req.body.date_debut,
      commentaire:  req.body.commentaire,
      created_by:   req.user.id,
      request_id:   req.body.request_id,
    });

    await auditLog({
      action: 'AFFECTER_EQUIPEMENT',
      entity_type: 'equipements',
      entity_id: req.params.id,
      user_id: req.user.id,
      after: { affectation_id: aff.id, site_id: aff.site_id, user_id: aff.user_id, date_debut: aff.date_debut, request_id: aff.request_id },
    });

    res.status(201).json({ data: aff });
  }),
];

exports.returnEquipment = [
  validate(retourSchema),
  asyncHandler(async (req, res) => {
    const result = await model.closeAssignment(req.params.affId, {
      date_fin:     req.body.date_fin,
      etat_retour:  req.body.etat_retour ?? 'DISPONIBLE',
      commentaire:  req.body.commentaire,
      updated_by:   req.user.id,
    });

    await auditLog({
      action: 'RETOUR_EQUIPEMENT',
      entity_type: 'equipements',
      entity_id: result.equipment_id,
      user_id: req.user.id,
      after: result,
    });

    res.json({ data: result });
  }),
];
