const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const { query } = require('../db/pool');
const auditLog = require('../utils/auditLog');

const updateSchema = z.object({
  canal_systeme: z.boolean().optional(),
  canal_email: z.boolean().optional(),
  actif: z.boolean().optional(),
});

exports.list = asyncHandler(async (_req, res) => {
  const { rows } = await query('SELECT * FROM notification_settings ORDER BY ordre');
  res.json({ data: rows });
});

exports.update = [
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const { canal_systeme, canal_email, actif } = req.body;
    const { rows } = await query(
      `UPDATE notification_settings
          SET canal_systeme = COALESCE($2, canal_systeme),
              canal_email = COALESCE($3, canal_email),
              actif = COALESCE($4, actif),
              updated_at = now()
        WHERE id = $1
        RETURNING *`,
      [req.params.id, canal_systeme ?? null, canal_email ?? null, actif ?? null],
    );
    if (!rows[0]) throw new HttpError(404, 'Préférence introuvable');
    auditLog({ req, action: 'UPDATE', entity_type: 'NotificationSetting', entity_id: rows[0].id, reference: rows[0].code, detail: 'Modification préférence notification' });
    res.json({ data: rows[0] });
  }),
];
