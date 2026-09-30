const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const model = require('../models/companySettingsModel');
const auditLog = require('../utils/auditLog');

const updateSchema = z.object({
  raison_sociale: z.string().min(1).max(200),
  logo_url: z.string().max(500).optional().nullable(),
  adresse: z.string().max(500).optional().nullable(),
  code_postal: z.string().max(20).optional().nullable(),
  ville: z.string().max(100).optional().nullable(),
  pays: z.string().max(100).optional().nullable(),
  telephone: z.string().max(50).optional().nullable(),
  email: z.string().email().max(100).optional().nullable(),
  site_web: z.string().max(200).optional().nullable(),
  ninea: z.string().max(50).optional().nullable(),
  registre_commerce: z.string().max(50).optional().nullable(),
  numero_tva: z.string().max(50).optional().nullable(),
  devise: z.string().max(10).optional().nullable(),
});

exports.get = asyncHandler(async (req, res) => {
  const settings = await model.get();
  res.json({ data: settings });
});

exports.update = [
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const settings = await model.update(req.body);
    auditLog({ req, action: 'UPDATE', entity_type: 'CompanySettings', entity_id: settings.id, reference: 'Paramètres', detail: 'Mise à jour paramètres entreprise' });
    res.json({ data: settings });
  }),
];
