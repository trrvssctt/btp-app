const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const model = require('../models/requestModel');
const auditLog = require('../utils/auditLog');

const lineSchema = z.object({
  article_id: z.string().uuid().optional().nullable(),
  designation_libre: z.string().max(200).optional().nullable(),
  qte_demandee: z.coerce.number().positive(),
}).refine((l) => l.article_id || l.designation_libre, {
  message: 'article_id or designation_libre required',
});

const createSchema = z.object({
  project_id: z.string().uuid(),
  site_id: z.string().uuid(),
  urgence: z.enum(['NORMALE', 'URGENTE', 'HAUTE', 'CRITIQUE']),
  motif: z.string().max(500).optional().nullable(),
  date_souhaitee: z.string().optional().nullable(),
  lignes: z.array(lineSchema).min(1),
});

const approvalSchema = z.object({
  etape: z.enum(['TECHNIQUE', 'BUDGETAIRE', 'DIRECTION']),
  decision: z.enum(['APPROUVEE', 'REJETEE']),
  commentaire: z.string().max(500).optional().nullable(),
});

const ETAPE_PERM = {
  TECHNIQUE:  'REQUEST_VALIDATE_TECH',
  BUDGETAIRE: 'REQUEST_VALIDATE_BUDGET',
  DIRECTION:  'REQUEST_VALIDATE_DIRECTION',
};

exports.list = asyncHandler(async (req, res) => {
  res.json({ data: await model.list(req.query) });
});

exports.get = asyncHandler(async (req, res) => {
  const r = await model.findById(req.params.id);
  if (!r) throw new HttpError(404, 'Request not found');
  res.json({ data: r });
});

exports.create = [
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const r = await model.create({ ...req.body, requester_id: req.user.id });
    auditLog({ req, action: 'CREATE', entity_type: 'Demande', entity_id: r.id, reference: r.numero, detail: `Création demande — motif : ${r.motif || '—'}` });
    res.status(201).json({ data: r });
  }),
];

const updateSchema = z.object({
  urgence: z.enum(['NORMALE', 'URGENTE', 'HAUTE', 'CRITIQUE']).optional(),
  motif: z.string().max(500).optional().nullable(),
  date_souhaitee: z.string().optional().nullable(),
});

exports.update = [
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const r = await model.findById(req.params.id);
    if (!r) throw new HttpError(404, 'Request not found');
    if (r.statut !== 'BROUILLON') throw new HttpError(409, 'Only BROUILLON requests can be updated');
    const updated = await model.update(req.params.id, req.body);
    res.json({ data: updated });
  }),
];

exports.cancel = asyncHandler(async (req, res) => {
  const r = await model.findById(req.params.id);
  if (!r) throw new HttpError(404, 'Request not found');
  if (!['BROUILLON', 'SOUMISE'].includes(r.statut)) {
    throw new HttpError(409, 'Only BROUILLON or SOUMISE requests can be cancelled');
  }
  const cancelled = await model.cancel(req.params.id);
  res.json({ data: cancelled });
});

exports.addApproval = [
  validate(approvalSchema),
  asyncHandler(async (req, res) => {
    const requiredPerm = ETAPE_PERM[req.body.etape];
    const ok = requiredPerm && (req.user.permissions.includes(requiredPerm) || req.user.roles.includes('ADMIN'));
    if (!ok) throw new HttpError(403, `Permission required: ${requiredPerm}`);

    const a = await model.addApproval({
      request_id: req.params.id,
      decideur_id: req.user.id,
      ...req.body,
    });
    const action = req.body.decision === 'APPROUVEE' ? 'VALIDATE' : 'REJECT';
    auditLog({ req, action, entity_type: 'Demande', entity_id: req.params.id, detail: `Étape ${req.body.etape} — ${req.body.commentaire || ''}` });
    res.status(201).json({ data: a });
  }),
];

const complementSchema = z.object({
  commentaire: z.string().max(500).optional().nullable(),
});

exports.requestComplement = [
  validate(complementSchema),
  asyncHandler(async (req, res) => {
    const r = await model.findById(req.params.id);
    if (!r) throw new HttpError(404, 'Request not found');
    if (!['VALIDATION_TECHNIQUE', 'VALIDATION_BUDGETAIRE', 'VALIDATION_DIRECTION'].includes(r.statut)) {
      throw new HttpError(409, 'La demande doit être en cours de validation pour demander un complément');
    }
    const updated = await model.requestComplement(req.params.id, req.body.commentaire);
    auditLog({ req, action: 'COMPLEMENT', entity_type: 'Demande', entity_id: req.params.id, detail: req.body.commentaire || '' });
    res.json({ data: updated });
  }),
];

exports.resubmit = asyncHandler(async (req, res) => {
  const r = await model.findById(req.params.id);
  if (!r) throw new HttpError(404, 'Request not found');
  if (r.statut !== 'EN_COMPLEMENT') {
    throw new HttpError(409, 'Seules les demandes EN_COMPLEMENT peuvent être resoumises');
  }
  const updated = await model.resubmit(req.params.id);
  auditLog({ req, action: 'RESUBMIT', entity_type: 'Demande', entity_id: req.params.id, detail: 'Resoumission après complément' });
  res.json({ data: updated });
});
