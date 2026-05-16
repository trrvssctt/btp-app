const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const m = require('../models/domRuleModel');

const conditionSchema = z.object({
  device_id:   z.string().optional().nullable(),
  device_name: z.string().max(200).optional().nullable(),
  metric:      z.string().min(1),
  operator:    z.string().min(1),
  value:       z.union([z.string(), z.number()]),
  duration_min: z.coerce.number().int().optional().nullable(),
});

const actionSchema = z.object({
  device_id:   z.string().optional().nullable(),
  device_name: z.string().max(200).optional().nullable(),
  command:     z.string().min(1),
});

const ruleSchema = z.object({
  name:        z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  enabled:     z.boolean().optional(),
  priority:    z.coerce.number().int().optional(),
  conditions:  z.array(conditionSchema).min(1),
  actions:     z.array(actionSchema).min(1),
});

exports.list = asyncHandler(async (_req, res) => {
  res.json({ data: await m.list() });
});

exports.get = asyncHandler(async (req, res) => {
  const r = await m.findById(req.params.id);
  if (!r) throw new HttpError(404, 'Rule not found');
  res.json({ data: r });
});

exports.create = [validate(ruleSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await m.create(req.body) });
})];

exports.toggle = asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') throw new HttpError(400, '"enabled" doit être un booléen');
  const r = await m.toggleEnabled(req.params.id, enabled);
  if (!r) throw new HttpError(404, 'Rule not found');
  res.json({ data: r });
});

exports.trigger = asyncHandler(async (req, res) => {
  await m.recordTrigger(req.params.id);
  const r = await m.findById(req.params.id);
  res.json({ data: r });
});
