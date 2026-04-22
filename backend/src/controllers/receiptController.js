const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const model = require('../models/receiptModel');

const createSchema = z.object({
  purchase_order_id: z.string().uuid().optional().nullable(),
  depot_id: z.string().uuid(),
  date_reception: z.string(),
  conformite: z.enum(['CONFORME', 'PARTIELLE', 'RESERVE']).default('CONFORME'),
  reserve: z.string().max(500).optional().nullable(),
});

exports.list = asyncHandler(async (req, res) => {
  res.json({ data: await model.list({ purchase_order_id: req.query.purchase_order_id, depot_id: req.query.depot_id }) });
});

exports.create = [
  validate(createSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await model.create(req.body) });
  }),
];
