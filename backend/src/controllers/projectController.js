const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const model = require('../models/projectModel');
const auditLog = require('../utils/auditLog');

const projectSchema = z.object({
  code: z.string().min(2).max(40),
  nom: z.string().min(2).max(200),
  client: z.string().max(200).optional().nullable(),
  budget_initial: z.coerce.number().nonnegative().default(0),
  statut: z.enum(['ACTIF', 'CLOTURE', 'SUSPENDU', 'SUPPRIME']).optional(),
  motif_statut: z.string().max(500).optional().nullable(),
  date_debut: z.string().optional().nullable(),
  date_fin: z.string().optional().nullable(),
});

exports.list = asyncHandler(async (_req, res) => {
  res.json({ data: await model.list() });
});

exports.detail = asyncHandler(async (req, res) => {
  const d = await model.getDetail(req.params.id);
  if (!d) throw new HttpError(404, 'Project not found');
  res.json({ data: d });
});

exports.get = asyncHandler(async (req, res) => {
  const p = await model.findById(req.params.id);
  if (!p) throw new HttpError(404, 'Project not found');
  const sites = await model.listSites(p.id);
  res.json({ data: { ...p, sites } });
});

exports.create = [
  validate(projectSchema),
  asyncHandler(async (req, res) => {
    const p = await model.create(req.body);
    auditLog({ req, action: 'CREATE', entity_type: 'Projet', entity_id: p.id, reference: p.code, detail: `Création projet : ${p.nom}` });
    res.status(201).json({ data: p });
  }),
];

exports.update = [
  validate(projectSchema.partial()),
  asyncHandler(async (req, res) => {
    const updated = await model.update(req.params.id, req.body, req.user?.id);
    if (!updated) throw new HttpError(404, 'Project not found');
    const action = req.body.statut ? `STATUT_${req.body.statut}` : 'UPDATE';
    const detail = req.body.statut
      ? `Statut → ${req.body.statut}${req.body.motif_statut ? ` — ${req.body.motif_statut}` : ''}`
      : `Modification projet`;
    auditLog({ req, action, entity_type: 'Projet', entity_id: updated.id, reference: updated.code, detail });
    res.json({ data: updated });
  }),
];

exports.remove = asyncHandler(async (req, res) => {
  await model.remove(req.params.id);
  auditLog({ req, action: 'DELETE', entity_type: 'Projet', entity_id: req.params.id, detail: 'Suppression physique projet' });
  res.status(204).end();
});
