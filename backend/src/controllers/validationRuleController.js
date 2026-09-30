const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const { query } = require('../db/pool');
const auditLog = require('../utils/auditLog');

const updateSchema = z.object({
  libelle: z.string().min(2).max(200).optional(),
  seuil_montant: z.coerce.number().nonnegative().optional(),
  unite: z.string().max(10).optional(),
  escalade: z.string().max(120).optional().nullable(),
  actif: z.boolean().optional(),
});

exports.list = asyncHandler(async (_req, res) => {
  const { rows } = await query('SELECT * FROM validation_rules ORDER BY ordre, seuil_montant');
  res.json({ data: rows });
});

exports.update = [
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const { libelle, seuil_montant, unite, escalade, actif } = req.body;
    const { rows } = await query(
      `UPDATE validation_rules
          SET libelle = COALESCE($2, libelle),
              seuil_montant = COALESCE($3, seuil_montant),
              unite = COALESCE($4, unite),
              escalade = COALESCE($5, escalade),
              actif = COALESCE($6, actif),
              updated_at = now()
        WHERE id = $1
        RETURNING *`,
      [req.params.id, libelle ?? null, seuil_montant ?? null, unite ?? null, escalade ?? null, actif ?? null],
    );
    if (!rows[0]) throw new HttpError(404, 'Règle introuvable');
    auditLog({ req, action: 'UPDATE', entity_type: 'ValidationRule', entity_id: rows[0].id, reference: rows[0].code, detail: 'Modification seuil de validation' });
    res.json({ data: rows[0] });
  }),
];
